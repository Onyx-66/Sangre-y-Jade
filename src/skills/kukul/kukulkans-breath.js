import { lineStrike } from '../common.js';
import { present, buff, pulses } from './runtime.js';
export function kukulkansBreath(scene,skill,ctx) {
 const p=skill.params,duration=p.duration*ctx.durationScale;present(scene,skill);present(scene,skill,'aura',{duration,angle:ctx.aim,scale:ctx.range/48});scene.skillAudio?.loop(skill.id);
 buff(scene,skill.id,{speedMult:p.movePct/100},duration);
 const effect=pulses(scene,duration,p.interval,()=>{lineStrike(scene,{angle:ctx.aim,range:ctx.range,width:p.width*ctx.radiusScale,damage:ctx.damage});present(scene,skill,'impact',{angle:ctx.aim});});
 const destroy=effect.destroy;effect.destroy=function(){if(!this.active)return;destroy.call(this);scene.skillAudio?.stop(skill.id);};return effect;
}
