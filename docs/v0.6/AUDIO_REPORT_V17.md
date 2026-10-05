# V17 — Audio integration (2026-10-05)

## Delivery

The build/dev compiler reads `audio/audio_manifest.json` and ships a compact 461-ID lookup, not the generation prompts. Available MP3 paths are indexed at build/server start; rebuild/restart after adding developer audio. Files remain optional. The shared Web Audio mixer provides master plus Music, Effects, Ambience, Voice and UI buses; the Audio settings tab is shared between menu and pause, with EN/FR/AR labels and a persisted voice switch.

Effects share a 24-voice cap (including pending decodes and skill loops); enemy cues/hit sounds share an eight-voice sub-cap. Same-ID throttle is 60 ms; effect pitch is ±4%; positional cues use distance gain and stereo pan. Sources and gain/pan nodes are disconnected on completion. Scene/skill-owner cancellation prevents late decoded sounds and loops from surviving shutdown. Browser backgrounding suspends the audio context.

Map/boss/menu/loading/shop music, victory/defeat stingers, 1.2 s music crossfades, four-second music loop overlaps, 1.5 s ambience/weather fades, localized narration and barks are connected. Music ducks by 6 dB for dialogue and cinematic entry, with independent reasons so overlapping duck requests do not prematurely restore volume. Boss dialogue never overlaps; a new line is skipped while one is pending/playing. Taunts are attempted every 30 gameplay seconds. Ah Puch uses three equal-duration sections until authored offsets are supplied. Hero/ally/skill/enemy/boss/UI/core hooks resolve to manifest IDs; legacy WAV or silence is used with one warning per missing ID.

Loading predecodes menu/core sounds, the selected hero and map, applicable enemies/weather, localized announcer/hero lines and the next boss; a recruited ally preloads its skills. Subsequent bosses prefetch at their scheduled arrival minus 60 seconds, even if the previous boss is still alive. No sound definitions, AI, damage or spawn values changed.

## Asset audit

| Location | MP3 count | Size |
| --- | ---: | ---: |
| `public/assets/audio-v06/` | 0 / 461 | 0 bytes / 45,000,000 budget |
| Supplied ElevenLabs Downloads folder | 91 | 2,027,583 bytes (2.03 MB) |

The supplied folder is `C:\Users\kossa\Downloads\produced by eleven labs`. It was inspected read-only. Per the explicit no-audio-file-write rule, nothing was copied, renamed, transcoded or deleted. 89 filenames match manifest basenames. `toogle-off.mp3` needs the developer to name/place it as `sfx/ui/toggle-off.mp3`; `splash.mp3` has no exact manifest entry and was not guessed. Music, voice and new skill MP3s were not found in that folder.

Missing runtime files: **P0 264, P1 85, P2 112**. `AUDIO_AUDIT_V17.json` lists every missing path by priority and records code-reference validation. Missing content does not make `audio:check` fail; unknown code IDs or the 45 MB budget do. The production music/voice mix cannot be approved until the developer files are placed in their manifest paths.

## Verification

- `npm run test:audio-v06`: **12/12 pass**, including all manifest IDs, unknown-ID rejection, fallbacks, partial delivery, cancellation races, caps, throttling, pitch/pan, nested ducking, category defaults, localized voice, lazy groups, crossfade timing and Ah Puch offsets.
- `npm run test:audio-v06:browser`: real Phaser and real Web Audio, **600 accelerated gameplay seconds per case**, all new MP3s missing and all present. Present-case silent MPEG-1 Layer III files are created only in a validated OS temporary directory, served by the test, decoded by Chromium and removed afterward. They are never production assets.
- Repeated against the isolated proposed source changes (`--staged`): both cases complete 600 seconds; peaks **23/24 effects** and **8/8 enemy voices**; zero console/HTTP errors. All-present case has zero missing-audio warnings; all-missing case warns only for known optional IDs. Decoded cache has 168 entries after each run. This is accelerated robustness coverage, not a real-time performance measurement or an all-abilities balance test.
- A real browser gesture unlocks audio. Legacy click produces a nonzero output-mixer signal; the MP3 fixture decodes to silence. This verifies the output path, not human listening on speakers/Android. Human review of the delivered ElevenLabs mix remains needed.
- EN/FR/AR Audio tab screenshots at 568×320; every slider/switch scrolls into view, rows remain inside the viewport and have 44 px touch targets. Voice enable/disable persists. See `previews/v17/` and `previews/v17/staged/`.
- Final `npm run check`: **614/615 pass**. The only failure is the pre-existing French untranslated-key audit for `MANA` and `Cacao`; it also failed before V17. Production build passes separately with the existing large-chunk advisory. No unrelated translation edits were included.

## Remaining verification

Place the supplied files under `public/assets/audio-v06/` following the manifest, restart/rebuild, run `npm run audio:check`, then listen on speakers and an Android device. Confirm voice timing/localization, boss mix/ducking, phase boundaries and loop joins using the actual long-form recordings. Native FR/AR review remains marked in source. There is no new audio generation and no new dependency.
