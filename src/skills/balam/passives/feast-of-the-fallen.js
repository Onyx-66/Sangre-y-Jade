import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('feast-of-the-fallen');
const display=state=>{state.hudState={type:'counter',value:(state.kills||0)%data.params.killCount,max:data.params.killCount};};
export const feastOfTheFallen={...data,on:{
 kill({scene,stats,state,enemy},level){state.kills=(state.kills||0)+1;if(state.kills%data.params.killCount===0){stats.hp=Math.min(stats.maxHp,stats.hp+stats.maxHp*value(data,level)/100);proc(scene,data,enemy||scene.player);}display(state);},
 tick({state}){display(state);},
}};
