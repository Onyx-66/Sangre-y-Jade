import { damageArea } from '../common.js';
import { present, nearest, motion } from './runtime.js';
export function prowlersLeap(scene,skill,ctx) {
 const p=skill.params,target=nearest(scene,ctx.range);
 const destination=target?{x:target.x,y:target.y}:{x:scene.player.x+Math.cos(ctx.aim)*ctx.range,y:scene.player.y+Math.sin(ctx.aim)*ctx.range};
 present(scene,skill,'cast',{angle:ctx.aim});
 motion(scene,destination,p.duration*ctx.durationScale,{airborne:true,onEnd:()=>{damageArea(scene,scene.player,p.radius*ctx.radiusScale,ctx.damage,{knockback:p.knockback});present(scene,skill,'impact');}});
}
