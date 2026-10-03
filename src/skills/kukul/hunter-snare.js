import { damageArea } from '../common.js';
import { present } from './runtime.js';
export function hunterSnare(scene,skill,ctx) {
 const p=skill.params,point={x:ctx.tx,y:ctx.ty};present(scene,skill);present(scene,skill,'travel',{...point,radius:p.radius*ctx.radiusScale});
 damageArea(scene,point,p.radius*ctx.radiusScale,ctx.damage,{status:{id:'root',duration:p.rootSeconds*ctx.durationScale}});
 present(scene,skill,'impact',point);
 present(scene,skill,'ground',{...point,radius:p.radius*ctx.radiusScale,duration:p.rootSeconds*ctx.durationScale});
}
