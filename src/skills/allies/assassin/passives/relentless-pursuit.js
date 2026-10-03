import { ALLY_CATALOG } from '../../../../data/allyCatalog.js';
import { equipped, valueAt } from '../../passive-common.js';

const definition = ALLY_CATALOG.assassin.find((skill) => skill.id === 'relentless-pursuit');

export const relentlessPursuit = {
  ...definition,
  stat(level, { scene }) {
    if (!equipped(scene, 'assassin', definition.id)) return {};
    return { allyAttackSpeedMult: 1 + valueAt(level, definition.values) / 100 };
  },
};
