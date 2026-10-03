import { applyStatus } from '../../common.js';
import { castFx, damage, effectActive } from '../common.js';

export const silencingDart = {
  canCast(_scene, support, skill, target) { return Boolean(target?.active) && Boolean(target.getData('ranged')) && !effectActive(support, skill); },
  cast(scene, support, skill, target) {
    castFx(scene, skill);
    damage(scene, support, skill, target, skill.params.damage);
    if (target.active) applyStatus(scene, target, 'silence', skill.params.silenceDuration, { source: scene.companion.sprite, byAlly: true });
    return true;
  },
};
