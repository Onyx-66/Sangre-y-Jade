# Step 21 balance smoke report — 2026-10-03

## Verdict and method

**Outliers remain; no balance numbers changed in Step 21.** These are nine real Phaser survival simulations (three seeds for each hero), not manufactured kills or a difficulty certification. Ixchel still uses her legacy Step 9 compatibility kit and has no redesigned hero passives.

`node scripts/pacing-playtest.mjs --verification --label=balance --modes=quick`

Seeds 1701, 1702, 1703; fresh save/no shrine upgrades; Overgrown Temple; auto attack/aim; high enemy density; Saintess preference; fixed movement/draft policy from Step 20. Real updates/timers/tweens/Arcade collisions at 30 Hz game/60 Hz physics; render and HUD refresh skipped. Stop at the 600-second timer, not after the final boss. No invulnerability, forced XP/kills, teleporting, revives or spawn/damage changes. Each healing skill is cast only below 72% HP by this bot. Browser errors/HTTP errors: 0. Ally placeholder warnings remain.

Two complete nine-run matrices were retained while attribution was refined: [initial](verification/balance-initial.json), [final](verification/balance.json). Exact level timestamps, end levels, kills, HP and XP match between them: **PASS**. The extra Tank/Assassin runs are companion-coverage evidence, not substituted into the hero comparison.

## Per-run results

Times are simulation seconds, including decimal precision. “Not reached/killed” is censored, never zero or a passing observation.

| Hero | Seed | L10 (s) | L20 (s) | End level | Deaths | Kills | Damage taken | Boss time from spawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| balam | 1701 | 209.4 | 532.0 | 24 | 0 | 1958 | 0.0 | jaguar-chief: 24.6 s; zipacna: 50.2 s; high-priest: 81.3 s; ahpuch: not killed (observed 0.0 s) |
| balam | 1702 | 212.1 | 476.4 | 24 | 0 | 1872 | 0.0 | jaguar-chief: 25.0 s; zipacna: 57.3 s; high-priest: 64.9 s; ahpuch: not killed (observed 0.0 s) |
| balam | 1703 | 258.2 | 565.8 | 21 | 0 | 1389 | 13.1 | jaguar-chief: 89.5 s; zipacna: 131.4 s; high-priest: 148.8 s; ahpuch: not killed (observed 0.0 s) |
| ixchel | 1701 | 201.3 | 550.6 | 21 | 0 | 932 | 337.0 | camazotz: 31.6 s; zipacna: not killed (observed 300.0 s) |
| ixchel | 1702 | 210.7 | 486.9 | 22 | 0 | 997 | 0.0 | camazotz: 39.2 s; zipacna: 68.8 s; vucub: not killed (observed 150.0 s) |
| ixchel | 1703 | 206.7 | 543.5 | 21 | 0 | 930 | 114.7 | camazotz: 44.0 s; zipacna: 293.0 s; vucub: not killed (observed 6.9 s) |
| kukul | 1701 | 253.7 | not reached | 19 | 0 | 1548 | 314.7 | camazotz: 50.9 s; zipacna: not killed (observed 300.0 s) |
| kukul | 1702 | 245.4 | 524.7 | 22 | 0 | 2075 | 79.5 | camazotz: 31.7 s; zipacna: 154.5 s; vucub: not killed (observed 145.4 s) |
| kukul | 1703 | 242.8 | 468.0 | 27 | 0 | 2957 | 14.6 | camazotz: 54.3 s; zipacna: 108.6 s; vucub: 100.8 s; ahpuch: not killed (observed 0.0 s) |

## Section 8 comparison and outliers

| Hero (3 runs) | Median L10 (s) | Median first-boss TTK (s) | Deaths by 600 s |
| --- | --- | --- | --- |
| balam | 212.1 | 25.0 | 0/3 |
| ixchel | 206.7 | 39.2 | 0/3 |
| kukul | 245.4 | 50.9 | 0/3 |

- L10 median spread (slowest/fastest − 1): **18.7%**, exceeding the 15% target.

- First-boss median spread: **103.7%**, exceeding 15%. Balam fights the ground-compatible Jaguar Chief whereas Ixchel/Kukul fight Camazotz; this is the real encounter flow, not an equal-boss laboratory comparison.

