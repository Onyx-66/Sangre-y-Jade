import { damageArea, applyStatus } from '../common.js';
import { present } from './runtime.js';
export function jaguarRoar(scene,skill,ctx) {
 const p=skill.params;present(scene,skill,'cast',{scale:ctx.range/100});
 damageArea(scene,scene.player,ctx.range,ctx.damage,{knockback:p.knockback,onHit:enemy=>applyStatus(scene,enemy,enemy.getData('isBoss')?'slow':'fear',(enemy.getData('isBoss')?p.slowSeconds:p.fearSeconds)*ctx.durationScale,{pct:p.bossSlow/100})});
}
