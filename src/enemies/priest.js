import { attack,cast,inRange,kite,shots,shield,distance,ready,point } from './common.js';
export default {id:'priest',update(ctx){const ward=attack(ctx,'Ward'),volley=attack(ctx,'Soul Volley');
  const ally=ctx.scene.enemies.getChildren().filter(e=>e.active&&e!==ctx.enemy&&!e.getData('buried')&&distance(e,ctx.enemy)<=ward.range)
    .sort((a,b)=>distance(a,ctx.enemy)-distance(b,ctx.enemy))[0];
  if(ally&&ready(ctx,'Ward')&&!((ally.getData('wardShield')||0)>0&&ally.getData('wardUntil')>ctx.scene.elapsed)){
    const serial=ally.getData('serial');if(cast(ctx,'Ward',{shape:'ring',...point(ally),follow:ally,color:0x8ec5ff,outlineColor:0xbde0ff,radius:ally.getData('radius')+8,innerRadius:ally.getData('radius')},()=>{
      if(ally.active&&ally.getData('serial')===serial)shield(ctx,ally,ward);
    }))return;
  }
  if(!(ctx.enemy.getData('silenceUntil')>ctx.scene.elapsed)&&inRange(ctx,volley)&&cast(ctx,'Soul Volley',{shape:'circle',radius:ctx.data.radius+6},()=>shots(ctx,volley)))return;
  kite(ctx,ctx.data.kiteMin,ctx.data.kiteMax);
}};
