# Skills overhaul progress

## Prompt checklist

Names for prompts 2-23 were not supplied; see DECISIONS.md. Placeholder names do not authorize or define future work.

- [x] 01 — Read-only investigation and project setup
- [x] 02 — Five confirmed skill and combat fixes
- [x] 03 — Handler, status-effect and passive engine foundations
- [ ] 04 — Name not supplied
- [x] 05 — Hero slots, level milestones, HUD and draft (section 3.6)
- [ ] 06 — Name not supplied
- [ ] 07 — Name not supplied
- [ ] 08 — Name not supplied
- [ ] 09 — Name not supplied
- [ ] 10 — Name not supplied
- [ ] 11 — Name not supplied
- [ ] 12 — Name not supplied
- [ ] 13 — Name not supplied
- [ ] 14 — Name not supplied
- [ ] 15 — Name not supplied
- [ ] 16 — Name not supplied
- [ ] 17 — Name not supplied
- [ ] 18 — Name not supplied
- [ ] 19 — Name not supplied
- [ ] 20 — Name not supplied
- [ ] 21 — Name not supplied
- [ ] 22 — Name not supplied
- [ ] 23 — Name not supplied

## Step 1 — 2026-10-03 — Complete

- **Changed:** created `feature/skills-overhaul`; preserved/versioned the six supplied design files; added BASELINE.md, DECISIONS.md, this checklist, raw command results, and two documentation-only Node diagnostic helpers. Rechecked all 12 specification claims with current line numbers; recorded saves, enemy categories, mana, Phaser, controls, pacing coverage, asset dimensions and complete audio inventory. No game code, dependency, asset, music, narration, old icon/data or protected-file changes; no internet download or icon migration.
- **Tests:** existing unit suite 23/23 passed; production build passed (existing chunk-size warning). Browser playtests passed: standard 23 checks, extended 8, v0.4 47, v0.5 124, v0.5 combat 26, all with zero runtime errors. Legacy v0.3 passed 26 checks before a stale `#run-attack` selector timeout. Supplied data validator passed with `--allow-new`, reporting the expected 108 missing icons. Each command ran once; full commands, timings and output are in BASELINE.md and baseline-results.json.
- **Open issues:** later prompt names 2-23 are missing; no existing full-run bot provides level-10/20 timing or maximum levels in either mode; legacy v0.3 setup selectors need updating in an appropriate future step; all overhaul implementation and skill-specific asset generation remain future work. Icon/source and other partial audit inaccuracies are detailed in DECISIONS.md.
- **Commit/version:** single documentation/setup commit labelled `[v0.5.0-skills-step1]`, annotated tag `v0.5.0-skills-step1`; application version remains 0.5.0. Starting untracked `public/assets/ui/menu/` work remains outside this commit. Stop after step 1; no push or step 2 implementation requested.

## Step 2 — 2026-10-03 — Complete

- **Changed:** retained each authored hero-skill description and exposed the type description as a HUD fallback; restored Ixchel's skill mana once; applied skill tints to projectile and ring effects; chained to the next in-range enemy from the last hit; applied `slowPct` with the legacy 50% default. Added focused Node unit coverage for all five fixes and updated the existing locale test to match its skill-name translation coverage. No new dependencies, assets, or saves.
- **Tests:** `npm run test` — 28/28 passed. `npm run build` — succeeded (32 modules); the existing >500 kB JS chunk warning remains. No additional playtest was in this step's request.
- **Open issues:** authored skill descriptions are English and remain untranslated in French/Arabic; the old locale test had implicitly tested the replaced generic descriptions and now limits its skill assertions to translated names. The redesign spec's translation phase remains future work. Existing large-chunk warning is unchanged.
- **Commit/version:** one commit labelled `[v0.5.0-skills-step2]`; annotated tag `v0.5.0-skills-step2`. Application package version remains 0.5.0.

## Step 3 — 2026-10-03 — Complete

