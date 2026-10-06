# v0.6 Progress

## Prompts

- [x] 01 — Replacing skills
- [x] 02 — HUD clarity and fixed EN/AR positions
- [x] 03 — Shared toggles and paused settings
- [x] 04 — Fullscreen viewport and safe areas
- [x] V1 — Typography and shared design tokens
- [x] V2 — Generated UI kit and nine-slice preview
- [x] V6 — Real weighted run loading and recovery
- [x] V8 — Complete enemy roster and behaviours
- [x] V9 — Generated enemy frames, effect stills and animation integration
- [x] V10 — Boss controller, entry cinematics and fairness framework

## Prompt 01 — Replacing skills — 2026-10-04

Branch: `release/0.6.0`, created from `feature/skills-overhaul` at `752c442`. Version tag: `v0.6.0-step01`.

### Changed

- Wrote the failing reproduction before production edits: full slots have no deterministic replacement on a missed random roll; milestone cancellation discards its pending screen. The old active/passive swap mutation itself worked. Details and conservative choices are in `DECISIONS.md`.
- Replaced the random swap card/path with a secondary **Replace a skill** action on normal level-up, milestone and boss-reward screens. Full active/passive kinds with unowned skills qualify; innates do not.
- Added remove → same-kind unowned candidates → explicit confirmation. Every Back restores the original cards without spending or rerolling. Confirmation uses one pending pick, keeps the slot index, starts at level 1 and resets its ready cooldown or passive subscriptions/counters/modifiers immediately. Removed skills remain available in later drafts.
- Added the pause menu's read-only Skills entry, including levels, descriptions and the two innate traits. Its own list scrolls while Back remains visible. Added scoped mobile/RTL layouts and EN/FR/AR replacement copy; corrected the hero-selection subtitle in all three languages.
- Updated tests and the pacing bot's obsolete swap-card scoring. No art, audio, branding, dependency, save-format or package-version changes; earlier unfinished files remain untouched by this commit.

### Test results

| Command | Result |
| --- | --- |
| Initial three-test reproduction | 2 expected failures, 1 pass before implementation |
| `node --test tests/v06-replacement.test.js tests/skill-draft.test.js tests/overhaul-review.test.js tests/balam-skills.test.js tests/skill-hud.test.js` | 116/116 pass; includes 18 new replacement tests |
| `node scripts/v06-replacement-playtest.mjs` | 62 checks pass; 9 screenshots; no browser/HTTP errors |
| `npm run check` | 307/308 pass; stops on the same pre-existing French `MANA`/`Cacao` audit failure (2.96 s wall time) |
| `npm run build` | Pass, 253 modules, 12.16 s Vite / 13.91 s wall time; existing large-chunk warning |
| `git diff --check` | Pass |

Coverage: active/passive replacement, fresh passive state on reacquisition, same-kind unowned draws, cancellation at all three steps, multi-level queues, both milestones, queued and maxed boss rewards, free/exhausted kinds, innate protection, stale/end-of-run callbacks, read-only pause navigation and localized Western digits. The real browser exercises all steps in Arabic at 568×320 and 320×568, confirms active/passive updates, and checks card bounds plus unobstructed actions.

Screenshot evidence and machine-readable results: `previews/prompt01/` (`report.json`). All nine screenshots were inspected.

### Open issues

- `V06_SPEC.md` is not present; this implementation follows the explicit Prompt 01 requirements, as recorded in `DECISIONS.md`.
- The unrelated unfinished localization audit still flags French `MANA` and `Cacao`. No new test failures were introduced. Broader skills-overhaul/release work and existing uncommitted assets are outside this prompt.
- FR/AR new copy is marked for native review. These checks verify desktop Chromium at mobile viewport sizes, not physical Android devices.

## Prompt 02 — HUD clarity and fixed EN/AR positions — 2026-10-04

Branch: `release/0.6.0`. Version tag: `v0.6.0-step02`.

### Changed

- Replaced the unrecruited ally's question-mark portrait and repeated text with a centered lock and localized **Lv 5** inside the existing panel. Portrait, name, skills and rank badge stay hidden until recruitment.
- Removed the text block above XP. Added `#auto-indicator` beside XP with EN/FR/AR tooltips for automatic/manual attack mode; it reports the mode without changing it. The SVG updates only on a mode change, not every stats tick.
- Gave Dash the same gold plate and responsive size as active skills, an 88%-width/height icon (77% of the button area), and a small corner SPACE tag. Enlarged passive/innate icons, strengthened jade/silver ring contrast, and made their tooltip targets at least 44 CSS px.
- Improved the existing native SVG cacao pouch and skull symbols; both counters now have touch/hover/focus tooltips and fixed-width Western-digit totals that also fit six-digit values.
- Removed HUD RTL mirroring and logical inline positioning. Every locale uses physical left/right positions and left-to-right bar fills, digits and keys; tooltip text follows the locale. Menu/page RTL remains unchanged.
- Extended the real-browser HUD test with independent ally/slot lock states and a visible boss bar. Its failing combat regression exposed a compact-screen boss/ally overlap; fixed only its placement and title geometry. No gameplay, audio, raster assets, branding, dependency or package-version changes.

### Test results

| Command | Result |
| --- | --- |
| Initial HUD regression tests | Expected failures before implementation |
| Boss-visible screenshot regression before spacing fix | Expected failure: boss bar overlaps the locked ally panel at 568×320 |
| `node --test tests/v06-hud.test.js tests/skill-hud.test.js tests/v06-replacement.test.js` | 26/26 pass; 5 new HUD unit tests |
| `npm run test:hud` | 497 checks pass; 32 layout screenshots plus a card screenshot; no browser/HTTP errors; 44.84 s wall time |
| `node scripts/v06-replacement-playtest.mjs` | 62 checks pass; no browser/HTTP errors; 30.90 s wall time; original Prompt 01 screenshots retained |
| `npm run check` | 312/313 pass; stops on the same pre-existing French `MANA`/`Cacao` audit failure; 7.16 s wall time |
| `npm run build` | Pass, 253 modules; 18.96 s Vite / 20.19 s wall time; existing large-chunk warning |
| `git diff --check` | Pass |

The matrix covers EN/AR at 568×320, 800×360 and 1280×720, plus 320×568 portrait. Each independently combines locked/unlocked allies and locked/unlocked skill slots. Assertions reject overlap/overflow of independent HUD controls and panel children, compare their exact EN/AR rectangles, verify LTR fills/keys/digits, Dash icon coverage, passive ring fill/contrast, 44 px targets, tooltips and large counters. Existing casting, passive state, ally loadout and unlock checks remain. Representative screenshots were visually reviewed. Evidence: `previews/prompt02/` and its `report.json`.

### Open issues

- `V06_SPEC.md` and `references/ref-markup-hud.jpeg` are absent; the seven explicit Prompt 02 requirements are the available specification. Conservative choices are recorded in `DECISIONS.md`.
- The unrelated unfinished localization audit still flags French `MANA` and `Cacao`; no new suite failures were introduced. Earlier uncommitted localization and asset changes are preserved and excluded from this commit.
- New FR/AR tooltips are marked `TODO native review`. Mobile checks use desktop Chromium at phone viewport sizes, not physical Android devices.

## Prompt 03 — Shared toggles and paused settings — 2026-10-04

Branch: `release/0.6.0`. Version tag: `v0.6.0-step03`.

### Changed

- Added one accessible, reusable switch with fixed 136×44 control / 60×32 track geometry, a contained knob, green check / grey cross and localized On/Off text. The surrounding settings row follows RTL; the internal control geometry never mirrors. All three existing toggles use it, including keyboard activation while Phaser captures Space.
- Extracted the existing ten settings controls and bindings into one renderer used by main-menu settings and the paused overlay. Changes persist and update the current run, audio gains, attack indicator, effect budgets, reduced-motion class and FPS limit immediately without recreating or resuming the game.
- Placed Resume and Settings side by side, with Skills, How to Play and Quit to Menu below. Settings/Skills/help Back returns to pause; Resume returns to the same run. Quit records the abandoned run and opens the menu. Kept the existing settings content and How to Play controls text; no new HUD tab or broader restyling.
- Routed Escape and the actual native Android Back hook through the active pause subpanel. Enabled the existing native bridge on the private Android app-assets host in production; ordinary web releases remain debug-gated. Guarded ended runs and preserved level-up choices.
- Browser checks exposed a portrait panel-width overflow; constrained it to the available parent width. Visual review also caught the inherited dark Quit label on its red button; corrected only that label contrast.
- No game images, audio files, dependencies, branding, save-format or version-number changes. Earlier uncommitted localization/artwork remains excluded.

