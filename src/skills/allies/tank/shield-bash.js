import { castFx, damage, effectActive } from '../common.js';

export const shieldBash = {
  origin(_scene, support) { return support.scene.companion.sprite; },
  canCast(_scene, support, skill, target) { return Boolean(target?.active) && !effectActive(support, skill); },
  cast(scene, support, skill, target) {
    castFx(scene, skill, support.scene.companion.sprite);
    damage(scene, support, skill, target, skill.params.damage);
    if (target.active) target.setData('stunUntil', scene.elapsed + skill.params.stunDuration);
    return true;
  },
};
