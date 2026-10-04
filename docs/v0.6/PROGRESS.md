# v0.6 Progress

## Prompts

- [x] 01 — Replacing skills
- [x] 02 — HUD clarity and fixed EN/AR positions

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
