import { castFx, effectActive } from '../common.js';

export const bulwarkWall = {
  origin(_scene, support) { return support.scene.companion.sprite; },
  canCast(_scene, support, skill) { return !effectActive(support, skill); },
  cast(scene, support, skill, target) {
    castFx(scene, skill, target || scene.player);
    support.raiseWall(skill, target);
    return true;
  },
};
