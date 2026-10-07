// Breath is a mandatory, LTR bubble bar. Default position follows the hero;
// editor changes pin it to safe-area coordinates and expose position/scale only.
import { t } from '../i18n/index.js';
export function mountBreath(hud){
  if(hud.el.querySelector('.breath-bar'))return;
  const el=document.createElement('div');el.className='breath-bar';el.hidden=true;el.dir='ltr';el.setAttribute('role','meter');
  el.setAttribute('aria-label',t('Breath'));el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax','8');
  el.innerHTML=Array.from({length:8},()=>'<i></i>').join('');hud.el.append(el);
}
export class BreathHud {
  constructor(hud){this.hud=hud;mountBreath(hud);this.el=hud.el.querySelector('.breath-bar');}
  update(state,player,camera){
    const r=this.hud.layoutRuntime,el=this.el;if(r?.editing)return;
    el.hidden=!state.deep;el.setAttribute('aria-label',t('Breath'));el.setAttribute('aria-valuenow',state.air.toFixed(1));el.classList.toggle('low-air',state.air<=2);
    [...el.children].forEach((dot,i)=>dot.style.opacity=String(Math.max(.15,Math.min(1,state.air-i))));r?.syncVisibility('breath');
    const entry=r?.layout?.elements.breath,defaultEntry=r?.defaults?.elements.breath,wrapper=r?.wrappers.get('breath');
    if(!wrapper||!camera||!entry)return;
    if(entry.x===defaultEntry.x&&entry.y===defaultEntry.y&&entry.anchor===defaultEntry.anchor){
      const zoom=camera.zoom||1,x=camera.x+camera.width/2+(player.x-camera.midPoint.x)*zoom,y=camera.y+camera.height/2+(player.y-camera.midPoint.y-65)*zoom;
      const safe=r.safe,w=104*entry.scale,h=18*entry.scale;
      let left=Math.max(safe.x,Math.min(safe.x+safe.width-w,x-w/2)),top=Math.max(safe.y,Math.min(safe.y+safe.height-h,y));
      for(const [id,node] of r.wrappers){if(id==='breath'||node.hidden)continue;const b=node.getBoundingClientRect();if(left<b.right&&left+w>b.left&&top<b.bottom&&top+h>b.top)top=Math.min(safe.y+safe.height-h,b.bottom+4);}
      wrapper.style.left=`${left}px`;wrapper.style.top=`${top}px`;
    }
  }
  destroy(){this.el.remove();}
}
