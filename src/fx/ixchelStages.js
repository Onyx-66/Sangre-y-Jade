import { IXCHEL_FX_DEFINITIONS } from './generated/ixchel.js';

const activeIds=new Set(IXCHEL_FX_DEFINITIONS.filter(skill=>skill.kind==='active').map(skill=>skill.id));
export const ixchelFxId=id=>activeIds.has(id)?id:id==='smoking-mirror'?'copal-veil':null;

// Visual bridge only: retain all current projectile speed, damage, pierce and life.
// Step 9's future per-ID handlers can call the same registered stages directly.
export function decorateIxchelProjectile(scene,projectile,id,context={}){
  if(!projectile||!scene.fx||!activeIds.has(id))return projectile;
  const serial=(scene.ixchelFxSerial||0)+1;scene.ixchelFxSerial=serial;
  projectile.setData({ixchelFx:id,fxGeneration:serial});
  const velocity=projectile.body?.velocity,angle=context.angle??Math.atan2(velocity?.y||0,velocity?.x||1),
    isAlive=()=>projectile.active&&projectile.getData('fxGeneration')===serial;
  scene.fx.play(id,'travel',{x:projectile.x,y:projectile.y,target:projectile,angle,
    duration:projectile.getData('life'),isAlive,replace:true});
  const previous=projectile.getData('onHit');
  projectile.setData('onHit',enemy=>{
    previous?.(enemy);
    scene.fx.play(id,'impact',{x:enemy.x,y:enemy.y,angle,radius:18});
  });
  return projectile;
}
