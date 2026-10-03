#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const cwd = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const iconRoot = path.resolve(cwd, option('--dir', 'public/assets/pixel/skills'));
const output = path.resolve(cwd, option('--contact', 'docs/skills-redesign/previews/step13/all-icons.png'));
const threshold = Number(option('--threshold', '5'));

async function pngFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await pngFiles(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) files.push(full);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

// pHash on the central 70% of each icon: the shared ornate frame is not the subject.
async function perceptualHash(file) {
  const metadata = await sharp(file).metadata();
  const side = Math.min(metadata.width, metadata.height);
  const cropSize = Math.max(1, Math.floor(side * 0.7));
  const left = Math.floor((metadata.width - cropSize) / 2);
  const top = Math.floor((metadata.height - cropSize) / 2);
  const { data } = await sharp(file)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(48, 48, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  const size = 48, low = 8;
  const cos = Array.from({ length: low }, (_, frequency) =>
    Float64Array.from({ length: size }, (_, sample) => Math.cos(((2 * sample + 1) * frequency * Math.PI) / (2 * size))));
  const horizontal = Array.from({ length: size }, () => new Float64Array(low));
  for (let y = 0; y < size; y += 1) {
    for (let u = 0; u < low; u += 1) {
      let sum = 0;
      for (let x = 0; x < size; x += 1) sum += data[y * size + x] * cos[u][x];
      horizontal[y][u] = sum;
    }
  }
  const coefficients = [];
  for (let v = 0; v < low; v += 1) {
    for (let u = 0; u < low; u += 1) {
      if (u === 0 && v === 0) continue;
      let sum = 0;
      for (let y = 0; y < size; y += 1) sum += horizontal[y][u] * cos[v][y];
      coefficients.push(sum);
    }
  }
  const sorted = [...coefficients].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return coefficients.map((value) => value >= median ? 1 : 0);
}

const hamming = (left, right) => left.reduce((sum, bit, index) => sum + (bit !== right[index] ? 1 : 0), 0);
const xml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function writeContact(files) {
  const columns = 8, tileWidth = 128, tileHeight = 112;
  const rows = Math.ceil(files.length / columns);
  const layers = [];
  for (let index = 0; index < files.length; index += 1) {
    const x = (index % columns) * tileWidth;
    const y = Math.floor(index / columns) * tileHeight;
    const icon = await sharp(files[index]).resize(92, 92, { fit: 'inside', kernel: sharp.kernel.lanczos3 }).png().toBuffer();
    const meta = await sharp(icon).metadata();
    layers.push({ input: icon, left: x + Math.floor((tileWidth - meta.width) / 2), top: y });
    const name = path.relative(iconRoot, files[index]).replaceAll('\\', '/').replace(/\.png$/i, '');
    const label = Buffer.from(`<svg width="${tileWidth}" height="20"><text x="4" y="14" font-family="Arial,sans-serif" font-size="9" fill="#f4dfac">${xml(name.slice(0, 22))}</text></svg>`);
    layers.push({ input: label, left: x, top: y + 92 });
  }
  await fs.mkdir(path.dirname(output), { recursive: true });
  await sharp({ create: { width: columns * tileWidth, height: rows * tileHeight, channels: 4, background: { r: 29, g: 22, b: 21, alpha: 1 } } })
    .composite(layers).png().toFile(output);
}

try {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 63) throw new Error('--threshold must be an integer from 0 to 63.');
  const files = await pngFiles(iconRoot);
  if (!files.length) throw new Error(`No PNG icons found in ${iconRoot}.`);
  const hashes = await Promise.all(files.map(async (file) => ({ file, hash: await perceptualHash(file) })));
  const pairs = [];
  for (let left = 0; left < hashes.length; left += 1) {
    for (let right = left + 1; right < hashes.length; right += 1) {
      const distance = hamming(hashes[left].hash, hashes[right].hash);
      if (distance <= threshold) pairs.push({ left: hashes[left].file, right: hashes[right].file, distance });
    }
  }
  await writeContact(files);
  console.log(`Compared ${files.length} icons at 48px using central-crop pHash (threshold ${threshold}/63).`);
  console.log(`Contact sheet: ${path.relative(cwd, output)}`);
  if (pairs.length) {
    for (const pair of pairs) console.error(`SIMILAR (${pair.distance}/63): ${path.relative(iconRoot, pair.left)} <> ${path.relative(iconRoot, pair.right)}`);
    process.exitCode = 1;
  } else console.log('No icon pairs flagged as too alike.');
} catch (error) {
  console.error(`check-icon-similarity: ${error.message}`);
  process.exitCode = 1;
}
