# v0.6 Progress

## Prompts

- [x] 01 — Replacing skills
- [x] 02 — HUD clarity and fixed EN/AR positions
- [x] 03 — Shared toggles and paused settings
- [x] 04 — Fullscreen viewport and safe areas

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
