export const MAPS = [
  {
    id: 'overgrown',
    name: 'The Overgrown Temple',
    subtitle: 'Day · Normal',
    icon: '☀',
    description: 'Sunlit ruins, tangled roots, and the first restless dead. Balanced enemies and clear sight lines.',
    colors: { ground: 0x173f31, tile: 0x2b6045, detail: 0x8a6a3f, glow: 0x5ed6a4, fog: 0x244d3e },
    music: 'day',
    difficulty: 1,
  },
  {
    id: 'bloodmoon',
    name: 'Temple Under a Blood Moon',
    subtitle: 'Night · Hard',
    icon: '◉',
    description: 'The familiar temple twists beneath a red moon. Faster waves and reduced visibility reward decisiveness.',
    colors: { ground: 0x201c2c, tile: 0x432b3b, detail: 0x8f4b3d, glow: 0xd4484f, fog: 0x2d1825 },
    music: 'night',
    difficulty: 1.18,
  },
  {
    id: 'cenote',
    name: 'The Sunken Cenote',
    subtitle: 'Cavern · Expert',
    icon: '◈',
    description: 'Cold water, violet stone, and bioluminescent gates. Elite spirits arrive earlier and hit harder.',
    colors: { ground: 0x101d2b, tile: 0x18354a, detail: 0x4c597b, glow: 0x55e5c0, fog: 0x12152c },
    music: 'cenote',
    difficulty: 1.36,
  },
];

export const RUN_MODES = [
  { id: 'quick', name: 'Survival · 10 min', duration: 600, description: '10-minute survival. Bosses arrive every 2½ minutes.' },
  { id: 'full', name: 'Survival · 20 min', duration: 1200, description: '20-minute survival. Bosses arrive every 5 minutes.' },
];

export const ENEMIES = {
  shade: { name: 'Lost Shade', hp: 28, speed: 78, damage: 8, xp: 4, radius: 14, color: 0x4d8c75, weight: 6 },
  bat: { name: 'Cave Bat', hp: 19, speed: 125, damage: 6, xp: 3, radius: 11, color: 0x7c638e, weight: 4 },
  jaguar: { name: 'Jaguar Revenant', hp: 72, speed: 92, damage: 13, xp: 9, radius: 18, color: 0xc78b42, weight: 2 },
  serpent: { name: 'Bone Serpent', hp: 48, speed: 105, damage: 10, xp: 7, radius: 16, color: 0x55b79a, weight: 3 },
  priest: { name: 'Hollow Priest', hp: 54, speed: 62, damage: 11, xp: 8, radius: 17, color: 0x7aa8a1, weight: 2, ranged: true },
};

export const BOSSES = [
  { id: 'camazotz', name: 'Camazotz, the Death Bat', icon: '🦇', hp: 850, speed: 112, damage: 16, color: 0x755982, pattern: 'dash' },
  { id: 'zipacna', name: 'Zipacna, the Earth-Shaker', icon: '🐊', hp: 1450, speed: 68, damage: 21, color: 0x8c7149, pattern: 'quake' },
  { id: 'vucub', name: 'Vucub Caquix, the False Sun', icon: '☀', hp: 2100, speed: 82, damage: 25, color: 0xc95b3f, pattern: 'sun' },
  { id: 'ahpuch', name: 'Ah Puch, Lord of Xibalba', icon: '☠', hp: 5200, speed: 76, damage: 30, color: 0x56d6a4, pattern: 'final' },
];

export const GEAR = [
  { id: 'jade-pendant', name: 'Jade Pendant', slot: 'Neck', icon: '◆', description: 'Healing pickups restore 35% more HP.', apply: { healing: 0.35 } },
  { id: 'obsidian-earspools', name: 'Obsidian Ear-Spools', slot: 'Ears', icon: '◈', description: 'Critical hits deal 45% extra damage.', apply: { critDamage: 0.45 } },
  { id: 'feathered-headdress', name: 'Feathered Headdress', slot: 'Head', icon: '♛', description: 'Cooldowns recover 12% faster while moving.', apply: { movingHaste: 0.12 } },
  { id: 'jaguar-vest', name: 'Jaguar-Pelt Vest', slot: 'Chest', icon: '▧', description: 'Every seventh hit is reduced to 1 damage.', apply: { seventhGuard: true } },
  { id: 'woven-sandals', name: 'Woven Sandals', slot: 'Feet', icon: '➤', description: 'Dashing leaves a damaging wind trail.', apply: { dashTrail: 32 } },
  { id: 'bone-bracers', name: 'Carved Bone Bracers', slot: 'Arms', icon: '╫', description: 'Knockback and area size are increased by 25%.', apply: { force: 0.25, area: 0.25 } },
];

export const STORE_ITEMS = [
  { id: 'founder-jaguar', icon: '🐆', name: "Founder's Jaguar Mantle", price: '$3.99', description: 'A ceremonial gold-and-obsidian Balam skin, jade trail, and founder profile crest. Cosmetic only.' },
  { id: 'quetzal-trails', icon: '🪶', name: 'Quetzal Trail Collection', price: '$2.49', description: 'Three colorful dash trails shared by every champion. Cosmetic only.' },
  { id: 'codex-ost', icon: '♫', name: 'Codex & Original Soundtrack', price: '$5.99', description: 'High-resolution art, development codex, and the full original soundtrack as downloadable extras.' },
  { id: 'xibalba-expansion', icon: '◉', name: 'Lords of Xibalba Expansion', price: 'Planned', description: 'A future paid content expansion with maps, story chapters, and new champions—never stat boosts.' },
];

