# Step 22 — Strict branch review

Date: 2026-10-03. Branch: `feature/skills-overhaul`.
Scope: the 864-file committed overhaul diff from `main` (`02a8063`) through Step 21 (`9f9514e`), plus the focused fixes below. Specification/JSON are authoritative; the session's still-image/procedural-audio overrides supersede the older production instructions.

**Verdict: changes requested; not release-ready.** Eight reproduced boundary defects are fixed. Missing implementation, visual correctness, localization and performance/balance gates remain open. Passing the supplied JSON validator does not establish runtime acceptance.

## Method and scope preservation

- Inspected the changed-file inventory, catalogue generators/definitions, hero/ally handlers, status/combat/choice paths, FX/audio lifecycle, HUD/draft/i18n and SaveSystem. The §3.1 matrix below distinguishes data validation from actual implementation.
- All 74 implemented Balam/shared/Kukul/ally definitions match JSON names, descriptions, owner, kind, cooldown and icon paths. Three generators reproduce their checked-in output byte-for-byte in a virtual filesystem; no data file was rewritten. Existing mechanic tests call real handlers/scene methods with mocks.
- Rehashed all **428** canonical Step 21 assets: **114 icons, 164 stills, 150 WAVs**, all unchanged. Reused their recorded dimensions/alpha/ownership audit and reran asset/audio tests. Reran 48-pixel icon pHash: no pair at distance ≤5/63; inspected the contact sheet. This does not prove that every animation is perceptually unique.
- Pre-existing unfinished Step 17 art, Step 19 localization/tests and menu work were preserved and excluded from the commit. Tests/build/browser checks use that actual working tree: translated renders do **not** establish committed Step 19 completion.
- No rebalance, redesign, dependency/download, generated/deleted game asset, music/voice, protected-path or save-schema changes. Only test-owned temporary PNG copies were removed after the uniqueness-check regression.

## Fixed findings

All eight reproductions failed before their fixes and pass now in `tests/overhaul-review.test.js`.

| ID | Severity / location | Defect and minimal fix | Regression |
|---|---|---|---|
| F1 | P1 — `src/scenes/GameScene.js:851` | Fully maxed skills/innates plus a no-swap roll produced zero boss cards and an inescapable paused modal. Keep awarded gear and continue the choice queue when no legal skill card exists; no stat boss reward or altered swap odds. | Real draft: 4 maxed actives, 2 maxed passives, 2 maxed innates, RNG .99. No modal; simulation resumes. |
| F2 | P2 — `src/skills/allies/saintess/healing-circle.js:9` | Healing continued outside the placed r150 circle. Capture the cast position; heal only within its radius. | Rank-1 inside heal 8 HP/s; r151 no heal; re-entry at r150 heals. |
| F3 | P1 — `src/skills/allies/tank/passives/guardian-link.js:11` | Redirection was capped by Tank HP. At 1 HP it provided no protection. Redirect the full JSON share and clamp the immortal Tank to 1 HP. | All five shares at Tank HP 1; out-of-range no redirect. Corrected old test expecting 46 instead of 40 hero HP loss from a 50-damage rank-1 hit. |
| F4 | P2 — `src/skills/allies/saintess/jade-ward.js:11` | Extra unscaled 10-second effect timer defeated rank cooldown scaling. Remove that redundant timer from the instant shield. | Rank-5 shield can recast after 8.4 s when consumed; shield cap still prevents waste. |
| F5 | P2 — `src/skills/allies/assassin/smoke-bomb.js:16` | Smoke visual stayed at the cast position but blind/slow followed the hero. Anchor its r140 status area at the visual's position. | Enemies in the placed cloud are blinded/slowed 25%; an enemy beside the hero 500 units away is not. |
| F6 | P2 — `src/scenes/GameScene.js:1005` | Pending new/upgrade/stat/swap callbacks could mutate loadouts after death/end. Guard choices and nested replacements; ended scenes cannot start pending normal/milestone picks. | End after opening replacement, then invoke replacement/new/upgrade/stat callbacks: no mutation or completion callback. |
| F7 | P2 — `src/systems/SupportSystem.js:94`, `:163` | Pending companion callbacks could recruit/equip and advance the choice chain after run end. Guard before mutation/completion. | Captured recruitment/equip callbacks cannot change an ended run. |
| F8 | P2 — `src/scenes/GameScene.js:580`, `:596`, `:683` | Late collision/damage callbacks could grant kills/passive rewards or reflect shots after the summary was decided. Guard damage/collision entry points and boss rewards. | Pending lethal projectile/direct damage after end leave enemy HP, kills and damage totals unchanged. |

## Section 3.1 acceptance matrix

