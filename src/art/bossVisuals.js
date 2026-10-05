import definitions from '../data/bosses-v06.json' with {type:'json'};
import {ENEMY_ANIMATIONS} from './enemyVisuals.js';

export const BOSS_IDS=Object.freeze(definitions.map(b=>b.id));
export const BOSS_ANIMATIONS=ENEMY_ANIMATIONS;
export const BOSS_ABILITY_IDS=Object.freeze(definitions.flatMap(b=>b.phases.flatMap(p=>p.abilities.map(a=>`boss-${b.id}-${a.id}`))));
export const BOSS_ENTRY_IDS=Object.freeze(BOSS_IDS.map(id=>`boss-${id}-entry`));
export const BOSS_FX_IDS=Object.freeze([...BOSS_ABILITY_IDS,...BOSS_ENTRY_IDS]);
export const bossStillFiles=()=>[
 ...BOSS_ABILITY_IDS.flatMap(id=>['main','accent'].map(still=>({id:`${id}/${still}`,file:`fx/${id}/${still}.png`,size:256}))),
 ...BOSS_IDS.map(id=>({id:`${id}-entry`,file:`fx/boss-entry/${id}-entry.png`,size:512})),
];
// The new 192px textures keep the old 128px body's world-space centre/radius.
export function bossBodyCircle(sprite,key){
 const size=key.startsWith('boss-')&&sprite.scene?.textures?.exists(`${key}-frame-15`)?192:128;
 return [24,size/2-24,size/2-20];
}
