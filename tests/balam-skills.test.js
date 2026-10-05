import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HEROES } from '../src/data/heroes.js';
import { BALAM_DEFINITIONS, SHARED_DEFINITIONS } from '../src/skills/generated/balam.js';
import { ACTIVE_HANDLERS, PASSIVE_HANDLERS } from '../src/skills/index.js';
import { skillContext, updateSkillEffects } from '../src/skills/common.js';
import { skillModifiers } from '../src/skills/balam/runtime.js';
import { updateDamageOverTime } from '../src/skills/StatusEffects.js';
import { draftSkills } from '../src/systems/SkillDraft.js';
import { passiveStateText } from '../src/systems/PassiveState.js';
import { FxDirector, placeholderStyle } from '../src/fx/FxDirector.js';
import { SkillAudio } from '../src/systems/SkillAudio.js';
import { skillMessages } from '../src/i18n/skills.js';
import { makeScene, addEnemy, sprite } from './helpers/scene-fixture.js';

const db=JSON.parse(readFileSync(new URL('../docs/skills-redesign/skills_redesign.json',import.meta.url)));
const def=id=>[...BALAM_DEFINITIONS,...SHARED_DEFINITIONS].find(skill=>skill.id===id);
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function scene(){const s=makeScene(HEROES.balam);s.hud.setSkills=()=>{};s.passiveSlots=[];s.loadoutLevel=1;s.fxCalls=[];s.audioCalls=[];s.fx={play:(...args)=>{s.fxCalls.push(args);return sprite();}};s.skillAudio={play:(...args)=>s.audioCalls.push(args),loop(){},stop(){}};return s;}
function cast(s,id,level=1){const skill={...def(id),level,remaining:0};ACTIVE_HANDLERS[id](s,skill,skillContext(s,skill));return skill;}
function advance(s,seconds){let left=seconds;while(left>1e-9){const dt=Math.min(.05,left);s.elapsed+=dt;s.passives.emit('tick',{dt});updateSkillEffects(s,dt);left-=dt;}}
function equip(s,id,level=1){return s.passives.equip(def(id),level);}

