import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSpriteCells } from '../scripts/slice-sheet.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeSheet(mode) {
  const width = 8, height = 4, rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    if (mode === 'transparent') rgba[offset + 3] = 0;
    else if (mode === 'magenta') { rgba[offset] = 255; rgba[offset + 2] = 255; rgba[offset + 3] = 255; }
    else rgba[offset + 3] = 255;
  }
  const dot = (x, y, color = [220, 180, 70, 255]) => rgba.set(color, (y * width + x) * 4);
  dot(1, 1); dot(2, 1); dot(1, 2); // connected sprite in cell 1
  dot(0, 0, [230, 190, 90, 255]); // detached accent, still within cell 1
  dot(5, 1, [40, 180, 200, 255]); dot(6, 1, [40, 180, 200, 255]); dot(5, 2, [40, 180, 200, 255]); // sprite in cell 2
  return { rgba, width, height };
}

for (const mode of ['transparent', 'magenta', 'black']) {
  test(`sheet slicer detects sprites over ${mode} background and groups cell accents`, () => {
    const { rgba, width, height } = makeSheet(mode);
    const result = detectSpriteCells(rgba, width, height, mode, 2, 1);
    assert.equal(result.cells.size, 2);
    assert.ok(result.components >= 2);
    assert.ok(result.cells.get(0).left === 0);
    assert.ok(result.cells.get(1).right === 6);
  });
}

test('sheet slicer reports an occupied-cell mismatch instead of manufacturing a sprite', () => {
  const { rgba, width, height } = makeSheet('transparent');
  for (let y = 0; y < height; y += 1) for (let x = 4; x < width; x += 1) rgba.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 4);
  const result = detectSpriteCells(rgba, width, height, 'transparent', 2, 1);
  assert.equal(result.cells.size, 1);
  assert.equal(result.cells.has(1), false);
});

test('all 18 UI kit outputs have their specified PNG dimensions and alpha channel', async () => {
  const manifests = await Promise.all(['ui-kit-sheet-1.json', 'ui-kit-sheet-2.json'].map((file) =>
    fs.readFile(new URL(`../docs/skills-redesign/${file}`, import.meta.url), 'utf8').then(JSON.parse)));
  const items = manifests.flatMap((manifest) => manifest.items);
  assert.equal(items.length, 18);
  for (const item of items) {
    const file = path.join(projectRoot, 'public', 'assets', 'pixel', item.file);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.format, 'png', item.file);
    assert.equal(metadata.width, item.width, item.file);
    assert.equal(metadata.height, item.height, item.file);
    assert.equal(metadata.hasAlpha, true, item.file);
  }
});
