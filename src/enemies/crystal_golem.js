import { attack,cast,inRange,reflect,shots,steer,ready } from './common.js';
export default {id:'crystal_golem',init(ctx){ctx.state.cooldowns['Prism Shield']=ctx.scene.elapsed+attack(ctx,'Prism Shield').interval;},update(ctx){
  const shield=attack(ctx,'Prism Shield'),burst=attack(ctx,'Shard Burst');
  if(ready(ctx,'Prism Shield')&&cast(ctx,'Prism Shield',{shape:'ring',radius:ctx.data.radius+8,innerRadius:ctx.data.radius},()=>reflect(ctx,shield)))return;
  if(inRange(ctx,burst)&&ready(ctx,'Shard Burst')){
    // One owner-bound resolving warning plus seven non-resolving lines. All
    // eight share timing/cancellation; never fire eight copies of the volley.
    if(cast(ctx,'Shard Burst',{shape:'line',angle:0,length:burst.range,width:20},()=>shots(ctx,{...burst,radial:true,speed:210}))){
      for(let i=1;i<burst.count;i++)ctx.scene.telegraphs.play({shape:'line',x:ctx.enemy.x,y:ctx.enemy.y,angle:i*Math.PI*2/burst.count,length:burst.range,width:20,windup:burst.windup,owner:ctx.enemy,tag:'Shard Burst',sound:false});
      return;
    }
  }
  steer(ctx);
}};
