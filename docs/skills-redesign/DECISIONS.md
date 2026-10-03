# Skills overhaul decisions and investigation

## Step 1 — 2026-10-03

Source revision: `02a8063fa54288e2589496c413fc7d81dd7dbeec` (v0.5.0). Branch: `feature/skills-overhaul`. These are observations of unchanged source, not redesign decisions or implemented fixes. Line numbers below refer to this revision.

### Section 2: re-check of all 12 claims

| # | Result | Actual evidence and qualification |
|---|---|---|
| 1 | CONFIRMED | `src/data/heroes.js:123-126`: the per-type description table overwrites every hero skill description at line 126. Imported data contains 60 skills, 13 types and 13 distinct descriptions. `src/systems/Hud.js:154,207` consumes these descriptions. |
| 2 | CONFIRMED | `src/scenes/GameScene.js:434-515`, specifically the switch at line 450, dispatches by `skill.type`, not ID. Per-skill numeric parameters vary, but mechanics and effect helpers are shared by type. |
| 3 | CONFIRMED | `GameScene.js:476-480`: orbit fires radial projectiles at speed 330 and grants `7 + level * 3` shield. No orbit motion or orbiting attachment exists. |
| 4 | CONFIRMED | `GameScene.js:494,512` both add `skill.restore`. `src/data/heroes.js:71` sets Ixchel's Mantle to shield type, mana cost 30 and restore 40. Two +40 restores occur after payment, capped separately at max mana; the cap can hide the double application. |
| 5 | CONFIRMED | `GameScene.js:549-560`: tint is accepted but never applied; line 556 clears it. `GameScene.js:991-993`: ring tint is accepted but discarded when delegating to effect row 4. Existing embedded raster colours remain visible, but caller colours have no effect. |
| 6 | CONFIRMED | `src/art/TextureFactory.js:6-7,23-25` loads six effect families, each with four standalone frames. `GameScene.js:1007-1013` selects them by row. These are separate PNGs, not a runtime sheet, but the six shared families claim is correct. |
| 7 | CONFIRMED | `GameScene.js:619-626` uses the same `trap` image for every hero trap; `646-650` uses the same `summon` image for every hero summon. `TextureFactory.js:11-12` maps these to `weapon-ixchel.png` and `icon-8.png`. The trap and summon images differ from one another; all skills within each category share theirs. |
| 8 | CONFIRMED | `GameScene.js:606-616`: candidates are filtered by player distance at 608 and sorted once by first-target distance at 609. Updating `previous` at 615 only changes the drawn line; no per-hop range check occurs. |
| 9 | CONFIRMED | `GameScene.js:298` multiplies velocity by 0.5 for any active `slowUntil`. Enemy initialization at 759 and 779 contains no `slowPct`. |
| 10 | DIFFERENT | The shared cast sound is confirmed at `GameScene.js:514`; line 429 is the basic ranged attack sound, not a second skill-cast sound. `src/systems/AudioDirector.js:10-24` declares exactly 13 SFX IDs. Throttling is 75 ms for pickup and 35 ms otherwise at 108-109; skill-specific audio IDs do not exist. |
| 11 | DIFFERENT | `src/art/uiArt.js:2-6` maps both Smoking Mirror and Ixchel's Mantle to 29 and reuses hero icons for stats. `Hud.js:38,40` and `src/main.js:199` reuse icons for attack, dash and shrine. Ancestor Chorus maps to 40 (crescent and droplets); Moon Tears maps to 41 (feather mantle), verified by viewing those PNGs and `art-source/icons.png`. This is not a simple reciprocal art swap. Icons 0 and 23 have no runtime references; icon 20 is absent from the hero map but IS used by Saintess Sanctuary at `src/data/supports.js:11`. |
| 12 | CONFIRMED | `src/data/heroes.js:28` promises Night Pounce crit refresh; the dash branch at `GameScene.js:503-506` and crit calculation at 655-656 implement no refresh. Hunter's Mark is a chain at `heroes.js:33` and `GameScene.js:497-498`, not a mark. Mark fields do exist, but `src/systems/SupportSystem.js:86` sets them for Assassin Death Mark. Four Directions has four projectiles at `heroes.js:67`, but `GameScene.js:454-459` makes a forward fan because radial behavior requires count >= 8. |

### Save IDs and migration

`src/systems/SaveSystem.js:1-29` stores a version-1 save under `sangre-y-jade-v0.1`. It includes cacao, run/victory counts, intro status, skin/map IDs, four permanent upgrade levels, records and settings. `load()` merges defaults (`31-53`); `commit()` serializes that object to localStorage (`56-63`). `recordRun()` (`101-115`) keys records by hero:map:mode and stores only survived time, victory and best kills. `src/main.js:157-158` passes a run summary, but the skill loadout is not persisted. Skills and companion skills only live in the current scene (`GameScene.js:52-54`). There is no saved skill unlock list or codex skill-ID list.

Decision: no skill-ID save migration or save-version bump is currently needed. Keep the existing save key/version unless a later explicitly scoped change adds persisted skill state. The merge preserves unknown stored fields, but no current producer writes skill IDs.

### Enemy tiers and Trophy Hunter

