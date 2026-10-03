import { present, buff } from './runtime.js';
export function huntersTrance(scene,skill,ctx) {
 const p=skill.params,duration=p.duration*ctx.durationScale;present(scene,skill);present(scene,skill,'aura',{duration});
 return buff(scene,skill.id,{attackSpeedMult:1+p.attackSpeedPct/100,crit:p.critPct/100},duration);
}
