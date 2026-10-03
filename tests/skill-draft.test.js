import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, MODIFIERS } from '../src/data/heroes.js';
import { SLOT_RULES, slotCount, draftSkills, draftMilestoneSkills } from '../src/systems/SkillDraft.js';
import { makeScene } from './helpers/scene-fixture.js';

const keepOrder = (items) => [...items];

test('active/passive slot totals and skill caps match each unlock level', () => {
  for (const level of [1, 9, 10, 19]) assert.equal(slotCount('active', level), 3);
  assert.equal(slotCount('active', 20), 4);
  for (const level of [1, 9]) assert.equal(slotCount('passive', level), 1);
  for (const level of [10, 19, 20]) assert.equal(slotCount('passive', level), 2);
  assert.deepEqual(SLOT_RULES.active.keys, ['Q', 'E', 'R', 'T']);
  assert.equal(SLOT_RULES.active.maxLevel, 6);
  assert.equal(SLOT_RULES.passive.maxLevel, 5);
  assert.equal(SLOT_RULES.innate.length, 2);
});

test('locked T cannot cast or recover a cooldown before level 20', () => {
  const scene=makeScene(HEROES.ixchel);
  const fourth={...HEROES.ixchel.skills[0],kind:'active',level:1,remaining:8};
  scene.skillSlots=[{...fourth,remaining:1},{...fourth,id:'second',remaining:1},{...fourth,id:'third',remaining:1},fourth];
  scene.stats.level=19;
  scene.player.body.speed=0;
  const cooldowns=[];
  scene.hud.setCooldown=(index,_ratio,dash)=>{if(!dash)cooldowns.push(index);};
  scene.castSkill(3);
  assert.equal(fourth.remaining,8);
  scene.updateCooldowns(1);
  assert.equal(fourth.remaining,8);
  assert.deepEqual(cooldowns,[0,1,2]);
  scene.stats.level=20;
  scene.updateCooldowns(1);
  assert.equal(fourth.remaining,7);
  assert.deepEqual(cooldowns,[0,1,2,0,1,2,3]);
});

test('normal draft guarantees a free active and an every-second-level passive, without duplicate cards', () => {
  const activeSkills = HEROES.balam.skills;
  const passiveSkills = [1, 2, 3, 4].map((n) => ({ id: `passive-${n}`, name: `Passive ${n}`, description: 'Test passive' }));
  const options = { activeSkills, passiveSkills, modifiers: MODIFIERS, shuffle: keepOrder, random: () => 1,
    activeSlots: [], passiveSlots: [], activeCount: 3, passiveCount: 1 };
  const oddLevel = draftSkills({ ...options, guaranteePassive: false });
  assert.ok(oddLevel.some((choice) => choice.choiceType === 'new-active'));
  assert.ok(!oddLevel.some((choice) => choice.choiceType === 'new-passive'));
  const evenLevel = draftSkills({ ...options, guaranteePassive: true });
  assert.ok(evenLevel.some((choice) => choice.choiceType === 'new-active'));
  assert.ok(evenLevel.some((choice) => choice.choiceType === 'new-passive'));
  assert.equal(new Set(evenLevel.map((choice) => choice.id)).size, evenLevel.length);
  assert.ok(evenLevel.every((choice) => ['active', 'passive', 'stat', 'ally'].includes(choice.kind)));
});

test('swap offers are rare, limited to one, and replace skills only within their kind', () => {
  const activeSlots = HEROES.balam.skills.slice(0, 3).map((skill) => ({ ...skill, kind: 'active', level: 1 }));
  const passiveSlots = [{ id: 'owned-passive', name: 'Owned passive', level: 1, kind: 'passive' }];
  const passiveSkills = [1, 2, 3].map((n) => ({ id: `passive-${n}`, name: `Passive ${n}` }));
  const choices = draftSkills({ activeSkills: HEROES.balam.skills, passiveSkills, activeSlots, passiveSlots,
    activeCount: 3, passiveCount: 1, modifiers: MODIFIERS, shuffle: keepOrder, random: () => 0 });
  const swaps = choices.filter((choice) => choice.choiceType === 'swap');
  assert.equal(swaps.length, 1);
  assert.ok(['active', 'passive'].includes(swaps[0].kind));
  assert.equal(new Set(choices.map((choice) => choice.id)).size, choices.length);
  const noSwap = draftSkills({ activeSkills: HEROES.balam.skills, activeSlots, activeCount: 3,
    modifiers: MODIFIERS, shuffle: keepOrder, random: () => .99 });
  assert.ok(!noSwap.some((choice) => choice.choiceType === 'swap'));
});

