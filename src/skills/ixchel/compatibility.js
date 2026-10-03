// Temporary ID adapters for the uncompleted step 9 only. Not redesigned Ixchel handlers.
// Remove this module when Ixchel's catalogue is converted; never dispatch unknown skills.
import { HEROES } from '../../data/heroes.js';
import { ixchelFxId, decorateIxchelProjectile } from '../../fx/ixchelStages.js';
const fire=(s,k,...args)=>decorateIxchelProjectile(s,s.fireProjectile(...args),ixchelFxId(k.id));
const types={
 projectile(s,k,c){for(let i=0;i<c.projectiles;i++)fire(s,k,s.player.x,s.player.y,c.aim+(i-(c.projectiles-1)/2)*.13,c.damage,720,k.pierce||1,1.35*c.durationScale,0x69eec1,k.critBonus||0);},
 burst(s,k,c){for(let i=0;i<c.projectiles;i++)fire(s,k,s.player.x,s.player.y,c.projectiles>=8?i/c.projectiles*Math.PI*2:c.aim+(i-(c.projectiles-1)/2)*.13,c.damage,610,k.pierce||1,1.25*c.durationScale,0x75e0b6);},
 nova(s,k,c){s.damageArea(s.player,c.range,c.damage,k.knockback||180);s.ringEffect(s.player.x,s.player.y,c.range/64,0x62e7b9);s.damagePropsInArea(s.player.x,s.player.y,c.range);const id=ixchelFxId(k.id);if(id)s.fx?.play(id,'impact',{x:s.player.x,y:s.player.y,radius:c.range});},
 cone(s,k,c){s.attackCone(c.aim,c.range,c.damage,Math.PI*.72,k.knockback||170);s.coneEffect(c.aim,c.range);s.damagePropsInArea(s.player.x+Math.cos(c.aim)*c.range*.45,s.player.y+Math.sin(c.aim)*c.range*.45,c.range*.55);},
 line(s,k,c){for(let i=0;i<c.projectiles;i++)fire(s,k,s.player.x,s.player.y,c.aim+(i-(c.projectiles-1)/2)*.13,c.damage,770,k.pierce||12,1.25*c.durationScale,0x8affd1,0,1.45);},
 orbit(s,k,c){for(let i=0;i<c.projectiles;i++)fire(s,k,s.player.x,s.player.y,i/c.projectiles*Math.PI*2+s.elapsed,c.damage,330,3,1.4*c.durationScale,0xefc27a);s.stats.shield+=7+k.level*3;},
 trap(s,k,c){s.placeTrap(c.tx,c.ty,c.range,c.damage,c.durationScale,{fxId:ixchelFxId(k.id)});},
 heal(s,k){s.stats.hp=Math.min(s.stats.maxHp,s.stats.hp+(k.heal||24)*(1+(k.level-1)*.2)*s.stats.healing);if(k.shield)s.stats.shield+=k.shield;s.healEffect();},
 shield(s,k){s.stats.shield+=(k.shield||45)*(1+(k.level-1)*.25);s.shieldEffect();},
 chain(s,k,c){const id=ixchelFxId(k.id);s.chainAttack(c.target,c.range,c.damage,c.chains,{onLink:(from,target)=>{if(!id)return;s.fx?.play(id,'travel',{from,target});s.fx?.play(id,'impact',{x:target.x,y:target.y});}});},
 summon(s,k,c){s.createSummon(c.damage,{duration:12*c.durationScale,fxId:ixchelFxId(k.id)});},
 dash(s,k,c){s.attackCone(c.aim,c.range,c.damage,Math.PI*.52,260);s.forceDash(c.aim,.24*c.durationScale);},
 rain(s,k,c){s.rainAttack(c.tx,c.ty,c.range,c.damage,c.projectiles,ixchelFxId(k.id));},
};
export const IXCHEL_COMPATIBILITY_HANDLERS=Object.fromEntries(HEROES.ixchel.skills.map(skill=>{
 const handler=types[skill.type];if(!handler)throw Error(`Unsupported Ixchel compatibility id: ${skill.id}`);
 return[skill.id,(scene,definition,ctx)=>{
  const id=ixchelFxId(definition.id);
  if(id)scene.fx?.play(id,'cast',{x:scene.player.x,y:scene.player.y,angle:ctx.aim,range:ctx.range});
  handler(scene,definition,ctx);if(!id)scene.audio.sfx('spell',.06);
  if(id&&definition.type==='cone')scene.fx?.play(id,'impact',{x:scene.player.x+Math.cos(ctx.aim)*ctx.range*.5,y:scene.player.y+Math.sin(ctx.aim)*ctx.range*.5});
  if(id&&definition.type==='shield')scene.fx?.play(id,'aura',{target:scene.player,duration:.5});
 }];
}));
