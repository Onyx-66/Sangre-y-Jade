import { spawnProjectile } from '../common.js';
import { present } from './runtime.js';
export function serpentPath(scene,skill,ctx) {
 const p=skill.params;present(scene,skill);
 for(let i=0;i<ctx.projectiles;i++){
  const shot=spawnProjectile(scene,{angle:ctx.aim,damage:ctx.damage,speed:p.speed,pierce:p.pierce,life:ctx.range/p.speed,tint:skill.palette[0],skillId:skill.id,onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y})});
  shot?.setData('wave',{x:scene.player.x,y:scene.player.y,angle:ctx.aim,age:0,range:ctx.range,amplitude:p.amplitude*ctx.radiusScale,speed:p.speed,phase:i*Math.PI});
  if(shot)present(scene,skill,'travel',{projectile:shot});
 }
}
