import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLY_CATALOG } from '../src/data/allyCatalog.js';
import { ALLY_ACTIVE_HANDLERS, ALLY_PASSIVE_HANDLERS } from '../src/skills/allies/index.js';
import { updateSkillEffects } from '../src/skills/common.js';
import { enemyShotAngle, updateEnemy } from '../src/skills/StatusEffects.js';
import { activate, harness } from './helpers/ally-skills-fixture.js';
import { addEnemy, sprite } from './helpers/scene-fixture.js';

const activeByRole=Object.fromEntries(Object.entries(ALLY_CATALOG).map(([role,skills])=>[role,skills.filter(skill=>skill.kind==='active')]));

for(const [role,skills] of Object.entries(activeByRole))for(const definition of skills){
  test(`ally active ${definition.id} casts under its JSON condition and not otherwise`,()=>{
    const enabled=harness(role,[definition.id]);activate(enabled.scene,definition.id);
    assert.equal(enabled.brain.evaluate(),true,`${definition.id} should pass its condition`);
    assert.equal(enabled.scene.allyCasts[definition.id],1);
    assert.ok(enabled.scene.fx.plays.some(([id,stage])=>id===definition.id&&stage==='cast'),`${definition.id} emits cast FX`);
    assert.ok(enabled.scene.skillAudio.plays.some(([id,kind])=>id===definition.id&&kind==='cast'),`${definition.id} plays its cast sound`);

    const disabled=harness(role,[definition.id]);
    if(definition.id==='jade-ward')disabled.scene.stats.shield=disabled.scene.stats.maxHp*.5;
    assert.equal(disabled.brain.evaluate(),false,`${definition.id} must remain idle with no trigger`);
    assert.equal(disabled.scene.allyCasts[definition.id],undefined);
  });
}

test('Saving Grace prevents a lethal hit once, waits 60 seconds, then becomes ready again',()=>{
  const {scene,support}=harness('saintess',['saving-grace']);
  scene.stats.hp=50;
  assert.equal(support.preventFatal(60),0);
  assert.equal(scene.stats.hp,90);
  assert.equal(scene.invulnerable,2);
  scene.elapsed=60;scene.stats.hp=50;
  assert.equal(support.preventFatal(60),60,'a second fatal hit inside the 60-second cooldown is not prevented');
  scene.elapsed=61;
  assert.equal(support.preventFatal(60),0,'the passive is ready after 60 seconds');
});

test('Guardian Link redirects its exact level-one share without allowing the Tank to die',()=>{
  const {scene,support}=harness('tank',['guardian-link']);
  scene.companion.hp=100;
  assert.equal(support.preventFatal(50),40);
  assert.equal(scene.companion.hp,90);
  scene.companion.hp=5;
  assert.equal(support.preventFatal(50),46);
  assert.equal(scene.companion.hp,1);
});

test('Bodyguard aura, Sacred Fervor, and Relentless Pursuit read their JSON values',()=>{
  const tank=harness('tank',['bodyguard']);
  assert.equal(tank.support.modifiers().reduction,.18);
  tank.scene.companion.sprite.setPosition(500,500);assert.equal(tank.support.modifiers().reduction,0);
  const saintess=harness('saintess',['sacred-fervor']);
  assert.equal(saintess.scene.passives.modifiers().damageMult,1.12);
  saintess.scene.passives.setLevel('sacred-fervor',5);assert.equal(saintess.scene.passives.modifiers().damageMult,1.2);
  const assassin=harness('assassin',['relentless-pursuit']);
  assert.equal(assassin.scene.passives.modifiers().allyAttackSpeedMult,1.35);
  assassin.scene.passives.setLevel('relentless-pursuit',5);assert.equal(assassin.scene.passives.modifiers().allyAttackSpeedMult,1.55);
});

test('Radiant Beacon and Sanctuary Dome buffs apply only while the hero is inside their placed zones',()=>{
  const beacon=harness('saintess',['radiant-beacon']);addEnemy(beacon.scene,{},100,0);
  assert.equal(beacon.brain.evaluate(),true);
  assert.equal(beacon.support.modifiers().haste,.2);assert.equal(beacon.support.modifiers().speed,1.1);
  beacon.scene.player.x=151;
  assert.equal(beacon.support.modifiers().haste,0);assert.equal(beacon.support.modifiers().speed,1);

  const dome=harness('saintess',['sanctuary-dome']);
  for(const [x,y] of [[20,0],[40,0],[60,0]])addEnemy(dome.scene,{},x,y);
  assert.equal(dome.brain.evaluate(),true);assert.ok(Math.abs(dome.support.modifiers().reduction-.3)<1e-9);
  dome.scene.player.x=131;assert.equal(dome.support.modifiers().reduction,0);
});

