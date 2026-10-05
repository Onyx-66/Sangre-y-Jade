import {legacyBehavior} from './legacy.js';
export const BOSS_BEHAVIORS=Object.freeze(Object.fromEntries([
 ['camazotz','dash'],['zipacna','quake'],['vucub','sun'],['ahpuch','final'],
].map(([id,pattern])=>[id,legacyBehavior(id,pattern)])));
