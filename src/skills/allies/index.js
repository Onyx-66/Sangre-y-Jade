import { healingCircle } from './saintess/healing-circle.js';
import { jadeWard } from './saintess/jade-ward.js';
import { cleansingLight } from './saintess/cleansing-light.js';
import { sanctuaryDome } from './saintess/sanctuary-dome.js';
import { radiantBeacon } from './saintess/radiant-beacon.js';
import { lifebond } from './saintess/lifebond.js';
import { savingGrace } from './saintess/passives/saving-grace.js';
import { sacredFervor } from './saintess/passives/sacred-fervor.js';
import { bulwarkWall } from './tank/bulwark-wall.js';
import { warCry } from './tank/war-cry.js';
import { shieldBash } from './tank/shield-bash.js';
import { groundSlam } from './tank/ground-slam.js';
import { clayBomb } from './tank/clay-bomb.js';
import { shieldThrow } from './tank/shield-throw.js';
import { bodyguard } from './tank/passives/bodyguard.js';
import { guardianLink } from './tank/passives/guardian-link.js';
import { ambush } from './assassin/ambush.js';
import { execute } from './assassin/execute.js';
import { venomBlade } from './assassin/venom-blade.js';
import { silencingDart } from './assassin/silencing-dart.js';
import { smokeBomb } from './assassin/smoke-bomb.js';
import { vanish } from './assassin/vanish.js';
import { relentlessPursuit } from './assassin/passives/relentless-pursuit.js';
import { bountyContract } from './assassin/passives/bounty-contract.js';

export const ALLY_ACTIVE_HANDLERS = Object.assign(Object.create(null), {
  'healing-circle': healingCircle,
  'jade-ward': jadeWard,
  'cleansing-light': cleansingLight,
  'sanctuary-dome': sanctuaryDome,
  'radiant-beacon': radiantBeacon,
  lifebond,
  'bulwark-wall': bulwarkWall,
  'war-cry': warCry,
  'shield-bash': shieldBash,
  'ground-slam': groundSlam,
  'clay-bomb': clayBomb,
  'shield-throw': shieldThrow,
  ambush,
  execute,
  'venom-blade': venomBlade,
  'silencing-dart': silencingDart,
  'smoke-bomb': smokeBomb,
  vanish,
});

export const ALLY_PASSIVE_HANDLERS = Object.assign(Object.create(null), {
  'saving-grace': savingGrace,
  'sacred-fervor': sacredFervor,
  bodyguard,
  'guardian-link': guardianLink,
  'relentless-pursuit': relentlessPursuit,
  'bounty-contract': bountyContract,
});
