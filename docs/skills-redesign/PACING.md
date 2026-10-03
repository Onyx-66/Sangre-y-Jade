# XP pacing — Step 20

Measured on 2026-10-03. 18 baseline and 18 final full-duration attempts, three seeds per hero/mode. All timings are **simulation/game clock**, not wall time or time spent choosing cards. End level is at the survival timer (600/1200 seconds), before the final boss fight.

## Results

Milestone observations inside the specified windows: **1/36 before → 28/36 after**. 18/18 final runs survived to their mode timer; 0 browser runtime errors. **8 target-window misses remain**, listed individually below. These are not a claim that all pacing targets pass.

| Mode | Level 10 target | Level 20 target |
|---|---|---|
| 10 min | 3:30–4:30 | 8:00–9:30 |
| 20 min | 4:00–5:30 | 9:00–12:00 |

### Medians (after range in parentheses)

Medians are withheld (—) if any run did not reach that milestone, rather than silently dropping the censored observation. Ranges show reached observations only; the pass counts include every run.

| Hero | Mode | Level 10 before → after | Level 20 before → after | After in-window L10; L20 |
|---|---|---|---|---|
| balam | 10 min | 2:03 → 3:32 (3:29–4:18) | 4:42 → 8:52 (7:56–9:26) | 2/3; 2/3 |
| balam | 20 min | 2:04 → 4:51 (4:50–4:56) | 5:50 → 10:26 (9:49–10:28) | 3/3; 3/3 |
| ixchel | 10 min | 2:29 → 3:27 (3:21–3:31) | 6:45 → 9:04 (8:07–9:11) | 1/3; 3/3 |
| ixchel | 20 min | 3:25 → 4:37 (3:08–4:53) | 7:56 → 10:30 (8:52–11:18) | 2/3; 2/3 |
| kukul | 10 min | 2:21 → 4:05 (4:03–4:14) | 5:11 → — (7:48–8:45 (some not reached)) | 3/3; 1/3 |
| kukul | 20 min | 2:23 → 5:25 (5:18–5:30) | 6:20 → 10:54 (10:26–11:29) | 3/3; 3/3 |

### Every run

Status uses unrounded seconds; displayed times are rounded to the nearest second. IN = inside the inclusive target window; EARLY/LATE/NOT REACHED are failures to meet that window. A dash is not treated as zero or excluded from the pass count.

| Hero | Mode | Seed | Before L10 | After L10 | Before L20 | After L20 | End level before → after | After elapsed |
|---|---|---|---|---|---|---|---|---|
| balam | 10 min | 1701 | 2:05 EARLY | 3:29 EARLY | 6:36 EARLY | 8:52 IN | 24 → 24 | 10:00 |
| balam | 10 min | 1702 | 2:03 EARLY | 3:32 IN | 4:41 EARLY | 7:56 EARLY | 44 → 24 | 10:00 |
| balam | 10 min | 1703 | 2:02 EARLY | 4:18 IN | 4:42 EARLY | 9:26 IN | 41 → 21 | 10:00 |
| balam | 20 min | 1701 | 2:04 EARLY | 4:50 IN | 5:49 EARLY | 10:28 IN | 62 → 34 | 20:00 |
| balam | 20 min | 1702 | 2:03 EARLY | 4:51 IN | 5:50 EARLY | 9:49 IN | 63 → 43 | 20:00 |
| balam | 20 min | 1703 | 2:08 EARLY | 4:56 IN | 7:01 EARLY | 10:26 IN | 54 → 40 | 20:00 |
| ixchel | 10 min | 1701 | 3:25 EARLY | 3:21 EARLY | 9:04 IN | 9:11 IN | 21 → 21 | 10:00 |
| ixchel | 10 min | 1702 | 2:29 EARLY | 3:31 IN | 6:45 EARLY | 8:07 IN | 30 → 22 | 10:00 |
| ixchel | 10 min | 1703 | 2:26 EARLY | 3:27 EARLY | 6:32 EARLY | 9:04 IN | 25 → 21 | 10:00 |
| ixchel | 20 min | 1701 | 3:31 EARLY | 4:53 IN | 8:24 EARLY | 11:18 IN | 36 → 31 | 20:00 |
| ixchel | 20 min | 1702 | 3:25 EARLY | 4:37 IN | 7:56 EARLY | 10:30 IN | 37 → 31 | 20:00 |
| ixchel | 20 min | 1703 | 2:43 EARLY | 3:08 EARLY | 7:34 EARLY | 8:52 EARLY | 36 → 34 | 20:00 |
| kukul | 10 min | 1701 | 2:21 EARLY | 4:14 IN | 5:29 EARLY | — NOT REACHED | 29 → 19 | 10:00 |
| kukul | 10 min | 1702 | 2:17 EARLY | 4:05 IN | 4:53 EARLY | 8:45 IN | 34 → 22 | 10:00 |
| kukul | 10 min | 1703 | 2:22 EARLY | 4:03 IN | 5:11 EARLY | 7:48 EARLY | 35 → 27 | 10:00 |
| kukul | 20 min | 1701 | 2:23 EARLY | 5:30 IN | 6:20 EARLY | 11:29 IN | 57 → 31 | 20:00 |
| kukul | 20 min | 1702 | 2:20 EARLY | 5:18 IN | 6:27 EARLY | 10:26 IN | 57 → 38 | 20:00 |
| kukul | 20 min | 1703 | 2:25 EARLY | 5:25 IN | 6:16 EARLY | 10:54 IN | 57 → 36 | 20:00 |

