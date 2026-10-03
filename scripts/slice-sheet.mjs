#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = process.cwd();
const help = `Usage: node scripts/slice-sheet.mjs <sheet.png> <manifest.json> [transparent|magenta|black] [--overwrite]

Manifest format:
{
  "expectedCount": 2,
  "columns": 2,
  "rows": 1,
  "background": "transparent",
  "outputDir": "public/assets/pixel",
  "contactSheet": "docs/skills-redesign/previews/example-contact.png",
  "items": [{ "file": "ui/example.png", "width": 96, "height": 96 }]
}

The manifest item order is reading order (left-to-right, top-to-bottom).`;

function isBackground(rgba, offset, mode) {
  const r = rgba[offset], g = rgba[offset + 1], b = rgba[offset + 2], a = rgba[offset + 3];
  if (mode === 'transparent') return a <= 20;
  if (mode === 'magenta') return r >= 180 && b >= 180 && g <= 120 && Math.abs(r - b) <= 90;
  return r <= 22 && g <= 22 && b <= 22;
}

function cellAt(x, y, width, height, columns, rows) {
  const col = Math.min(columns - 1, Math.floor((x * columns) / width));
  const row = Math.min(rows - 1, Math.floor((y * rows) / height));
  return row * columns + col;
}

/** Find foreground connected components, then group detached accents inside each declared sheet cell. */
export function detectSpriteCells(rgba, width, height, mode, columns, rows) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const cells = new Map();
  let components = 0;

  for (let start = 0; start < width * height; start += 1) {
    if (visited[start]) continue;
    const offset = start * 4;
    if (isBackground(rgba, offset, mode)) { visited[start] = 1; continue; }
    let head = 0, tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let minX = width, minY = height, maxX = -1, maxY = -1, area = 0;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width, y = Math.floor(index / width);
      area += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const next = ny * width + nx;
          if (visited[next]) continue;
          visited[next] = 1;
          if (!isBackground(rgba, next * 4, mode)) queue[tail++] = next;
        }
      }
    }
    if (area < 3) continue;
    components += 1;
    const cell = cellAt((minX + maxX) / 2, (minY + maxY) / 2, width, height, columns, rows);
    const bounds = cells.get(cell) || { left: width, top: height, right: -1, bottom: -1, area: 0 };
    bounds.left = Math.min(bounds.left, minX); bounds.top = Math.min(bounds.top, minY);
    bounds.right = Math.max(bounds.right, maxX); bounds.bottom = Math.max(bounds.bottom, maxY);
    bounds.area += area;
    cells.set(cell, bounds);
  }
  return { cells, components };
}

function resolveInside(base, relative, label) {
  const absolute = path.resolve(base, relative);
  const rel = path.relative(base, absolute);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`${label} must stay inside ${base}: ${relative}`);
  }
  return absolute;
}

function defringeCrop(crop, mode) {
  const { data, info } = crop;
  const rgba = Buffer.from(data);
  for (let i = 0; i < rgba.length; i += 4) {
    if (mode === 'transparent') {
      if (rgba[i + 3] <= 20) rgba[i + 3] = 0;
      continue;
    }
    if (mode === 'magenta') {
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (r >= 180 && b >= 180 && g <= 150 && Math.abs(r - b) <= 100) {
        const alpha = Math.max(255 - r, g, 255 - b) / 255;
        if (alpha < 0.035) { rgba[i + 3] = 0; continue; }
        rgba[i] = Math.min(255, Math.round((r - 255 * (1 - alpha)) / alpha));
        rgba[i + 1] = Math.min(255, Math.round(g / alpha));
        rgba[i + 2] = Math.min(255, Math.round((b - 255 * (1 - alpha)) / alpha));
        rgba[i + 3] = Math.min(rgba[i + 3], Math.round(alpha * 255));
      } else if (isBackground(rgba, i, mode)) rgba[i + 3] = 0;
    } else if (isBackground(rgba, i, mode)) rgba[i + 3] = 0;
    else {
      // One-pixel unmatting for antialiased edges rendered over black.
      const alpha = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) / 255;
      if (alpha > 0.02 && alpha < 0.5) {
        rgba[i] = Math.min(255, Math.round(rgba[i] / alpha));
        rgba[i + 1] = Math.min(255, Math.round(rgba[i + 1] / alpha));
        rgba[i + 2] = Math.min(255, Math.round(rgba[i + 2] / alpha));
        rgba[i + 3] = Math.min(rgba[i + 3], Math.round(alpha * 255));
      }
    }
  }
  return { data: rgba, info };
}