| Rule | Result | Evidence / limitation |
|---|---|---|
| 1. Unique icon per skill/stat | Partial | 108 authoritative skill/stat entries + 6 UI files are unique; pHash passes. Five obsolete live Ixchel IDs have no matching authoritative icon (O1). |
| 2. Unique skill effects | Fail | 74 distinct registered recipe signatures; 24 ally recipes absent and 42 ally PNGs untracked (O2). |
| 3. Description/mechanic/animation agree | Fail | F2/F5 fixed two spatial errors. Ixchel remains old mechanics; Balam absolute scale resets invalidate displayed ranges (O1/O3). |
| 4. Ownership, only two shared traits | Pass for current pools | Converted pools have correct owners; two shared traits are innate. Ixchel is not cross-owned but has the wrong catalogue. |
| 5. Six or more hero-only passives | Fail | Balam 8, Kukul 8, Ixchel **0**. |
| 6. Unique short descriptions | Partial | JSON/generated copy agrees and working-tree translation length tests pass. Obsolete Ixchel data remains; unfinished Step 19 is not committed. |
| 7. Individual cast/proc sounds | Partial | 150 files pass format/duration/clipping/hash/layer tests; 8 explicit `None (passive)` briefs correctly have no file. Missing Ixchel passives cannot emit their cues. Step 18 listening gate remains open. |
| 8. Distinct ally mechanics | Partial | 18 active + 6 passive handlers, no temporary adapter. F2–F5 fix mechanics; War Cry mitigation lacks an incoming ally-damage consumer and rank magnitudes are inconsistent (O5). |
| 9. Slots/milestones | Partial | 3/1 → 3/2 at L10 → 4/2 at L20, caps 6/5, two free innates, earned-level/once-only sequencing pass. Ixchel has no passive cards; narrow milestone pools can offer fewer than 3 cards (O1/O6). |
| 10. Active/passive visual distinction | Pass with locale caveat | Gold keyed clickable squares versus jade circle/pips/tooltips, silver innates, text ribbons, reserved locked slots. Existing screenshots + fresh two-orientation resize checks pass. Live locale refresh remains O4. |

## Findings left open

### O1 — P1: Ixchel conversion is missing

`src/data/heroes.js:33` retains 20 old actives; `src/skills/ixchel/compatibility.js:21` dispatches old type adapters. Missing runtime entries: `copal-veil`, `ancestral-echo`, `mana-spring`, `lunar-boon`, `rooted-meditation`, `jade-resilience`, `spirit-harvest`, `crescent-blessing`, `mana-overflow`. Obsolete live IDs: `smoking-mirror`, `ceiba-breath`, `blue-fire`, `ancestor-chorus`, `moon-tears`.

Retained IDs also have wrong mechanics/numbers: Ancestor Flame is the old 47-damage/five-chain spell rather than the redesigned chain/burn; Moonwell is a delayed trap, not its damage/healing field. Mana regeneration remains 11/s before multipliers, with 3 mana/0.9 s basic attacks. New mana-passive sustainability cannot be certified against this implementation. Completing all of missing Step 9 or deleting a live hero is not a minimal review fix.

### O2 — P1: Ally effects are not wired or versioned

`src/fx/recipes/allies.js` does not exist. `GameScene.preload:43` queues hero/shared stills, not ally stills. All 24 ally recipes are absent; 42 PNGs remain untracked. Step 21 recorded 19 ally missing-FX warnings; five stat-like passives have no visual proc call. Step 17 needs recipes, stage calls, preload and committed provenance. Local file existence alone cannot make the build reproducible.

### O3 — P2: Balam visual geometry and recipe-test weakness

`src/fx/recipes/balam.js:40` initially sizes Jaguar's Roar to its hit diameter, then `setScale(.36)` discards that display size. `fade:11` ends at absolute scale 1.08: a 256-pixel texture ends at **276.48** units regardless of its **380**-unit base hit diameter or bonuses. Similar resets occur in Stone Maw (`:121`), War Drum (`:141`) and Heart of Balam (`:239`). Left for geometry-specific stage corrections/tests rather than a blanket helper change that would alter many authored timelines.

`fxRecipeSignature:308` hashes declared shape/motion strings, not actual tween behavior. Identical animation functions with different labels pass. Distinct metadata is not proof of brief/mechanic compliance; draw/tween traces and nameless visual comparison remain needed. Recipes also do not honor `reducedMotion`; do not claim that setting suppresses the new flashes.

### O4 — P2: Mid-run language refresh and unfinished localization

`src/i18n/index.js:13` changes document direction/language without notifying mounted HUD/cards/tooltips. `Hud.mount` translates static labels once; dynamic stats refresh separately. Fresh live probes starting in English reproduce the stale English pause label after an Arabic switch for **all three heroes**, with correct RTL geometry. No normal in-run language selector exists; this tests the underlying API edge case, not a shipped settings flow.

The pre-existing uncommitted Step 19 test incorrectly flags valid French `MANA` and `Cacao`. This is the unchanged sole full-suite failure. A narrow allowlist correction belongs with that untracked test, not a commit silently absorbing unfinished Step 19. Native FR/AR review is still required; complete committed translation coverage is not established.

### O5 — P2: Ally rank/mitigation limitations

Arrival at 5, picks at 8/14, signature-only arrival, 3 mixed slots/no replacement, capped rank, priority, .2 s evaluation/.8 s global gap, 8 s marked-only failsafe and pause/end gating pass. F4 fixes one actual rank-cooldown bypass.