- Deaths: **0/9**. Zero deaths cannot establish a relative death-rate percentage, and three runs per hero is a small sample. No final-boss victory/TTK is claimed: Ah Puch only spawns at the audit's 600-second cutoff.

- Quick-mode L10 window 210–270 s: **6/9**; L20 window 480–570 s: **6/9**. Earlier Step 20 misses remain; Kukul/1701 ends at level 19 and has no L20 observation.

- Long/censored boss fights remain visible in the table: Zipacna survives to the cutoff for Ixchel/1701 and Kukul/1701; Ixchel/1703 takes 293.0 seconds to kill it. These are reported outliers, not justification for a final-verification rebalance.

- Balam/Saintess seeds 1701 and 1702 take zero recorded HP damage, and their Healing Circle is never needed. This is not proof of a dead heal: the controlled trigger fixture successfully casts it. See companion coverage below.

## Damage per skill, per run

Damage is the game’s raw damage accounting, including overkill, across all enemies and acquired levels. It is **not** single-target level-1 DPS. Passive buffs generally amplify their originating hit rather than owning separate damage. Utility skills can correctly show zero damage/casts; a bot may withhold healing at full HP. Final loadout levels and cast counts are shown; any untraceable damage remains an explicit bucket. All shared traits are included even when they deal no damage.

### balam — seed 1701

Raw total: 288153.4; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 23021.1 | 8.0% |
| jaguar-roar | 6 | 77 | 46080.0 | 16.0% |
| sun-claw | 6 | 65 | 145766.3 | 50.6% |
| war-drum | 2 | 47 | 34594.3 | 12.0% |
| heart-of-balam | 4 | 6 | 38691.6 | 13.4% |
| predators-rhythm | 1 | not a cast counter | 0.0 | 0.0% |
| feast-of-the-fallen | 5 | not a cast counter | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### balam — seed 1702

Raw total: 324531.1; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 25245.4 | 7.8% |
| sun-claw | 6 | 71 | 142789.2 | 44.0% |
| heart-of-balam | 6 | 41 | 116910.3 | 36.0% |
| claw-cyclone | 6 | 59 | 37532.8 | 11.6% |
| bloodless-hunt | 1 | 27 | 2053.5 | 0.6% |
| feast-of-the-fallen | 5 | not a cast counter | 0.0 | 0.0% |
| bloodlust | 3 | not a cast counter | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### balam — seed 1703

Raw total: 158760.5; unexplained damage: 175.5.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 33531.1 | 21.1% |
| jaguar-roar | 6 | 59 | 48502.1 | 30.6% |
| sun-claw | 6 | 39 | 76551.7 | 48.2% |
| black-mirror | 1 | 28 | 0.0 | 0.0% |
| nine-lives | 3 | 0 | 0.0 | 0.0% |
| feast-of-the-fallen | 5 | not a cast counter | 0.0 | 0.0% |
| bloodlust | 1 | not a cast counter | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| unattributed | — | not a cast counter | 175.5 | 0.1% |

### ixchel — seed 1701

Raw total: 83009.5; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 18614.4 | 22.4% |
| jade-needles | 6 | 97 | 26786.4 | 32.3% |
| ancestor-flame | 6 | 71 | 30551.4 | 36.8% |
| raincaller | 5 | 30 | 7057.3 | 8.5% |
| ixchels-mantle | 2 | 3 | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### ixchel — seed 1702

Raw total: 153954.1; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 19027.4 | 12.4% |
| glyph-comet | 6 | 83 | 111955.1 | 72.7% |
| ixchels-mantle | 5 | 32 | 0.0 | 0.0% |
| raincaller | 6 | 41 | 18246.7 | 11.9% |
| ancestor-flame | 3 | 18 | 4724.9 | 3.1% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### ixchel — seed 1703

Raw total: 85438.1; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 18967.2 | 22.2% |
| jade-needles | 6 | 100 | 23992.3 | 28.1% |
| raincaller | 6 | 56 | 42478.6 | 49.7% |
| ixchels-mantle | 5 | 19 | 0.0 | 0.0% |
| verdant-mercy | 3 | 0 | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### kukul — seed 1701

