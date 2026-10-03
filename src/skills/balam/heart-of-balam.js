import { timedEffect } from '../common.js';
import { present, detonateWard } from './runtime.js';
export function heartOfBalam(scene,skill,ctx) {
 const p=skill.params;
 if(scene.balamWard){scene.stats.shield=Math.max(0,scene.stats.shield-scene.balamWard.remaining);scene.balamWard.fired=true;scene.balamWard.effect.destroy();}
 const ward={remaining:p.ward*(1+p.wardLevelPct/100*(ctx.level-1)),range:ctx.range,damage:ctx.damage,skill,fired:false};
 scene.balamWard=ward;scene.stats.shield+=ward.remaining;present(scene,skill,'cast');present(scene,skill,'aura',{duration:p.duration*ctx.durationScale,range:ctx.range});scene.skillAudio?.loop(skill.id);
 ward.effect=timedEffect(scene,p.duration*ctx.durationScale,[],()=>{},()=>detonateWard(scene,ward));
}
