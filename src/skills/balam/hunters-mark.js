import { applyStatus } from '../common.js';
import { present, within } from './runtime.js';
export function huntersMark(scene,skill,ctx) {
 const p=skill.params;present(scene,skill,'cast');
 const targets=within(scene,ctx.range).sort((a,b)=>Number(b.getData('isBoss'))-Number(a.getData('isBoss'))||b.getData('damage')-a.getData('damage')).slice(0,p.targets);
 for(const target of targets){applyStatus(scene,target,'mark',p.duration*ctx.durationScale,{bonus:p.bonusPct/100});target.setData({markHeal:p.heal,markSource:scene.player});present(scene,skill,'aura',{target,duration:p.duration*ctx.durationScale});}
}