Raw total: 117937.4; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 57919.0 | 49.1% |
| atlatl-volley | 6 | 109 | 30196.0 | 25.6% |
| skyfall | 4 | 36 | 29822.4 | 25.3% |
| plume-guard | 3 | 36 | 0.0 | 0.0% |
| jungle-instinct | 4 | not a cast counter | 0.0 | 0.0% |
| full-quiver | 2 | not a cast counter | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### kukul — seed 1702

Raw total: 166558.8; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 45229.9 | 27.2% |
| atlatl-volley | 6 | 125 | 38399.6 | 23.1% |
| skyfall | 6 | 51 | 27588.5 | 16.6% |
| featherstorm | 6 | 58 | 55340.8 | 33.2% |
| plume-guard | 1 | 8 | 0.0 | 0.0% |
| jungle-instinct | 4 | not a cast counter | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### kukul — seed 1703

Raw total: 295984.3; unexplained damage: 0.0.

| ID / source | Final level | Casts | Raw damage | Share |
| --- | --- | --- | --- | --- |
| basic-attack | — | not a cast counter | 45209.8 | 15.3% |
| featherstorm | 6 | 53 | 31444.5 | 10.6% |
| gale-ring | 6 | 59 | 194776.5 | 65.8% |
| plume-guard | 6 | 36 | 0.0 | 0.0% |
| atlatl-volley | 4 | 27 | 6792.6 | 2.3% |
| venomous-darts | 5 | not a cast counter | 17760.9 | 6.0% |
| full-quiver | 1 | not a cast counter | 0.0 | 0.0% |
| survivors-will | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |
| jade-bounty | innate; upgraded in choices log | not a cast counter | 0.0 | 0.0% |

### Damage concentration (descriptive, not a spec DPS threshold)

- ixchel/1702: glyph-comet supplies 72.7% (111955.1 raw damage). Review loadout dependence in a future balance task; area hits/overkill and the bot policy prevent treating this as proof of an incorrect coefficient.

- kukul/1703: gale-ring supplies 65.8% (194776.5 raw damage). Review loadout dependence in a future balance task; area hits/overkill and the bot policy prevent treating this as proof of an incorrect coefficient.

- balam/1701: sun-claw supplies 50.6% (145766.3 raw damage). Review loadout dependence in a future balance task; area hits/overkill and the bot policy prevent treating this as proof of an incorrect coefficient.

## Authored level-1 estimates against section 8 bands

The following numbers come from the JSON/specification, not the smoke-run damage totals. Use the explicit section-8 role column (damage 10–16, control 4–9, utility 0); a Summon-family row uses the more specific ≤15 band. An additional 6–12 per-enemy check is shown for explicit Area/Zone/Aura/Orbit/Whirlwind/Cleave/Cone/Line/Burst/Beam families. Hybrid roles and the spec’s own estimates conflict in places: flags are review candidates, not permission to rebalance or verified runtime bugs. No guessed hit counts or hero multipliers are folded into the supplied rounded estimates.

| ID | JSON family | Authored DPS | Table role / band | Table-role result | Explicit area-family 6–12 check |
| --- | --- | --- | --- | --- | --- |

In particular Raincaller (24.2), Atlatl Volley (18.5), Jade Needles (16.5) and Sun Dart (39.5) exceed the generic pure-damage upper band in the authored reference. Sun Dart is multi-target ricochet and Atlatl/Jade Needles are multi-projectile; their authored single-target estimates need deliberate mechanic-specific review, not a silent nerf here. Ixchel’s current compatibility mechanics do not validate her proposed new estimates.

All 48 authored hero cooldowns are within 3.5–18 seconds; all 16 Ixchel authored mana costs are within 14–32. Current regeneration is 11 × manaRegenMult per second (GameScene), with a 110 base pool and a 3-mana/0.9-second basic attack. Four largest authored costs total 121 mana versus 495 gross regeneration over 45 seconds; that single-use budget passes, but it is not sustained cooldown-spam sustainability. The four highest authored mana/CD rates total 14.46 mana/s before basic attacks, above base 11/s. Ixchel’s missing mana passives/redesign prevent final kit-level validation. No costs/regeneration or other numbers changed.

## Companion casts in legal 10-minute runs

Nine Saintess runs above plus three Balam/Tank and three Balam/Assassin runs retain normal acquisition (signature at 5, picks at 8/14), at most three skills and no replacements. A zero below is a real observed zero, not an omitted row. Unowned skills are not called dead; passives are not counted as casts. The real scene/asset/runtime warnings are retained in each JSON.

