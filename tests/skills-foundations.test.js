import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { ACTIVE_HANDLERS, INNATE_PASSIVES } from '../src/skills/index.js';
import { EventBus, PassiveSystem } from '../src/skills/PassiveSystem.js';
import { applyStatus, skillContext, damageArea, cone, lineStrike, spawnProjectile, orbitBlades, zone, summon, updateSkillEffects } from '../src/skills/common.js';
import { updateEnemy, enemyShotAngle } from '../src/skills/StatusEffects.js';
import { makeScene, addEnemy, sprite } from './helpers/scene-fixture.js';

test('fear moves away from its source and prevents ranged and contact attacks until expiry', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'fear', 2, { source: { x: 50, y: 0 } });
  updateEnemy(scene, enemy, .1);
  scene.touchEnemy(enemy);
  assert.ok(enemy.body.velocity.x > 0);
  assert.equal(scene.enemyProjectiles.countActive(), 0);
  assert.equal(scene.stats.hp, 100);
  scene.elapsed = 3.1;
  updateEnemy(scene, enemy, .1);
  assert.equal(scene.enemyProjectiles.countActive(), 1);
});

test('confuse wanders, re-rolls its heading every 0.4 seconds, and prevents attacks', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'confuse', 2);
  updateEnemy(scene, enemy, .1, () => 0);
  assert.equal(enemy.body.velocity.x, 100);
  scene.elapsed = 1.2;
  updateEnemy(scene, enemy, .1, () => .5);
  assert.equal(enemy.body.velocity.x, 100);
  scene.elapsed = 1.4;
  updateEnemy(scene, enemy, .1, () => .5);
  assert.equal(enemy.body.velocity.x, -100);
  scene.touchEnemy(enemy);
  assert.equal(scene.enemyProjectiles.countActive(), 0);
  assert.equal(scene.stats.hp, 100);
});

test('root stops movement but preserves ranged and contact attacks', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'root', 2);
  updateEnemy(scene, enemy, .1);
  assert.deepEqual(enemy.body.velocity, { x: 0, y: 0 });
  assert.equal(scene.enemyProjectiles.countActive(), 1);
  scene.touchEnemy(enemy);
  assert.equal(scene.stats.hp, 80);
});

test('pull moves at twice speed toward the point, stopping on it; root takes precedence', () => {
  const scene = makeScene(), enemy = addEnemy(scene);
  applyStatus(scene, enemy, 'pull', 2, { x: 300, y: 0 });
  updateEnemy(scene, enemy, .1);
  assert.equal(enemy.body.velocity.x, 200);
  enemy.x = 300;
  updateEnemy(scene, enemy, .1);
  assert.deepEqual(enemy.body.velocity, { x: 0, y: 0 });
  applyStatus(scene, enemy, 'root', 1);
  enemy.x = 100;
  updateEnemy(scene, enemy, .1);
  assert.equal(enemy.body.velocity.x, 0);
});

test('burn deals time-based damage, shows orange tint, and stops at expiry', () => {
  const scene = makeScene(), enemy = addEnemy(scene);
  applyStatus(scene, enemy, 'burn', 1, { dps: 20 });
  scene.elapsed = 1.5;
  updateEnemy(scene, enemy, .5);
  assert.equal(enemy.getData('hp'), 990);
  assert.equal(enemy.tint, 0xff8a36);
  scene.elapsed = 2.5;
  updateEnemy(scene, enemy, .5);
  assert.equal(enemy.getData('hp'), 990);
  assert.equal(enemy.tint, undefined);
});

test('blind randomizes hero-aimed shots, but preserves non-hero shots and expires', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'blind', 1);
  updateEnemy(scene, enemy, .1, () => .25);
  const shot = scene.enemyProjectiles.getChildren()[0];
  assert.ok(Math.abs(shot.body.velocity.x) < 1e-10);
  assert.equal(shot.body.velocity.y, 210);
  assert.equal(enemyShotAngle(scene, enemy, .7, false, () => 0), .7);
  scene.elapsed = 3;
  assert.equal(enemyShotAngle(scene, enemy, .7, true, () => 0), .7);
});

