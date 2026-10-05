import { canEnemyAttack, enemyDamageMult, enemyShotAngle } from '../skills/StatusEffects.js';
import { telegraphContains } from '../systems/Telegraph.js';

export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const attack=(ctx,name)=>ctx.data.attacks[name];
export const ready=(ctx,name)=>!(ctx.state.cooldowns[name]>ctx.scene.elapsed);
export const inRange=(ctx,p)=>p.min===undefined?ctx.distance<=p.range:ctx.distance>=p.min&&ctx.distance<=p.max;
export const point=object=>({x:object.x,y:object.y});
export function place(object,x,y) {if(object.body?.reset)object.body.reset(x,y);else object.setPosition(x,y);}
export function steer(ctx,angle=ctx.angle,speed=ctx.speed) {
  ctx.enemy.setData('heading',angle);ctx.enemy.setVelocity(Math.cos(angle)*speed,Math.sin(angle)*speed);
}
export function kite(ctx,min,max,erratic=false) {
  const radial=ctx.distance<min?-1:ctx.distance>max?1:0;
  const tangent=radial?0:(erratic?Math.sin(ctx.scene.elapsed*7+ctx.enemy.getData('seed')):1)*.45;
  const angle=ctx.angle+Math.atan2(tangent,radial);
  if(!radial&&!tangent)ctx.enemy.setVelocity(0,0);else steer(ctx,angle,ctx.speed*(radial?1:.45));
}
export function eligible(ctx) {
  return ctx.enemy.active&&ctx.enemy.getData('serial')===ctx.state.serial&&!ctx.scene.ended&&!ctx.scene.pausedForChoice
    &&canEnemyAttack(ctx.scene,ctx.enemy,true);
}
export function cue(ctx,phase,position=ctx.enemy,extra={}) {
  const id=`enemy-${ctx.data.id}-${phase}`;
  const isAlive=phase==='windup'?()=>ctx.enemy.active&&ctx.enemy.getData('serial')===ctx.state.serial&&ctx.state.busy===extra.ability&&!ctx.scene.ended:undefined;
  ctx.scene.fx?.play(id,phase==='windup'?'cast':'impact',{...point(position),duration:.3,sound:false,isAlive,...extra});
  if(ctx.scene.audio?.play)ctx.scene.audio.play(id,point(ctx.enemy));else ctx.scene.skillAudio?.play(id,'cast');
}
export function cast(ctx,name,shape,onResolve) {
  if(ctx.state.busy||ctx.state.motion||ctx.state.after||!ready(ctx,name)||!eligible(ctx))return false;
  const spell=['Soul Volley','Ward','Venom Spit','Aimed Shot','Summon'].includes(name);
  if(spell&&ctx.enemy.getData('silenceUntil')>ctx.scene.elapsed)return false;
  const p=attack(ctx,name),serial=ctx.state.serial;
  ctx.enemy.setData('visualHeading',ctx.angle);
  ctx.state.busy=name;ctx.state.cooldowns[name]=ctx.scene.elapsed+p.cooldown;
  cue(ctx,'windup',shape,{ability:name,duration:p.windup});ctx.scene.animateCharacter?.(ctx.enemy,ctx.enemy.getData('artKey'),'windup',p.windup);
  const cancel=()=>{if(ctx.enemy.getData('serial')===serial){ctx.state.busy=null;restore(ctx);}};
  const warning=ctx.scene.telegraphs?.play({x:ctx.enemy.x,y:ctx.enemy.y,windup:p.windup,owner:ctx.enemy,tag:name,sound:false,...shape,
    onCancel:cancel,onResolve:w=>{
      if(ctx.enemy.getData('serial')!==serial)return;
      ctx.state.busy=null;
      if(!eligible(ctx)||(spell&&ctx.enemy.getData('silenceUntil')>ctx.scene.elapsed)){restore(ctx);return;}
      cue(ctx,'attack',w,{ability:name});ctx.scene.animateCharacter?.(ctx.enemy,ctx.enemy.getData('artKey'),'attack',.25);
      ctx.scene.enemySystem?.countCast(ctx.data.id,name);onResolve(w,p);
    }});
  if(!warning){cancel();return false;}return true;
}
export function heroHit(ctx,damage,options={}) {
  if(!eligible(ctx))return false;
  return ctx.scene.damagePlayer(damage*enemyDamageMult(ctx.scene,ctx.enemy),ctx.enemy.x,ctx.enemy.y,ctx.enemy,Boolean(options.melee),options);
}
export function areaHit(ctx,w,damage,options={}) {
  return telegraphContains({...w,shape:w.shape==='ring'?'circle':w.shape},ctx.scene.player)&&heroHit(ctx,damage,options);
}
export function shots(ctx,{count=1,spread=0,speed,damage,radial=false,...options}) {
  const angle=enemyShotAngle(ctx.scene,ctx.enemy,ctx.angle,ctx.target===ctx.scene.player,ctx.scene.enemySystem?.random);
  for(let i=0;i<count;i++){
    const heading=radial?i*Math.PI*2/count:angle+(i-(count-1)/2)*spread;
    const shot=ctx.scene.spawnEnemyProjectile(ctx.enemy.x,ctx.enemy.y,heading,speed,damage*enemyDamageMult(ctx.scene,ctx.enemy),ctx.enemy);
    shot?.setData({...options,sourceSerial:ctx.state.serial,enemyId:ctx.data.id});
  }
}
export function restore(ctx) {
  ctx.enemy.setData({burrowing:false,invulnerableEnemy:false});ctx.enemy.setVisible?.(!ctx.state.buried);
}
export function after(ctx,seconds,resolve) {ctx.state.after={remaining:seconds,resolve};ctx.enemy.setVelocity(0,0);}
export function teleport(ctx,destination) {place(ctx.enemy,destination.x,destination.y);ctx.enemy.setVelocity(0,0);}
export function motion(ctx,destination,{duration,speed,hit,end,leap=false}={}) {
  const start=point(ctx.enemy),length=distance(start,destination);
  ctx.state.motion={start,destination,age:0,duration:duration??length/speed,hit,end,leap,hitOnce:false};
  ctx.scene.animateCharacter?.(ctx.enemy,ctx.enemy.getData('artKey'),'attack',ctx.state.motion.duration);
  ctx.enemy.setData('heading',Math.atan2(destination.y-start.y,destination.x-start.x));ctx.enemy.setVelocity(0,0);
}
function segmentDistance(a,b,p) {
  const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len)):0;
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
export function stepAction(ctx) {
  const state=ctx.state;
  if(state.after){const pending=state.after;ctx.enemy.setVelocity(0,0);pending.remaining-=ctx.dt;
    if(pending.remaining<=1e-9){state.after=null;if(eligible(ctx))pending.resolve();}return true;}
  if(state.motion){const m=state.motion,previous=point(ctx.enemy);ctx.enemy.setVelocity(0,0);
    if(ctx.enemy.getData('rootUntil')>ctx.scene.elapsed)return true;
    m.age+=ctx.dt;const p=m.age+1e-9>=m.duration?1:Math.min(1,m.age/Math.max(.001,m.duration));
    place(ctx.enemy,m.start.x+(m.destination.x-m.start.x)*p,m.start.y+(m.destination.y-m.start.y)*p);
    if(m.hit&&!m.hitOnce&&segmentDistance(previous,ctx.enemy,ctx.scene.player)<=(ctx.data.radius+18)){
      m.hitOnce=true;m.hit();
    }
    if(p>=1){state.motion=null;if(eligible(ctx))m.end?.();}return true;
  }
  if(state.recoveryUntil>ctx.scene.elapsed||state.busy){ctx.enemy.setVelocity(0,0);
    if(state.recoveryUntil>ctx.scene.elapsed)ctx.scene.animateCharacter?.(ctx.enemy,ctx.enemy.getData('artKey'),'recover',state.recoveryUntil-ctx.scene.elapsed);
    return true;}
  return false;
}
export function dash(ctx,p,angle=ctx.angle,extra={}) {
  motion(ctx,{x:ctx.enemy.x+Math.cos(angle)*p.length,y:ctx.enemy.y+Math.sin(angle)*p.length},{speed:p.speed,
    hit:()=>heroHit(ctx,p.damage,{melee:true,...extra}),end:()=>{ctx.state.recoveryUntil=ctx.scene.elapsed+(p.recovery||0);
      if(p.vulnerability)ctx.enemy.setData({recoveryUntil:ctx.state.recoveryUntil,recoveryVulnerability:p.vulnerability});}});
}
export function leap(ctx,p,destination) {
  motion(ctx,destination,{duration:p.leap,leap:true,end:()=>{
    cue(ctx,'attack',destination,{radius:p.radius});areaHit(ctx,{...destination,shape:'circle',radius:p.radius},p.damage,{melee:true});
  }});
}
export function shield(ctx,target,p) {
  target.setData({wardShield:p.shield,wardUntil:ctx.scene.elapsed+p.duration});
  ctx.scene.enemyBars?.damage(target,target.getData('hp'));
  const serial=target.getData('serial');ctx.scene.fx?.play('shield-ring-blue','aura',{x:target.x,y:target.y,followTarget:target,
    radius:(target.getData('radius')||16)+5,duration:p.duration,isAlive:()=>target.active&&target.getData('serial')===serial&&target.getData('wardShield')>0&&target.getData('wardUntil')>ctx.scene.elapsed,sound:false});
}
export function reflect(ctx,p) {ctx.enemy.setData({prismUntil:ctx.scene.elapsed+p.duration,prismReflect:p.reflectPct});
  const serial=ctx.state.serial;ctx.scene.fx?.play('shield-ring-blue','aura',{x:ctx.enemy.x,y:ctx.enemy.y,followTarget:ctx.enemy,
    radius:ctx.data.radius+7,duration:p.duration,isAlive:()=>ctx.enemy.active&&ctx.enemy.getData('serial')===serial&&ctx.enemy.getData('prismUntil')>ctx.scene.elapsed,sound:false});}