### Test results

| Command | Result |
| --- | --- |
| Initial three-test reproduction | 3 expected failures before implementation |
| `node --test tests/v06-settings.test.js tests/v06-replacement.test.js tests/v06-hud.test.js tests/skill-hud.test.js` | 38/38 pass, including 12 new settings/navigation tests |
| `npm run test:settings` | 211 browser checks; 18 settings screenshots and 6 pause/overlay screenshots; EN/FR/AR, both switch states, phone landscape/portrait and desktop |
| `npm run test:settings -- --native` | 6 checks pass using locally served production files at the private Android origin; actual native Back source, no debug query; ordinary web exposure stays gated |
| `SYJ_HUD_OUTPUT=docs/v0.6/previews/prompt03/hud-regression npm run test:hud` (PowerShell environment assignment) | 497 checks; 32 layouts plus card screenshot; no regressions |
| `npm run check` | 324/325 pass; the sole failure is the same pre-existing French `MANA`/`Cacao` audit; build skipped by the existing `&&` script |
| `npm run build` | Pass, 257 modules, 18.12 s Vite; existing large-chunk warning |
| `git diff --check` | Pass |

Evidence: `previews/prompt03/report.json`, `native-report.json`, and `hud-regression/report.json`. Representative EN/FR/AR screenshots in both toggle states were visually inspected. Tests check exact knob containment and locale-invariant internal geometry, all ten live settings, paused player/timer/game identity, 30/60 FPS reconfiguration, Back/Resume/reopen behavior, read-only Skills/help and direct Quit to Menu.

### Open issues

- `V06_SPEC.md` and the specifically named toggle reference are absent; the explicit Prompt 03 requirements and supplied WhatsApp image were used. See `DECISIONS.md`.
- The unrelated localization audit still flags legitimate French spellings `MANA` and `Cacao`; no new failures. FR/AR additions are marked for native review.
- Native bridge behavior was verified in Chromium against the production build, not on a physical Android device. Prompt 04 arrived after these checks; seal this completed prompt in its own commit before its independent resize work.

## Prompt 04 — Fullscreen viewport and safe areas — 2026-10-04

Branch: `release/0.6.0`. Version tag: `v0.6.0-step04`.

### Changed

- Traced letterboxing to the fixed FIT canvas / contain CSS and native window inset handling. Changed to RESIZE, whole-screen canvas and a live 720-world-unit camera height with a 2.4:1 effective aspect cap; resize preserves the viewed center even while gameplay is paused.
- Replaced fixed terrain/fog/screen-shading dimensions and stale spawn bounds with viewport helpers. Terrain coverage and culling follow the real view; ordinary enemy/boss spawns are wholly off-screen. Kept pickup/skill distances in world units, normalized camera shake by actual pixel displacement, and fixed stale manual-pointer aiming after camera changes.
- Inset the HUD once using browser/native safe-area variables, clamped tooltips, and kept menus/overlays usable in the reduced rectangle. Added failing overlap checks then corrected XP/manual-attack spacing at cutout phone/960×540 sizes and ally/boss spacing at 4:3. EN/AR anchors remain physically identical.
- Added an Android theme, edge-to-edge WebView/cutout handling, guarded modern/legacy immersive behavior, safe-inset publication and focus/resume/configuration reapplication. Removed an incompatible API 27 theme item caught by lint; kept API 26 support.
- No image/audio assets, dependencies, branding, save format or package-version changes. Earlier unfinished translations/artwork remain excluded; no APK signing or keystore access.

### Test results

| Command | Result |
| --- | --- |
| Initial fixed-canvas regression | Expected failure before RESIZE changes |
| Safe-area overlap and stale pointer reproductions | Expected failures before their focused fixes |
| `node --test tests/v06-viewport.test.js tests/v06-hud.test.js tests/v06-settings.test.js tests/v06-replacement.test.js tests/skill-hud.test.js` | 46/46 pass; 8 new viewport tests |
| `npm run test:viewport` | 518 checks pass; 7 resolutions × EN/AR × two inset states; 14 screenshots; EN/FR/AR settings/setup checks; 41.18 s |
| PowerShell `SYJ_HUD_OUTPUT=docs/v0.6/previews/prompt04/hud-regression` then `npm run test:hud` | 497 checks pass; 32 HUD layouts plus card screenshot |
| `npm run check` | 332/333 pass; sole pre-existing French `MANA` / `Cacao` audit failure; 6.84 s test runner; build skipped by `&&` |
| `npm run build` | Pass; 259 modules, 9.80 s Vite; existing large-chunk warning |
| Offline Gradle debug/release Java compile, resources and lint | Pass, 30 s; each lint report has 0 errors / 5 existing warnings |
| `git diff --check` | Pass |

Evidence, investigation and Android manual steps: `VIEWPORT.md`, `previews/prompt04/report.json` and `hud-regression/report.json`. Representative phone/4:3/ultrawide and Arabic screenshots were visually inspected. Browser assertions use actual canvas pixels, live Phaser camera state, real spawn sprite bounds and pickup velocities rather than only source-text checks.

### Open issues

- `V06_SPEC.md` remains absent; the explicit Prompt 04 rules are followed and conservative choices are in `DECISIONS.md`.
- The unrelated unfinished French untranslated-key audit is still the sole full-suite failure; no new failures and no edits to that work.
- No connected Android device or running emulator; native compile/resource/lint checks pass, but physical cutout/system-bar and signed APK execution remain unverified. Manual steps are supplied. The >2.4:1 fallback uses horizontal scaling only; all requested sizes use uniform zoom.

## V1 — Typography and shared design tokens — 2026-10-04

Branch: `release/0.6.0`. Version tag: `v0.6.0-v1`.

### Changed

- Bundled the supplied Jersey 15 and Atkinson Hyperlegible regular/bold Latin/extended subsets, retained Noto Sans Arabic, and copied all three original OFL notices into `licenses/`. Updated README and historical font credits. No network downloads or new dependencies.
- Imported `fonts-v06.css`, consolidated colors/spacing/radii/shadows/layers/font tokens, replaced every runtime old-family reference, and added a shared Phaser/canvas text style. Async startup and run creation wait for real font files and `document.fonts`; a digit-only Jersey face preserves Western digits in Arabic body copy. Jersey remains regular with synthesis disabled; Arabic headings use genuine Noto bold.
- Enforced 14 px body, 12 px HUD micro-labels and 1.35 line height. Adjusted compact hero headers, reward icon/ribbon rows, key tags and numeric boxes to fit full descriptions and visible actions. Fixed a caught card/Replace-button overlap and Latin-title bold inheritance in Arabic.
- Removed only the unused Pixelify Sans and Unixel binaries after browser verification with the replacements; both are recoverable from Git. Kept their historical license notices. Updated historical font checks and added eight unit tests plus font-gate/bounds browser verification.
- Preserved earlier uncommitted translations/artwork and the unrelated newly supplied release documents/audio generator. No audio, branding, gameplay, package-version or APK changes.

### Test results

| Command | Result |
| --- | --- |
| Initial startup/typeface regression | Three expected failures before implementation |
| `node --test tests/v06-typography.test.js` | 8/8 pass, no skips; required real binaries/licenses checked |
| `npm run test:typography` | 100 checks pass, 23.35 s; EN/FR/AR at 568×320, all 78 hero/stat cards, 15 screenshots, no browser/HTTP errors; actual three font families loaded |
| `SYJ_HUD_OUTPUT=docs/v0.6/previews/v1/hud-regression` then `npm run test:hud` | 497 checks pass; 32 HUD layouts plus cards |
| `SYJ_SETTINGS_OUTPUT=docs/v0.6/previews/v1/settings-regression` then `npm run test:settings` | 211 checks pass; EN/FR/AR toggles and pause/settings navigation |
| `SYJ_VIEWPORT_OUTPUT=docs/v0.6/previews/v1/viewport-regression` then `npm run test:viewport` | 518 checks pass; requested sizes, insets and localized setup |
| `npm run check` | 340/341 pass, no skips; sole pre-existing French `MANA`/`Cacao` audit failure; build skipped by `&&` |
| `npm run build` | Pass; 270 modules, 55.29 s Vite during parallel checks; existing large-chunk warning |
| `git diff --check` (excluding the verbatim Noto license copy) | Pass; upstream notice retains one historical trailing space |

