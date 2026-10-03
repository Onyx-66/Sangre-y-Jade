import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { GEAR } from '../src/data/world.js';
import { ALLY_CATALOG } from '../src/data/allyCatalog.js';
import { makeScene, addEnemy } from './helpers/scene-fixture.js';
import { harness } from './helpers/ally-skills-fixture.js';
import { updateSkillEffects } from '../src/skills/common.js';
import { SaveSystem, SAVE_KEY } from '../src/systems/SaveSystem.js';
import fs from 'node:fs/promises';

function choiceScene() {
  const scene = makeScene(HEROES.balam);
  scene.stats.level = scene.loadoutLevel = 25;
  scene.passiveSlots = [];
  scene.pendingLevelUps = 0;
  scene.pendingBossRewards = [];
  scene.gear = [...GEAR];
  scene.physics = { pause() {}, resume() {} };
  scene.tweens = { pauseAll() {}, resumeAll() {} };
  scene.releaseAttack = () => {};
  scene.audio.music = () => {};
  scene.hud.setSkills = () => {};
  const screens = [];
  scene.hud.showChoice = (...args) => screens.push(args);
  return { scene, screens };
}

test('maxed boss reward cannot trap the run in an empty choice screen', () => {
  const { scene, screens } = choiceScene();
  scene.skillSlots = HEROES.balam.skills.slice(0, 4).map(skill => ({ ...skill, level: 6 }));
  scene.passiveSlots = HEROES.balam.passives.slice(0, 2).map(skill => ({ ...skill, level: 5 }));
  for (const id of ['survivors-will', 'jade-bounty']) scene.passives.setLevel(id, 5);
  const random = Math.random;
  try {
    Math.random = () => .99; // Deliberately exercise the no-swap branch.
    assert.deepEqual(scene.getSkillChoices(true), []);
    scene.grantBossReward('review-boss');
    assert.equal(screens.length, 0);
    assert.equal(scene.pausedForChoice, false);
    assert.equal(scene.time.paused, false);
  } finally { Math.random = random; }
});

test('Healing Circle heals only inside its cast-position radius, including re-entry', () => {
  const { scene, brain } = harness('saintess', ['healing-circle']);
  scene.stats.hp = 20;
  assert.equal(brain.evaluate(), true);
  const skill = scene.companion.skills[0];
  updateSkillEffects(scene, 1);
  assert.equal(scene.stats.hp, 20 + skill.params.healingPerSecond);
  scene.player.x = skill.params.radius + 1;
  updateSkillEffects(scene, 1);
  assert.equal(scene.stats.hp, 28, 'leaving the visible circle must stop healing');
  scene.player.x = skill.params.radius;
  updateSkillEffects(scene, 1);
  assert.equal(scene.stats.hp, 36, 'the boundary is inside the circle');
});

test('Guardian Link keeps its full JSON share at every rank even when Tank HP is 1', () => {
  const { scene, support } = harness('tank', ['guardian-link']);
  const definition = ALLY_CATALOG.tank.find(skill => skill.id === 'guardian-link');
  for (let rank = 1; rank <= 5; rank++) {
    scene.passives.setLevel(definition.id, rank);
    scene.companion.hp = 1;
    assert.equal(support.preventFatal(50), 50 * (1 - definition.values[rank - 1] / 100));
    assert.equal(scene.companion.hp, 1);
  }
  scene.companion.sprite.setPosition(301, 0);
  assert.equal(support.preventFatal(50), 50, 'out-of-range Tank cannot redirect');
});

test('Jade Ward respects rank-reduced cooldown, without a second unscaled timer', () => {
  const { scene, support, brain } = harness('saintess', ['jade-ward']);
  support.syncLevel(25);
  assert.equal(brain.evaluate(), true);
  const skill = scene.companion.skills[0];
  assert.equal(skill.cooldown, 8.4);
  scene.stats.shield = 0;
  scene.elapsed += skill.cooldown;
  skill.remaining = 0;
  assert.equal(brain.evaluate(), true);
  assert.equal(scene.allyCasts[skill.id], 2);
});

test('Smoke Bomb blinds enemies inside the placed cloud, not enemies following the hero elsewhere', () => {
  const { scene, brain } = harness('assassin', ['smoke-bomb']);
  const inside = [30, 60, 90].map(x => addEnemy(scene, { ranged: true }, x, 0));
  assert.equal(brain.evaluate(), true);
  scene.player.x = 500;
  const outside = addEnemy(scene, { ranged: true }, 510, 0);
  updateSkillEffects(scene, .05);
  assert.ok(inside.every(enemy => enemy.getData('blindUntil') > scene.elapsed));
  assert.ok(outside.getData('blindUntil') <= scene.elapsed);
  assert.ok(inside.every(enemy => enemy.getData('slowPct') === .25));
});

