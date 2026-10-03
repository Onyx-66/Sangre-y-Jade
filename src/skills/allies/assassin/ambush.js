import { castFx, damage, effectActive } from '../common.js';

export const ambush = {
  canCast(_scene, support, skill, target) { return Boolean(target?.active) && !effectActive(support, skill); },
  cast(scene, support, skill, target) {
    const assassin = scene.companion.sprite;
    castFx(scene, skill, assassin);
    assassin.setPosition(target.x - 28, target.y + 28);
    scene.animateCharacter?.(assassin, 'support-assassin', 'attack', .2);
    const empowered = scene.elapsed - support.lastStealthAt <= skill.params.stealthWindow;
    damage(scene, support, skill, target, skill.params.damage * (empowered ? 2 : 1));
    return true;
  },
};