Evidence: `previews/v1/report.json`, its contact sheet and regression reports. All fifteen requested screen captures were visually inspected. Font-gate verification deliberately delays a real font request, and bounds verification rejects deliberately oversized controls. Parallel cold-start checks competed with the build and timed out; their isolated reruns passed without weakening assertions.

### Open issues

- The unrelated unfinished localization audit still flags legitimate French `MANA` / `Cacao`; no new failures. No edits to that prior work.
- Native font rendering was not checked on an Android device; browser tests use the real bundled fonts, not mocks or fallback claims. Broader visual restyling belongs to the later prompts.

## V2 — Generated UI kit and nine-slice preview — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v2`.

### Changed

- Generated 38 pixel-art kit components in three sheets (16 / 16 / 6), plus three independent sunset-jungle backgrounds. Used the two TARGET references for charcoal carved stone, stepped gold fret ornament, teal-jade gems and torch/vine framing. Delivered exact longest-side PNG sizes and 1920×1080 WebP backgrounds at quality 90, without applying them to game screens.
- Added `src/data/uiKit.json` with all 41 files, exact dimensions, state families and source insets for 28 nine-slice components. Built a dev-only catalog showing every piece at three sizes, and assembled press/release, toggle and torch examples.
- Added the offline Sharp preparation script and optional validated shared-scale/bottom anchoring to the existing slicer. Rejected/regenerated a bad sheet layout; corrected keyed pink edges, tiny alpha discrepancies between button states and torch baselines. Retained every state's own generated RGB; all 41 file and decoded-pixel hashes are unique. Old art/slicer defaults remain intact.
- Retained full image prompts/native sources and per-image provenance. Created the final contact sheet, 41 individual multi-size screenshots, assembled example, six review sheets and machine-readable preparation/browser reports. Visually inspected every finished item and all review sheets; checked actual opaque corner pixels at three widths, not just metadata.
- No gameplay, screen imports, audio-file changes, branding edits, dependency installs, downloads, package-version bump, APK or push. Earlier unfinished localization/artwork and supplied release references/audio scripts remain outside this commit.

### Test results

| Command | Result |
| --- | --- |
| Initial kit acceptance checks | Caught state-alpha edge discrepancies and two torch baseline positions; both fixed |
| `node scripts/prepare-ui-kit.mjs --overwrite` | 41 unique final assets; exact 16 / 16 / 6 cell counts; 28 nine-slice sources |
| `node --test tests/v06-ui-kit.test.js tests/slice-sheet.test.js` | 16/16 pass; 11 new acceptance tests, 1.39 s runner |
| `npm run test:ui-kit` | 121 checks pass; 123 rendered samples; 48 screenshots; no browser/HTTP errors; 33.98 s |
| `npm run check` | 351/352 pass, no skips; sole pre-existing French `MANA` / `Cacao` audit failure; 3.01 s runner / 4.30 s command; build skipped by `&&` |
| `npm run build` | Pass; 270 modules, 17.42 s Vite; existing large-chunk warning; dev demo is not in `dist/tools/` |
| `git diff --check` | Pass for V2 changes |

Evidence and usage: `UI_KIT.md`, `ASSET_LOG.md`, `UI_KIT_SOURCES.json`, `previews/ui-kit.png`, `previews/ui-kit/preparation.json` and `previews/ui-kit/demo/report.json`. Pixel-geometry checks also caught fractional caption layout affecting thin scrollbar screenshot alignment; fixed the dev gallery to integer-width cells. Removed the implicit favicon 404 instead of suppressing the strict error assertion.

### Open issues

- Built-in image generation does not expose model/variant selection or routing metadata. **gpt-image-2.5 Flare was requested, actual routing cannot be verified.** Returned sources are 1254×1254 sheets / 1672×941 backgrounds; normalization and exact final sizes are documented, without claiming native 2048/1920 detail.
- The prior unfinished localization audit is still the sole full-suite failure; no new failures and no edits to that unrelated work.
- This prompt intentionally does not wire new art into player screens; that is the following UI implementation work. Mobile/Android application of the kit remains for that work, not this asset-only step.

## V6 — Real weighted run loading and recovery — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v6`.

### Changed

- Replaced the exposed green startup canvas with an opaque, safe-area-aware loading overlay using the V2 stone panel, ornate bar/fill, small existing logo, selected hero/map art and animated torches. Added percentage, six phase names and three rotating tips in EN/FR/AR; Western digits stay LTR, Arabic copy is RTL, reduced motion leaves static torches.
- Added a real six-phase weighted tracker and a Phaser loader scene. Moved run texture/FX preparation out of the old startup path, selecting the hero/map instead of loading every hero. Added actual cached image/atlas/frame-sheet progress, four-worker root/skill audio preparation, optional audio-key lists, map validation/seed and future map/prop-pool hooks, world creation checkpoints and rendered-frame warm-up.
- Added filename-specific failure UI: Retry fetches only failed work; optional failures can Continue with the old FX/sound fallback. Percentages never rewind and reach 100% only after completed work; reveal waits at least 600 ms. Game simulation stays frozen behind the overlay, and map music starts after loading. Android Back cancels cleanly rather than accessing a missing gameplay scene.
- Added timeout/cancellation handling for both fetching and a stuck audio decoder, retry-safe caches and a bounds/localization/real-progress browser suite. Updated one old texture assertion to inspect the real manifest after its extraction, without weakening its unique-icon assertion. No new game art, audio files, dependencies, package-version bump, APK or network download.
- Preserved earlier unfinished V3/V4/V5 and user changes; staged only V6 hunks. Recovered the interrupted corrupt Git index without changing working files, keeping its backup. Tested a V6-only staged source snapshot in `.tools/v6-staged-check` to prove the commit does not depend on those unrelated changes.

### Test results

| Command | Result |
| --- | --- |
| `node --test tests/loading-v06.test.js tests/skill-audio.test.js` | 22/22 pass, including 14 new loading tests; 0.60 s runner |
| `npm run check` in the V6-only staged snapshot | 361/361 pass, no skips; 3.20 s runner; production build passes, 279 modules, 9.49 s Vite |
| `npm run check` in the full worktree | 391/392 pass, no skips; 3.90 s runner; stops on the same pre-existing French `MANA` / `Cacao` audit, so its `&&` build is skipped |
| `npm run build` in the full worktree | Pass, 290 modules, 19.10 s Vite; existing large-chunk warning |
| `npm run test:loading` in the worktree and staged snapshot | 62 checks pass in each; 8 screenshots; no unexpected browser/HTTP errors |
| `SYJ_HUD_OUTPUT=docs/v0.6/previews/v6/hud-regression` then `npm run test:hud` in staged snapshot | 497 checks pass; 32 HUD layout screenshots plus cards; no browser/HTTP errors |
| `SYJ_SETTINGS_OUTPUT=docs/v0.6/previews/v6/settings-regression` then `npm run test:settings` in staged snapshot | 211 checks pass; settings/toggles/pause/navigation; no browser/HTTP errors |
| `git diff --cached --check` | Pass for V6 changes |

The loading matrix covers all three heroes/maps in EN/FR/AR at 568×320 and 1280×720. It waits for actual displayed hero/map images, checks panel bounds and LTR percentages, records 259–271 real progress samples per run, rejects early simulation/transparent exposure, verifies selected texture/music and decoded skill buffers, and injects critical image, optional still, optional sound and future map-generation failures. It tests Retry, Continue, no repeated missing-sound fetch, hook retry while paused, rotating tips during delayed real work, reduced motion and actual Android Back cancellation. Decoder timeout/cancellation tests first reproduced a cache-retention defect; the tested fix makes retry work without a stale promise deleting a newer cache entry.

Evidence: `previews/v6/report.json`, eight loading/error screenshots, `contact.png`, and the HUD/settings regression reports. All eight loading/error captures were visually reviewed. The final isolated cold run took 11.20 s during concurrent builds; subsequent runs took 1.66–2.66 s. These are desktop measurements with deliberate request delays, not Android performance claims.

### Open issues

