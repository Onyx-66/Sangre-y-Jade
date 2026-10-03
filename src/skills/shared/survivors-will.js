const SPEED = [.12, .14, .16, .18, .20];

export const survivorsWill = {
  id: 'survivors-will',
  on: {
    damageTaken({ scene, amount, state }, level) {
      if (amount <= 0 || scene.elapsed < (state.readyAt || 0)) return;
      state.readyAt = scene.elapsed + 6;
      state.until = scene.elapsed + 2;
      state.modifiers = { speedMult: 1 + SPEED[level - 1] };
    },
    tick({ scene, state }) {
      if (scene.elapsed >= (state.until || 0)) state.modifiers = {};
    },
  },
};
