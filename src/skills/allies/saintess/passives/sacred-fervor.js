import { ALLY_CATALOG } from '../../../../data/allyCatalog.js';
import { equipped, valueAt } from '../../passive-common.js';

const definition = ALLY_CATALOG.saintess.find((skill) => skill.id === 'sacred-fervor');

export const sacredFervor = {
  ...definition,
  stat(level, { scene }) {
    if (!equipped(scene, 'saintess', definition.id)) return {};
    return { damageMult: 1 + valueAt(level, definition.values) / 100 };
  },
};