async function makeContactSheet(buffers, items, outputPath) {
  const columns = Math.min(6, Math.max(1, buffers.length));
  const tileWidth = 240, tileHeight = 190, rows = Math.ceil(buffers.length / columns);
  const layers = [];
  for (let index = 0; index < buffers.length; index += 1) {
    const left = (index % columns) * tileWidth, top = Math.floor(index / columns) * tileHeight;
    const thumbnail = await sharp(buffers[index]).resize(208, 158, { fit: 'inside', kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const meta = await sharp(thumbnail).metadata();
    layers.push({ input: thumbnail, left: left + Math.floor((tileWidth - meta.width) / 2), top: top + Math.floor((tileHeight - meta.height) / 2) });
  }
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 4, background: { r: 35, g: 25, b: 21, alpha: 1 } } })
    .composite(layers).png().toFile(outputPath);
}

export async function sliceSheet(inputPath, manifestPath, backgroundOverride, { overwrite = false } = {}) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const mode = backgroundOverride || manifest.background;
  if (!['transparent', 'magenta', 'black'].includes(mode)) throw new Error(`Unknown background mode "${mode}"; use transparent, magenta, or black.`);
  const { expectedCount, columns, rows, items } = manifest;
  if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new Error('Manifest expectedCount must be a positive integer.');
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns * rows !== expectedCount) {
    throw new Error(`Manifest grid ${columns}x${rows} must have exactly expectedCount=${expectedCount}.`);
  }
  if (!Array.isArray(items) || items.length !== expectedCount) {
    throw new Error(`Manifest has ${items?.length ?? 0} output items, but expectedCount is ${expectedCount}.`);
  }
  for (const item of items) {
    if (!item.file || !Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width < 1 || item.height < 1) {
      throw new Error('Each item needs a relative file path and positive integer width/height.');
    }
  }

  const outputRoot = resolveInside(root, manifest.outputDir || 'public/assets/pixel', 'outputDir');
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const found = detectSpriteCells(data, info.width, info.height, mode, columns, rows);
  if (found.cells.size !== expectedCount) {
    const foundCells = [...found.cells.keys()].sort((a, b) => a - b).map((cell) => cell + 1);
    throw new Error(`Sprite count mismatch: expected ${expectedCount} non-background sprites, found ${found.cells.size} occupied cells (${found.components} connected components; cells ${foundCells.join(', ') || 'none'}).`);
  }

  const outputBuffers = [];
  for (let index = 0; index < expectedCount; index += 1) {
    const bounds = found.cells.get(index);
    if (!bounds) throw new Error(`Sprite count mismatch: no sprite in reading-order cell ${index + 1}.`);
    const item = items[index];
    const crop = await sharp(inputPath).extract({
      left: bounds.left, top: bounds.top,
      width: bounds.right - bounds.left + 1, height: bounds.bottom - bounds.top + 1,
    }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleaned = defringeCrop(crop, mode);
    const fitted = await sharp(cleaned.data, { raw: { width: crop.info.width, height: crop.info.height, channels: 4 } })
      .resize(Math.max(1, Math.round(item.width * 0.94)), Math.max(1, Math.round(item.height * 0.94)), { fit: 'inside', kernel: sharp.kernel.lanczos3 })
      .png().toBuffer();
    const metadata = await sharp(fitted).metadata();
    const targetPath = resolveInside(outputRoot, item.file, 'output file');
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    if (!overwrite) {
      try { await fs.access(targetPath); throw new Error(`Refusing to overwrite existing output ${item.file}; pass --overwrite to replace it.`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const image = await sharp(fitted).extend({
      top: Math.floor((item.height - metadata.height) / 2),
      bottom: Math.ceil((item.height - metadata.height) / 2),
      left: Math.floor((item.width - metadata.width) / 2),
      right: Math.ceil((item.width - metadata.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png({ compressionLevel: 9 }).toBuffer();
    await fs.writeFile(targetPath, image);
    outputBuffers.push(image);
    console.log(`${item.file} ${item.width}x${item.height}`);
  }

  if (manifest.contactSheet) {
    const previewPath = resolveInside(root, manifest.contactSheet, 'contactSheet');
    await fs.mkdir(path.dirname(previewPath), { recursive: true });
    await makeContactSheet(outputBuffers, items, previewPath);
    console.log(`Contact sheet: ${path.relative(root, previewPath)}`);
  }
  console.log(`Sliced ${expectedCount} sprites from ${path.basename(inputPath)} (${info.width}x${info.height}; ${found.components} connected components; ${mode} background).`);
  return { count: expectedCount, components: found.components, width: info.width, height: info.height, files: items.map((item) => item.file) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , inputPath, manifestPath, backgroundArg, overwriteArg] = process.argv;
  if (!inputPath || !manifestPath || inputPath === '--help') { console.log(help); process.exitCode = inputPath === '--help' ? 0 : 1; }
  else {
    const backgroundOverride=backgroundArg==='--overwrite'?undefined:backgroundArg;
    const overwrite=backgroundArg==='--overwrite'||overwriteArg==='--overwrite';
    sliceSheet(inputPath, manifestPath, backgroundOverride, {overwrite}).catch((error) => { console.error(`slice-sheet: ${error.message}`); process.exitCode = 1; });
  }
}
