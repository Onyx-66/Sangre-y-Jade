import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('bloodlust');
function update({scene,state},level){if(scene.elapsed+1e-9>=(state.until||0))state.stacks=0;state.modifiers={attackSpeedMult:1+(state.stacks||0)*value(data,level)/100};state.hudState={type:'stacks',value:state.stacks||0,max:data.params.maxStacks};}
export const bloodlust={...data,on:{
 kill(ctx,level){const {scene,state}=ctx;state.stacks=Math.min(data.params.maxStacks,(state.stacks||0)+1);state.until=scene.elapsed+data.params.duration;update(ctx,level);proc(scene,data,scene.player,true,{stacks:state.stacks});},
 tick:update,
}};