test('hiddenUntil makes non-boss enemies wander without attacking; bosses still pursue', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, scene.player, 'aggro-drop', 2);
  updateEnemy(scene, enemy, .1, () => 0);
  scene.touchEnemy(enemy);
  assert.equal(enemy.body.velocity.x, 100);
  assert.equal(scene.enemyProjectiles.countActive(), 0);
  assert.equal(scene.stats.hp, 100);
  const boss = addEnemy(scene, { isBoss: true, pattern: 'dash', patternTimer: 2 });
  updateEnemy(scene, boss, .1);
  assert.equal(boss.body.velocity.x, -100);
  scene.elapsed = 4;
  updateEnemy(scene, enemy, .1);
  assert.equal(scene.enemyProjectiles.countActive(), 1);
});

test('stun stops movement and all attacks while poison can still damage the enemy', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'stun', 1);
  applyStatus(scene, enemy, 'poison', 1, { dps: 10 });
  scene.elapsed += .1;
  updateEnemy(scene, enemy, .1);
  scene.touchEnemy(enemy);
  assert.deepEqual(enemy.body.velocity, { x: 0, y: 0 });
  assert.equal(enemy.getData('hp'), 999);
  assert.equal(scene.enemyProjectiles.countActive(), 0);
  assert.equal(scene.stats.hp, 100);
});

test('taunt redirects pursuit to the companion and resumes hero pursuit on expiry', () => {
  const scene = makeScene(), enemy = addEnemy(scene);
  scene.companion = { sprite: sprite(200, 0) };
  applyStatus(scene, enemy, 'taunt', 1);
  updateEnemy(scene, enemy, .1);
  assert.equal(enemy.body.velocity.x, 100);
  scene.elapsed = 3;
  updateEnemy(scene, enemy, .1);
  assert.equal(enemy.body.velocity.x, -100);
});

test('silence prevents ranged and boss skills but allows contact damage and movement', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'silence', 1);
  updateEnemy(scene, enemy, .1);
  assert.equal(scene.enemyProjectiles.countActive(), 0);
  assert.ok(Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y) > 0);
  scene.touchEnemy(enemy);
  assert.equal(scene.stats.hp, 80);
  const boss = addEnemy(scene, { isBoss: true, pattern: 'sun', patternTimer: .01 });
  applyStatus(scene, boss, 'silence', 1);
  updateEnemy(scene, boss, .1);
  assert.equal(scene.enemyProjectiles.countActive(), 0);
});

test('disarm retains the existing 45 percent reduction on melee and ranged damage', () => {
  const scene = makeScene(), enemy = addEnemy(scene, { ranged: true });
  applyStatus(scene, enemy, 'disarm', 1);
  updateEnemy(scene, enemy, .1);
  assert.ok(Math.abs(scene.enemyProjectiles.getChildren()[0].getData('damage') - (8 + 1 / 150) * .55) < 1e-10);
  scene.touchEnemy(enemy);
  assert.equal(scene.stats.hp, 89);
});

for (const status of ['poison', 'bleed']) test(`${status} ticks without critical hits and attributes a lethal ally tick correctly`, () => {
  const scene = makeScene(), enemy = addEnemy(scene, { hp: 1 });
  const ally = sprite(0, 0, { byAlly: true });
  let killed, crits = 0;
  scene.passives.bus.on('kill', (event) => { killed = event; });
  scene.passives.bus.on('crit', () => { crits += 1; });
  scene.stats.crit = 1;
  applyStatus(scene, enemy, status, 1, { dps: 10, source: ally, byAlly: true });
  scene.elapsed += .2;
  updateEnemy(scene, enemy, .2);
  assert.equal(enemy.active, false);
  assert.equal(crits, 0);
  assert.equal(killed.enemy, enemy);
  assert.equal(killed.byAlly, true);
});

test('mark amplifies incoming damage only while active', () => {
  const scene = makeScene(), enemy = addEnemy(scene);
  applyStatus(scene, enemy, 'mark', 1, { bonus: .5 });
  scene.damageEnemy(enemy, 20);
  assert.equal(enemy.getData('hp'), 970);
  scene.elapsed = 3;
  scene.damageEnemy(enemy, 20);
  assert.equal(enemy.getData('hp'), 950);
});

test('slow applies custom percentages with the legacy 50 percent default', () => {
  const scene = makeScene(), enemy = addEnemy(scene);
  applyStatus(scene, enemy, 'slow', 1, { pct: .3 });
  updateEnemy(scene, enemy, .1);
  assert.equal(enemy.body.velocity.x, -70);
  applyStatus(scene, enemy, 'slow', 1);
  updateEnemy(scene, enemy, .1);
  assert.equal(enemy.body.velocity.x, -50);
});

