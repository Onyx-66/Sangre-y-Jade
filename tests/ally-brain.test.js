import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLY_CATALOG, ALLY_RULES } from '../src/data/allyCatalog.js';
import { allyLevelEvent } from '../src/data/supports.js';
import { SupportSystem } from '../src/systems/SupportSystem.js';
import { ALLY_ACTIVE_HANDLERS } from '../src/skills/allies/index.js';
import { addEnemy, makeScene } from './helpers/scene-fixture.js';

function attachBrain(role, skillIds) {
  const scene=makeScene();scene.elapsed=0;scene.pausedForChoice=false;scene.ended=false;
  scene.hud={setAlly(){},toast(){}};scene.skillAudio={play(){}};
  const support=new SupportSystem(scene);
  scene.support=support;
  support.summon(role,5);
  scene.companion.skills=[];
  for(const id of skillIds){
    const definition=ALLY_CATALOG[role].find(skill=>skill.id===id);
    assert.ok(definition,`missing ${id} in ${role} catalog`);
    assert.ok(support.equip(definition),`failed to equip ${id}`);
  }
  return {scene,support,brain:support.brain,calls:scene.allyCasts};
}

test('level-five companion cards show role, signature and two passives; chosen ally arrives with signature only',()=>{
  const scene=makeScene();scene.loadoutLevel=ALLY_RULES.join_level;
  const screens=[],toasts=[];scene.hud={setAlly(){},toast(text){toasts.push(text);},showChoice(title,cards,choose){screens.push({title,cards,choose});}};
  const support=new SupportSystem(scene);scene.support=support;let finished=false;
  support.chooseClass(()=>{finished=true;});
  assert.equal(screens.length,1);assert.equal(screens[0].title,'Choose Your Companion');
  assert.equal(screens[0].cards.length,3);
  assert.ok(screens[0].cards.every(card=>card.kind==='ally'&&card.role&&card.signature&&card.passives.length===2));
  screens[0].choose(screens[0].cards.find(card=>card.id==='tank'));
  assert.equal(finished,true);
  assert.deepEqual(scene.companion.skills.map(skill=>skill.id),[ALLY_RULES.signatures.tank]);
  assert.equal(scene.companion.skills[0].skillKind,'active');
  const signature=scene.companion.skills[0];
  support.syncLevel(10);assert.equal(scene.companion.rank,2);assert.equal(signature.cooldown,signature.baseCooldown*.96);
  assert.ok(toasts.includes('Companion rank 2'));
  support.syncLevel(25);assert.equal(scene.companion.rank,5);assert.equal(support.numberMultiplier(),1.6);
  assert.equal(signature.cooldown,signature.baseCooldown*.84);
  assert.equal(toasts.at(-1),'Companion rank 5');
});

test('ally passive scaling values are generated from the authoritative JSON',()=>{
  assert.deepEqual(ALLY_CATALOG.saintess.find(skill=>skill.id==='sacred-fervor').values,[12,14,16,18,20]);
  assert.deepEqual(ALLY_CATALOG.tank.find(skill=>skill.id==='bodyguard').values,[18,20,22,24,26]);
  assert.deepEqual(ALLY_CATALOG.assassin.find(skill=>skill.id==='relentless-pursuit').values,[35,40,45,50,55]);
});

test('only hero levels 8 and 14 create companion picks, and picks never replace or exceed three slots',()=>{
  assert.deepEqual(Array.from({length:17},(_,i)=>[i+1,allyLevelEvent(i+1,i+1>=5)]).filter(([,event])=>event),[[8,'pick'],[14,'pick']]);
  const scene=makeScene();scene.loadoutLevel=5;
  const screens=[];scene.hud={setAlly(){},toast(){},showChoice(title,cards,choose){screens.push({title,cards,choose});}};
  const support=new SupportSystem(scene);scene.support=support;support.summon('saintess',5);
  for(const level of ALLY_RULES.pick_levels){
    scene.loadoutLevel=level;let done=false;support.chooseSkill(()=>{done=true;});
    const pick=screens.at(-1);assert.equal(pick.title,'Companion Pick');assert.equal(pick.cards.length,3);
    assert.equal(new Set(pick.cards.map(card=>card.id)).size,3);
    assert.ok(pick.cards.every(card=>card.kind==='ally'&&['active','passive'].includes(card.skillKind)));
    pick.choose(pick.cards[0]);assert.equal(done,true);
  }
  assert.equal(scene.companion.skills.length,3);
  const fourth=ALLY_CATALOG.saintess.find(skill=>!scene.companion.skills.some(owned=>owned.id===skill.id));
  assert.equal(support.equip(fourth),false);
  assert.equal(scene.companion.skills.length,3);
});

