# Asset provenance

No assets from the reference game/video are shipped. Game art and audio were generated for this project. Bundled third-party fonts use the SIL Open Font License; narration uses a stock synthetic voice as documented below.

## Cinematic raster art

The four PNG images in `public/assets/cinematic/` were created for this project with Codex's built-in image generation tool. They are used as cinematic/title backgrounds; all UI text remains live HTML. The original outputs remain in Codex generated-image storage and project-local copies are listed below.

### `title-temple.png`

> Use case: stylized-concept. Asset type: 16:9 game title-screen background illustration. An original Maya-inspired fantasy jungle ruin at dawn; stepped limestone temple, ancient jade-green rift, obsidian underworld mist. Polished hand-painted 2D game key art with pixel-art sensibility, central temple, amber dawn and jade glow. No people, text, readable glyph writing, logos, trademarks, watermark, Aztec/Egyptian motifs, conquistadors, modern objects, gore, photorealism, or 3D.

### `intro-city.png`

> Use case: historical-scene. First 16:9 cutscene panel. A thriving Classic-period Maya-inspired lowland city with families and artisans, astronomy, cacao, textiles, limestone, and cultivated jungle gardens. Same hand-painted pixel-art-sensitive palette and style as the title art. Respectful original fantasy interpretation; no text, readable glyph writing, logos, trademarks, watermark, Aztec/Egyptian motifs, conquistadors, modern objects, stereotypes, gore, or photorealism.

### `intro-breach.png`

> Use case: stylized-concept. Second 16:9 cutscene panel. The same city as a supernatural breach to Xibalba opens during a blood moon; jade cracks, bat and jaguar spirit silhouettes, and civilians retreat without graphic violence. Same visual style and palette. No text, readable glyph writing, logos, trademarks, watermark, Aztec/Egyptian motifs, conquistadors, modern objects, gore, or photorealism.

### `intro-champions.png`

> Use case: illustration-story. Final 16:9 cutscene panel. Three original chibi-proportioned champions—jaguar-cloaked Balam with obsidian macuahuitl, jade shaman Ixchel's Voice with smoking scepter, and quetzal-cloaked Kukul with atlatl—face the jade breach. Same hand-painted pixel-art-sensitive style and palette. No text, readable glyph writing, logos, trademarks, watermark, Aztec/Egyptian motifs, conquistadors, modern objects, gore, or photorealism.

The art is intentionally presented as an original fantasy inspired by Maya visual culture, not as archaeological reconstruction.

## Combat sprites, textures, UI, and branding

- v0.2 replaces procedural combat graphics with nine generated raster originals in `art-source/`: hero, enemy, boss, fx, props, ground, icons, story, and title. Exact prompts and original output paths are in `scripts/art-sources.json`. `scripts/prepare-art.mjs` slices reviewed non-uniform gutters into `public/assets/pixel/`: 12 actor sheets, six effect sheets, 66 icons, props/weapons, terrain, six cinematic panels, and title art. No reference-game screenshot pixels were copied.
- v0.3 uses an original generated jaguar-and-jade emblem for menu/PWA/Android. The old SVG remains as historical source. Built-in image generation also supplied overhead scenery and front/back hero atlases. Reviewed originals are in `art-source/v0.3/`; exact prompts and returned paths are in `scripts/art-v03-sources.json`. `scripts/prepare-v03.mjs` slices/resizes them without redrawing their artwork.
- Play Store listing PNG: 512×512, full-square, 32-bit RGBA, sRGB, below 1,024 KB. Specification: https://developer.android.com/distribute/google-play/resources/icon-design-specifications . Store acceptance and production app signing are separate release tasks.
- Noto Sans Arabic is bundled in `public/assets/fonts/NotoSansArabic.ttf`; license: `public/assets/fonts/OFL-NotoSansArabic.txt`. Source: https://github.com/google/fonts/tree/main/ofl/notosansarabic . No runtime font CDN is needed.
- Pixelify Sans is bundled in `public/assets/fonts/PixelifySans.ttf`; its full SIL OFL license is `public/assets/fonts/OFL.txt`. Source: https://github.com/google/fonts/tree/main/ofl/pixelifysans . No runtime font CDN is needed.

## Music and sound

### v0.5 support characters

Three original support characters—Saintess, Tank, Assassin—were generated using built-in `image_gen`, not copied from the playable heroes or reference video. Original transparent strips: `art-source/v0.5/`. Exact prompts, returned source paths, and project destinations: `scripts/art-v05-prompts.json`. Reviewed cells are cropped/resized with preserved alpha by `scripts/prepare-v05.mjs`, shipping as twelve separate 128×128 PNGs in `public/assets/pixel/frames/support-*.png`. Support ability cards reuse the project's original square icon library; animations/effects are shared families, not thirty individually generated attack animations.

The added pause/cacao/kill symbols extend the project's code-native SVG interface icon set.

Tank ground props use two additional standalone generated sprites, not inventory icons: `public/assets/pixel/support-bomb.png` and `support-snare.png`. Originals are in `art-source/v0.5/`; the built-in generation prompt set is `scripts/art-v05-traps.json`.

### v0.4 illustrations, individual frames, and Arabic font

- Six independent prologue illustrations were created using built-in `image_gen` mode. Original PNGs: `art-source/v0.4/`. Shipped WebP panels: `public/assets/pixel/story-0.webp` through `story-5.webp`, at their native 1672×941 output resolution. Exact prompts and returned paths: `scripts/art-v04-sources.json`.
- `scripts/prepare-v04.mjs` splits actor/effect atlases into 96 standalone transparent frame PNGs and repairs 66 square 128×128 skill icons with transparent padding. Its manifest inventories the runtime pixel assets. Source atlases are retained in `art-source/runtime-atlases/`; no source artwork was destroyed.
- Unixel Arabic pixel font: `public/assets/fonts/Unixel.woff2`, SIL OFL 1.1, full license in `OFL-Unixel.txt`. Source: https://github.com/MDarvishi5124/Unixel . Previously bundled Noto Sans Arabic remains as a historical resource, but Arabic UI now uses Unixel.
- Interface symbols and the pickup bubble are original project SVG assets/code, not icon-font characters.

### v0.4 narrator

Six English male narration WAVs were rendered locally with the stock synthetic voice `am_michael`, using Kokoro v1.0. No person was impersonated. Kokoro model: https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0). Rendering wrapper: https://github.com/thewh1teagle/kokoro-onnx (MIT). Only rendered audio ships, not the model, voice tensors, or Python environment. Text, voice, speed, and clip durations are recorded in `public/assets/audio/narration/manifest.json`; generator: `scripts/generate-narration.py`. French and Arabic have subtitles, not dubbed narration.

Five music loops, a 27-second prologue score, and thirteen effects are original 44.1 kHz stereo WAVs. `scripts/generate-audio.mjs` composes base loops; `scripts/master-audio.mjs` adds layered percussion, breath/noise, wood-like impacts, pitched resonances, stereo reflections, and mastering. Re-run `npm run audio` to reproduce them. These are fantasy compositions, not recordings or claims of authentic ancient Maya music.

## Reference video

The user supplied a YouTube video as a quality reference. No video frames, audio, code, branding, or other assets from that video were copied into this project.

