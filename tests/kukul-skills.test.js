import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HEROES } from '../src/data/heroes.js';
import { KUKUL_DEFINITIONS } from '../src/skills/generated/kukul.js';
import { ACTIVE_HANDLERS, PASSIVE_HANDLERS } from '../src/skills/index.js';
import { skillContext, updateSkillEffects, spawnProjectile } from '../src/skills/common.js';
import { skillModifiers } from '../src/skills/balam/runtime.js';
import { updateDamageOverTime } from '../src/skills/StatusEffects.js';
import { draftSkills } from '../src/systems/SkillDraft.js';
import { skillMessages } from '../src/i18n/skills.js';
import { makeScene, addEnemy, sprite } from './helpers/scene-fixture.js';

const db=JSON.parse(readFileSync(new URL('../docs/skills-redesign/skills_redesign.json',import.meta.url)));
const def=id=>KUKUL_DEFINITIONS.find(skill=>skill.id===id);
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function scene(){const s=makeScene(HEROES.kukul);s.hud.setSkills=()=>{};s.passiveSlots=[];s.loadoutLevel=20;s.fxCalls=[];s.audioCalls=[];s.fx={play:(...args)=>{s.fxCalls.push(args);return sprite();}};s.skillAudio={play:(...args)=>s.audioCalls.push(args),loop(){},stop(){}};return s;}
function cast(s,id,level=1){const skill={...def(id),level,remaining:0};s.skillSlots=[skill];s.castSkill(0);return skill;}
function advance(s,seconds){let left=seconds;while(left>1e-9){const dt=Math.min(.05,left);s.elapsed+=dt;s.passives.emit('tick',{dt});updateSkillEffects(s,dt);left-=dt;}}
function equip(s,id,level=1){return s.passives.equip(def(id),level);}
function random(value,fn){const old=Math.random;Math.random=()=>value;try{return fn();}finally{Math.random=old;}}

