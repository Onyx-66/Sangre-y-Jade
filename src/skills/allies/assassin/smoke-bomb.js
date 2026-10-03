import { applyStatus } from '../../common.js';
import { activeEffect, activeEnemies, castFx, effectActive } from '../common.js';

export const smokeBomb = {
  canCast(scene, support, skill, _target, { failsafe = false } = {}) {
    const count=activeEnemies(scene)
      .filter((enemy) => Math.hypot(enemy.x - scene.player.x, enemy.y - scene.player.y) <= skill.params.radius).length;
    return !effectActive(support, skill) && count >= (failsafe ? 1 : 3);
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    support.lastStealthAt = scene.elapsed;
    const origin = { x: scene.player.x, y: scene.player.y };
    activeEffect(scene, support, skill, skill.params.duration, () => {
      for (const enemy of activeEnemies(scene)) {
        if (Math.hypot(enemy.x - origin.x, enemy.y - origin.y) <= skill.params.radius) {
          applyStatus(scene, enemy, 'blind', .3, { source: scene.companion.sprite, byAlly: true });
          applyStatus(scene, enemy, 'slow', .3, { pct: skill.params.slowPct / 100, source: scene.companion.sprite, byAlly: true });
        }
      }
    });
    scene.fx?.play(skill.id, 'ground', { ...origin, duration: skill.params.duration, scale: skill.params.radius / 100 });
    return true;
  },
};
