import { survivorsWill } from './shared/survivors-will.js';
import { jadeBounty } from './shared/jade-bounty.js';

// Hero handlers are registered by stable skill ID as each hero is converted.
export const ACTIVE_HANDLERS = Object.create(null);
export const INNATE_PASSIVES = [survivorsWill, jadeBounty];
