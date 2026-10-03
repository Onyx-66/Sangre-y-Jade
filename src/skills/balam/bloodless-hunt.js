import { spawnProjectile } from '../common.js';
import { present, within, radians } from './runtime.js';
export function bloodlessHunt(scene,skill,ctx) {
 const p=skill.params,target=within(scene,ctx.range).sort((a,b)=>b.getData('hp')-a.getData('hp'))[0];present(scene,skill,'cast');
 if(!target)return;
 for(let i=0;i<ctx.projectiles;i++){
  const damage=ctx.damage+Math.min(p.bonusCap,target.getData('maxHp')*p.hpPct/100)*ctx.damageScale;
  const angle=Math.atan2(target.y-scene.player.y,target.x-scene.player.x);
  const projectile=spawnProjectile(scene,{angle,damage,speed:p.speed,tint:skill.palette[0],onHit:enemy=>present(scene,skill,'impact',{x:enemy.x,y:enemy.y,angle})});
  projectile?.setData({homingTarget:target,homingSerial:target.getData('serial'),homingTurn:radians(p.turnDegrees),homingSpeed:p.speed});
  if(projectile)present(scene,skill,'travel',{x:projectile.x,y:projectile.y,angle,range:ctx.range,duration:Math.min(p.range/p.speed,.5)});
 }
}
