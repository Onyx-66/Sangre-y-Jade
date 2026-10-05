import { attack,cast,inRange,shots,kite } from './common.js';
export default {id:'jungle_wasp',update(ctx){const p=attack(ctx,'Venom Spit');
  if(!(ctx.enemy.getData('silenceUntil')>ctx.scene.elapsed)&&inRange(ctx,p)&&cast(ctx,'Venom Spit',{shape:'circle',radius:ctx.data.radius+5},()=>shots(ctx,{...p,poison:{dps:p.poisonDps,duration:p.duration}})))return;
  kite(ctx,p.min,p.max,true);
}};