- The unrelated unfinished localization audit remains the only worktree test failure; the V6-only commit tests and build pass. Earlier menu/editor/translation/artwork work is preserved and not completed or included by this prompt.
- New FR/AR loading text is marked `TODO native review`.
- New finite-map generation/prop pools, new ambience and `audio-v06/` wiring remain for their respective later steps. V6 provides the hooks/list support and uses current data/sounds now.
- No Android device/emulator was used. Browser testing verifies the actual Back-hook source; native WebView rendering and APK execution remain unverified.

## V8 — Complete enemy roster and behaviours — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v8`.

### Changed

- Compiled all 15 enemy rows and every attack's numeric parameters from the supplied JSON into standalone runtime data. Added one registered behaviour per enemy, with shared steering/kiting, swept dashes, leaps, burrow/teleport, shields/reflection, summoning, puddles and fuses. Preserved specified HP, speed, damage, XP, radius, triggers, wind-ups and cooldowns.
- Continued only the required V7 foundations: pooled/batched warnings and enemy bars, live display/high-contrast settings, capped map packs and five elite affixes. Enforced map exclusivity, two-tank limits, ground-only flier filtering and serial-safe Cultist ownership. Extended tough-enemy targeting/Trophy Hunter without changing hero skill values.
- Added precise player root/knock-up/poison/bleed handling, Grasp's pull-before-hit, source-serial guards and reset of pooled enemy/boss state. Stun/death/choice/end guards cancel or freeze attacks appropriately; early Wisp death cancels its fuse. Shields, dodge and fatal-hit prevention still work.
- Hooked enemy wind-up/attack FX and audio through existing placeholder/legacy fallback systems. New sprites/stills/sounds belong to later prompts: no image/audio files, downloads, dependencies, branding, APK or package-version changes. XP and cacao trial changes were restored to the committed formulas; V7 pacing work remains unfinished.
- Added headline and edge-case unit tests, deterministic full-duration roster bots, EN/AR visual checks and new-settings browser checks. Recorded decisions, every attack's cast counts, spawn coverage and outliers in `ENEMY_ROSTER.md`. Only V8/required-foundation hunks are committed; prior unfinished menu/editor/localization/artwork remains preserved.

### Test results

| Command | Result |
| --- | --- |
| `node --test tests/enemy-roster.test.js tests/enemies-v06.test.js` | 50/50 pass, including a headline test for every enemy; 0.27 s runner |
| `npm run check` in the V8-only staged snapshot | 411/411 pass, no skips; 2.45 s runner; build passes, 303 modules, 13.25 s Vite |
| `npm run check` in the full worktree | 441/442 pass, no skips; 2.44 s runner / 3.74 s command; sole pre-existing French `MANA`/`Cacao` audit failure; its `&&` build is skipped |
| `npm run build` in the full worktree | Pass, 314 modules, 13.78 s Vite; existing large-chunk warning |
| `node scripts/v06-roster-playtest.mjs --label=final-roster` | Three full 10-minute map runs, every eligible enemy/attack; no exceptions, HTTP failures or stuck actors; 30.65 s wall |
| Same bot with `--label=staged-roster` in the staged snapshot | Same kills/levels/cacao and cast counts on all three maps; all checks pass; 21.76 s wall |
| `node scripts/v06-roster-visual.mjs` in worktree and staged snapshot | 67 checks pass in each, 12 screenshots each; exact body radii/off-screen footprints; identical EN/AR bar geometry; no browser/HTTP errors |
| `npm run test:settings` in staged snapshot | 226 checks pass: EN/FR/AR geometry, shared controls, live health-bar/high-contrast settings, persistence and paused Back/navigation |
| `npm run test:loading` in staged snapshot | 62 checks pass, 8 captures, no unexpected errors; actual lazy loading/retry/Continue/Back still work |
| `git diff --cached --check` | Pass; staged scope audit excludes game assets, native code and protected paths |

The scoped snapshot in `.tools/v8-staged-check` uses staged source, not earlier uncommitted menu/editor code. Its initially incomplete asset-junction setup was fixed before rerunning; a stale settings assertion expecting 10 controls/3 toggles was updated to explicitly verify the new 12 controls/4 toggles, including save/live changes. No acceptance checks were removed. Loading rerun output is retained under V8, with original V6 evidence recovered unchanged.

Evidence: `previews/v8/roster/final-roster.json`, `staged-roster.json`, `previews/v8/staged/readability/` (12 reviewed captures/contact/report), and the staged settings/loading reports. The map runs reach level 10 at 5:58.27 / 5:24.43 / 5:49.07 and finish at levels 14 / 16 / 14; no level 20. These coverage-biased quick runs miss pacing targets; no tuning is hidden in this step. FX/warning/puddle peaks remain within 24 / 64 / 128.

### Open issues

- Temporary existing-actor/FX/audio fallbacks are deliberate until the respective asset prompts. No manual audible or Android/emulator test; no native performance claim.
- Water remains the documented placeholder query and Spirit puddles until finite cenote geometry exists. Conservative pack tables fill a missing JSON field; all assumptions are in `DECISIONS.md`.
- The interrupted V7 XP/cacao before/after study is not completed by V8; pacing/currency outliers are reported, not rebalanced.
- The unrelated French audit remains the only worktree test failure; the isolated commit's tests/build pass. FR/AR additions need native review. Prior dirty work is not discarded, completed, pushed or included here.

## V9 — Enemy animation sheets and effect visuals — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v9`.

### Changed

- Generated and reviewed 15 enemy sheets, sliced into 240 individual 128x128 alpha frames in the specified order, plus 18 distinct 256x256 enemy effect stills. Preserved the five recognizable base designs and all 20 original base frames byte-for-byte in `art-source/v0.6/enemies/legacy/`. Retained native sheets, rejected/corrected results, exact prompts, slicing manifests and one provenance line per final image.
- Added seven real enemy animation states with four-frame actor fallback. Connected V8 wind-up, attack, recovery, emergence, hurt and death to the correct states. Added non-physics squash/stretch, ground shadows, 65ms white hit flashes, elite aura and serial-safe detached death animations/dissolve puffs. Physics sizes, AI geometry, roster values and progression timing are unchanged.
- Registered 18 canonical FX recipes with 30 ability aliases; wired real enemy projectiles, zones, shields, teleports, telegraph ornaments and typed death puffs. Effects respect the existing 24-unit cap; warnings cancel on stun/death, and shield/death visuals clean up on expiration and pooled-body reuse. Lazy loading selects eligible map enemies and canonical stills, not alias file paths.
- Extended the shared slicer for complete connected components crossing grid gutters, common actor scale/baseline and magenta defringe without erasing purple interiors. Added dimension/alpha/hash/fringe/similarity auditing, contact sheets, a development-only 105-state actor preview, strict runtime checks and deterministic enemy-visual bot evidence.
- No audio files, dependencies, downloads, branding, APK or package-version changes. Staged only V9 hunks and assets; earlier unfinished menu/editor/localization/companion-art work is preserved and excluded. Verified the indexed source separately from the shared dirty worktree.

### Test results

| Command / fixture | Result |
| --- | --- |
| `node --test tests/enemy-visuals.test.js tests/enemy-roster.test.js tests/slice-sheet.test.js` | 40/40 pass, including 10 new V9 tests; 0.440s runner |
| `node scripts/check-enemy-art.mjs` | 258 exact-size alpha PNGs, 258 distinct hashes, zero opaque magenta pixels, zero flagged enemy pairs |
| `node scripts/v06-enemy-visuals-playtest.mjs --candidate` | 6 checks pass before promotion; actual decoding, animation advance, pause and contact |
| `node scripts/v06-enemy-visuals-playtest.mjs` in worktree and indexed snapshot | 38 checks pass in each, 9 screenshots each; EN/AR at 568x320 and 1280x720; all 240 frames advance, flash/collision/cap/death/reuse/cleanup checks pass |
| `npm run check` in indexed V9 snapshot | 421/421 pass, no skips; 2.502s runner; production build passes, 306 modules, 16.26s Vite |
| `npm run check` in full shared worktree | 451/452 pass, no skips; 2.538s runner / 3.874s command; same pre-existing French `MANA` / `Cacao` audit failure; its `&&` build is skipped |
| `npm run build` in full worktree | Pass, 317 modules, 14.38s Vite; existing large-chunk advisory only |
| `node scripts/v06-roster-playtest.mjs --enemy-visuals --label=v9-ten-minute-final --output=docs/v0.6/previews/v9/roster` | Three full 600s map runs; every eligible enemy and active attack, all seven states; no exceptions, HTTP failures, missing enemy assets or stuck actors; peak FX units 24 |
| Same roster fixture in indexed snapshot, label `v9-staged-ten-minute` | All three runs pass; 33.88s wall; kills, cacao, level timings and attack counts match V8 exactly |
| `SYJ_LOADING_OUTPUT=docs/v0.6/previews/v9/staged/loading`, then `npm run test:loading` in indexed snapshot | 62 checks pass, 8 screenshots; real loading/progress, retries, optional Continue, Back, EN/FR/AR |
| `git diff --cached --check` and staged scope/backup audit | Pass; no protected, native or audio paths; all 20 legacy frames match pre-V9 bytes |

