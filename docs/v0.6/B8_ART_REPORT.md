# B8 — Sunken Cenote procedural art kit

Date: 2026-10-08. Branch: release/0.6.0. Scope: B8 only.

## Delivered

89 distinct PNGs, 9,511,466 bytes (9.07 MiB): 56 environment items, 12 water assets, 15 modular structures, 3 statues and 3 coloured glows. All requested paths are in sources/b8/catalog.json. Nine native generation/correction sheets, counted manifests and full prompts are retained in sources/b8. Per-file model/date/prompt/source-cell provenance is in ASSET_LOG.md.

The imagegen skill guided reference inspection, generation, correction and review. Native tool output was 1254×1254, normalized to the requested 2048×2048 grid before slicing. Requested gpt-image-2.5 Flare/Sunburst routing is **not verified**: the available tool does not expose model selection/metadata. No external art was downloaded. Existing replacements are backed up under .tools/b8/previous and remain recoverable from Git; no old assets or audio files were deleted.

Cenote now uses its own camera-local ground and animated shallow/deep water tiles, water effects, modular bridges, tiers, four stair directions, and additive cyan/violet/green lighting. Ground stays below actors and telegraphs. Reduced motion freezes water frames. Shallows are deliberately brighter than deep water.

Kit entries contain bottom-centre anchors, base-only footprints, separate arch piers/stilts, overhead crops, closed doors, lights, levels and stair-axis/rail metadata. Dock huts use a larger, spaced layout for readable hero-relative doors; only stilts block at level zero. Existing physical assembler geometry remains authoritative. A solid lantern could block the landmark approach at seed 7; deterministic nearby placement now avoids the road rather than dropping collision.

## Visual evidence

Reviewed all nine native sheets, each final item in category contacts, all 14 square tile 3×3 previews, 26 collision gallery pages beside the hero, and the final generated-world screenshots.

- previews/b8/runtime/centre.png
- previews/b8/runtime/corner.png
- previews/b8/runtime/settlement.png
- previews/b8/runtime/pyramid.png and pyramid-readable.png
- previews/b8/runtime/pyramid-four-directions.png
- previews/b8/runtime/combat-readability.png
- previews/b8/runtime/water-shallow.png and water-deep.png
- previews/b8/runtime/collision-*.png (gold footprints, blue occluders, pink stair axes)

Corrections: calmer deep water; explicit S/E/W stair direction; L-shaped corner; violet mushroom/crystal colours without key holes; removal of painted water pads below buildings; separate gate piers; soft unmatting that preserves violet glows; removal of dark magenta remnants between bridge planks. Decorative carved motifs are not UI text.

## Verification

- Targeted B8 tests: **7/7 passed**, including 89 unique hashes/exact sizes, periodic opposite edges, clean keying/bridge gaps, translucent coloured glows, anchor/door/light metadata, four stair axes, bounded terrain reuse, animation/reduced-motion behavior and teardown.
- Generator/content/legacy-Cenote targeted suite: **22/22 passed** before the final bridge-only key cleanup. Includes 300 seeds per map (900 worlds), 100 structure seeds per map and physical route bots reaching 320 sites/60 pyramid tops. Minimum connectivity 95%; maximum measured generation 331.84ms in that run.
- `npm run check`: **692/692 tests passed and production build succeeded**. Full-suite worst generation 695.89ms under concurrent test load exceeds the earlier 600ms target; isolated targeted run was 331.84ms. Existing >500kB bundle advisory remains (main JS 2,170.97kB / 597.30kB gzip).
- Final Playwright run: **zero page, console or HTTP errors**, four generated-world views, all three actual light-source colours using additive textures, shallow breath hidden (air 8), deep breath visible (air 7.5).
- Seed/hash: b8-art-0 / 79e845c3. Allocated props + pooled props + overheads: maximum **49/350**; terrain sprites **120/320**. 82 registered light sources.
- Final isolated 360-frame desktop sample: **8.85ms mean, 20.90ms p95, 62.30ms maximum**. Headless installed Chrome, Intel UHD ANGLE/D3D11, 1280×720, unthrottled, collision/water debug outlines disabled. This is rAF frame spacing, not GPU render time or a mobile/60fps guarantee.

## Remaining limits

- V07_SPEC.md and v07_design.json are absent from this checkout. B8, the existing B2/B4/B5 contracts and V06 asset identities supplied the implementation rules.
- Image model routing cannot be certified. Some native sprite details are finer than the legacy hero's pixels.
- Base colliders were visually calibrated and checked for physical reachability, but **universal <=8px fit is not certified**. Irregular roots and projected stair/bridge rail silhouettes still merit human calibration. The debug galleries expose those differences; art metadata does not override the assembler's tested physical rails.
- Biome transitions remain cell-based, and the lake edge is still grid-shaped. This task does not redesign the generator.
- Short desktop measurement exceeds 16.67ms at p95 and has a 62.3ms outlier; no Galaxy A56/device benchmark was performed.
- Unrelated pre-existing dirty files listed by the baseline remain untouched and excluded from this commit. No APK or audio work is part of B8.
