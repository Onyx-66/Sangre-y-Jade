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
