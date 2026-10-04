# Sangre y Jade — v0.5

A Maya-inspired fantasy survivor roguelite built with Phaser 3.90 and Vite. Playable with keyboard or touch, with an HTML5 itch.io package and a bundled offline Android WebView APK.

## This revision

- Screen-fitting hero/map/mode/control setup, without step numbers or scrolling. Continue and Back remain visible at every tested viewport (320×568 portrait through desktop, including 568×320 landscape).
- Four hero active skills (Q/E/R/T). When full, drafts offer two equipped upgrades and one new skill with a cancelable replacement picker. Max-rank upgrade positions become stat choices.
- Choose one original Saintess, Tank, or Assassin at level 5. Each has ten distinct support skills, three equipped and automatic at once. Skill ranks track hero levels; later levels allow a support-skill replacement or keeping the loadout.
- Contact-opening urns/baskets and close-range pickup collection; attacks are no longer required to collect loot.
- Western 0–9 digits in all languages, a matching SVG pause badge, and labeled cacao/kill counters with distinct icons.

Retained from v0.4:

- Sequential setup: hero → map → mode → attack settings and run summary.
- Mirrored Arabic menu artwork and SVG settings/language icons (the old Arabic font is superseded by the v0.6 typography below).
- Six independently generated high-resolution prologue illustrations and an English synthetic male narrator. French/Arabic subtitles remain available. A first tap enables browser audio.
- Standalone animation-frame files and repaired square skill icons; original atlases remain recoverable in `art-source/runtime-atlases/`.
- Obsidian-and-gold health, dash-stamina, and magic meters; a short lower XP bar clear of touch controls.
- Varied scenery scales, floating pickup bubbles, and collection bursts.

Retained from earlier releases:

- Regenerated overhead scenery: temple rooftops, ruins, tree crowns, palms, rocks, roots, plants, and crystals.
- Front/back movement sprites for all three heroes; left/right movement is retained.
- English, French, and Arabic menus, HUD, upgrades, all 60 skills, and progressive intro subtitles. Arabic uses RTL layout. Selection is saved.
- Auto-attack or manual attack in Settings or hero selection. Hold F, left mouse, or the touch Attack button. Aim assist is a separate setting.
- Off-camera spawning. Balam cannot receive bats or flying bosses; those boss encounters become the Jaguar Chieftain and High Priest.
- Stronger enemies enter the pool from level 5; distinct support classes now replace the old hero-copy companions.
- New jaguar emblem in the menu and Android launcher; a separate 512×512 Play Store listing PNG is supplied.
- Automatic first-launch, 27-second prologue: six illustrated scenes, progressive subtitles, skip, replay, and a dedicated score. Completion is saved. Browsers require a first tap to enable sound.
- Original generated pixel-art heroes, five enemies, four bosses, scenery, weapons, pickups, 66 ability/upgrade icons, and six four-frame effect families.
- Character idle/walk/attack/hurt states. Raster combat effects rendered by Phaser; DOM overlays provide menus and touch controls.
- Amber/jade/violet palette, beveled menus, illustrated hero/map selection, and compact combat HUD (the old Latin font is superseded by the v0.6 typography below).
- Thirteen layered stereo effects, five re-orchestrated music loops and the prologue score.
- Three heroes with 20 abilities each, three map variants, 10/20-minute runs, automatic/manual weapons, four hero skill slots, dash, level choices, bosses, relics, cacao, and persistent shrine progression.

This is a playable development release, not a claim of final commercial polish or exact parity with the reference game. Animation families are shared across abilities; the maps currently share a procedural layout and terrain with different palettes. Long-run balance and physical-device performance need broader player testing.

## Deliverables

