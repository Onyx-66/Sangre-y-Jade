import { timedEffect, spawnProjectile } from '../common.js';
import { present, within } from './runtime.js';
export function forkedFlight(scene,skill,ctx) {
 const p=skill.params;present(scene,skill);
 const parent=spawnProjectile(scene,{angle:ctx.aim,damage:0,life:p.splitSeconds*ctx.durationScale,skillId:skill.id,tint:skill.palette[0]});if(!parent)return;
 present(scene,skill,'travel',{projectile:parent});
 const owner={};parent.setData({pendingSplit:true,splitOwner:owner});
 let age=0;const start={x:parent.x,y:parent.y},speed=Math.hypot(parent.body.velocity.x,parent.body.velocity.y);
 const effect=timedEffect(scene,p.splitSeconds*ctx.durationScale,[],dt=>{age+=dt;},()=>{
  // Life expiry may run first; retain the old shot's endpoint but never destroy a reused sprite.
  const own=parent.getData('splitOwner')===owner;
  const origin=own?{x:parent.x,y:parent.y}:{x:start.x+Math.cos(ctx.aim)*speed*age,y:start.y+Math.sin(ctx.aim)*speed*age};if(own)parent.destroy();if(scene.ended)return;
  const targets=within(scene,scene.heroData.automatic.range*ctx.radiusScale,origin).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));
  present(scene,skill,'impact',origin);
  for(let i=0;i<ctx.projectiles;i++){
   const target=targets[i%Math.max(1,targets.length)],angle=target?Math.atan2(target.y-origin.y,target.x-origin.x):ctx.aim+(i-(ctx.projectiles-1)/2)*.13;
   const shot=spawnProjectile(scene,{origin,angle,damage:ctx.damage,tint:skill.palette[0],skillId:skill.id,onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y})});
   shot?.setData({homingTarget:target,homingSerial:target?.getData('serial'),homingTurn:Math.PI*2,homingSpeed:620});present(scene,skill,'travel',{projectile:shot});
  }
 });return effect;
}
