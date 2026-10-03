import { castFx, damage, effectActive } from '../common.js';

export const execute = {
  canCast(_scene, support, skill, target) {
    return Boolean(target?.active) && target.getData('hp') / target.getData('maxHp') < skill.params.executeHpPct / 100
      && !effectActive(support, skill);
  },
  cast(scene, support, skill, target) {
    castFx(scene, skill, target);
    const hpRatio=target.getData('hp')/target.getData('maxHp');
    const amount=hpRatio<skill.params.executeHpPct/100?skill.params.executeDamage:skill.params.normalDamage;
    damage(scene, support, skill, target, amount);
    if(!target.active)skill.cooldownRefund = skill.params.cooldownRefund;
    return true;
  },
};
