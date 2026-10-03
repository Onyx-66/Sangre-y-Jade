import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
import { kukulProjectileContext } from '../../../fx/kukulStages.js';
const data=definition('fleet-hunter');
function update({scene,state},level){const remaining=Math.max(0,(state.until||0)-scene.elapsed);state.modifiers={basicDamageMult:remaining>1e-9?1+value(data,level)/100:1};state.hudState={type:'timer',remaining,duration:data.params.duration,ready:remaining>1e-9};}
export const fleetHunter={...data,on:{
 dash(ctx,level){ctx.state.until=ctx.scene.elapsed+data.params.duration;update(ctx,level);},
 skillCast(ctx,level){if(['windstep','quetzal-flip'].includes(ctx.skill.id)){ctx.state.until=ctx.scene.elapsed+data.params.duration;update(ctx,level);}},
 basicAttack(ctx,level){if(ctx.state.until>ctx.scene.elapsed){
  const shots=ctx.scene.projectiles.getChildren().filter(shot=>shot.active&&shot.getData('fxBasicCount')===ctx.count);
  for(const [index,shot] of shots.entries())proc(ctx.scene,data,shot,index===0,{...kukulProjectileContext(ctx.scene,shot),replace:false});
 }ctx.state.until=0;update(ctx,level);},
 tick:update,
}};
