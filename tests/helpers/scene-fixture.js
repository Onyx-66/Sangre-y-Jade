import * as module from 'node:module';
import { HEROES } from '../../src/data/heroes.js';
import { PassiveSystem } from '../../src/skills/PassiveSystem.js';
import { INNATE_PASSIVES } from '../../src/skills/index.js';
import { HERO_EFFECT_DEFAULTS, enemyStatusDefaults } from '../../src/skills/StatusEffects.js';
import { Vector2 } from './phaser-shim.js';
import { resolveSync } from './scene-loader.js';

const hooks = typeof module.registerHooks === 'function' ? module.registerHooks({ resolve: resolveSync }) : null;
if (!hooks) module.register('./scene-loader.js', import.meta.url);
export const { GameScene } = await import('../../src/scenes/GameScene.js');
hooks?.deregister();

export function sprite(x = 0, y = 0, data = {}) {
  const object = {
    x, y, active: true, data: { ...data }, anims: { stop() {} }, body: { velocity: { x: 0, y: 0 }, setCircle() {} },
    getData(key) { return this.data[key]; },
    setData(key, value) { if (typeof key === 'string') this.data[key] = value; else Object.assign(this.data, key); return this; },
    setVelocity(x, y) { this.body.velocity = { x, y }; this.body.speed = Math.hypot(x, y); return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setTint(tint) { this.tint = tint; return this; },
    clearTint() { delete this.tint; return this; },
    setRotation(angle) { this.rotation = angle; return this; },
    setActive(active) { this.active = active; return this; },
    enableBody(_reset, x, y) { return this.setPosition(x, y).setActive(true); },
    disableBody() { this.active = false; return this; },
    destroy() { this.active = false; },
  };
  for (const method of ['setDepth', 'setDisplaySize', 'setScale', 'setAlpha', 'setVisible', 'setFlipX', 'setTexture', 'setAngle', 'setOrigin', 'setLineWidth', 'setStrokeStyle', 'setCollideWorldBounds', 'play', 'once']) object[method] = function () { return this; };
  return object;
}

function group(items = []) {
  return {
    children: { each: (callback) => [...items].forEach(callback) },
    getChildren: () => items,
    countActive: () => items.filter((item) => item.active).length,
    get(x, y) { const item = sprite(x, y); items.push(item); return item; },
    add(item) { items.push(item); },
  };
}

export function makeScene(hero = HEROES.ixchel) {
  const scene = new GameScene({});
  scene.heroData = hero;
  scene.settings = { particles: 'low', attackMode: 'auto', autoAim: true, damageNumbers: false };
  scene.mapData = { difficulty: 1, music: 'day' };
  scene.modeData = { id: 'quick', duration: 600 };
  scene.scene = { isPaused: () => false };
  scene.elapsed = 1;
  scene.ended = scene.pausedForChoice = false;
  scene.stats = { hp: 100, maxHp: 100, mana: 110, maxMana: 110, damage: 1, range: 1, crit: 0, critDamage: 2,
    armor: 0, healing: 1, shield: 0, damageDone: 0, damageTaken: 0, kills: 0, fortune: 0, haste: 0, regen: 0,
    xp: 0, xpGain: 1, cacao: 0, speed: 100, level: 1, ...HERO_EFFECT_DEFAULTS };
  scene.player = sprite();
  scene.player.hiddenUntil = 0;
  scene.lastMove = new Vector2(1, 0);
  scene.facing = 'side';
  scene.gear = [];
  scene.skillSlots = [];
  scene.skillEffects = [];
  scene.summons = [];
  scene.enemies = group();
  scene.projectiles = group();
  scene.enemyProjectiles = group();
  scene.props = group();
  scene.pickups = group();
  scene.invulnerable = scene.hitCount = scene.basicAttackCount = scene.autoTimer = 0;
  scene.dash = { x: 1, y: 0, remaining: 0, cooldown: 0 };
  scene.support = { modifiers: () => ({ damage: 1, haste: 0, speed: 1, armor: 0, reduction: 0, regen: 0 }), preventFatal: (amount) => amount };
  scene.passives = new PassiveSystem(scene);
  INNATE_PASSIVES.forEach((passive) => scene.passives.equip(passive, 1, { innate: true }));
  scene.hud = { toast() {}, setCooldown() {}, clearBoss() {}, setBoss() {}, move: { x: 0, y: 0 } };
  scene.audio = { sfx() {} };
  const key = { isDown: false };
  scene.keys = { up: key, down: key, left: key, right: key, attack: key };
  scene.cursors = scene.keys;
  scene.time = { delayedCall: (_delay, callback) => scene.delayed.push(callback) };
  scene.tweens = { add: (options) => { if (options.onComplete) scene.delayed.push(options.onComplete); } };
  scene.delayed = [];
  scene.add = Object.fromEntries(['image', 'sprite', 'circle', 'line'].map((name) => [name, (x, y) => sprite(x, y)]));
  scene.animateCharacter = scene.floatText = scene.playEffect = scene.spawnPickup = scene.checkLevelUp = () => {};
  scene.flush = () => { while (scene.delayed.length) scene.delayed.shift()(); };
  return scene;
}

export function addEnemy(scene, data = {}, x = 100, y = 0) {
  const enemy = sprite(x, y, { ...enemyStatusDefaults(), speed: 100, hp: 1000, maxHp: 1000, damage: 20,
    ranged: false, isBoss: false, nextShot: 0, serial: scene.enemies.getChildren().length + 1, artKey: 'enemy-shade', ...data });
  scene.enemies.add(enemy);
  return enemy;
}