test('Lifebond heals the hero for the JSON share of damage dealt while active',()=>{
  const {scene,support}=harness('saintess',['lifebond']);
  support.effects.lifebond=scene.elapsed+6;scene.stats.hp=20;
  const enemy=addEnemy(scene,{},80,0);
  scene.damageEnemy(enemy,100,0,0,scene.player);
  assert.equal(scene.stats.hp,25);
  scene.elapsed+=7;scene.stats.hp=20;
  scene.damageEnemy(enemy,100,0,0,scene.player);
  assert.equal(scene.stats.hp,20);
});

test('War Cry gives its reduction to the Tank without incorrectly reducing hero damage',()=>{
  const {scene,support,brain}=harness('tank',['war-cry']);
  for(const [x,y] of [[10,0],[40,10],[60,-20]])addEnemy(scene,{},x,y);
  assert.equal(brain.evaluate(),true);
  assert.equal(scene.companion.damageTakenMult,.5);
  assert.equal(support.modifiers().tankDamageTakenMult,.5);
  assert.equal(support.modifiers().reduction,0);
});

test('Bounty Contract scales cacao and grants three bonus cacao for the top-threat kill',()=>{
  const {scene,support}=harness('assassin',['bounty-contract']);
  assert.equal(scene.passives.modifiers().cacaoBonusPct,50);
  for(const level of [1,2,3,4,5]){
    scene.passives.setLevel('bounty-contract',level);
    assert.equal(scene.passives.modifiers().cacaoBonusPct,ALLY_CATALOG.assassin.find(skill=>skill.id==='bounty-contract').values[level-1]);
  }
  const pickups=[];scene.spawnPickup=(...args)=>pickups.push(args);
  const target=addEnemy(scene,{},10,0);
  scene.passives.emit('kill',{enemy:target,byAlly:true,wasTopThreat:true});
  assert.equal(pickups.length,3);assert.ok(pickups.every(([kind])=>kind==='cacao'));
});

test('Vanish drops non-boss aggro and leaves bosses tracking the hero',()=>{
  const {scene,brain}=harness('assassin',['vanish']);
  scene.stats.hp=40;const enemy=addEnemy(scene,{ranged:true},90,0),boss=addEnemy(scene,{isBoss:true,pattern:'dash',patternTimer:4},120,0);
  assert.equal(brain.evaluate(),true);assert.equal(scene.player.hiddenUntil,scene.elapsed+2.5);
  updateEnemy(scene,enemy,.1,()=>0);updateEnemy(scene,boss,.1,()=>0);
  assert.equal(enemy.body.velocity.x,100,'a non-boss wanders instead of tracking the hero');
  assert.notEqual(boss.body.velocity.x,100,'a boss keeps tracking the hero');
});

test('Smoke Bomb blinds ranged enemies so shots are aimed away and applies a 25% slow',()=>{
  const {scene,brain}=harness('assassin',['smoke-bomb']);
  for(const [x,y] of [[20,0],[45,0],[70,0]])addEnemy(scene,{ranged:true},x,y);
  assert.equal(brain.evaluate(),true);updateSkillEffects(scene,.05);
  const enemy=scene.enemies.getChildren()[0];
  assert.ok(enemy.getData('blindUntil')>scene.elapsed);
  assert.equal(enemy.getData('slowPct'),.25);
  const aimedAway=enemyShotAngle(scene,enemy,Math.PI,true,()=>.5);
  assert.ok(Math.cos(aimedAway)>.99,'blind fire travels away from the hero rather than having a chance to hit');
});

test('Bulwark Wall physically intercepts a projectile crossing its placed segment',()=>{
  const {scene,support,brain}=harness('tank',['bulwark-wall']);
  addEnemy(scene,{},0,-180);const shot=sprite(0,-150);scene.enemyProjectiles.add(shot);
  const heading=sprite(0,-100);heading.setVelocity(0,100);scene.enemyProjectiles.add(heading);
  assert.equal(brain.evaluate(),true);
  shot.setPosition(0,-90);
  assert.equal(support.blocksProjectile(shot,{x:0,y:-150}),true);
  assert.equal(shot.active,false);
});
