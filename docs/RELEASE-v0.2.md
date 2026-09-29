# v0.2 publishing notes

## itch.io

Create/edit your project as an HTML game. Upload `Sangre-y-Jade-v0.2.0-itchio.zip` and mark it browser-playable. Use 1280 × 720 initial embed size, enable fullscreen, and mark mobile-friendly. Test the public embed on a phone after upload: browser storage/audio/fullscreen behavior can differ from localhost. Nothing has been published to your account automatically.

Upload the APK separately as an Android download. It is a debug-signed preview for testing/sideloading, not a Play Store production release. Android may ask players to allow installation from their browser/file manager. Minimum Android 8.0 (API 26), target/compile API 36, package `com.sangreyjade.game`. It packages the Phaser game in an offline WebView, not a rewritten native engine.

The Supporter Pack is supplied as a separate paid extra. Cosmetic unlocks, payments, and entitlement checks are not implemented. Do not advertise the catalog's proposed skins/trails as already usable.

## What's new

Automatic 27-second first-run prologue, six scenes, progressive subtitles; generated pixel-art roster with four poses per actor; shared sprite-animation effects; icon sheets, font, terrain/props, colors, menus, touch controls; layered stereo effects and remastered music; pause safety for delayed spells; pooled-enemy and scenery-placement fixes.

## QA boundaries

Chromium tests cover movement, sprite loading, progression, pause, boss rewards, victory, saves and mobile viewport layout. Extended tests wait for natural cinematic completion and execute all 60 abilities on three map variants. Android tests cover install, launch, bundled assets/audio decoding, touch joystick, dash and pause in an emulator. Reports are in `artifacts/`.

No physical-phone performance certification, full 10/20-minute balance study, payment integration test, or exact art-quality equivalence to the reference is claimed. Fuller directional animation, hand-polished sprites, distinct authored maps and more individualized skill effects remain production milestones.

Previous v0.1 archives are retained as older builds. Use filenames containing **v0.2.0** for this release.
