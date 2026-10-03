import { timedEffect } from '../common.js';
import { present, buff } from './runtime.js';
export function galeRing(scene,skill,ctx) {
 const p=skill.params,point={x:scene.player.x,y:scene.player.y},hit=new Set();let age=0;
 present(scene,skill);buff(scene,skill.id,{speedMult:1+p.speedPct/100},p.duration*ctx.durationScale);
 const visual=present(scene,skill,'ground',{...point,scale:ctx.range/48});
 // Existing ring presentation lasts 0.4s; expansion timing is otherwise unspecified.
 return timedEffect(scene,.4,visual?[visual]:[],dt=>{age+=dt;const radius=ctx.range*Math.min(1,age/.4);for(const enemy of scene.enemies.getChildren())if(enemy.active&&!hit.has(enemy.getData('serial'))&&Math.hypot(enemy.x-point.x,enemy.y-point.y)<=radius){hit.add(enemy.getData('serial'));scene.damageEnemy(enemy,ctx.damage,0,p.knockback,point);present(scene,skill,'impact',{x:enemy.x,y:enemy.y});}});
}
