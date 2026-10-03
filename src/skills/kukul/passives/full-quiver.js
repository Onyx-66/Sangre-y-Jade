import { definition } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('full-quiver');
export const fullQuiver={...data,on:{
 basicAttack({scene,count,state}){state.hudState={type:'counter',value:count%data.params.attackCount,max:data.params.attackCount};if(count%data.params.attackCount===0)proc(scene,data);},
 tick({state}){state.hudState??={type:'counter',value:0,max:data.params.attackCount};},
}};
