import { attack,inRange,fuse,steer } from './common.js';
export default {id:'glow_wisp',update(ctx){const p=attack(ctx,'Detonate');
  if(inRange(ctx,p)&&fuse(ctx,p))return;steer(ctx);
}};
