import { attack,cast,inRange,areaHit,summons,kite,ready } from './common.js';
export default {id:'moon_cultist',init(ctx){ctx.state.cooldowns.Summon=ctx.scene.elapsed+attack(ctx,'Summon').interval;},update(ctx){
  const p=attack(ctx,'Summon'),pulse=attack(ctx,'Blood Pulse');
  const count=ctx.scene.enemies.getChildren().filter(e=>e.active&&e.getData('summoner')===ctx.enemy&&e.getData('summonerSerial')===ctx.state.serial).length;
  if(!(ctx.enemy.getData('silenceUntil')>ctx.scene.elapsed)&&count<p.cap&&ready(ctx,'Summon')&&ctx.scene.spawnDirector?.hasSpace(1)!==false&&cast(ctx,'Summon',{shape:'circle',radius:36},()=>summons(ctx,p)))return;
  if(inRange(ctx,pulse)&&cast(ctx,'Blood Pulse',{shape:'ring',radius:pulse.radius,innerRadius:pulse.radius*.85},w=>areaHit(ctx,w,pulse.damage)))return;
  kite(ctx,180,280);
}};