Evidence and reproduction details: `ENEMY_VISUALS.md`, `enemy-art-sources.json`, `ASSET_LOG.md`, `previews/v9/` actor/effect contacts and runtime/roster/loading reports. All final actor contacts, the final effect contact and runtime captures were visually reviewed. Coverage-biased runs finish at levels 14 / 16 / 14 with level 10 at 358.27s / 324.43s / 349.07s; V8 pacing outliers remain unchanged, not rebalanced by V9.

### Open issues

- Requested gpt-image-2.5 Flare, with Sunburst requested for near-miss corrections; the image service exposes no model/variant selector or verified routing metadata. Native sheets are 1254x1254, preserved and normalized/reflowed before exact-size slicing; native 2048 detail is not claimed.
- The unrelated unfinished French audit remains the sole worktree test failure; the V9-only commit tests and build pass. Prior menu/editor/translation/artwork is neither discarded nor completed here.
- The enemy-only bot explicitly reports/skips three unregistered companion FX while keeping companion mechanics; it does not suppress console warnings. No enemy/hero missing-file warnings occur. Audio is muted in deterministic tests and retains V8's old-sound fallback in production; unfinished companion FX/audio are outside this prompt, so no globally warning-free audible run is claimed.
- No Android device/emulator or audible manual test was available; no mobile/native FPS claim. Map geometry, boss sheets, new recordings and earlier pacing work remain for their respective prompts.

## V10 — Boss controller, cinematics and fairness — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v10`.

### Changed

- Compiled authoritative boss definitions and registered a small temporary adapter for the four current attacks. Added HP-threshold phases, scheduling through pooled Telegraph warnings, recovery/cooldown rules, optional transformation/enrage hooks, fixed-radius arenas and serial-safe death/reward completion. Removed the old inline boss pattern/tween-warning path.
- Set the exact JSON HP/contact damage values; preserved current attack geometry/projectile numbers, ground-only aliases and alive caps. All damaging boss warnings are at least 0.5s, big-cast recovery at least 1.2s and single-hit damage at most 80 even after vulnerability or source-body reuse. Stub coverage includes the future Final Rite's three safe circles; new boss abilities remain for V11.
- Added stepped 5/5/6/8s entry cinematics with relative camera pan/zoom, letterbox/HUD fades, existing-kit two-second name/epithet banners and sound/voice/music hooks. Entrances freeze gameplay time, physics, timers, tweens, ally/input combat and damage including DOT. Tap/Back skip after one second, the shortened accessibility preference, reduced motion, resize, abort and shutdown restore state safely.
- Added eight-second arrival warnings with physical edge arrows and an ornate left-to-right boss meter with notches, phase icon, HP, armor/shield and protection data. Reused the `boss-bar` id and optional layout synchronization; updated only the old HUD regression's fill-origin assertion. EN/FR/AR copy uses existing shared translations where available.
- No raster/audio assets, dependencies, native files, APK, package-version change, downloads or push. Preserved earlier unfinished menu/editor/localization/artwork; staged only V10 hunks. Progress/decisions and `BOSS_FRAMEWORK.md` document the conservative choices and explicit V11 limits.

### Test results

| Command / fixture | Result |
| --- | --- |
| `node --test tests/boss-framework.test.js tests/enemies-v06.test.js tests/skills-foundations.test.js` | 74/74 pass, including 24 new V10 tests; 0.265s runner |
| `node scripts/v06-boss-framework-playtest.mjs` in shared worktree | 51 checks pass, 21 captures/contact sheets, 36.24s; EN/FR/AR at 568x320 and 1280x720; no browser/HTTP errors or console/missing-asset warnings |
| Same command in final indexed snapshot, `SYJ_BOSS_OUTPUT=docs/v0.6/previews/v10/staged/runtime` | 51 checks pass, 21 captures/contact sheets, 23.61s; actual warning/spawn/entry, damage/input guards, restoration, all four old attacks, skip and one-shot death/reward |
| `npm run check` in final indexed snapshot | 445/445 pass, no skips; 2.588s runner; production build passes, 314 modules, 15.67s Vite |
| `npm run check` in shared worktree | 475/476 pass, no skips; 3.616s runner; only the earlier French `MANA` / `Cacao` audit fails, so its `&&` build is skipped |
| `npm run build` in shared worktree | Pass, 325 modules, 14.55s Vite; existing large-chunk advisory only |
| `SYJ_HUD_OUTPUT=docs/v0.6/previews/v10/staged/hud`, then `npm run test:hud` | 497 checks pass; 32 layout captures plus card evidence; no overlap/overflow, LTR geometry and locale parity |
| `SYJ_LOADING_OUTPUT=docs/v0.6/previews/v10/staged/loading`, then `npm run test:loading` | 62 checks pass, eight captures; real loading, retries, optional failures, Back and EN/FR/AR |
| `git diff --cached --check` and scoped-file audit | Pass; no protected, native, audio, branding or unrelated UI/editor paths staged |

All boss entrance, warning and bar contacts were visually inspected. Tests exercise exact threshold crossings and jumps, cancellations/reuse, accepted vs rejected cooldowns, invulnerability/DOT, optional enrage, damage caps, taunt/blind aiming, frozen choices, relative camera/restore/resize, skip preference, arrival delays/cap retries, arenas/safe circles and death cleanup. Source-only verification uses an ignored indexed snapshot, never resets the shared working files.

### Open issues

- Bespoke entry choreography, new boss attacks/16-frame sheets/effect art and developer-provided horn/stinger/voice recordings are deliberately not implemented by this framework prompt. Existing attacks/art/audio remain usable; hooks are ready for the next step.
- Neither timed enrage nor phase transformation duration is given in the JSON, so no live timer/window was invented. Final Rite safe zones are stub-tested foundation, not a new enabled boss attack.
- Earlier uncommitted French untranslated-key and pacing work remains outside scope. FR/AR boss copy needs native review. Browser audio is muted; no audible, Android/emulator or native FPS validation is claimed.

## V11 — Camazotz, Zipacna, Vucub Caquix and Ah Puch — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v11`. Prompt V11 complete.

### Changed

- Registered four final boss behaviour modules with a function per ability, replacing the temporary registry adapter. Mechanically derived all authoritative parameters from the JSON prose; retained source descriptions, phases, cooldowns and exact HP/contact damage. Implemented all 21 abilities, including real shootable heart stones/orbs, status effects, persistent zones, beams, safe gaps, fog lights, invulnerable flight and the scheduled Final Rite.
- Added a small gameplay-clock runtime for channels, hazards, targets and batched temporary drawing. Extended pooled Telegraph warnings for multi-marker casts, tracking, safe-angle gaps and birth-time accounting. Preserve 0.5s minimum warnings, 1.2s recovery and 80-per-hit cap; no damage during entrances or choices. Final Rite always has three safe circles, resolves at phase-three +6s, then repeats every 20s, including a threshold crossing during an earlier channel's recovery.
- Added four distinct code-drawn entry scripts with existing camera/banner/skip hooks and reduced-motion/flashing handling. Wired main/accent and warn/cast plus entry/phase/death resource hooks. Existing fallbacks warn once for future boss assets; no raster/audio assets, dependencies, package version, native files, APK, downloads or push are included.
- Fixed new runtime edge cases with tests: trail joins cannot multiply DPS; warning counts cannot parse as seconds; warnings cannot finish one simulation frame early; stones' source serials survive pool reuse; targets clear buried/reflection/affix/shield/render states; cancelled/rooted dives cannot teleport late; aborted Zenith/entry cleanup cannot mutate recycled actors. Summons, targets, warnings and shots clean up with their owner. Ground-only hero compatibility and alive caps remain in place.
- Preserved all earlier unfinished UI/editor/translation/native/artwork changes. The commit contains only V11 hunks and documentation/evidence. `BOSS_ABILITIES.md` and `DECISIONS.md` document phase inheritance, unspecified geometry, timing, conservative compatibility and test instrumentation.

