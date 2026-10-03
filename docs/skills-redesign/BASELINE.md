# Skills overhaul baseline — step 1

Date: 2026-10-03. Source: `02a8063fa54288e2589496c413fc7d81dd7dbeec`, package version 0.5.0. Branch: `feature/skills-overhaul`. Game code and assets unchanged.

## Supplied files

| File | Bytes | Status |
|---|---:|---|
| skills_redesign.md | 118976 | Present; fully read (1918 lines) |
| skills_redesign.json | 83485 | Present; parsed and validated |
| validate_skills.mjs | 4876 | Present; read and run with --allow-new |
| migrate_icons.mjs | 1125 | Present; read, not run (read-only step) |
| style_reference.png | 406307 | Present |
| style_reference_fx.png | 324608 | Present |

PROGRESS.md and DECISIONS.md did not exist at the start. No AGENTS.md was found in the workspace file inventory. Supplied data contains 72 hero entries (24 per hero), 2 shared passives, 24 ally entries (8 per ally), and 10 stat upgrades: 108 entries excluding optional UI icons.

## Environment and execution

Windows PowerShell; Node **v26.8.1**, npm **11.19.0**, Phaser **3.90.0**, Vite **7.3.6**, playwright-core **1.55.0**. Used installed local dependencies and Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`; no downloads or installs. package.json scripts were read before execution. Existing game test/build/playtest scripts were executed unchanged.

Reproduction wrapper: `node docs/skills-redesign/run-baseline.mjs`. It runs commands serially, records wall-clock timings/exit codes and full output in [baseline-results.json](baseline-results.json), serves the freshly built dist locally, and runs browser scripts from a separate temporary cwd. SYJ_URL is `http://127.0.0.1:4173/`. A Vite preview was started for these tests and stopped afterward. Existing tracked artifacts were not overwritten. No .env files were read.

Generated screenshots and script reports for this run remain at `C:/Users/kossa/AppData/Local/Temp/syj-skills-baseline-Z27O4U/artifacts/`. They are diagnostic output, not game assets or committed deliverables.

| Command | Seconds | Exit | Result |
|---|---:|---:|---|
| npm run test | 3.185 | 0 | 23 tests passed; 0 failures/skips |
| npm run build | 12.344 | 0 | 31 modules; successful production build |
| node scripts/playtest.mjs | 74.858 | 0 | 23 checks; 0 browser errors |
| node scripts/extended-playtest.mjs | 40.302 | 0 | 8 checks; all 60 hero abilities executed across three maps; 0 errors |
| node scripts/v03-playtest.mjs | 60.270 | 1 | 26 completed checks passed; 0 browser errors; stale selector timeout at #run-attack |
| node scripts/v04-playtest.mjs | 30.812 | 0 | 47 checks; 0 errors |
| node scripts/v05-playtest.mjs | 35.873 | 0 | 124 checks; 0 errors |
| node scripts/v05-combat-test.mjs | 29.876 | 0 | 26 checks; 0 errors |
| node docs/skills-redesign/validate_skills.mjs docs/skills-redesign/skills_redesign.json --assets public/assets/pixel --allow-new | 0.078 | 0 | 108 entries; 66 active / 32 passive / 10 stats; OK with 108 missing-icon warnings |

Build warning: existing JavaScript chunk exceeds 500 kB (1,346.45 kB, gzip 381.32 kB). This is nonfatal and no bundling changes belong to step 1. The sole baseline playtest failure is documented in DECISIONS.md; the old script stops before its combat checks. No code was changed to hide or repair baseline behavior.

`audio`, `art`, `marketing`, `android`, `release`, `dev` and persistent `preview` are generation/publishing/server scripts, not extra browser playtests; they were not run as content-production tasks. The locally managed preview only supported baseline verification. Existing Android smoke scripts were not run; they need an emulator/device and are outside this read-only browser investigation.

## Progression metrics available today

| Hero | 10-minute maximum natural level / Lv10 and Lv20 times | 20-minute maximum natural level / Lv10 and Lv20 times |
|---|---|---|
| Balam | Not measured by existing scripts | Not measured by existing scripts |
| Ixchel | Not measured by existing scripts | Not measured by existing scripts |
| Kukul | Not measured by existing scripts | Not measured by existing scripts |

The scripts force XP/levels or disable normal progression; none runs a full survival bot in both modes. Forced level >= 7 in the combat test is not a pacing measurement. The current formula requires 819 total XP to reach 10 and 3306 to reach 20. See DECISIONS.md for line references and mana/enemy/save findings.

## Asset folders and image dimensions

