import { present } from './runtime.js';
export function blackMirror(scene,skill,ctx) {
 const p=skill.params;present(scene,skill,'cast');scene.stats.reflectUntil=scene.elapsed+p.duration*ctx.durationScale;
 scene.blackMirror={...p,angle:ctx.aim};present(scene,skill,'aura',{angle:ctx.aim,duration:p.duration*ctx.durationScale});
}