test('boss rewards contain skills only and prefer owned skill upgrades', () => {
  const activeSlots = HEROES.balam.skills.slice(0, 3).map((skill) => ({ ...skill, kind: 'active', level: 1 }));
  const choices = draftSkills({ activeSkills: HEROES.balam.skills, activeSlots, activeCount: 3,
    modifiers: MODIFIERS, boss: true, shuffle: keepOrder, random: () => 1 });
  assert.equal(choices.length, 3);
  assert.ok(choices.every((choice) => choice.kind === 'active' && choice.choiceType === 'upgrade-active'));
  assert.ok(choices.every((choice) => !MODIFIERS.some((modifier) => modifier.id === choice.id)));
});

test('maxed loadouts fall back to stat choices and a heal while legacy skills stay active-only', () => {
  const activeSlots = HEROES.balam.skills.slice(0, 3).map((skill) => ({ ...skill, kind: 'active', level: 6 }));
  const choices = draftSkills({ activeSkills: HEROES.balam.skills, activeSlots, activeCount: 3,
    modifiers: MODIFIERS, shuffle: keepOrder, random: () => 1 });
  assert.equal(choices.length, 3);
  assert.ok(choices.every((choice) => choice.kind === 'stat'));
  assert.ok(choices.some((choice) => choice.stat === 'heal'));
  assert.ok(HEROES.balam.skills.every((skill) => !skill.kind || skill.kind === 'active'));
});

function choiceHarness(level, pendingLevels, ownedCount = 0) {
  const scene = makeScene(HEROES.balam);
  scene.stats.level = level;
  scene.pendingLevelUps = pendingLevels;
  scene.skillSlots = HEROES.balam.skills.slice(0, ownedCount).map((skill) => ({ ...skill, kind: 'active', level: 1, remaining: 0 }));
  scene.passiveSlots = [];
  scene.completedSkillMilestones = new Set();
  scene.pendingBossRewards = [];
  scene.loadoutLevel = level - pendingLevels;
  scene.physics = { pause() {}, resume() {} };
  scene.tweens = { pauseAll() {}, resumeAll() {} };
  scene.releaseAttack = () => {};
  scene.support = {
    chooseClass(done) { scene.companion = { skills: [] }; done(); },
    syncLevel() {}, offerChange(done) { done(); },
  };
  const screens = [];
  const toasts = [];
  scene.hud = {
    move: { x: 0, y: 0 }, toast: (text) => toasts.push(text), setSkills() {}, setCooldown() {},
    showChoice(title, cards, choose) { screens.push({ title, cards, choose }); },
  };
  return { scene, screens, toasts };
}

function chooseFirst(scene, screen) {
  assert.ok(screen.cards.length, `${screen.title} should offer at least one pick`);
  screen.choose(screen.cards[0]);
}

test('level jump 9→11 resolves level 10 normally, consumes its passive milestone once, then resolves 11', () => {
  const { scene, screens, toasts } = choiceHarness(11, 2, 0);
  scene.showLevelChoice();
  assert.equal(screens[0].title, 'Level 10');
  chooseFirst(scene, screens[0]);
  assert.ok(scene.completedSkillMilestones.has(10));
  assert.ok(toasts.some((toast) => toast.includes('Passive slot 2 unlocked')));
  assert.equal(screens.filter(({ title }) => title === 'Passive Slot Unlocked').length, 0,
    'the explicitly empty pre-conversion passive pool must not fabricate cards');
  assert.equal(screens[1].title, 'Level 11');
  chooseFirst(scene, screens[1]);
  assert.equal(screens.filter(({ title }) => title === 'Level 10').length, 1);
  assert.equal(scene.completedSkillMilestones.size, 1);
  assert.equal(scene.pausedForChoice, false);
});

test('level jump 19→21 resolves the level-20 normal pick and one extra active milestone pick', () => {
  const { scene, screens } = choiceHarness(21, 2, 3);
  scene.showLevelChoice();
  assert.equal(screens[0].title, 'Level 20');
  chooseFirst(scene, screens[0]);
  assert.ok(scene.completedSkillMilestones.has(20));
  assert.equal(screens[1].title, 'Fourth Active Slot Unlocked');
  assert.ok(screens[1].cards.length <= 3 && screens[1].cards.length > 0);
  assert.ok(screens[1].cards.every((choice) => choice.kind === 'active'));
  chooseFirst(scene, screens[1]);
  assert.equal(screens[2].title, 'Level 21');
  chooseFirst(scene, screens[2]);
  assert.equal(screens.filter(({ title }) => title === 'Fourth Active Slot Unlocked').length, 1);
  assert.equal(scene.completedSkillMilestones.size, 1);
  assert.equal(scene.pausedForChoice, false);
});

test('milestone card helper does not include stat cards or shared innate traits', () => {
  const cards = draftMilestoneSkills('active', { activeSkills: HEROES.balam.skills, activeSlots: [], activeCount: 4,
    modifiers: MODIFIERS, shuffle: keepOrder, random: () => 1 });
  assert.equal(cards.length, 3);
  assert.ok(cards.every((choice) => choice.kind === 'active'));
  assert.ok(cards.every((choice) => !SLOT_RULES.innate.includes(choice.id)));
});
