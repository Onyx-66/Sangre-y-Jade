import { attack,cast,dash,inRange,steer } from './common.js';
export default {id:'shade',update(ctx){const p=attack(ctx,'Lunge');
  if(inRange(ctx,p)&&cast(ctx,'Lunge',{shape:'line',angle:ctx.angle,length:p.length,width:2*(ctx.data.radius+18)},w=>dash(ctx,p,w.angle)))return;
  steer(ctx);
}};
