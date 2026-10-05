import definitions from '../data/bosses-v06.json' with {type:'json'};
import {BOSS_BEHAVIORS} from '../bosses/index.js';
import {BOSS_FAIRNESS,bossDamage,fairAbility,phaseForHp,arenaSafeCircles,insideSafeCircle,segmentDistance} from '../bosses/rules.js';
import {canEnemyAttack,enemyDamageMult,enemyShotAngle} from '../skills/StatusEffects.js';
import {spawnOutsideView} from './CombatRules.js';
import {worldView} from './Viewport.js';

export const bossStateDefaults=()=>({bossState:null,bossInvulnerableUntil:0,bossArmorPct:0,bossShield:0,bossShieldMax:0});
export class BossController {
 constructor(scene,{bosses=definitions,behaviors=BOSS_BEHAVIORS,graphics=scene.add?.graphics?.(),random=Math.random}={}){
  this.scene=scene;this.definitions=bosses;this.behaviors=behaviors;this.graphics=graphics?.setDepth?.(3)||graphics;this.random=random;
  this.state=null;this.warning=null;this.casts={};this.destroyed=false;
 }
 valid(state=this.state){return !!state&&!this.destroyed&&(state.dead?state===this.state:
  state.boss?.getData('serial')===state.serial&&state.boss.getData('bossState')===state);}
 running(){const s=this.scene;return !this.destroyed&&!s.ended&&!s.loadingRun&&!s.pausedForChoice&&!s.bossCinematic;}
 init(boss,data,{initialDelay=1.5}={}){
  const definition=this.definitions.find(row=>row.id===(data.definitionId||data.id))||data;
  const behavior=this.behaviors[definition.id];if(!behavior)throw Error(`Unregistered boss: ${definition.id}`);
  if(this.state){this.cancel(this.state);this.state.death?.sprite?.destroy();}
  const state={boss,definition,behavior,serial:boss.getData('serial'),phase:0,arena:{x:boss.x,y:boss.y,radius:BOSS_FAIRNESS.arenaRadius},
   cooldowns:{},used:new Set(),busy:null,motion:null,recoveryUntil:0,startedAt:this.scene.elapsed,initialReady:this.scene.elapsed+initialDelay,
   enraged:false,dead:false,death:null};
  this.state=state;boss.setData({...bossStateDefaults(),bossState:state});this.warning=null;this.scene.bossPresentation?.clearWarning();
  this.refreshBar();this.drawArena();return state;
 }
 context(state=this.state,target){
  const {boss,definition,behavior}=state;
  const taunt=boss.getData('tauntTarget')||this.scene.companion?.sprite;
  target??=(boss.getData('tauntUntil')>this.scene.elapsed&&taunt?.active)?taunt:this.scene.player;
  const angle=enemyShotAngle(this.scene,boss,Math.atan2(target.y-boss.y,target.x-boss.x),target===this.scene.player);
  const phase=definition.phases[state.phase],enrage=state.enraged?definition.enrage:null;
  const ctx={scene:this.scene,boss,state,definition,behavior,phase,target,angle,
   speed:boss.getData('speed')*(phase.speedMult||1)*(enrage?.speedMult||1),safeCircles:[],
   damage:(amount,x=boss.x,y=boss.y,options={})=>{
    if(!this.running()||!this.valid(state)||state.dead||!boss.active)return false;
    if(ctx.ability?.id==='final-rite'&&insideSafeCircle(this.scene.player,ctx.safeCircles))return false;
    return this.scene.damagePlayer(bossDamage(amount*enemyDamageMult(this.scene,boss)*(enrage?.damageMult||1)),x,y,boss,!!options.melee,options);
   },
   projectile:(heading,speed,amount)=>{
    if(!this.running()||!this.valid(state)||state.dead)return null;
    return this.scene.spawnEnemyProjectile(boss.x,boss.y,heading,speed,bossDamage(amount*enemyDamageMult(this.scene,boss)*(enrage?.damageMult||1)),boss);
   },
   dash:options=>{state.motion={...options,remaining:options.length/options.speed,angle:ctx.angle,previous:{x:boss.x,y:boss.y},hit:false,recovery:ctx.ability.recovery};
    boss.setVelocity(Math.cos(ctx.angle)*options.speed,Math.sin(ctx.angle)*options.speed);},
  };return ctx;
 }
 phaseChanged(){
  const state=this.state;if(!this.valid(state)||state.dead||!state.boss.active)return;
  const {boss,definition}=state,index=phaseForHp(definition.phases,boss.getData('hp')/boss.getData('maxHp'));
  if(index<=state.phase)return;
  this.cancel(state);
  for(let next=state.phase+1;next<=index;next++){
   state.phase=next;const phase=definition.phases[next];this.protect(phase.invulnerability||0);
   state.behavior.onPhase?.(this.context());this.scene.options?.bossHooks?.phase?.({definition,phase,index:next});
  }
  this.refreshBar();
 }
 protect(seconds){if(this.valid())this.state.boss.setData('bossInvulnerableUntil',Math.max(this.state.boss.getData('bossInvulnerableUntil')||0,this.scene.elapsed+Math.max(0,seconds)));}
 damageMultiplier(boss){
  const state=boss.getData('bossState');
  if(!state)return 1;
  if(!this.valid(state)||state.dead||this.scene.bossCinematic||(boss.getData('bossInvulnerableUntil')||0)>this.scene.elapsed)return 0;
  return 1-Math.min(1,Math.max(0,boss.getData('bossArmorPct')||0));
 }
 updateWorld(dt){
  if(!this.running())return;
  const state=this.state;if(!this.valid(state)){if(state){this.state=null;this.graphics?.clear();}return;}
  if(state.dead){state.death.remaining-=dt;state.death.sprite?.setAlpha?.(Math.max(0,state.death.remaining/.9));
   if(state.death.remaining<=1e-9){const done=state.death.done;state.death.sprite?.destroy();state.death=null;this.state=null;this.graphics?.clear();done?.();}return;}
  if(!state.boss.active){this.cancel(state);this.state=null;this.graphics?.clear();return;}
  this.phaseChanged();
  if(!canEnemyAttack(this.scene,state.boss))this.cancel(state);
  const enrage=state.definition.enrage;
  if(!state.enraged&&Number.isFinite(enrage?.after)&&this.scene.elapsed-state.startedAt>=enrage.after){state.enraged=true;state.behavior.onEnrage?.(this.context());}
  this.refreshBar();this.drawArena();
 }
 update(boss,dt,target){
  const state=this.state;if(!this.running()||!this.valid(state)||state.boss!==boss||state.dead)return;
  this.phaseChanged();const ctx=this.context(state,target);
  if(!canEnemyAttack(this.scene,boss)){this.cancel(state);boss.setVelocity(0,0);return;}
  if(state.motion){const motion=state.motion;
   if(!(boss.getData('rootUntil')>this.scene.elapsed))motion.remaining-=dt;
   if(!motion.hit&&segmentDistance(motion.previous,boss,this.scene.player)<=(boss.body?.radius||24)*(boss.scaleX||1)+18){motion.hit=true;ctx.damage(motion.damage,boss.x,boss.y,{melee:true});}
   motion.previous={x:boss.x,y:boss.y};
   if(motion.remaining<=1e-9){state.motion=null;boss.setVelocity(0,0);state.recoveryUntil=this.scene.elapsed+motion.recovery;}
   return;
  }
  if(state.busy||state.recoveryUntil>this.scene.elapsed||(boss.getData('bossInvulnerableUntil')||0)>this.scene.elapsed){boss.setVelocity(0,0);return;}
  state.behavior.move?.(ctx,dt);
  if(this.scene.elapsed<state.initialReady||boss.getData('silenceUntil')>this.scene.elapsed)return;
  for(const raw of state.behavior.abilities(ctx)){
   const ability=fairAbility(raw),key=`${state.phase}:${ability.id}`;
   if((state.cooldowns[ability.id]||0)>this.scene.elapsed||(ability.cooldown===0&&state.used.has(key))||ability.condition?.(ctx)===false)continue;
   if(this.cast(state,ability,ctx)){state.used.add(key);break;}
  }
 }
 cast(state,ability,ctx=this.context(state)){
  if(!this.running()||!this.valid(state)||state.busy||state.dead)return false;
  ability=fairAbility(ability);
  ctx.ability=ability;
  if(ability.id==='final-rite'){
   const rule=state.definition.phases.flatMap(p=>p.abilities||[]).find(a=>a.id==='final-rite');
   ctx.safeCircles=arenaSafeCircles(state.arena,rule?.safeRadius||130);
  }
  const shape=ability.shape?.(ctx)||{shape:'circle',radius:80};
  const token={ability,serial:state.serial};state.busy=token;state.boss.setVelocity(0,0);
  this.scene.animateCharacter?.(state.boss,state.boss.getData('artKey'),'windup',ability.windup);
  const warning=this.scene.telegraphs?.play({x:state.boss.x,y:state.boss.y,angle:ctx.angle,...shape,windup:ability.windup,
   safeCircles:ctx.safeCircles,owner:state.boss,tag:`boss:${ability.id}`,sound:'boss',
   onCancel:()=>{if(this.valid(state)&&state.busy===token){state.busy=null;state.recoveryUntil=this.scene.elapsed+ability.recovery;}},
   onResolve:w=>{
    if(!this.valid(state)||state.busy!==token)return;state.busy=null;
    if(!this.running()||state.dead||!state.boss.active||!canEnemyAttack(this.scene,state.boss)||state.boss.getData('silenceUntil')>this.scene.elapsed){state.recoveryUntil=this.scene.elapsed+ability.recovery;return;}
    this.scene.animateCharacter?.(state.boss,state.boss.getData('artKey'),'attack',.4);
    const key=`${state.definition.id}:${ability.id}`;this.casts[key]=(this.casts[key]||0)+1;
    ability.execute(ctx,w);
    if(this.valid(state)&&!state.dead&&!state.motion)state.recoveryUntil=this.scene.elapsed+ability.recovery;
   }});
  if(!warning){state.busy=null;return false;}
  // A cancelled warning still consumes its cooldown; retries cannot spam wind-ups.
  state.cooldowns[ability.id]=this.scene.elapsed+ability.cooldown;return true;
 }
 touch(boss){
  // A dash owns its swept hit; stationary overlap must not bypass its warning.
  if(!this.running())return true;
  const state=boss.getData('bossState');if(state?.motion||state?.busy||state?.dead||state?.recoveryUntil>this.scene.elapsed)return true;
  return false;
 }
 cancel(state=this.state){
  if(!state)return;
  if(state.boss.getData('serial')===state.serial){this.scene.telegraphs?.cancelOwner(state.boss);state.boss.setVelocity?.(0,0);}
  state.busy=null;state.motion=null;
  state.recoveryUntil=this.scene.elapsed+BOSS_FAIRNESS.minimumRecovery;
 }
 die(boss,done){
  const state=this.state;if(!this.valid(state)||state.boss!==boss||state.dead)return false;
  this.cancel(state);state.dead=true;
  const sprite=this.scene.add?.sprite?.(boss.x,boss.y,boss.texture?.key||boss.getData('artKey'));
  sprite?.setDepth?.(24).setScale(boss.scaleX||1,boss.scaleY||1).setTint?.(state.definition.color||0xffcf4a);
  this.scene.playEffect?.(2,boss.x,boss.y,190);
  state.death={remaining:.9,sprite,done};this.scene.options?.bossHooks?.death?.({definition:state.definition,boss});return true;
 }
 updateArrival(){
  if(!this.running()||this.scene.activeBoss||this.state)return;
  const s=this.scene,index=s.nextBossIndex<3?s.nextBossIndex:s.finalSpawned?null:3;
  if(index===null)return;const definition=this.definitions[index];if(!definition)return;
  const due=definition.arrival[s.modeData.id]??s.modeData.duration*(index+1)/4;
  if(!this.warning&&s.elapsed>=due-BOSS_FAIRNESS.warningLead){
   const point=spawnOutsideView(worldView(s),this.random,120+96*(index===3?1.65:1.35));
   this.warning={definition,point,spawnAt:Math.max(due,s.elapsed+BOSS_FAIRNESS.warningLead)};
   if(s.options?.bossHooks?.horn)s.options.bossHooks.horn(definition);else s.audio?.sfx?.('boss');
  }
  if(!this.warning)return;
  s.bossPresentation?.showWarning(this.warning,worldView(s));
  if(s.elapsed+1e-9>=this.warning.spawnAt){
   const warning=this.warning;
   const boss=s.spawnBoss(definition,{position:warning.point});
   if(boss){if(index===3)s.finalSpawned=true;else s.nextBossIndex=index+1;this.warning=null;s.bossPresentation?.clearWarning();}
  }
 }
 refreshBar(){
  const state=this.state;if(!this.valid(state)||state.dead)return;
  const boss=state.boss,maxHp=boss.getData('maxHp'),shield=(boss.getData('bossShield')||0)+(boss.getData('wardShield')||0);
  this.scene.hud?.setBoss(boss.getData('displayName')||state.definition.name,boss.getData('hp')/maxHp,{
   epithet:boss.getData('displayEpithet')??state.definition.epithet,phase:state.phase+1,
   thresholds:state.definition.phases.slice(1).map(p=>p.threshold),shieldRatio:shield/maxHp,armorPct:boss.getData('bossArmorPct')||0,
   hp:Math.ceil(Math.max(0,boss.getData('hp'))),maxHp,invulnerable:this.damageMultiplier(boss)===0,
  });
 }
 drawArena(){const state=this.state;this.graphics?.clear();if(this.valid(state)&&!state.dead)this.graphics?.lineStyle?.(2,0xffcf4a,.12).strokeCircle(state.arena.x,state.arena.y,state.arena.radius);}
 destroy(){if(this.destroyed)return;this.cancel();this.state?.death?.sprite?.destroy();this.state=null;this.warning=null;this.graphics?.destroy();this.scene.bossPresentation?.clearWarning();this.destroyed=true;}
}
