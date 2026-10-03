# Step 21 final verification — 2026-10-03

**RELEASE GATE: NOT PASSED.** The audit is complete; the overhaul is not ready to certify. Missing Step 9 gameplay, Step 17 recipe integration and unfinished Step 19 coverage remain prerequisites, not unused code to delete. No combat/XP/mana rebalance, asset generation/deletion, music/voice, dependency, or protected-file changes.

## Gate summary

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| Requested strict icon validator | OK | 114 total canonical icons; supplied validator checks 108 and warns about the six optional UI icons, which this audit covers. |
| All assets wired once | FAIL | 114 icons, 164 stills, 150 WAVs exist and are hash-unique. 24 ally recipes are absent, leaving 42 untracked stills without runtime references. 9 Ixchel gameplay handlers absent. |
| Every skill × 10 s | FAIL | 98 catalogue entries; 89 real ten-second fixtures. 9 missing handlers; 15 old Ixchel compatibility casts. 19 ally placeholder warnings. 0 runtime/console errors; 0 HTTP errors; 0 missing-sound records. Peak FX units 24/24. |
| Full-run capacities / one-shot markers | PASS | All 15 legal runs: 3/1 initially, 3/2 at L10, 4/2 at L20 if reached; no oversubscribed slots or repeated marker. Shared traits take no slot. |
| Actual milestone cards | FAIL | Ixchel consumes L10 marker without a passive choice because her passive pool is absent. Kukul/1701 never reaches L20; not counted as a false success. |
| Companion acquisition | PASS | 15 runs: recruit at 5 with one signature; second/third skills at 8/14; no other ally choice screens. |
| Every ally skill naturally casts | OPEN | 18 actives + 6 passives observed in controlled mock-scene audit, and separate legal 600-second runs per role. Some owned reactive heals remain idle. Eight skills cannot coexist in three slots. |
| Section 8 balance bands | OUTLIERS | L10 and first-boss median spreads exceed 15%; unresolved boss fights and authored DPS band conflicts listed in BALANCE_REPORT.md. No rebalance. |
| Cleanup | PARTIAL | Deleted numeric icon files/central LEGACY switch/old ally adapter already absent. Fixed numeric ally cast texture; gated debug globals. Used Ixchel compatibility module/data retained deliberately. |
| Full unit suite | 278/279 | 1 unchanged Step 19 failure: untranslated-key checker flags valid French MANA and Cacao. Two Step 21 regressions pass. |
| Production build | PASS | 10.63 s; existing >500 kB chunk warning. |
| EN / FR / AR startup | 6/6 PASS | Actual production menu-to-run flow, both phone-sized viewports, correct language/direction, no page/control overflow or accidental debug globals. This is startup coverage, not all-text native review. |
| Mobile performance | OPEN | Desktop phone-viewport proxy only. Balam records long frames; no physical Android device measured. |

## Asset ownership and leftovers

“Exactly once” means one canonical skill/variant owner and one file, not a single rendering call site. JSON icon paths, recipe still lists and audio manifest paths are the ownership references. All PNG sizes/alpha and SHA-256 duplicates are checked. Multiple HUD/card uses are legitimate. No extra files or old numbered icons were found in the audited asset directories. See [assets.json](verification/assets.json) for every file, hash, size, ownership/reference and tracked status.

Missing Ixchel gameplay: `copal-veil`, `ancestral-echo`, `mana-spring`, `lunar-boon`, `rooted-meditation`, `jade-resilience`, `spirit-harvest`, `crescent-blessing`, `mana-overflow`. Her 20 live legacy actives and compatibility module cannot be safely deleted until Step 9 is implemented. Five legacy IDs still use the missing-icon marker: smoking-mirror, ceiba-breath, blue-fire, ancestor-chorus, moon-tears. Canonical JSON icon validation does not cover these obsolete live IDs.

All 24 ally recipes are missing despite 42 present untracked ally PNGs from interrupted Step 17. Eighteen actives and Saving Grace emit fallback warnings; the other five ally passive fixture rows have no FX stages. These files were not swept into this commit or represented as completed integration. All eight intentionally silent passive SFX briefs remain silent; the 150 expected manifest WAVs include UI sounds. Missing gameplay/event hooks cannot be certified merely because their WAV exists.

Source inspection finds no central `LEGACY` switch, `LegacyAllyAdapter`, old `chooseInitial`/`offerChange`, numeric icon references, debugger statements or console.log/debug calls in src. No unused import was identified in the changed runtime modules; no general-purpose unused-import linter is configured. `?fxdebug=1` and development retain the diagnostic handles; ordinary production does not. No new debug overlay is claimed.

## Full-run slot/milestone evidence

