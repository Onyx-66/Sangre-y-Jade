// Physical LTR HUD positioning, independent of menu RTL; saved layouts are
// clamped to the current safe area and event/RAF resources are released.
import { HUD_ELEMENTS, emptyHudLayouts, migrateHudLayouts, layoutFromBoxes, constrainLayout, boxFor, orientationFor, cloneLayout } from './HudLayout.js';
import { mountBreath } from '../ui/BreathHud.js';

const SELECTORS={vitals:'.bars','xp-dock':'.xp-dock',clock:'.hud-clock',counters:'.hud-currency',pause:'.pause-btn',
  'ally-panel':'.ally-panel','passive-slots':'.passive-slots','innate-traits':'.innate-traits',
  'skill-q':'[data-skill="0"]','skill-e':'[data-skill="1"]','skill-r':'[data-skill="2"]','skill-t':'[data-skill="3"]',
  dash:'[data-dash]',attack:'[data-attack]',joystick:'.joystick','boss-bar':'.boss-wrap','auto-indicator':'#auto-indicator',breath:'.breath-bar'};

export class HudLayoutRuntime {
  constructor(hud,store=emptyHudLayouts()) {
    mountBreath(hud);
    this.hud=hud;this.store=migrateHudLayouts(store);this.nodes=new Map();this.wrappers=new Map();this.markers=new Map();this.originalStyles=new Map();
    this.onResize=()=>{cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>this.measure());};
    window.addEventListener('resize',this.onResize);
    this.ready=new Promise(resolve=>{this.initialFrame=requestAnimationFrame(()=>{this.measure();resolve(this);});});
  }
  unwrap() {
    for(const [id,node] of this.nodes){
      const marker=this.markers.get(id);marker?.parentNode?.insertBefore(node,marker);
      const style=this.originalStyles.get(id);if(style==null)node.removeAttribute('style');else node.setAttribute('style',style);
      this.wrappers.get(id)?.remove();marker?.remove();
    }
    this.wrappers.clear();this.markers.clear();this.originalStyles.clear();
  }
  measure() {
    if(this.destroyed||!this.hud.el.isConnected)return;
    const working=this.editing?cloneLayout(this.layout):null;
    this.unwrap();
    const frame=this.hud.el.getBoundingClientRect();this.safe={x:frame.x,y:frame.y,width:frame.width,height:frame.height};
    this.orientation=orientationFor(innerWidth,innerHeight);this.metrics={};
    for(const spec of HUD_ELEMENTS){
      const node=this.hud.el.querySelector(SELECTORS[spec.id]);this.nodes.set(spec.id,node);node.dataset.hudId=spec.id;
      // Hidden Attack/boss still have baseline anchors, without painting a frame.
      const hidden=node.hidden,style=node.getAttribute('style');node.hidden=false;node.style.visibility='hidden';
      const r=node.getBoundingClientRect(),width=spec.interactive?Math.max(44,r.width):r.width,height=spec.interactive?Math.max(44,r.height):r.height;
      const children=spec.id==='passive-slots'?[...node.querySelectorAll('.passive-slot')]:spec.id==='innate-traits'?[...node.querySelectorAll('.innate-slot')]:[];
      this.metrics[spec.id]={x:r.x-(width-r.width)/2,y:r.y-(height-r.height)/2,width:Math.max(1,width),height:Math.max(1,height),paintWidth:r.width,paintHeight:r.height,
        touchWidth:children.length?Math.min(...children.map(el=>el.getBoundingClientRect().width)):width,
        touchHeight:children.length?Math.min(...children.map(el=>el.getBoundingClientRect().height)):height};
      node.hidden=hidden;if(style==null)node.removeAttribute('style');else node.setAttribute('style',style);
    }
    this.defaults=constrainLayout(layoutFromBoxes(this.metrics,this.safe,this.hud.settings),this.metrics,this.safe);
    for(const spec of HUD_ELEMENTS){
      const node=this.nodes.get(spec.id),metric=this.metrics[spec.id];
      const marker=document.createComment(`hud-${spec.id}`);node.before(marker);this.markers.set(spec.id,marker);this.originalStyles.set(spec.id,node.getAttribute('style'));
      const wrapper=document.createElement('div');wrapper.className='hud-element';wrapper.dataset.hudElement=spec.id;wrapper.id=spec.id==='auto-indicator'?'hud-auto-indicator':spec.id;
      // Pause gets its own parent so counter scale/opacity never changes it.
      if(spec.id==='pause')this.hud.el.append(wrapper);else marker.after(wrapper);
      wrapper.append(node);this.wrappers.set(spec.id,wrapper);
      for(const [key,value]of Object.entries({position:'relative',left:'auto',right:'auto',top:'auto',bottom:'auto',transform:'none',margin:'0',width:`${metric.paintWidth}px`,height:`${metric.paintHeight}px`}))node.style.setProperty(key,value,'important');
      node.style.setProperty('flex-shrink','0','important');
      wrapper.addEventListener('pointerdown',event=>{
        if(event.target!==wrapper||this.editing)return;
        if(node.tagName==='BUTTON')node.dispatchEvent(new PointerEvent('pointerdown',event));
        else node.querySelector('[tabindex="0"]')?.dispatchEvent(new PointerEvent('pointerdown',event));
      });
      wrapper.addEventListener('click',event=>{if(event.target===wrapper&&node.tagName==='BUTTON'&&!this.editing)node.click();});
    }
    this.layout=constrainLayout(working||this.store[this.orientation]||this.defaults,this.metrics,this.safe);
    this.apply(this.layout);this.onMeasured?.();
  }
  apply(layout) {
    this.layout=cloneLayout(layout);
    for(const spec of HUD_ELEMENTS){
      const wrapper=this.wrappers.get(spec.id);if(!wrapper)continue;
      const entry=layout.elements[spec.id],metric=this.metrics[spec.id],box=boxFor(entry,metric,this.safe);
      wrapper.style.left=`${box.x}px`;wrapper.style.top=`${box.y}px`;wrapper.style.width=`${metric.width}px`;wrapper.style.height=`${metric.height}px`;
      wrapper.style.transform=`scale(${entry.scale})`;wrapper.style.opacity=entry.opacity;
      const node=this.nodes.get(spec.id);node.style.setProperty('align-self','center');
      this.syncVisibility(spec.id);
    }
  }
  syncVisibility(id) {
    // Phaser may update the HUD before its first layout-measurement RAF.
    if(!this.layout||this.destroyed)return;
    for(const key of id?[id]:this.wrappers.keys()){
      const wrapper=this.wrappers.get(key),node=this.nodes.get(key);
      if(!wrapper||!node)return;
      wrapper.hidden=!this.layout.elements[key].visible||node.hidden;
    }
  }
  floatingAt(x,y) {
    const wrapper=this.wrappers.get('joystick'),box=boxFor(this.layout.elements.joystick,this.metrics.joystick,this.safe);
    wrapper.style.left=`${Math.max(this.safe.x,Math.min(this.safe.x+this.safe.width-box.width,x-box.width/2))}px`;
    wrapper.style.top=`${Math.max(this.safe.y,Math.min(this.safe.y+this.safe.height-box.height,y-box.height/2))}px`;
  }
  restoreJoystick(){if(this.layout)this.apply(this.layout);}
  destroy(){this.destroyed=true;cancelAnimationFrame(this.initialFrame);cancelAnimationFrame(this.resizeFrame);window.removeEventListener('resize',this.onResize);this.onMeasured=null;}
}
