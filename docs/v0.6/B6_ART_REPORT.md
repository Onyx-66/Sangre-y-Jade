# B6 — Overgrown procedural art kit

Date: 2026-10-08. Branch: release/0.6.0. Scope: B6 only; no APK, audio edits or downloaded assets.

## Delivered

- 103 separately generated final PNGs: six grounds, ten trees, ten plants, six rocks, six debris, eleven buildings, ten props, twelve water images, fifteen modular structures, three statues and fourteen weather stills. Exact paths/sizes: [catalog](sources/b6/catalog.json). Nine native/normalized source sheets and slicing manifests retained.
- Updated bottom-centre anchors, visible-base footprints, rectangular statue/stela bases, canopy/roof occluders, closed painted doors, breakable flags and stair direction/level metadata. Village huts now render at .9 scale rather than .55 so doors/walls are large enough beside the hero. Existing Training doors remain solid. Collision-checked side paths lead around houses to their real front doors; no facing is silently moved to another painted wall.
- Selected-map lazy preload includes 89 Overgrown textures. Camera-local terrain pool is bounded at 320; animated deep/shallow tiles freeze for reduced motion. The existing prop/overhead pool retains its 350 cap. Tier art, continuous stair strips and bridge decks use the real assembler/grid data. Water effects reuse/destroy their images under the existing quality budgets. WeatherDirector consumes the same fourteen still IDs without new audio.
- Reusable commands: `npm run test:b6-art` and `npm run test:b6-art:browser`. Source preparation runs `scripts/prepare-b6-art.mjs`, which calls `scripts/slice-sheet.mjs`. No old assets were deleted; previous live files are backed up locally under `.tools/b6/previous` and tracked predecessors remain in Git.

## Verification

- Asset tests check all 103 dimensions, unique image bytes, nonempty alpha, magenta-key cleanup and matching opposite edges for every full-bleed tile and the horizontal foam strip. Every source/contact image and individual object was visually inspected; ground/water/fog 3x3 previews are in `previews/b6/tile-*.png`.
- B5 structure validation passes 100 seeds per map with radius-11 swept door paths, valid tops, bridge placement and no overlaps. The collision bot reaches a settlement and the landmark top on all maps.
- Browser evidence: [report](previews/b6/runtime/report.json), four world screenshots (centre, corner, settlement, four-face pyramid) and 29 object/structure galleries with the hero and footprint/occluder overlays. Seed `b6-art-4`, world hash `51f98781`. Zero page/console/HTTP errors. At the four checkpoints, 61/61/70/75 allocated prop+overhead sprites (cap 350), and 117/117/140/140 terrain sprites (cap 320).
- The full check and final frame-time results are recorded in the B6 PROGRESS entry. Timing is a 360-frame unthrottled headless Chrome rAF sample with collision overlay disabled, on Intel UHD / ANGLE D3D11. This is neither a phone test nor a 60fps claim.

## Open quality gates — not a complete B6 acceptance

- **South-ascending stair art is rejected for ambiguous perspective.** Two targeted correction passes still suggest north-rising steps despite the near landing. The candidate PNG/source is preserved for review, but `approved: false` prevents its use by the renderer; authoritative procedural step lines remain for this direction. The other three directions use their new art. A genuinely south-rising replacement is still required.
- Exact gpt-image-2.5 Flare/Sunburst routing is not exposed by the built-in tool. These were requested in prompts, not independently verified. Asset log is explicit about that limitation.
- Base/crop measurements are visually calibrated against the generated silhouettes, not an exhaustive proof of the requested 8px tolerance. Trees intentionally block at their trunks, not every spreading root. Full per-object collision sweeps and physical-phone art/performance review were not rerun in this art task.
- Ground texture repetition remains visible over large areas; edges have no discontinuity, but this is not a claim of nonrepeating terrain. Natural boundary silhouettes retain the B4 procedural fallback. Some supplemental kit pieces are loaded/catalogued for the assembler but are not selected by every seed.
- Desktop frame time remains well above 16.7ms. No unsupported claim is made that this art pass fixes the existing renderer's mobile performance. Existing unrelated dirty Android/audio/save/build/test-artifact work remains outside this commit; results describe the working checkout, not a clean-clone release certification.
