import { timedEffect, damageArea, applyStatus } from '../common.js';
import { present, within } from './runtime.js';
export function stoneMaw(scene,skill,ctx) {
 const p=skill.params,candidates=within(scene,ctx.range),radius=p.radius*ctx.radiusScale;
 const point=candidates.sort((a,b)=>within(scene,radius,b).length-within(scene,radius,a).length)[0]||{x:scene.player.x+Math.cos(ctx.aim)*ctx.range,y:scene.player.y+Math.sin(ctx.aim)*ctx.range};
 const origin={x:point.x,y:point.y};present(scene,skill,'cast');
 const sprite=present(scene,skill,'ground',{...origin,duration:p.duration*ctx.durationScale});let elapsed=0;
 const effect=timedEffect(scene,p.duration*ctx.durationScale,sprite?[sprite]:[],dt=>{
  elapsed+=dt;
  if(elapsed+1e-9<p.armSeconds*ctx.durationScale)return;
  if(within(scene,p.triggerRadius*ctx.radiusScale,origin).length||elapsed+1e-9>=(p.armSeconds+p.armedSeconds)*ctx.durationScale){
   damageArea(scene,origin,radius,ctx.damage,{onHit:enemy=>applyStatus(scene,enemy,'stun',p.stunSeconds*ctx.durationScale)});
   present(scene,skill,'impact',origin);effect.destroy();
  }
 });
}
