# V11 — Boss roster implementation

Authoritative inputs: `V06_SPEC.md` section 7.2 and `v06_design.json`.
Branch: `release/0.6.0`; version tag: `v0.6.0-v11`.

## Coverage

| Boss | Phases | Implemented abilities |
| --- | --- | --- |
| Camazotz, 1400HP | 100 / 50% | Sonic Screech, Bat Swarm, Blood Dive, Eclipse, Twin Dive |
| Zipacna, 2300HP | 100 / 50% | Stone Slam, Rock Rain, Fissure Line, Stone Armor, Avalanche |
| Vucub Caquix, 3300HP | 100 / 60 / 25% | Sunbeam Sweep, Feather Barrage, Solar Flare Rings, Second Sun, Zenith |
| Ah Puch, 7800HP | 100 / 66 / 33% | Death Gaze, Bone Spear Ring, Soul Drain, Summon Lords, Xibalba Shift, Final Rite |

Each boss has one behaviour module and a function per ability. `compile-bosses-v06.mjs` extracts numeric parameters from the JSON prose, retaining source fields, thresholds, cooldowns and entry descriptions. Shared helpers use gameplay time, pooled warnings and serial-safe target ownership. The temporary legacy registry is no longer used; its old file is retained.

Exact mechanics include the 280px Eclipse visibility hole, 3s/6DPS trails, three shootable 150HP armor stones, arena-contained edge falls, the rotating 520x50 beam, three rings with two safe gaps, three shootable 80HP suns/stun, 4s flight plus 1.2s crash warning, timed tracking laser/double spear ring, drain/heal, two elite Priests, four moving fog lights and exactly three Final Rite safe circles. Charges resolve at phase-three +6s, then +20s cadence. Fairness guards cover every warning, entry damage, recovery and the 80-per-hit limit.

Distinct code-drawn bat/earth/sun/portal entrances run under V10 camera, pause, banner, skip and accessibility handling. New boss stills and developer recordings remain later work. Existing images/sounds remain intact; future asset hooks fall back once per missing file. No generated assets, downloads or dependencies are part of V11.

## Verification

Final results are recorded in `PROGRESS.md`. Reproduction commands (PowerShell, local installed Chrome):

```powershell
node scripts/compile-bosses-v06.mjs
node --test tests/boss-abilities.test.js tests/boss-framework.test.js
npm run check
node scripts/v06-bosses-playtest.mjs
node scripts/v06-boss-framework-playtest.mjs
```

`SYJ_BOSS_OUTPUT` can redirect evidence. The final index-only snapshot uses `previews/v11/staged/`; the shared working-folder run uses `previews/v11/`. Reports include per-ability casts, early-warning audit, phased samples, stones/orbs destroyed, peak effect/warning/task/target counts, cleanup, all browser warnings and HTTP/console errors. Contacts show the four entrances and EN/AR phone-size special mechanics. Framework regression additionally covers EN/FR/AR at 568x320 and 1280x720, physical boss-bar parity, skip, exact opener damage and one-shot delayed death/reward.

The three-minute fights are coverage stress runs with documented instrumentation, not balance playtests: hero HP 20000, boss-bound damage limited, phase thresholds staged, no normal packs, real Phaser updates/physics and existing auto-attack/skills. No production balance values are changed to pass tests. Audio is muted, final boss imagery/recordings are intentionally missing, and device/FPS/audible validation is not claimed. Decisions for unspecified geometry, phase inheritance and ground-only compatibility are in `DECISIONS.md`.
