import { damageArea } from '../common.js';
import { present, buff, pulses } from './runtime.js';
export function clawCyclone(scene,skill,ctx) {
 const p=skill.params,duration=p.duration*ctx.durationScale;
 present(scene,skill,'cast');scene.skillAudio?.loop(skill.id);
 buff(scene,skill.id,{speedMult:p.movePct/100},duration);
 scene.knockbackImmuneUntil=Math.max(scene.knockbackImmuneUntil||0,scene.elapsed+duration);
 const effect=pulses(scene,duration,p.interval,()=>{damageArea(scene,scene.player,ctx.range,ctx.damage);present(scene,skill,'impact');});
 const finish=effect.destroy.bind(effect);effect.destroy=()=>{finish();scene.skillAudio?.stop(skill.id);};
}
