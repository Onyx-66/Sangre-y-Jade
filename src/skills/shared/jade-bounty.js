import { definition, value } from '../balam/data.js';
import { proc } from '../balam/runtime.js';
const data=definition('jade-bounty');

export const jadeBounty = {
  ...data,
  stat: (level) => ({ pickupRangeMult: 1 + data.secondaryValues[level-1]/100 }),
  on: {
    pickup({ scene, stats, kind, pickup }, level) {
      if (kind === 'xp') {stats.hp = Math.min(stats.maxHp, stats.hp + value(data,level));proc(scene,data,pickup||scene.player,true);}
    },
    tick({state},level){state.hudState={type:'bonus',healPerGem:value(data,level),pickupRangePct:data.secondaryValues[level-1]};},
  },
};
