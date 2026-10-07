# Solid world objects (B2b)

## Runtime contract

`src/world/objects.js` defines tree, rock, statue, house, wall, platform, stairs, bridge, arch, breakable and decoration kinds. The three JSON kits now include explicit metadata, while the loader normalizes older kits without changing saves. `footprint` and the legacy `collider` alias use local coordinates relative to `anchor`; `scale` is applied exactly once. Polygon vertices may be `[x,y]` pairs or `{x,y}` records. `solidParts` describes separate bridge rails / arch pillars. `occluder` and `overhead.cropRatio` describe art, not collision.

`WorldCollision` queries the complete spatial hash, not just loaded sprites. Movement is sampled at no more than half a feet radius, checks diagonal movement and each slide axis, and pushes spawned overlaps out. The same solver handles hero, enemies and the directly moved companion. Ground collision is filtered by floor; flying actors bypass it. Projectiles sweep against their launch floor before hit callbacks. Containers are removed from the hash only when attacked to destruction.

`assemblies.js` returns perimeter walls, floor surfaces and stair strips. A kit may supply `assemblies: [{type: "pyramid", id: "example", x: 1200, y: 1200, width: 480, tiers: 3, faces: ["south"]}]` (or `type: "temple"`). The current map layouts do not add these new structures automatically. Data and collision integration are ready for later generator placement; these are not new rendered modular building assets.

Stair entry must cross an end gate along its axis. Side entry is rejected; rails and terrace walls block corners. The collision level changes only at an exit, while visual elevation interpolates at 48px per level. Knockback cannot authorize a floor transition. Enemies and companions request a stair waypoint when the target is on another floor. World render depth uses physical feet, not the shifted image top.

## Debug and tests

- `?debug=collision`: gold solid footprints, cyan occluders, green actor feet, pink stair axes and a floor/height readout. This is a documented development query.
- `?debug=depth`: color-coded render bands, also used by the retained B2 marker sweep.
- `npm run test:objects`: all-kit direction sweeps, corner/polygon/level/projectile checks, stairs and floor interpolation, body-offset restoration, spawn push-out, bridge passages, streamed pools and stuck recovery.
- `npm run test:objects:browser`: real Phaser object sweeps on all maps, two-tier ascent and debug screenshots; evidence in `previews/b2b/`.
- `npm run test:sweep`: visibility regression, 160px grid across all three maps. `DEPTH_SWEEP_REPORT` selects its JSON evidence path; `DEPTH_SWEEP_LIMIT` is a diagnostic subset; `DEPTH_SWEEP_BASELINE=1` replays the old depth rules rather than modifying source.
- `node scripts/v13-map-playtest.mjs`: three 600-second simulated runs at 4x CPU throttling; asserts collision penetration, persistent stuck ground enemies, browser errors and allocated sprite caps. `MAP_BOT_REPORT` selects a separate evidence file.

## Limits to keep visible

V07 reference files were unavailable. The 8px artistic-base tolerance has not been exhaustively measured for all irregular art. Generic canopy/roof splits can still need per-item crop tuning. The existing temple/ritual-platform art is not converted into navigable multi-tier architecture by this task; the tested assembler is the data/physics foundation for future placements. Browser simulation frame times are not phone/rendered FPS or Android certification. Existing unrelated dirty work is inventoried in `V07_BASELINE.md` and preserved.

## Bot evidence (2026-10-08)

All three maps completed 600 simulated seconds with zero footprint penetrations, persistent blocked-ground-enemy findings, page errors or HTTP errors. The stronger test initially caught a shade oscillating beside an obstacle; recovery now measures net displacement over one-second windows rather than treating every two-pixel twitch as progress.

| Map | Mean simulation step | p95 step | Allocated prop + overhead sprites |
| --- | ---: | ---: | ---: |
| Overgrown | 10.34ms | 32.60ms | 87 |
| Blood Moon | 3.94ms | 12.60ms | 88 |
| Cenote | 2.98ms | 8.10ms | 93 |

These were 20Hz accelerated simulations with Chrome CPU throttling 4x, not rendered 60fps benchmarks. Overgrown overlapped other verification jobs and its p95 is above 16.7ms; no mobile-performance pass is claimed. Full evidence is `previews/b2b-map-bot-report.json`.