- `release/Sangre-y-Jade-v0.5.0-itchio.zip` — browser game, index.html at archive root.
- `release/Sangre-y-Jade-v0.5.0-Android.apk` — installable debug-signed preview, Android 8.0+. No Internet permission; all files bundled. Not Play Store production signing.
- `release/Sangre-y-Jade-Supporter-Pack-v0.5.0.zip` — soundtrack, cinematic/support originals, and development codex for a paid itch.io download.
- `release/branding/play-store-icon-512.png` — full-square 512×512 sRGB RGBA PNG, 542,464 bytes.
- `release/marketing/` — cover and game screenshots. Combat captures use staged game state to show enemies/effects.

The supporter catalog is not a payment system. Cosmetic products remain proposals, not implemented purchases; only the downloadable supporter pack is supplied for selling separately. Configure prices, fulfillment, and the public itch.io page before advertising sales.

## Run and rebuild

Use Node.js 22+ on Windows:

```powershell
npm install
npm run dev
npm run test
npm run build
npm run preview -- --port 4173
```

Assets are already built. `npm run art` processes project-local originals in `art-source/`, including the v0.3, v0.4, and v0.5 folders. `npm run audio` reproduces music/effects; narration has a separate optional offline generator, `scripts/generate-narration.py`, requiring Kokoro model files and Python dependencies under `.tools/voice/`. Only rendered narration WAVs ship. Exact image prompts are in `scripts/art-sources.json`, `scripts/art-v03-sources.json`, `scripts/art-v04-sources.json`, and `scripts/art-v05-prompts.json`.

```powershell
$env:SYJ_URL='http://127.0.0.1:4173/'
npm run playtest
node scripts/extended-playtest.mjs
node scripts/v05-playtest.mjs
node scripts/v05-combat-test.mjs
npm run release
npm run android
```

Android uses SDK platform 36, Android Studio JBR, and Gradle 8.13. Override ANDROID_HOME, JAVA_HOME, or GRADLE_BIN if needed. The build runs Android lint. Source is in `android/`. Keep future production signing keys private and backed up.

## Controls and saves

WASD/arrows move; Q/E/R/T cast; Space dashes; Esc pauses. Touch uses the left joystick and right skill/dash buttons. Manual basic attacks: hold F, left mouse, or Attack. Auto-attack and aim assist are separate settings. The menu selector switches English/French/Arabic. Portrait layouts work, but landscape is intended for combat. Tap the support badge to review its current skills. Saves are local to each browser or Android installation. Clearing site/app data resets progress.

## Verification

Reports/screenshots in `artifacts/` and `artifacts/v0.5/` cover 23 unit/asset tests, 23 baseline browser checks, 8 extended checks (including all 60 abilities), 124 setup/loadout/pickup checks, and 26 support-combat/modal checks. Android results are recorded in `artifacts/android-smoke-report.json` and `artifacts/v0.5/android.json`. Android tests use an emulator, not physical phones. These are functional checks, not a full balance study, native-speaker translation review, or hardware certification. Android lint has zero errors; warnings concern SDK recency, landscape preference, local WebView JavaScript, the retained old icon resource, and legacy launcher-icon shape.

See `licenses/ASSET-PROVENANCE.md`, `docs/V0.5-RELEASE-NOTES.md`, and `docs/RELEASE-v0.2.md` for attribution and publishing notes.

## v0.6 typography credits

The locally bundled fonts are **Jersey 15** (The Soft Type Project Authors;
headings/buttons/numbers), **Atkinson Hyperlegible** (Braille Institute of
America; body copy, genuine regular/bold), and **Noto Sans Arabic** (Noto
Project Authors; Arabic). All use SIL OFL 1.1. Their original notices are in
`public/assets/fonts/` and `licenses/`; see `licenses/V06-FONTS.md`.

No font CDN or download is required. Fonts finish loading before the first
menu and Phaser text; failures are reported by `app.typography`. Jersey never
uses synthetic bold. Western digits and key letters remain Jersey/LTR in
Arabic. Exact local files: `public/assets/fonts/README-v06.md`.

`npm run test:typography` checks EN/FR/AR menu, hero selection, settings and
level-up text bounds at 568×320, every hero/stat card, and a deliberately
delayed font request. Required binaries and OFL notices have a mandatory test.

