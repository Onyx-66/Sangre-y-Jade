import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('predators-rhythm');
export const predatorsRhythm={...data,on:{
 crit({scene,state},level){if(scene.elapsed<(state.readyAt||0))return;for(const skill of scene.skillSlots)skill.remaining=Math.max(0,skill.remaining-value(data,level));state.readyAt=scene.elapsed+data.params.internalCooldown;proc(scene,data);},
 tick({scene,state}){state.hudState={type:'timer',remaining:Math.max(0,(state.readyAt||0)-scene.elapsed),duration:data.params.internalCooldown};},
}};
