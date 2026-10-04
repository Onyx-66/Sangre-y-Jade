import { timedEffect, damageArea } from '../common.js';
import { present } from './runtime.js';
import { shakePixels } from '../../systems/Viewport.js';
export function skyfall(scene,skill,ctx) {
 const p=skill.params,center={x:ctx.tx,y:ctx.ty},delay=p.telegraphSeconds*ctx.durationScale,duration=p.duration*ctx.durationScale;
 const points=Array.from({length:ctx.projectiles},()=>{const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*ctx.range;return{x:center.x+Math.cos(angle)*r,y:center.y+Math.sin(angle)*r};});
 present(scene,skill,'cast',{x:center.x,y:center.y,radius:ctx.range,duration:delay});
 points.forEach((point,i)=>present(scene,skill,'ground',{...point,radius:p.radius*ctx.radiusScale,duration:delay+(i+1)*duration/points.length}));
 let age=0,index=0,travelled=0;
 return timedEffect(scene,delay+duration,[],dt=>{age+=dt;
  while(travelled<points.length&&age+1e-9>=delay+(travelled+1)*duration/points.length-.15)present(scene,skill,'travel',points[travelled++]);
  while(index<points.length&&age+1e-9>=delay+(index+1)*duration/points.length){const point=points[index++];damageArea(scene,point,p.radius*ctx.radiusScale,ctx.damage);present(scene,skill,'impact',{...point,radius:p.radius*ctx.radiusScale});shakePixels(scene,90,p.shakePixels);}
 });
}
