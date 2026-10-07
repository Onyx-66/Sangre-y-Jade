# B3 water

Water geometry is indexed in 160px spatial cells by `WaterGrid`. Circle zones use `radius`; rectangles use `width/height`, centred at `x/y`. `kind` is `shallow` or `deep`. Optional `flow:{x,y}` is normalized; nonzero current moves actors 60px/s. `scene.water.addZone(zone)` registers generator additions and redraws the ground wash. `waterAt(x,y,level)` returns kind, deep flag, flow and a 16px shoreline interpolation factor. Water never changes projectile velocity or floor level.

Hero movement is 82% shallow / 55% deep. Deep water cancels and refuses Dash and applies 80% attack reach to basic attacks and shared skill range/area scaling. Breath holds eight seconds, warns at two, refills four per surface second, and freezes with scene/choice/cinematic pauses. At zero air, one empty-second tick is grace; subsequent ticks remove 2–8% maximum HP directly. This cannot emit enemy on-hit events or grant invulnerability.

Ground enemies avoid deep shores through steering and swept collision. Fear, pull and knockback can push them in; ordinary enemies lose 10% max HP each second and drown after four seconds, dropping half XP. Existing tough/affixed elites are exempt from the four-second kill, not immersion damage. Bosses move at 80% in deep and never drown. Eels and drowned spirits move at 125% in water; fliers ignore it.

Procedural shoreline washes, ripples, foam, bubbles, splash/drown rings and a cropped wet-blue hero overlay replace no art. Ground effects stay below actors and telegraphs; overlay tint never changes the hero's alpha. Water particle pools cap at Low 20 / Medium 40 / High 64, or 8 with Reduce effects/Reduced motion. Rain splashes call the water hook. All resources and audio routing are released at scene cleanup.

The HUD editor contains **Breath** with only position and size controls. Defaults follow the hero; customized coordinates pin the meter. It is LTR in every language, hidden on the surface, and version-one layouts migrate without resetting other elements. `?debug=water` provides clear test water and current; `?debug=collision` adds water boundaries and flow vectors to the existing debug map.

## Verification

- `npm run test:water`: exact speeds, zone masks, floors, current, breath/grace/progressive damage, pauses, enemy immunity/death/recycling, shore crossing, pool budgets, audio filter cleanup, manifest coverage and HUD migration.
- `npm run test:water:browser`: real Phaser Dash/breath transitions and pause checks, EN/FR/AR bubble placement at 568×320 and 1280×720, HUD editor position/scale persistence, then 600 simulated seconds of water traversal with normal enemy spawning/combat. Test-only high HP and a surface relocation at low breath keep the bot alive; this is not a balance test. The report contains actual deep/shallow frame counts, particle peak and simulation-step times, not mobile FPS.
- Evidence: `previews/b3/report.json` and six screenshots. All missing developer water/step MP3s are optional; `audio:check` validates IDs separately. No audio asset was generated.
- Final browser evidence: 600 simulated seconds, 7,246 deep-water frames, 4,600 shallow-water frames, peak 18 water particles, mean 3.84ms / p95 6.00ms simulation step; no browser or HTTP errors. The HUD editor regression additionally passed 92 checks. Reviewed the Arabic compact and English large screenshots for readable bubbles and unchanged HUD direction.

The supplied V07 files are absent, so lake interior sizing and provisional sound IDs are recorded in DECISIONS.md rather than represented as verified JSON matches. Real-device audio mix/listening remains a developer check when the files arrive.
