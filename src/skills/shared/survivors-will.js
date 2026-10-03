import { definition, value } from '../balam/data.js';
import { proc } from '../balam/runtime.js';
const data=definition('survivors-will');

export const survivorsWill = {
  ...data,
  on: {
    damageTaken({ scene, amount, state }, level) {
      if (amount <= 0 || scene.elapsed+1e-9 < (state.readyAt || 0)) return;
      state.readyAt = scene.elapsed + data.params.internalCooldown;
      state.until = scene.elapsed + data.params.duration;
      state.modifiers = { speedMult: 1 + value(data,level)/100 };
      state.hudState={type:'timer',remaining:data.params.internalCooldown,duration:data.params.internalCooldown};
      proc(scene,data,scene.player,false);
    },
    tick({ scene, state }) {
      if (scene.elapsed+1e-9 >= (state.until || 0)) state.modifiers = {};
      state.hudState={type:'timer',remaining:Number(Math.max(0,(state.readyAt||0)-scene.elapsed).toFixed(6)),duration:data.params.internalCooldown};
    },
  },
};
