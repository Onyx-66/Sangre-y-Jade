import { timedEffect, spawnProjectile } from '../common.js';
import { present, wantsToMove, cancelFocus } from './runtime.js';
export function eagleEye(scene,skill,ctx) {
 cancelFocus(scene);
 const p=skill.params,point={x:scene.player.x,y:scene.player.y},focus={skill,cancelled:false};scene.eagleFocus=focus;
 present(scene,skill);const visual=present(scene,skill,'aura',{duration:p.focusSeconds*ctx.durationScale,target:ctx.target});
 focus.effect=timedEffect(scene,p.focusSeconds*ctx.durationScale,visual?[visual]:[],()=>{
  if(wantsToMove(scene)||Math.hypot(scene.player.x-point.x,scene.player.y-point.y)>1e-6){focus.cancelled=true;skill.remaining=0;focus.effect.destroy();}
  else scene.player.setVelocity(0,0);
 },()=>{
  if(scene.eagleFocus===focus)scene.eagleFocus=null;
  if(focus.cancelled||scene.ended)return;
  const angle=scene.getAimAngle(ctx.target?.active?ctx.target:null);
  for(let i=0;i<ctx.projectiles;i++){spawnProjectile(scene,{angle,damage:ctx.damage,critBonus:1,pierce:p.pierce,life:ctx.range/620,tint:skill.palette[0],skillId:skill.id,onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y})});present(scene,skill,'travel',{angle});}
 });
}
