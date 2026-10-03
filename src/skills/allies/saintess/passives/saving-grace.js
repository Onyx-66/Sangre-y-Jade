import { ALLY_CATALOG } from '../../../../data/allyCatalog.js';
import { equipped } from '../../passive-common.js';

const definition = ALLY_CATALOG.saintess.find((skill) => skill.id === 'saving-grace');

export const savingGrace = {
  ...definition,
  preventFatal({ scene, damage, state }, _level) {
    if (!equipped(scene, 'saintess', definition.id) || damage < scene.stats.hp || scene.elapsed < (state.cooldownUntil || 0)) return undefined;
    state.cooldownUntil = scene.elapsed + definition.params.cooldown;
    const heal = scene.stats.maxHp * definition.params.healPct / 100 * scene.support.numberMultiplier() * scene.stats.healing;
    scene.stats.hp = Math.min(scene.stats.maxHp, scene.stats.hp + heal);
    scene.invulnerable = Math.max(scene.invulnerable, definition.params.invulnerabilityDuration);
    scene.fx?.play(definition.id, 'proc', { x: scene.player.x, y: scene.player.y });
    scene.skillAudio?.play(definition.id, 'proc');
    state.hudState = { type: 'timer', remaining: definition.params.cooldown, duration: definition.params.cooldown, ready: false };
    return 0;
  },
  on: {
    tick({ scene, state }) {
      const readyAt = state.cooldownUntil || 0;
      state.hudState = readyAt > scene.elapsed
        ? { type: 'timer', remaining: readyAt - scene.elapsed, duration: definition.params.cooldown, ready: false }
        : { type: 'timer', remaining: 0, duration: definition.params.cooldown, ready: true };
    },
  },
};
