# Procedural skill and UI effects

Run `npm run audio:skills` to render the checked-in recipes without a network,
external samples or dependencies. It writes only `public/assets/audio/sfx/`,
the sound report and Step 18 measurement JSON. Do **not** use `npm run audio`
for this overhaul: that older command also generates music.

Each `<skill-id>.json` retains the authoritative `sfx` brief and contains fully
expanded `cast`, `hit`, `loop` and/or `proc` recipes. Eight deliberately silent
passives have an empty `sounds` object. UI files use `ui-<event>.json`.

Tune these JSON files directly. `generate-sfx-recipes.mjs` is the one-time
brief-to-recipe authoring source; rerunning it resets manual recipe tuning.

Recipe fields:

- `duration`, `peakDb`, `seed`, `loop`: length, mastering target, deterministic
  seed and circular-loop rendering. Format is mono 44.1 kHz signed PCM16.
- `layers`: at least two oscillator/noise layers, each with gain, optional
  start/duration, exponential start/end frequency sweep, ADSR envelope, FM,
  vibrato, pulse modulation, low/high-pass filters and soft distortion.
- `delay` / `reverb`: bounded feed-forward taps; circular addressing for loops.
  A 40 ms overlap splice and sub-millisecond endpoint correction remove the
  wrap discontinuity without a silent gap. One-shots have short edge fades
  and no padded lead-in or trailing silence blocks.

These are synthetic instrument/material metaphors, not recorded instruments,
animals, voices or historically authenticated Maya music. No music or voice
recording is generated, read as a sample, replaced or deleted.

`npm run test:audio` decodes every WAV in local Chromium, measures actual mixer
output, exercises hero/ally handlers and UI callbacks, and checks mute, pause,
resume and all loop lifetimes. An interactive listening review is still useful
for subjective mix/timbre judgments; automated RMS checks do not replace it.
