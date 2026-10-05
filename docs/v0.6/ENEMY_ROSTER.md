# V8 — Enemy roster verification

Branch: `release/0.6.0`. Tag: `v0.6.0-v8`. Date: 2026-10-05.

## Implementation

All 15 records and attack parameters are compiled from the supplied `v06_design.json` by `scripts/compile-enemies-v06.mjs`. The generated `src/data/enemies-v06.json` is the runtime source, so the game does not require the untracked design documents. Each enemy has a separate handler in `src/enemies/`, registered in `ENEMY_BEHAVIORS`. Shared helpers and `EnemyBehaviorSystem` own steering, timed motion, warnings, serial-safe shields/reflection, summons, player DOT and pooled puddles.

The interrupted V7 health-bar, telegraph, elite and capped-pack foundations are included because V8 depends on them. XP formula, cacao probability, hero skills, milestone levels and boss scalar numbers are unchanged. No art/audio files, dependencies or protected files were changed. New enemy actors deliberately use existing base actors until the asset steps; unknown FX/audio hook ids use the existing placeholder/old sound and warn once, without failing file requests.

The design JSON has map rosters but no pack tables. Conservative per-map packs and unspecified geometry/speed decisions are recorded in `DECISIONS.md`. New enemies cannot leak into another map; ground-only Balam excludes both flying species; Guardian/Golem limits remain 2. Cultist children share the alive budget and disappear when their owner dies or is culled. Buried Lurkers wait for a nearby hero intentionally.

## Unit coverage

`tests/enemy-roster.test.js` has 25 tests, including every headline mechanic:

| Enemy | Verified headline |
| --- | --- |
| Shade | 0.35 s warning, 170 px dash at 420, one contact hit, 0.5 s +20% vulnerability |
| Bat | 1.5–2.5 s orbit at 210, captured 0.4 s marker, crossing dive, 1 s retreat |
| Jaguar | 0.55 s r80 landing marker, 0.4 s leap, 22 damage; one half-HP speed roar |
| Serpent | 110° r120 whip/knockback; invulnerable 1.1 s burrow and r70 emerge/knock-up |
| Priest | Kiting; nearest ally 40 HP/6 s Ward; 3 × 11 bolts, 210 speed/0.2 rad spread |
| Lurker | Buried, untargetable arrival; surface range; r90 snare, 12 damage/0.8 s root |
| Guardian | 90° front reduction 70%, flank/DOT unaffected; r100 slam/160 knockback |
| Wasp | 240-speed spit, 8 damage and exact 3 DPS × 3 s poison; range/silence |
| Wraith | Behind-player marker, blink, delayed 20-damage slash and 5 DPS × 3 s bleed |
| Archer | 380-speed piercing shot; below-half-HP three-arrow fan |
| Cultist | Timed two-Shade summoning, four-child/global caps, owner cleanup, pulse |
| Spirit | Dodgable Grasp pulls before damage; r50/6 s/35% moving puddles |
| Eel | 150 speed in water; 260 dash at 440; 18 contact + 8 water-chain damage |
| Golem | Timed 3 s/100% reflection; 8 warnings but one eight-shard volley |
| Wisp | 1.2 s fuse, r90/20 explosion/self-removal; early death or stun cancels |

Additional checks cover map/pack eligibility, exact generated data, source serials, shield expiry, target-following warnings, pause/end/stun/fear/hidden guards, precise DOT, pooled boss/enemy reset, muted missing-sound fallback and Trophy Hunter's new tough enemies. `tests/enemies-v06.test.js` adds 25 foundation tests for health-bar modes/chips, warning geometry/timing/cancellation, caps/off-screen packs and all five affixes. Combined: **50/50 pass**.

## Ten-minute map playtests

Command: `node scripts/v06-roster-playtest.mjs --label=final-roster`.

Real headless Chromium/Phaser physics at 30 Hz, fresh save, Kukul + Saintess, 1280×720, seed 1701, quick mode. The bot uses normal choices, damage, movement and dash: no forced XP, kills, hero invulnerability or enemy teleportation. Only pack *selection* prefers still-unseen eligible types; map rules, timing, cap, stats and off-screen placement are unchanged. All three maps use their existing endless terrain. Presentation audio is muted for deterministic simulation, not an audibility test.

