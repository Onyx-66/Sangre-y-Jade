import { attack,cast,inRange,point,teleport,after,areaHit,kite,cue } from './common.js';
export default {id:'blood_wraith',update(ctx){const p=attack(ctx,'Blink Strike');
  ctx.enemy.setAlpha?.(.4+.6*(1+Math.sin(ctx.scene.elapsed*3))/2);
  if(inRange(ctx,p)){
    const direction=ctx.scene.lastMove||{x:Math.cos(ctx.angle),y:Math.sin(ctx.angle)},r=ctx.data.radius+18;
    const marker={x:ctx.target.x-direction.x*r,y:ctx.target.y-direction.y*r};
    if(cast(ctx,'Blink Strike',{shape:'circle',...marker,radius:r},()=>{
      teleport(ctx,marker);after(ctx,p.delay,()=>{cue(ctx,'attack',ctx.enemy,{ability:'Blink Slash',angle:ctx.angle});
        areaHit(ctx,{shape:'circle',...point(ctx.enemy),radius:r},p.damage,{melee:true,bleed:{dps:p.bleedDps,duration:p.duration}});});
    }))return;
  }
  kite(ctx,p.min,p.max);
}};
