import { present, within } from './runtime.js';
export function sunDart(scene,skill,ctx) {
 const hit=new Set();let previous=scene.player;present(scene,skill);
 for(let i=0;i<ctx.chains;i++){
  const target=within(scene,ctx.range,previous).filter(enemy=>!hit.has(enemy.getData('serial'))).sort((a,b)=>Math.hypot(a.x-previous.x,a.y-previous.y)-Math.hypot(b.x-previous.x,b.y-previous.y))[0];
  if(!target)break;
  hit.add(target.getData('serial'));present(scene,skill,'travel',{x:previous.x,y:previous.y,angle:Math.atan2(target.y-previous.y,target.x-previous.x)});
  scene.damageEnemy(target,ctx.damage*(1+skill.params.bouncePct/100)**i);present(scene,skill,'impact',{x:target.x,y:target.y});previous={x:target.x,y:target.y};
 }
}