test('Balam definitions, names, copy and paths come from JSON; only his 16 actives/8 passives are draftable',()=>{
 assert.equal(HEROES.balam.skills.length,16);assert.equal(HEROES.balam.passives.length,8);
 for(const source of [...db.heroes.balam,...db.shared]){
  const skill=def(source.id);assert.equal(skill.name,source.name);assert.equal(skill.description,source.desc);assert.equal(skill.iconFile,source.icon_file);
  assert.deepEqual(skillMessages.findLast(row=>row[0]===source.name),[source.name,source.fr,source.ar]);
  const copy=skillMessages.findLast(row=>row[0]===source.desc);assert.ok(copy?.slice(1).every(text=>text&&text!==source.desc));
  if(skill.kind==='active'){assert.equal(skill.cooldown,source.cd);assert.equal(skill.mana,source.mana);assert.equal(typeof ACTIVE_HANDLERS[skill.id],'function');}
  else {assert.deepEqual(skill.values,(source.vals.match(/\d+(?:\.\d+)?/g)||[]).map(Number).slice(0,5));assert.ok(PASSIVE_HANDLERS[skill.id]);}
 }
 assert.ok([...HEROES.balam.skills,...HEROES.balam.passives].every(skill=>skill.owner==='balam'));
 assert.ok(['spotted-guard','night-pounce','obsidian-rain','temple-quake'].every(id=>![...HEROES.balam.skills,...HEROES.balam.passives].some(skill=>skill.id===id)));
 for(const guaranteePassive of [true,false]){
  const cards=draftSkills({activeSkills:HEROES.balam.skills,passiveSkills:HEROES.balam.passives,guaranteePassive});assert.ok(cards.every(card=>card.owner==='balam'));
 }
});
test('jaguar-roar fears regular foes but slows bosses by 35%, for two seconds',()=>{
 const s=scene(),a=addEnemy(s),b=addEnemy(s,{isBoss:true},160),far=addEnemy(s,{},200);cast(s,'jaguar-roar');
 assert.equal(a.getData('hp'),960);assert.equal(a.getData('fearUntil'),3);assert.equal(b.getData('fearUntil'),0);assert.equal(b.getData('slowPct'),.35);assert.equal(b.getData('slowUntil'),3);assert.equal(far.getData('hp'),1000);
});
test('obsidian-arc cleaves only the 150-degree arc, refreshes bleed and damages props',()=>{
 const s=scene(),a=addEnemy(s),behind=addEnemy(s,{},-100),prop=sprite(60,0);s.props.add(prop);let propDamage=0;s.damageProp=(_prop,damage)=>propDamage+=damage;
 cast(s,'obsidian-arc');assert.equal(a.getData('hp'),952);assert.equal(a.getData('bleedDps'),5);assert.equal(a.getData('bleedUntil'),5);assert.equal(behind.getData('hp'),1000);assert.equal(propDamage,48);
 advance(s,1);cast(s,'obsidian-arc');assert.equal(a.getData('bleedDps'),5);approx(a.getData('bleedUntil'),6);
});
test('prowlers-leap selects nearest foe, is airborne-invulnerable, then lands with r110 damage',()=>{
 const s=scene(),a=addEnemy(s,{},90),b=addEnemy(s,{},300);cast(s,'prowlers-leap');s.damagePlayer(50,90,0,a,true);assert.equal(s.stats.hp,100);
 advance(s,.35);approx(s.player.x,90);assert.equal(a.getData('hp'),938);assert.equal(b.getData('hp'),1000);assert.equal(s.skillMotion,null);
});
test('claw-cyclone delivers six 18-damage ticks, slows hero movement to 60%, and rejects knockback',()=>{
 const s=scene(),a=addEnemy(s);cast(s,'claw-cyclone');approx(skillModifiers(s).speedMult,.6);s.damagePlayer(10,100,0,a,true);assert.equal(s.player.body.velocity.x,0);
 advance(s,1.5);approx(a.getData('hp'),892);approx(skillModifiers(s).speedMult,1);
});
test('ceiba-breaker selects nearest foe and gives bosses a shorter stun',()=>{
 for(const boss of [false,true]){const s=scene(),near=addEnemy(s,{isBoss:boss},80),far=addEnemy(s,{},150);cast(s,'ceiba-breaker');assert.equal(near.getData('hp'),900);approx(near.getData('stunUntil'),1+(boss?.4:1.2));assert.equal(far.getData('hp'),1000);}
});
test('bloodless-hunt targets highest current HP, caps max-HP bonus, and turns at 240 degrees/s',()=>{
 const s=scene(),a=addEnemy(s,{hp:900,maxHp:2000},400),b=addEnemy(s,{hp:600},60);cast(s,'bloodless-hunt');const shot=s.projectiles.getChildren()[0];
 assert.equal(shot.getData('homingTarget'),a);assert.equal(shot.getData('damage'),124);a.setPosition(0,400);s.updateProjectiles(.1);approx(Math.atan2(shot.body.velocity.y,shot.body.velocity.x),24*Math.PI/180);approx(shot.body.speed,640);
 s.onProjectileHit(shot,a);assert.equal(a.getData('hp'),776);assert.equal(b.getData('hp'),600);
});
test('stone-maw chooses the densest pack, arms after 0.4s and detonates only once',()=>{
 const s=scene(),lone=addEnemy(s,{},30),a=addEnemy(s,{},320),b=addEnemy(s,{},350);cast(s,'stone-maw');advance(s,.35);assert.equal(a.getData('hp'),1000);advance(s,.05);assert.equal(a.getData('hp'),918);assert.equal(b.getData('hp'),918);assert.equal(lone.getData('hp'),1000);approx(a.getData('stunUntil'),s.elapsed+1);advance(s,6);assert.equal(a.getData('hp'),918);
});
test('war-drum pulses 20/20/45 twice in six seconds and grants 15% basic attack speed',()=>{
 const s=scene(),a=addEnemy(s);cast(s,'war-drum');approx(skillModifiers(s).attackSpeedMult,1.15);advance(s,6);approx(a.getData('hp'),830);approx(skillModifiers(s).attackSpeedMult,1);
});
test('sun-claw sweeps to 220, hits each foe once, and burns at 10 DPS for three seconds',()=>{
 const s=scene(),a=addEnemy(s,{},210),far=addEnemy(s,{},230);cast(s,'sun-claw');advance(s,.3);assert.equal(a.getData('hp'),926);assert.equal(far.getData('hp'),1000);assert.equal(a.getData('burnDps'),10);approx(a.getData('burnUntil'),s.elapsed+3);
 s.elapsed+=3;updateDamageOverTime(s,a,3);approx(a.getData('hp'),896);
});
test('jaguar-echo chases at 280, bites every 0.7s, and replaces the old spirit',()=>{
 const s=scene(),a=addEnemy(s,{},340);cast(s,'jaguar-echo');const first=s.jaguarEcho;advance(s,.5);approx(first.sprites[0].x,140);assert.equal(a.getData('hp'),1000);advance(s,.5);approx(first.sprites[0].x,280);assert.equal(a.getData('hp'),990);advance(s,.7);assert.equal(a.getData('hp'),980);cast(s,'jaguar-echo');assert.equal(first.active,false);assert.equal(first.sprites[0].active,false);assert.notEqual(first,s.jaguarEcho);
});
test('fang-path erupts eight staggered segments, hitting each foe once with 40% slow',()=>{
 const s=scene(),a=addEnemy(s,{},30),b=addEnemy(s,{},380),off=addEnemy(s,{},200);off.y=80;cast(s,'fang-path');assert.equal(a.getData('hp'),946);assert.equal(b.getData('hp'),1000);advance(s,.5);assert.equal(a.getData('hp'),946);assert.equal(b.getData('hp'),946);assert.equal(b.getData('slowPct'),.4);assert.equal(off.getData('hp'),1000);assert.equal(s.fxCalls.filter(call=>call[1]==='ground').length,8);
});
test('hunters-mark chooses bosses then highest damage, boosts all sources, heals 4 on marked death',()=>{
 const s=scene(),boss=addEnemy(s,{isBoss:true,damage:1},200),a=addEnemy(s,{damage:30}),b=addEnemy(s,{damage:25},150),low=addEnemy(s,{damage:2},80);
 cast(s,'hunters-mark');for(const enemy of [boss,a,b]){assert.equal(enemy.getData('markBonus'),.3);assert.equal(enemy.getData('markUntil'),7);}assert.equal(low.getData('markUntil'),0);
 s.damageEnemy(a,10,0,0,s.player,{byAlly:true});assert.equal(a.getData('hp'),987);s.stats.hp=50;a.setData('hp',1);s.damageEnemy(a,10);assert.equal(s.stats.hp,54);
});
test('nine-lives heals 26 + 20% missing HP and grants a four-second 25% sprint',()=>{
 const s=scene();s.stats.hp=50;cast(s,'nine-lives');assert.equal(s.stats.hp,86);approx(skillModifiers(s).speedMult,1.25);advance(s,4);approx(skillModifiers(s).speedMult,1);
});
test('black-mirror reflects only its 120-degree front arc at 150% and returns 15 melee damage',()=>{
 const s=scene(),a=addEnemy(s);cast(s,'black-mirror');const front=s.spawnEnemyProjectile(30,0,Math.PI,100,20);s.onEnemyProjectileHit(front);assert.equal(s.projectiles.getChildren()[0].getData('damage'),30);assert.equal(s.stats.hp,100);
 const back=s.spawnEnemyProjectile(-30,0,0,100,20);s.onEnemyProjectileHit(back);assert.equal(s.stats.hp,80);s.invulnerable=0;s.damagePlayer(10,a.x,a.y,a,true);assert.equal(a.getData('hp'),985);assert.equal(s.stats.hp,70);
});
test('pyramid-rush travels 300 in 0.5s, hits touched enemies once, and ends with r90 stomp',()=>{
 const s=scene(),a=addEnemy(s,{},100),b=addEnemy(s,{},360);cast(s,'pyramid-rush');advance(s,.5);approx(s.player.x,300);assert.equal(a.getData('hp'),908);assert.equal(b.getData('hp'),908);assert.equal(s.skillMotion,null);
});
test('heart-of-balam breaks or expires once, clears only its ward and bursts for 150',()=>{
 for(const expires of [false,true]){const s=scene(),a=addEnemy(s);cast(s,'heart-of-balam');assert.equal(s.stats.shield,55);if(expires)advance(s,8);else s.damagePlayer(60,100,0,a,true);assert.equal(a.getData('hp'),850);assert.equal(s.stats.shield,0);assert.equal(s.balamWard,null);advance(s,8);assert.equal(a.getData('hp'),850);}
 const s=scene();cast(s,'heart-of-balam',6);approx(s.stats.shield,55*2.25);
});