## The XP-only change

Previously: first pick 18 XP, then `round(18 + level * 11 + level^1.25 * 2.5)`, requiring 819 total XP for level 10 and 3,306 for level 20. Initial cost and milestone levels are unchanged. Only the formula assigning `stats.nextXp` changes:

```js
const baseXp = 18 + this.stats.level * 11 + Math.pow(this.stats.level, 1.25) * 2.5;
const earlyXp = 18 + 9 * 11 + Math.pow(9, 1.25) * 2.5;
const mage = this.heroData.id === 'ixchel';
const heroXp = mage
  ? baseXp * 1.25
  : baseXp * 2.5 - 15 - Math.max(0, baseXp - earlyXp) * .7;
this.stats.nextXp = Math.round(heroXp * (this.modeData.id === 'full' ? (mage ? 1.1 : 1.09) : 1));
```

The uniform ×1.6 trial still rushed Balam/Kukul, but one Ixchel run failed to reach 20. An affine trial with a flat +60 mage cost delayed Ixchel's early upgrades too severely; that candidate was rejected. A full candidate matrix then exposed late level-20 picks, so the retained formula eases the Balam/Kukul slope continuously after the cost of level 9 (no jump or time gate), with their full-mode factor lowered from 1.10 to 1.09. A second matrix tested a small Ixchel early-cost change (×1.2 +10); that produced worse results, including one unreached level 20, and was reverted to ×1.25 with the original full-mode ×1.10. Costs remain increasing, calibrated for the slower **currently shipped** Ixchel kit and the two stronger heroes. No enemy XP, damage, cooldowns, mana, drops, spawning, draft rules, companion rules, milestone levels or save data changed. This calibration needs remeasurement after the missing Ixchel Step 9 conversion; it does not implement that conversion.

| Hero | Mode | Total XP to level 10 | Total XP to level 20 |
|---|---|---|---|
| Balam / Kukul | 10 min | 1,901 | 7,320 |
| Balam / Kukul | 20 min | 2,072 | 7,978 |
| Ixchel | 10 min | 1,019 | 4,128 |
| Ixchel | 20 min | 1,120 | 4,539 |

## Reproduction and audit limits

- Run `node scripts/pacing-playtest.mjs --label=after` and `node scripts/summarize-pacing.mjs` with installed local Chrome/Node/dependencies. The baseline uses the old formula and the same bot. Scripts make no internet requests or downloads; the browser serves assets from local Vite. Add `--require-targets` to the summarizer for a nonzero exit when any individual milestone misses its window.
- Seeds 1701, 1702, 1703; both Math.random and Phaser's RNG seeded at scene creation. Normal Overgrown Temple, fresh isolated browser context/save, no shrine upgrades, default high enemy density, auto attack/aim. Identical bot policy before/after. Starting presentation-only Step 19 edits remain uncommitted; they do not affect combat/XP.
- Real Phaser update, enemy AI/spawns, bosses, collision damage, skill cooldowns, timers/tweens, loot attraction/collection, drafts, passives and companions. 30 Hz game frames with the normal 60 Hz Arcade physics, and camera pre-render for correct offscreen spawning. Headless rendering/HUD refreshes and deliberation time are omitted. No forced kills, spawned test enemies, XP grants, revives, teleporting, invulnerability or inflated stats.
- Fixed bot seeks drops and avoids nearby enemies/projectiles, casts owned skills and chooses offered cards by priority (recorded in the script). Saintess is preferred; the bot does not reroll builds or swap skills. Random offers can produce low-damage builds, especially for current Ixchel. This is a repeatable bot benchmark, not proof of novice/phone player pacing or all possible builds/maps.
- Raw [before](pacing/before.json) and [after](pacing/after.json) include every level timestamp, cumulative collected XP, 30-second samples, kills/damage, loadouts and every draft decision. [Uniform trial](pacing/trial-160.json), [affine trial](pacing/trial-calibrated.json), [first full calibration](pacing/trial-matrix.json) and [second full calibration](pacing/trial-matrix-2.json) preserve rejected results. Baseline pilot seed 1701 reproduced its exact three-hero quick-mode timings in the main baseline.

## Remaining target misses

- balam/quick/1701 level 10: 3:29 EARLY
- balam/quick/1702 level 20: 7:56 EARLY
- ixchel/quick/1701 level 10: 3:21 EARLY
- ixchel/quick/1703 level 10: 3:27 EARLY
- ixchel/full/1703 level 10: 3:08 EARLY
- ixchel/full/1703 level 20: 8:52 EARLY
- kukul/quick/1701 level 20: — NOT REACHED
- kukul/quick/1703 level 20: 7:48 EARLY

These trials do not establish a curve that places every random loadout in the target windows; the remaining acceptance misses stay open. Do not change milestones or hide misses with time-gated levels. Keep the raw evidence for further XP calibration and remeasure when the intended Ixchel kit is available.
