import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { FxDirector } from '../src/fx/FxDirector.js';
import { BALAM_FX_RECIPES, fxRecipeSignature } from '../src/fx/recipes/balam.js';
import { BALAM_DEFINITIONS, SHARED_DEFINITIONS } from '../src/skills/generated/balam.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const recipeIds = [...BALAM_DEFINITIONS, ...SHARED_DEFINITIONS].map(skill => skill.id);

test('Balam and shared FX recipes register once per skill and every visual signature is unique', () => {
  assert.equal(Object.keys(BALAM_FX_RECIPES).length, 26);
  assert.deepEqual(Object.keys(BALAM_FX_RECIPES).sort(), [...recipeIds].sort());
  const signatures = Object.entries(BALAM_FX_RECIPES).map(([id, recipe]) => [id, fxRecipeSignature(recipe)]);
  assert.equal(new Set(signatures.map(([, signature]) => signature)).size, signatures.length,
    signatures.map(([id, signature]) => `${id}: ${signature}`).join('\n'));
  for (const [id, recipe] of Object.entries(BALAM_FX_RECIPES)) {
    assert.ok(recipe.signature.shape && recipe.signature.motion && recipe.signature.blendMode && recipe.signature.palette, id);
    assert.ok(Object.values(recipe).some(value => typeof value === 'function'), `${id} has no stage callbacks`);
  }
  assert.ok(recipeIds.every(id => FxDirector.recipes.has(id)));
});

test('Balam run preload schedules only registered stills for the selected hero and traits', () => {
  const loaded = new Set(), calls = [];
  const scene = {
    textures: { exists: key => loaded.has(key) },
    load: { image: (key, url) => { calls.push({ key, url }); loaded.add(key); } },
  };
  const count = FxDirector.preload(scene, ['jaguar-roar', 'bloodlust', 'jade-bounty', 'unregistered-skill']);
  assert.equal(count, 4);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.url.startsWith('/assets/pixel/fx/')));
  assert.equal(FxDirector.preload(scene, ['jaguar-roar', 'bloodlust', 'jade-bounty']), 0);
});

test('all 42 Balam/shared still files are transparent PNGs at their final dimensions', async () => {
  const manifests = await Promise.all([1, 2, 3].map(async n => JSON.parse(
    await fs.readFile(path.join(root, 'docs/skills-redesign', `fx-sheet-${n}.json`), 'utf8'))));
  const items = manifests.flatMap(manifest => manifest.items);
  assert.equal(items.length, 42);
  assert.equal(new Set(items.map(item => item.file)).size, 42);
  for (const item of items) {
    const file = path.join(root, 'public/assets/pixel', item.file);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.format, 'png', item.file);
    assert.equal(metadata.width, item.width, item.file);
    assert.equal(metadata.height, item.height, item.file);
    assert.equal(metadata.hasAlpha, true, item.file);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = false, visible = false;
    for (let i = 3; i < data.length; i += info.channels) { transparent ||= data[i] === 0; visible ||= data[i] > 20; }
    assert.ok(transparent && visible, `${item.file} must contain transparent and visible pixels`);
  }
});
