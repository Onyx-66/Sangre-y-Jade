const HEAL = [.4, .5, .6, .7, .8];
const PICKUP_RANGE = [.25, .30, .35, .40, .45];

export const jadeBounty = {
  id: 'jade-bounty',
  stat: (level) => ({ pickupRangeMult: 1 + PICKUP_RANGE[level - 1] }),
  on: {
    pickup({ stats, kind }, level) {
      if (kind === 'xp') stats.hp = Math.min(stats.maxHp, stats.hp + HEAL[level - 1]);
    },
  },
};