### Final test results

| Command / fixture | Result |
| --- | --- |
| `node --test tests/boss-abilities.test.js tests/boss-framework.test.js` | 81/81 pass; 57 new V11 tests plus 24 framework regressions; 0.371s runner |
| `npm run check` in final indexed-source snapshot | 502/502 pass, no skips; 6.897s runner; production build passes, 319 modules, 20.99s Vite |
| `npm run check` in shared worktree | 532/533 pass, no skips; 8.744s runner; sole earlier French `MANA` / `Cacao` audit fails, so its `&&` build is skipped |
| `npm run build` in shared worktree | Pass, 330 modules, 32.22s Vite during parallel checks; existing large-chunk advisory only |
| `SYJ_BOSS_OUTPUT=docs/v0.6/previews/v11/staged`, then `node scripts/v06-bosses-playtest.mjs` in final snapshot | 30 checks pass, four actual 180s Phaser fights, all 21 abilities executed; 70.59s wall time; no browser/HTTP/console errors, early warnings or cleanup leaks |
| `SYJ_BOSS_OUTPUT=docs/v0.6/previews/v11/staged/framework`, then `node scripts/v06-boss-framework-playtest.mjs` | 51 checks pass, 21 captures/contacts, 37.55s; EN/FR/AR at 568x320 and 1280x720, actual entry/pause/skip/death, exact opener damage and physical HUD parity |
| `SYJ_HUD_OUTPUT=docs/v0.6/previews/v11/staged/hud`, then `npm run test:hud` | 497 checks pass, 32 layout captures plus card fixture; overlap/overflow, LTR geometry and locale parity remain correct |
| `SYJ_LOADING_OUTPUT=docs/v0.6/previews/v11/staged/loading`, then `npm run test:loading` | 62 checks pass, eight captures; real progress, Retry/Continue/Back and EN/FR/AR; snapshot-only missing native-source copies corrected without editing native code |
| Indexed-source byte verification, prior-file preservation, scoped-file audit and `git diff --cached --check` | Pass; no protected, dependency, native, audio, branding or unrelated editor/localization paths staged |

| Three-minute coverage fight | Total ability casts | Destructible targets killed | Peak FX / warnings / tasks |
| --- | --- | --- | --- |
| Camazotz | 61 (all five abilities) | — | 24 / 8 / 5 |
| Zipacna | 61 (all five abilities) | 3 heart stones | 24 / 8 / 4 |
| Vucub Caquix | 53 (all five abilities) | 11 sun orbs | 19 / 2 / 2 |
| Ah Puch | 47 (all six abilities) | — | 24 / 17 / 2 |

All final entrance, special-mechanic, boss-bar and arrival/entry contacts were visually inspected. Evidence is under `previews/v11/staged/`: boss coverage report/contact, framework report/contacts and HUD/loading reports. Source-only checks use an ignored indexed snapshot, never reset shared working files.

### Open issues / explicit limits

- New boss sprites/stills and developer-provided recordings arrive in later prompts. Temporary drawing, existing actors/sounds and one-warning fallbacks are intentional; future boss-placeholder warnings are reported, not suppressed. No claim of final art, globally missing-warning-free assets or audible audio.
- The 180s coverage fights use documented high hero HP, bounded damage to bosses, staged phase thresholds and no ordinary packs, with real Phaser updates/physics/attacks/collisions. They are robustness/coverage tests, not balance or FPS measurements. All production numbers remain those of the JSON.
- The same unrelated unfinished French untranslated-key audit remains the only shared-tree failure. Native review, earlier pacing outliers and unfinished UI/editor/artwork are neither completed nor discarded here. No device/emulator, APK, physical Android or native FPS validation was available or requested.

## V12 — Boss visuals — 2026-10-05

Branch: `release/0.6.0`. Version tag: `v0.6.0-v12`. Prompt V12 complete.

### Changed

- Added 16-frame sheets for Camazotz, Zipacna, Vucub Caquix and Ah Puch, sliced to individual 192×192 images with seven named states. Retained byte-for-byte copies of the prior 4 boss frames as source backups. Added 42 ability stills at 256×256 and four 512×512 entrance images.
- Connected bosses to the 16-frame texture manifest and the visual clone controller; kept their physics body and combat geometry stable. Scheduler windup, attack, recover and death poses now show the corresponding animation. Entries use the new art and keep skip, reduced-motion and fallback behavior.
- Registered unique FX recipes for 21 boss abilities and four entrances. Visuals follow each ability's combat geometry and lifetime; hit masks and pooled objects are released on interruption, expiry, owner death and shutdown.
- Added reproducible artwork manifests, contact sheets, a similarity/asset checker, an interactive dev preview, and headless visual/combat coverage. Corrected several clipped or ambiguous stills after inspecting the full contacts. No audio, music, voice or Android files changed; existing sound hooks remain in use.
- Generation provenance and conservative integration choices are in `ASSET_LOG.md`, `DECISIONS.md` and `BOSS_VISUALS.md`.

### Verification

| Command / run | Result |
| --- | --- |
| `npm run check` in the indexed-source snapshot | 535/535 tests pass; build passes (21.3s total) |
| `npm run build` in the shared workspace | Pass (18.2s); existing large-chunk advisory |
| Boss artwork checker | 110/110 files, exact sizes, alpha, no edge magenta, 110 unique hashes; no similar pair flagged |
| Production FX gallery | 53 checks, 25 recipes, no console/HTTP/missing-asset warnings |
| Four instrumented Phaser boss fights, 180s each | 38 checks, 0 errors/warnings; every ability executed; peak live effect count ≤24; death animations and cleanup verified |
| Boss framework regressions | 51 checks; six EN/FR/AR screen configurations and entry/bar/warning captures |
| HUD and loading regression suites | 497 and 62 checks pass |
| `npm run check` in the shared workspace | 565/566 pass; one pre-existing unfinished French audit flags `MANA` and `Cacao` as untranslated; left out of scope |

### Open issues

- The image-generation service does not expose its selected model/variant. Prompts requested Flare for the actor sheets and Sunburst for targeted repairs; routing cannot be independently verified. The native generated sheets were 1254×1254 and were normalized to 2048×2048 before slicing.
- Automated fights mute browser audio and use instrumentation to cover abilities/phases. No audible, mobile-device or FPS measurement is claimed. Existing unrelated dirty UI, localization, branding and Android work remains untouched.
- Vucub's final sheet uses the requested Sunburst correction after a clipped Flare result; the initial is preserved in the source archive.

## V13 — Finite maps and seeded content

Status: complete — 2026-10-05.

- Added JSON-derived runtime map definitions and generated data-driven prop kits for Overgrown, Bloodmoon and Cenote. Added fixed seeded landmark layouts, per-run seeded decorations, reserved central/arena routes, 400px finite map boundaries, spatial-hash footprints, pooled 640px streaming capped at 350 sprites, prop fade/breakable handling and Cenote water/light zones.
- Replaced the scrolling infinite floor and chunk generator; wired bounded physics/camera/spawn bounds, ground-only prop collisions, steering avoidance and stuck recovery, 20% Cenote player slow/Abyssal Eel water boost, seeded loader metadata and real map-generation progress.
- 9/9 V13 map tests pass, including 200 deterministic layouts per map (600 total), stream recycle/cap, collider geometry/filtering, destroyed-breakable hash cleanup, fade-behind, water/light metadata and stuck thresholds. Viewport regression tests pass.
- Three seeded 10-minute bot runs completed with normal XP/combat and automated level-up picks under headless Chrome 4× CPU throttle: Overgrown 351 kills/Lv15, Bloodmoon 322/Lv15, Cenote 313/Lv15. p95 simulation steps were 5.9/3.8/10.2 ms; peak allocated map sprites 76/82/83. Sampled heap growth was +31.6/+20.6/+30.4 MB. Details: [MAP_PERFORMANCE_V13.md](MAP_PERFORMANCE_V13.md) and [machine report](previews/v13/map-bot-report.json).
- `npm run check`: 574/575 tests pass; the sole failure is the existing French translation audit (`MANA`, `Cacao`), unrelated to map work. The production build was run separately and passes (13.74s; existing large-chunk advisory).

