// Step-11 bridge: keep the already-shipped support effects until Step 12 provides each new skill's behavior.
const TEMPORARY_FALLBACKS = {
  'radiant-beacon': 'focus', 'lifebond': 'valor', 'shield-throw': 'bash', 'vanish': 'focus',
  'sanctuary-dome': 'sanctuary', 'guardian-link': 'guard', 'bounty-contract': 'mark',
};
const PASSIVE_ALIASES = {
  rescue: 'saving-grace', valor: 'sacred-fervor', guard: 'bodyguard', pursuit: 'relentless-pursuit',
};
const valueAtRank=(skill,rank)=>skill?.values?.[Math.min(skill.values.length-1,Math.max(0,rank-1))]??0;

export class LegacyAllyAdapter {
  constructor(support) { this.support = support; }

  legacyId(skill) { return skill.legacyId || TEMPORARY_FALLBACKS[skill.id] || skill.id; }

  canCast(skill, target) {
    const scene=this.support.scene;
    if(!skill||skill.skillKind==='passive'||this.support.effectActive(skill.id))return false;
    if(skill.id==='healing-circle'&&scene.stats.hp>=scene.stats.maxHp*.85)return false;
    if(skill.id==='lifebond'&&scene.stats.hp>=scene.stats.maxHp*.7)return false;
    if(skill.id==='jade-ward'&&scene.stats.shield>=scene.stats.maxHp*.5)return false;
    const needsTarget=['bash','shockwave','ambush','mark','execute','venom','silence','disarm','rupture','volley','smoke'];
    return !needsTarget.includes(this.legacyId(skill))||Boolean(target?.active);
  }

  modifiers() {
    const support=this.support,scene=support.scene,ally=scene.companion;
    if(!ally)return {damage:1,haste:0,speed:1,regen:0,armor:0,reduction:0,lifestealPct:0};
    const p=support.numberMultiplier(),near=(range)=>Math.hypot(scene.player.x-ally.sprite.x,scene.player.y-ally.sprite.y)<range;
    const skill=id=>ally.skills.find(entry=>entry.id===id);
    const sacred=skill('sacred-fervor'),bodyguard=skill('bodyguard');
    const beacon=support.effectActive('radiant-beacon'),warCry=support.effectActive('war-cry'),bond=support.effectActive('lifebond');
    let reduction=0;
    if(support.has('sanctuary-dome')&&support.effectActive('sanctuary-dome'))reduction+=.3;
    if(bodyguard&&near(220))reduction+=valueAtRank(bodyguard,ally.rank)/100;
    if(warCry)reduction+=.5;
    return {
      damage:sacred?1+valueAtRank(sacred,ally.rank)/100:1,
      haste:beacon ? .2 : 0,speed:beacon ? 1.1 : 1,
      regen:support.has('renewal-song')?1.5*p:0,armor:support.has('fortify')?3*p:0,
      reduction:Math.min(.8,reduction+(support.effects.smoke>scene.elapsed ? .25 : 0)),
      lifestealPct:bond ? .05 : 0,
    };
  }

  preventFatal(damage) {
    const scene=this.support.scene,ally=scene.companion;
    if(!ally)return damage;
    const guardian=ally.skills.find(skill=>skill.id==='guardian-link');
    if(guardian&&Math.hypot(scene.player.x-ally.sprite.x,scene.player.y-ally.sprite.y)<300){
      const share=valueAtRank(guardian,ally.rank)/100;
      ally.hp=Math.max(1,(ally.hp??100)-damage*share);
      damage*=1-share;
    }
    const rescue=ally.skills.find(skill=>skill.id==='saving-grace');
    if(rescue&&damage>=scene.stats.hp&&scene.elapsed>=(ally.savingGraceReadyAt||0)){
      ally.savingGraceReadyAt=scene.elapsed+60;
      scene.stats.hp=Math.min(scene.stats.maxHp,scene.stats.hp+scene.stats.maxHp*.4*scene.stats.healing);
      scene.invulnerable=Math.max(scene.invulnerable,2);scene.playEffect(4,scene.player.x,scene.player.y,150);return 0;
    }
    const bulwark=ally.skills.find(skill=>skill.legacyId==='bulwark');
    if(bulwark&&damage>=scene.stats.hp&&scene.stats.hp<scene.stats.maxHp*.4){scene.shieldEffect();return 0;}
    return damage;
  }

