# B5 — Map content configuration and verification

The B4 seed pipeline now reads `src/world/configs/{overgrown,bloodmoon,cenote}.js`. Each config defines biome identities/density weights, site counts, house variants, landmark tiers/faces/focus, set pieces, vegetation pools, water colours/style, spawn restrictions and light IDs. No combat numbers changed.

| Map | Content |
| --- | --- |
| Overgrown | River/ponds with green water; two 3–7-house thatched villages and plazas; 1–4-face temple; top altar; broken wall run; stela field; two market stalls; broadleaf/palm/ceiba vegetation. |
| Blood Moon | Dark swamp pools; 3–7-house burned ring; north/south-stair ritual platform and top brazier; ossuary; skull/bone field; collapsed ruins; torch avenues; dark-tinted legacy tree/building placeholders. |
| Cenote | Turquoise lake with deep centre and shallow banks; bridged dry shrine island; three dock huts with four stilt-only footprints each; rope/wood access decks with side rails; shore temple gate and raised altar; crystal fields and giant roots; registered crystal/lantern light sources. |

## Hard rules and validation

- Generation validates before handing WorldData to the renderer. The structure validator independently walks every required-site route and every door approach through the actual spatial collision solver. It checks landing clearance, a focus object on the highest platform, ritual stair count and wet stilt placement.
- Closed house doors face the plaza; exterior approaches cannot cross another wall or unbridged water. Approaches are reserved before vegetation. Houses cannot overlap road corridors; trees cannot intersect a building's visible rectangle. Footprint non-overlap remains enforced by the B4 validator.
- Bridge rails are real static colliders. Deck cells require source water, entrances remain open, and the lake's source mask is preserved. Dock hut walls are not ground-level rectangular blockers: only the measured corner stilts collide.
- Ground spawns exclude the reserved plaza/door approaches in addition to B4's dry, reachable, outside-view and footprint/platform checks. No new enemy distribution or combat balance rules are introduced.

## Evidence

- `npm run test:map-content`: **100 seeds per map**, structural rules on all 300 worlds; a physical bot reaches a village and the landmark top on each map. Mutation tests prove the validator rejects a blocked door, missing platform focus, and a dock moved onto land.
- `npm run check`: **677 tests + production build**, including the existing 900-world B4 regression and physical route bots for 20 seeds per map (**320 sites and 60 tops** after the map-specific site counts).
- `npm run test:map-content:browser`: all three real maps loaded, streamed and rendered with no page exceptions or failed HTTP responses. The harness asserts the 350-sprite pool cap and visible Blood Moon/Cenote light glows after the normal light-refresh interval.
- Inspected `previews/maps-montage.png`: columns are Overgrown, Blood Moon, Cenote; upper row landmarks, lower row villages/shrine island. Full-resolution views and machine-readable counts/hashes are in `previews/b5/`.

## Limits

Placeholder textures/ground and coarse 128px shoreline masks are intentional; these are not final map-art claims. Blood Moon still lacks its final authored kit. Four-direction house art is not generated in this step. The montage is a visual/layout check, not mobile-performance certification. Test results are from the current working checkout; unrelated pre-existing changes listed in V07_BASELINE.md remain excluded from this commit. V07 source specification files are unavailable; decisions are recorded in DECISIONS.md. No downloads, audio changes, asset deletion or protected-file access.
