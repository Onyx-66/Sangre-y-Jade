# v0.6 Progress

## Prompts

- [x] 01 — Replacing skills

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