for(let level=1;level<=5;level++){
 test(`bloodlust Lv${level}: kills refresh five stacks for three seconds`,()=>{const s=scene(),entry=equip(s,'bloodlust',level);for(let i=0;i<7;i++)s.passives.emit('kill');approx(s.passives.modifiers().attackSpeedMult,1+5*def('bloodlust').values[level-1]/100);assert.equal(entry.state.hudState.value,5);advance(s,3);approx(s.passives.modifiers().attackSpeedMult,1);});
 test(`stonehide Lv${level}: missing-HP tiers apply JSON armor cap to real combat`,()=>{const s=scene(),entry=equip(s,'stonehide',level);s.stats.hp=1;s.passives.emit('tick');const cap=def('stonehide').values[level-1];assert.equal(s.passives.modifiers().armor,cap);assert.equal(entry.state.hudState.value,cap);s.stats.hp=89;assert.equal(s.passives.modifiers().armor,1);s.damagePlayer(10,100,0);approx(s.stats.hp,89-(10-.72));});
 test(`predators-rhythm Lv${level}: crit reduces all cooldowns, respecting one-second ICD`,()=>{const s=scene(),entry=equip(s,'predators-rhythm',level);s.skillSlots=[{remaining:3},{remaining:.1}];s.passives.emit('crit');approx(s.skillSlots[0].remaining,3-def('predators-rhythm').values[level-1]);assert.equal(s.skillSlots[1].remaining,0);s.passives.emit('crit');approx(s.skillSlots[0].remaining,3-def('predators-rhythm').values[level-1]);advance(s,1);s.passives.emit('crit');approx(s.skillSlots[0].remaining,3-2*def('predators-rhythm').values[level-1]);assert.equal(entry.state.hudState.type,'timer');});
 test(`feast-of-the-fallen Lv${level}: every 12 kills heals JSON percent with 7/12 HUD`,()=>{const s=scene(),entry=equip(s,'feast-of-the-fallen',level);s.stats.hp=40;for(let i=0;i<7;i++)s.passives.emit('kill');assert.equal(passiveStateText(entry.state.hudState),'7/12');assert.equal(s.stats.hp,40);for(let i=0;i<5;i++)s.passives.emit('kill');assert.equal(s.stats.hp,40+def('feast-of-the-fallen').values[level-1]);assert.equal(entry.state.hudState.value,0);});
 test(`obsidian-thorns Lv${level}: only melee HP damage returns flat + 15% damage`,()=>{const s=scene(),a=addEnemy(s);equip(s,'obsidian-thorns',level);s.passives.emit('damageTaken',{source:a,melee:false,amount:20});assert.equal(a.getData('hp'),1000);s.damagePlayer(20,100,0,a,true);approx(a.getData('hp'),1000-def('obsidian-thorns').values[level-1]-3);});
 test(`jaguars-pride Lv${level}: nearby enemy bonus caps at five and affects hero damage only`,()=>{const s=scene();for(let i=0;i<6;i++)addEnemy(s,{},100+i);equip(s,'jaguars-pride',level);const a=s.enemies.getChildren()[0],mult=1+5*def('jaguars-pride').values[level-1]/100;approx(s.passives.modifiers().damageMult,mult);s.damageEnemy(a,10);approx(a.getData('hp'),1000-10*mult);s.damageEnemy(a,10,0,0,s.player,{byAlly:true});approx(a.getData('hp'),990-10*mult);});
 test(`earthshaker Lv${level}: fourth basic attack uses JSON weapon damage fraction`,()=>{const s=scene(),a=addEnemy(s),entry=equip(s,'earthshaker',level);for(let count=1;count<=3;count++)s.passives.emit('basicAttack',{weapon:{damage:100},count});assert.equal(a.getData('hp'),1000);s.passives.emit('basicAttack',{weapon:{damage:100},count:4});assert.equal(a.getData('hp'),1000-def('earthshaker').values[level-1]);assert.equal(entry.state.hudState.value,0);});
 test(`wounded-fury Lv${level}: strict below-50% threshold grants JSON damage and lifesteal`,()=>{const s=scene(),a=addEnemy(s),entry=equip(s,'wounded-fury',level);s.stats.hp=50;assert.equal(s.passives.modifiers().damageMult,undefined);s.stats.hp=40;s.passives.emit('tick');const data=def('wounded-fury'),damage=10*(1+data.values[level-1]/100);s.damageEnemy(a,10);approx(a.getData('hp'),1000-damage);approx(s.stats.hp,40+damage*data.secondaryValues[level-1]/100);assert.equal(entry.state.hudState.ready,true);});
 test(`survivors-will Lv${level}: JSON speed/duration/ICD and live HUD timer`,()=>{const s=scene(),entry=s.passives.equipped.get('survivors-will');s.passives.setLevel(entry.id,level);s.passives.emit('damageTaken',{amount:10});approx(s.passives.modifiers().speedMult,1+def(entry.id).values[level-1]/100);advance(s,2);approx(s.passives.modifiers().speedMult,1);assert.equal(Math.ceil(entry.state.hudState.remaining),4);s.passives.emit('damageTaken',{amount:10});approx(s.passives.modifiers().speedMult,1);advance(s,4);s.passives.emit('damageTaken',{amount:10});assert.ok(s.passives.modifiers().speedMult>1);});
 test(`jade-bounty Lv${level}: XP only heals per gem with JSON attraction and HUD values`,()=>{const s=scene();s.passives.setLevel('jade-bounty',level);s.stats.hp=40;s.passives.emit('pickup',{kind:'cacao',value:99});assert.equal(s.stats.hp,40);s.passives.emit('pickup',{kind:'xp',value:99});const data=def('jade-bounty');approx(s.stats.hp,40+data.values[level-1]);approx(s.passives.modifiers().pickupRangeMult,1+data.secondaryValues[level-1]/100);const state=s.passives.equipped.get(data.id).state.hudState;assert.equal(state.healPerGem,data.values[level-1]);assert.equal(state.pickupRangePct,data.secondaryValues[level-1]);});
}
test('innate upgrades never consume passive slots and preserve their state and max level',()=>{
 const s=scene();const cards=s.getSkillChoices(false);const card=cards.find(card=>card.innate&&card.choiceType==='upgrade-passive');assert.ok(card);const entry=s.passives.equipped.get(card.id);entry.state.marker=true;s.applyChoice(card);assert.equal(entry.level,2);assert.equal(entry.state.marker,true);assert.equal(s.passiveSlots.length,0);for(let i=0;i<6;i++)s.applyChoice(card);assert.equal(entry.level,5);
});
test('all registered Balam skills cast at all six levels with FX/audio hooks and shared cooldown handling',()=>{
 for(const original of HEROES.balam.skills)for(let level=1;level<=6;level++){
  const s=scene();addEnemy(s,{},60);s.skillSlots=[{...original,level,remaining:0}];s.castSkill(0);advance(s,14);assert.ok(s.skillSlots[0].remaining>0);assert.ok(s.fxCalls.some(call=>call[0]===original.id));assert.ok(s.audioCalls.some(call=>call[0]===original.id&&call[1]==='cast'));assert.ok(Number.isFinite(s.stats.damageDone));
 }
});
test('Balam level 10 offers three owned-hero passives, then consumes its milestone only once',()=>{
 const s=scene();s.stats.level=s.loadoutLevel=10;s.completedSkillMilestones=new Set();let screens=0,done=0;
 s.hud.showUnlock=()=>{};s.hud.showChoice=(_title,cards,choose)=>{screens++;assert.equal(cards.length,3);assert.equal(new Set(cards.map(card=>card.id)).size,3);assert.ok(cards.every(card=>card.owner==='balam'&&card.kind==='passive'));choose(cards[0]);};
 s.showSkillMilestone(10,()=>done++);s.showSkillMilestone(10,()=>done++);assert.equal(screens,1);assert.equal(done,2);assert.equal(s.passiveSlots.length,1);assert.ok(s.passives.equipped.has(s.passiveSlots[0].id));
});
test('replacing a Balam passive removes its old listener and modifiers without removing traits',()=>{
 const s=scene();s.applyChoice({...def('bloodlust'),choiceType:'new-passive'});s.passives.emit('kill');assert.ok(s.passives.modifiers().attackSpeedMult>1);
 assert.equal(s.replaceSkill('passive','bloodlust','stonehide'),true);assert.equal(s.passives.equipped.has('bloodlust'),false);assert.equal(s.passiveSlots[0].id,'stonehide');assert.equal(s.passives.modifiers().attackSpeedMult,undefined);assert.ok(s.passives.equipped.has('survivors-will'));assert.ok(s.passives.equipped.has('jade-bounty'));
});
test('Stone Maw empty trap waits 2.5 armed seconds, and ward recast cannot stack or burst early',()=>{
 const s=scene();cast(s,'stone-maw');const a=addEnemy(s,{},490);advance(s,2.85);assert.equal(a.getData('hp'),1000);advance(s,.05);assert.equal(a.getData('hp'),918);
 const w=scene(),b=addEnemy(w);cast(w,'heart-of-balam');const old=w.balamWard;cast(w,'heart-of-balam');assert.equal(old.fired,true);assert.equal(w.stats.shield,55);assert.equal(b.getData('hp'),1000);advance(w,8);assert.equal(b.getData('hp'),850);
});
test('Balam secondary areas inherit level 3 and range modifiers; level 6 fang count and ward scaling are centralized',()=>{
 const s=scene();s.stats.range=2;const skill={...def('prowlers-leap'),level:3};const ctx=skillContext(s,skill);approx(ctx.radiusScale,2.2);approx(ctx.damage,62*1.5);approx(ctx.durationScale,1.1);
 const fang={...def('bloodless-hunt'),level:6};assert.equal(skillContext(s,fang).projectiles,2);approx(skillContext(s,fang).cooldown,4.5*.9);
});
test('Pyramid Rush sweeps scaled collision radii so narrow grazes hit without oversized collision range',()=>{
 const s=scene();s.settings.autoAim=false;s.player.body.halfWidth=14;
 const graze=addEnemy(s,{},45),outside=addEnemy(s,{},90);graze.y=25;outside.y=40;graze.body.halfWidth=outside.body.halfWidth=14;
 cast(s,'pyramid-rush');advance(s,.5);assert.equal(graze.getData('hp'),908);assert.equal(outside.getData('hp'),1000);
});
test('procedural fallback is deterministic and capped at 24; sound fallback is throttled and stoppable',()=>{
 assert.deepEqual(placeholderStyle('jaguar-roar'),placeholderStyle('jaguar-roar'));assert.notDeepEqual(placeholderStyle('jaguar-roar'),placeholderStyle('fang-path'));
 const s=scene();s.textures={exists:()=>true};const fx=new FxDirector(s),originalWarn=console.warn;console.warn=()=>{};
 try{for(let i=0;i<30;i++)fx.play('unregistered-test','cast');assert.equal(fx.live.length,24);assert.equal(fx.missing.size,1);fx.destroy();assert.equal(fx.live.length,0);
  let sounds=0;const audio=new SkillAudio({sfx(){sounds++;}});audio.play('jaguar-roar');audio.play('jaguar-roar');assert.equal(sounds,1);audio.loop('war-drum');audio.loop('war-drum');assert.equal(sounds,2);audio.stop('war-drum');assert.equal(audio.loops.size,0);audio.destroy();
 }finally{console.warn=originalWarn;}
});
