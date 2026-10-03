import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('stonehide');
const armor=(stats,level)=>Math.min(value(data,level),Math.floor((1-stats.hp/stats.maxHp)*100/data.params.missingTierPct+1e-9)*data.params.armorPerTier);
export const stonehide={...data,stat:(level,{stats})=>({armor:Math.max(0,armor(stats,level))}),on:{
 tick({scene,stats,state},level){const tier=Math.max(0,armor(stats,level));if(tier>(state.tier||0))proc(scene,data);state.tier=tier;state.hudState={type:'stacks',value:tier,max:value(data,level)};},
}};
