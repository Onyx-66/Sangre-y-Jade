import { timedEffect, damageArea } from '../common.js';
import { present } from './runtime.js';
export function featherstorm(scene,skill,ctx) {
 const p=skill.params,point={x:scene.player.x,y:scene.player.y};let age=0,next=p.interval;
 present(scene,skill);const visual=present(scene,skill,'travel',{...point,duration:p.duration*ctx.durationScale,radius:p.radius*ctx.radiusScale});scene.skillAudio?.loop(skill.id);
 return timedEffect(scene,p.duration*ctx.durationScale,visual?[visual]:[],dt=>{
  // Resolve pulse positions chronologically, even when the caller advances a large frame.
  const end=age+dt;
  while(next<=end+1e-9){const at={x:point.x+Math.cos(ctx.aim)*p.speed*next,y:point.y+Math.sin(ctx.aim)*p.speed*next};damageArea(scene,at,p.radius*ctx.radiusScale,ctx.damage);present(scene,skill,'impact',at);next+=p.interval;}
  age=end;visual?.active&&visual.setPosition(point.x+Math.cos(ctx.aim)*p.speed*age,point.y+Math.sin(ctx.aim)*p.speed*age).setRotation(age*Math.PI*2);
 },()=>scene.skillAudio?.stop(skill.id));
}
