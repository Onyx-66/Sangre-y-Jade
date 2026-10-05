# V9 enemy visual verification

Date: 2026-10-05. Branch: `release/0.6.0`. Intended version tag: `v0.6.0-v9`.

## Delivered

- 15 independently generated, consistent-character sheets: 240 separate alpha PNGs, each 128x128, using the specified 16-frame order. The five original designs remain recognizable; ten new enemies have distinct silhouettes.
- 18 separate alpha effect stills, each 256x256, at `public/assets/pixel/fx/<effect-id>/main.png`. Their canonical recipes are registered once; 30 enemy ability aliases reference them without duplicate bitmap files or alias-file requests.
- Seven real Phaser states: idle, walk, windup, attack, recover, hurt and death. Four-frame heroes, companions, bosses and legacy actors keep their old animation definitions. Lazy loading selects the current map and excludes fliers for ground-only heroes.
- Non-physics rendering adds squash/stretch, jump/dive shadows, emergence, a 65ms white flash, typed death dissolution and pulsing elite outlines. Original physics sizes, roster numbers, AI geometry, attack timers and kill/XP timing are unchanged. Warning ornaments cancel with their owner/cast; shields expire or detach on reuse. Detached deaths share the existing 24-effect-unit budget.
- `tools/actor-preview.html` is development-only, with 105 independently looping actor/state displays and a working pause control. It decodes all 240 source frames; no production screen links to it.

## Asset quality and provenance

All native sheets and every final actor contact were visually reviewed, as were the final 18-effect contact and in-game actor/effect captures. The initial Drowned Spirit was rejected for resembling the Shade; its replacement uses a tall water-corpse silhouette with waterfall hair and kelp. Vine Snare and Wisp Explosion were corrected to a closed ground ring and spherical burst. Original/rejected outputs are retained, not deleted.

`check-enemy-art.mjs` checks dimensions, alpha, nonempty bounds, baseline margins, SHA-256 uniqueness and opaque magenta pixels. It compares every enemy pair using a 48px RGB difference and 64-bit dHash (rejecting distance <=6 with RGB difference <12). Result: **258 files, 258 distinct hashes, zero opaque magenta pixels, no flagged pair**. The nearest pair has dHash distance 18. Similarity is a conservative duplicate warning plus visual review, not an assertion of perfect perceptual classification.

The 20 original base frames are preserved byte-for-byte against the pre-V9 commit in `art-source/v0.6/enemies/legacy/`. No old asset or audio file was deleted. The generated originals, normalized/reflowed sheets and slicing manifests are in the same source folder; exact prompts and one provenance line per final file are in `enemy-art-sources.json` and `ASSET_LOG.md`.

Requested image route: **gpt-image-2.5 Flare**, with Sunburst requested for three near-miss corrections. The built-in service exposes no model/variant selector or verified routing metadata. Native output is 1254x1254; the preparation pipeline preserves originals and reflows complete connected components to 2048x2048 before slicing. Exact output sizes are verified; native 2048 detail is not claimed. No image was downloaded or procedurally drawn.

## Automated checks

| Command / fixture | Result |
| --- | --- |
| `node --test tests/enemy-visuals.test.js tests/enemy-roster.test.js tests/slice-sheet.test.js` | 40/40 pass; 10 new V9 tests; 0.440s runner |
| `node scripts/check-enemy-art.mjs --candidate`, then canonical-path check | Both pass; 258 unique final files, exact sizes and alpha, zero pink fringe / similarity errors |
| `node scripts/v06-enemy-visuals-playtest.mjs --candidate` | 6 checks pass; real decoding, animation advance, pause and contact before promotion |
| `node scripts/v06-enemy-visuals-playtest.mjs`, worktree and indexed snapshot | 38 checks pass in each; 9 screenshots each; EN/AR, 568x320 and 1280x720; every one of the 240 frames advances on actual render sprites; real collision, FX cap, flash and serial-safe death/reuse/cleanup assertions |
| `npm run check`, indexed V9 snapshot | 421/421 tests, no skips; 2.502s runner; production build passes, 306 modules, 16.26s Vite |
| `npm run check`, full shared worktree | 451/452 pass, no skips; 2.538s runner / 3.874s command; same pre-existing French `MANA` / `Cacao` untranslated-key audit; its `&&` build is skipped |
| `npm run build`, full worktree | Pass; 317 modules, 14.38s Vite; existing large-chunk advisory only |
| `SYJ_LOADING_OUTPUT=docs/v0.6/previews/v9/staged/loading`, then `npm run test:loading` in indexed snapshot | 62 checks pass, 8 screenshots; lazy loading, real progress, retries, optional Continue, Back, EN/FR/AR |
| `git diff --cached --check` and scope/backup audit | Pass; no protected paths, native code or audio files staged; all 20 legacy frames match pre-V9 bytes |