  cast(skill,target) {
    const support=this.support,scene=support.scene,ally=scene.companion,p=support.numberMultiplier(),id=this.legacyId(skill);
    const hit=damage=>{if(target?.active)scene.damageEnemy(target,damage*p,0,0,ally.sprite,{byAlly:true});};
    const heal=amount=>{scene.stats.hp=Math.min(scene.stats.maxHp,scene.stats.hp+amount*p*scene.stats.healing);scene.healEffect();};
    const shield=amount=>{scene.stats.shield=Math.min(scene.stats.maxHp,scene.stats.shield+amount*p);scene.shieldEffect();};
    const effect=(duration=skill.duration||3)=>{support.effects[skill.id]=scene.elapsed+duration;};
    switch(id){
      case 'renew': heal(12);effect();break;
      case 'blessing': shield(18);effect();break;
      case 'well': if(scene.stats.maxMana)scene.stats.mana=Math.min(scene.stats.maxMana,scene.stats.mana+30*p);else heal(9);effect();break;
      case 'purify': support.clearShots(scene.player,210);effect();break;
      case 'intercept':support.clearShots(scene.player,210);effect(skill.duration||5);break;
      case 'bomb':case 'snare':support.placeTrap(id,p);effect(.45);break;
      case 'taunt':for(const enemy of scene.enemies.getChildren())if(enemy.active&&!enemy.getData('isBoss')&&Math.hypot(enemy.x-ally.sprite.x,enemy.y-ally.sprite.y)<330)enemy.setData({tauntUntil:scene.elapsed+3,tauntTarget:ally.sprite});support.effects['war-cry']=scene.elapsed+3;effect(3);break;
      case 'bash':hit(16);if(target?.active)target.setData('stunUntil',scene.elapsed+.7);effect();break;
      case 'barrier':shield(30);effect();break;
      case 'sanctuary':effect(skill.duration||5);break;
      case 'shockwave':for(const enemy of [...scene.enemies.getChildren()])if(enemy.active&&Math.hypot(enemy.x-ally.sprite.x,enemy.y-ally.sprite.y)<155){scene.damageEnemy(enemy,14*p,0,0,ally.sprite,{byAlly:true});if(enemy.active)enemy.setData('stunUntil',scene.elapsed+.45);}scene.playEffect(5,ally.sprite.x,ally.sprite.y,210);effect();break;
      case 'ambush':hit(27);effect();break;
      case 'mark':if(scene.heroData.id!=='balam'&&target?.active){target.setData({markUntil:scene.elapsed+5,markBonus:Math.min(.65,.2*p)});effect(5);}break;
      case 'execute':hit(target?.getData('hp')/target?.getData('maxHp')<.35?65:22);effect();break;
      case 'venom':if(target?.active){target.setData({poisonUntil:scene.elapsed+5,poisonDps:5*p,poisonSource:ally.sprite,poisonByAlly:true});effect(5);}break;
      case 'silence':if(target?.active){target.setData('silenceUntil',scene.elapsed+3);hit(8);effect(3);}break;
      case 'disarm':if(target?.active){target.setData('disarmUntil',scene.elapsed+4);hit(10);effect(4);}break;
      case 'rupture':if(target?.active){target.setData({bleedUntil:scene.elapsed+4,bleedDps:8*p,bleedSource:ally.sprite,bleedByAlly:true});effect(4);}break;
      case 'volley':hit(36);effect();break;
      case 'smoke':if(target?.active)target.setData({slowUntil:scene.elapsed+4,slowPct:.5});support.effects.smoke=scene.elapsed+3;effect(4);break;
      case 'focus':
        if(skill.id==='vanish')scene.player.hiddenUntil=scene.elapsed+(skill.duration||2.5);
        support.effects[skill.id]=scene.elapsed+(skill.duration||8);effect(skill.duration||8);break;
      case 'valor':support.effects.lifebond=scene.elapsed+(skill.duration||6);effect(skill.duration||6);break;
      default:return false;
    }
    scene.playEffect(0,target?.x??ally.sprite.x,target?.y??ally.sprite.y,65);
    return true;
  }
}

export function legacyPassiveAlias(id){return PASSIVE_ALIASES[id]||null;}
