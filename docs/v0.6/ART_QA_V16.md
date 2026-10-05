# V16 — Ally visual verification

Date: 2026-10-05. Branch: `release/0.6.0`.

## Art

- 48 unique 128×128 transparent frames: Saintess, Tank, Assassin, each with idle (2), walk (4), windup (2), strike (2), recover (1), hurt (1), death (4).
- 8 unique 256×256 effect stills, all with alpha and no saturated magenta fringe. All three original sheets, the accepted effects sheet and every sliced item were viewed in the contact sheets. Designs preserve ivory/jade Saintess, armored jade-shield Tank and purple-hooded Assassin.
- Rejected the first effects sheet as too painterly. The retry uses low-resolution pixel clusters; its divider rules were stripped only in empty cell margins. Retained the rejected source for provenance.
- Native sheet size was 1254×1254. Normalized to 2048×2048 before slicing; all output dimensions verified. Requested gpt-image-2.5 Flare, but the image tool exposes no model-routing confirmation.
- Original frames 0–3 are retained byte-for-byte under `art-source/v0.6/allies/legacy/`. Candidates were inspected in the real game before promotion. No old assets deleted; no audio files changed.
- `tools/ally-preview.html` loops every state and previews the eight production recipes; `?candidate=1` reads the staging assets. Contact sheets and game captures are in `previews/v16/`.

## Real Phaser headless audit

Command: `node scripts/v06-ally-visuals-playtest.mjs` (also passed with `--candidate`). Each run advances 18,000 frames / 600 simulated seconds. High hero/enemy HP and fixed nearby threats keep the test alive; rotate six active skills, one per 100 seconds, alongside both passives. No pack/boss spawns or level-up interruptions. This is coverage, not a balance or real-time performance measurement.

| Ally | Seconds | Active skills exercised | Peak FX units (cap 24) | Basic hits | Basic hit frame / damage |
| --- | ---: | ---: | ---: | ---: | --- |
| Saintess | 600 | 6/6 | 10 | 0 (healer) | n/a |
| Tank | 600 | 6/6 | 12 | 487 | frame 8 / 7 |
| Assassin | 600 | 6/6 | 11 | 612 | frame 8 / 12 |

All seven state keys registered and exercised. Every canonical FX recipe creates real stills, stays within the cap and cleans up after completion. No browser exceptions, console errors, failed HTTP requests or missing-still warnings. Detailed per-skill counts are in `previews/v16/runtime/report.json`.

The strict zero-warning gate is **not fully met**: pre-existing optional audio warnings identify `sfx/ambience/overgrown-base.mp3` and `sfx/ambience/wind-soft.mp3`; a rain-event run may additionally identify `rain-light.mp3`. The harness records and allowlists exactly these external-delivery IDs; any other warning fails. Audio generation/modification is prohibited by V16.

## Automated checks and limitations

- Targeted ally mechanics/presentation suite: 45/45 pass, including delayed strike, failed-cast reservation release, strike-time no-waste revalidation, pause/end cancellation, legacy animation fallback, exact asset dimensions, unique hashes and preserved originals.
- `npm run check`: 602/603 pass; only the already-existing French `MANA`/`Cacao` audit fails. No unrelated translation edits made.
- `npm run build`: pass, with the existing >500kB chunk advisory.
- Ally definitions, rank multipliers, basic attack values and AI conditions remain unchanged. Presentation serializes windup/strike/recovery; attack effects occur on the first strike frame. Allies still have no death mechanic; death poses are previewed, not wired to invented damage rules.
- Future `ally-<id>-attack/cast` audio hooks use old spell/slash playback until AudioDirector supports these IDs. Audible playback and mobile FPS are not certified by this muted headless test.
