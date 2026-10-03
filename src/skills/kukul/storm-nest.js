import { timedEffect, spawnProjectile } from '../common.js';
import { present, within } from './runtime.js';
export function stormNest(scene,skill,ctx) {
 const p=skill.params,point={x:scene.player.x,y:scene.player.y};let age=0,next=p.interval;present(scene,skill);
 const visual=present(scene,skill,'ground',{...point,duration:p.duration*ctx.durationScale});scene.skillAudio?.loop(skill.id);
 return timedEffect(scene,p.duration*ctx.durationScale,visual?[visual]:[],dt=>{
  age+=dt;while(next<=age+1e-9){
   const targets=within(scene,scene.heroData.automatic.range*ctx.radiusScale,point).sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y)).slice(0,p.targets);
   for(const target of targets){const angle=Math.atan2(target.y-point.y,target.x-point.x);spawnProjectile(scene,{origin:point,angle,damage:ctx.damage,tint:skill.palette[0],skillId:skill.id,onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y})});present(scene,skill,'travel',{...point,angle});}
   next+=p.interval;
  }
 },()=>scene.skillAudio?.stop(skill.id));
}
