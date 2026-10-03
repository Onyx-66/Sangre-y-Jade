import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('venomous-darts');
export const venomousDarts={...data,on:{
 hit({scene,enemy,basicAttack,byAlly,dot,state},level){
  if(!basicAttack||byAlly||dot||!enemy?.active)return;
  const stacks=(enemy.getData('basicPoisonStacks')||[]).filter(stack=>stack.until>scene.elapsed);
  if(stacks.length>=data.params.maxStacks)stacks.shift();
  stacks.push({until:scene.elapsed+data.params.duration,dps:value(data,level),source:scene.player});
  enemy.setData('basicPoisonStacks',stacks);state.target=enemy;state.serial=enemy.getData('serial');state.hudState={type:'stacks',value:stacks.length,max:data.params.maxStacks};proc(scene,data,enemy);
 },
 tick({scene,state}){const enemy=state.target;const count=enemy?.active&&enemy.getData('serial')===state.serial?(enemy.getData('basicPoisonStacks')||[]).filter(stack=>stack.until>scene.elapsed).length:0;state.hudState={type:'stacks',value:count,max:data.params.maxStacks};},
}};
