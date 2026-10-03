import { ALLY_CATALOG } from '../../../../data/allyCatalog.js';
import { equipped } from '../../passive-common.js';

const definition = ALLY_CATALOG.assassin.find((skill) => skill.id === 'bounty-contract');

export const bountyContract = {
  ...definition,
  stat(level, { scene }) {
    if (!equipped(scene, 'assassin', definition.id)) return {};
    return { cacaoBonusPct: definition.values[Math.min(definition.values.length-1,Math.max(0,level-1))] || definition.values[0] };
  },
  on: {
    kill({ scene, enemy, byAlly, wasTopThreat }) {
      if (!byAlly || !equipped(scene, 'assassin', definition.id)) return;
      scene.skillAudio?.play(definition.id, 'proc');
      if (!wasTopThreat) return;
      const bonus = definition.params.bonusCacao;
      for (let i = 0; i < bonus; i += 1) scene.spawnPickup('cacao', enemy.x + (i - 1) * 8, enemy.y, 1);
    },
  },
};
