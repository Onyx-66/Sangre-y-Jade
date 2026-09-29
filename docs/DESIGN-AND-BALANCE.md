# Version 0 design and balance sheet

## Pillars

1. **Readable pressure.** Enemies use strong silhouettes, attacks telegraph, damage has a short grace window, and effects never conceal the champion for long.
2. **Flexible loadouts.** A player equips four active hero skills (Q/E/R/T), plus the basic weapon and dash. Full loadouts offer two upgrades and one replacement; capped upgrades become stat choices. One support equips three autonomous skills.
3. **Power with friction.** Damage, enemy health, wave density, XP, and cacao scale together. The shrine is intentionally modest so the opening minutes never become trivial.
4. **History framed honestly.** Maya cities, cacao exchange, astronomy, materials, and Xibalba inspire the setting. The specific city, champions, invasion, and chronology are original fantasy.

## Run timing

| Event | Quick Rite | Full Descent |
|---|---:|---:|
| Camazotz | 2:30 | 5:00 |
| Zipacna | 5:00 | 10:00 |
| Vucub Caquix | 7:30 | 15:00 |
| Ah Puch | 10:00 | 20:00 |

If a mini-boss is alive at the final threshold, Ah Puch waits until it is defeated; the final encounter can never be silently skipped.

## Core curves

- Enemy health: base HP × map difficulty × `(1 + run progress × 0.95)`.
- Enemy contact damage: base damage × map difficulty × `(1 + run progress × 0.38)`.
- Active-skill levels: roughly +32% output per rank, capped at level 6.
- XP threshold: `18 + level × 11 + level^1.25 × 2.5`.
- Spawn target: 20 enemies at the opening to roughly 110 on high effects near the final boss; low effects caps the target around 65 and the physics group at 90.
- Shrine costs: `45 × 1.72^rank`, with eight ranks per track.

## Support system (v0.5)

Choose one support at hero level 5; this choice lasts for the run. Draft three distinct starting skills from its ten-skill catalog. After each subsequent hero level, keep the loadout or replace one support skill. All equipped skills automatically use rank `hero level - 4`; a replacement inherits this rank. Passive modifiers are derived from equipped skills each frame, so replacing a skill cannot permanently stack its bonus.

- Saintess: healing, protective shields, damage/haste/speed buffs, regeneration, mana, damage reduction, projectile cleansing, and a fatal-hit rescue.
- Tank: proximity protection, bombs, projectile interception, slowing traps, taunt, stun attacks, shields, armor, and a low-health block.
- Assassin: prioritizes potential enemy damage, boss/ranged pressure, then distance within 750 world units. Its skills include burst strikes, vulnerability marks, execution damage, poison, silence, disarm, bleed, attack speed, knives, and defensive smoke.
- Support potency rises by 12% per rank; movement/reduction/vulnerability have safety caps. Supports persist for the run rather than having separate health bars. Temporary traps expire or detonate; their count is capped at six.
- Breakable urns and baskets can still be attacked but also open automatically on contact. XP/cacao/potions collect at close range without attacks.

## Relic identity

- Jade Pendant increases healing rather than raw HP.
- Obsidian Ear-Spools amplify critical damage.
- Feathered Headdress rewards moving with faster cooldown recovery.
- Jaguar-Pelt Vest reduces every seventh hit to one damage.
- Woven Sandals turn dashes into attacks.
- Bone Bracers enlarge areas and knockback.

## Monetization guardrails

Version 0's premium plan uses cosmetic skins/trails, the soundtrack/art codex, and future content expansions. It deliberately excludes loot boxes, premium cacao, revive purchases, paid shrine ranks, or stat-bearing cosmetics. This keeps balance testable and makes paid value easy to communicate on itch.io.

## Expansion seams

- Hero and skill content is data-driven in `src/data/heroes.js`.
- Maps, enemies, bosses, gear, modes, and catalog offerings live in `src/data/world.js`.
- `TextureFactory` can be replaced texture-by-texture with authored sprite sheets without touching combat rules.
- The `GameScene` owns run simulation; DOM screens/HUD remain independent of physics.
- Audio is addressed through `AudioDirector`, allowing WAV files to be replaced with mastered OGG versions later.

