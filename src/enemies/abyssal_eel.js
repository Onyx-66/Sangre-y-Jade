import { attack,cast,inRange,dash,steer } from './common.js';
export default {id:'abyssal_eel',update(ctx){const p=attack(ctx,'Dash Zap');
  if(inRange(ctx,p)&&cast(ctx,'Dash Zap',{shape:'line',angle:ctx.angle,length:p.length,width:2*(ctx.data.radius+18)},w=>{
    dash(ctx,p,w.angle);ctx.state.motion.hit=()=>{
      const extra=ctx.scene.enemySystem?.isWaterAt(ctx.scene.player,p.waterRange)?p.chain:0;
      ctx.scene.damagePlayer((p.damage+extra)*(ctx.enemy.getData('disarmUntil')>ctx.scene.elapsed?.55:1),ctx.enemy.x,ctx.enemy.y,ctx.enemy,true);
    };
  }))return;
  // B3 WaterSystem owns the +25% swimming multiplier; legacy embedders retain V06.
  steer(ctx,ctx.angle,!ctx.scene.water&&ctx.scene.enemySystem?.isWaterAt(ctx.enemy)?ctx.data.waterSpeed*(ctx.speed/ctx.data.speed):ctx.speed);
}};
