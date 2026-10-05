# V18 — EN / FR / AR localization verification

Date: 2026-10-06. Branch: `release/0.6.0`. Scope: localization and text layout only.

## Delivered

- Completed/registered the release dictionaries: settings and audio options, HUD editor controls/presets/validation, pause/Skills/Replace, loading errors/phases and **12 tips**, all 15 enemy names, boss names/epithets/banners, map descriptions/difficulty, weather names, ally/HUD/accessibility labels, and the corrected starting-slot subtitle/help text.
- Included the existing authored skill-description translations and their deterministic generator/check. All 98 specification names and English descriptions are checked against the JSON; runtime legacy descriptions remain translated for compatibility. Removed the misleading generic per-type description fallback.
- FR/AR tables carry `// TODO native review`. Translation completeness does not replace native-language review. Proper names, genuine French cognates, technical coordinates and the existing build identifier are not accidental English fallbacks.
- Fixed localized panel intrinsic-width overflow, scrolling ally cards moving headings offscreen, replacement titles escaping their cards, and result actions covering the stat list. Long phone lists scroll intentionally instead of shrinking text. Corrected Arabic font specificity on ribbons/counters/boss epithets and explicit RTL on choice/pause-settings overlays; HUD positions remain LTR.
- Preserved bundled fonts, game mechanics, assets and all audio files. No downloads or dependencies added.

## Automated results

| Check | Result |
| --- | --- |
| `npm run test:i18n` | 8/8 pass; 726 dictionary keys and 168 discovered runtime keys; no untranslated keys |
| Negative audit controls | Missing values, English copies and interpolation mismatches fail; narrowly allowlisted French cognates pass |
| Skill audit | 98 JSON skill names/descriptions and short FR/AR card copy checked; deterministic generation check passes |
| `npm run check` | 618/618 tests pass; production build passes |
| Build advisory | Existing large JS chunk: approximately 2,027 kB minified / 567 kB gzip; no bundling changes in this task |
| `npm run test:i18n:browser` | EN/FR/AR × 568×320 and 1280×720; 37 captures per combination, 222 total |

The browser audit runs installed Chrome through Playwright with real bundled fonts and the current Phaser scene. It checks visible untranslated text, Arabic font selection, Western numerals, RTL menu directions, LTR HUD/boss-bar geometry, same HUD rectangles across languages, toggle containment, text/card boundaries and horizontal clipping. It exercises the actual replacement flow, loading failure, HUD import error and scrolls editor toolbar actions into reach. Timed unlock banners are held for deterministic screenshots. Intentional vertical lists and horizontal toolbars are tested as scrollable, not classified as overflow failures.

Covered screens: main/hero/map/mode/ready, upgrades/shop/help and help tabs, general/audio/HUD settings, loading/error, HUD/ally/tooltip/unlocks, pause/settings/help/Skills, companion pick, level-up/boss reward, all three replacement steps, HUD editor/export/import error, boss entry/bar, victory/defeat. Visual Arabic contact-sheet review covers both sizes; EN/FR use the same geometry and text assertions.

Raw captures and machine results: `previews/v18/report.json`; Arabic review montages: `previews/v18/review-ar-568-1.png` through `-5.png` and `review-ar-1280-1.png` through `-5.png`. Re-run the browser command to reproduce all raw PNGs locally.

## Remaining / scope boundaries

- Native French/Arabic proofreading and Android device/font rendering remain human checks. Desktop browser emulation is not Android certification.
- The current Settings implementation exposes General, Audio and HUD, not all seven planned V4 tabs. Labels for the remaining tabs/options are translated; implementing those pages is not a localization change.
- Ixchel still has legacy runtime actives and no passive draft pool in this checkout. Compatibility copy is translated; Balam exercises replacement. This task does not repair unrelated skill implementations.
- Several prior UI/HUD features and art files were already uncommitted. Browser results refer to that complete working checkout. The V18 commit includes localization-only prerequisites and does not absorb unrelated feature/art changes; the broad browser script requires those earlier UI steps.
- Weather names are available to code but no weather banners were added (V14 requires visual-only events). Technical filenames in errors/export codes remain verbatim. No version bump or asset replacement was requested.
