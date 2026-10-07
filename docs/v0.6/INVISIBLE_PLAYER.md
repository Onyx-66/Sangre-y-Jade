# Invisible-player regression

## Reproduction and candidate checks

Reproduced first by replaying the legacy draw rules on a full 160 px grid: 936 placements per map (2,808 total), deterministic seed `83492791`. This is a diagnostic replay, not a pristine-checkout capture. The hero state remained `visible=true`, `alpha=1`, on the Ritual scene display list, with a loaded hero texture/frame; 65 cells failed the original strict magenta threshold. Some of those pixels may have been dimmed by translucent props rather than completely absent. Every failed cell recorded overlapping props/landmarks with bounds, depth, alpha and blend mode. The focused north/south baseline also showed the ordering issue at world Y `-120` while the sprite rendered at `+120`. Camera placement and texture loading were valid.

Candidate checks, in the order available from the direct request (the referenced `V07_SPEC.md` is absent):

1. Visibility/alpha: normal gameplay did not intentionally hide the hero; `setAlpha(1)` in the probe reproduced the issue.
2. Parent and texture/frame: the hero was a scene display-list child with a valid hero texture and `__BASE` frame; enemy visual clones had valid textures and remained visible.
3. Camera culling: the player was inside the camera's rendered viewport; moving the camera with the test actor did not fix the ordering.
4. Chunk creation: the map's visible cell queue was fully processed for each probe; the issue remained tied to draw order, not a missing/recycled sprite.
5. Depth order (root cause): the checked-in code mixed a player depth of `y + 20`, enemy/boss `y + 12`/`y + 13`, pickup/projectile depths 9-16, fixed effects 24, static shadows near 9, map decor near 3, and screen fog/entry/boss overlays at 4/82/81. Those values did not form a common foot-sorted world layer. Large props used their sprite anchor Y rather than their collider/base Y; a hero could overlap their upper art while the prop still sorted in front. The map fog in the checked-in GameScene was depth 4; boss darkness and entry passes were 81/82 (the direct task's approximate “fog 80” corresponds to the same screen-overlay class, not the map tint).

The fix is class-wide: world actors and prop bases use `1000 + baseY`, measured from physical feet/footprints. B2b splits tall art into complementary base/overhead crops. Only the upper crop fades to 55% for an overlapping actor behind it; the base stays opaque. Effects, weather/light and HUD have independent bands. A two-source-pixel hero-shaped contour, derived from the current texture alpha, remains above occluding world art without changing the actor's alpha. Its generated textures are released at shutdown.

## Regression coverage

`npm run test:sweep` launches the real game in Chromium, sweeps every 160 world pixels from `(-2800,-2000)` through `(2800,2000)` on all three maps (936 placements per map, deterministic seed `83492791`), waits two animation frames, and validates visible/alpha/display-list/texture/frame state plus rendered marker pixels. Now that objects are solid, invalid inside-wall spawn points use the production push-out solver; requested and resolved coordinates are both recorded for failures. The corrected pixel test compares the same frozen frame with the hero and contour visible versus hidden, preventing both dim-roof false negatives and pink-background false positives. Baseline mode retains the old threshold only to reproduce the recorded diagnostic. Browser console errors and HTTP failures also fail the suite.

`tests/render-layers.test.js` verifies band intervals, negative-Y band classification, footprint-based y sorting north/south of a tree, rock and building, and the occlusion contour's activation/clear path. `tests/v13-maps.test.js` covers 55% fade and restoration for hero/ally/boss. `?debug=depth` colors the depth bands and uses a unique magenta player marker.

The complete pre-fix failing-cell list and each cell's overlapping objects/depths/blend modes is [depth-sweep-before.json](previews/depth-sweep-before.json). Failed coordinates were:

- Overgrown Temple — 29/936: (-2640,-2000), (-2480,-2000), (-2320,-2000), (-2160,-2000), (-2640,-1840), (-2480,-1840), (-2320,-1840), (-2160,-1840), (-2640,-1680), (-2480,-1680), (-2320,-1680), (-2160,-1680), (1200,-1680), (1680,-1680), (1840,-1680), (2320,-1680), (2480,-1680), (-2480,-1520), (-2320,-1520), (1200,-1520), (-1840,-1040), (-1200,-1040), (1200,-1040), (1840,-1040), (560,-880), (-880,880), (1680,880), (-880,1360), (-2000,1520).
- Blood Moon — 10/936: (1200,-1840), (1200,-1680), (1360,-1680), (560,-880), (-2640,-720), (-2320,560), (2640,560), (880,880), (-2000,1200), (560,1680).
- Cenote — 26/936: (-2640,-2000), (-2480,-2000), (-2320,-2000), (-2160,-2000), (-2640,-1840), (-2480,-1840), (-2320,-1840), (-2160,-1840), (-2640,-1680), (-2480,-1680), (-2320,-1680), (-2160,-1680), (-1840,-1680), (-1200,-1680), (1200,-1680), (-2480,-1520), (-2320,-1520), (-1200,-1200), (-1360,-1040), (-1200,-1040), (1200,-1040), (1840,-1040), (560,1040), (1360,1040), (-1680,1200), (-2480,1680).

## Verification

- Baseline diagnostic: all 65 strict-threshold failures had correct actor visibility/alpha/texture/parent state. These are candidate occlusion cells, not proof that all 65 were completely opaque.
- The corrected differential test initially found three genuinely hidden placements after push-out: Overgrown `(2000,400)` behind a large rock; Cenote `(-1520,1040)` and `(-1040,1680)` behind giant roots. The sprite-shaped outline fixes this class without making rock bases transparent or enlarging their collision to canopy size.
- Final full sweep: **2,808/2,808 passed**, 936 per map, no console or HTTP errors. Minimum changed marker/outline pixels: Overgrown 220, Blood Moon 340, Cenote 220. Evidence: [depth-sweep-after.json](previews/depth-sweep-after.json).
- `npm run check`: **653 tests passed**, production build passed (existing large-chunk warning only).
- Android device verification: not part of this task; no device result claimed.
