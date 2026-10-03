import { timedEffect, lineStrike, applyStatus } from '../common.js';
import { present } from './runtime.js';
export function fangPath(scene,skill,ctx) {
 const p=skill.params,origin={x:scene.player.x,y:scene.player.y},hit=new Set(),step=ctx.range/p.fangs,interval=p.staggerMs/1000*ctx.durationScale;
 let elapsed=0,index=0;present(scene,skill,'cast');
 const erupt=()=>{
  const point={x:origin.x+Math.cos(ctx.aim)*step*index,y:origin.y+Math.sin(ctx.aim)*step*index};
  const enemies=lineStrike(scene,{origin:point,angle:ctx.aim,range:step,width:step,damage:0});
  for(const enemy of enemies)if(!hit.has(enemy.getData('serial'))){hit.add(enemy.getData('serial'));scene.damageEnemy(enemy,ctx.damage);applyStatus(scene,enemy,'slow',p.slowSeconds*ctx.durationScale,{pct:p.slowPct/100});}
  present(scene,skill,'ground',point);index++;
 };
 erupt();timedEffect(scene,interval*p.fangs,[],dt=>{elapsed+=dt;while(index<p.fangs&&elapsed+1e-9>=index*interval)erupt();});
}
