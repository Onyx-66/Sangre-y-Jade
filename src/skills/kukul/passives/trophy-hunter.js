import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('trophy-hunter');
function update({scene,state},level){const remaining=Math.max(0,(state.until||0)-scene.elapsed);state.modifiers={damageMult:remaining>1e-9?1+value(data,level)/100:1};state.hudState={type:'timer',remaining,duration:data.params.duration,ready:remaining>1e-9};}
export const trophyHunter={...data,on:{
 kill(ctx,level){const{scene,stats,state,enemy}=ctx;if(!enemy||!(['jaguar','priest'].includes(enemy.getData('type'))||enemy.getData('isBoss')))return;
  stats.hp=Math.min(stats.maxHp,stats.hp+stats.maxHp*data.params.healPct/100*stats.healing);state.until=scene.elapsed+data.params.duration;update(ctx,level);proc(scene,data,enemy);
 },tick:update,
}};
