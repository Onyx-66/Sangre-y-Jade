import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, skillDescription } from '../src/data/heroes.js';
import { applyProjectileTint, applySlow, chainAttack, restoreSkillMana, ringEffect } from '../src/systems/SkillCombat.js';

test('authored skill descriptions survive and no generic type copy is shown', () => {
  const roar = HEROES.balam.skills.find((skill) => skill.id === 'jaguar-roar');
  assert.equal(roar.description, 'A terrifying roar hurts nearby foes and makes them flee for 2 seconds.');
  assert.equal(skillDescription(roar), roar.description);
  assert.equal(skillDescription({ type: 'nova' }), '');
});

test('a shield skill receives one mana restoration after its cost, respecting the cap', () => {
  const stats = { mana: 60, maxMana: 110 };
  const mantle = HEROES.ixchel.skills.find((skill) => skill.id === 'ixchels-mantle');
  stats.mana -= mantle.mana;
  restoreSkillMana(stats, mantle.restore);
  assert.equal(stats.mana, 70);

  stats.mana = 100;
  restoreSkillMana(stats, mantle.restore);
  assert.equal(stats.mana, stats.maxMana);
});

test('projectiles and ring effects retain the tint supplied by their skill', () => {
  let projectileTint;
  const projectile = { setTint(value) { projectileTint = value; return this; } };
  applyProjectileTint(projectile, 0x12abef);
  assert.equal(projectileTint, 0x12abef);

  let ringArgs;
  const scene = { playEffect(...args) { ringArgs = args; return 'effect'; } };
  assert.equal(ringEffect(scene, 12, 34, 2, 0xabc123), 'effect');
  assert.deepEqual(ringArgs, [4, 12, 34, 256, 0, 0xabc123]);
});

test('chain targets can be reached from the previous enemy, beyond player range', () => {
  const first = { active: true, x: 10, y: 0 };
  const second = { active: true, x: 30, y: 0 };
  const tooFar = { active: true, x: 61, y: 0 };
  const damages = [];
  const lines = [];
  const scene = {
    enemies: { getChildren: () => [first, second, tooFar] },
    add: { line: (...args) => {
      const line = { args, setOrigin() { return this; }, setDepth() { return this; }, setLineWidth() { return this; }, destroy() {} };
      lines.push(line);
      return line;
    } },
    tweens: { add() {} },
    damageEnemy: (enemy, damage) => damages.push([enemy, damage]),
  };

  chainAttack(scene, first, 25, 100, 3);
  assert.deepEqual(damages, [[first, 100], [second, 88]]);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].args[2], first.x);
  assert.equal(lines[1].args[4], second.x);
});

test('slow percentage scales velocity and defaults to the old 50 percent', () => {
  const makeEnemy = (slowPct) => {
    const values = { slowUntil: 10, ...(slowPct === undefined ? {} : { slowPct }) };
    const enemy = {
      body: { velocity: { x: 100, y: -40 } },
      getData: (key) => values[key],
      setVelocity(x, y) { this.body.velocity = { x, y }; },
    };
    return enemy;
  };

  const custom = makeEnemy(0.3);
  assert.equal(applySlow(custom, 2), true);
  assert.deepEqual(custom.body.velocity, { x: 70, y: -28 });

  const legacyDefault = makeEnemy(undefined);
  assert.equal(applySlow(legacyDefault, 2), true);
  assert.deepEqual(legacyDefault.body.velocity, { x: 50, y: -20 });
  assert.equal(applySlow(legacyDefault, 10), false);
});
