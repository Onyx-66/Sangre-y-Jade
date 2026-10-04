# Prompt 04 — Fullscreen verification

## Cause and implementation

The game previously rendered a fixed 1280×720 FIT canvas. CSS forced its element to the full root size while `object-fit: contain` preserved the original picture's aspect, leaving page-colored bars at other aspect ratios. The root already fills the viewport and the HTML already uses `viewport-fit=cover`; neither needs a new fixed aspect ratio.

Phaser now uses RESIZE. `src/systems/Viewport.js` centralizes a 720-world-unit visible height, current camera bounds, resize-center preservation, retention buffers, pixel-normalized shake and full-screen effect sizing. Uniform zoom is `canvasHeight / 720` for all supported/requested sizes. Above 2.4:1 only the horizontal zoom increases to cap the visible world width at 1728, without side bars. The reason for this conservative extreme-aspect fallback is recorded in `DECISIONS.md`.

| Canvas | Visible world | Zoom |
| --- | --- | --- |
| 568×320 | 1278×720 | 0.444444… |
| 640×360 | 1280×720 | 0.5 |
| 800×360 | 1600×720 | 0.5 |
| 960×540 | 1280×720 | 0.75 |
| 1024×768 | 960×720 | 1.066666… |
| 2400×1080 | 1600×720 | 1.5 |
| 3440×1440 | 1720×720 | 2 |

Normal enemy and boss spawns start wholly outside these live bounds. Pickup attraction remains 170 world units (plus the existing XP-only innate modifier); changing display resolution does not change its gameplay distance. Floor tiles, fog, terrain coverage, culling and Skyfall shading adapt to the same view. Existing skill damage/range/duration and boss summon locations are not rebalanced.

## Browser evidence

`npm run test:viewport` uses the installed Playwright, Chrome, Sharp and local Vite server only. Final result: **518 checks pass**, no console/HTTP errors; 41.18 s including startup and menu checks. Evidence: `previews/prompt04/report.json` and 14 EN/AR screenshots, one per requested resolution with cutout insets.

- Tests every requested resolution in EN/AR with zero insets and synthetic top/right/bottom/left insets of 20/12/10/24 CSS px. Confirms framebuffer and canvas element fill the display, actual camera world height is 720, zoom/aspect are correct, floor covers it, run identity/pause/view center survive resizing, HUD controls fit without overlap, and EN/AR physical rectangles match exactly.
- Samples all four screenshot edges for the actual computed page-background color. An intentional narrowed canvas must fail this gate before normal screenshots are accepted. Real enemy and largest-boss spawns are checked on all four sides, including immediately after resize.
- Exercises actual pickup velocities, pointer-to-world aiming, real Phaser camera-matrix shake displacement (approximately 4 px on each axis), bounded tooltips, a paused full-screen effect resizing, the 2.4 clamp, pause/settings/resume, and resize-listener removal when leaving a run.
- Checks main-menu settings plus all four sequential setup pages in EN/FR/AR at all seven sizes with simulated cutouts. Panels and action buttons remain inside the usable area.

Existing `npm run test:hud` regression: **497 checks pass**, 32 layouts plus card screenshot, including locked/unlocked ally and slots, phone portrait, touch sizes, tooltips and no overlaps. Output is isolated under `previews/prompt04/hud-regression/` so earlier prompt evidence is unchanged. Representative phone, 4:3, desktop, wide and Arabic screenshots were visually inspected.

Focused unit tests: **46/46 pass**, including 8 new viewport tests. `npm run check`: **332/333 pass**, sole failure remains the pre-existing French `MANA` / `Cacao` untranslated-key audit; its `&&` prevents the build from running. The final production build therefore also runs separately: **pass, 259 modules, 9.80 s Vite**, with the existing large-chunk warning. No new game test failure is introduced. Checks use the preserved working tree, including its earlier unfinished localization/art; those unrelated hunks and assets are not included in this prompt's commit.

## Android verification

The new `GameTheme` uses fullscreen/no-action-bar and transparent system bars. MainActivity draws its WebView edge-to-edge, permits cutouts with API-appropriate mode, applies immersive sticky/transient-by-swipe behavior, re-applies it after focus/resume/configuration changes, and publishes native safe insets. CSS takes the maximum of native and browser insets to avoid double-padding. Existing Back and lifecycle pause behavior remain.

Both variants passed this offline command (30 s):

```powershell
$env:ANDROID_HOME='C:/Users/kossa/AppData/Local/Android/Sdk'
$env:JAVA_HOME='C:/Program Files/Android/Android Studio/jbr'
& 'C:/Users/kossa/.gradle/wrapper/dists/gradle-8.13-bin/5xuhj0ry160q40clulazy9h7d/gradle-8.13/bin/gradle.bat' --offline --no-daemon compileDebugJavaWithJavac processDebugResources compileReleaseJavaWithJavac processReleaseResources lintDebug lintRelease
```

Debug/release lint: **0 errors, 5 warnings** each (existing target API/orientation policy, required WebView JavaScript, old unused vector icon and launcher silhouette). Java/Gradle also report existing source/target-8 and deprecated API/toolchain warnings. No SDK change, download, assemble/sign task or keystore access. APK assembly/device execution are not claimed by these compile checks.

`adb devices -l` returned no connected devices or running emulator. Physical fullscreen/cutout behavior still requires these manual checks on a developer-prepared new debug/release build:

1. Check an API 26 device, an API 28–29 cutout device, and API 30+ with gesture and three-button navigation. Start a run in EN/FR/AR; the ground must reach all display edges while controls avoid the cutout and any visible system bars.
2. Swipe to reveal transient system bars; verify they overlay the game, hide again, and do not leave persistent bars or double safe-area padding. On API 28–29 verify SHORT_EDGES; on API 30+ verify ALWAYS cutout mode.
3. Rotate between both supported landscape directions; on a resizable tablet/emulator also resize to 4:3, 20:9 and 21:9. Confirm a 720-unit worldView height, stable camera center, off-screen spawns, and accurate manual pointer/touch aiming. Debug WebView inspection can read the actual camera and `--native-safe-*` variables; verify physical pixels divide by devicePixelRatio on high-DPI devices.
4. Open a reward choice and pause/settings overlay, resize/rotate and return with Android Back. Gameplay must remain paused until Resume, actions must stay visible, and no HUD elements may overlap the cutout.
5. Background/resume and focus/unfocus the app. It must return paused with immersive mode restored; no timer jump, duplicate viewport listener, blank ground edge or stranded full-screen shading.

No raster assets or source audio files are generated, replaced or deleted in this prompt.
