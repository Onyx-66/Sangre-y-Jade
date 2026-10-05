import roster from '../data/enemies-v06.json' with {type:'json'};

export const ENEMY_IDS=Object.freeze(Object.keys(roster));
export const ENEMY_ANIMATIONS=Object.freeze({
 idle:{frames:[0,1],rate:4,repeat:-1},walk:{frames:[2,3,4,5],rate:9,repeat:-1},
 windup:{frames:[6,7],rate:8,repeat:0},attack:{frames:[8,9],rate:10,repeat:0},
 recover:{frames:[10],rate:4,repeat:0},hurt:{frames:[11],rate:8,repeat:0},death:{frames:[12,13,14,15],rate:8,repeat:0},
});
export const ENEMY_EFFECT_IDS=Object.freeze(['soul-bolt','venom-spit','arrow-red','vine-snare','puddle','crystal-shard',
 'wisp-explosion','blood-slash','blink-flash','tail-whip-arc','shockwave-ring','dust-puff','spawn-crack',
 'death-puff-green','death-puff-red','death-puff-cyan','shield-ring-blue','telegraph-glyph']);
export const projectileEffect=id=>({priest:'soul-bolt',jungle_wasp:'venom-spit',bone_archer:'arrow-red',crystal_golem:'crystal-shard'}[id]);
export const deathEffect=id=>`death-puff-${['blood_wraith','bone_archer','moon_cultist'].includes(id)?'red':
 ['drowned_spirit','abyssal_eel','crystal_golem','glow_wisp'].includes(id)?'cyan':'green'}`;
export function enemiesForArt(hero,map){
 return ENEMY_IDS.filter(id=>(!map||roster[id].maps.includes('all')||roster[id].maps.includes(map.id))&&
   (hero?.automatic?.type!=='melee'||!roster[id].flier));
}
