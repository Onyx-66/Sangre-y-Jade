import { SUPPORTS, allyRank, allyNumberMultiplier, allyCooldownMultiplier, dangerousEnemy } from '../data/supports.js';
import { ALLY_CATALOG, ALLY_RULES } from '../data/allyCatalog.js';
import { ALLY_PASSIVE_HANDLERS } from '../skills/allies/index.js';
import { t } from '../i18n/index.js';
import { AllyBrain } from './AllyBrain.js';
import { AllyVisuals } from '../art/allyVisuals.js';
import '../fx/recipes/allies.js';

const pointSegmentDistance=(p,a,b)=>{
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const along=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
 return Math.hypot(p.x-a.x-along*dx,p.y-a.y-along*dy);
};
const orientation=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a,b,p){return p.x>=Math.min(a.x,b.x)-1e-9&&p.x<=Math.max(a.x,b.x)+1e-9&&p.y>=Math.min(a.y,b.y)-1e-9&&p.y<=Math.max(a.y,b.y)+1e-9;}
function segmentsWithin(a,b,c,d,radius){
 a=a||b;
 const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);
 const intersects=(o1*o2<0&&o3*o4<0)||(Math.abs(o1)<1e-9&&onSegment(a,b,c))||(Math.abs(o2)<1e-9&&onSegment(a,b,d))||(Math.abs(o3)<1e-9&&onSegment(c,d,a))||(Math.abs(o4)<1e-9&&onSegment(c,d,b));
 if(intersects)return true;
 return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))<=radius;
}

