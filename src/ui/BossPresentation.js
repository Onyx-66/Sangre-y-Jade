import kit from '../data/uiKit.json' with {type:'json'};
import {t,getLanguage} from '../i18n/index.js';
import {warningEdgePoint} from '../bosses/rules.js';
import {assetUrl} from './assetUrl.js';

const source=id=>assetUrl(kit.items.find(item=>item.id===id).path);
function banner(definition,className='boss-entry-name'){
 const el=document.createElement('div');el.className=className;
 el.style.setProperty('--boss-banner',`url('${source('banner-title')}')`);
 el.innerHTML='<strong></strong><small></small>';el.dir=getLanguage()==='ar'?'rtl':'ltr';
 el.querySelector('strong').textContent=t(definition.name);el.querySelector('small').textContent=t(definition.epithet||'');return el;
}
export class BossBar {
 constructor(node){
  this.el=node;node.dataset.hudId='boss-bar';node.dataset.bossFramework='true';
  node.innerHTML='<div class="boss-heading"><b class="boss-phase-icon" aria-hidden="true"></b><div class="boss-name"></div><small class="boss-epithet"></small></div><div class="boss-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span><i class="boss-armor" hidden></i><i class="boss-shield" hidden></i><div class="boss-notches"></div><b class="boss-hp-number" dir="ltr"></b></div>';
  node.style.setProperty('--boss-frame',`url('${source('hud-bar-frame')}')`);
  const insets=kit.items.find(item=>item.id==='hud-bar-frame').sliceInsets;
  node.style.setProperty('--boss-frame-slice',`${insets.top} ${insets.right} ${insets.bottom} ${insets.left}`);
  this.name=node.querySelector('.boss-name');this.epithet=node.querySelector('.boss-epithet');this.fill=node.querySelector('.boss-bar span');
  this.notches=node.querySelector('.boss-notches');this.meter=node.querySelector('.boss-bar');this.phase=node.querySelector('.boss-phase-icon');this.hp=node.querySelector('.boss-hp-number');
 }
 update(name,ratio,model={}){
  ratio=Math.max(0,Math.min(1,ratio));this.el.hidden=false;this.name.textContent=t(name);this.epithet.textContent=t(model.epithet||'');
  this.name.dir=this.epithet.dir=getLanguage()==='ar'?'rtl':'ltr';this.el.title=[t(name),t(model.epithet||''),t('Phase {n}',{n:model.phase||1}),model.invulnerable?t('Invulnerable'):''].filter(Boolean).join(' · ');
  this.fill.style.width=`${ratio*100}%`;this.meter.setAttribute('aria-valuenow',String(Math.round(ratio*100)));this.meter.setAttribute('aria-label',this.el.title);
  const signature=JSON.stringify(model.thresholds||[]);if(signature!==this.signature){this.signature=signature;this.notches.innerHTML=(model.thresholds||[]).map(threshold=>`<i style="left:${Math.max(0,Math.min(1,threshold))*100}%"></i>`).join('');}
  this.phase.textContent=['◆','✦','☀'][Math.min(2,(model.phase||1)-1)];this.phase.dataset.phase=String(model.phase||1);
  this.phase.title=t('Phase {n}',{n:model.phase||1});this.phase.setAttribute('aria-label',this.phase.title);
  const shield=this.el.querySelector('.boss-shield'),armor=this.el.querySelector('.boss-armor');
  shield.hidden=!(model.shieldRatio>0);shield.style.width=`${Math.min(1,model.shieldRatio||0)*100}%`;shield.title=t('Shield');
  armor.hidden=!(model.armorPct>0);armor.style.opacity=String(Math.min(.8,model.armorPct||0));armor.title=t('Armor');
  this.hp.textContent=model.maxHp?`${model.hp} / ${model.maxHp}`:'';this.el.dataset.invulnerable=String(!!model.invulnerable);
 }
}

// Body-level presentation is independent of the fading HUD and RTL menus.
// Art comes exclusively from the existing UI kit, never new raster/audio files.
export class BossPresentation {
 constructor(scene){this.scene=scene;this.timers=new Set();this.transients=new Set();this.destroyed=false;}
 start(definition,{skip=false,onSkip}={}){
  this.finish();this.el=document.createElement('section');this.el.className='boss-cinematic';this.el.dataset.shortened=String(skip);
  this.el.setAttribute('role','dialog');this.el.setAttribute('aria-modal','true');this.el.setAttribute('aria-label',t(definition.name));
  this.el.innerHTML='<div class="boss-letterbox top"></div><div class="boss-letterbox bottom"></div><button type="button" class="boss-skip" disabled></button>';
  this.name=banner(definition);this.el.append(this.name);this.button=this.el.querySelector('button');this.button.textContent=t('Tap to skip');
  this.onSkip=onSkip;this.onPointer=event=>{event.preventDefault();event.stopPropagation();onSkip?.();};
  this.el.addEventListener('pointerdown',this.onPointer);this.el.addEventListener('click',this.onPointer);
  document.body.append(this.el);this.button.focus();
  this.onKey=event=>{if(event.key==='Tab'){event.preventDefault();event.stopPropagation();this.button?.focus();}else if(['Escape','Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();onSkip?.();}};
  window.addEventListener('keydown',this.onKey,true);
 }
 update({age,duration,nameVisible,letterbox,hudOpacity}){
  if(!this.el)return;
  const reduced=this.scene.settings.reducedMotion||this.scene.settings.reduceFlashing;
  this.el.dataset.reducedMotion=String(!!reduced);this.name.hidden=!nameVisible;this.name.dir=getLanguage()==='ar'?'rtl':'ltr';
  this.button.disabled=age<1;this.button.textContent=t('Tap to skip');this.button.hidden=age<1;
  this.el.style.setProperty('--letterbox',String(reduced?1:letterbox));
  if(this.scene.hud?.el)this.scene.hud.el.style.opacity=String(hudOpacity);
 }
 finish({definition,keepName=false}={}){
  this.el?.remove();this.el=this.name=this.button=null;
  if(this.onKey)window.removeEventListener('keydown',this.onKey,true);this.onKey=null;
  if(keepName&&definition&&!this.destroyed){
   const flash=banner(definition,'boss-entry-name boss-name-flash');document.body.append(flash);this.transients.add(flash);
   const timer=setTimeout(()=>{flash.remove();this.transients.delete(flash);this.timers.delete(timer);},2000);this.timers.add(timer);
  }
 }
 showWarning(warning,view){
  if(this.destroyed)return;
  if(!this.warning){this.warning=document.createElement('div');this.warning.className='boss-arrival-warning';
   this.warning.innerHTML=`<div style="--boss-banner:url('${source('banner-title')}')"></div><i aria-hidden="true">➤</i>`;document.body.append(this.warning);}
  this.warning.querySelector('div').textContent=t('Boss approaching');this.warning.querySelector('div').dir=getLanguage()==='ar'?'rtl':'ltr';
  const rect=this.scene.hud?.el?.getBoundingClientRect?.()||{x:0,y:0,width:innerWidth,height:innerHeight};
  const point=warningEdgePoint(view,warning.point,rect),arrow=this.warning.querySelector('i');
  arrow.style.left=`${point.x}px`;arrow.style.top=`${point.y}px`;arrow.style.transform=`translate(-50%,-50%) rotate(${point.angle}rad)`;
 }
 clearWarning(){this.warning?.remove();this.warning=null;}
 destroy(){this.destroyed=true;this.finish();this.clearWarning();for(const timer of this.timers)clearTimeout(timer);this.timers.clear();for(const node of this.transients)node.remove();this.transients.clear();}
}
