import { damageArea } from '../common.js';
import { present } from './runtime.js';
export function hunterSnare(scene,skill,ctx) {
 const p=skill.params,point={x:ctx.tx,y:ctx.ty};present(scene,skill);present(scene,skill,'travel',{...point});
 damageArea(scene,point,p.radius*ctx.radiusScale,ctx.damage,{status:{id:'root',duration:p.rootSeconds*ctx.durationScale}});
 present(scene,skill,'ground',{...point,scale:p.radius*ctx.radiusScale/48,duration:p.rootSeconds*ctx.durationScale});
}
