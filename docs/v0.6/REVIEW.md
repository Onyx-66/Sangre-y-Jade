# V20 strict review — v0.6.0

Reviewed the current `release/0.6.0` working tree against `docs/v0.6/V06_SPEC.md`, `src/data/maps-v06.json` / `v06_design.json`, and the skills redesign validator. Scope includes the tracked changes and current local implementation; older generated preview files and unrelated edits were not staged by this review.

## Recommendation: do not ship

The unit/build gate passes, but the release criteria do not: 264 priority-zero audio files are absent, the Blood Moon art kit is absent and the other map kits still resolve to generic placeholder textures, pacing misses the level targets for Balam/Kukul, and the 4× frame sample is below the 60 FPS goal. The available bot evidence also has unresolved stuck reports and is not a three-seed / 20-minute device certification.

## Findings and fixes in this review

- **Fixed — collision-stopped enemies bypassed recovery.** `MapWorld.updateActors()` ignored ground actors with near-zero body velocity, so actors blocked against geometry never reached the 1 s nudge / 2 s reposition path. The detector now tracks stationary actors while preserving progress from slow movers. Added regression tests for both cases; map unit tests pass.
- **Fixed — compact landscape card bounds.** The EN/FR/AR menu browser matrix exposed map-name line-height and a 6 px French hero-card content overflow at 568×320. A narrowly scoped compact-landscape style restores the 1.35 line-height floor and reduces hero-stage/card spacing. All 18 requested landscape screen/language combinations proceed without assertion failures.
- **Corrected — stale browser-test assumptions.** The viewport check now follows the implemented two-page hero/map setup rather than a removed four-step wizard; its 476 checks pass. Settings checks count current settings and avoid measuring hidden Audio-tab geometry; the Audio voice toggle is tested when that tab is visible. The settings browser run still aborts with Playwright `ERR_STRING_TOO_LONG` before reporting, so this is not counted as a pass.

## Section 12 acceptance checklist

