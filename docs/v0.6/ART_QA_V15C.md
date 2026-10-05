# V15c — Sunken Cenote art verification

Date: 2026-10-05. Scope: Cenote artwork and its runtime integration only.

## Deliverables

- 56 catalog PNGs under `public/assets/pixel/maps/cenote/`: 6 ground, 8 trees, 8 plants, 8 rocks, 6 debris, 10 buildings, 10 props. Three independently generated 256px cyan/violet/green glow sprites. All 59 decoded images have distinct SHA-256 hashes and verified final dimensions.
- Native sheets and checked slice manifests in `sources/v15c/`. Six accepted sheets: four object sheets, three transparent glow cells, and six quieter replacement ground cells. The first glow result had inadequate margins and was regenerated; the final halo edges are transparent. Sheet 6 supersedes the six ground cells in sheet 1.
- All source sheets and every final item were visually inspected via the category contact sheets in `previews/v15c/`. Repaired neighboring-cell fragments by opt-in component ownership isolation in the slicer; regression test demonstrates the prior failure. No text labels, cut-off buildings or saturated magenta edges remain. Generated geometric carved relief is decorative, not UI text.
- All six ground textures were viewed tiled 3×3. Opposing edge pixels are identical after a 12px periodic edge blend. Quieter replacement ground reduces repeated bright features behind enemies and telegraphs.
- Real paths, exact sizes, bottom-centre anchors, measured category footprints, fade-behind, breakable pots/barrels, and colored crystal/lantern/lamp lights are in `src/data/mapKits/cenote.json`. Old assets and audio are unchanged.

## Runtime checks

The seeded layout keeps its established topology. Sand banks and wet-stone shores surround the same two radius-620 water regions used for the 0.8 player-speed multiplier. Two fixed masked tile sprites supply subtle shimmer; Reduced motion stops their motion. Four cached cave-wall strips cover the existing impassable boundary. Lights reuse the existing 32-sprite pool with the matching authored color.

`node scripts/v15c-map-art-playtest.mjs` captures real Phaser renders at 1280×720:

| View | Evidence | Result |
|---|---|---|
| Centre | `previews/v15c/centre-1280x720.png` | Quiet floor; hero, enemies and dashed warning clearly visible |
| Corner | `previews/v15c/corner-1280x720.png` | Dock/bridge props, footprint checks and cavern wall |
| Landmark | `previews/v15c/landmark-1280x720.png` | Full-size temple gate; faded nearby shrine does not hide warning |
| Boundary | `previews/v15c/boundary-1280x720.png` | Water edge, natural wall and readable colored crystal light |

All four captures passed: every active prop used a real Cenote texture, static bodies matched authored widths, relevant weather textures were loaded, no page/console errors or failed HTTP requests. Combat is frozen for captures with a hero, two enemies and a warning fixture, then the original game update is restored for timing. No fixture/debug behavior is shipped into gameplay.

## Measurements

Headless Chrome, 1280×720, CPU throttled 4×, 600 actual scene updates (first 10 discarded). See `previews/v15c/map-art-report.json`.

| Metric | Mean | p95 |
|---|---:|---:|
| Actual game frame interval | 21.19ms (~47.2 FPS) | 27.40ms |
| Scene update CPU time | 2.94ms | 4.20ms |
| Browser RAF interval (not game FPS) | 7.26ms | 7.10ms |

62 active / 67 allocated prop sprites, below 350. 60 loaded map textures = 59 authored images plus the cached cave-wall strip. Three active weather particles at the sample end. Fixed shimmer allocations are tested over 10 simulated minutes; all masks and sprites release exactly once on destroy. This short desktop sample is not sustained 60FPS or Android certification.

## Tests and caveats

- Targeted map/weather/art suite: **28/28 pass**, including 200 seeds per map, exact art coverage, unique image data, clean alpha, tile seams, scoped loading, collider dimensions, water boundaries, Reduced motion and pool cleanup.
- `npm run check`: **593/594 pass**. The sole failure remains the pre-existing French localization audit for `MANA` and `Cacao`; unrelated dirty localization files were not changed.
- Production build passes separately (the existing large-chunk advisory remains).
- Requested gpt-image-2.5 Flare routing is unverified: the built-in image tool exposes neither model/variant nor resolution controls. Native outputs are preserved; normalization and all final dimensions are documented and tested. No network downloads, audio edits or old-asset deletions occurred.
