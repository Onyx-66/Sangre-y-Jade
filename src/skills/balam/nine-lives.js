import { present, buff } from './runtime.js';
export function nineLives(scene,skill,ctx) {
 const p=skill.params;present(scene,skill,'cast');
 scene.stats.hp=Math.min(scene.stats.maxHp,scene.stats.hp+(p.heal+(scene.stats.maxHp-scene.stats.hp)*p.missingPct/100)*scene.stats.healing);
 buff(scene,skill.id,{speedMult:1+p.speedPct/100},p.duration*ctx.durationScale);
}
