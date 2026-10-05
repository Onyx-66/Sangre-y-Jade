import { attack,cast,inRange,areaHit,point,steer } from './common.js';
export default {id:'vine_lurker',init(ctx){ctx.state.buried=true;ctx.enemy.setData('buried',true);ctx.enemy.setVisible?.(false);},update(ctx){
  if(ctx.state.buried){ctx.enemy.setVelocity(0,0);if(ctx.distance>ctx.data.surfaceRange)return;
    ctx.state.buried=false;ctx.enemy.setData('buried',false);ctx.enemy.setVisible?.(true);ctx.enemy.setAlpha?.(1);ctx.scene.enemyVisuals?.emerge(ctx.enemy);}
  const p=attack(ctx,'Root Snare');if(inRange(ctx,p)&&cast(ctx,'Root Snare',{shape:'circle',...point(ctx.target),radius:p.radius},w=>areaHit(ctx,w,p.damage,{root:p.root})))return;
  steer(ctx);
}};
