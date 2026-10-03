import { definition, value } from '../data.js';
import { proc, wantsToMove } from '../runtime.js';
const data=definition('steady-aim');
function stationary(scene,state){return !wantsToMove(scene)&&Math.hypot(scene.player.body.velocity.x,scene.player.body.velocity.y)<1e-6&&(!state.point||Math.hypot(scene.player.x-state.point.x,scene.player.y-state.point.y)<1e-6);}
export const steadyAim={...data,
 stat(level,{scene,state}){return{crit:state.ready&&stationary(scene,state)?value(data,level)/100:0};},
 on:{tick({scene,state,dt=0}){
  const still=stationary(scene,state),was=state.ready;state.stillFor=still?(state.stillFor||0)+dt:0;state.ready=state.stillFor+1e-9>=data.params.standSeconds;
  state.point={x:scene.player.x,y:scene.player.y};state.hudState={type:'timer',remaining:Math.max(0,data.params.standSeconds-state.stillFor),duration:data.params.standSeconds,ready:state.ready};
  if(state.ready&&!was)proc(scene,data,scene.player,false);
 }},
};
