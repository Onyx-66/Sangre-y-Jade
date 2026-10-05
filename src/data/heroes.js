import { BALAM_DEFINITIONS } from '../skills/generated/balam.js';
import { KUKUL_DEFINITIONS } from '../skills/generated/kukul.js';
const skill = (id, name, icon, type, cooldown, damage, range, description, tags, extra = {}) => ({
  id, name, icon, type, cooldown, damage, range, description, tags, ...extra,
});

export const HEROES = {
  balam: {
    id: 'balam',
    name: 'Balam',
    epithet: 'Warrior',
    icon: '🐆',
    color: 0xd38a45,
    role: 'Melee · Bruiser',
    description: 'A tough melee fighter with high health and armor. Ground enemies only.',
    weapon: 'Obsidian Macuahuitl',
    base: { hp: 150, mana: 0, speed: 225, damage: 1.05, armor: 4, crit: 0.07 },
    automatic: { name: 'Jaguar Cleave', type: 'melee', cooldown: 0.72, damage: 24, range: 92, color: 0xefb45f },
    skills: BALAM_DEFINITIONS.filter(skill=>skill.kind==='active'),
    passives: BALAM_DEFINITIONS.filter(skill=>skill.kind==='passive'),
  },
  ixchel: {
    id: 'ixchel',
    name: "Ixchel",
    epithet: 'Mage',
    icon: '🟢',
    color: 0x54d3a0,
    role: 'Magic · Control',
    description: 'A ranged mage with area spells. Uses mana, which regenerates over time.',
    weapon: 'Smoking Jade Scepter',
    base: { hp: 105, mana: 110, speed: 215, damage: 1.12, armor: 1, crit: 0.09 },
    automatic: { name: 'Copal Flame', type: 'projectile', cooldown: 0.9, damage: 25, range: 520, color: 0x70f0bd, mana: 3 },
    skills: [
      skill('copal-star', 'Copal Star', '✦', 'projectile', 3.8, 52, 570, 'A smoking green star pierces through spirits.', ['ranged', 'copal'], { mana: 14, pierce: 3 }),
      skill('jade-halo', 'Jade Halo', '◎', 'orbit', 8.5, 30, 125, 'Jade beads orbit the shaman and burn the unquiet dead.', ['area', 'jade'], { mana: 22, projectiles: 4 }),
      skill('ancestor-flame', 'Ancestor Flame', '♨', 'chain', 6.8, 47, 380, 'Blue-green fire leaps from spirit to spirit.', ['chain', 'spirit'], { mana: 20, chains: 5 }),
      skill('moonwell', 'Moonwell', '◉', 'trap', 10, 35, 145, 'A moonlit pool slows enemies and restores mana.', ['trap', 'mana'], { mana: 18, restore: 25 }),
      skill('censer-wave', 'Censer Wave', '≋', 'cone', 5.2, 50, 200, 'A rolling veil of copal smoke pushes enemies back.', ['control', 'copal'], { mana: 17, knockback: 250 }),
      skill('verdant-mercy', 'Verdant Mercy', '♥', 'heal', 14, 0, 0, 'Ancestral herbs restore health over a short moment.', ['healing'], { mana: 28, heal: 34 }),
      skill('smoking-mirror', 'Smoking Mirror', '◈', 'shield', 12, 0, 0, 'A dark mirror absorbs harm and returns mana.', ['defense', 'mana'], { mana: 24, shield: 48 }),
      skill('glyph-comet', 'Glyph Comet', '☄', 'line', 7.5, 86, 500, 'A jade comet crosses the battlefield in a brilliant line.', ['line', 'power'], { mana: 31, pierce: 9 }),
      skill('cacao-bloom', 'Cacao Bloom', '✿', 'nova', 9.0, 48, 235, 'Spectral cacao flowers erupt under nearby enemies.', ['area', 'nature'], { mana: 23 }),
      skill('raincaller', 'Raincaller', '☂', 'rain', 11, 31, 300, 'A focused storm follows the densest enemy pack.', ['area', 'storm'], { mana: 32, projectiles: 10 }),
      skill('spirit-familiar', 'Spirit Familiar', '◇', 'summon', 10, 27, 440, 'A luminous hummingbird spirit hunts on your behalf.', ['summon', 'spirit'], { mana: 24 }),
      skill('serpent-coil', 'Serpent Coil', '∿', 'trap', 8.6, 76, 135, 'A spectral serpent binds and crushes enemies who cross it.', ['trap', 'control'], { mana: 25 }),
      skill('jade-needles', 'Jade Needles', '✣', 'burst', 6.0, 34, 370, 'Fire a wheel of razor jade splinters.', ['ranged', 'burst'], { mana: 19, projectiles: 10 }),
      skill('ceiba-breath', 'Ceiba Breath', '❧', 'cone', 7.2, 68, 220, 'The world tree exhales through the scepter.', ['cone', 'nature'], { mana: 26 }),
      skill('dreamwalk', 'Dreamwalk', '↝', 'dash', 6.4, 26, 210, 'Step through the spirit world, damaging foes on return.', ['mobility', 'spirit'], { mana: 16 }),
      skill('four-directions', 'Four Directions', '✥', 'burst', 8.0, 60, 390, 'Four sacred bolts split toward the cardinal paths.', ['burst', 'line'], { mana: 27, projectiles: 4, pierce: 5 }),
      skill('blue-fire', 'Blue Fire', '♨', 'nova', 6.7, 59, 185, 'Cold ancestral flame blossoms around the caster.', ['area', 'spirit'], { mana: 22 }),
      skill('ancestor-chorus', 'Ancestor Chorus', '♫', 'chain', 9.8, 72, 420, 'Many voices answer at once, striking a long chain of foes.', ['chain', 'power'], { mana: 35, chains: 7 }),
      skill('moon-tears', 'Moon Tears', '◌', 'rain', 8.8, 45, 260, 'Luminous drops fall in a crescent around your target.', ['area', 'moon'], { mana: 28, projectiles: 8 }),
      skill('ixchels-mantle', "Ixchel's Mantle", '⬡', 'shield', 15, 0, 0, 'Wrap yourself in moonlight, gaining a ward and rapid mana recovery.', ['defense', 'mana'], { mana: 30, shield: 64, restore: 40 }),
    ],
  },
  kukul: {
    id: 'kukul',
    name: 'Kukul',
    epithet: 'Hunter',
    icon: '🪶',
    color: 0x41bfd0,
    role: 'Ranged · Mobility',
    description: 'A fast ranged hunter. Piercing darts hit several enemies in a line.',
    weapon: 'Quetzal Atlatl',
    base: { hp: 118, mana: 0, speed: 250, damage: 0.98, armor: 2, crit: 0.13 },
    automatic: { name: 'Piercing Atlatl', type: 'projectile', cooldown: 0.68, damage: 20, range: 620, color: 0x5ed9df, pierce: 4 },
    skills: KUKUL_DEFINITIONS.filter(skill=>skill.kind==='active'),
    passives: KUKUL_DEFINITIONS.filter(skill=>skill.kind==='passive'),
  },
};