test('event bus subscribes, unsubscribes and clears; passive replacement and levels do not duplicate listeners', () => {
  const bus = new EventBus(), events = [];
  const unsubscribe = bus.on('hit', (context) => events.push(context.damage));
  bus.emit('kill', { damage: 99 });
  bus.emit('hit', { damage: 2 });
  unsubscribe(); bus.emit('hit', { damage: 3 });
  assert.deepEqual(events, [2]);
  bus.on('hit', () => events.push(4)); bus.clear(); bus.emit('hit', {});
  assert.deepEqual(events, [2]);
  const scene = makeScene(), system = new PassiveSystem(scene);
  const passive = { id: 'test-only', stat: (level) => ({ speedMult: 1 + level / 10 }), on: { hit: ({ state }, level) => { state.count = (state.count || 0) + level; } } };
  system.equip(passive); system.equip(passive); system.setLevel(passive.id, 3);
  system.emit('hit');
  assert.equal(system.equipped.get(passive.id).state.count, 3);
  assert.equal(system.modifiers().speedMult, 1.3);
  system.unequip(passive.id); system.emit('hit');
  assert.equal(system.modifiers().speedMult, 1);
  system.destroy(); assert.equal(system.bus.listeners.size, 0);
});

test('every current hero skill has an ID handler and casts at all six levels without errors', () => {
  for (const hero of Object.values(HEROES)) for (const original of hero.skills) for (let level = 1; level <= 6; level += 1) {
    const scene = makeScene(hero);
    addEnemy(scene, {}, 70);
    const skill = { ...original, level, remaining: 0 };
    scene.skillSlots = [skill];
    let casts = 0;
    scene.passives.bus.on('skillCast', () => { casts += 1; });
    assert.equal(typeof ACTIVE_HANDLERS[skill.id],'function');
    assert.doesNotThrow(() => { scene.castSkill(0); updateSkillEffects(scene,.2); scene.flush(); scene.updateSummons(.2); scene.flush(); }, `${hero.id}/${skill.id}/Lv${level}`);
    assert.equal(casts, 1);
    assert.equal(skill.remaining, skill.cooldown * (level >= 5 ? .9 : 1));
    assert.ok(Number.isFinite(scene.stats.mana));
    assert.ok(Number.isFinite(scene.stats.damageDone));
  }
});

test('ID handlers share level scaling, mana, cooldown and skillCast handling', () => {
  const scene = makeScene(), original = HEROES.ixchel.skills[0];
  const previous=ACTIVE_HANDLERS[original.id];
  let registered;
  ACTIVE_HANDLERS[original.id] = (_scene, skill, context) => { registered = { skill, context }; };
  try {
    scene.stats.manaCostMult = .5;
    const skill = { ...original, level: 6, remaining: 0 };
    scene.skillSlots = [skill];
    scene.castSkill(0);
    assert.equal(registered.skill, skill);
    assert.equal(registered.context.damage, original.damage * 2.25);
    assert.equal(registered.context.range, original.range * 1.1);
    assert.equal(registered.context.projectiles, 2);
    assert.equal(scene.stats.mana, 110 - original.mana * .5);
    assert.equal(skill.remaining, original.cooldown * .9);
    scene.castSkill(0);
    assert.equal(scene.stats.mana, 110 - original.mana * .5);
  } finally { ACTIVE_HANDLERS[original.id]=previous; }
  scene.stats.mana = 110; scene.skillSlots[0].remaining = 0; scene.castSkill(0);
  assert.equal(scene.projectiles.countActive(), 2);
  assert.equal(scene.projectiles.getChildren()[0].getData('damage'), registered.context.damage);
  assert.equal(scene.stats.mana, 110 - original.mana * .5);
  const durationSkill = { ...HEROES.ixchel.skills.find((skill) => skill.type === 'summon'), level: 6 };
  assert.ok(Math.abs(skillContext(scene, durationSkill).durationScale - 1.32) < 1e-10);
  const blocked = makeScene(); blocked.stats.mana = 0; blocked.skillSlots = [{ ...original, level: 1, remaining: 0 }];
  blocked.castSkill(0); assert.equal(blocked.projectiles.countActive(), 0); assert.equal(blocked.skillSlots[0].remaining, 0);
});

