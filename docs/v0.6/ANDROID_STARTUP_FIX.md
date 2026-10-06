# Android startup repair — 2026-10-06

## Scope and evidence

The reported phone is a Galaxy A56 on its latest Android update, closing without an error. No physical phone is attached here. The previously delivered Desktop APK launches on the installed Android 17 / 16 KB-page emulator (WebView 149). Its exact A56 startup trigger therefore remains unconfirmed; this is not a claim of a physical-device reproduction.

The old APK does have a reproduced silent-close path: forcing its WebView renderer to crash with DevTools `Page.crash` kills the Android host process. Android logs `Render process ... crash wasn't handled by all associated webviews, triggering application crash`, followed by SIGTRAP. `artifacts/android-startup/original-apk-report.json` records `processSurvived: false`.

Other concrete defects found while exercising the real packaged APK:

- Native safe-inset JavaScript dereferenced `document.documentElement.style` before the document existed.
- The texture loader imposed a 20-second deadline on an entire batch, incorrectly rejecting existing assets while the slow emulator continued decoding/uploading other files. The failing test reproduces a healthy 57 ms batch with a 20 ms deadline.
- UI custom-property URLs such as `./assets/ui/kit/panel-large.png` resolved relative to the compiled stylesheet, requesting `/assets/assets/ui/...` and returning HTTP 404. The same problem affected the loading frame and boss HUD frame.

## Minimal fixes

- Handle `onRenderProcessGone`, detach and destroy the dead WebView, then automatically recreate the activity once with software WebView composition and Phaser's Canvas renderer. Keep local save storage and return to the menu rather than replaying a potentially problematic intro during recovery. Ordinary launches keep accelerated rendering.
- Persist the safe renderer preference for subsequent cold launches. A second failure displays a native EN/FR/AR Retry panel instead of closing or entering an automatic restart loop. WebView construction failures also show that panel. Back/lifecycle callbacks tolerate a destroyed WebView.
- Guard early inset publication until the document root exists; publish again after page load.
- Timeout only a texture batch that makes no new progress for 20 seconds; stalled, failed and aborted loads still terminate and release their listeners.
- Resolve UI asset URLs against the document before placing them in CSS custom properties. The existing menu kit uses the same helper.
- Keep version name 0.6.0, increase Android version code from the delivered build's 6 to 7, retaining package/signing identity for an in-place update.

## Verification

- `npm run check`: 628/628 tests passed and the production build passed. Eight added tests cover native startup policy, true-stall versus slow-progress loading, and packaged/subdirectory UI URL resolution. Existing Vite large-chunk and Gradle deprecation advisories remain.
- Offline Android builds: debug, unsigned release and `lintDebug` pass. The installable output is debug-signed; no production signing key or audio asset was changed.
- The repaired native host passed seven renderer-crash checks: survived, returned to the menu in canvas mode, preserved a local-storage canary, remained foreground, and reported no JavaScript errors or missing menu assets. Evidence: `artifacts/android-startup/renderer-recovery-report.json`.
- Final APK: **18/18 gameplay assertions pass** across Balam/Overgrown/EN, Ixchel/Blood Moon/FR and Kukul/Cenote/AR, in the real Phaser Canvas renderer. Touch movement, dash, pause, native Back from Settings and Resume all work. Zero page errors and zero failed HTTP asset responses. Native screenshots were visually inspected. `gameplay-report.json` retains the subsequent test-harness failure caused by Android displaying `RETRY` in uppercase; it does not erase that failed assertion.
- Corrected the case-sensitive native-button assertion and retested: **12/12 checks pass** for menu/fonts, second renderer crash, bounded native panel, touch Retry, save-storage preservation, intro playback and Skip returning to the menu. Evidence: `artifacts/android-startup/startup-report.json` and `native-renderer-error.png`. No APK code change was necessary for button capitalization.
- The emulator cold-launches with persisted canvas mode and `recovering: false`. Loading took approximately **83 / 99 / 122 seconds** for the three routes on this slow software-rendered emulator. These are emulator measurements, not Galaxy A56 performance or phone loading-time certification.
- APK Signature Scheme v2 verifies; the installed package is `com.sangreyjade.game`, version **0.6.0**, build code **7**. The signed APK is **127,069,951 bytes**, copied to `C:/Users/kossa/Desktop/Sangre-y-Jade-v0.6.0-startup-fix.apk` without overwriting the old APK. Both copies have SHA-256 `443b65d26ae50915bca89c6ea230d27e85ea60b9d14fc0415926d369e8caf799`.

The regression runner is `scripts/android-startup-playtest.mjs`, requiring an already running debug APK and local adb/Playwright. `--smoke` navigates three actual hero/map/language combinations, tests touch movement/dash, pause, Android Back from Settings, and Resume. Test-only invulnerability isolates controls from deaths, and any pending level choices are picked normally. The next-XP isolation field was corrected to `stats.nextXp` for future smoke runs; the successful recorded input assertions do not depend on that threshold being changed. This is not a pacing/balance benchmark. `--renderer-crash` exercises first-failure recovery; `--repeat-crash` exercises the bounded native Retry path after safe mode is enabled; `--intro` tests playback and Skip.

An initial Back test was blocked by Android's own `ImmersiveModeConfirmation` window (`Viewing full screen`, `Got it`), not by game navigation. The harness now dismisses only that known system education dialog before testing native input. The attempted supplemental key-routing change was removed; existing predictive/legacy Back callbacks remain unchanged. Evidence: `system-fullscreen-prompt.png` and `back-key-before-fix-report.json` under the test artifact directory.

The tested APK uses the current working checkout, which already contains unrelated uncommitted UI/gameplay prerequisites. Those are preserved rather than absorbed into this startup-fix commit. No full-release performance certification is implied. Install the replacement over the existing app to keep progress; do not clear app data or uninstall as a routine troubleshooting step.
