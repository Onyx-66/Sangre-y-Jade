import { attack,cast,inRange,leap,point,distance,kite } from './common.js';
export default {id:'jaguar',update(ctx){const roar=attack(ctx,'Pack Roar'),p=attack(ctx,'Pounce');
  if(!ctx.state.roared&&ctx.enemy.getData('hp')<=ctx.enemy.getData('maxHp')*roar.threshold){
    if(cast(ctx,'Pack Roar',{shape:'ring',radius:roar.radius,innerRadius:roar.radius*.9},()=>{
      ctx.state.roared=true;for(const e of ctx.scene.enemies.getChildren())if(e.active&&distance(e,ctx.enemy)<=roar.radius)
        e.setData({roarUntil:ctx.scene.elapsed+roar.duration,roarSpeedMult:roar.speedMult});
    }))return;
  }
  if(inRange(ctx,p)&&cast(ctx,'Pounce',{shape:'circle',...point(ctx.target),radius:p.radius},w=>leap(ctx,p,w)))return;
  // Hold the pounce's stated band rather than run through it between evaluations.
  kite(ctx,p.min,p.max);
}};
