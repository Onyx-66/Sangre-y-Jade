import { timedEffect } from '../common.js';
import { present } from '../balam/runtime.js';

export const scale = (support, amount) => amount * support.numberMultiplier();
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const activeEnemies = (scene) => scene.enemies.getChildren().filter((enemy) => enemy.active);
export const enemiesWithin = (scene, origin, radius) => activeEnemies(scene)
  .filter((enemy) => distance(enemy, origin) <= radius);

export function castFx(scene, skill, point = scene.player) {
  present(scene, skill, 'cast', { x: point.x, y: point.y });
}

export function impactFx(scene, skill, point) {
  present(scene, skill, 'impact', { x: point.x, y: point.y });
}

export function setEffect(support, skill, duration, origin = null) {
  support.effects[skill.id] = support.scene.elapsed + duration;
  if (origin) support.origins[skill.id] = { x: origin.x, y: origin.y };
}

export function effectActive(support, skill) {
  return support.effectActive(skill.id);
}

export function damage(scene, support, skill, target, amount) {
  if (!target?.active) return false;
  scene.damageEnemy(target, scale(support, amount), 0, 0, scene.companion.sprite, { byAlly: true });
  // Lethal hits still need their impact sound even though the old visual hook
  // only renders on survivors. Do not change the Step 17 visual work here.
  if (!target.active) scene.skillAudio?.play(skill.id, 'hit');
  if (target.active) impactFx(scene, skill, target);
  return true;
}

export function healHero(scene, support, amount) {
  const healed = Math.min(scene.stats.maxHp - scene.stats.hp, scale(support, amount) * scene.stats.healing);
  if (healed > 0) {
    scene.stats.hp += healed;
    scene.healEffect?.();
  }
  return healed;
}

export function addShield(scene, support, amount, cap = scene.stats.maxHp) {
  const before = scene.stats.shield;
  scene.stats.shield = Math.min(cap, before + scale(support, amount));
  if (scene.stats.shield > before) scene.shieldEffect?.();
  return scene.stats.shield - before;
}

export function clearShots(scene, origin, radius) {
  let cleared = 0;
  for (const shot of scene.enemyProjectiles?.getChildren() || []) {
    if (shot.active && distance(shot, origin) <= radius) {
      shot.destroy();
      cleared += 1;
    }
  }
  return cleared;
}

export function activeEffect(scene, support, skill, duration, update = () => {}, onEnd = () => {}) {
  setEffect(support, skill, duration);
  return timedEffect(scene, duration, [], update, () => {
    if (support.effects[skill.id] <= scene.elapsed) delete support.effects[skill.id];
    onEnd();
  });
}

export function hasHeroDebuff(scene) {
  return ['slow', 'poison', 'bleed', 'burn', 'confuse'].some((status) =>
    (scene.player.getData?.(`${status}Until`) || scene.stats[`${status}Until`] || 0) > scene.elapsed);
}

export function clearHeroDebuffs(scene) {
  for (const status of ['slow', 'poison', 'bleed', 'burn', 'confuse']) {
    scene.player.setData?.(`${status}Until`, 0);
    if (scene.stats[`${status}Until`] !== undefined) scene.stats[`${status}Until`] = 0;
  }
}

export function allyOrigin(_scene, support) {
  return support.scene.companion.sprite;
}
