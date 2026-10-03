import { cone, applyStatus } from '../common.js';
import { present, radians } from './runtime.js';
export function obsidianArc(scene,skill,ctx) {
 const p=skill.params;present(scene,skill,'cast',{angle:ctx.aim});
 cone(scene,{angle:ctx.aim,range:ctx.range,width:radians(p.arcDegrees),damage:ctx.damage,onHit:enemy=>applyStatus(scene,enemy,'bleed',p.bleedSeconds*ctx.durationScale,{dps:p.bleedDps*ctx.damageScale})});
 // Props use the same arc, rather than damaging unrelated props behind Balam.
 for(const prop of scene.props.getChildren()){
  const angle=Math.atan2(prop.y-scene.player.y,prop.x-scene.player.x),difference=Math.atan2(Math.sin(angle-ctx.aim),Math.cos(angle-ctx.aim));
  if(prop.active&&Math.hypot(prop.x-scene.player.x,prop.y-scene.player.y)<=ctx.range&&Math.abs(difference)<=radians(p.arcDegrees)/2)scene.damageProp(prop,ctx.damage);
 }
}
