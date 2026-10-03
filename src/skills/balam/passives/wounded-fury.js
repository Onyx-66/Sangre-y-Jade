import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('wounded-fury'),active=stats=>stats.hp/stats.maxHp<data.params.thresholdPct/100;
export const woundedFury={...data,stat:(level,{stats})=>active(stats)?{damageMult:1+value(data,level)/100,lifestealPct:data.secondaryValues[level-1]/100}:{},on:{
 tick({scene,stats,state}){const enabled=active(stats);if(enabled&&!state.active){const sound=scene.elapsed>=(state.readyAt||0);proc(scene,data,scene.player,sound);if(sound)state.readyAt=scene.elapsed+data.params.soundCooldown;}state.active=enabled;state.hudState={type:'timer',ready:enabled,remaining:enabled?0:1,duration:1};},
}};
