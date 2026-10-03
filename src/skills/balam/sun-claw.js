import { timedEffect, applyStatus } from '../common.js';
import { present } from './runtime.js';
export function sunClaw(scene,skill,ctx) {
 const p=skill.params,hit=new Set();let elapsed=0;present(scene,skill,'cast');
 timedEffect(scene,p.duration*ctx.durationScale,[],dt=>{
  elapsed+=dt;const radius=ctx.range*Math.min(1,elapsed/(p.duration*ctx.durationScale));
  // Four overlapping sweeps share one hit set, so their seams cannot multiply damage.
  for(const enemy of scene.enemies.getChildren())if(enemy.active&&!hit.has(enemy.getData('serial'))&&Math.hypot(enemy.x-scene.player.x,enemy.y-scene.player.y)<=radius){
   hit.add(enemy.getData('serial'));scene.damageEnemy(enemy,ctx.damage);applyStatus(scene,enemy,'burn',p.burnSeconds*ctx.durationScale,{dps:p.burnDps*ctx.damageScale});present(scene,skill,'impact',{x:enemy.x,y:enemy.y});
  }
 });
}
