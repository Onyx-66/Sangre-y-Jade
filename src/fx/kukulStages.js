// Presentation-only metadata: never change a projectile's body, hit set or damage.
export function kukulProjectileContext(scene,projectile){
 if(!projectile)return null;
 let generation=projectile.getData('fxGeneration');
 if(generation==null){generation=(scene.kukulFxSerial||0)+1;scene.kukulFxSerial=generation;projectile.setData('fxGeneration',generation);}
 const velocity=projectile.body?.velocity;
 return {x:projectile.x,y:projectile.y,target:projectile,angle:Math.atan2(velocity?.y??0,velocity?.x??1),
  duration:projectile.getData('life'),replace:true,isAlive:()=>projectile.active&&projectile.getData('fxGeneration')===generation};
}
export function playKukulProjectile(scene,skill,projectile,context={}){
 const attachment=kukulProjectileContext(scene,projectile);
 return attachment?scene.fx?.play(skill.id,'travel',{...attachment,...context}):null;
}
