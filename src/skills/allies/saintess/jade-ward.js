import { addShield, castFx, effectActive } from '../common.js';

export const jadeWard = {
  canCast(scene, support, skill) {
    return scene.stats.shield < scene.stats.maxHp * skill.params.shieldCapPct / 100 && !effectActive(support, skill);
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    const cap = scene.stats.maxHp * skill.params.shieldCapPct / 100;
    addShield(scene, support, skill.params.shield, cap);
    // This shield is instant; AllyBrain owns the rank-scaled recast timer.
    return true;
  },
};
