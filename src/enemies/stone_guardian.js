import { attack,cast,inRange,areaHit,steer } from './common.js';
export default {id:'stone_guardian',update(ctx){const p=attack(ctx,'Ground Slam');
  if(inRange(ctx,p)&&cast(ctx,'Ground Slam',{shape:'circle',radius:p.radius},w=>areaHit(ctx,w,p.damage,{melee:true,knockback:p.knockback})))return;
  steer(ctx);
}};
