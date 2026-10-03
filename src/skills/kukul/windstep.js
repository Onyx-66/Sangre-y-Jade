import { timedEffect } from '../common.js';
import { present, motion, buff, segmentDistance, MOBILITY_SECONDS } from './runtime.js';
export function windstep(scene,skill,ctx) {
 const p=skill.params,start={x:scene.player.x,y:scene.player.y},end={x:start.x+Math.cos(ctx.aim)*ctx.range,y:start.y+Math.sin(ctx.aim)*ctx.range},hit=new Set();
 const width=scene.player.body.halfWidth||scene.player.body.radius||22;
 present(scene,skill);buff(scene,skill.id,{speedMult:1+p.speedPct/100},p.duration*ctx.durationScale);
 let previous=start;
 motion(scene,end,MOBILITY_SECONDS*ctx.durationScale,{airborne:true,onStep:()=>{
  for(const enemy of scene.enemies.getChildren())if(enemy.active&&!hit.has(enemy.getData('serial'))&&segmentDistance(enemy,previous,scene.player)<=width+(enemy.body?.halfWidth||enemy.body?.radius||0)){
   hit.add(enemy.getData('serial'));scene.damageEnemy(enemy,ctx.damage);present(scene,skill,'impact',{x:enemy.x,y:enemy.y});
  }
  previous={x:scene.player.x,y:scene.player.y};
 },onEnd:()=>{
  const visual=present(scene,skill,'ground',{x:(start.x+end.x)/2,y:(start.y+end.y)/2,angle:ctx.aim,duration:p.trailSeconds*ctx.durationScale});let age=0,next=p.interval;
  timedEffect(scene,p.trailSeconds*ctx.durationScale,visual?[visual]:[],dt=>{age+=dt;while(next<=age+1e-9){for(const enemy of scene.enemies.getChildren())if(enemy.active&&segmentDistance(enemy,start,end)<=width*ctx.radiusScale)scene.damageEnemy(enemy,p.trailDamage*ctx.damageScale);next+=p.interval;}});
 }});
}
