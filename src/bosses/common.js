import {BOSS_FAIRNESS,insideSafeCircle,segmentDistance} from './rules.js';
import {telegraphContains} from '../systems/Telegraph.js';
import {enemyStatusDefaults,updateDamageOverTime} from '../skills/StatusEffects.js';
import {canSpawnEnemy} from '../systems/CombatRules.js';
import {enemyAffixDefaults} from '../systems/EnemyAffixes.js';
import {enemyBehaviorDefaults} from '../systems/EnemyBehaviorSystem.js';

export const TAU=Math.PI*2;
export const point=o=>({x:o.x,y:o.y});
export const at=(o,r,a)=>({x:o.x+Math.cos(a)*r,y:o.y+Math.sin(a)*r});
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function place(o,p){if(o.body?.reset)o.body.reset(p.x,p.y);else o.setPosition(p.x,p.y);}
export function parameters(ctx,id){return ctx.definition.phases.flatMap(p=>p.abilities).find(a=>a.id===id).parameters;}
export function ability(ctx,id,execute,shape,extra={}){
 const row=ctx.definition.phases.flatMap(p=>p.abilities).find(a=>a.id===id);
 return {...row,windup:row.parameters.windup,recovery:BOSS_FAIRNESS.minimumRecovery,execute,shape,...extra};
}
export function pursue(ctx){ctx.boss.setVelocity(Math.cos(ctx.angle)*ctx.speed,Math.sin(ctx.angle)*ctx.speed);}
// New phases add their advertised mechanics; base attacks never disappear.
// Least recently cast first avoids a short-cooldown ability starving the rest.
export function phaseAbilities(ctx,handlers){
 const rows=ctx.definition.phases.slice(0,ctx.state.phase+1).flatMap(p=>p.abilities);
 return rows.map(row=>handlers[row.id](ctx)).sort((a,b)=>
  (a.cooldown===0?-1:b.cooldown===0?1:0)||((ctx.state.lastCast[a.id]??-1e12)-(ctx.state.lastCast[b.id]??-1e12)));
}
export function cue(ctx,id,kind='cast',extra={}){
 const base=`boss-${ctx.definition.id}-${id}`;
 ctx.scene.fx?.play(`${base}-${kind==='warn'?'accent':'main'}`,kind==='warn'?'cast':'impact',{
  ...point(ctx.boss),angle:ctx.angle,duration:kind==='warn'?ctx.ability?.windup??.5:undefined,sound:false,
  boss:ctx.boss,state:ctx.state,arena:ctx.state.arena,target:ctx.target,markers:ctx.markers,dives:ctx.dives,
  safeCircles:ctx.safeCircles,kind,isAlive:()=>ctx.runtime.alive()&&(kind!=='warn'||ctx.state.busy?.ability.id===id),...extra});
 const audioId=`${base}-${kind}`;
 if(ctx.scene.options?.bossHooks?.audio)ctx.scene.options.bossHooks.audio(audioId);
 else ctx.scene.skillAudio?.play?.(audioId,'cast');
}
export function hitArea(ctx,shape,damage,options={}){
 return telegraphContains(shape,ctx.scene.player)&&ctx.damage(damage,shape.x,shape.y,options);
}
export function ringPoints(center,count,radius,angle=0){return Array.from({length:count},(_,i)=>at(center,radius,angle+i*TAU/count));}
export function warning(ctx,shape,windup,resolve){
 const record=ctx.scene.telegraphs?.play({...shape,windup:Math.max(.5,windup),owner:ctx.boss,bornAt:ctx.scene.elapsed,tag:`boss:${ctx.ability.id}:followup`,sound:false,
  onResolve:w=>{if(ctx.runtime.alive()&&!ctx.scene.pausedForChoice){
   if(ctx.ability.id==='avalanche')cue(ctx,ctx.ability.id,'cast',{...w,markerOnly:true});resolve(w);
  }}});
 if(record&&ctx.ability.id==='avalanche')cue(ctx,ctx.ability.id,'warn',{...record,markerOnly:true,isAlive:()=>ctx.runtime.alive()&&ctx.scene.telegraphs.live.has(record)});
 return record;
}
export function spawnAdds(ctx,type,positions,{elite=false}={}){
 // Preserve ground-only hero compatibility of the existing boss aliases.
 const compatible=canSpawnEnemy(ctx.scene.heroData,type)?type:'shade';
 ctx.runtime.reserve(positions.length);
 return positions.map(position=>ctx.scene.spawnEnemy(compatible,null,{position,summoner:ctx.boss,emerge:true,affix:elite?'armored':null})).filter(Boolean);
}

