import { timedEffect, damageArea } from '../common.js';
import { present } from './runtime.js';
export function cacaoBomb(scene,skill,ctx) {
 const p=skill.params,start={x:scene.player.x,y:scene.player.y},distance=Math.hypot(ctx.tx-start.x,ctx.ty-start.y)||1,ratio=Math.min(1,ctx.range/distance);
 const target={x:start.x+(ctx.tx-start.x)*ratio,y:start.y+(ctx.ty-start.y)*ratio};let age=0;present(scene,skill);
 const duration=p.duration*ctx.durationScale,visual=present(scene,skill,'travel',{...start,duration});
 return timedEffect(scene,duration,visual?[visual]:[],dt=>{age+=dt;const t=Math.min(1,age/duration);visual?.active&&visual.setPosition(start.x+(target.x-start.x)*t,start.y+(target.y-start.y)*t-Math.sin(t*Math.PI)*p.radius/2);},()=>{
  if(scene.ended)return;damageArea(scene,target,p.radius*ctx.radiusScale,ctx.damage,{knockback:p.knockback});present(scene,skill,'impact',target);
 });
}