- **Changed:** added the ID-keyed active-handler registry and the eight shared helpers (area, cone, line, projectile, orbit, zone, summon, status), with a timed-effect lifecycle. Centralized the specified level scaling and shared mana/cooldown handling while retaining every old skill under a clearly marked step-10 legacy fallback. Added fear, confuse, root, pull, burn, blind and hero concealment; retained slow, stun, taunt, silence, disarm, poison, bleed and mark; reset status data on enemy reuse. Wired all eight hero effect fields into combat, resource regeneration and recovery. Added an event bus for all eight specified events with source/ally attribution, plus the two innate traits at level 1 on every hero, without using a skill slot. Kept companion DOT compatibility and ally attribution. Added Node regression coverage using the real scene methods with only rendering mocked.
- **Tests:** final `npm run test` — **53/53 passed**, including one test for every status, all 60 old skills at all 6 levels (360 fallback casts), registry/legacy resource handling, all event sources, all five innate-trait value levels, XP-only attraction, single pickup healing, hero effects and shared-helper lifecycle. Final `npm run build` — passed, 38 modules, existing >500 kB chunk warning. Existing browser scripts passed against the built game: `playtest.mjs` **23 checks** (98.93 s), `extended-playtest.mjs` **8 checks** (76.87 s), `v05-combat-test.mjs` **26 checks** (28.99 s); zero runtime errors. The final XP-only attraction refinement is additionally covered by the final unit suite.
- **Browser reports:** `%TEMP%/syj-skills-step3-BaCKbW/playtest/artifacts/playtest-report.json`, `%TEMP%/syj-skills-step3-BaCKbW/extended-playtest/artifacts/extended-playtest-report.json`, `%TEMP%/syj-skills-step3-support-Pyw7XR/artifacts/v0.5/combat.json`. Local preview processes were stopped after testing; tracked screenshots/reports were not overwritten.
- **Open issues:** no failing step-3 checks. Individual hero handlers, passive draft/HUD changes and dedicated art/audio are still later-step work. Previously documented authored-description FR/AR coverage and the build chunk warning remain. No assets, music, voice recordings, hand-made effect frames, dependencies or save migration were created/changed.
- **Commit/version:** one commit labelled `[v0.5.0-skills-step3]`; annotated tag `v0.5.0-skills-step3`. Application package version remains 0.5.0. Stop after this step; no push or later-step implementation included.

## Step 5 — 2026-10-03 — Complete

- **Changed:** replaced the global capacity with `SLOT_RULES` / `slotCount`: 3 active Q/E/R slots and one passive slot initially, passive slot 2 at hero level 10, active slot 4 (T) at level 20, active max level 6, passive max level 5. `GameScene` tracks active and passive slots separately, gates locked keyboard/button input, updates cooldowns by current active count, and passes that count into the HUD skill-slot data source. Draft choices now carry `kind` and use new/upgrade/swap/stat types; they avoid duplicate IDs, guarantee an active when available, include a passive on every even-level normal draft while its slot is free, limit swap to one 15% card, and keep boss rewards skill-only and upgrade-first. Fully maxed normal drafts include stat cards and a heal. Milestones run after the normal choice by earned level, so jumps process level 10/20 once. Existing 60 hero skills remain active; innate traits remain slotless.
- **Tests:** `npm run check` — **62/62 tests passed** and production build passed (38 modules; existing >500 kB chunk-size warning). Focused checks cover slot totals, locked-T cooldown/input behavior, uniqueness, passive cadence, swap cap, boss contents, maxed fallback and 9→11 / 19→21 milestone sequencing.
- **Open issues:** the prompt explicitly defers hero-only passive skills, so level 10 unlocks the passive slot and consumes its milestone once with a notice instead of fabricating three passive choices; the existing pool has no eligible passives. The level-20 active milestone works with the current hero pool. Step 4 was not included in this prompt. No assets, audio, dependencies or save data changed.
- **Commit/version:** one commit labelled `[v0.5.0-skills-step5]`, annotated tag `v0.5.0-skills-step5`; application package version remains 0.5.0.