test('ally brain checks available skills in priority order and enforces the 0.8 second global gap',()=>{
  const {scene,brain,calls}=attachBrain('saintess',['healing-circle','jade-ward']);
  const [emergency,opportunistic]=scene.companion.skills;
  emergency.auto='always';emergency.priority=1;emergency.cooldown=12;
  opportunistic.auto='always';opportunistic.priority=3;opportunistic.cooldown=10;
  scene.stats.hp=80;
  brain.evaluate();assert.equal(calls['healing-circle'],1);
  assert.equal(Object.keys(calls).length,1);
  emergency.remaining=12;
  for(const elapsed of [.2,.4,.6]){scene.elapsed=elapsed;brain.evaluate();}
  assert.equal(Object.keys(calls).length,1,'the second skill must wait until the ally-wide gap expires');
  scene.elapsed=.8;brain.evaluate();assert.equal(calls['jade-ward'],1);
  assert.deepEqual({...scene.allyCasts},{'healing-circle':1,'jade-ward':1},'the per-run debug counter records casts by skill id');
});

test('heals, shields and active zones obey no-waste checks',()=>{
  const {scene,support}=attachBrain('saintess',['healing-circle','jade-ward']);
  const [heal,shield]=scene.companion.skills;
  assert.equal(ALLY_ACTIVE_HANDLERS[heal.id].canCast(scene,support,heal),false,'the Saintess should not heal a full-health hero');
  scene.stats.hp=84;assert.equal(ALLY_ACTIVE_HANDLERS[heal.id].canCast(scene,support,heal),true,'healing is permitted under the JSON HP threshold');
  scene.stats.shield=scene.stats.maxHp*.5;assert.equal(ALLY_ACTIVE_HANDLERS[shield.id].canCast(scene,support,shield),false,'do not overfill the Jade Ward shield cap');
  scene.stats.shield=0;support.effects[shield.id]=scene.elapsed+3;
  assert.equal(ALLY_ACTIVE_HANDLERS[shield.id].canCast(scene,support,shield),false,'do not recast while the same buff is active');
});

test('failsafe casts an eligible ready skill after eight seconds but not a reactive-only skill',()=>{
  const tank=attachBrain('tank',['war-cry']);addEnemy(tank.scene,{},80,0);
  tank.brain.evaluate();tank.scene.elapsed=ALLY_RULES.failsafe_seconds;tank.brain.evaluate();
  assert.equal(tank.calls['war-cry'],1);
  const assassin=attachBrain('assassin',['silencing-dart']);addEnemy(assassin.scene,{},80,0);
  assassin.brain.evaluate();assassin.scene.elapsed=ALLY_RULES.failsafe_seconds;assassin.brain.evaluate();
  assert.equal(Object.keys(assassin.calls).length,0);
});

test('failsafe bypasses multi-enemy triggers only when Ground Slam or Smoke Bomb can still hit a target',()=>{
  const tank=attachBrain('tank',['ground-slam']);
  addEnemy(tank.scene,{},tank.scene.companion.sprite.x+30,tank.scene.companion.sprite.y);
  tank.brain.evaluate();tank.scene.elapsed=ALLY_RULES.failsafe_seconds+1;tank.brain.evaluate();
  assert.equal(tank.calls['ground-slam'],1);

  const assassin=attachBrain('assassin',['smoke-bomb']);addEnemy(assassin.scene,{},20,0);
  assassin.brain.evaluate();assassin.scene.elapsed=ALLY_RULES.failsafe_seconds+1;assassin.brain.evaluate();
  assert.equal(assassin.calls['smoke-bomb'],1);
  const idle=attachBrain('assassin',['smoke-bomb']);addEnemy(idle.scene,{},260,0);
  idle.brain.evaluate();idle.scene.elapsed=ALLY_RULES.failsafe_seconds+1;idle.brain.evaluate();
  assert.equal(idle.calls['smoke-bomb'],undefined,'failsafe does not cast an empty out-of-radius effect');
});

test('ally brain does not cast during a choice or after the run ends, and never treats passives as casts',()=>{
  const {scene,brain,calls}=attachBrain('saintess',['jade-ward','sacred-fervor']);
  scene.companion.skills[0].auto='always';
  scene.pausedForChoice=true;assert.equal(brain.evaluate(),false);
  scene.pausedForChoice=false;scene.ended=true;assert.equal(brain.evaluate(),false);
  scene.ended=false;scene.companion.skills=scene.companion.skills.slice(1);
  assert.equal(brain.evaluate(),false);assert.equal(Object.keys(calls).length,0);
});