// Combat lifetimes advance on the gameplay clock, never wall timers/tweens.
// One batched drawing layer for hazards and one for darkness; targets reuse the
// normal damage/projectile collision group, so melee and all skills can hit them.
export class BossRuntime {
 constructor(controller,state){this.controller=controller;this.scene=controller.scene;this.state=state;this.tasks=[];this.targets=[];
  this.graphics=this.scene.add?.graphics?.()?.setDepth(9);this.dark=this.scene.add?.graphics?.()?.setDepth(81);this.destroyed=false;}
 alive(){return !this.destroyed&&this.controller.valid(this.state)&&!this.state.dead&&this.state.boss.active&&!this.scene.ended;}
 add(task){const item={age:0,duration:Infinity,interruptible:false,...task};this.tasks.push(item);if(item.channel)this.state.channel=item;return item;}
 finish(task,cancel=false){const i=this.tasks.indexOf(task);if(i<0)return;this.tasks.splice(i,1);
  if(this.state.channel===task){this.state.channel=null;this.state.recoveryUntil=Math.max(this.state.recoveryUntil,this.scene.elapsed+BOSS_FAIRNESS.minimumRecovery);}
  (cancel?task.cancel:task.finish)?.();}
 interrupt(){for(const task of [...this.tasks])if(task.interruptible)this.finish(task,true);}
 update(dt){
  if(!this.alive())return;this.graphics?.clear();this.dark?.clear();
  for(const task of [...this.tasks]){if(!this.alive()||this.scene.pausedForChoice)break;
   const seconds=Math.min(dt,Math.max(0,task.duration-task.age));task.age+=seconds;task.update?.(seconds,task);
   if(task.age+1e-9>=task.duration)this.finish(task);}
  this.targets=this.targets.filter(t=>t.actor.active&&t.actor.getData('serial')===t.serial);
  for(const target of this.targets)this.drawTarget(target);
 }
 reserve(count){
  const director=this.scene.spawnDirector;if(!director)return;
  const removable=this.scene.enemies.getChildren().filter(e=>e.active&&!e.getData('isBoss')&&!e.getData('bossObject'))
   .sort((a,b)=>distance(b,this.scene.player)-distance(a,this.scene.player));
  while(!director.hasSpace(count)&&removable.length)this.scene.enemySystem?.despawn(removable.shift());
 }
 target({kind,hp,position,radius=22,onDestroy,update}){
  const actor=this.scene.enemies.get(position.x,position.y,'fx-5');if(!actor)return null;
  this.scene.enemyVisuals?.remove(actor);
  actor.enableBody(true,position.x,position.y,true,true).setActive(true).setVisible(true).setAlpha(1).setDepth(17).setDisplaySize(radius*2,radius*2);
  const art=kind==='heart-stone'?'fx-still-boss-zipacna-stone-armor-accent':'fx-still-boss-vucub-second-sun-main';
  const hasArt=this.scene.textures?.exists(art);actor.anims.stop();actor.setTexture(hasArt?art:'fx-5').clearTint?.();
  actor.setDisplaySize(radius*2,radius*2);if(!hasArt)actor.setTint(kind==='heart-stone'?0xc58a3d:0xffcf4a);
  const frameSize=hasArt?256:128;
  actor.setVelocity(0,0);actor.body.setCircle(frameSize/2,0,0);
  actor.setData({...enemyStatusDefaults(),...enemyAffixDefaults(),...enemyBehaviorDefaults(),...{spawningUntil:0,
   serial:++this.scene.enemySerial,type:null,artKey:null,isBoss:false,bossState:null,bossInvulnerableUntil:0,bossArmorPct:0,bossShield:0,bossShieldMax:0,bossObject:true,bossAttack:true,
   bossOwner:this.state.boss,bossOwnerSerial:this.state.serial,hp,maxHp:hp,speed:0,damage:0,xp:0,radius,tough:false,
   ranged:false,summoner:null,summonerSerial:null,priorityTarget:true,bossTargetKind:kind,heading:0}});
  const target={actor,serial:actor.getData('serial'),kind,radius,onDestroy,update};actor.setData('bossTarget',target);this.targets.push(target);return target;
 }
 updateTarget(actor,dt){const target=actor.getData('bossTarget');
  if(!this.alive()||!target||target.serial!==actor.getData('serial')){actor.disableBody(true,true);return;}
  actor.setVelocity(0,0);updateDamageOverTime(this.scene,actor,dt);if(actor.active)target.update?.(dt,target);}
 destroyTarget(actor,killed=true){const target=actor.getData('bossTarget');if(!target||!actor.active)return;
  actor.disableBody(true,true);if(target.serial===actor.getData('serial')&&killed&&this.alive())target.onDestroy?.(target);
  this.targets=this.targets.filter(t=>t!==target);actor.setData('bossTarget',null);}
 drawTarget({actor,kind,radius}){const g=this.graphics;if(!g)return;
  const ratio=Math.max(0,actor.getData('hp')/actor.getData('maxHp'));
  if(!actor.texture?.key?.startsWith('fx-still-boss-')){
   if(kind==='heart-stone')g.fillStyle(0xc58a3d,.95).fillTriangle(actor.x,actor.y-radius,actor.x-radius,actor.y+radius,actor.x+radius,actor.y+radius);
   else g.fillStyle(0xffcf4a,.7).fillCircle(actor.x,actor.y,radius);
  }
  g.lineStyle(2,0xffcf4a,1).strokeCircle(actor.x,actor.y,radius+3);g.fillStyle(0x3de0b0,1).fillRect(actor.x-radius,actor.y-radius-10,radius*2*ratio,4);
 }
 destroy(){if(this.destroyed)return;
  if(this.state.boss.getData('serial')===this.state.serial)this.scene.enemySystem?.removeOwned(this.state.boss);
  for(const task of [...this.tasks])this.finish(task,true);
  for(const target of [...this.targets])if(target.actor.getData('serial')===target.serial)this.destroyTarget(target.actor,false);
  for(const shot of this.scene.enemyProjectiles.getChildren())if(shot.active&&shot.getData('source')===this.state.boss&&shot.getData('sourceSerial')===this.state.serial)shot.disableBody(true,true);
  this.graphics?.destroy();this.dark?.destroy();this.destroyed=true;this.targets.length=0;}
}