export const MODIFIERS = [
  { id: 'might', name: 'Obsidian Edge', icon: '◆', description: '+12% damage', stat: 'damage', amount: 0.12 },
  { id: 'vigor', name: 'Cacao Remedy', icon: '♥', description: '+18 maximum HP and heal 18', stat: 'maxHp', amount: 18 },
  { id: 'haste', name: 'Quetzal Rhythm', icon: '≋', description: '+9% attack and cooldown speed', stat: 'haste', amount: 0.09 },
  { id: 'reach', name: 'Long Count', icon: '◎', description: '+12% range and area', stat: 'range', amount: 0.12 },
  { id: 'swiftness', name: 'Woven Sandals', icon: '➤', description: '+7% movement speed', stat: 'speed', amount: 0.07 },
  { id: 'critical', name: 'Jaguar Eye', icon: '⌖', description: '+6% critical chance', stat: 'crit', amount: 0.06 },
  { id: 'armor', name: 'Carved Stone Skin', icon: '⬢', description: '+2 armor', stat: 'armor', amount: 2 },
  { id: 'renewal', name: 'Ceiba Sap', icon: '✚', description: '+0.7 HP regeneration per second', stat: 'regen', amount: 0.7 },
  { id: 'wisdom', name: 'Scribe’s Knot', icon: '✦', description: '+14% experience gain', stat: 'xpGain', amount: 0.14 },
  { id: 'fortune', name: 'Cacao Fortune', icon: '●', description: '+18% cacao drops', stat: 'fortune', amount: 0.18 },
];

// Each skill owns its text. A missing description must not claim a generic mechanic.
export const skillDescription = (skill) => skill?.description || '';
const statNames={might:'Damage',vigor:'Max Health',haste:'Attack Speed',reach:'Area & Range',swiftness:'Move Speed',critical:'Critical Chance',armor:'Armor',renewal:'Regeneration',wisdom:'Experience',fortune:'Cacao Drops'};
for(const modifier of MODIFIERS)modifier.name=statNames[modifier.id];
export const heroList = () => Object.values(HEROES);
export const getHero = (id) => HEROES[id] || HEROES.balam;

