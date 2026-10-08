# B7 — Blood Moon procedural-world art

Date: 2026-10-08. Scope: B7 only, branch `release/0.6.0`.

## Delivered

- 85 distinct PNGs under `public/assets/pixel/maps/bloodmoon/`: ground 6, trees 8, plants 8, rocks 6, debris 6, buildings 10, props 10, water 12, structures 15, statues 3, torch glow 1. Total installed PNG size: 8,173,449 bytes (7.79 MiB).
- Ten source sheets/correction passes, counted slicer manifests and category contacts. Exact dimensions, unique decoded-image hashes, key-colour removal and opposite tile-edge equality are tested. Generated assets use the imagegen skill's built-in tool; native resolution/model limitations are disclosed in ASSET_LOG.md.
- Bottom-centre anchors, measured trunk/wall/statue footprints, overhead crops/occluders, closed authored doors, light flags, four stair directions and native rail metadata. Existing assemblers retain the authoritative collision geometry and elevation transitions. Gate/chains use the catalog's separate pier solids, not a solid canopy rectangle.
- Selected-map preload now supplies this kit to the existing terrain, structure, water-effect and weather-light consumers. Four-frame deep/shallow water respects reduced motion; terrain stays below actors and telegraphs. Alpha-overlap terrain seams were removed. Existing 350 prop/overhead and 320 terrain allocation caps are preserved.
- Village scale 1.2 and ossuary scale 1.05 keep doors approximately hero-relative; all-map placement/collision regressions were checked. No combat numbers, audio files, dependencies, other map assets or protected files changed. No old assets were deleted; replacements have local `.tools/b7/previous` backups.

## Evidence and commands

- `npm run check`: **685/685 tests passed, production build passed**; existing Vite large-chunk advisory remains (main JS 2,157.04 kB / gzip 595.90 kB).
- `npm run test:b7-art`: **4/4 passed**, including final rail metadata and transparent-night-tile extent assertions.
- Full check includes **100 structure seeds per map**, physical settlement/landmark-top navigation, and **900 generated worlds** with minimum **95% connectivity**. Concurrent-suite maximum generation was **769.99 ms**; this exceeds B4's 600ms target and is not relabelled as a timing pass.
- `npm run test:b7-art:browser`: zero page, console-error and failed-HTTP entries. Browser script uses installed Chrome and local Vite, no downloads. Benchmark hero is invulnerable and the first XP threshold is raised in the test only to avoid a level-up pause; normal enemy simulation remains active.
- `previews/b7/runtime/`: centre, corner, settlement, pyramid, readable pyramid, combat-warning view, four-face assembly fixture, and 26 category collision galleries. Hero comparisons cover each building, tree, statue and stair. The real Blood Moon landmark retains exactly two stair faces; the four-face fixture is QA-only.
- All ten source sheets, final category contacts and fourteen 3×3 ground/water previews were viewed. Replaced ambiguous corners/stairs, banded/cracked water, holed planks and bad matte effects; trimmed isolated debris below the ossuary/altar's actual bases. Added silhouettes/rail and collider measurements without moving the game's actor anchors.

## Remaining limits

Final isolated sample: **35.18 ms mean, 41.80 ms p95, 49.30 ms maximum** across 360 rAF frames (about **28.4 fps**), 1280×720 headless Chrome, Intel UHD ANGLE/D3D11, unthrottled, collision overlay off. Seed `b7-art-0`, final world hash `bcb1c92f`. Maximum sampled prop+pool+overhead allocation **82/350**; terrain allocation **113/320**. A 60fps target is **not met** on this measurement.

- Runtime success is not an unconditional artistic or release certification. Irregular tree roots and rock piles are represented by the requested simple circles; the 8px metadata is a visual calibration target, not a proven per-pixel contour guarantee. Enlarged building roofs can overlap visually in a dense village; physical bases and door approaches pass validation and overhead fading remains in use.
- Directional modules are aligned to assembler axes and high-end landings. Corrected south/east/west stones are slightly cooler/finer than the north module; final model/style approval remains human-reviewable from the four-face fixture. The earlier B6 south-stair rejection is unchanged.
- Natural boundary and narrow road strips retain the existing procedural rendering, not additional unrequested art. Ground variety uses coarse biome cells; repeated tile motifs remain visible even with seamless opposite edges. Supplied standalone landmark art is retained alongside modular runtime tiers.
- Exact gpt-image-2.5 Flare/Sunburst routing cannot be verified; native outputs were 1254px sheets, normalized to 2048px before slicing. Upscaling does not add native detail. No alternate generation service or download was used.
- No phone/Android frame-time certification or APK was requested. Desktop timings and allocation counts are in `previews/b7/runtime/report.json`; do not treat them as a 60fps pass. Unrelated dirty files listed in V07_BASELINE.md remain excluded; tests certify the working checkout, not a clean clone of those unrelated changes.

## Reproduction

Run `node scripts/prepare-b7-art.mjs slice N <native-sheet-path>` in sheet order, then `previews` and `install`. Later correction sheets replace only their listed ids. `scripts/slice-sheet.mjs` handles counting, keying, trimming, sizing and contact sheets; the wrapper adds periodic edge conditioning and backups. `node scripts/b7-kit-patch.mjs` prints an apply_patch document for inspected metadata. Use `?debug=collision&seed=b7-art-0` for normal in-game inspection.
