# Skills overhaul progress

## Prompt checklist

Names for prompts 2-23 were not supplied; see DECISIONS.md. Placeholder names do not authorize or define future work.

- [x] 01 — Read-only investigation and project setup
- [x] 02 — Five confirmed skill and combat fixes
- [ ] 03 — Name not supplied
- [ ] 04 — Name not supplied
- [ ] 05 — Name not supplied
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