test('Kukul pool is exactly 16 active + 8 passive + 2 innate; definitions/i18n/paths match JSON',()=>{
 assert.equal(HEROES.kukul.skills.length,16);assert.equal(HEROES.kukul.passives.length,8);
 assert.equal(KUKUL_DEFINITIONS.length,24);
 for(const source of db.heroes.kukul){
  const skill=def(source.id);assert.equal(skill.owner,'kukul');assert.equal(skill.name,source.name);assert.equal(skill.description,source.desc);assert.equal(skill.iconFile,source.icon_file);
  assert.deepEqual(skillMessages.findLast(row=>row[0]===source.name),[source.name,source.fr,source.ar]);assert.deepEqual(skillMessages.findLast(row=>row[0]===source.desc),[source.desc,source.desc,source.desc]);
  if(skill.kind==='active'){assert.equal(skill.cooldown,source.cd);assert.equal(skill.mana,source.mana);assert.equal(typeof ACTIVE_HANDLERS[skill.id],'function');}
  else {assert.equal(skill.values.length,5);const text=source.id==='trophy-hunter'?source.vals.split(';')[1]:source.vals;assert.deepEqual(skill.values,text.match(/\d+(?:\.\d+)?/g).map(Number).slice(0,5));assert.ok(PASSIVE_HANDLERS[skill.id]);}
 }
 assert.equal(scene().passives.equipped.size,2);
 const removed=['quetzal-orbit','sky-spear','tailwind','piercing-reed','camouflage','serpent-fang'];
 assert.ok(removed.every(id=>!KUKUL_DEFINITIONS.some(skill=>skill.id===id)&&!ACTIVE_HANDLERS[id]));
 for(let i=0;i<50;i++){const cards=draftSkills({activeSkills:HEROES.kukul.skills,passiveSkills:HEROES.kukul.passives,guaranteePassive:i%2===0});assert.ok(cards.every(card=>card.owner==='kukul'));}
});
test('atlatl-volley launches five 20-damage darts in a .13-radian fan with pierce two and range 560',()=>{
 const s=scene();addEnemy(s);cast(s,'atlatl-volley');const shots=s.projectiles.getChildren();assert.equal(shots.length,5);
 shots.forEach((shot,i)=>{assert.equal(shot.getData('damage'),20);assert.equal(shot.getData('pierce'),2);approx(Math.atan2(shot.body.velocity.y,shot.body.velocity.x),(i-2)*.13);approx(shot.getData('life')*shot.body.speed,560);});
});
test('featherstorm travels forward at 160 and ticks 14 every .4s only within radius 70',()=>{
 const s=scene(),a=addEnemy(s,{},64),off=addEnemy(s,{},64);off.y=71;cast(s,'featherstorm');advance(s,.35);assert.equal(a.getData('hp'),1000);advance(s,.05);assert.equal(a.getData('hp'),986);assert.equal(off.getData('hp'),1000);advance(s,3.6);assert.equal(s.skillEffects.length,0);
});
test('serpent-path follows a full sine wave of amplitude 60, speed 600, pierce 12 and range 560',()=>{
 const s=scene();addEnemy(s);cast(s,'serpent-path');const shot=s.projectiles.getChildren()[0];s.updateProjectiles(560/600/4);approx(shot.x,140);approx(shot.y,60);assert.equal(shot.getData('damage'),64);assert.equal(shot.getData('pierce'),12);s.updateProjectiles(560/600/4);approx(shot.x,280);approx(shot.y,0);
});
test('windstep moves 250, hits passed enemies once, creates a two-second 8/.3 trail and 30% sprint',()=>{
 const s=scene(),a=addEnemy(s,{},100);cast(s,'windstep');advance(s,.24);approx(s.player.x,250);assert.equal(a.getData('hp'),974);approx(skillModifiers(s).speedMult,1.3);assert.ok(s.skillEffects.some(effect=>effect.remaining===2));advance(s,.3);assert.equal(a.getData('hp'),966);advance(s,2);approx(skillModifiers(s).speedMult,1);
});
test('quetzal-flip retreats 260 from nearest foe, is invulnerable, then fires three aimed 24-damage darts',()=>{
 const s=scene(),a=addEnemy(s,{},100);cast(s,'quetzal-flip');s.damagePlayer(50,a.x,a.y,a,true);assert.equal(s.stats.hp,100);assert.equal(s.projectiles.countActive(),0);advance(s,.24);approx(s.player.x,-260);assert.equal(s.projectiles.countActive(),3);for(const shot of s.projectiles.getChildren()){assert.equal(shot.getData('damage'),24);approx(shot.body.velocity.y,0);assert.ok(shot.body.velocity.x>0);}
});
test('hunter-snare deals 62 in a target-area radius 120 and roots without suppressing attacks',()=>{
 const s=scene(),a=addEnemy(s,{},100),b=addEnemy(s,{},219),off=addEnemy(s,{},221);cast(s,'hunter-snare');assert.equal(a.getData('hp'),938);assert.equal(b.getData('hp'),938);assert.equal(off.getData('hp'),1000);assert.equal(a.getData('rootUntil'),3);s.touchEnemy(a);assert.equal(s.stats.hp,80);
});
test('eagle-eye waits .6s, fires a guaranteed crit with pierce 3 and range 760, and moving cancels cooldown',()=>{
 const s=scene(),a=addEnemy(s);cast(s,'eagle-eye');advance(s,.55);assert.equal(s.projectiles.countActive(),0);advance(s,.05);const shot=s.projectiles.getChildren()[0];assert.equal(shot.getData('pierce'),3);approx(shot.getData('life')*shot.body.speed,760);s.onProjectileHit(shot,a);assert.equal(a.getData('hp'),884);
 const moving=scene();addEnemy(moving);const skill=cast(moving,'eagle-eye');moving.keys.right={isDown:true};moving.updateMovement(.05);advance(moving,.7);assert.equal(moving.projectiles.countActive(),0);assert.equal(skill.remaining,0);assert.equal(moving.eagleFocus,null);
});
test('sun-dart makes five distinct hits with compound +10% damage and 280 range from each last target',()=>{
 const s=scene(),enemies=Array.from({length:5},(_,i)=>addEnemy(s,{},100+270*i));cast(s,'sun-dart');enemies.forEach((enemy,i)=>approx(enemy.getData('hp'),1000-43*1.1**i));
});
test('storm-nest stays at its cast point and attacks at most three distinct targets every .8s',()=>{
 const s=scene();[100,200,300,400].forEach(x=>addEnemy(s,{},x));cast(s,'storm-nest');s.player.x=1000;advance(s,.8);const shots=s.projectiles.getChildren();assert.equal(shots.length,3);shots.forEach(shot=>{assert.equal(shot.x,0);assert.equal(shot.getData('damage'),12);});assert.equal(s.fxCalls.filter(call=>call[1]==='travel').length,3);
 const one=scene();addEnemy(one);cast(one,'storm-nest');advance(one,.8);assert.equal(one.projectiles.countActive(),1);
});
test('plume-guard blocks three distinct damage instances, expires at eight seconds, and does not stack on recast',()=>{
 const s=scene();cast(s,'plume-guard');assert.equal(s.stats.dodgeCharges,3);for(let i=0;i<3;i++){s.invulnerable=0;s.damagePlayer(20,10,0);}assert.equal(s.stats.hp,100);assert.equal(s.stats.dodgeCharges,0);s.invulnerable=0;s.damagePlayer(20,10,0);assert.equal(s.stats.hp,80);
 const expires=scene();cast(expires,'plume-guard');cast(expires,'plume-guard');assert.equal(expires.stats.dodgeCharges,3);advance(expires,8);assert.equal(expires.stats.dodgeCharges,0);
});
test('cacao-bomb lobs .7 seconds, clamps target to 400 and blasts radius 150 for 73 with knockback 200',()=>{
 const s=scene(),a=addEnemy(s,{},500),off=addEnemy(s,{},551);cast(s,'cacao-bomb');advance(s,.65);assert.equal(a.getData('hp'),1000);advance(s,.05);assert.equal(a.getData('hp'),927);assert.equal(off.getData('hp'),1000);approx(a.body.velocity.x,200);
});
test('forked-flight deals no parent hit, splits after .4s into three homing shots with distinct targets',()=>{
 const s=scene(),enemies=[200,300,400].map(x=>addEnemy(s,{},x));cast(s,'forked-flight');const parent=s.projectiles.getChildren()[0];s.onProjectileHit(parent,enemies[0]);assert.equal(enemies[0].getData('hp'),1000);advance(s,.35);assert.equal(s.projectiles.countActive(),1);advance(s,.05);assert.equal(parent.active,false);const children=s.projectiles.getChildren().filter(shot=>shot.active);assert.equal(children.length,3);assert.equal(new Set(children.map(shot=>shot.getData('homingTarget'))).size,3);children.forEach(shot=>assert.equal(shot.getData('damage'),30));
});
test('gale-ring expands to radius 250, hits once for 46, knocks back 330 and grants a 25% three-second sprint',()=>{
 const s=scene(),a=addEnemy(s,{},240),off=addEnemy(s,{},251);cast(s,'gale-ring');advance(s,.4);assert.equal(a.getData('hp'),954);assert.equal(off.getData('hp'),1000);approx(a.body.velocity.x,330);approx(skillModifiers(s).speedMult,1.25);advance(s,2.6);approx(skillModifiers(s).speedMult,1);
});
test('hunters-trance grants 30% attack speed, 20% crit and limited hero-only steering for six seconds',()=>{
 const s=scene(),a=addEnemy(s);cast(s,'hunters-trance');approx(skillModifiers(s).attackSpeedMult,1.3);approx(skillModifiers(s).crit,.2);s.autoAttack();const shot=s.projectiles.getChildren()[0];assert.equal(shot.getData('homingTarget'),a);approx(shot.getData('homingTurn'),Math.PI/2);random(.19,()=>s.onProjectileHit(shot,a));assert.equal(a.getData('hp'),960);advance(s,6);approx(skillModifiers(s).attackSpeedMult,1);assert.equal(skillModifiers(s).crit,undefined);
});
test('skyfall telegraphs for .6 then lands twelve 40-damage impacts over 1.5s in radius 50',()=>{
 const s=scene(),a=addEnemy(s);random(0,()=>cast(s,'skyfall'));advance(s,.6);assert.equal(a.getData('hp'),1000);advance(s,1.5);assert.equal(a.getData('hp'),520);assert.equal(s.fxCalls.filter(call=>call[1]==='impact').length,12);
});
test('kukulkans-breath hits a 520x60 beam ten times at .15s for 16, with 50% movement speed',()=>{
 const s=scene(),a=addEnemy(s,{},500),off=addEnemy(s,{},500);off.y=31;cast(s,'kukulkans-breath');approx(skillModifiers(s).speedMult,.5);advance(s,1.5);assert.equal(a.getData('hp'),840);assert.equal(off.getData('hp'),1000);approx(skillModifiers(s).speedMult,1);
});