| Map | Simulated duration | Kills | Lv 10 | Lv 20 | End level | Cacao | Peak alive | Peak FX / warnings / puddles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Overgrown | 10:00 | 280 | 5:58.27 | Not reached | 14 | 102 | 12 | 24 / 6 / 0 |
| Bloodmoon | 10:00 | 306 | 5:24.43 | Not reached | 16 | 96 | 14 | 24 / 5 / 0 |
| Cenote | 10:00 | 274 | 5:49.07 | Not reached | 14 | 70 | 16 | 24 / 12 / 19 |

Every eligible roster member spawned and every non-constant attack resolved at least once in each map run. No JavaScript exceptions, console errors, HTTP failures or stuck enemies. The audit rejects an unexplained stationary actor for over 20 s, excluding documented buried/rooted/stunned/warning/motion/recovery states. All runs complete 600 gameplay seconds and respect the 24 FX / 64 telegraph / 128 puddle budgets.

| Attack | Overgrown casts | Bloodmoon casts | Cenote casts |
| --- | --- | --- | --- |
| Shade — Lunge | 68 | 116 | 96 |
| Bat — Swoop Dive | 9 | 4 | 26 |
| Jaguar — Pounce / Pack Roar | 26 / 11 | 24 / 15 | 38 / 8 |
| Serpent — Tail Whip / Burrow | 22 / 27 | 21 / 24 | 18 / 23 |
| Priest — Soul Volley / Ward | 34 / 22 | 22 / 15 | 45 / 29 |
| Lurker — Root Snare | 15 | — | — |
| Guardian — Ground Slam | 8 | — | — |
| Wasp — Venom Spit | 122 | — | — |
| Wraith — Blink Strike | — | 11 | — |
| Archer — Aimed Shot | — | 26 | — |
| Cultist — Summon / Blood Pulse | — | 7 / 8 | — |
| Spirit — Grasp | — | — | 12 |
| Eel — Dash Zap | — | — | 15 |
| Golem — Prism Shield / Shard Burst | — | — | 23 / 20 |
| Wisp — Detonate | — | — | 10 |

Full per-type spawn counts, timing, damage, TTK samples, skill/ally casts and expected one-time placeholder warnings are in `previews/v8/roster/final-roster.json`. These are **coverage-biased roster checks**, not the V7 six-hero/mode pacing study. Level 10 is later than the 3:30–4:30 quick target and level 20 is not reached; cacao differs across maps. Report these outliers without tuning numbers in V8.

## Visual and integration checks

`node scripts/v06-roster-visual.mjs`: **67 checks pass** in both the worktree and staged-only snapshot, 12 screenshots each, all three maps in EN/AR at 568×320 and 1280×720. Actual body radii match the roster, full spawn footprints are at least 120 world pixels outside the real view, every eligible enemy and its health bar renders, and EN/AR bar geometry is identical. Preview fixtures intentionally reposition enemies after verifying their real spawn positions. All captures/contact sheets were viewed. Committed evidence: `previews/v8/staged/readability/report.json` and `contact.png` (without the earlier unfinished HUD-editor/UI changes).

The full working-tree `npm run check` still has the unrelated pre-existing French `MANA`/`Cacao` audit failure (441/442), so its `&&` build is skipped. The production build was run separately and passed. A staged-only snapshot excludes prior unfinished menu/editor/localization changes and verifies that this commit does not depend on them; final results are recorded in `PROGRESS.md`.

## Remaining limitations

- No new enemy sprites/stills/recordings yet; the temporary existing-actor/FX/audio fallbacks are intentional. No Android device/emulator or audible manual audio test was used.
- Cenote water is a query hook plus visible Spirit puddles until finite map geometry exists.
- V7 pacing/cacao targets need their own completed before/after study; this prompt makes no balance claims beyond the specified exact enemy values.
- FR/AR labels need native review. Earlier unrelated dirty files/assets remain uncommitted and preserved.
