# Android menu update — build 9

Date: 2026-10-06. Branch: `release/0.6.0`.

## Package

- Includes the menu, permanent-upgrade card and hero/map selection changes from `a4ae912`, with the confirmed Galaxy A56 startup fix from `14d5508` retained.
- Package `com.sangreyjade.game`, version name `0.6.0`, version code **9**; minimum API 26, target API 36.
- Installable artifact: `C:/Users/kossa/Desktop/Sangre-y-Jade-v0.6.0-build9-menu-update.apk`.
- Size: **127,763,426 bytes**. SHA-256: `f13cc9868deff6533fb2f329aa294c52231a3bbdadc8606a7d6edfa8293ced8a`.
- Source: `release/Sangre-y-Jade-v0.6.0-Android-debug.apk`; the Desktop copy has the identical hash. Earlier Desktop APKs are preserved.
- APK v2 signature verifies. Its public certificate SHA-256 matches the previously delivered A56 build: `a591e2c6a88618704417218149b29b0f87c7432f9c65815957022fc1864ac311`. Install over the existing app to retain its saved progress; an uninstall is unnecessary.
- This uses the existing debug signing identity. The separately compiled release variant is unsigned and is not the delivered installable APK. Production signing keys were not accessed.

## Verification

- `npm run check`: **634/634 tests pass**, production web build passes; existing large-chunk advisory only.
- `node scripts/build-android.mjs`: offline `assembleDebug`, `assembleRelease` and `lintDebug` **pass**. No dependencies or content downloaded.
- SDK `aapt dump badging` and `apksigner verify --verbose --print-certs` validate the packaged version and signing/update identity.
- Local Android 17 / WebView 149 / 16 KB-page emulator: **5/5 cold-launch checks pass** (app/fonts, host survives, remains foreground, no JavaScript errors, no missing startup assets).
- Actual packaged EN/FR/AR menus: **62/62 checks pass** for equal Language/Settings/Watch Intro/Shop geometry, language switching, in-window wallet, four image/detail/current-max upgrade cards, removed heading/subtitle, top-centred hero/map art and red/green selection borders. No JavaScript errors or missing menu assets. Visually reviewed English menu and Arabic upgrade/hero/map captures.
- Evidence: `artifacts/android-startup/menu-update-build9-launch/startup-report.json`, `menu-report.json` and twelve screenshots in that directory. The emulator used its previously saved Canvas recovery setting, at an 891×411 CSS-pixel viewport.

## Limits and scope

- The longer three-route gameplay smoke is **inconclusive**: an initial harness/install race invalidated the first attempt; a later emulator/tool session ended during software-rendered gameplay loading without a final report. This is not evidence of a new app crash, nor a gameplay pass. No game code was changed to hide either outcome.
- No physical phone was attached for build 9. The prior build 8 A56 cold-launch/gameplay evidence is documented separately; it does not constitute a new build 9 physical-device test.
- The package was built from the current working checkout, including preserved earlier uncommitted prerequisites. This is packaging of the requested UI update, not a clean-clone or full-release acceptance clearance; the existing release review blockers remain.
- No phone installation, push, audio changes, old-asset deletion, secrets access or production-keystore changes. Only the version-code change and build documentation/evidence belong to this packaging commit.
