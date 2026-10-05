import { attack,cast,dash,steer,point,ready } from './common.js';
export default {id:'bat',update(ctx){const p=attack(ctx,'Swoop Dive'),s=ctx.state;
  if(s.retreatUntil>ctx.scene.elapsed){steer(ctx,ctx.angle+Math.PI);return;}
  if(Math.abs(ctx.distance-p.orbitRadius)>24){steer(ctx,ctx.distance<p.orbitRadius?ctx.angle+Math.PI:ctx.angle);return;}
  steer(ctx,ctx.angle+Math.PI/2);s.circleTime=(s.circleTime||0)+ctx.dt;
  s.circleGoal??=p.circleMin+(p.circleMax-p.circleMin)*(ctx.scene.enemySystem?.random()??.5);
  if(s.circleTime<s.circleGoal||!ready(ctx,'Swoop Dive'))return;
  const marker=point(ctx.target),angle=Math.atan2(marker.y-ctx.enemy.y,marker.x-ctx.enemy.x);
  cast(ctx,'Swoop Dive',{shape:'circle',...marker,radius:ctx.data.radius+18},()=>{
    // The brief gives no dive speed: use its listed movement speed, cross the
    // marker by one collision diameter, then start the exact one-second retreat.
    dash(ctx,{length:ctx.distance+2*ctx.data.radius,speed:ctx.speed,damage:p.damage},angle);
    ctx.state.motion.end=()=>{s.retreatUntil=ctx.scene.elapsed+p.retreat;s.circleTime=0;s.circleGoal=null;};
  });
}};
