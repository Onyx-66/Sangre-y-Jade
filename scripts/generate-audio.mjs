import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RATE = 22050;
const OUT = resolve('public/assets/audio');
mkdirSync(OUT, { recursive: true });

let seed = 0x51a9e;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const noise = () => random() * 2 - 1;
const hz = (note) => 440 * 2 ** ((note - 69) / 12);

function buffer(seconds) {
  return new Float32Array(Math.ceil(seconds * RATE));
}

function addTone(out, start, duration, frequency, amp = .2, shape = 'sine', panPhase = 0) {
  const from = Math.max(0, Math.floor(start * RATE));
  const to = Math.min(out.length, Math.floor((start + duration) * RATE));
  for (let i = from; i < to; i += 1) {
    const t = (i - from) / RATE;
    const p = t / duration;
    const attack = Math.min(1, p / .055);
    const release = Math.min(1, (1 - p) / .22);
    const env = attack * release;
    const phase = TAU * frequency * t + panPhase;
    let value = Math.sin(phase);
    if (shape === 'triangle') value = 2 * Math.asin(Math.sin(phase)) / Math.PI;
    if (shape === 'wood') value = Math.sin(phase) * .7 + Math.sin(phase * 2.01) * .22 + Math.sin(phase * 3.97) * .08;
    if (shape === 'flute') value = Math.sin(phase) * .82 + Math.sin(phase * 2) * .1 + Math.sin(phase * 3) * .04 + noise() * .012;
    out[i] += value * amp * env;
  }
}

const TAU = Math.PI * 2;

function addDrum(out, start, amp = .3, low = 62) {
  const from = Math.floor(start * RATE);
  const length = Math.floor(.36 * RATE);
  for (let n = 0; n < length && from + n < out.length; n += 1) {
    const t = n / RATE;
    const env = Math.exp(-t * 13);
    const pitch = low + 75 * Math.exp(-t * 20);
    out[from + n] += (Math.sin(TAU * pitch * t) * .82 + noise() * .18) * amp * env;
  }
}

function addShaker(out, start, amp = .075) {
  const from = Math.floor(start * RATE);
  const length = Math.floor(.11 * RATE);
  let previous = 0;
  for (let n = 0; n < length && from + n < out.length; n += 1) {
    const t = n / RATE;
    const raw = noise();
    const high = raw - previous * .82;
    previous = raw;
    out[from + n] += high * amp * Math.exp(-t * 35);
  }
}

function addDrone(out, note, amp = .045) {
  const frequency = hz(note);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    const edge = Math.min(1, t / .6, (out.length / RATE - t) / .6);
    out[i] += (Math.sin(TAU * frequency * t) + Math.sin(TAU * frequency * .5 * t) * .55) * amp * edge * (.75 + Math.sin(TAU * .08 * t) * .25);
  }
}

function compose({ file, root, scale, bpm, bars, mood }) {
  seed = root * 12031 + bars;
  const beat = 60 / bpm;
  const duration = bars * 4 * beat;
  const out = buffer(duration);
  addDrone(out, root - 24, mood === 'cenote' ? .065 : .042);
  const melody = mood === 'boss' ? [0, 1, 0, 3, 2, 1, 4, 3, 1, 0, 5, 4] : [0, 2, 3, 1, 4, 3, 2, 5, 4, 2, 1, 3, 0, 2, 4, 5];
  for (let bar = 0; bar < bars; bar += 1) {
    const chordRoot = scale[(bar * 2 + (bar >> 1)) % scale.length];
    addTone(out, bar * 4 * beat, beat * 3.5, hz(root + chordRoot - 12), mood === 'boss' ? .075 : .045, 'flute');
    for (let b = 0; b < 4; b += 1) {
      const at = (bar * 4 + b) * beat;
      addDrum(out, at, mood === 'boss' ? .34 : .2, mood === 'cenote' ? 48 : 60);
      if (b === 1 || b === 3 || mood === 'boss') addShaker(out, at + beat * .5, mood === 'night' ? .055 : .075);
      const degree = melody[(bar * 4 + b) % melody.length] % scale.length;
      const octave = mood === 'cenote' ? 0 : ((bar + b) % 5 === 0 ? 12 : 0);
      addTone(out, at, beat * .72, hz(root + scale[degree] + octave), mood === 'menu' ? .11 : .145, mood === 'night' ? 'flute' : 'wood');
      if (b % 2 === 0) addTone(out, at + beat * .5, beat * .34, hz(root + scale[(degree + 2) % scale.length] + 12), .065, 'wood');
    }
  }
  writeWav(resolve(OUT, file), out);
}