test('hero damage reduction, dodge charges, intangibility and reflection are read by combat', () => {
  const scene = makeScene(), enemy = addEnemy(scene);
  scene.stats.damageTakenMult = .5;
  scene.damagePlayer(20, 100, 0, enemy, true);
  assert.equal(scene.stats.hp, 90);
  scene.invulnerable = 0; scene.stats.dodgeCharges = 1;
  scene.damagePlayer(20, 100, 0, enemy, true);
  assert.equal(scene.stats.hp, 90); assert.equal(scene.stats.dodgeCharges, 0);
  scene.invulnerable = 0; scene.stats.intangibleUntil = scene.elapsed + 1;
  const shot = scene.spawnEnemyProjectile(1, 0, Math.PI, 200, 20, enemy);
  scene.onEnemyProjectileHit(shot);
  assert.equal(shot.active, true); assert.equal(scene.stats.hp, 90);
  scene.stats.intangibleUntil = 0; scene.stats.reflectUntil = scene.elapsed + 1;
  scene.onEnemyProjectileHit(shot);
  assert.equal(shot.active, false); assert.equal(scene.stats.hp, 90);
  const reflected = scene.projectiles.getChildren()[0];
  assert.equal(reflected.getData('damage'), 30);
  assert.ok(reflected.body.velocity.x > 0);
  scene.damagePlayer(20, 100, 0, enemy, true);
  assert.equal(enemy.getData('hp'), 985);
});

test('hero mana multipliers, lifesteal and cooldown recovery affect their existing paths', () => {
  const scene = makeScene();
  addEnemy(scene);
  scene.stats.manaCostMult = .5;
  scene.autoAttack(); assert.equal(scene.stats.mana, 108.5);
  scene.autoTimer = 10; scene.stats.mana = 0; scene.stats.manaRegenMult = 2;
  scene.updateVitals(.5); assert.equal(scene.stats.mana, 11);
  scene.stats.hp = 50; scene.stats.lifestealPct = .2;
  const enemy = addEnemy(scene, { hp: 5 });
  scene.damageEnemy(enemy, 20); assert.equal(scene.stats.hp, 51);
  const ally = sprite(0, 0, { byAlly: true });
  scene.damageEnemy(addEnemy(scene), 20, 0, 0, ally); assert.equal(scene.stats.hp, 51);
  scene.skillSlots = [{ ...HEROES.ixchel.skills[0], level: 1, remaining: 10 }];
  scene.stats.cooldownRecoveryMult = 2;
  scene.updateCooldowns(.5); assert.equal(scene.skillSlots[0].remaining, 9);
});

test('all eight passive events originate from the real scene combat and update methods', () => {
  const scene = makeScene(), observed = [];
  for (const event of ['kill', 'hit', 'crit', 'basicAttack', 'skillCast', 'damageTaken', 'pickup', 'tick']) scene.passives.bus.on(event, (context) => observed.push({ event, context }));
  scene.stats.crit = 1;
  const enemy = addEnemy(scene, { hp: 1 });
  scene.damageEnemy(enemy, 20);
  assert.equal(observed.find((entry) => entry.event === 'kill').context.byAlly, false);
  scene.settings.attackMode = 'manual';
  scene.autoAttack();
  assert.equal(observed.find((entry) => entry.event === 'basicAttack').context.count, 1);
  scene.skillSlots = [{ ...HEROES.ixchel.skills[0], level: 1, remaining: 0 }]; scene.castSkill(0);
  scene.damagePlayer(10, 1, 1, enemy, true);
  scene.collectPickup(sprite(0, 0, { kind: 'xp', value: 1 }));
  for (const method of ['updateMovement', 'updateCooldowns', 'updateEnemies', 'updateProjectiles', 'updatePickups', 'updateSummons', 'updateCompanion', 'updateVitals', 'updateDirector', 'updateWorld', 'updateHud']) scene[method] = () => {};
  scene.update(0, 25);
  assert.deepEqual(new Set(observed.map((entry) => entry.event)), new Set(['kill', 'hit', 'crit', 'basicAttack', 'skillCast', 'damageTaken', 'pickup', 'tick']));
  assert.equal(observed.find((entry) => entry.event === 'tick').context.dt, .025);
  const count = observed.length; scene.pausedForChoice = true; scene.update(0, 25);
  assert.equal(observed.length, count);
});

