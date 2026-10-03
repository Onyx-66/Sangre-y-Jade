import { present, motion, segmentDistance } from './runtime.js';
export function pyramidRush(scene,skill,ctx) {
 const p=skill.params,hit=new Set(),duration=p.duration*ctx.durationScale;
 const destination={x:scene.player.x+Math.cos(ctx.aim)*ctx.range,y:scene.player.y+Math.sin(ctx.aim)*ctx.range};
 present(scene,skill,'cast');present(scene,skill,'travel',{x:scene.player.x,y:scene.player.y,angle:ctx.aim,range:ctx.range,duration});scene.knockbackImmuneUntil=scene.elapsed+duration;
 let previous={x:scene.player.x,y:scene.player.y};
 const strike=stomp=>{for(const enemy of scene.enemies.getChildren()){
  const radius=stomp?p.radius*ctx.radiusScale:(scene.player.body.halfWidth||scene.player.body.radius||p.radius/2)+(enemy.body?.halfWidth||enemy.body?.radius||0);
  const distance=stomp?Math.hypot(enemy.x-scene.player.x,enemy.y-scene.player.y):segmentDistance(enemy,previous,scene.player);
  if(enemy.active&&distance<=radius&&!hit.has(enemy.getData('serial'))){hit.add(enemy.getData('serial'));scene.damageEnemy(enemy,ctx.damage,0,p.knockback);}
 }previous={x:scene.player.x,y:scene.player.y};};
 motion(scene,destination,duration,{onStep:()=>strike(false),onEnd:()=>{strike(true);present(scene,skill,'impact');}});
}
