// The registry exposes only implemented game modes; Training owns the existing 10/20-minute duration presets without changing their saved IDs or balance.
import { RUN_MODES } from './data/world.js';

export const DEFAULT_GAME_MODE_ID = 'training';

export const GAME_MODES = Object.freeze({
  training: Object.freeze({
    id: 'training',
    name: 'Training',
    playLabel: 'Play · Training',
    runModes: RUN_MODES,
  }),
});

export function getGameMode(id = DEFAULT_GAME_MODE_ID) {
  return GAME_MODES[id] || GAME_MODES[DEFAULT_GAME_MODE_ID];
}
