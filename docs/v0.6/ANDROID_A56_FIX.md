# Galaxy A56 startup crash — 2026-10-06

## Confirmed cause

The physical Samsung Galaxy A56 (SM-A566B), Android 16 / API 36, was connected
with USB debugging. Its installed APK was version 0.6.0, build code 7. Launching
that APK reproduces the failure before the WebView or game JavaScript exists:

```text
java.lang.RuntimeException: Unable to start activity ... MainActivity
Caused by: java.lang.NullPointerException:
  ... DecorView.getWindowInsetsController() ... on a null object reference
  at PhoneWindow.getInsetsController(PhoneWindow.java:4523)
  at MainActivity.applyImmersiveMode(MainActivity.java:128)
  at MainActivity.onCreate(MainActivity.java:41)
```

`applyImmersiveMode()` runs before `setContentView()`. This Samsung framework
dereferences its not-yet-created decor when `Window.getInsetsController()` is
called. Testing only the Android 17 emulator missed this native lifecycle
difference. The earlier renderer recovery repairs a separate failure and cannot
catch a crash occurring before WebView construction. Cache clearing is not a fix.
App-only crash evidence: `artifacts/android-startup/a56-build7-crash.txt`.

## Minimal repair

- Initialize the decor with `getWindow().getDecorView()` first, then request
  `decor.getWindowInsetsController()`. Keep the null guard for an unattached view,
  the legacy immersive flags, and the later focus/resume fullscreen application.
- Retain package, version name and signing identity; increase version code to 8
  for an in-place update. No app data, audio, assets or signing keys were deleted.
- Add a source regression guard, observed failing before the repair and passing
  afterward. It checks the lifecycle ordering; it is not a mock Android runtime.
  Actual device cold launches provide the functional regression coverage.
- Extend the existing smoke runner with isolated report directories, real cold
  launches and Home/background/resume checks. No test-only flags enter the APK.

## Verification on the user's phone

Installed build 8 with `adb install -r` (no uninstall or data clear). WebView:
153.0.8010.36. Native captures: 2340×1080; CSS viewport: 832×384. The normal
accelerated Phaser WebGL renderer is used (type 2), not recovery Canvas.

| Device run | Passed | Coverage |
| --- | ---: | --- |
| `a56-cold-1` | 5 | Fonts/menu, native process alive, foreground, no page errors/404s |
| `a56-cold-2-intro` | 8 | Second cold start, actual intro playback and Skip |
| `a56-cold-3-gameplay` | 23 | Third cold start; Balam/Overgrown/EN, Ixchel/Blood Moon/FR, Kukul/Cenote/AR; touch movement/dash, pause, Settings, Android Back and Resume |
| `a56-lifecycle` | 8 | Home backgrounds/pauses the game; reopening keeps the pause menu; Resume advances gameplay |

All **44 checks pass**, with zero page errors or failed HTTP asset requests.
Reports and three native gameplay screenshots are under `artifacts/android-startup/`
in the named directories; all three screenshots were visually inspected.
Measured route loading: **5,222 / 4,371 / 5,285 ms** respectively. These are short
startup/control checks, not a full-run balance or mobile performance certification.
The latest app crash in Android's crash buffer remains the pre-fix build-7
failure at 16:12:19.785 (phone time); no new crash appeared during verification.

Smoke-only invulnerability and XP isolation were runtime fields. Returning to
the menu destroys that test run; the original English menu was restored after
testing. The existing stored save was retained by the in-place update.

`npm run check`: **629/629 pass**, production build succeeds. Offline Android
`assembleDebug`, `assembleRelease` and `lintDebug` pass. Existing Vite chunk-size,
deprecated native API and Gradle advisories remain; no dependencies downloaded.

## Delivered APK

- Desktop: `C:/Users/kossa/Desktop/Sangre-y-Jade-v0.6.0-A56-fix.apk`
- Source: `release/Sangre-y-Jade-v0.6.0-Android-debug.apk`
- Version: **0.6.0**, build **8**, package `com.sangreyjade.game`
- Size: **127,062,265 bytes**; APK Signature Scheme v2 verifies.
- SHA-256: `96060d14a73f67ede7bd184e1dfe7b976eeb503cb4b2bc839a73313218babed6`

The Desktop and built copies match; previous Desktop APKs are preserved. The
installable artifact uses the existing debug signing identity. The release
variant also compiles, but remains unsigned and is not presented as installable.
This repair resolves the reproduced A56 launch crash; it does not clear the
unrelated full-release blockers recorded in `REVIEW.md`.

The APK uses the current checkout's earlier uncommitted UI/gameplay prerequisites.
Those changes are preserved, not absorbed into this narrowly scoped repair commit.