Immediate directories under `public/assets`: **audio, branding, cinematic, fonts, pixel, ui**. Audio has `narration/`; pixel has `frames/`. Skill-specific `pixel/skills/` and `pixel/fx/<id>/` are not yet produced by this step. Existing untracked `ui/menu/` belongs to prior user work.

PNG headers checked with `node docs/skills-redesign/inspect-assets.mjs`:

- All **66** `pixel/icon-0.png` through `pixel/icon-65.png`: **128 × 128 pixels**; e.g. `public/assets/pixel/icon-1.png` is exactly 128 × 128.
- All **24** `pixel/frames/fx-0-0.png` through `fx-5-3.png`: **128 × 128 pixels** each. Six families, four frames each; e.g. `public/assets/pixel/frames/fx-0-0.png` is exactly 128 × 128.

## Audio inventory

Names below are relative to `public/assets/audio`. All 25 sound files are RIFF/WAVE **PCM (encoding 1), signed 16-bit**. Sample rates and channels are read from fmt chunks, not assumed from filenames. Peak and RMS are measured across all samples/channels over the complete file, in dBFS; RMS is a simple signal-energy measure, **not LUFS or perceived loudness**. No normalization or asset modification occurred.

| File | Format | Hz | Channels | Seconds | Peak dBFS | RMS dBFS |
|---|---|---:|---|---:|---:|---:|
| music-boss.wav | WAV PCM16 | 44100 | Stereo | 23.226 | -9.03 | -22.86 |
| music-cenote.wav | WAV PCM16 | 44100 | Stereo | 29.268 | -9.52 | -23.97 |
| music-day.wav | WAV PCM16 | 44100 | Stereo | 30.000 | -9.14 | -24.26 |
| music-menu.wav | WAV PCM16 | 44100 | Stereo | 26.667 | -10.03 | -25.26 |
| music-night.wav | WAV PCM16 | 44100 | Stereo | 32.000 | -9.18 | -24.15 |
| music-prologue.wav | WAV PCM16 | 44100 | Stereo | 27.000 | -9.56 | -24.81 |
| narration/en-0.wav | WAV PCM16 | 24000 | Mono | 4.160 | -1.41 | -20.66 |
| narration/en-1.wav | WAV PCM16 | 24000 | Mono | 4.395 | -1.41 | -21.14 |
| narration/en-2.wav | WAV PCM16 | 24000 | Mono | 4.139 | -1.41 | -18.69 |
| narration/en-3.wav | WAV PCM16 | 24000 | Mono | 3.840 | -1.41 | -21.26 |
| narration/en-4.wav | WAV PCM16 | 24000 | Mono | 3.605 | -1.41 | -22.51 |
| narration/en-5.wav | WAV PCM16 | 24000 | Mono | 4.373 | -1.41 | -21.06 |
| sfx-boss.wav | WAV PCM16 | 44100 | Stereo | 1.700 | -5.30 | -16.09 |
| sfx-cacao.wav | WAV PCM16 | 44100 | Stereo | 0.350 | -17.77 | -33.14 |
| sfx-click.wav | WAV PCM16 | 44100 | Stereo | 0.180 | -13.82 | -29.91 |
| sfx-dart.wav | WAV PCM16 | 44100 | Stereo | 0.300 | -9.18 | -26.11 |
| sfx-dash.wav | WAV PCM16 | 44100 | Stereo | 0.600 | -10.59 | -25.40 |
| sfx-defeat.wav | WAV PCM16 | 44100 | Stereo | 2.400 | -11.60 | -25.54 |
| sfx-hit.wav | WAV PCM16 | 44100 | Stereo | 0.380 | -3.71 | -17.15 |
| sfx-hurt.wav | WAV PCM16 | 44100 | Stereo | 0.550 | -6.48 | -21.30 |
| sfx-level.wav | WAV PCM16 | 44100 | Stereo | 1.200 | -10.57 | -23.75 |
| sfx-pickup.wav | WAV PCM16 | 44100 | Stereo | 0.360 | -21.31 | -32.56 |
| sfx-slash.wav | WAV PCM16 | 44100 | Stereo | 0.500 | -4.63 | -21.58 |
| sfx-spell.wav | WAV PCM16 | 44100 | Stereo | 0.800 | -10.55 | -24.38 |
| sfx-victory.wav | WAV PCM16 | 44100 | Stereo | 2.800 | -8.36 | -21.88 |

The additional `narration/manifest.json` is JSON metadata, not audio (sample rate, channels and loudness do not apply). There are no OGG/MP3 files in this directory. Existing SFX are stereo despite the future specification's mono target; later generated skill WAVs should follow the explicit 44.1 kHz mono/-3 dBFS target and be mixed against these measured levels. Music and narration are inventoried only and remain excluded from production work.