export function channel(ctx,duration,update,finish,cancel){return ctx.runtime.add({duration,channel:true,interruptible:true,update,finish,cancel});}
export function bloodDash(ctx,p,{origin=point(ctx.boss),angle=ctx.angle,ghost=false}={}){
 const start=origin,destination=at(start,p.length,angle),duration=p.length/p.speed;
 let previous=start,hit=false;const segments=[];
 ctx.runtime.add({duration:duration+p.duration,update:seconds=>{
  const g=ctx.runtime.graphics,now=ctx.scene.elapsed;
  let touching=false;
  for(const s of segments)if(s.until>now){g?.lineStyle(30,0xd9413a,.38).lineBetween(s.from.x,s.from.y,s.to.x,s.to.y);
   if(segmentDistance(s.from,s.to,ctx.scene.player)<=24)touching=true;}
  if(touching)ctx.damage(p.dps*seconds,ctx.scene.player.x,ctx.scene.player.y,{dot:true});
 }});
 return ctx.runtime.add({duration,channel:!ghost,movement:true,interruptible:true,update:(dt,task)=>{
  const current=at(start,Math.min(p.length,p.speed*task.age),angle);
  if(!ghost)place(ctx.boss,current);
  else ctx.runtime.graphics?.fillStyle(0xd9413a,.4).fillCircle(current.x,current.y,32);
  if(!hit&&segmentDistance(previous,current,ctx.scene.player)<=44){hit=true;ctx.damage(p.damage,current.x,current.y,{melee:true,knockback:0});}
  const last=segments.at(-1);
  if(last&&distance(last.from,current)<40){last.to=current;last.until=ctx.scene.elapsed+p.duration;}
  else segments.push({from:previous,to:current,until:ctx.scene.elapsed+p.duration});
  previous=current;
 },finish:()=>{if(!ghost)place(ctx.boss,destination);}});
}
export function beam(ctx,{origin,angle,length,width,duration,rotation=0,tick,damage}){
 let next=tick;
 return channel(ctx,duration,(_dt,task)=>{
  const heading=angle+rotation*task.age/duration,to=at(origin,length,heading),g=ctx.runtime.graphics;
  g?.lineStyle(width,0xffcf4a,.38).lineBetween(origin.x,origin.y,to.x,to.y);
  g?.lineStyle(4,0xfff2c2,.9).lineBetween(origin.x,origin.y,to.x,to.y);
  while(next<=task.age+1e-9){if(telegraphContains({shape:'line',...origin,angle:heading,length,width},ctx.scene.player))ctx.damage(damage,origin.x,origin.y,{dot:true});next+=tick;}
 });
}
export function drawSafe(g,circles){for(const c of circles){g?.fillStyle(0x3de0b0,.22).fillCircle(c.x,c.y,c.radius);g?.lineStyle(3,0xe8fff6,1).strokeCircle(c.x,c.y,c.radius);}}
export {insideSafeCircle};
