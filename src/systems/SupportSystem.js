import { SUPPORTS, allyRank, allyNumberMultiplier, allyCooldownMultiplier, dangerousEnemy } from '../data/supports.js';
import { ALLY_CATALOG, ALLY_RULES } from '../data/allyCatalog.js';
import { t } from '../i18n/index.js';
import { updateDamageOverTime } from '../skills/StatusEffects.js';
import { AllyBrain } from './AllyBrain.js';
import { LegacyAllyAdapter, legacyPassiveAlias } from './LegacyAllyAdapter.js';

export class SupportSystem {
 constructor(scene){this.scene=scene;this.traps=[];this.effects={};this.legacy=new LegacyAllyAdapter(this);this.brain=new AllyBrain(scene,this,this.legacy);}
 summon(id,heroLevel=ALLY_RULES.join_level){
  const s=this.scene,data=SUPPORTS[id];if(s.companion||!data)return null;
  const sprite=s.add.sprite(s.player.x-75,s.player.y+40,`support-${id}`).setScale(.62).setDepth(19);
  sprite.setData('animLock',0);
  sprite.setData('byAlly',true);
  s.companion={id,sprite,skills:[],level:heroLevel,rank:allyRank(heroLevel),shot:.5};
  s.playEffect(4,sprite.x,sprite.y,125);s.audio.sfx('level');
  this.equip(data.signature);this.refresh();return s.companion;
 }
 refresh(){const a=this.scene.companion;if(a)this.scene.hud.setAlly(a);}
 syncLevel(level){
  const a=this.scene.companion;if(!a)return;
  const previous=a.rank;a.level=level;a.rank=allyRank(level);
  for(const skill of a.skills){skill.level=a.rank;const fraction=skill.cooldown?skill.remaining/skill.cooldown:0;skill.cooldown=skill.baseCooldown*allyCooldownMultiplier(a.rank);skill.remaining=fraction*skill.cooldown;}
  if(a.rank>previous)this.scene.hud.toast(t('Companion rank {n}',{n:a.rank}));
  this.refresh();
 }
 equip(skill){
  const a=this.scene.companion;if(!a||!skill||a.skills.length>=ALLY_RULES.slots||a.skills.some(entry=>entry.id===skill.id))return false;
  const rank=a.rank||1,baseCooldown=skill.cooldown||0,skillKind=skill.skillKind||skill.kind;
  a.skills.push({...skill,kind:'ally',skillKind,level:rank,baseCooldown,cooldown:baseCooldown*allyCooldownMultiplier(rank),remaining:0});
  this.effects={};this.refresh();return true;
 }
 has(id){const alias=legacyPassiveAlias(id);return Boolean(this.scene.companion?.skills.some(skill=>skill.id===id||skill.legacyId===id||skill.id===alias));}
 numberMultiplier(){return allyNumberMultiplier(this.scene.companion?.rank||1);}
 cooldownMultiplier(){return allyCooldownMultiplier(this.scene.companion?.rank||1);}
 effectActive(id){return (this.effects[id]||0)>this.scene.elapsed;}
 modifiers(){return this.legacy.modifiers();}
 preventFatal(damage){return this.legacy.preventFatal(damage);}
 canCast(skill,target){return this.legacy.canCast(skill,target);}
 cast(skill,target){return this.legacy.cast(skill,target);}
 chooseSkill(done){
  const s=this.scene,a=s.companion;if(!a||a.skills.length>=ALLY_RULES.slots){done?.();return;}
  const cards=this.choices();if(!cards.length){done?.();return;}
  s.hud.showChoice('Companion Pick',cards,card=>{this.equip(card);done?.();},'Choose one companion skill.');
 }
 update(dt){
  const s=this.scene,a=s.companion;if(!a)return;
  const target=dangerousEnemy(s.enemies.getChildren(),s.player),p=this.numberMultiplier();
  a.target=target;
  let x=s.player.x-s.lastMove.x*90,y=s.player.y-s.lastMove.y*90;
  if(a.id==='tank'&&target){const d=Math.hypot(target.x-s.player.x,target.y-s.player.y)||1;x=s.player.x+(target.x-s.player.x)/d*85;y=s.player.y+(target.y-s.player.y)/d*85;}
  if(a.id==='assassin'&&target){x=target.x-35;y=target.y+30;}
  const dx=x-a.sprite.x,dy=y-a.sprite.y,d=Math.hypot(dx,dy);
  if(d>900)a.sprite.setPosition(x,y);
  else if(d>10){const step=Math.min(d,s.stats.speed*(a.id==='assassin'?1.6:1.2)*dt);a.sprite.x+=dx/d*step;a.sprite.y+=dy/d*step;}
  a.sprite.setFlipX(dx<0);s.animateCharacter(a.sprite,`support-${a.id}`,d>10?'walk':'idle');
  for(const k of a.skills)if(k.skillKind!=='passive')k.remaining=Math.max(0,k.remaining-dt);
  a.shot-=dt;
  // The healer never attacks. Tank and Assassin have modest class basic attacks.
  if(a.id!=='saintess'&&target&&a.shot<=0&&Math.hypot(target.x-a.sprite.x,target.y-a.sprite.y)<160){
   s.damageEnemy(target,(a.id==='assassin'?12:7)*p,0,0,a.sprite,{byAlly:true});s.playEffect(0,target.x,target.y,55);
   s.animateCharacter(a.sprite,`support-${a.id}`,'attack',.28);
   const pursuit=a.skills.find(skill=>skill.id==='relentless-pursuit');
   const speed=pursuit?1+(pursuit.values?.[pursuit.level-1]||0)/100:1;
   a.shot=1.2/speed;
  }
  if(s.pausedForChoice||s.ended)return;
  if(this.has('intercept')||this.has('bulwark-wall'))this.clearShots(a.sprite,70+10*p);
  this.brain.update(dt);
  if(!s.pausedForChoice&&!s.ended)this.updateTraps(dt);
 }
 clearShots(origin,radius){const s=this.scene;for(const shot of [...s.enemyProjectiles.getChildren()])if(shot.active&&Math.hypot(shot.x-origin.x,shot.y-origin.y)<radius){s.playEffect(4,shot.x,shot.y,30);shot.destroy();}}
 cast(k,target,p){
  const s=this.scene,a=s.companion;
  const needsTarget=['taunt','bash','shockwave','ambush','mark','execute','venom','silence','disarm','rupture','volley','smoke'];
  if(needsTarget.includes(k.id)&&!target?.active)return false;
  const hit=damage=>{if(target?.active)s.damageEnemy(target,damage*p,0,0,a.sprite);};
  const heal=amount=>{s.stats.hp=Math.min(s.stats.maxHp,s.stats.hp+amount*p*s.stats.healing);s.healEffect();};
  const shield=amount=>{s.stats.shield=Math.min(s.stats.maxHp,s.stats.shield+amount*p);s.shieldEffect();};
  switch(k.id){
   case 'renew':if(s.stats.hp>=s.stats.maxHp)return false;heal(12);break;
   case 'blessing':shield(18);break;
   case 'well':if(s.stats.maxMana)s.stats.mana=Math.min(s.stats.maxMana,s.stats.mana+30*p);else heal(9);s.playEffect(4,s.player.x,s.player.y,80);break;
   case 'purify':this.clearShots(s.player,210);s.playEffect(4,s.player.x,s.player.y,180);break;
   case 'bomb':case 'snare':this.placeTrap(k.id,p);break;
   case 'taunt':for(const e of s.enemies.getChildren())if(e.active&&!e.getData('isBoss')&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<330)e.setData('tauntUntil',s.elapsed+3);s.playEffect(4,a.sprite.x,a.sprite.y,180);break;
   case 'bash':hit(16);if(target.active)target.setData('stunUntil',s.elapsed+.7);s.playEffect(0,target.x,target.y,90);break;
   case 'barrier':shield(30);break;
   case 'shockwave':for(const e of [...s.enemies.getChildren()])if(e.active&&Math.hypot(e.x-a.sprite.x,e.y-a.sprite.y)<155){s.damageEnemy(e,14*p,0,0,a.sprite);if(e.active)e.setData('stunUntil',s.elapsed+.45);}s.playEffect(5,a.sprite.x,a.sprite.y,210);break;
   case 'ambush':hit(27);s.playEffect(0,target.x,target.y,80);break;
   case 'mark':if(s.heroData.id!=='balam'){target.setData({markUntil:s.elapsed+5,markBonus:Math.min(.65,.2*p)});s.playEffect(4,target.x,target.y,65);}break;
   case 'execute':hit(target.getData('hp')/target.getData('maxHp')<.35?65:22);s.playEffect(0,target.x,target.y,105);break;
   case 'venom':target.setData({poisonUntil:s.elapsed+5,poisonDps:5*p,poisonSource:a.sprite,poisonByAlly:true});s.playEffect(1,target.x,target.y,70);break;
   case 'silence':target.setData('silenceUntil',s.elapsed+3);hit(8);break;
   case 'disarm':target.setData('disarmUntil',s.elapsed+4);hit(10);break;
   case 'rupture':target.setData({bleedUntil:s.elapsed+4,bleedDps:8*p,bleedSource:a.sprite,bleedByAlly:true});s.playEffect(3,target.x,target.y,65);break;
   case 'volley':hit(36);s.playEffect(0,target.x,target.y,70);s.playEffect(2,target.x+16,target.y-12,45);break;
   case 'smoke':target.setData({slowUntil:s.elapsed+4,slowPct:.5});this.effects.smoke=s.elapsed+3;s.playEffect(5,s.player.x,s.player.y,145);break;
   default:return false;
  }
  return true;
 }
 placeTrap(kind,p){
  const s=this.scene;if(this.traps.length>=6){const old=this.traps.shift();old.sprite.destroy();}
  const sprite=s.add.image(s.player.x-s.lastMove.x*45,s.player.y-s.lastMove.y*45,`support-${kind}`).setDisplaySize(kind==='snare'?54:42,kind==='snare'?54:42).setDepth(8);
  sprite.setData('byAlly',true);
  this.traps.push({kind,sprite,life:12,power:p,armed:.45});
 }
 updateTraps(dt){
  const s=this.scene;
  this.traps=this.traps.filter(trap=>{
   trap.life-=dt;trap.armed-=dt;
   const target=trap.armed<=0?s.closestEnemy(trap.sprite.x,trap.sprite.y,85):null;
   if(target){
    s.playEffect(trap.kind==='bomb'?5:4,trap.sprite.x,trap.sprite.y,160);
    for(const e of [...s.enemies.getChildren()])if(e.active&&Math.hypot(e.x-trap.sprite.x,e.y-trap.sprite.y)<135){
     if(trap.kind==='bomb')s.damageEnemy(e,32*trap.power,0,0,trap.sprite);
     else e.setData({slowUntil:s.elapsed+4,slowPct:.5});
    }
   }
   if(target||trap.life<=0){trap.sprite.destroy();return false;}return true;
  });
 }
 updateEnemy(enemy,dt){
  updateDamageOverTime(this.scene,enemy,dt);
 }
 chooseClass(done){
  const s=this.scene;
  const cards=Object.values(SUPPORTS).map(ally=>({...ally,kind:'ally',signature:ally.signature,passives:ally.passives}));
  s.hud.showChoice('Choose Your Companion',cards,card=>{this.summon(card.id,s.loadoutLevel||ALLY_RULES.join_level);done?.();},'Choose one companion to join your run.');
 }
 choices(){const a=this.scene.companion;if(!a)return[];return ALLY_CATALOG[a.id].filter(skill=>!a.skills.some(owned=>owned.id===skill.id)).sort(()=>Math.random()-.5).slice(0,3).map(skill=>({...skill,kind:'ally',skillKind:skill.kind,meta:skill.kind==='passive'?'Passive companion skill':'New companion skill'}));}
}