| # | Result | Evidence / review note |
|---|---|---|
| 1 Replace flow and pause Skills screen | Needs human | Unit suite covers replacement rules, cancel/pick and pause Skills. The recorded Arabic replacement browser run reports footer/card bounds outside 568×320; its screenshot appears contained, so the DOM audit and visual result need reconciliation. |
| 2 HUD, editable layouts, persistence/import/export | Pass with caveat | `test:hud`: 497 checks; HUD editor run: 92 checks. Persistence, clamping, import/export and overlap tests are included in the passing unit suite. Arabic settings browser matrix was not completed because of the Playwright transport failure below. |
| 3 Arabic direction, toggles and readable fonts | Needs human | 476 viewport and 100 typography browser checks pass; unit checks cover the shared switch. The dedicated settings browser matrix did not finish, so visible Audio-tab toggle geometry is not fully browser-certified. |
| 4 Fullscreen, spawns and safe-area layouts | Pass | `test:viewport`: 476 checks at seven widths/aspect ratios, EN/AR and both safe-area states; no side-bar assertion failures. |
| 5 Main-menu title and redesigned screens | Needs human | The 18 requested EN/FR/AR landscape captures at 568×320 and 1280×720 pass after this review’s fix. The same menu suite exits 1 on its additional 320×568 portrait guard (`description box taller than two lines`). |
| 6 Loader progress | Fail | Progress is monotonic and reaches 100%, but the loading playtest resolves the scene floor to generic texture key `ground`; selected-map terrain is not loaded/applied. Map art data is missing/incomplete (see #9). |
| 7 Enemy bars, roster, telegraphs, counts and pacing | Fail | Unit tests for roster values, telegraph timing/cancel and damage-after-warning pass. One 9-run sample shows target misses and the runtime harness still records stationary/stuck candidates; no three-seed pass is available. |
| 8 Four bosses, entries, phases, abilities, voice/music/bar | Needs human | The 3-minute boss harness records every ability cast and the unit suite passes phase/fairness tests, but browser assertions stop on absent audio warnings. Boss kill-time/voice/music playback evidence is not established. |
| 9 Finite maps, environments, weather, no stuck enemies, 60 FPS | Fail | Layout/property/weather unit tests pass, but the authored map art is not wired: Blood Moon has no `public/assets/pixel/maps/bloodmoon/` directory; the active kits have placeholder textures and no `artVersion`/image paths, so `mapArtManifest()` returns no map images. The 4× headless sample averaged about 47 FPS, not 60. Residual stuck reports need classification. |
| 10 Ally presentation | Pass with caveat | Ally visual audit recorded all 18 active skills across 600 simulated seconds per ally and stayed under the 24-FX cap. Human playback is still needed; the browser warning gate is affected by missing audio. |
| 11 Audio v2 and no missing P0 files | Fail | `npm run audio:check`: **0/461** files, **264 P0**, 85 P1, 112 P2 missing; 0/45 MB. Missing audio is intentionally left untouched under session rules. |
| 12 Tests, localization and version | Pass with caveat | `npm run check`: **620/620** tests and production build pass. `npm run test:i18n`: 726 dictionary / 168 runtime keys, zero untranslated. Skills validator: 108 entries pass with six orphan UI icon warnings. Browser suites listed above remain incomplete. |

## Runtime and balance evidence

Single seeded 10-minute bot sample (not the required three independent runs per hero/map):

| Map | Hero | Kills / end level | Level 10 | Level 20 | Outcome |
|---|---|---:|---:|---:|---|
| Overgrown | Balam | 92 / 7 | not reached | not reached | died at 213 s |
| Overgrown | Ixchel | 245 / 16 | 230 s | not reached | survived |
| Overgrown | Kukul | 337 / 15 | 301 s | not reached | survived |
| Blood Moon | Balam | 227 / 11 | 310 s | not reached | died at 374 s |
| Blood Moon | Ixchel | 325 / 20 | 215 s | 559 s | survived |
| Blood Moon | Kukul | 358 / 15 | 304 s | not reached | survived |
| Cenote | Balam | 360 / 16 | 274 s | not reached | survived |
| Cenote | Ixchel | 331 / 19 | 216 s | not reached | survived |
| Cenote | Kukul | 355 / 15 | 294 s | not reached | survived |

Against section 6.2 (level 10 at 210–270 s; level 20 at 480–570 s), Balam and Kukul miss level 10 on all surviving samples; Overgrown Balam dies before reaching it. Only Blood Moon Ixchel reaches level 20, near the upper edge. No tuning was made. Boss kill times were not measured. The existing 10-minute/map performance report records simulation-step p95 below 16.7 ms, but p99/max spikes include 193.5 ms on Overgrown; the separate full-kit desktop 4× sample reports 21.19 ms mean / 27.40 ms p95 (~47.2 FPS), 62 active / 67 allocated props. These are short headless samples, not sustained mobile FPS or the requested 20-minute runs. Memory growth is sampled and not a leak proof.

## Open release blockers

1. Install and verify all missing P0 audio, then rerun `audio:check` and audible playback tests.
2. Generate/register the missing Blood Moon art and wire all three map kits to actual image/ground records; verify the live game rather than only asset inventory.
3. Investigate the compact portrait hero description and reconcile the Arabic Replace-flow browser geometry report.
4. Re-run the settings, skill-FX and boss browser harnesses after fixing test/runtime setup; keep missing-audio warnings distinct from gameplay errors.
5. Obtain at least three independent pacing runs per hero/mode/map, boss kill times, classify residual stuck reports, and perform 20-minute 4× runs plus real-device mobile/Android checks. Current performance does not meet the specified 60 FPS target.

## V20 verification commands

- `npm run check` — **pass**, 620 tests + Vite build (main bundle 2,027.27 kB / 567.10 kB gzip; existing large-chunk advisory).
- `npm run test:hud` — **pass**, 497 checks.
- `npm run test:viewport` — **pass**, 476 checks.
- `npm run test:typography` — **pass**, 100 checks.
- `npm run test:menus` — requested landscape matrix passes; command exits 1 on the extra portrait guard.
- `npm run test:settings` — **inconclusive**, Playwright pipe fails with `ERR_STRING_TOO_LONG`.
- `npm run test:loading` — **fail**, selected-map floor still uses `ground`.
- `npm run test:i18n` — **pass**, 8 tests; no untranslated keys.
- Skills validator — **pass**, 108 entries; six orphan icon warnings.
- `npm run audio:check` — **fail**, 264 P0 files missing.