The isolated source snapshot contains indexed V9 code, not earlier unfinished menu/editor/translation code. An initial check was started before its mechanical copy finished; it was discarded, its diagnostic directory retained, and the completed snapshot rerun. Three historical loading screenshots overwritten by an initially unredirected regression command were restored to their original tracked bytes. Final V9 evidence is routed to its own folder.

## Ten-minute headless runs

Command: `node scripts/v06-roster-playtest.mjs --enemy-visuals --label=v9-ten-minute-final --output=docs/v0.6/previews/v9/roster`. Indexed-source repeat uses label `v9-staged-ten-minute` and output `previews/v9/staged/roster`.

Real Phaser physics, fresh save, Kukul, quick mode, seed 1701, 30Hz simulated steps, real damage and progression. Coverage prefers eligible unseen packs; map eligibility, alive caps, numbers and off-screen spawning are unchanged. No forced XP, kills or immortality. Every eligible enemy and active attack appears; all seven animation states are exercised.

| Map | Duration | Kills | Cacao | Lv 10 | End level | Max FX units | Exceptions / HTTP errors / missing enemy assets / stuck enemies |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Overgrown | 600s | 280 | 102 | 358.27s | 14 | 24 | 0 / 0 / 0 / 0 |
| Bloodmoon | 600s | 306 | 96 | 324.43s | 16 | 24 | 0 / 0 / 0 / 0 |
| Cenote | 600s | 274 | 70 | 349.07s | 14 | 24 | 0 / 0 / 0 / 0 |

The worktree and indexed-source runs match **V8's kills, cacao, level timings and attack counts exactly**. Indexed-source wall time for three runs: 33.88s. No gameplay tuning is hidden in this visual step. Earlier pacing outliers remain outside V9; level 20 is not reached in these coverage-biased runs.

Audio is muted for deterministic presentation testing. The enemy-only fixture explicitly reports/skips unregistered companion FX (`healing-circle`, `jade-ward`, `sanctuary-dome`); those existing presentation gaps are not enemy missing files, and their mechanics continue running. Warnings are not filtered from console output. There are no enemy/hero missing-file warnings or HTTP failures. This does **not** certify unfinished companion FX or a fully warning-free audible production run: enemy audio retains V8's once-per-id old-sound fallback until the recordings step.

## Evidence and remaining limits

- `previews/v9/enemy-lineup.png`, each `<enemy>-contact.png`, `effects-final.png`, `art-quality.json`.
- `previews/v9/runtime/` and `previews/v9/staged/runtime/`: reviewed actor/effect captures, full-state gallery, strict reports.
- `previews/v9/roster/v9-ten-minute-final.json` and `previews/v9/staged/roster/v9-staged-ten-minute.json` contain spawn/cast counts, states, pool peaks, exclusions and every exception/warning/request report.
- `previews/v9/staged/loading/` holds the loading regression evidence, without replacing V6 history.

No Android device/emulator or audible manual test was available; no mobile FPS or native-performance claim. New audio, map geometry, boss sheets, unfinished companion FX and unrelated UI/localization work remain for their own prompts. No download, dependency, branding edit, APK, package-version change or GitHub push is part of V9.
