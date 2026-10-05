import catalog from '../data/uiKit.json' with { type:'json' };
import { t,getLanguage } from '../i18n/index.js';
import { abortError } from '../systems/RunLoadProgress.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const asset=path=>`${import.meta.env?.BASE_URL||'/'}${path}`;
const kit=id=>catalog.items.find(item=>item.id===id);
const source=id=>asset(kit(id).path);
const slice=id=>{const {top,right,bottom,left}=kit(id).sliceInsets;return `--load-image:url('${source(id)}');--load-insets:${top} ${right} ${bottom} ${left};border-width:${top*.3}px ${right*.3}px ${bottom*.3}px ${left*.3}px`;};
export const LOADING_TIPS=['Dash through danger, then let your stamina recover.','Keep moving to collect XP and unlock more skill slots.','Your companion joins at level 5 and fights automatically.'];

// A body-level overlay survives the HUD replacing ui-root during scene creation.
export class LoadingScreen {
  constructor({hero,map,reduceMotion=false,signal}){
    this.signal=signal;this.tip=0;this.el=document.createElement('section');this.el.className='run-loading';this.el.dir=getLanguage()==='ar'?'rtl':'ltr';this.el.dataset.reducedMotion=String(reduceMotion);
    this.el.setAttribute('role','dialog');this.el.setAttribute('aria-modal','true');this.el.setAttribute('aria-label',t('Loading your run'));
    this.el.innerHTML=`<div class="load-torch left" aria-hidden="true">${[0,1,2,3].map(i=>`<img src="${source(`torch-${i}`)}" style="--frame:${i}" alt="">`).join('')}</div><div class="load-torch right" aria-hidden="true">${[0,1,2,3].map(i=>`<img src="${source(`torch-${i}`)}" style="--frame:${i}" alt="">`).join('')}</div>
      <section class="load-panel load-slice" style="${slice('panel-large')}"><img class="load-logo" src="${asset('assets/branding/logo-menu.png')}" alt="Sangre y Jade">
      <div class="load-selection"><div><img class="load-hero" src="${asset(`assets/pixel/frames/hero-${hero.id}-0.png`)}" alt=""><b>${escape(t(hero.name))}</b></div><div><img class="load-map" src="${asset(`assets/pixel/story-${({overgrown:0,bloodmoon:3,cenote:2})[map.id]??0}.webp`)}" alt=""><b>${escape(t(map.name))}</b></div></div>
      <div class="load-progress load-slice" style="${slice('loading-bar-frame')}" role="progressbar" aria-label="${escape(t('Loading your run'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="load-fill-clip"><div class="load-fill" style="background-image:url('${source('loading-bar-fill')}')"></div></div><b class="load-percent" dir="ltr">0%</b></div>
      <p class="load-phase" role="status">${escape(t('Reading the map'))}</p><p class="load-tip">${escape(t(LOADING_TIPS[0]))}</p>
      <div class="load-failure" hidden><h3>${escape(t('Loading failed'))}</h3><p class="load-failed-assets"></p><p class="load-fallback-note"></p><div class="load-actions"><button type="button" class="load-slice" data-load-retry style="${slice('button-primary')}">${escape(t('Retry'))}</button><button type="button" class="load-slice" data-load-continue style="${slice('button-secondary')}">${escape(t('Continue anyway'))}</button></div></div></section>`;
    document.body.append(this.el);
    this.tipTimer=setInterval(()=>{this.tip=(this.tip+1)%LOADING_TIPS.length;this.el.querySelector('.load-tip').textContent=t(LOADING_TIPS[this.tip]);},3500);
    this.onKey=event=>{event.stopPropagation();if(event.key==='Tab'){const buttons=[...this.el.querySelectorAll('button')].filter(el=>!el.hidden&&el.getClientRects().length);if(!buttons.length){event.preventDefault();return;}const index=buttons.indexOf(document.activeElement);event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
    window.addEventListener('keydown',this.onKey,true);
  }
  update({percent,phase,label}){if(this.destroyed)return;this.el.dataset.phase=phase;this.el.querySelector('.load-fill-clip').style.width=`${percent}%`;this.el.querySelector('.load-percent').textContent=`${Math.floor(percent)}%`;this.el.querySelector('[role=progressbar]').setAttribute('aria-valuenow',String(percent));this.el.querySelector('.load-phase').textContent=t(label);}
  failure(files){
    if(this.signal?.aborted)return Promise.reject(abortError());
    return new Promise((resolve,reject)=>{
      const panel=this.el.querySelector('.load-failure'),required=files.some(file=>file.critical);panel.hidden=false;
      this.el.querySelector('.load-failed-assets').textContent=files.map(file=>t('Could not load: {asset}',{asset:file.url||file.file||file.key})).join('\n');
      this.el.querySelector('.load-fallback-note').textContent=t(required?'This asset is required to start the run.':'Optional art or sound can use a fallback.');
      const retry=this.el.querySelector('[data-load-retry]'),skip=this.el.querySelector('[data-load-continue]');skip.hidden=required;
      const settle=value=>{this.signal?.removeEventListener('abort',abort);panel.hidden=true;retry.onclick=skip.onclick=null;resolve(value);};
      const abort=()=>{retry.onclick=skip.onclick=null;reject(abortError());};
      retry.onclick=()=>settle('retry');skip.onclick=()=>{if(!required)settle('continue');};this.signal?.addEventListener('abort',abort,{once:true});retry.focus();
    });
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;clearInterval(this.tipTimer);window.removeEventListener('keydown',this.onKey,true);this.el.remove();}
}
