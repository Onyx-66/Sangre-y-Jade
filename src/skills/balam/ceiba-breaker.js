import { applyStatus } from '../common.js';
import { present, nearest } from './runtime.js';
export function ceibaBreaker(scene,skill,ctx) {
 const p=skill.params,target=nearest(scene,ctx.range);present(scene,skill,'cast');
 if(!target)return;
 scene.damageEnemy(target,ctx.damage);
 present(scene,skill,'impact',{x:target.x,y:target.y});
 applyStatus(scene,target,'stun',(target.getData('isBoss')?p.bossStun:p.stunSeconds)*ctx.durationScale);
 present(scene,skill,'ground',{x:target.x,y:target.y,duration:p.decalSeconds});
}
