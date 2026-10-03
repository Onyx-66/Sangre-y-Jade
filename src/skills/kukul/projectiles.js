// Metadata belongs to the shot, not the shooter: upgrades cannot retroactively change it.
export function configureProjectile(scene, projectile, {basicAttack=false,skillId=null,byAlly=false}={}) {
 if(!projectile)return projectile;
 projectile.setData({basicAttack,skillId});
 if(byAlly)return projectile;
 const modifiers=scene.passives.modifiers();
 projectile.setData('pierce',projectile.getData('pierce')+(modifiers.pierce||0));
 if(modifiers.pierce)scene.fx?.play('sharpened-flint','proc',{x:projectile.x,y:projectile.y,duration:.1});
 if(scene.skillBuffs?.has('hunters-trance')){
  const target=scene.closestEnemy(projectile.x,projectile.y,scene.heroData.automatic.range*scene.stats.range);
  const velocity=projectile.body.velocity;
  // The catalogue leaves "slightly" unspecified; limit steering to a quarter turn/sec.
  projectile.setData({homingTarget:target,homingSerial:target?.getData('serial'),homingTurn:Math.PI/2,homingSpeed:Math.hypot(velocity.x,velocity.y)});
 }
 return projectile;
}
