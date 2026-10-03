import { definition, value } from '../data.js';
import { damageArea } from '../../common.js';
import { proc } from '../runtime.js';
const data=definition('earthshaker');
export const earthshaker={...data,on:{
 basicAttack({scene,stats,weapon,count,state},level){state.hudState={type:'counter',value:count%data.params.attackCount,max:data.params.attackCount};if(count%data.params.attackCount!==0)return;damageArea(scene,scene.player,data.params.range,weapon.damage*stats.damage*scene.support.modifiers().damage*value(data,level)/100,{knockback:data.params.knockback});proc(scene,data);},
 tick({state}){state.hudState??={type:'counter',value:0,max:data.params.attackCount};},
}};