`SupportSystem.modifiers:71` leaves Sanctuary/Beacon/War Cry percentages fixed; `consumeStealthStrike:84` leaves Vanish's bonus fixed, while damage/heals/Lifebond use the rank multiplier. This is inconsistent with the blanket “numbers × rank multiplier” wording. Passive skills already have explicit five-rank arrays; blindly multiplying every number would also change HP triggers, radii, durations and stack limits. Leave a targeted magnitude-scaling follow-up rather than double-scale passives or redesign eligibility.

As Step 12 already records, War Cry stores Tank mitigation but there is no enemy-to-companion damage pipeline. Guardian Link now redirects correctly without inventing that larger system.

### O6 — P2: Three milestone cards are not guaranteed

`SkillDraft.js:96` can return 0–2 cards for a full, mostly-maxed kind; at most one rare swap is allowed. `GameScene.showSkillMilestone:960` consumes the marker and skips an empty draft. A normal pick can fill the newly unlocked slot before the bonus pick. This respects no-duplicates/no-forced-swap but conflicts with literal “3 cards” in all states. Document the conflict rather than invent duplicates/guaranteed swaps. F1 fixes the separate hard boss softlock without changing draft odds.

### O7 — P2: Balance and physical-mobile gates remain open

Reviewed, **not rerun or relabelled as fresh**, the Step 20/21 matrices in `PACING.md`, `BALANCE_REPORT.md` and `verification/`. Eight of 36 final pacing timings miss their windows; a quick Kukul run ends at L19. Nine hero runs have 0 deaths, L10 median spread **18.7%**, first-boss median spread **103.7%** (different ground/flying encounters are a confounder). No XP/damage/cooldown/spawn rebalance here.

The three-skill mobile-viewport proxy measured **140.3–144.0 FPS** on desktop Chromium, not Android hardware. Balam had 1 landscape / 4 portrait frames >33.4 ms, maxima 41.3 / 74.4 ms. Director units stayed ≤24 but total legacy+director FX sprites reached **84**. This does not establish a whole-game particle cap or “no frame drops.” Fresh lifecycle probes pass, but are not a long-session heap profile.

### O8 — P3: Other incomplete checks / debug work

- `?fxdebug=1` exposes diagnostic handles, but not the missing-assets overlay requested in Step 4.
- Tests iterating only `HEROES` can pass with eight absent Ixchel passives. The independent JSON-driven audit detects them.
- Generic ally tests prove eligibility/cast/feedback, not every magnitude/area. Added F2–F5 boundaries; corrected the Guardian Link test that encoded a bug.
- Mock scheduling/rendering cannot establish visual geometry, hardware FPS or audible timbre. The prior 600-second ally audit rotates legal loadouts; it does not equip all eight skills simultaneously. Natural reactive skills may remain idle, correctly reported as such.
- The icon-check negative control does fail equal RGB subjects saved with different PNG channel formats; no checker code change was needed. Hash/provenance records cannot independently attest a historical image-model variant. No image generation occurred in this review.

## Validation evidence

| Check | Result |
|---|---|
| `node docs/skills-redesign/validate_skills.mjs docs/skills-redesign/skills_redesign.json --assets public/assets/pixel` | **OK**, no `--allow-new`; 0.08 s. Six optional HUD/shrine icons are expected orphan warnings. |
| `node --test tests/overhaul-review.test.js tests/icon-review.test.js` | **11/11 pass**: 8 reproduced defects + old-save compatibility, generator determinism, uniqueness-check negative control. |
| `npm run test` | **289/290 pass**, 2.36 s wall time; unchanged uncommitted French-word false positive. No disabled tests. |
| `npm run build` | **Pass**, 10.10 s, 251 modules; existing >500 kB bundle warning. |
| `node scripts/review-overhaul-audit.mjs` | Expected failed acceptance: 428 hashes unchanged, 74 definition checks pass, 74 unique recipe metadata signatures; 24 missing recipes and Ixchel pool gaps. |
| `node scripts/check-icon-similarity.mjs --contact docs/skills-redesign/review/icons.png` | 114 icons, no pair flagged; contact sheet inspected. |
| `node scripts/review-overhaul-browser.mjs` | **30 probes pass**, 0 runtime/console/HTTP errors; fails overall for 3 known live-locale findings. All heroes: manual/auto-mode skill clicks; EN/FR/AR runtime resize at 568×320 and 320×568; pause freezes time/mana/casts. |
| FX/audio shutdown in that browser run | Each hero reaches 24 capped units, then 0 active FX/voices/loops, 0 audio clients/update listeners/HUDs and a **closed** AudioContext. |
| `git diff --check` | Pass before commit. |

Raw results: `review/checks.json`, `review/audit.json`, `review/browser.json`; contact: `review/icons.png`. Prior full-run/phone-proxy evidence remains unchanged in `verification/`. Save test preserves v1 currency/upgrades/records/settings; run skill IDs are not persisted, so no migration is needed.

Step 22 review is complete. The release checklist remains open; this is **not** approval of the complete overhaul.