| Hero | Ally | Seed | Capacities / owned slots | One-shot markers | Actual extra card levels | Companion flow |
| --- | --- | --- | --- | --- | --- | --- |
| balam | saintess | 1701 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | saintess | 1702 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | saintess | 1703 | PASS | PASS | 10, 20 (PASS) | PASS |
| ixchel | saintess | 1701 | PASS | PASS | 20 (FAIL) | PASS |
| ixchel | saintess | 1702 | PASS | PASS | 20 (FAIL) | PASS |
| ixchel | saintess | 1703 | PASS | PASS | 20 (FAIL) | PASS |
| kukul | saintess | 1701 | PASS | PASS | 10 (PASS) | PASS |
| kukul | saintess | 1702 | PASS | PASS | 10, 20 (PASS) | PASS |
| kukul | saintess | 1703 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | tank | 1701 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | tank | 1702 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | tank | 1703 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | assassin | 1701 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | assassin | 1702 | PASS | PASS | 10, 20 (PASS) | PASS |
| balam | assassin | 1703 | PASS | PASS | 10, 20 (PASS) | PASS |

Snapshots record slot capacity, not a promise of three skills already equipped at level 1. Innates have separate storage. Each available marker was recorded once after its normal level choice. Existing unit tests additionally exercise multi-level jumps and draft rules. Raw chosen cards/levels and each earned-level snapshot are in the three full-run reports.

## Browser and performance evidence

Production Chromium 154.0.8037.97, win32; no CPU throttle. Renderer: ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11). A 144 Hz host can yield >60 FPS despite the in-game FPS preference; do not interpret that as an Android measurement or an enforced 60 FPS cap.

Real post-render intervals after two seconds warm-up, ten seconds sampled, 60 durable enemies and three level-six skills on real cooldowns. Resources/survival are controlled only for this performance fixture. A long frame is >33.4 ms; the check requires ≥55 average FPS, zero such frames and ≤24 FxDirector units. The director cap counts particle units as well as sprites. Total effect sprites separately include the legacy effects group; the 24-unit cap does not cover that older group.

| Hero | Viewport | FPS | p95 ms | Max ms | Frames >33.4 ms | Peak director units | Peak total effect sprites | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| balam | 568×320 | 143.3 | 7.5 | 41.3 | 1 | 24 | 84 | FAIL |
| balam | 320×568 | 140.3 | 7.5 | 74.4 | 4 | 24 | 84 | FAIL |
| ixchel | 568×320 | 144.0 | 7.5 | 16.1 | 0 | 24 | 29 | PASS |
| ixchel | 320×568 | 144.0 | 7.5 | 16.1 | 0 | 24 | 31 | PASS |
| kukul | 568×320 | 144.0 | 7.5 | 10.5 | 0 | 23 | 27 | PASS |
| kukul | 320×568 | 144.0 | 7.5 | 11.2 | 0 | 23 | 27 | PASS |

Representative Arabic portrait startup and Balam landscape combat screenshots were visually inspected. Screenshots for all six startup and six performance cases are retained under [verification/](verification/). Measured Balam stalls remain a performance outlier; physical mobile testing and legacy-effect load review remain open.

## Commands, results and reproducibility

| Command | Exit | Wall seconds |
| --- | --- | --- |
| node docs/skills-redesign/validate_skills.mjs docs/skills-redesign/skills_redesign.json --assets public/assets/pixel | 0 | 0.07 |
| node scripts/verify-skill-assets.mjs | 1 | 0.57 |
| npm run test | 1 | 2.47 |
| npm run build | 0 | 10.63 |

- `node scripts/final-skill-playtest.mjs` — expected exit 1 with the recorded missing prerequisites; [skills.json](verification/skills.json). Real Phaser handlers/passive hooks, 300 × 1/30-second frames per supported skill, controlled targets/resources, no fabricated results for missing handlers.

- `node scripts/final-browser-check.mjs` — run after building; exit 1 for Balam stalls, six startup checks pass; [browser.json](verification/browser.json).

- `node scripts/final-verification-checks.mjs` — retains all required validator/test/build command output even on failure; [checks.json](verification/checks.json).

- Full-run commands, every boss timing, per-skill damage, companion cast counts and band outliers: [BALANCE_REPORT.md](BALANCE_REPORT.md).

- `node scripts/summarize-verification.mjs` — regenerates these reports and [acceptance.json](verification/acceptance.json) from evidence, never from guessed results.

Tests ran against the existing working tree, including pre-existing unfinished Step 19 and Step 17 work. Those unrelated dirty files remain outside this scoped commit; reports explicitly name that limitation. The current whole-workspace suite is not green, and a clean-checkout certification is not claimed.