export class SupportSystem {
 constructor(scene){this.scene=scene;this.traps=[];this.effects={};this.origins={};this.wall=null;this.lastStealthAt=-Infinity;this.stealthDamageUntil=0;this.visuals=new AllyVisuals(scene);this.brain=new AllyBrain(scene,this);}
 summon(id,heroLevel=ALLY_RULES.join_level){
  const s=this.scene,data=SUPPORTS[id];if(s.companion||!data)return null;
  const sprite=s.add.sprite(s.player.x-75,s.player.y+40,`support-${id}`).setScale(.62).setDepth(19);
  sprite.setData('animLock',0);
  sprite.setData('byAlly',true);
  s.companion={id,sprite,skills:[],level:heroLevel,rank:allyRank(heroLevel),shot:.5,hp:100};
  s.playEffect(4,sprite.x,sprite.y,125);s.skillAudio?.ui?.('companion-join');
  this.equip(data.signature,{silent:true});this.refresh();return s.companion;
 }
 refresh(){const a=this.scene.companion;if(a)this.scene.hud.setAlly(a);}
 syncLevel(level){
  const a=this.scene.companion;if(!a)return;
  const previous=a.rank;a.level=level;a.rank=allyRank(level);
  for(const skill of a.skills){skill.level=a.rank;this.scene.passives?.setLevel(skill.id,a.rank);const fraction=skill.cooldown?skill.remaining/skill.cooldown:0;skill.cooldown=skill.baseCooldown*allyCooldownMultiplier(a.rank);skill.remaining=fraction*skill.cooldown;}
  if(a.rank>previous){this.scene.hud.toast(t('Companion rank {n}',{n:a.rank}));this.scene.skillAudio?.ui?.('ally-rank');}
  this.refresh();
 }
 equip(skill,{silent=false}={}){
  const a=this.scene.companion;if(!a||!skill||a.skills.length>=ALLY_RULES.slots||a.skills.some(entry=>entry.id===skill.id))return false;
  const catalogSkill=ALLY_CATALOG[a.id].find(entry=>entry.id===skill.id);
  if(!catalogSkill||catalogSkill.owner!==`ally:${a.id}`)return false;
  const rank=a.rank||1,baseCooldown=catalogSkill.cooldown||0,skillKind=catalogSkill.kind;
  const entry={...catalogSkill,kind:'ally',skillKind,level:rank,baseCooldown,cooldown:baseCooldown*allyCooldownMultiplier(rank),remaining:0};
  a.skills.push(entry);
  if(skillKind==='passive'){
   const logic=ALLY_PASSIVE_HANDLERS[entry.id];
   if(logic)this.scene.passives?.equip({...logic,...entry,on:logic.on||entry.on,stat:logic.stat||entry.stat,
    preventFatal:logic.preventFatal,redirectDamage:logic.redirectDamage},rank);
  }
  if(!silent)this.scene.skillAudio?.ui?.('pick-ally');
  this.refresh();return true;
 }
 has(id){return Boolean(this.scene.companion?.skills.some(skill=>skill.id===id));}
 numberMultiplier(){return allyNumberMultiplier(this.scene.companion?.rank||1);}
 cooldownMultiplier(){return allyCooldownMultiplier(this.scene.companion?.rank||1);}
 effectActive(id){return (this.effects[id]||0)>this.scene.elapsed;}
 insideEffect(id,radius){
  const origin=this.origins[id];
  return this.effectActive(id)&&(!origin||Math.hypot(this.scene.player.x-origin.x,this.scene.player.y-origin.y)<=radius);
 }
 modifiers(){
  const s=this.scene,a=s.companion;
  const beaconSkill=ALLY_CATALOG.saintess.find(skill=>skill.id==='radiant-beacon');
  const sanctuarySkill=ALLY_CATALOG.saintess.find(skill=>skill.id==='sanctuary-dome');
  const beacon=this.insideEffect('radiant-beacon',beaconSkill.params.radius);
  const tankClose=a?.id==='tank'&&this.has('bodyguard')&&Math.hypot(s.player.x-a.sprite.x,s.player.y-a.sprite.y)<=ALLY_CATALOG.tank.find(skill=>skill.id==='bodyguard').params.radius;
  const bodyguard=tankClose?this.value('bodyguard')/100:0;
  const warCry=this.effectActive('war-cry')?1-ALLY_CATALOG.tank.find(skill=>skill.id==='war-cry').params.damageReductionPct/100:1;
  const sanctuary=this.insideEffect('sanctuary-dome',sanctuarySkill.params.radius)?1-sanctuarySkill.params.damageReductionPct/100:1;
  const reduction=Math.min(.8,bodyguard+(sanctuary<1?1-sanctuary:0));
  return {damage:1,haste:beacon?beaconSkill.params.attackSpeedPct/100:0,
   speed:beacon?1+beaconSkill.params.moveSpeedPct/100:1,regen:0,armor:0,reduction,
   lifestealPct:this.effectActive('lifebond')?ALLY_CATALOG.saintess.find(skill=>skill.id==='lifebond').params.lifestealPct/100*this.numberMultiplier():0,
   tankDamageTakenMult:this.effectActive('war-cry')?warCry:1};
 }
 preventFatal(damage){
  const redirected=this.scene.passives?.redirectDamage(damage,{support:this})??damage;
  return this.scene.passives?.preventFatal(redirected,{support:this})??redirected;
 }
 value(id){const skill=this.scene.companion?.skills.find(entry=>entry.id===id);if(!skill)return 0;return skill.values?.[Math.min(skill.values.length-1,(skill.level||1)-1)]||0;}
 consumeStealthStrike(){if(this.stealthDamageUntil<=this.scene.elapsed)return 1;this.stealthDamageUntil=0;return 1+ALLY_CATALOG.assassin.find(skill=>skill.id==='vanish').params.nextAttackBonusPct/100;}
 cacaoValue(base){
  const pct=this.scene.companion?.id==='assassin'&&this.has('bounty-contract')?this.value('bounty-contract'):0;
  const amount=base*(1+pct/100),whole=Math.floor(amount);
  const fraction=amount-whole;
  return whole+(fraction>0&&Math.random()<fraction?1:0);
 }
 chooseSkill(done){
  const s=this.scene,a=s.companion;if(!a||a.skills.length>=ALLY_RULES.slots){done?.();return;}
  const cards=this.choices();if(!cards.length){done?.();return;}
  s.hud.showChoice('Companion Pick',cards,card=>{if(s.ended)return;this.equip(card);done?.();},'Choose one companion skill.');
 }
 update(dt){
  const s=this.scene,a=s.companion;if(!a)return;
  if(s.ended){this.visuals.destroy();return;}
  if(s.pausedForChoice||s.scene?.isPaused?.())return;
  this.visuals.update(dt);
  const target=dangerousEnemy(s.enemies.getChildren(),s.player),p=this.numberMultiplier();
  a.target=target;
  let x=s.player.x-s.lastMove.x*90,y=s.player.y-s.lastMove.y*90;
  if(a.id==='tank'&&target){const d=Math.hypot(target.x-s.player.x,target.y-s.player.y)||1;x=s.player.x+(target.x-s.player.x)/d*85;y=s.player.y+(target.y-s.player.y)/d*85;}
  if(a.id==='assassin'&&target){x=target.x-35;y=target.y+30;}
  const dx=x-a.sprite.x,dy=y-a.sprite.y,d=Math.hypot(dx,dy);
  if(d>900)a.sprite.setPosition(x,y);
  else if(d>10){const step=Math.min(d,s.stats.speed*(a.id==='assassin'?1.6:1.2)*dt);a.sprite.x+=dx/d*step;a.sprite.y+=dy/d*step;}
  if(!this.visuals.busy){a.sprite.setFlipX(dx<0);s.animateCharacter(a.sprite,`support-${a.id}`,d>10?'walk':'idle');}
  for(const k of a.skills)if(k.skillKind!=='passive')k.remaining=Math.max(0,k.remaining-dt);
  a.shot-=dt;
  // The healer never attacks. Tank and Assassin have modest class basic attacks.
  if(a.id!=='saintess'&&target&&a.shot<=0&&!this.visuals.busy&&Math.hypot(target.x-a.sprite.x,target.y-a.sprite.y)<160){
   this.visuals.begin('attack',()=>{if(!target.active)return false;s.damageEnemy(target,(a.id==='assassin'?12:7)*p,0,0,a.sprite,{byAlly:true});s.playEffect(0,target.x,target.y,55);return true;},target);
   if(!this.visuals.enabled)s.animateCharacter(a.sprite,`support-${a.id}`,'attack',.28);
   const speed=s.passives?.modifiers({ally:a}).allyAttackSpeedMult||1;
   a.shot=1.2/speed;
  }
  if(s.pausedForChoice||s.ended)return;
  this.brain.update(dt);
  if(!s.pausedForChoice&&!s.ended)this.updateTraps(dt);
 }
 clearShots(origin,radius){const s=this.scene;for(const shot of [...s.enemyProjectiles.getChildren()])if(shot.active&&Math.hypot(shot.x-origin.x,shot.y-origin.y)<radius){s.playEffect(4,shot.x,shot.y,30);shot.destroy();}}
 raiseWall(skill,target){
  const s=this.scene,threat=target?.active?target:dangerousEnemy(s.enemies.getChildren(),s.player);
  const end=threat?{x:threat.x,y:threat.y}:{x:s.player.x+1,y:s.player.y};
  const dx=end.x-s.player.x,dy=end.y-s.player.y,length=Math.hypot(dx,dy)||1;
  const mid={x:(s.player.x+end.x)/2,y:(s.player.y+end.y)/2},half=skill.params.width/2;
  const normal={x:-dy/length,y:dx/length};
  this.wall={id:skill.id,a:{x:mid.x-normal.x*half,y:mid.y-normal.y*half},b:{x:mid.x+normal.x*half,y:mid.y+normal.y*half},until:s.elapsed+skill.params.duration};
  this.effects[skill.id]=this.wall.until;
  s.fx?.play(skill.id,'ground',{x:mid.x,y:mid.y,duration:skill.params.duration,angle:Math.atan2(dy,dx)});
 }
 blocksProjectile(projectile,previous){
  const wall=this.wall,s=this.scene;
  if(!wall||wall.until<=s.elapsed)return false;
  if(!segmentsWithin(previous,{x:projectile.x,y:projectile.y},wall.a,wall.b,18))return false;
  s.fx?.play(wall.id,'impact',{x:projectile.x,y:projectile.y});
  projectile.destroy();return true;
 }
 placeBomb(skill){
  const s=this.scene;if(this.traps.length>=6){const old=this.traps.shift();old.sprite.destroy();}
  const sprite=s.add.image(s.player.x-s.lastMove.x*45,s.player.y-s.lastMove.y*45,'support-bomb').setDisplaySize(42,42).setDepth(8);
  sprite.setData('byAlly',true);
  this.traps.push({id:skill.id,skill,sprite,life:skill.params.fuseDuration,armed:true});
  s.fx?.play(skill.id,'ground',{x:sprite.x,y:sprite.y,duration:skill.params.fuseDuration});
 }
 updateTraps(dt){
  const s=this.scene;
  this.traps=this.traps.filter(trap=>{
   trap.life-=dt;
   const triggered=s.enemies.getChildren().some(enemy=>enemy.active&&Math.hypot(enemy.x-trap.sprite.x,enemy.y-trap.sprite.y)<=trap.skill.params.triggerRadius);
   if(triggered||trap.life<=0){
    const power=this.numberMultiplier();
    for(const enemy of [...s.enemies.getChildren()])if(enemy.active&&Math.hypot(enemy.x-trap.sprite.x,enemy.y-trap.sprite.y)<=trap.skill.params.blastRadius)
     s.damageEnemy(enemy,trap.skill.params.damage*power,0,0,s.companion.sprite,{byAlly:true});
    s.fx?.play(trap.id,'impact',{x:trap.sprite.x,y:trap.sprite.y,scale:trap.skill.params.blastRadius/100});
    trap.sprite.destroy();return false;
   }
   return true;
  });
 }
 chooseClass(done){
  const s=this.scene;
  const cards=Object.values(SUPPORTS).map(ally=>({...ally,kind:'ally',signature:ally.signature,passives:ally.passives}));
  s.hud.showChoice('Choose Your Companion',cards,card=>{if(s.ended)return;this.summon(card.id,s.loadoutLevel||ALLY_RULES.join_level);done?.();},'Choose one companion to join your run.');
 }
 choices(){const a=this.scene.companion;if(!a)return[];return ALLY_CATALOG[a.id].filter(skill=>!a.skills.some(owned=>owned.id===skill.id)).sort(()=>Math.random()-.5).slice(0,3).map(skill=>({...skill,kind:'ally',skillKind:skill.kind,meta:skill.kind==='passive'?'Passive companion skill':'New companion skill'}));}
}
