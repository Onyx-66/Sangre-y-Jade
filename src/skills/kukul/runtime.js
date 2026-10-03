import { present, proc, within, nearest, motion, buff, pulses, segmentDistance } from '../balam/runtime.js';
export { present, proc, within, nearest, motion, buff, pulses, segmentDistance };
export const MOBILITY_SECONDS = .24; // Preserve the previous skill-dash timing where unstated.
export function wantsToMove(scene) {
 const keys=scene.keys||{},cursors=scene.cursors||{};
 const x=Number(keys.right?.isDown||cursors.right?.isDown)-Number(keys.left?.isDown||cursors.left?.isDown)||(scene.hud.move?.x||0);
 const y=Number(keys.down?.isDown||cursors.down?.isDown)-Number(keys.up?.isDown||cursors.up?.isDown)||(scene.hud.move?.y||0);
 return Math.hypot(x,y)>.1 || scene.dash?.remaining>0 || scene.skillMotion?.effect.active;
}
export function fullQuiverCount(scene,count) {
 const entry=scene.passives.equipped.get('full-quiver');
 return entry&&count%entry.passive.params.attackCount===0 ? entry.passive.values[entry.level-1] : 1;
}
export function cancelFocus(scene) {
 const focus=scene.eagleFocus;
 if(!focus)return;
 focus.cancelled=true;focus.skill.remaining=0;focus.effect.destroy();
}
export function consumePlume(scene) {
 const guard=scene.plumeGuard;
 if(!guard||scene.elapsed>=guard.until||guard.remaining<=0)return false;
 guard.remaining--;scene.stats.dodgeCharges=Math.max(0,scene.stats.dodgeCharges-1);
 present(scene,guard.skill,'impact');
 if(guard.remaining===0)guard.effect.destroy();
 return true;
}
