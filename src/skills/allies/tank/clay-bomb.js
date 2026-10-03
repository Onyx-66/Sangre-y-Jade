import { castFx, effectActive } from '../common.js';

export const clayBomb = {
  canCast(_scene, support, skill) {
    return !effectActive(support, skill) && !support.traps.some((trap) => trap.id === skill.id);
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    support.placeBomb(skill);
    return true;
  },
};
