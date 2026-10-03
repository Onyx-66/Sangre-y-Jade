import { ALLY_RULES } from '../data/allyCatalog.js';
import { dangerousEnemy } from '../data/supports.js';
import { ALLY_ACTIVE_HANDLERS } from '../skills/allies/index.js';
import { runtimeDebugEnabled } from './DebugAccess.js';

const HOSTILE = ['slow', 'poison', 'bleed', 'burn', 'confuse'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const enemiesNear=(scene,origin,radius)=>scene.enemies.getChildren().filter(enemy=>enemy.active&&distance(enemy,origin)<=radius);
const projectilesNear=(scene,origin,radius)=>scene.enemyProjectiles?.getChildren().filter(shot=>shot.active&&distance(shot,origin)<=radius)||[];

function rangeFor(skill) {
  const explicit=skill.auto.match(/(?:within|in range)\s+(\d+)/i)?.[1];
  const mechanic=skill.mechanics.match(/r(\d+)|range\s+(\d+)|within\s+(\d+)/i);
  const params=skill.params||{};
  const authored=params.range??params.radius??params.blastRadius??params.triggerRadius;
  return Number(explicit||mechanic?.[1]||mechanic?.[2]||mechanic?.[3]||authored||750);
}

function primaryTarget(scene,skill,origin=scene.player) {
  const range=rangeFor(skill);
  if(skill.auto.includes('ranged enemy'))return scene.enemies.getChildren().filter(enemy=>enemy.active&&enemy.getData('ranged')&&distance(enemy,origin)<=range).sort((a,b)=>distance(a,origin)-distance(b,origin))[0]||null;
  const weakened=skill.auto.toLowerCase().match(/enemy below (\d+)% hp/);
  if(weakened)return dangerousEnemy(scene.enemies.getChildren().filter(enemy=>enemy.getData('hp')/enemy.getData('maxHp')<Number(weakened[1])/100),origin,range);
  return dangerousEnemy(scene.enemies.getChildren(),origin,range);
}

function hasHeroDebuff(scene) {
  return HOSTILE.some(status=>(scene.player.getData?.(`${status}Until`)||scene.stats[`${status}Until`]||0)>scene.elapsed);
}

function projectileThreatensPlayer(shot,player) {
  const velocity=shot.body?.velocity;if(!velocity)return false;
  const dx=player.x-shot.x,dy=player.y-shot.y,length=Math.hypot(dx,dy)||1;
  const dot=(dx*velocity.x+dy*velocity.y)/length;
  const cross=Math.abs(dx*velocity.y-dy*velocity.x)/length;
  return dot>0&&cross<70;
}

function trigger(scene,skill,target,origin=scene.player) {
  const auto=skill.auto.toLowerCase(),radius=rangeFor(skill);
  const explicitGroupRadius=auto.match(/(?:within|in range)\s+(\d+)/i)?.[1];
  const mechanicsRadius=skill.mechanics.match(/r(\d+)/i)?.[1];
  const authoredRadius=skill.params?.radius??skill.params?.range??skill.params?.blastRadius??skill.params?.triggerRadius;
  const groupRadius=Number(explicitGroupRadius||mechanicsRadius||authoredRadius||radius||200);
  if(auto.includes('always'))return true;
  const hp=auto.match(/hero hp below (\d+)%/);
  if(hp&&scene.stats.hp/scene.stats.maxHp<Number(hp[1])/100)return true;
  if(auto.includes('surrounded')&&enemiesNear(scene,scene.player,200).length>=3)return true;
  if(auto.includes('debuff')||auto.includes('projectiles near'))return hasHeroDebuff(scene)||projectilesNear(scene,scene.player,radius).length>=Number(auto.match(/(\d+)\+ enemy projectiles/)?.[1]||3);
  if(auto.includes('projectiles heading'))return (scene.enemyProjectiles?.getChildren()||[]).some(shot=>shot.active&&projectileThreatensPlayer(shot,scene.player));
  const count=Number(auto.match(/(\d+)\+ enemies/)?.[1]||0);
  if(count&&enemiesNear(scene,auto.includes('hero')?scene.player:origin,groupRadius).length>=count)return true;
  const weakened=auto.match(/enemy below (\d+)% hp/);
  if(weakened)return Boolean(target&&target.getData('hp')/target.getData('maxHp')<Number(weakened[1])/100);
  if(auto.includes('ranged enemy'))return Boolean(target);
  if(auto.includes('enemies near'))return enemiesNear(scene,scene.player,groupRadius).length>0;
  if(auto.includes('enemies present'))return enemiesNear(scene,scene.player,750).length>0;
  if(auto.includes('enemy within')||auto.includes('top threat within'))return Boolean(target);
  return false;
}

export class AllyBrain {
  constructor(scene,support) {
    this.scene=scene;this.support=support;this.accumulator=0;this.lastCast=-Infinity;
    this.readySince=new Map();this.casts=Object.create(null);scene.allyCasts=this.casts;
    if(typeof window!=='undefined'&&runtimeDebugEnabled())window.__allyCasts=this.casts;
  }

  update(dt) {
    const scene=this.scene,ally=scene.companion;
    if(!ally||scene.pausedForChoice||scene.ended||scene.scene?.isPaused?.())return;
    this.accumulator+=dt;
    while(this.accumulator>=ALLY_RULES.evaluate_every_seconds){this.accumulator-=ALLY_RULES.evaluate_every_seconds;this.evaluate();}
  }

  evaluate() {
    const scene=this.scene,ally=scene.companion;
    if(!ally||scene.pausedForChoice||scene.ended||scene.scene?.isPaused?.()||scene.elapsed-this.lastCast<ALLY_RULES.global_gap_seconds)return false;
    const active=ally.skills.filter(skill=>skill.skillKind!=='passive').sort((a,b)=>(a.priority??3)-(b.priority??3));
    for(const skill of active){
      const handler=ALLY_ACTIVE_HANDLERS[skill.id];
      if(!handler)continue;
      if(skill.remaining>0){this.readySince.delete(skill.id);continue;}
      if(!this.readySince.has(skill.id))this.readySince.set(skill.id,scene.elapsed);
      const origin=handler.origin?.(scene,this.support,skill)||scene.player;
      const target=primaryTarget(scene,skill,origin);
      const normal=trigger(scene,skill,target,origin);
      const failsafe=skill.failsafe&&scene.elapsed-this.readySince.get(skill.id)>=ALLY_RULES.failsafe_seconds
        &&Boolean(dangerousEnemy(scene.enemies.getChildren(),scene.player,ALLY_RULES.failsafe_enemy_range));
      if((!normal&&!failsafe)||handler.canCast?.(scene,this.support,skill,target,{failsafe})===false)continue;
      if(this.cast(skill,target,handler))return true;
    }
    scene.hud?.setAlly?.(ally);
    return false;
  }

  cast(skill,target,handler=ALLY_ACTIVE_HANDLERS[skill.id]) {
    const scene=this.scene,ally=scene.companion;
    if(scene.pausedForChoice||scene.ended||scene.elapsed-this.lastCast<ALLY_RULES.global_gap_seconds||!handler)return false;
    if(handler.cast(scene,this.support,skill,target)!==true)return false;
    skill.remaining=Math.max(0,skill.cooldown-Math.max(0,skill.cooldownRefund||0));
    skill.cooldownRefund=0;
    this.readySince.delete(skill.id);this.lastCast=scene.elapsed;
    this.casts[skill.id]=(this.casts[skill.id]||0)+1;
    scene.skillAudio?.ui?.('ally-cast');
    if(typeof window!=='undefined'&&runtimeDebugEnabled())window.__allyCasts=this.casts;
    scene.animateCharacter?.(ally.sprite,`support-${ally.id}`,'attack',.32);
    this.popIcon(skill,ally);
    scene.hud?.setAlly?.(ally);
    return true;
  }

  popIcon(skill,ally) {
    const scene=this.scene;
    if(!scene.add?.image)return;
    const icon=scene.add.image(ally.sprite.x,ally.sprite.y-48,`skill-icon-${skill.id}`).setDepth(22).setDisplaySize(28,28);
    if(scene.tweens?.add)scene.tweens.add({targets:icon,y:icon.y-26,alpha:0,duration:600,onComplete:()=>icon.destroy()});
    else scene.time?.delayedCall?.(600,()=>icon.destroy());
  }
}

export { trigger as allyTriggerForTest, primaryTarget as allyTargetForTest };
