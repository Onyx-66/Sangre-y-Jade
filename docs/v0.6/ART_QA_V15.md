# V15 — Overgrown Temple art verification

Date: 2026-10-05. Scope: 59 Overgrown map images and 14 shared weather stills.

## Art and integration

- Inspected each generated sheet and every final cell in the ground, trees, plants, rocks, debris, buildings, props and weather contact sheets under `previews/v15/`.
- Six ground textures were regenerated with lower contrast for combat readability. Each has a 3×3 tiling preview; opposite RGBA edge pixels match exactly. The two 512px fog textures also have matching periodic edges.
- Rejected the first transparent weather sheet for colored alpha artifacts; the accepted magenta sheet was un-matted and inspected. Thin magenta outlines visible at in-game scale were removed before final acceptance. Opaque grey ash/rock colors and pale soft-glow colors are preserved by separate solid/glow matting options.
- All 73 outputs have exact manifest dimensions, usable alpha, distinct decoded-image hashes and zero saturated-magenta residual pixels. No existing art was deleted or overwritten. Source sheet 1's six ground cells are superseded by source sheet 6.
- All 59 Overgrown textures are preloaded only for Overgrown. Weather still subsets load for each map. Every visible streamed prop in the screenshot fixture uses its new map texture; every tested physical footprint retains its authored dimensions after refresh/reuse.
- The unlit torch remains unlit. New art does not add audio or change combat/spawn/XP values.

## Playwright captures

`node scripts/v15-map-art-playtest.mjs` captures 1280×720 PNGs with a hero, enemies and a red telegraph visible. Combat is frozen only for screenshots and restored for measurement. Fixture-spawned enemies may overlap decoration because they are placed deliberately for contrast comparison; ordinary gameplay still uses map collision/steering.

| View | Capture |
|---|---|
| Centre / clear arena | [centre](previews/v15/centre-1280x720.png) |
| Corner region | [corner](previews/v15/corner-1280x720.png) |
| Central temple landmark | [landmark](previews/v15/landmark-1280x720.png) |
| Natural tree-line boundary | [boundary](previews/v15/boundary-1280x720.png) |

All four captures completed with no console errors, page errors or HTTP failures. Low-contrast grass/dirt and subdued plaza colors leave the hero, shade and red warning readable. Large ruins fade behind the hero through the existing map fade logic.

## Performance

Final independent sample, local headless Chrome, 4× CPU throttle, full kit loaded. The sample records 600 RAF callbacks, discarding the first 10; Phaser scene frames are recorded separately to avoid confusing monitor cadence with game FPS.

| Metric | Mean | p95 | Maximum |
|---|---:|---:|---:|
| Actual Phaser frame interval (205 retained samples) | 20.97ms | 27.70ms | 60.20ms |
| Scene update CPU cost (206 retained samples) | 3.30ms | 5.30ms | 12.50ms |
| RAF interval (590 retained samples) | 7.50ms | 13.80ms | 48.60ms |

Actual average cadence is approximately 47.7 FPS under throttle, **not a sustained 60FPS claim**. Snapshot: 54 active / 57 allocated prop sprites (cap 350), five live weather particles, 60 map textures (59 authored plus one baked canopy tile). This is a short desktop sample, not device certification, a full-run memory test or a controlled before/after benchmark. Raw report: [map-art-report.json](previews/v15/map-art-report.json).

## Tests and build

- `node --test tests/v15-map-art.test.js tests/v13-maps.test.js tests/weather-v14.test.js`: 21/21 pass, including 600 seeded map validations.
- `npm run check`: 586/587 tests pass. The sole failure remains the pre-existing untranslated-key assertion for `fr: MANA` and `fr: Cacao`; those files were not changed.
- `npm run build`: passes separately (Vite's existing >500kB chunk advisory remains).
- Image model/variant routing is unexposed by the supplied tool. Provenance records the requested gpt-image-2.5 Flare without claiming independently verified routing.
