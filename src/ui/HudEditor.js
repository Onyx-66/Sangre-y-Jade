// Accessible HUD editing over a paused scene; changes stay in a draft until
// Save, and mandatory bars cannot be hidden or assigned unsupported properties.
import { HUD_ELEMENTS, ANCHORS, PRESETS, HUD_LAYOUT_VERSION, cloneLayout, boxFor, constrainLayout, validateLayout, moveElement, presetLayout, LayoutHistory, exportLayout, importLayout } from '../systems/HudLayout.js';
import { t, getLanguage } from '../i18n/index.js';
import { escapeHtml } from '../systems/PassiveState.js';
import { settingsToggle, bindSettingsToggle } from './SettingsToggle.js';

const html = value => escapeHtml(t(value));
const button = (label,action) => `<button type="button" data-editor-action="${action}">${html(label)}</button>`;
export class HudEditor {
  constructor(runtime,{onSave,onClose}) {
    this.runtime=runtime;this.onSave=onSave;this.onClose=onClose;this.selected='joystick';this.snap=true;this.guides=true;this.group=false;this.histories={};
    this.drafts=cloneLayout(runtime.store);this.el=document.createElement('div');this.el.className='hud-editor modal-backdrop';this.el.dir=getLanguage()==='ar'?'rtl':'ltr';
    this.el.setAttribute('role','dialog');this.el.setAttribute('aria-modal','true');this.el.setAttribute('aria-label',t('HUD layout'));
    this.nativeRemove=this.el.remove.bind(this.el);this.el.remove=()=>this.destroy();
    this.el.innerHTML=`<div class="hud-editor-blocker"></div><div class="hud-editor-outlines"></div><div class="hud-editor-head">${button('Customize','customize')}<span class="hud-editor-status" role="status"></span></div><section class="hud-editor-panel" hidden></section><div class="hud-editor-toolbar"><div class="hud-editor-tools">${button('Undo','undo')}${button('Redo','redo')}${button('Snap grid 8 px','snap')}${button('Alignment guides','guides')}${button('Preview','preview')}<select data-editor-preset aria-label="${html('Presets')}">${PRESETS.map(name=>`<option value="${name}">${html(name)}</option>`).join('')}</select>${button('Reset all','reset-all')}${button('Export','export')}${button('Import','import')}</div><div class="hud-editor-commit">${button('Save','save')}${button('Cancel','cancel')}</div></div><section class="hud-editor-transfer" hidden></section>`;
    document.body.append(this.el);runtime.hud.editor=this;runtime.hud.releaseJoystick?.();runtime.hud.editingHud=true;
    this.onKey=event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.cancel();return;}
      // Stop Phaser's gameplay hotkeys, while retaining native input editing.
      event.stopPropagation();
      if(event.key==='Tab'){
        const transfer=this.el.querySelector('.hud-editor-transfer');
        const scope=transfer.hidden?this.el:transfer;
        const stops=[...scope.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).display!=='none');
        const first=stops[0],last=stops.at(-1);
        if(stops.length&&((event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)||!scope.contains(document.activeElement))){event.preventDefault();(event.shiftKey?last:first).focus();}
        return;
      }
      if(event.target.closest('input,select,textarea'))return;
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if(delta){event.preventDefault();this.nudge(delta[0]*(event.shiftKey?8:1),delta[1]*(event.shiftKey?8:1));}
    };
    window.addEventListener('keydown',this.onKey,true);
    this.el.querySelectorAll('[data-editor-action]').forEach(el=>el.onclick=()=>this.action(el.dataset.editorAction));
    this.el.querySelector('[data-editor-preset]').onchange=event=>{this.commit(presetLayout(event.target.value,runtime.defaults,runtime.metrics,runtime.safe));this.renderPanel();};
    runtime.ready.then(()=>{if(!this.destroyed)this.begin();});
  }
  begin() {
    const r=this.runtime;this.orientation=r.orientation;r.editing=true;this.hiddenStates=new Map();
    for(const id of ['attack','boss-bar','breath']){const node=r.nodes.get(id);this.hiddenStates.set(id,node.hidden);node.hidden=false;}
    this.bossText=r.nodes.get('boss-bar').querySelector('.boss-name').textContent;
    r.nodes.get('boss-bar').querySelector('.boss-name').textContent=t('Boss health bar');
    this.histories[this.orientation]=new LayoutHistory(r.layout);this.drafts[this.orientation]=cloneLayout(r.layout);
    r.onMeasured=()=>this.resized();this.createHandles();this.draw();this.renderPanel();
    this.el.querySelector('[data-editor-action=customize]').focus();
  }
  resized() {
    const r=this.runtime;if(this.destroyed)return;
    this.drafts[this.orientation]=cloneLayout(this.history.entries[this.history.index]);
    this.orientation=r.orientation;
    if(!this.histories[this.orientation])this.histories[this.orientation]=new LayoutHistory(this.drafts[this.orientation]||r.defaults);
    r.apply(constrainLayout(this.history.entries[this.history.index],r.metrics,r.safe));
    this.createHandles();this.draw();this.renderPanel();
  }
  get history(){return this.histories[this.orientation];}
  commit(layout,{record=true}={}) {
    if(!this.history)return;
    const next=constrainLayout(layout,this.runtime.metrics,this.runtime.safe);this.runtime.apply(next);
    if(record)this.history.push(next);this.drafts[this.orientation]=cloneLayout(next);this.draw();
  }
  // Precision nudges deliberately remain 1px even when drag snapping is enabled.
  nudge(dx,dy){this.commit(moveElement(this.runtime.layout,this.selected,dx,dy,this.runtime.metrics,this.runtime.safe,{group:this.group}));this.syncFields();}
  createHandles() {
    const root=this.el.querySelector('.hud-editor-outlines');root.replaceChildren();
    for(const spec of HUD_ELEMENTS){
      const outline=document.createElement('div');outline.className='hud-editor-outline';outline.dataset.outline=spec.id;root.append(outline);
      const handle=document.createElement('button');handle.type='button';handle.className='hud-drag-handle';handle.dataset.drag=spec.id;handle.setAttribute('aria-label',t('Move {name}',{name:t(spec.name)}));handle.title=t(spec.name);
      handle.textContent=spec.id.startsWith('skill-')?spec.id.slice(-1).toUpperCase():'↕';root.append(handle);
      handle.addEventListener('pointerdown',event=>{
        if(this.dragging)return;
        event.preventDefault();this.selected=spec.id;this.renderPanel();this.draw();
        if(this.runtime.layout.elements[spec.id].locked)return;
        const start={x:event.clientX,y:event.clientY,layout:cloneLayout(this.runtime.layout)},pointer=event.pointerId;
        this.dragging=true;handle.setPointerCapture(pointer);
        const move=e=>{if(e.pointerId!==pointer)return;this.commit(moveElement(start.layout,this.selected,e.clientX-start.x,e.clientY-start.y,this.runtime.metrics,this.runtime.safe,{snap:this.snap,group:this.group}),{record:false});this.syncFields();};
        const finish=e=>{if(e.pointerId!==pointer)return;this.dragging=false;if(e.type==='pointercancel')this.commit(start.layout,{record:false});else this.history.push(this.runtime.layout);
          handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);try{handle.releasePointerCapture(pointer);}catch{}this.draw();};
        handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
      });
    }
  }
  draw() {
    if(!this.runtime.layout||!this.history)return;
    const r=this.runtime,{issues,overlaps}=validateLayout(r.layout,r.metrics,r.safe),overlapIds=new Set(overlaps.flat());
    for(const spec of HUD_ELEMENTS){
      const box=boxFor(r.layout.elements[spec.id],r.metrics[spec.id],r.safe),outline=this.el.querySelector(`[data-outline="${spec.id}"]`),handle=this.el.querySelector(`[data-drag="${spec.id}"]`);
      if(!outline||!handle)continue;
      Object.assign(outline.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.width}px`,height:`${box.height}px`});
      outline.classList.toggle('selected',this.selected===spec.id);outline.classList.toggle('overlap',overlapIds.has(spec.id));outline.hidden=!r.layout.elements[spec.id].visible;
      // Handles sit above bottom controls so the bottom toolbar does not cover them.
      Object.assign(handle.style,{left:`${Math.max(r.safe.x,Math.min(r.safe.x+r.safe.width-44,box.x+box.width/2-22))}px`,top:`${Math.max(r.safe.y,box.y-44)}px`});
      handle.classList.toggle('selected',this.selected===spec.id);handle.classList.toggle('locked',r.layout.elements[spec.id].locked);handle.hidden=!r.layout.elements[spec.id].visible;
    }
    this.el.querySelector('[data-editor-action=undo]').disabled=this.history.index===0;
    this.el.querySelector('[data-editor-action=redo]').disabled=this.history.index===this.history.entries.length-1;
    this.el.querySelector('[data-editor-action=save]').disabled=issues.length>0;
    this.el.querySelector('.hud-editor-status').textContent=issues.length?t('Cannot save: required controls must be visible and inside the safe area.'):
      overlaps.length?`⚠ ${t('Overlap warnings: {n}',{n:overlaps.length})}`:t(this.orientation==='landscape'?'Landscape layout':'Portrait layout');
    this.el.querySelector('.hud-editor-status').title=overlaps.map(pair=>pair.map(id=>t(HUD_ELEMENTS.find(spec=>spec.id===id).name)).join(' / ')).join('\n');
    for(const key of ['snap','guides'])this.el.querySelector(`[data-editor-action=${key}]`).setAttribute('aria-pressed',String(this[key]));
    this.drawGuides();
  }
  drawGuides() {
    this.el.querySelectorAll('.hud-editor-guide').forEach(el=>el.remove());if(!this.guides)return;
    const r=this.runtime,selected=boxFor(r.layout.elements[this.selected],r.metrics[this.selected],r.safe);
    const vertical=new Set([r.safe.x+r.safe.width/2]),horizontal=new Set([r.safe.y+r.safe.height/2]);
    for(const spec of HUD_ELEMENTS){const box=boxFor(r.layout.elements[spec.id],r.metrics[spec.id],r.safe);
      for(const x of [box.x,box.x+box.width/2,box.right])if([selected.x,selected.x+selected.width/2,selected.right].some(own=>Math.abs(own-x)<4))vertical.add(x);
      for(const y of [box.y,box.y+box.height/2,box.bottom])if([selected.y,selected.y+selected.height/2,selected.bottom].some(own=>Math.abs(own-y)<4))horizontal.add(y);
    }
    for(const x of vertical){const el=document.createElement('div');el.className='hud-editor-guide vertical';Object.assign(el.style,{left:`${x}px`,top:`${r.safe.y}px`,height:`${r.safe.height}px`});this.el.append(el);}
    for(const y of horizontal){const el=document.createElement('div');el.className='hud-editor-guide horizontal';Object.assign(el.style,{left:`${r.safe.x}px`,top:`${y}px`,width:`${r.safe.width}px`});this.el.append(el);}
  }
  renderPanel() {
    if(!this.runtime.layout)return;
    const entry=this.runtime.layout.elements[this.selected],spec=HUD_ELEMENTS.find(s=>s.id===this.selected),boss=['boss-bar','breath'].includes(this.selected);
    const row=(label,input)=>`<div class="hud-editor-row"><label>${html(label)}</label>${input.replace(/<(input|select)\b/,`<$1 aria-label="${html(label)}"`)}</div>`;
    const panel=this.el.querySelector('.hud-editor-panel');
    panel.innerHTML=`<h2>${html('Customize HUD')}</h2><select data-editor-element aria-label="${html('HUD element')}">${HUD_ELEMENTS.map(s=>`<option value="${s.id}"${s.id===this.selected?' selected':''}>${html(s.name)}</option>`).join('')}</select>
      ${row('Anchor',`<select data-editor-field="anchor">${Object.keys(ANCHORS).map(anchor=>`<option value="${anchor}"${entry.anchor===anchor?' selected':''}>${html(anchor)}</option>`).join('')}</select>`)}
      ${row('X (%)',`<input data-editor-field="x" type="number" min="0" max="100" step=".1" value="${entry.x.toFixed(1)}" dir="ltr">`)}
      ${row('Y (%)',`<input data-editor-field="y" type="number" min="0" max="100" step=".1" value="${entry.y.toFixed(1)}" dir="ltr">`)}
      <div class="hud-editor-nudge">${['left','up','down','right'].map((dir,i)=>`<button type="button" data-nudge="${dir}" aria-label="${html(`Nudge ${dir}`)}">${['←','↑','↓','→'][i]}</button>`).join('')}</div>
      ${row('Size',`<div><input data-editor-field="scale" type="range" min=".5" max="2" step=".01" value="${entry.scale}"><output data-value="scale" dir="ltr">${Math.round(entry.scale*100)}%</output></div>`)}
      ${boss?'':`${row('Opacity',`<div><input data-editor-field="opacity" type="range" min="${this.selected==='joystick'?'.1':'.2'}" max="1" step=".01" value="${entry.opacity}"><output data-value="opacity" dir="ltr">${Math.round(entry.opacity*100)}%</output></div>`)}${settingsToggle('hud-visible','Visible',entry.visible)}${settingsToggle('hud-locked','Lock position',entry.locked)}`}
      ${this.selected.startsWith('skill-')?settingsToggle('hud-group','Group active skills',this.group):''}
      ${this.selected==='joystick'?`${row('Joystick mode',`<select data-joystick="mode"><option value="fixed"${this.runtime.layout.joystick.mode==='fixed'?' selected':''}>${html('Fixed')}</option><option value="floating"${this.runtime.layout.joystick.mode==='floating'?' selected':''}>${html('Floating')}</option></select>`)}${row('Dead zone',`<div><input type="range" data-joystick="deadZone" min="0" max=".5" step=".01" value="${this.runtime.layout.joystick.deadZone}"><output data-value="deadZone" dir="ltr">${Math.round(this.runtime.layout.joystick.deadZone*100)}%</output></div>`)}<div class="joystick-sample" aria-label="${html('Test joystick')}"><span class="joystick-sample-dot"></span></div><output data-sample-value dir="ltr">0, 0</output>`:''}
      ${button('Reset this element','reset-element')}`;
    panel.querySelector('[data-editor-element]').onchange=event=>{this.selected=event.target.value;this.renderPanel();this.draw();};
    for(const input of panel.querySelectorAll('[data-editor-field]')){
      input.disabled=entry.locked;input.oninput=()=>{
        const next=cloneLayout(this.runtime.layout),key=input.dataset.editorField;if(next.elements[this.selected].locked)return;
        const value=key==='anchor'?input.value:Number(input.value);if(key!=='anchor'&&!Number.isFinite(value))return;
        if(key==='anchor'){
          const box=boxFor(next.elements[this.selected],this.runtime.metrics[this.selected],this.runtime.safe);
          next.elements[this.selected].anchor=value;const [ax,ay]=ANCHORS[value];
          next.elements[this.selected].x=(box.x+box.width*ax-this.runtime.safe.x)/this.runtime.safe.width*100;
          next.elements[this.selected].y=(box.y+box.height*ay-this.runtime.safe.y)/this.runtime.safe.height*100;
        }else next.elements[this.selected][key]=value;
        this.commit(next);this.syncFields();
      };
    }
    for(const [key,field]of [['hud-visible','visible'],['hud-locked','locked']]){
      const toggle=panel.querySelector(`[data-toggle=${key}]`);if(!toggle)continue;
      if(field==='visible'&&spec.required){toggle.disabled=true;toggle.title=t('This control cannot be hidden.');}
      bindSettingsToggle(toggle,()=>this.runtime.layout.elements[this.selected][field],value=>{
        const next=cloneLayout(this.runtime.layout);next.elements[this.selected][field]=value;this.commit(next);if(field==='locked')this.renderPanel();
      });
    }
    const group=panel.querySelector('[data-toggle=hud-group]');if(group)bindSettingsToggle(group,()=>this.group,value=>{this.group=value;});
    const delta={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
    panel.querySelectorAll('[data-nudge]').forEach(el=>{el.disabled=entry.locked;el.onclick=()=>this.nudge(...delta[el.dataset.nudge]);});
    panel.querySelector('[data-editor-action=reset-element]').onclick=()=>{const next=cloneLayout(this.runtime.layout);next.elements[this.selected]=cloneLayout(this.runtime.defaults.elements[this.selected]);if(this.selected==='joystick')next.joystick=cloneLayout(this.runtime.defaults.joystick);this.commit(next);this.renderPanel();};
    panel.querySelectorAll('[data-joystick]').forEach(input=>input.oninput=()=>{const next=cloneLayout(this.runtime.layout);next.joystick[input.dataset.joystick]=input.dataset.joystick==='mode'?input.value:Number(input.value);this.commit(next);this.syncFields();});
    const sample=panel.querySelector('.joystick-sample');if(sample){const move=event=>{const box=sample.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(event.clientX-box.x-box.width/2)/27)),y=Math.max(-1,Math.min(1,(event.clientY-box.y-box.height/2)/27));const dead=this.runtime.layout.joystick.deadZone,length=Math.hypot(x,y),dx=length<dead?0:x/Math.max(1,length),dy=length<dead?0:y/Math.max(1,length);sample.querySelector('span').style.transform=`translate(${dx*27}px,${dy*27}px)`;panel.querySelector('[data-sample-value]').textContent=`${dx.toFixed(2)}, ${dy.toFixed(2)}`;};sample.onpointerdown=event=>{sample.setPointerCapture(event.pointerId);move(event);};sample.onpointermove=event=>{if(sample.hasPointerCapture(event.pointerId))move(event);};sample.onpointerup=()=>{sample.querySelector('span').style.transform='';panel.querySelector('[data-sample-value]').textContent='0, 0';};}
  }
  syncFields() {
    const panel=this.el.querySelector('.hud-editor-panel'),entry=this.runtime.layout.elements[this.selected];
    for(const key of ['x','y','scale','opacity']){const input=panel.querySelector(`[data-editor-field=${key}]`);if(input&&document.activeElement!==input)input.value=['x','y'].includes(key)?entry[key].toFixed(1):entry[key];const value=panel.querySelector(`[data-value=${key}]`);if(value)value.textContent=`${Math.round(entry[key]*100)}%`;}
    const dead=panel.querySelector('[data-value=deadZone]');if(dead)dead.textContent=`${Math.round(this.runtime.layout.joystick.deadZone*100)}%`;
  }
  action(action) {
    if(!this.history)return;
    if(action==='customize'){const panel=this.el.querySelector('.hud-editor-panel');panel.hidden=!panel.hidden;this.el.dataset.preview='false';}
    if(action==='undo'||action==='redo'){this.runtime.apply(constrainLayout(this.history[action](),this.runtime.metrics,this.runtime.safe));this.drafts[this.orientation]=cloneLayout(this.runtime.layout);this.draw();this.renderPanel();}
    if(action==='snap'||action==='guides'){this[action]=!this[action];this.draw();}
    if(action==='preview'){this.el.dataset.preview=this.el.dataset.preview==='true'?'false':'true';this.el.querySelector('[data-editor-action=preview]').setAttribute('aria-pressed',this.el.dataset.preview);}
    if(action==='reset-all'){this.commit(this.runtime.defaults);this.el.querySelector('[data-editor-preset]').value='Default';this.renderPanel();}
    if(action==='export'||action==='import')this.transfer(action);
    if(action==='save'){
      if(validateLayout(this.runtime.layout,this.runtime.metrics,this.runtime.safe).issues.length){this.draw();return;}
      this.drafts[this.orientation]=cloneLayout(this.runtime.layout);this.drafts.schemaVersion=HUD_LAYOUT_VERSION;
      this.onSave(cloneLayout(this.drafts));this.runtime.store=cloneLayout(this.drafts);this.destroy();this.onClose();
    }
    if(action==='cancel')this.cancel();
  }
  transfer(kind) {
    const root=this.el.querySelector('.hud-editor-transfer');root.hidden=false;this.el.querySelector('.hud-editor-panel').hidden=true;
    root.innerHTML=`<label for="hud-layout-code">${html(kind==='export'?'Layout code':'Paste a layout code')}</label><textarea id="hud-layout-code" ${kind==='export'?'readonly':''}></textarea><p class="transfer-error" role="alert"></p><div class="hud-editor-transfer-actions">${kind==='import'?button('Apply import','apply-import'):''}${button('Back','transfer-back')}</div>`;
    const area=root.querySelector('textarea');area.value=kind==='export'?exportLayout(this.runtime.layout,this.orientation):'';area.focus();
    root.querySelector('[data-editor-action=transfer-back]').onclick=()=>{root.hidden=true;this.el.querySelector(`[data-editor-action=${kind}]`).focus();};
    const apply=root.querySelector('[data-editor-action=apply-import]');if(apply)apply.onclick=()=>{try{this.commit(importLayout(area.value,this.runtime.metrics,this.runtime.safe,this.orientation));root.hidden=true;this.renderPanel();this.el.querySelector('[data-editor-action=import]').focus();}catch(error){root.querySelector('.transfer-error').textContent=t(error.message);}};
  }
  cancel() {if(!this.destroyed){this.destroy();this.onClose();}}
  destroy() {
    if(this.destroyed)return;this.destroyed=true;window.removeEventListener('keydown',this.onKey,true);
    const r=this.runtime;r.editing=false;r.onMeasured=null;
    for(const [id,hidden]of this.hiddenStates||[])r.nodes.get(id).hidden=hidden;
    if(this.bossText!==undefined)r.nodes.get('boss-bar').querySelector('.boss-name').textContent=this.bossText;
    r.hud.editingHud=false;r.hud.editor=null;
    if(r.metrics&&!r.destroyed)r.apply(constrainLayout(r.store[r.orientation]||r.defaults,r.metrics,r.safe));
    this.nativeRemove();
  }
}
