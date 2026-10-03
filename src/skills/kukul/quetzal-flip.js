import { spawnProjectile } from '../common.js';
import { nearest, present, motion, MOBILITY_SECONDS } from './runtime.js';
export function quetzalFlip(scene,skill,ctx) {
 const target=nearest(scene,Infinity),serial=target?.getData('serial');
 const away=target?Math.atan2(scene.player.y-target.y,scene.player.x-target.x):ctx.aim+Math.PI;
 const end={x:scene.player.x+Math.cos(away)*ctx.range,y:scene.player.y+Math.sin(away)*ctx.range};present(scene,skill,'cast',{angle:away,duration:MOBILITY_SECONDS*ctx.durationScale});
 motion(scene,end,MOBILITY_SECONDS*ctx.durationScale,{airborne:true,onEnd:()=>{
  if(!target?.active||target.getData('serial')!==serial)return;
  const angle=Math.atan2(target.y-scene.player.y,target.x-scene.player.x);
  for(let i=0;i<ctx.projectiles;i++){const shot=spawnProjectile(scene,{angle,damage:ctx.damage,tint:skill.palette[0],skillId:skill.id,onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y})});present(scene,skill,'travel',{projectile:shot});}
 }});
}
