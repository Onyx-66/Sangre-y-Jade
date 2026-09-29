import { SUPPORTS, supportRank, dangerousEnemy } from '../data/supports.js';
import { t } from '../i18n/index.js';

export class SupportSystem {
 constructor(scene){this.scene=scene;this.traps=[];this.effects={};}
 summon(id){
  const s=this.scene,data=SUPPORTS[id];if(s.companion||!data)return null;
  const sprite=s.add.sprite(s.player.x-75,s.player.y+40,`support-${id}`).setScale(.62).setDepth(19);
  sprite.setData('animLock',0);
  s.companion={id,sprite,skills:[],level:supportRank(s.stats.level),shot:.5};
  s.playEffect(4,sprite.x,sprite.y,125);s.audio.sfx('level');this.refresh();return s.companion;
 }
 refresh(){const a=this.scene.companion;if(a)this.scene.hud.setAlly(a);}
 syncLevel(level){const a=this.scene.companion;if(!a)return;a.level=supportRank(level);a.skills.forEach(k=>k.level=a.level);this.refresh();}
 equip(skill,index){
  const a=this.scene.companion;if(!a||a.skills.some(k=>k.id===skill.id))return;
  const entry={...skill,level:a.level,remaining:.4};
  if(index!==undefined&&index>=0&&index<a.skills.length)a.skills[index]=entry;
  else if(a.skills.length<3)a.skills.push(entry);
  this.effects={};this.refresh();
 }
 has(id){return this.scene.companion?.skills.some(k=>k.id===id);}
 power(){return 1+(this.scene.companion?.level-1||0)*.12;}
 modifiers(){
  const s=this.scene,p=this.power(),near=s.companion&&Math.hypot(s.player.x-s.companion.sprite.x,s.player.y-s.companion.sprite.y)<220;
  return {
   damage:this.has('valor')?1+.12*p:1,haste:this.has('focus')?.13*p:0,
   speed:this.has('wind')?1+Math.min(.4,.1*p):1,regen:this.has('renewal-song')?1.5*p:0,
   armor:this.has('fortify')?3*p:0,
   reduction:Math.min(.6,(this.has('sanctuary')?.12*p:0)+(this.has('guard')&&near?.18*p:0)+(this.effects.smoke>s.elapsed?.25:0)),
  };
 }
 preventFatal(damage){
  const s=this.scene,a=s.companion;if(!a)return damage;
  const p=this.power(),rescue=a.skills.find(k=>k.id==='rescue'),bastion=a.skills.find(k=>k.id==='bulwark');
  if(rescue&&rescue.remaining<=0&&damage>=s.stats.hp){rescue.remaining=rescue.cooldown;s.stats.hp=Math.min(s.stats.maxHp,s.stats.hp+35*p);s.playEffect(4,s.player.x,s.player.y,150);return 0;}
  if(bastion&&bastion.remaining<=0&&s.stats.hp<s.stats.maxHp*.4){bastion.remaining=bastion.cooldown;s.shieldEffect();return 0;}
  return damage;
 }
 update(dt){
  const s=this.scene,a=s.companion;if(!a)return;
  const target=dangerousEnemy(s.enemies.getChildren(),s.player),p=this.power();
  a.target=target;
  let x=s.player.x-s.lastMove.x*90,y=s.player.y-s.lastMove.y*90;
  if(a.id==='tank'&&target){const d=Math.hypot(target.x-s.player.x,target.y-s.player.y)||1;x=s.player.x+(target.x-s.player.x)/d*85;y=s.player.y+(target.y-s.player.y)/d*85;}
  if(a.id==='assassin'&&target){x=target.x-35;y=target.y+30;}
  const dx=x-a.sprite.x,dy=y-a.sprite.y,d=Math.hypot(dx,dy);
  if(d>900)a.sprite.setPosition(x,y);
  else if(d>10){const step=Math.min(d,s.stats.speed*(a.id==='assassin'?1.6:1.2)*dt);a.sprite.x+=dx/d*step;a.sprite.y+=dy/d*step;}
  a.sprite.setFlipX(dx<0);s.animateCharacter(a.sprite,`support-${a.id}`,d>10?'walk':'idle');
  for(const k of a.skills)k.remaining=Math.max(0,k.remaining-dt);
  a.shot-=dt;
  // The healer never attacks. Tank and Assassin have modest class basic attacks.
  if(a.id!=='saintess'&&target&&a.shot<=0&&Math.hypot(target.x-a.sprite.x,target.y-a.sprite.y)<160){
   s.damageEnemy(target,(a.id==='assassin'?12:7)*p,0,0,a.sprite);s.playEffect(0,target.x,target.y,55);
   s.animateCharacter(a.sprite,`support-${a.id}`,'attack',.28);a.shot=this.has('pursuit')?.65:1.2;
  }
  if(s.pausedForChoice||s.ended)return;
  if(this.has('intercept'))this.clearShots(a.sprite,70+10*p);
  for(const k of a.skills){
   if(!k.cooldown||k.remaining>0||['rescue','bulwark'].includes(k.id))continue;
   if(this.cast(k,target,p)){k.remaining=k.cooldown;s.animateCharacter(a.sprite,`support-${a.id}`,'attack',.32);}
   if(s.pausedForChoice||s.ended)break;
  }
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
   case 'mark':target.setData({markUntil:s.elapsed+5,markBonus:Math.min(.65,.2*p)});s.playEffect(4,target.x,target.y,65);break;
   case 'execute':hit(target.getData('hp')/target.getData('maxHp')<.35?65:22);s.playEffect(0,target.x,target.y,105);break;
   case 'venom':target.setData({poisonUntil:s.elapsed+5,poisonDps:5*p});s.playEffect(1,target.x,target.y,70);break;
   case 'silence':target.setData('silenceUntil',s.elapsed+3);hit(8);break;
   case 'disarm':target.setData('disarmUntil',s.elapsed+4);hit(10);break;
   case 'rupture':target.setData({bleedUntil:s.elapsed+4,bleedDps:8*p});s.playEffect(3,target.x,target.y,65);break;
   case 'volley':hit(36);s.playEffect(0,target.x,target.y,70);s.playEffect(2,target.x+16,target.y-12,45);break;
   case 'smoke':target.setData('slowUntil',s.elapsed+4);this.effects.smoke=s.elapsed+3;s.playEffect(5,s.player.x,s.player.y,145);break;
   default:return false;
  }
  return true;
 }
 placeTrap(kind,p){
  const s=this.scene;if(this.traps.length>=6){const old=this.traps.shift();old.sprite.destroy();}
  const sprite=s.add.image(s.player.x-s.lastMove.x*45,s.player.y-s.lastMove.y*45,`support-${kind}`).setDisplaySize(kind==='snare'?54:42,kind==='snare'?54:42).setDepth(8);
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
     else e.setData('slowUntil',s.elapsed+4);
    }
   }
   if(target||trap.life<=0){trap.sprite.destroy();return false;}return true;
  });
 }
 updateEnemy(enemy,dt){
  const s=this.scene,dps=(enemy.getData('poisonUntil')>s.elapsed?enemy.getData('poisonDps'):0)+(enemy.getData('bleedUntil')>s.elapsed?enemy.getData('bleedDps'):0);
  if(dps){const hp=enemy.getData('hp')-dps*dt;enemy.setData('hp',hp);s.stats.damageDone+=dps*dt;if(hp<=0)s.killEnemy(enemy);}
 }
 chooseClass(done){
  const s=this.scene;s.hud.showChoice('Choose Your Support',Object.values(SUPPORTS),card=>{this.summon(card.id);this.chooseInitial(done);},'One support per run. Choose 3 skills; they activate automatically.');
 }
 choices(){const a=this.scene.companion;return [...SUPPORTS[a.id].skills].filter(k=>!a.skills.some(o=>o.id===k.id)).sort(()=>Math.random()-.5).slice(0,3).map(k=>({...k,meta:'New support skill'}));}
 chooseInitial(done){
  const s=this.scene,a=s.companion;
  if(a.skills.length>=3){done();return;}
  s.hud.showChoice(t('Choose support skill {n} of 3',{n:a.skills.length+1}),this.choices(),card=>{this.equip(card);this.chooseInitial(done);},'Support skills level up automatically with your hero.');
 }
 offerChange(done,cards=this.choices()){
  const s=this.scene,a=s.companion;
  s.hud.showChoice('Support Skills',cards,card=>{
   s.hud.showChoice('Choose a skill to replace',a.skills,(_,index)=>{this.equip(card,index);done();},'Support skills level up automatically with your hero.',{label:'Cancel',action:()=>this.offerChange(done,cards)});
  },'Support skills level up automatically with your hero.',{label:'Keep current skills',action:done});
 }
}
