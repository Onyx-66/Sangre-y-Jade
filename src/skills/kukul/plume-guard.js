import { timedEffect } from '../common.js';
import { present } from './runtime.js';
export function plumeGuard(scene,skill,ctx) {
 scene.plumeGuard?.effect.destroy();
 const p=skill.params,duration=p.duration*ctx.durationScale,guard={skill,remaining:ctx.charges,until:scene.elapsed+duration};scene.plumeGuard=guard;
 scene.stats.dodgeCharges+=guard.remaining;present(scene,skill);
 const sprites=Array.from({length:guard.remaining},()=>present(scene,skill,'aura',{duration})).filter(Boolean);
 guard.effect=timedEffect(scene,duration,sprites,()=>{sprites.forEach((sprite,i)=>{if(!sprite.active)return;const angle=scene.elapsed*Math.PI*2+i/sprites.length*Math.PI*2;sprite.setVisible(i<guard.remaining).setPosition(scene.player.x+Math.cos(angle)*36,scene.player.y+Math.sin(angle)*36);});},()=>{
  scene.stats.dodgeCharges=Math.max(0,scene.stats.dodgeCharges-guard.remaining);guard.remaining=0;if(scene.plumeGuard===guard)scene.plumeGuard=null;
 });
}
