// Temporary ID adapters for the uncompleted step 9 only. Not redesigned Ixchel handlers.
// Remove this module when Ixchel's catalogue is converted; never dispatch unknown skills.
import { HEROES } from '../../data/heroes.js';
const types={
 projectile(s,k,c){for(let i=0;i<c.projectiles;i++)s.fireProjectile(s.player.x,s.player.y,c.aim+(i-(c.projectiles-1)/2)*.13,c.damage,720,k.pierce||1,1.35*c.durationScale,0x69eec1,k.critBonus||0);},
 burst(s,k,c){for(let i=0;i<c.projectiles;i++)s.fireProjectile(s.player.x,s.player.y,c.projectiles>=8?i/c.projectiles*Math.PI*2:c.aim+(i-(c.projectiles-1)/2)*.13,c.damage,610,k.pierce||1,1.25*c.durationScale,0x75e0b6);},
 nova(s,k,c){s.damageArea(s.player,c.range,c.damage,k.knockback||180);s.ringEffect(s.player.x,s.player.y,c.range/64,0x62e7b9);s.damagePropsInArea(s.player.x,s.player.y,c.range);},
 cone(s,k,c){s.attackCone(c.aim,c.range,c.damage,Math.PI*.72,k.knockback||170);s.coneEffect(c.aim,c.range);s.damagePropsInArea(s.player.x+Math.cos(c.aim)*c.range*.45,s.player.y+Math.sin(c.aim)*c.range*.45,c.range*.55);},
 line(s,k,c){for(let i=0;i<c.projectiles;i++)s.fireProjectile(s.player.x,s.player.y,c.aim+(i-(c.projectiles-1)/2)*.13,c.damage,770,k.pierce||12,1.25*c.durationScale,0x8affd1,0,1.45);},
 orbit(s,k,c){for(let i=0;i<c.projectiles;i++)s.fireProjectile(s.player.x,s.player.y,i/c.projectiles*Math.PI*2+s.elapsed,c.damage,330,3,1.4*c.durationScale,0xefc27a);s.stats.shield+=7+k.level*3;},
 trap(s,k,c){s.placeTrap(c.tx,c.ty,c.range,c.damage,c.durationScale);},
 heal(s,k){s.stats.hp=Math.min(s.stats.maxHp,s.stats.hp+(k.heal||24)*(1+(k.level-1)*.2)*s.stats.healing);if(k.shield)s.stats.shield+=k.shield;s.healEffect();},
 shield(s,k){s.stats.shield+=(k.shield||45)*(1+(k.level-1)*.25);s.shieldEffect();},
 chain(s,k,c){s.chainAttack(c.target,c.range,c.damage,c.chains);},
 summon(s,k,c){s.createSummon(c.damage,{duration:12*c.durationScale});},
 dash(s,k,c){s.attackCone(c.aim,c.range,c.damage,Math.PI*.52,260);s.forceDash(c.aim,.24*c.durationScale);},
 rain(s,k,c){s.rainAttack(c.tx,c.ty,c.range,c.damage,c.projectiles);},
};
export const IXCHEL_COMPATIBILITY_HANDLERS=Object.fromEntries(HEROES.ixchel.skills.map(skill=>{
 const handler=types[skill.type];if(!handler)throw Error(`Unsupported Ixchel compatibility id: ${skill.id}`);
 return[skill.id,(scene,definition,ctx)=>{handler(scene,definition,ctx);scene.audio.sfx('spell',.06);}];
}));
