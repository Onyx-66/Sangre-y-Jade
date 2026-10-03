import { applyStatus } from '../../common.js';
import { castFx, effectActive } from '../common.js';

export const venomBlade = {
  canCast(_scene, support, skill, target) { return Boolean(target?.active) && !effectActive(support, skill); },
  cast(scene, support, skill, target) {
    castFx(scene, skill, target);
    const previous=target.getData('poisonUntil')>scene.elapsed?target.getData('venomBladeStacks')||0:0;
    const stacks = Math.min(skill.params.maxStacks, previous + 1);
    target.setData('venomBladeStacks', stacks);
    applyStatus(scene, target, 'poison', skill.params.duration, {
      dps: skill.params.damagePerSecond * stacks * support.numberMultiplier(), source: scene.companion.sprite, byAlly: true,
    });
    return true;
  },
};
