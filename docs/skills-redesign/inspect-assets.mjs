// Read-only inventory: never writes to or changes asset files.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const assets = resolve(root, 'public/assets');
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const db = value => value > 0 ? Number((20 * Math.log10(value)).toFixed(2)) : null;
function wav(path) {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return { unsupported: true };
  let fmt, data;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const name = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (name === 'fmt ') fmt = { encoding: bytes.readUInt16LE(offset + 8), channels: bytes.readUInt16LE(offset + 10), sampleRate: bytes.readUInt32LE(offset + 12), blockAlign: bytes.readUInt16LE(offset + 20), bits: bytes.readUInt16LE(offset + 22) };
    if (name === 'data') data = bytes.subarray(offset + 8, Math.min(bytes.length, offset + 8 + size));
    offset += 8 + size + (size % 2);
  }
  if (!fmt || !data) return { invalid: true };
  let peak = 0, squares = 0, count = 0;
  const width = fmt.bits / 8;
  if (fmt.encoding === 1 && [8, 16, 24, 32].includes(fmt.bits)) {
    for (let i = 0; i + width <= data.length; i += width) {
      const sample = fmt.bits === 8 ? (data[i] - 128) / 128 : data.readIntLE(i, width) / 2 ** (fmt.bits - 1);
      peak = Math.max(peak, Math.abs(sample)); squares += sample * sample; count++;
    }
  }
  return { ...fmt, seconds: Number((data.length / fmt.blockAlign / fmt.sampleRate).toFixed(3)), peakDbFS: count ? db(peak) : null, rmsDbFS: count ? db(Math.sqrt(squares / count)) : null };
}
function png(path) {
  const bytes = readFileSync(path);
  return { name: relative(assets, path).replaceAll('\\', '/'), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
const audio = walk(resolve(assets, 'audio')).sort().map(path => ({ name: relative(resolve(assets, 'audio'), path).replaceAll('\\', '/'), format: path.split('.').at(-1), ...wav(path) }));
const icons = walk(resolve(assets, 'pixel')).filter(path => /[\\/]icon-\d+\.png$/.test(path)).map(png);
const frames = walk(resolve(assets, 'pixel/frames')).filter(path => /[\\/]fx-\d+-\d+\.png$/.test(path)).map(png);
console.log(JSON.stringify({ folders: readdirSync(assets, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name), audio, icons, frames }, null, 2));
