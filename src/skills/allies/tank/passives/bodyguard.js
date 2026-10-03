import { ALLY_CATALOG } from '../../../../data/allyCatalog.js';
import { equipped, valueAt } from '../../passive-common.js';

const definition = ALLY_CATALOG.tank.find((skill) => skill.id === 'bodyguard');

export const bodyguard = {
  ...definition,
  stat(level, { scene }) {
    const ally = scene.companion;
    if (!equipped(scene, 'tank', definition.id) || Math.hypot(scene.player.x - ally.sprite.x, scene.player.y - ally.sprite.y) > definition.params.radius) return {};
    return { reduction: valueAt(level, definition.values) / 100 };
  },
};
