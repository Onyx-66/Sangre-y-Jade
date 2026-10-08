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

The manifest item order is reading order (left-to-right, top-to-bottom).
Optional spriteScale (positive number) and anchor: "bottom" preserve a shared
pixel scale and baseline for individually drawn flame/animation poses.`;

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
export function detectSpriteCells(rgba, width, height, mode, columns, rows, {collectLabels=false}={}) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const cells = new Map();
  const labels=collectLabels?new Int16Array(width*height).fill(-1):undefined;
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
    if(labels)for(let i=0;i<tail;i++)labels[queue[i]]=cell;
    const bounds = cells.get(cell) || { left: width, top: height, right: -1, bottom: -1, area: 0 };
    bounds.left = Math.min(bounds.left, minX); bounds.top = Math.min(bounds.top, minY);
    bounds.right = Math.max(bounds.right, maxX); bounds.bottom = Math.max(bounds.bottom, maxY);
    bounds.area += area;
    cells.set(cell, bounds);
  }
  return { cells, components, ...(labels?{labels}:{}) };
}

function resolveInside(base, relative, label) {
  const absolute = path.resolve(base, relative);
  const rel = path.relative(base, absolute);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`${label} must stay inside ${base}: ${relative}`);
  }
  return absolute;
}

function defringeCrop(crop, mode, { softMatte = false, keyFringe = 0 } = {}) {
  const { data, info } = crop;
  const rgba = Buffer.from(data);
  const keyed=mode==='magenta'?Array.from({length:info.width*info.height},(_,pixel)=>isBackground(data,pixel*4,mode)):null;
  for (let i = 0; i < rgba.length; i += 4) {
    if (mode === 'transparent') {
      if (rgba[i + 3] <= 20) rgba[i + 3] = 0;
      continue;
    }
    if (mode === 'magenta') {
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      const pixel=i/4,x=pixel%info.width,y=Math.floor(pixel/info.width);
      if (keyFringe && r>g+8 && b>g+8) {
        let touchesKey=false;
        for(let dy=-keyFringe;dy<=keyFringe&&!touchesKey;dy++)for(let dx=-keyFringe;dx<=keyFringe;dx++){
          const nx=x+dx,ny=y+dy;
          if(nx<0||ny<0||nx>=info.width||ny>=info.height||keyed[ny*info.width+nx]){touchesKey=true;break;}
        }
        if(touchesKey){rgba[i+3]=0;continue;}
      }
      const matteEdge=keyed&&(x===0||y===0||x===info.width-1||y===info.height-1||
        keyed[pixel-1]||keyed[pixel+1]||keyed[pixel-info.width]||keyed[pixel+info.width]);
      // A soft glow is composited over the key throughout, including its pale
      // core (which need not look magenta). Unmatte its entire coverage.
      if (softMatte || (r >= 180 && b >= 180 && g <= 150 && Math.abs(r - b) <= 100)||
          (matteEdge&&r>g+30&&b>g+30&&Math.abs(r-b)<60)) {
        const alpha = Math.max(255 - r, g, 255 - b) / 255;
        if (alpha < 0.035) { rgba[i + 3] = 0; continue; }
        rgba[i] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - alpha)) / alpha)));
        rgba[i + 1] = Math.min(255, Math.round(g / alpha));
        rgba[i + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - alpha)) / alpha)));
        rgba[i + 3] = Math.min(rgba[i + 3], Math.round(alpha * 255));
        if (softMatte) {
          // Generated soft halos can reach their detected crop boundary. A
          // short feather prevents a rectangular matte edge in the final glow.
          const edge=Math.min(x,y,info.width-1-x,info.height-1-y);
          const feather=Math.min(1,edge/Math.max(1,Math.min(info.width,info.height)*.06));
          rgba[i+3]=Math.round(rgba[i+3]*feather);
        }
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
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns * rows < expectedCount) {
    throw new Error(`Manifest grid ${columns}x${rows} must have capacity for expectedCount=${expectedCount}.`);
  }
  if (!Array.isArray(items) || items.length !== expectedCount) {
    throw new Error(`Manifest has ${items?.length ?? 0} output items, but expectedCount is ${expectedCount}.`);
  }
  for (const item of items) {
    if (!item.file || !Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width < 1 || item.height < 1) {
      throw new Error('Each item needs a relative file path and positive integer width/height.');
    }
    if (item.spriteScale !== undefined && (!Number.isFinite(item.spriteScale) || item.spriteScale <= 0)) {
      throw new Error(`spriteScale must be positive and finite for ${item.file}`);
    }
    if (item.anchor !== undefined && !['center', 'bottom'].includes(item.anchor)) {
      throw new Error(`Unknown anchor for ${item.file}; use center or bottom.`);
    }
  }

  const outputRoot = resolveInside(root, manifest.outputDir || 'public/assets/pixel', 'outputDir');
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const found = detectSpriteCells(data, info.width, info.height, mode, columns, rows, {collectLabels:Boolean(manifest.isolateCells)});
  if (found.cells.size !== expectedCount) {
    const foundCells = [...found.cells.keys()].sort((a, b) => a - b).map((cell) => cell + 1);
    throw new Error(`Sprite count mismatch: expected ${expectedCount} non-background sprites, found ${found.cells.size} occupied cells (${found.components} connected components; cells ${foundCells.join(', ') || 'none'}).`);
  }

  const outputBuffers = [];
  for (let index = 0; index < expectedCount; index += 1) {
    let bounds = found.cells.get(index);
    if (!bounds) throw new Error(`Sprite count mismatch: no sprite in reading-order cell ${index + 1}.`);
    const item = items[index];
    // Ground tiles use the interior square of their generated patch and fill the
    // final canvas. Ordinary sprites retain the existing trim/transparent margin.
    if (item.fullBleed) {
      const side = Math.floor(Math.min(bounds.right-bounds.left+1,bounds.bottom-bounds.top+1)*.93);
      const left = Math.round((bounds.left+bounds.right+1-side)/2), top = Math.round((bounds.top+bounds.bottom+1-side)/2);
      bounds = {left,top,right:left+side-1,bottom:top+side-1};
    }
    const crop = await sharp(inputPath).extract({
      left: bounds.left, top: bounds.top,
      width: bounds.right - bounds.left + 1, height: bounds.bottom - bounds.top + 1,
    }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // A subject may extend across its nominal cell border. Preserve its full
    // connected components, but never include fragments owned by another cell.
    if(found.labels)for(let y=0;y<crop.info.height;y++)for(let x=0;x<crop.info.width;x++){
      const label=found.labels[(bounds.top+y)*info.width+bounds.left+x];
      if(label!==index){const p=(y*crop.info.width+x)*4;
        crop.data[p]=mode==='black'?0:255;crop.data[p+1]=0;crop.data[p+2]=mode==='black'?0:255;crop.data[p+3]=mode==='transparent'?0:255;
      }
    }
    // Full-bleed swatches were cropped inside the patch: their purple fog or
    // flower colours are artwork, not a magenta surround to punch holes into.
    const cleaned = item.fullBleed ? crop : defringeCrop(crop, mode, {softMatte:Boolean(item.softMatte),keyFringe:Math.min(4,Math.max(0,Math.floor(item.keyFringe||0)))});
    const fitWidth=item.fullBleed?item.width:item.spriteScale?Math.max(1,Math.round(crop.info.width*item.spriteScale)):Math.max(1,Math.round(item.width*.94));
    const fitHeight=item.fullBleed?item.height:item.spriteScale?Math.max(1,Math.round(crop.info.height*item.spriteScale)):Math.max(1,Math.round(item.height*.94));
    if(fitWidth>item.width||fitHeight>item.height)throw new Error(`spriteScale exceeds final canvas for ${item.file}`);
    const fitted = await sharp(cleaned.data, { raw: { width: crop.info.width, height: crop.info.height, channels: 4 } })
      .resize(fitWidth,fitHeight, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
      .png().toBuffer();
    const metadata = await sharp(fitted).metadata();
    const targetPath = resolveInside(outputRoot, item.file, 'output file');
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    if (!overwrite) {
      try { await fs.access(targetPath); throw new Error(`Refusing to overwrite existing output ${item.file}; pass --overwrite to replace it.`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const bottom=item.anchor==='bottom'?Math.min(3,item.height-metadata.height):Math.ceil((item.height-metadata.height)/2);
    let image = await sharp(fitted).extend({
      top: item.height-metadata.height-bottom,
      bottom,
      left: Math.floor((item.width - metadata.width) / 2),
      right: Math.ceil((item.width - metadata.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png({ compressionLevel: 9 }).toBuffer();
    if (mode === 'magenta') {
      // Lanczos can reintroduce a handful of saturated matte pixels at a keyed
      // boundary; remove only unmistakable key colour after the final resize.
      const raw = await sharp(image).ensureAlpha().raw().toBuffer();
      for(let p=0;p<raw.length;p+=4)if(raw[p]>=210&&raw[p+2]>=210&&raw[p+1]<=45)raw[p+3]=0;
      image=await sharp(raw,{raw:{width:item.width,height:item.height,channels:4}}).png({compressionLevel:9}).toBuffer();
    }
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