for(let level=1;level<=5;level++){
 test(`sharpened-flint Lv${level}: JSON pierce applies to basic/skill shots but not ally shots`,()=>{const s=scene();addEnemy(s);equip(s,'sharpened-flint',level);s.autoAttack();assert.equal(s.projectiles.getChildren()[0].getData('pierce'),4+def('sharpened-flint').values[level-1]);cast(s,'atlatl-volley');assert.equal(s.projectiles.getChildren()[1].getData('pierce'),2+def('sharpened-flint').values[level-1]);const ally=sprite(0,0,{byAlly:true}),shot=spawnProjectile(s,{origin:ally,byAlly:true,damage:1});assert.equal(shot.getData('pierce'),1);});
 test(`venomous-darts Lv${level}: only basic hits create at most three independently expiring poison stacks`,()=>{const s=scene(),a=addEnemy(s);equip(s,'venomous-darts',level);s.passives.emit('hit',{enemy:a,basicAttack:false});assert.deepEqual(a.getData('basicPoisonStacks'),[]);for(let i=0;i<4;i++)s.passives.emit('hit',{enemy:a,basicAttack:true});assert.equal(a.getData('basicPoisonStacks').length,3);s.elapsed+=1;updateDamageOverTime(s,a,1);assert.equal(a.getData('hp'),1000-3*def('venomous-darts').values[level-1]);s.elapsed+=3;updateDamageOverTime(s,a,3);assert.deepEqual(a.getData('basicPoisonStacks'),[]);});
 test(`full-quiver Lv${level}: the sixth basic attack replaces one dart with JSON count and shows counter`,()=>{const s=scene();addEnemy(s);const entry=equip(s,'full-quiver',level);for(let i=0;i<5;i++)s.autoAttack();assert.equal(entry.state.hudState.value,5);s.autoAttack();assert.equal(s.projectiles.countActive(),5+def('full-quiver').values[level-1]);assert.equal(entry.state.hudState.value,0);});
 test(`hunters-focus Lv${level}: consecutive hero hits cap at five and switching/reused targets resets damage`,()=>{const s=scene(),a=addEnemy(s),b=addEnemy(s,{},200),entry=equip(s,'hunters-focus',level),pct=def('hunters-focus').values[level-1]/100;for(let i=1;i<=6;i++)s.damageEnemy(a,10);approx(a.getData('hp'),1000-60-10*pct*20);assert.equal(entry.state.hudState.value,5);s.damageEnemy(b,10);approx(b.getData('hp'),1000-10*(1+pct));assert.equal(entry.state.hudState.value,1);b.setData('serial',100);s.damageEnemy(b,10);assert.equal(entry.state.hudState.value,1);s.damageEnemy(a,10,0,0,s.player,{dot:true});assert.equal(entry.state.hudState.value,1);});
 test(`fleet-hunter Lv${level}: dash/Windstep/Flip primes only next basic attack for three seconds`,()=>{for(const source of ['dash','windstep','quetzal-flip']){const s=scene();addEnemy(s);const entry=equip(s,'fleet-hunter',level);if(source==='dash')s.tryDash();else cast(s,source);s.autoAttack();const shots=s.projectiles.getChildren().filter(shot=>shot.getData('basicAttack'));approx(shots[0].getData('damage'),20*(1+def('fleet-hunter').values[level-1]/100));assert.equal(entry.state.hudState.remaining,0);s.autoAttack();assert.equal(s.projectiles.getChildren().filter(shot=>shot.getData('basicAttack'))[1].getData('damage'),20);}const s=scene();addEnemy(s);equip(s,'fleet-hunter',level);s.tryDash();advance(s,3);s.autoAttack();assert.equal(s.projectiles.getChildren()[0].getData('damage'),20);});
 test(`jungle-instinct Lv${level}: JSON probability avoids a hit before shields, HP loss and damageTaken`,()=>{const s=scene();equip(s,'jungle-instinct',level);s.stats.shield=50;let events=0;s.passives.bus.on('damageTaken',()=>events++);random(def('jungle-instinct').values[level-1]/100-.001,()=>s.damagePlayer(20,100,0));assert.equal(s.stats.hp,100);assert.equal(s.stats.shield,50);assert.equal(events,0);s.invulnerable=0;s.stats.shield=0;random(def('jungle-instinct').values[level-1]/100,()=>s.damagePlayer(20,100,0));assert.equal(s.stats.hp,80);assert.equal(events,1);});
 test(`trophy-hunter Lv${level}: only jaguar/priest/boss kills heal 20% and grant JSON damage for 20s`,()=>{for(const data of [{type:'jaguar'},{type:'priest'},{type:'shade',isBoss:true}]){const s=scene(),entry=equip(s,'trophy-hunter',level);s.stats.hp=50;s.passives.emit('kill',{enemy:addEnemy(s,data)});assert.equal(s.stats.hp,70);approx(s.passives.modifiers().damageMult,1+def('trophy-hunter').values[level-1]/100);assert.equal(entry.state.hudState.duration,20);advance(s,20);approx(s.passives.modifiers().damageMult,1);}const s=scene();equip(s,'trophy-hunter',level);s.stats.hp=50;s.passives.emit('kill',{enemy:addEnemy(s,{type:'serpent',hp:100000,damage:500})});assert.equal(s.stats.hp,50);});
 test(`steady-aim Lv${level}: after exactly one stationary second JSON crit disappears immediately on movement`,()=>{const s=scene();addEnemy(s);const entry=equip(s,'steady-aim',level);advance(s,.95);assert.equal(s.passives.modifiers().crit,0);advance(s,.05);approx(s.passives.modifiers().crit,def('steady-aim').values[level-1]/100);assert.equal(entry.state.hudState.ready,true);s.keys.right={isDown:true};assert.equal(s.passives.modifiers().crit,0);s.updateMovement(.05);s.passives.emit('tick',{dt:.05});assert.equal(entry.state.hudState.ready,false);});
}
test('unknown or removed IDs cannot cast, spend mana or start cooldown; castSkill has no type fallback',()=>{
 const s=scene();s.skillSlots=[{id:'sky-spear',type:'projectile',mana:10,cooldown:5,remaining:0,level:1}];const old=console.warn;console.warn=()=>{};try{s.castSkill(0);}finally{console.warn=old;}assert.equal(s.stats.mana,110);assert.equal(s.projectiles.countActive(),0);assert.equal(s.skillSlots[0].remaining,0);
 const source=readFileSync(new URL('../src/scenes/GameScene.js',import.meta.url),'utf8');assert.doesNotMatch(source,/switch\s*\(skill\.type\)/);assert.doesNotMatch(source,/LEGACY FALLBACK/);
});
test('Kukul casts all 16 skills at levels 1-6 with shared resources, cooldowns, FX and audio',()=>{
 for(const original of HEROES.kukul.skills)for(let level=1;level<=6;level++){const s=scene();addEnemy(s);const skill=cast(s,original.id,level);advance(s,14);assert.ok(skill.remaining>0);assert.ok(s.fxCalls.some(call=>call[0]===original.id));assert.ok(s.audioCalls.some(call=>call[0]===original.id&&call[1]==='cast'));assert.ok(Number.isFinite(s.stats.damageDone));}
});
test('effects created during another effect update remain scheduled and freeze during choices',()=>{const s=scene();addEnemy(s);cast(s,'windstep');advance(s,.24);const trail=s.skillEffects.find(effect=>effect.remaining===2);assert.ok(trail);s.pausedForChoice=true;updateSkillEffects(s,1);assert.equal(trail.remaining,2);});