test('two innate traits use no active slots and follow all five JSON value levels', () => {
  for (const hero of Object.values(HEROES)) {
    const scene = makeScene(hero);
    assert.deepEqual([...scene.passives.equipped.keys()], ['survivors-will', 'jade-bounty']);
    assert.equal(scene.skillSlots.length, 0);
    assert.ok([...scene.passives.equipped.values()].every((entry) => entry.innate && entry.level === 1));
  }
  for (let level = 1; level <= 5; level += 1) {
    const scene = makeScene();
    INNATE_PASSIVES.forEach((passive) => scene.passives.setLevel(passive.id, level));
    scene.stats.hp = 50;
    scene.collectPickup(sprite(0, 0, { kind: 'xp' }));
    assert.ok(Math.abs(scene.stats.hp - (50 + .3 + level * .1)) < 1e-10);
    assert.ok(Math.abs(scene.passives.modifiers().pickupRangeMult - (1.2 + level * .05)) < 1e-10);
    const hp = scene.stats.hp; scene.collectPickup(sprite(0, 0, { kind: 'cacao' }));
    assert.equal(scene.stats.hp, hp);
    scene.passives.emit('damageTaken', { amount: 1 });
    const boosted = 1.1 + level * .02;
    assert.ok(Math.abs(scene.passives.modifiers().speedMult - boosted) < 1e-10);
    scene.elapsed = 3; scene.passives.emit('tick', { dt: 2 });
    assert.equal(scene.passives.modifiers().speedMult, 1);
    scene.passives.emit('damageTaken', { amount: 1 });
    assert.equal(scene.passives.modifiers().speedMult, 1);
    scene.elapsed = 7; scene.passives.emit('damageTaken', { amount: 1 });
    assert.ok(Math.abs(scene.passives.modifiers().speedMult - boosted) < 1e-10);
    scene.keys.right = { isDown: true }; scene.updateMovement(.1);
    assert.ok(Math.abs(scene.player.body.velocity.x - 100 * boosted) < 1e-10);
  }
});

test('shared area/cone/line/projectile helpers select targets and propagate status/source', () => {
  const scene = makeScene();
  const forward = addEnemy(scene, {}, 50), behind = addEnemy(scene, {}, -50), outside = addEnemy(scene, {}, 300);
  assert.deepEqual(damageArea(scene, scene.player, 60, 10), [forward, behind]);
  assert.deepEqual(cone(scene, { angle: 0, range: 60, damage: 10 }), [forward]);
  assert.deepEqual(lineStrike(scene, { angle: 0, range: 60, damage: 10, status: { id: 'root', duration: 1 } }), [forward]);
  assert.equal(forward.getData('rootUntil'), 2);
  assert.equal(outside.getData('hp'), 1000);
  const ally = sprite(0, 0, { byAlly: true });
  const shot = spawnProjectile(scene, { origin: ally, byAlly: true, damage: 20, status: { id: 'burn', duration: 1, params: { dps: 2 } } });
  scene.onProjectileHit(shot, forward);
  assert.equal(forward.getData('burnUntil'), 2);
  assert.equal(forward.getData('burnSource'), ally);
  assert.equal(forward.getData('burnByAlly'), true);
  assert.equal(shot.active, false);
});

test('Jade Bounty extends attraction for XP gems only and pickup consumption heals once', () => {
  const scene = makeScene(), attracted = [];
  scene.physics = { moveToObject: (pickup) => attracted.push(pickup) };
  const gem = sprite(200, 0, { kind: 'xp' }), cacao = sprite(200, 0, { kind: 'cacao' });
  scene.pickups.add(gem); scene.pickups.add(cacao);
  scene.updatePickups();
  assert.deepEqual(attracted, [gem]);
  scene.stats.hp = 50;
  scene.collectPickup(gem); scene.collectPickup(gem);
  assert.equal(scene.stats.hp, 50.4);
});

test('orbit/zone/summon helpers persist, move with the hero where appropriate, and clean up', () => {
  const scene = makeScene();
  addEnemy(scene, {}, 100);
  const orbit = orbitBlades(scene, { count: 3, duration: 1, damage: 10 });
  const pool = zone(scene, { origin: { x: 10, y: 20 }, radius: 100, duration: 1, damage: 10 });
  const ally = summon(scene, { damage: 10, duration: 2, texture: 'summon' });
  assert.equal(orbit.sprites.length, 3); assert.equal(ally.life, 2);
  updateSkillEffects(scene, .1);
  const before = orbit.sprites[0].x;
  scene.player.x = 200; updateSkillEffects(scene, .1);
  assert.notEqual(orbit.sprites[0].x, before);
  assert.equal(pool.sprites[0].x, 10);
  scene.pausedForChoice = true; const remaining = orbit.remaining; updateSkillEffects(scene, .5);
  assert.equal(orbit.remaining, remaining);
  scene.pausedForChoice = false; updateSkillEffects(scene, 1);
  assert.equal(scene.skillEffects.length, 0);
  assert.ok([...orbit.sprites, ...pool.sprites].every((item) => !item.active));
});
