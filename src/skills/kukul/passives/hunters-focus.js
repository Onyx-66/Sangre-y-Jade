import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('hunters-focus');
export const huntersFocus={...data,
 stat(level,{state,enemy,dot,byAlly}){
  if(!enemy||dot||byAlly)return {};
  const same=enemy===state.target&&enemy.getData('serial')===state.serial;
  return{damageMult:1+Math.min(data.params.maxStacks,same?(state.stacks||0)+1:1)*value(data,level)/100};
 },on:{
 hit({scene,enemy,state,dot,byAlly}){
  if(dot||byAlly)return;
  const same=enemy===state.target&&enemy.getData('serial')===state.serial;
  state.stacks=Math.min(data.params.maxStacks,same?(state.stacks||0)+1:1);state.target=enemy;state.serial=enemy.getData('serial');
  state.hudState={type:'stacks',value:state.stacks,max:data.params.maxStacks};
  const serial=state.serial;proc(scene,data,enemy,true,{target:enemy,stacks:state.stacks,isAlive:()=>enemy.active&&enemy.getData('serial')===serial});
 },
 tick({state}){state.hudState??={type:'stacks',value:0,max:data.params.maxStacks};},
}};