test('ended runs reject pending new, upgrade, stat and replacement callbacks', () => {
  const { scene, screens } = choiceScene();
  const first = { ...HEROES.balam.skills[0], level: 1, remaining: 0 };
  scene.skillSlots = [first];
  let completed = 0;
  const replacement = { ...HEROES.balam.skills[1], kind: 'active', choiceType: 'swap' };
  scene.applyChoice(replacement, () => completed++);
  assert.equal(screens.length, 1);
  scene.ended = true;
  screens[0][2](first, 0);
  scene.applyChoice({ ...replacement, choiceType: 'new-active' }, () => completed++);
  scene.applyChoice({ ...first, choiceType: 'upgrade-active' }, () => completed++);
  scene.applyChoice({ kind: 'stat', stat: 'damage', amount: 99 }, () => completed++);
  assert.deepEqual(scene.skillSlots, [first]);
  assert.equal(first.level, 1);
  assert.equal(scene.stats.damage, 1);
  assert.equal(completed, 0);
});

test('pending companion recruitment and skill callbacks cannot change an ended run', () => {
  const { scene, support } = harness('tank', ['war-cry']);
  let choose, completed = 0;
  scene.hud.showChoice = (_title, _cards, callback) => { choose = callback; };
  support.chooseSkill(() => completed++);
  scene.ended = true;
  choose(ALLY_CATALOG.tank.find(skill => skill.id === 'guardian-link'));
  assert.deepEqual(scene.companion.skills.map(skill => skill.id), ['war-cry']);
  assert.equal(completed, 0);
  scene.companion = null;
  support.chooseClass(() => completed++);
  choose({ id: 'saintess' });
  assert.equal(scene.companion, null);
  assert.equal(completed, 0);
});

test('post-run damage and projectile collision callbacks cannot grant late kills', () => {
  const scene = makeScene(HEROES.kukul);
  const enemy = addEnemy(scene, { hp: 100 });
  const shot = scene.fireProjectile(0, 0, 0, 100, 620);
  scene.ended = true;
  scene.onProjectileHit(shot, enemy);
  scene.damageEnemy(enemy, 100);
  assert.equal(enemy.getData('hp'), 100);
  assert.equal(scene.stats.kills, 0);
  assert.equal(scene.stats.damageDone, 0);
});

test('v0.5 save remains compatible and run skill IDs are not persisted', () => {
  const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const stored = { version: 1, cacao: 127, totalRuns: 3, selectedSkin: 'classic',
    settings: { language: 'ar', attackMode: 'manual', master: .4 }, upgrades: { damage: 2 },
    records: { 'balam:overgrown:quick': { survived: 70, kills: 18, victory: false } } };
  let committed;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => { assert.equal(key, SAVE_KEY); return JSON.stringify(stored); },
    setItem: (_key, value) => { committed = JSON.parse(value); },
  } });
  try {
    const save = new SaveSystem();
    assert.equal(save.data.cacao, 127);
    assert.equal(save.data.settings.language, 'ar');
    assert.equal(save.data.settings.attackMode, 'manual');
    assert.equal(save.data.upgrades.damage, 2);
    assert.equal(save.data.upgrades.speed, 0);
    save.recordRun({ heroId: 'kukul', mapId: 'overgrown', modeId: 'quick', survived: 50,
      kills: 2, cacao: 4, skills: [{ id: 'windstep' }], passiveSlots: ['steady-aim'] });
    assert.equal(committed.totalRuns, 4);
    assert.equal(committed.cacao, 131);
    assert.ok(!JSON.stringify(committed).includes('windstep'));
    assert.ok(!JSON.stringify(committed).includes('steady-aim'));
  } finally {
    if (priorStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', priorStorage);
  }
});

test('Balam, Kukul and ally generated definitions reproduce exactly from JSON without writing files', async () => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const generator of ['generate-balam-skills', 'generate-kukul-skills', 'generate-ally-catalog']) {
    const source = await fs.readFile(`scripts/${generator}.mjs`, 'utf8');
    const outputs = new Map();
    const virtualFs = { readFile: fs.readFile, mkdir: async () => {},
      writeFile: async (file, data) => { outputs.set(file, data); } };
    const code = source.replace(/^import fs from 'node:fs\/promises';\r?\n/, '');
    assert.notEqual(code, source, 'the test must intercept the generator filesystem import');
    await new AsyncFunction('fs', 'console', code)(virtualFs, { log() {} });
    assert.equal(outputs.size, 1, generator);
    for (const [file, generated] of outputs) assert.equal(await fs.readFile(file, 'utf8'), generated, file);
  }
});
