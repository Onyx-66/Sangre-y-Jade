import { attack,cast,inRange,kite,shots } from './common.js';
export default {id:'bone_archer',update(ctx){const p=attack(ctx,'Aimed Shot');
  if(!(ctx.enemy.getData('silenceUntil')>ctx.scene.elapsed)&&inRange(ctx,p)&&cast(ctx,'Aimed Shot',{shape:'line',angle:ctx.angle,length:p.max,width:24},()=>
    shots(ctx,{...p,count:ctx.enemy.getData('hp')<ctx.enemy.getData('maxHp')*p.threshold?p.fan:1,spread:.2,piercing:true})))return;
  kite(ctx,p.min,p.max);
}};
