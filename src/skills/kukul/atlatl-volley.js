import { spawnProjectile } from '../common.js';
import { present } from './runtime.js';
export function atlatlVolley(scene,skill,ctx) {
 present(scene,skill);
 for(let i=0;i<ctx.projectiles;i++){
  const shot=spawnProjectile(scene,{angle:ctx.aim+(i-(ctx.projectiles-1)/2)*skill.params.spread,damage:ctx.damage,pierce:skill.params.pierce,life:ctx.range/620,tint:skill.palette[0],skillId:skill.id,onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y})});
  if(shot)present(scene,skill,'travel',{projectile:shot});
 }
}
