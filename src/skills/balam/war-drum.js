import { damageArea } from '../common.js';
import { present, buff, pulses } from './runtime.js';
export function warDrum(scene,skill,ctx) {
 const p=skill.params,duration=p.duration*ctx.durationScale;present(scene,skill,'cast');scene.skillAudio?.loop(skill.id);
 buff(scene,skill.id,{attackSpeedMult:1+p.hastePct/100},duration);
 const effect=pulses(scene,duration,p.interval,index=>{const heavy=index%p.heavyEvery===0;damageArea(scene,scene.player,ctx.range,heavy?p.heavyDamage*ctx.damageScale:ctx.damage,{knockback:heavy?p.knockback:0});present(scene,skill,'impact',{scale:heavy?1.4:1});});
 const finish=effect.destroy.bind(effect);effect.destroy=()=>{finish();scene.skillAudio?.stop(skill.id);};
}
