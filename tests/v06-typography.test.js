import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { loadGameFonts, gameTextStyle, FONT_FILES } from '../src/ui/Typography.js';

test('first menu and Phaser creation both await the typography gate', async () => {
  const source = await fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(source.includes('await waitForGameFonts('), 'startup has a font gate');
  assert.ok(source.indexOf('await waitForGameFonts(') < source.indexOf('new SangreYJadeApp('));
  assert.match(source.slice(source.indexOf('async startRun()'), source.indexOf('showSummary(summary)')), /await waitForGameFonts\(/);
});

test('shared UI imports a single token and font definition source', async () => {
  const source = await fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(source.includes("import './fonts-v06.css'"));
  const tokens = await fs.readFile(new URL('../src/ui/tokens.css', import.meta.url), 'utf8');
  for (const literal of ['#ffcf4a', '#3de0b0', '#8ec5ff']) assert.ok(tokens.includes(literal));
});

test('font gate waits for file loads, explicit Arabic warming and FontFaceSet.ready', async () => {
  let releaseReady;
  const ready = new Promise(resolve => { releaseReady = resolve; });
  const added = [], warmed = [];
  class FakeFace { constructor(family, source, descriptors) { Object.assign(this, { family, source, descriptors }); }
    async load() { return this; } }
  const fontSet = { add: face => added.push(face), load: async (...args) => warmed.push(args), ready };
  let done = false;
  const loading = loadGameFonts({ fontSet, FontFaceClass: FakeFace,
    urls: Object.fromEntries(FONT_FILES.map(font => [font.file, `/${font.file}`])) }).then(report => { done = true; return report; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(done, false);
  assert.deepEqual(added.map(face => face.descriptors.weight), ['400', '400', '400', '400', '400', '700', '700', '100 900']);
  assert.equal(added[1].descriptors.unicodeRange, 'U+0030-0039');
  assert.ok(warmed.some(([font, text]) => font.includes('Noto Sans Arabic') && text === 'العربية'));
  releaseReady();
  assert.deepEqual((await loading).missing, []);
  assert.equal(done, true);
});

test('missing files are reported without guessed fetches or falsely registered fonts', async () => {
  const fontSet = { add: () => assert.fail('no absent font may be registered'), load: async () => [], ready: Promise.resolve() };
  const report = await loadGameFonts({ fontSet, FontFaceClass: class { constructor() { assert.fail('no guessed font URLs'); } } });
  assert.deepEqual(report.missing, ['Jersey 15', 'Atkinson Hyperlegible', 'Noto Sans Arabic']);
  assert.deepEqual(report.loaded, []);
});

test('a corrupt Latin font reports its failure and cannot deadlock startup', async () => {
  class BadFace { async load() { throw new Error('invalid font'); } }
  const fontSet = { add: () => assert.fail('corrupt face'), load: async () => [], ready: Promise.resolve() };
  const report = await loadGameFonts({ fontSet, FontFaceClass: BadFace, urls: { 'Jersey15-latin-400.woff2': '/bad.woff2' } });
  assert.equal(report.errors.length, 1);
  assert.ok(report.missing.includes('Jersey 15'));
});

test('Phaser/canvas styles choose heading, small body and Arabic without bold synthesis', () => {
  assert.match(gameTextStyle('128').fontFamily, /Jersey 15/);
  assert.match(gameTextStyle('Label', 12).fontFamily, /Atkinson Hyperlegible/);
  assert.match(gameTextStyle('128', 12).fontFamily, /Jersey 15/);
  const arabic = gameTextStyle('المستوى 20');
  assert.match(arabic.fontFamily, /Noto Sans Arabic/);
  assert.ok(arabic.fontFamily.indexOf('Jersey 15') < arabic.fontFamily.indexOf('Noto Sans Arabic'));
  for (const text of ['128', 'المستوى', 'Critical']) assert.equal(gameTextStyle(text).fontStyle, 'normal');
});

test('old font faces and names are no longer used by runtime source', async () => {
  for (const name of ['pixel.css', 'v04.css', 'v05.css', 'style.css', 'skills-hud.css', 'fonts-v06.css', 'scenes/GameScene.js']) {
    assert.doesNotMatch(await fs.readFile(new URL(`../src/${name}`, import.meta.url), 'utf8'), /Pixelify|Unixel|LatinDigits|NotoArabic|Trebuchet|Times New Roman/);
  }
});

test('every required font subset and original OFL notice is bundled (release acceptance)', async () => {
  for (const { file } of FONT_FILES) assert.ok((await fs.stat(new URL(`../public/assets/fonts/${file}`, import.meta.url))).size > 1000, file);
  for (const family of ['Jersey15', 'AtkinsonHyperlegible', 'NotoSansArabic']) {
    const publicLicense = await fs.readFile(new URL(`../public/assets/fonts/OFL-${family}.txt`, import.meta.url), 'utf8');
    assert.match(publicLicense, /SIL OPEN FONT LICENSE/);
    assert.equal(await fs.readFile(new URL(`../licenses/OFL-${family}.txt`, import.meta.url), 'utf8'), publicLicense);
  }
});