| Hero | Ally | Seed | Equipped skill: casts (passives marked) |
| --- | --- | --- | --- |
| balam | saintess | 1701 | healing-circle: 0; jade-ward: 19; sacred-fervor: passive |
| balam | saintess | 1702 | healing-circle: 0; jade-ward: 17; lifebond: 0 |
| balam | saintess | 1703 | healing-circle: 0; jade-ward: 27; sanctuary-dome: 16 |
| ixchel | saintess | 1701 | healing-circle: 11; jade-ward: 32; sanctuary-dome: 20 |
| ixchel | saintess | 1702 | healing-circle: 0; jade-ward: 0; saving-grace: passive |
| ixchel | saintess | 1703 | healing-circle: 2; saving-grace: passive; jade-ward: 5 |
| kukul | saintess | 1701 | healing-circle: 11; sanctuary-dome: 27; lifebond: 0 |
| kukul | saintess | 1702 | healing-circle: 1; jade-ward: 23; saving-grace: passive |
| kukul | saintess | 1703 | healing-circle: 0; jade-ward: 10; sacred-fervor: passive |
| balam | tank | 1701 | war-cry: 46; guardian-link: passive; clay-bomb: 40 |
| balam | tank | 1702 | war-cry: 46; clay-bomb: 56; bodyguard: passive |
| balam | tank | 1703 | war-cry: 45; shield-throw: 61; guardian-link: passive |
| balam | assassin | 1701 | ambush: 174; venom-blade: 73; smoke-bomb: 28 |
| balam | assassin | 1702 | ambush: 177; relentless-pursuit: passive; execute: 82 |
| balam | assassin | 1703 | ambush: 170; vanish: 24; smoke-bomb: 26 |

## Exhaustive controlled companion trigger audit

Controlled 600-second mock-scene AI audit; six 100-second active rotations, not legal in-run replacement or natural survival coverage.

| Role | Active skill | Casts in 600 s controlled audit |
| --- | --- | --- |
| saintess | healing-circle | 8 |
| saintess | jade-ward | 2 |
| saintess | cleansing-light | 1 |
| saintess | sanctuary-dome | 7 |
| saintess | radiant-beacon | 6 |
| saintess | lifebond | 8 |
| tank | bulwark-wall | 8 |
| tank | war-cry | 9 |
| tank | shield-bash | 13 |
| tank | ground-slam | 13 |
| tank | clay-bomb | 1 |
| tank | shield-throw | 15 |
| assassin | ambush | 30 |
| assassin | execute | 5 |
| assassin | venom-blade | 17 |
| assassin | silencing-dart | 13 |
| assassin | smoke-bomb | 10 |
| assassin | vanish | 6 |

| Role | Passive | Observed trigger/stat evidence |
| --- | --- | --- |
| saintess | saving-grace | 1 |
| saintess | sacred-fervor | 1 |
| tank | bodyguard | 1 |
| tank | guardian-link | 1 |
| assassin | relentless-pursuit | 1 |
| assassin | bounty-contract | 3 |

All 18 ally actives and six passive hooks are reachable in controlled coverage. This does **not** satisfy a literal “every ally skill casts in one natural run”: eight skills cannot fit the allowed three-slot/no-replacement loadout, and reactive healing can legitimately remain idle. Natural-run coverage is reported honestly above; the all-skills natural coverage gate remains open.

## Reproduction / evidence

- `node scripts/pacing-playtest.mjs --verification --label=balance --modes=quick`

- `node scripts/pacing-playtest.mjs --verification --label=companion-tank --heroes=balam --modes=quick --ally=tank`

- `node scripts/pacing-playtest.mjs --verification --label=companion-assassin --heroes=balam --modes=quick --ally=assassin`

- `node scripts/ally-skills-playtest.mjs --report=docs/skills-redesign/verification/dead-skills.json`

- `node scripts/summarize-verification.mjs`

Raw files: [balance](verification/balance.json), [Tank](verification/companion-tank.json), [Assassin](verification/companion-assassin.json), [controlled dead-skill report](verification/dead-skills.json). Historical before/after XP evidence remains in [PACING.md](PACING.md).