export function summons(ctx,p) {
  const owned=ctx.scene.enemies.getChildren().filter(e=>e.active&&e.getData('summoner')===ctx.enemy&&e.getData('summonerSerial')===ctx.state.serial);
  const count=Math.min(p.count,p.cap-owned.length);
  for(let i=0;i<count;i++)ctx.scene.spawnEnemy('shade',null,{position:{x:ctx.enemy.x+(i?28:-28),y:ctx.enemy.y+32},emerge:true,summoner:ctx.enemy,affix:null});
}
export function burrow(ctx,p,onEmerge) {
  ctx.enemy.setData({burrowing:true,invulnerableEnemy:true});ctx.enemy.setVisible?.(false);
  motion(ctx,point(ctx.target),{duration:p.underground,speed:p.speed,end:onEmerge});
  const m=ctx.state.motion,length=distance(m.start,m.destination),limit=p.speed*p.underground;
  if(length>limit){const mult=limit/length;m.destination={x:m.start.x+(m.destination.x-m.start.x)*mult,y:m.start.y+(m.destination.y-m.start.y)*mult};}
}
export function puddle(ctx,p) {ctx.scene.enemySystem?.addPuddle(ctx.enemy,p);}
export function fuse(ctx,p) {
  return cast(ctx,'Detonate',{shape:'circle',radius:p.radius},w=>{
    areaHit(ctx,w,p.damage);ctx.scene.enemySystem?.despawn(ctx.enemy);
  });
}
