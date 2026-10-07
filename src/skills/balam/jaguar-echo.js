import { timedEffect } from '../common.js';
import { present, nearest } from './runtime.js';
import { effectDepth } from '../../render/layers.js';
export function jaguarEcho(scene,skill,ctx) {
 const p=skill.params;scene.jaguarEcho?.destroy();present(scene,skill,'cast');
 const sprite=scene.add.sprite(scene.player.x,scene.player.y,'enemy-jaguar').setTint(skill.palette[0]).setScale(.55).setDepth(effectDepth(scene.player.y,19));
 sprite.setData('byAlly',true);present(scene,skill,'travel',{target:sprite,angle:ctx.aim,duration:p.duration*ctx.durationScale});let timer=p.interval;
 scene.jaguarEcho=timedEffect(scene,p.duration*ctx.durationScale,[sprite],dt=>{
  const target=nearest(scene,Infinity,sprite);if(!target)return;
  const dx=target.x-sprite.x,dy=target.y-sprite.y,distance=Math.hypot(dx,dy),step=Math.min(Math.max(0,distance-ctx.range),p.speed*dt);
  if(distance){sprite.setPosition(sprite.x+dx/distance*step,sprite.y+dy/distance*step);sprite.setFlipX(dx<0);}
  timer=Math.max(0,timer-dt);
  if(timer<=1e-9&&Math.hypot(target.x-sprite.x,target.y-sprite.y)<=ctx.range+1e-9){timer=p.interval;scene.damageEnemy(target,ctx.damage,0,0,sprite,{byAlly:true,heroSkill:true});present(scene,skill,'impact',{x:target.x,y:target.y});}
 });
}