### Open issues

- `v06_design.json` describes map content in prose without placement coordinates/count tables for buildings, pack tables or Cenote water boundaries. The conservative inferred layout and preserved spawn-pack compositions are documented in `DECISIONS.md`; replace these assumptions when structured map data/art arrives.
- Headless step p95 meets the 16.7ms target, but occasional p99/max spikes remain (notably Overgrown's 193.5ms maximum). This is a simulation-step measurement, not a rendered/device 60FPS guarantee; sampled heap growth is recorded but not a post-GC leak diagnosis.

## V14 — Weather layers and ambient map tint — 2026-10-05

Status: implemented and verified.

- Added a seeded `WeatherDirector` for permanent Overgrown mist/leaves/god rays, Bloodmoon fog/ash/embers/lightning, and Cenote drips/mist/spores/ceiling rays. It owns bounded quality pools (Low 80 / Medium 160 / High 300), ambient tint/vignette, and additive glows fed by MapWorld’s registered lights.
- Added seeded rain, ash-storm and rockfall intervals from the design’s approximate ranges. Rain/ash veils stay at 10%/20%; ambient/fog graphics render below Telegraphs. Cenote rockfalls use a 0.72s circle warning and small 6-damage impact. Reduce flashing suppresses lightning flashes.
- Mapped procedural/optional stills to the exact 14 IDs in `assets.weather`, so future map-art files are looked up as `weather/<id>.png` without inventing aliases.
- Added AudioDirector map/weather loop fades and optional ambience one-shots using the manifest’s ambience paths; unavailable files are optional, warn once, and use silence or existing hit/boss SFX. No audio or weather image files were generated; procedural effects remain the fallback.
- `node --test tests/weather-v14.test.js`: 7/7 pass, including exact asset IDs, pool caps, seeded timing, reduce flashing, warning-before-damage, manifest paths and a 10-minute no-GameObject-growth simulation. Playwright screenshots: [Overgrown](previews/v14/overgrown-weather-1280x720.png), [Bloodmoon](previews/v14/bloodmoon-weather-1280x720.png), [Cenote](previews/v14/cenote-weather-1280x720.png); report: [weather-report.json](previews/v14/weather-report.json).
- `npm run check`: 581/582 tests pass; the only failure remains the pre-existing French localization audit (`MANA`, `Cacao`), untouched as out of scope. `npm run build` passes separately (Vite’s existing large-chunk advisory remains).

### Open issues

- The V06 weather image and ambience files are not present in this worktree; the runtime’s procedural art and optional audio fallbacks were verified, but generated stills and audible playback await the supplied map-art/audio assets. The browser screenshot run used the local desktop browser, not a mobile device.

## V15 — Overgrown Temple map artwork — 2026-10-05

Status: art and integration complete; verification caveats below.

- Generated and inspected all 59 map images and 14 shared weather stills. Added exact-size PNGs, source sheets/manifests, category contact sheets and six 3×3 ground tiling previews. Re-generated noisy ground and rejected contaminated weather; corrected the remaining key fringe in the shared slicer. Per-file provenance is in `ASSET_LOG.md`.
- Filled the Overgrown kit's real paths, dimensions, anchors, footprints, fade/breakable/light flags; added tiled terrain and authored boundary canopies. Kept finite-map layouts, pools and old assets. Fixed StaticBody refresh overwriting the authored footprints; preserved weather particle world sizes and lazy per-map loading. No audio files changed.
- Targeted map/weather/art suite: **21/21 pass**, including 200 seeds per map, 73 exact-size unique images, seamless edges, preload selection and real-body geometry. Four Playwright views pass with no browser errors or HTTP failures: centre, corner, landmark and boundary. See `previews/v15/` and `ART_QA_V15.md`.
- `npm run check`: **586/587 pass**; the sole failure is the existing French translation audit (`MANA`, `Cacao`). Production build passes separately; existing large-chunk advisory remains.
- Full-kit headless Chrome at 1280×720, 4× CPU throttle: actual game frame mean **20.97ms (~47.7 FPS)**, p95 **27.70ms**; scene-update p95 **5.30ms**. 54 active / 57 allocated prop sprites, below the 350 cap; all 59 kit textures plus one baked boundary texture loaded.

### Open issues

- Requested Flare routing cannot be verified because the image tool does not expose it. Native output resolution is documented above; all final dimensions are verified.
- The short throttled desktop sample does not establish sustained 60FPS and is not an Android measurement. No performance rebalance or unrelated translation fix was made. Existing unfinished UI, localization, Android, branding and other work remains untouched.

## V15c — Sunken Cenote art kit — 2026-10-05

Status: art and integration complete; verification caveats below.

- Generated and visually inspected 56 Cenote catalog images plus three colored glows. Added native sources/slice manifests, category contact sheets and six 3×3 tiling previews. Re-generated low-contrast ground and corrected glow margins; per-file provenance is in `ASSET_LOG.md`.
- Filled the Cenote kit with real paths, dimensions, anchors, colliders, fade/breakable/light flags. Added lake/bank/shore regions aligned with existing shallow-water circles, fixed-allocation shimmer with Reduced motion support, authored colored lights and cavern boundary strips. Player water speed remains exactly 80%. Old assets and all audio remain unchanged.
- Fixed opt-in sheet slicing to preserve connected subjects across grid boundaries without copying neighboring fragments. Added a reproducing regression test.
- Targeted suite: **28/28 pass**, including 600 seeded map layouts. Four real Phaser screenshots pass with no browser errors or failed asset requests. See `ART_QA_V15C.md` and `previews/v15c/`.
- `npm run check`: **593/594 pass**; only the existing French `MANA`/`Cacao` audit fails. Production build passes separately, with the existing large-chunk advisory.
- 600-frame full-kit desktop sample at 4× CPU throttle: actual frame mean **21.19ms (~47.2 FPS)**, p95 **27.40ms**; update CPU p95 **4.20ms**. **62 active / 67 allocated** props, below 350.

Open issues: the image tool cannot verify requested Flare model routing; the pre-existing localization audit remains; this short headless performance sample is not sustained 60FPS or mobile certification. No unrelated work was included.

## V16 — Ally animation and effects — 2026-10-05

Status: presentation implemented; known verification caveats below.

- Generated and inspected 48 ally frames and 8 effect stills. Preserved all original 0–3 frames in source backups; verified candidates in-game before promotion. Added sources/manifests, contact sheets, per-file asset log and `tools/ally-preview.html`. Rejected the first painterly effect sheet and corrected the retry's empty gutters.
- Registered seven animation states with legacy four-frame fallback. Ally windup/strike/recovery now gates actual damage/casts at frame 8, with shadows, trails, impact effects, skill-pop ring and future ally audio IDs falling back to existing sounds. No skill definition, damage/rank number, movement or targeting rule changed; no audio files touched.
- Fixed the early basic-attack path running before the choice/end guard. Pending actions now freeze on choice pause and cancel on shutdown/end; failed skill casts release their reserved cooldown/global gap.
- Targeted ally suite: **45/45 pass**. Final `npm run check`: **602/603 pass**, sole pre-existing French audit failure (`MANA`, `Cacao`). Production build passes separately, with the existing large-chunk advisory.
- Candidate and promoted real-Phaser audits each complete **600 simulated seconds per ally**; all **18/18 active skills** cast, all seven state keys render, and effects peak at **10/12/11 of 24** for Saintess/Tank/Assassin. Tank's 487 basic hits all deal 7 on frame 8; Assassin's 612 all deal 12 on frame 8. Zero browser/HTTP errors or missing stills. See `ART_QA_V16.md` and `previews/v16/runtime/report.json`.

Open issues: strict zero-warning gate remains unmet for pre-existing optional Overgrown ambience files (`overgrown-base`, `wind-soft`, and `rain-light` if rain occurs). Requested Flare routing is unexposed. No mobile FPS or audible-playback certification; no invented ally death mechanic. Unrelated dirty work and localization failure are preserved.

## V17 — Manifest-driven audio — 2026-10-05

- Added compact build-time manifest compilation, one bounded Web Audio mixer, lazy run/boss preparation, positional cues, category/master controls, voice enable switch, localized dialogue, music/phase/loop crossfades and nested ducking. Connected skills, enemy/boss/ally lifecycle, weather, narration, pickups/hit/shield/heal feedback and UI hooks. No production audio files or gameplay numbers changed.
- Added `audio:check`, `test:audio-v06` and `test:audio-v06:browser`; reports in `AUDIO_REPORT_V17.md`, `AUDIO_AUDIT_V17.json` and `previews/v17/`. The asset checker validates literal and generated event families and reports missing content by priority.
- **12/12 targeted audio tests pass**. Live and isolated-change browser checks each complete **600 seconds missing + 600 seconds present**, with valid temporary silent MP3s for the latter, no console/HTTP errors, maximum 24 effects and eight enemy voices. EN/FR/AR Audio settings fit 568×320 with scrollable 44px targets and persisted voice controls. Real output-mixer signal verified for fallback audio; human listening remains pending.
- Final `npm run check`: **614/615 pass**, sole pre-existing French `MANA`/`Cacao` audit failure. Production build passes separately (existing chunk-size advisory). `audio:check` passes ID/budget validation; runtime content missing **P0 264 / P1 85 / P2 112**, size **0 / 45 MB**. Downloads contains 91 MP3s / **2.03 MB**, inspected but not copied under the explicit no-audio-write instruction.

Open issues: developer placement of audio files, typo/unmapped-file review, final listening/Android checks and authored Ah Puch section offsets. Full details and conservative decisions are documented; unrelated edits remain outside the V17 commit.

## V18 — Release localization — 2026-10-06

- Completed and registered EN/FR/AR release copy, including enemy/map/weather labels, settings/editor/Replace/Skills/ally copy and twelve loading tips. Included the existing skill translations, localized passive state and deterministic translation generator. FR/AR tables are marked `// TODO native review`; obsolete generic skill descriptions no longer reach the UI.
- Fixed localized panel width, scrolling ally headings, replacement card text bounds, results-footer clipping, Arabic label fonts and choice/settings overlay direction. HUD coordinates, Western numerals and key letters remain LTR. Corrected the obsolete Heroes help text to the actual slot rules.
- `npm run test:i18n`: **8/8 pass**, **726 dictionary / 168 runtime keys**, zero untranslated keys; negative tests demonstrate that missing/English-copy/placeholder failures are rejected. Fixed the previous false failure for the genuine French cognates `MANA` and `Cacao`.
- `npm run check`: **618/618 tests pass**, production build passes (existing large-chunk advisory). `npm run test:i18n:browser`: **222 captures pass**, EN/FR/AR at **568×320 and 1280×720**, zero browser console errors; Arabic screenshots visually reviewed. Intentional scrolling retains readable text and reachable controls.
- See `I18N_REPORT_V18.md` and `previews/v18/report.json` for coverage and evidence. No art/audio files, dependencies or gameplay numbers changed; unrelated dirty work was kept outside this commit.

Open issues: native proofreading and Android rendering review; pre-existing incomplete seven-tab Settings implementation and legacy Ixchel skill pool. The browser matrix uses the current checkout's earlier uncommitted UI prerequisites; this task does not absorb or implement those unrelated features.

## V20 — Strict release review — 2026-10-06

- Reviewed the current release working tree against V06_SPEC, v06_design and the prior skills spec. Added `docs/v0.6/REVIEW.md` with the acceptance checklist, evidence, fixes, blockers and ship recommendation.
- Fixed zero-velocity stuck recovery for collision-blocked ground enemies and added slow-progress/stationary regression tests. Fixed 568×320 compact-landscape hero/map card overflow and line-height; corrected stale viewport/settings test assumptions.
- Verification: `npm run check` **620/620 pass + build**; HUD **497 pass**; viewport **476 pass**; typography **100 pass**; i18n **8 pass / 0 untranslated**; skills validator **108 entries OK**. Menu landscape matrix passed; extra portrait guard fails. Settings browser test is inconclusive (`ERR_STRING_TOO_LONG`); loading map-art check fails.
- Release blockers remain: audio **0/461** (264 P0 missing); no registered map art and Blood Moon assets absent; pacing misses for Balam/Kukul; 4× sample ~47.2 FPS; residual bot stuck reports and 20-minute/mobile/boss-kill validation still need resolution. Recommendation: **do not ship**.

## Android startup repair — 2026-10-06

- Investigated the reported Galaxy A56 silent close. The old Desktop APK launches on the available emulator, but a forced WebView renderer crash reproducibly kills its Android host. Added bounded recovery, persisted Canvas/software rendering after an observed failure, native EN/FR/AR Retry UI and dead-WebView lifecycle guards. Saved progress is never cleared.
- Fixed early safe-inset publication, false failures of healthy slow texture batches, and packaged UI/loading/boss-frame CSS URLs requesting `/assets/assets/`. Reused the helper in the existing untracked menu kit without absorbing its unrelated implementation into this commit.
- `npm run check`: **628/628 pass + production build**; eight new regressions. Offline debug/release compilation and `lintDebug` pass; delivered debug APK verifies with v2 signing, package/version identity retained, Android build code **7**.
- Android 17 / WebView 149 / 16 KB-page emulator: first-crash recovery **7/7 pass**; all three hero/map/language gameplay routes **18/18 control assertions pass**, zero page errors/HTTP failures; native repeated-crash/Retry/save/intro checks **12/12 pass**. Captures and reports live in `artifacts/android-startup/`. Two harness pitfalls were diagnosed rather than shipped as unnecessary game changes: fullscreen system education intercepted Back, and Android uppercased the Retry label.
- Copied the **127,069,951-byte** installable APK to `C:/Users/kossa/Desktop/Sangre-y-Jade-v0.6.0-startup-fix.apk`; source/copy SHA-256 match. The previous Desktop APK is preserved. See `ANDROID_STARTUP_FIX.md` for reproduction, scope and evidence.

Open issues: no physical A56 is attached, so its exact trigger and hardware performance still need confirmation. This is a startup repair, not clearance of the pre-existing full-release review blockers. Unrelated dirty source/assets were preserved; no production audio, secrets or signing keys were edited, and no dependencies/content were downloaded.

## Galaxy A56 physical-device crash repair — 2026-10-06

- Prompt: the user still sees Samsung's app-crash dialogs after build 7. Connected the actual Galaxy A56 (Android 16 / API 36), read app-only logs, and reproduced the native launch failure: Samsung `PhoneWindow.getInsetsController()` dereferences a null decor before `setContentView()`.
- Fixed fullscreen initialization to create the decor first and obtain its controller from the view. Kept existing rendering, immersive flags, Back handling, gameplay and assets. Added a source regression guard that fails before the fix and passes afterward, plus cold-launch/background options and isolated output paths in the existing device smoke runner.
- Verification: `npm run check` **629/629 pass + production build**; offline Android debug/release compilation and `lintDebug` pass. Installed build **8** in place on the user's phone with saved data retained. **44/44 real-phone assertions pass**: three cold launches; intro/Skip; three hero/map/language gameplay routes with touch movement/dash, pause, Settings/Back and Resume; Home/background/resume. Zero page errors, HTTP asset failures or new native crashes. Normal accelerated WebGL works; route loading is **5.22 / 4.37 / 5.29 s**.
- Delivered and installed the signature-verified **0.6.0 build 8** APK, copied to `C:/Users/kossa/Desktop/Sangre-y-Jade-v0.6.0-A56-fix.apk` (**127,062,265 bytes**). SHA-256 matches the source: `96060d14a73f67ede7bd184e1dfe7b976eeb503cb4b2bc839a73313218babed6`. Earlier APKs remain untouched. Restored the original English menu and removed test-only runtime overrides by ending the smoke run.
- Evidence: `ANDROID_A56_FIX.md`, `artifacts/android-startup/a56-build7-crash.txt`, four `a56-*` report directories and three native gameplay screenshots. The earlier unknown-device limitation is now resolved for this launch failure.

Open issues: this short startup/control validation does not clear the unrelated full-release review blockers or certify long-run balance/performance. The installable APK uses the existing debug signing identity; the release variant is unsigned. No audio, secrets, production keystores or dependencies changed; unrelated dirty work is preserved.
