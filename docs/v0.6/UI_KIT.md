# V2 UI kit

Assets are delivered, **not applied to game screens**. The two TARGET references guided the generated pixel-art family: dark stone, stepped gold fret corners, teal-jade gems and sunset jungle framing.

## Inventory and metadata

- 38 transparent PNG components in `public/assets/ui/kit/`.
- Three separately generated 1920×1080 WebP backgrounds (quality 90) in `public/assets/ui/bg/`.
- `src/data/uiKit.json`: 41 ids, public-relative paths, exact `{width,height}` sizes, type and, for the 28 rectangular stretchable pieces, `{top,right,bottom,left}` source slice insets in pixels. The prompt's size is the longest side; wide/vertical minor sides follow the trimmed source aspect. State families share exactly the same canvas and alpha silhouette.
- Circles/knobs, divider, vine and four torch poses are sprites, not 9-slice textures. Preserve their aspect. All torch canvases are 49×96, with one shared visible baseline. Vines for other corners can be mirrored by code later.
- Keep nine-slice rendered width greater than `left + right` and height greater than `top + bottom`. Border widths equal the source insets at 1×; scale all four caps together if a smaller control is needed. The select's larger right cap preserves its chevron. Labels are always real localized UI text, not raster text.

## Inspect / reproduce

Run the existing Vite dev server with `npm run dev`, then open `/tools/ui-kit-demo.html`. The development-only page shows every asset at three widths/sizes, actual nine-slice borders, a press/release button, toggle and four-pose torch preview. Its scrollable asset catalog is a laboratory, not a player screen. It is deliberately excluded from the production HTML entry and is not copied into `dist/tools/`.

`node scripts/prepare-ui-kit.mjs` slices the retained generated sources. It refuses to overwrite existing output. Use `--overwrite` only when deliberately rebuilding these reviewed V2 kit files. No images are fetched from a network. The small slicer extension supports a positive `spriteScale` and `anchor: 'bottom'`; default behavior for earlier icon/FX sheets stays unchanged.

`npm run test:ui-kit` launches installed local Chromium through the existing Playwright dependency. It checks 123 rendered samples, exact CSS caps, unchanged opaque corner pixels at three sizes for every nine-slice piece, button geometry, toggle images, all local HTTP loads and absence of game initialization. Screenshots and report are in `previews/ui-kit/demo/`. The unit acceptance suite is `tests/v06-ui-kit.test.js`.

Contact sheet: `previews/ui-kit.png`. Individual and multi-width evidence: `previews/ui-kit/demo/<id>.png` and `review-1.png` through `review-6.png`. All 41 final items and all six review sheets were visually inspected. Borders stretch cleanly, state silhouettes match, gems remain teal-jade, no readable text/numbers or pink fringe remain. Decorative geometric fret motifs are ornament, not labels. Button fills distinguish normal/pressed/disabled; every final file and decoded pixel image is unique.

## Provenance and limitations

`ASSET_LOG.md` lists each image; `UI_KIT_SOURCES.json` retains full prompts and sources, including the rejected first sheet. Six selected native source images and the rejected original live in `art-source/v0.6/ui-kit/`.

The built-in generator was asked for **gpt-image-2.5 Flare**, but does not expose an actual model/variant selector or routing metadata. This is not independently verified Flare provenance. It returned 1254×1254 sheets and 1672×941 backgrounds. Sheet normalization to the requested 2048 grid uses nearest-neighbor; final downsampling uses the slicer's high-quality filter. Source detail is not claimed to be natively 2048/1920. No downloads, new dependencies, audio changes, old-asset deletion or branding changes.

The sole full-suite failure is the prior uncommitted French untranslated-key audit (`MANA` / `Cacao`), unrelated to this kit. Build passes separately. Physical-device preview is not part of V2; this work uses actual PNG/WebP files rendered in desktop Chromium.
