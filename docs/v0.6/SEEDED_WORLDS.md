# B4 — Procedural seeded worlds

Implemented on `release/0.6.0`, 2026-10-08. The direct B4 prompt replaces fixed-layout V13. V07 spec/design files are unavailable; assumptions are recorded in DECISIONS.md.

## Runtime and data

`src/world/seed.js` hashes text/numbers to uint32 and supplies named PRNG streams and seeded value noise. The generator orders fields → water → biomes → Poisson sites → least-cost roads/bridges → catalog structures/three-tier landmark → vegetation/rocks → boundary → validation. Invalid attempts retry using up to eight derived seeds. No generation code uses Math.random or Date; a regression test enforces this.

WorldData is JSON-serializable, including original seed, derived seed, dimensions, water/flow/biome masks, elevation/fertility fields, level surfaces, physical objects, stairs, paths, sites, lights, walkable spawn points, boss arenas, validation and content hash. The normal loading path creates a worker, reports real generation progress and terminates it on success, failure or cancellation. Rendering starts only after validation. Runtime hydration builds 640px cells and the collision spatial hash; existing pooled streaming remains capped at 350 sprites including overhead parts. Ground is a finite masked batch, not an endless tileSprite.

The UI supports Random/dice, Copy, typed/validated seeds and `?seed=` in EN/FR/AR. Game over displays/copies the seed. Saved run results keep the seed/hash. Enemy spawn selection uses reachable dry land outside the camera, followed by actual solid-footprint clearance. Bosses use the reserved clear central arena.

## Verification

- `npm run check`: 674 tests and production build passed; existing large-bundle advisory remains.
- `npm run test:worlds:audit`: **900 worlds, 300 seeds per map**, all valid. Dry central reservations, finite bounds, 10–30% water, non-overlapping prop footprints, required sites and stair chains checked. Mutation tests reject overlapping objects, a flooded arena and an unreachable site.
- `npm run test:worlds`: cross-process determinism and exact JSON round-trip; physical collision bot reaches **480 sites and 60 landmark tops** over 20 seeds per map. Routes use the swept-circle solver; ascent uses the runtime stair resolver.
- `npm run test:worlds:browser`: real module-worker hashes equal Node hashes on all three maps; EN/FR/AR at 568×320 and 1280×720; invalid seed disables Continue; dice/copy work; game-over and save preserve the seed. Repeated streaming visits 160 site locations per map and stays under cap. No page exceptions or HTTP failures.
- Screenshot evidence and JSON reports: `previews/b4/`. The compact map cards retain readable names/difficulty and 44px seed/navigation controls. Procedural ground/landmark pieces are placeholders, not final environment art.

Serial desktop generation measurements (milliseconds; seed range 0–299):

| Map | Mean | P95 | Maximum | Minimum connectivity | Derived retries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Overgrown | 74.01 | 186.12 | 478.67 | 95.01% | 11 |
| Blood Moon | 93.84 | 194.85 | 395.80 | 95.00% | 7 |
| Cenote | 60.64 | 130.79 | 148.02 | 95.00% | 12 |

All measured generation maxima are under 600ms. Retained heap after warm-up declined by 921,168 bytes across the serial sweep (GC checkpoints), rather than growing. This is generator memory evidence, not a 20-minute mobile renderer trace. Browser end-to-end loading includes existing texture/audio decode and is reported separately in `browser-report.json`.

Portable fixture `portable-jade`: Overgrown **ed6995eb**, Blood Moon **92002207**, Cenote **aba01e0b**. Confirmed in independent local Node processes and Chrome workers, not yet on CI or a phone. For device verification load each map with `?seed=portable-jade`, compare `mapLayout.hash`, and capture a performance trace during generation/loading and streaming; check that generation does not block the main thread and that frame work stays within 16ms. Repeat on CI with `npm run test:worlds:audit`.

## Limits and scope

- Mid-range Android frame-time and cross-device floating-point portability remain needs-device verification. Integer lattice hashing and quantized fields reduce risk; physical placement still uses deterministic JS math and the hash fixture makes divergences observable.
- Optional seed UI MP3s are developer-supplied and missing; no audio assets were generated, copied or edited. No downloads or protected paths were used.
- Tests run against the existing working checkout. Unrelated pre-existing changes listed in V07_BASELINE.md remain uncommitted and are not a clean-clone certification. No APK was requested for B4.