There is no tier/elite field in `src/data/world.js:39-45` or spawned enemy data (`GameScene.js:754-760`). Enemy categories are shade, bat, jaguar, serpent and priest. `src/systems/CombatRules.js:4-11` unlocks serpent at hero level 3 or run progress > 12%; jaguar at level 5 or > 28%; priest at level 9 or > 42%. Bat is excluded for ground-only heroes. Spawn selection is weighted (`GameScene.js:739-741`), with map/time scaling at 749 and 756-757, not discrete tiers. Bosses carry `isBoss: true` and `bossId` (`775-779`); ground-only boss substitutions are `jaguar-chief` and `high-priest` (`CombatRules.js:13-18`).

Decision: follow Trophy Hunter's explicit catalogue definition (`skills_redesign.md:1047-1049`): `type === 'jaguar' || type === 'priest' || isBoss`. Do not infer toughness from scaled HP, damage, ranged status, map or elapsed time. This also covers substituted ground bosses via `isBoss`.

### Mana, Phaser and controls

- Phaser is exactly **3.90.0** in package.json and the installed package. No engine/dependency changes made.
- `GameScene.js:243-248` restores **11 mana per second**, capped at max mana, when maxMana is nonzero. Paused/end-state updates do not regenerate. Ixchel starts at **110/110** (`heroes.js:49` and `GameScene.js:67-68`); an empty pool takes 10 seconds to fill with no spending.
- Ixchel's basic attack costs **3 mana**, cooldown **0.9 seconds** (`heroes.js:50`). While continuously attacking with zero haste, the nominal net regeneration is about **7.67 mana/s** (11 - 3/0.9); cooldown recovery, actual target availability and skill spending change this. Healing/resource skills and Saintess Spirit Well can restore additional mana. Do not balance against 11/s without considering basic-attack spending.
- Auto/manual attack mode gates **basic attacks**, not active-skill buttons (`GameScene.js:247-248,412-431`). Manual basic attacks use held F, held attack button or canvas pointer. Auto mode attacks a nearby target automatically; with no target it waits. Q/E/R/T remain explicit casts in both modes (`151-156`); HUD pointerdown calls the skill callback in both modes (`Hud.js:62-65`). Skills do not automatically cast when ready. Cooldown, mana and pause checks remain at `GameScene.js:434-440`. Manual canvas aiming overrides auto-aim at `517-521`.

### Progression coverage

Existing scripts do not contain a complete survival bot or measure level-10/20 timestamps. `extended-playtest.mjs:16-26` runs each hero in quick mode briefly, gives invulnerability, raises nextXp to 100000 and casts injected skills. `v05-playtest.mjs` sets level 4/5/6 directly; `v05-combat-test.mjs` forces a multi-level XP gain and checks level >= 7. Thus maximum naturally reached levels for 10- and 20-minute runs are **not measured**, for any hero, and must not be inferred from forced QA levels. No new bot or balance change is part of step 1.

The current XP formula (`GameScene.js:64,849-854`) yields **819 total XP for level 10** and **3306 for level 20**, confirming the spec. Modes last 600/1200 seconds (`world.js:34-37`). Boss timing uses quarters of duration (`GameScene.js:251-259`).

### Scope and conservative resolutions

1. The current prompt overrides spec sections 5-7: future images use the requested gpt-image-2.5 Flare variant (Sunburst only to repair one bad result); FX are still `main.png` / `accent.png` and passive `proc.png`, animated in code; SFX are code-generated WAVs. Music, recordings and existing frame sheets are excluded. No assets were created or migrated in step 1.
2. The prompt refers to "23 prompts below", but no list of their names was included and the supplied specification has 8 implementation phases, not a 23-prompt sequence. PROGRESS.md therefore has the actual step-1 name and 22 explicitly unnamed placeholders. Replace those names only when supplied; do not invent future scope.
3. Section 4.5's introductory "keep the current way" conflicts with the detailed acquisition flow in section 3.10 and JSON rules. For later work, follow the precise signature-at-5 / picks-at-8-and-14 flow; no change now.
4. The v0.3 playtest is stale: it attempts `#run-attack` immediately on the hero screen (`scripts/v03-playtest.mjs:29-30`) although sequential setup now exposes that selector on the combat-options step. Keep the failed baseline and defer script updates; nothing introduced by step 1 requires a game-code repair.
5. Tests, build and all six browser scripts ran once after branch setup. Diagnostic wrappers live only here and place screenshots/reports in a new temporary working directory, preserving tracked artifacts and runtime files. Android smoke scripts require a separate device/emulator workflow and are not browser playtests; no APK build or device writes were requested for step 1.
6. The supplied validator checks data text/ownership/rules and icon file presence, not visual uniqueness by image content, actual handlers, SFX files or FX runtime behavior. Its passing `--allow-new` result is a data sanity check, not overhaul acceptance. All 108 expected renamed/new icon files are currently missing. `migrate_icons.mjs` was read but not executed.
7. Starting untracked `public/assets/ui/menu/` files are unrelated user work and remain unstaged. All six supplied design files are preserved and included with this investigation. No game version bump; use documentation tag `v0.5.0-skills-step1` for the single commit to honor the standing version-tag instruction. No push is part of this prompt.
