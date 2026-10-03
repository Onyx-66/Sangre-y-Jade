import { ALLY_CATALOG } from '../../../../data/allyCatalog.js';
import { equipped, valueAt } from '../../passive-common.js';

const definition = ALLY_CATALOG.tank.find((skill) => skill.id === 'guardian-link');

export const guardianLink = {
  ...definition,
  redirectDamage({ scene, damage }, level) {
    const ally = scene.companion;
    if (!equipped(scene, 'tank', definition.id) || Math.hypot(scene.player.x - ally.sprite.x, scene.player.y - ally.sprite.y) > definition.params.radius) return damage;
    const amount = damage * valueAt(level, definition.values) / 100;
    const absorbed = Math.min(amount, Math.max(0, (ally.hp ?? 100) - 1));
    ally.hp = Math.max(1, (ally.hp ?? 100) - absorbed);
    return damage - absorbed;
  },
};