function normalize(samples, ceiling = .9) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > ceiling ? ceiling / peak : 1;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= gain;
}

function writeWav(path, samples) {
  normalize(samples);
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  writeFileSync(path, bytes);
}

function sfx(file, seconds, painter) {
  seed = file.length * 7717;
  const out = buffer(seconds);
  painter(out);
  writeWav(resolve(OUT, file), out);
}

compose({ file: 'music-menu.wav', root: 57, scale: [0, 3, 5, 7, 10], bpm: 72, bars: 8, mood: 'menu' });
compose({ file: 'music-day.wav', root: 57, scale: [0, 2, 3, 7, 9], bpm: 96, bars: 12, mood: 'day' });
compose({ file: 'music-night.wav', root: 50, scale: [0, 1, 5, 7, 8], bpm: 90, bars: 12, mood: 'night' });
compose({ file: 'music-cenote.wav', root: 52, scale: [0, 1, 3, 7, 8], bpm: 82, bars: 10, mood: 'cenote' });
compose({ file: 'music-boss.wav', root: 45, scale: [0, 1, 4, 6, 7, 10], bpm: 124, bars: 12, mood: 'boss' });

sfx('sfx-click.wav', .11, (o) => addTone(o, 0, .1, 740, .35, 'wood'));
sfx('sfx-slash.wav', .3, (o) => {
  for (let i = 0; i < o.length; i += 1) { const t = i / RATE; o[i] += noise() * .24 * Math.sin(Math.PI * t / .3) + Math.sin(TAU * (620 - 1300 * t) * t) * .14 * Math.exp(-t * 9); }
});
sfx('sfx-spell.wav', .48, (o) => { addTone(o, 0, .35, 420, .28, 'flute'); addTone(o, .07, .35, 630, .22, 'flute'); addTone(o, .14, .31, 945, .16, 'flute'); });
sfx('sfx-dart.wav', .2, (o) => { addTone(o, 0, .18, 880, .21, 'triangle'); for (let i = 0; i < o.length; i += 1) o[i] += noise() * .07 * Math.exp(-i / RATE * 24); });
sfx('sfx-hit.wav', .18, (o) => { addDrum(o, 0, .5, 78); for (let i = 0; i < o.length; i += 1) o[i] += noise() * .13 * Math.exp(-i / RATE * 30); });
sfx('sfx-pickup.wav', .32, (o) => { addTone(o, 0, .18, hz(76), .25, 'wood'); addTone(o, .1, .21, hz(83), .25, 'wood'); });
sfx('sfx-cacao.wav', .24, (o) => { addTone(o, 0, .14, 510, .27, 'wood'); addTone(o, .08, .14, 690, .2, 'wood'); });
sfx('sfx-dash.wav', .34, (o) => { for (let i = 0; i < o.length; i += 1) { const t = i / RATE; o[i] += noise() * .16 * Math.sin(Math.PI * t / .34) + Math.sin(TAU * (180 + t * 520) * t) * .08; } });
sfx('sfx-level.wav', .75, (o) => [60, 64, 67, 72].forEach((n, i) => addTone(o, i * .12, .34, hz(n), .24, 'wood')));
sfx('sfx-hurt.wav', .3, (o) => { addTone(o, 0, .25, 115, .3, 'triangle'); for (let i = 0; i < o.length; i += 1) o[i] += noise() * .1 * Math.exp(-i / RATE * 13); });
sfx('sfx-boss.wav', .85, (o) => { addTone(o, 0, .8, hz(38), .32, 'triangle'); addTone(o, .08, .72, hz(39), .22, 'triangle'); addDrum(o, 0, .42, 45); });
sfx('sfx-victory.wav', 1.45, (o) => [57, 60, 64, 69, 72].forEach((n, i) => addTone(o, i * .18, .62, hz(n), .22, 'flute')));
sfx('sfx-defeat.wav', 1.25, (o) => [57, 53, 50, 45].forEach((n, i) => addTone(o, i * .22, .64, hz(n), .2, 'flute')));

console.log(`Generated 18 original WAV assets in ${OUT}`);

