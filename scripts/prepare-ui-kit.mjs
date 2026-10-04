#!/usr/bin/env node
// Offline asset preparation only. No game screen imports this file or the kit.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { detectSpriteCells, sliceSheet } from './slice-sheet.mjs';

export const KIT_ITEMS = [
  ['panel-large',256], ['panel-small',192], ['modal-frame',256],
  ['card-normal',256], ['card-selected',256], ['card-locked',256],
  ['banner-title',512], ['divider-ornament',320],
  ['button-primary',256], ['button-primary-pressed',256], ['button-primary-disabled',256],
  ['button-secondary',256], ['button-secondary-pressed',256], ['button-secondary-disabled',256],
  ['button-danger',256], ['button-small',160], ['button-round',96],
  ['toggle-track-off',128], ['toggle-track-on',128], ['toggle-knob',64],
  ['slider-track',256], ['slider-fill',256], ['slider-knob',64], ['select-frame',256],
  ['tab-active',192], ['tab-inactive',192], ['scroll-track',32], ['scroll-thumb',32],
  ['chip-frame',192], ['hud-bar-frame',384], ['hud-circle-frame',128],
  ['loading-bar-frame',640], ['loading-bar-fill',640], ['vine-corner-tl',160],
  ['torch-0',96], ['torch-1',96], ['torch-2',96], ['torch-3',96],
].map(([id,maxSize]) => ({id,maxSize}));
export const STATE_FAMILIES = [
  ['card-normal','card-selected','card-locked'],
  ['button-primary','button-primary-pressed','button-primary-disabled'],
  ['button-secondary','button-secondary-pressed','button-secondary-disabled'],
  ['toggle-track-off','toggle-track-on'], ['tab-active','tab-inactive'],
];
const sprites = new Set(['divider-ornament','button-round','toggle-knob','slider-knob',
  'hud-circle-frame','vine-corner-tl','torch-0','torch-1','torch-2','torch-3']);
const square = new Set(['panel-large','panel-small','modal-frame','card-normal','card-selected',
  'card-locked','button-small','button-round','toggle-knob','slider-knob','hud-circle-frame','vine-corner-tl']);
const output = 'docs/v0.6/previews/ui-kit';

export function finalSize({id,maxSize}, bounds, normalSizes) {
  // Keep the drawn wide/vertical aspect ratio. Squares and state families have
  // one explicit shared canvas; never stretch a wide sprite into a square.
  const family = STATE_FAMILIES.find(group => group.includes(id));
  if (family && family[0] !== id) return normalSizes.get(family[0]);
  if (square.has(id)) return {width:maxSize,height:maxSize};
  const width=bounds.right-bounds.left+1,height=bounds.bottom-bounds.top+1;
  const ratio=maxSize/Math.max(width,height);
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}

export function sliceInsets(id,{width,height}) {
  if (sprites.has(id)) return undefined;
  if (width===height) return {top:Math.round(height*.25),right:Math.round(width*.25),bottom:Math.round(height*.25),left:Math.round(width*.25)};
  if (height>width) return {top:Math.round(height*.22),right:Math.max(1,Math.floor(width*.3)),bottom:Math.round(height*.22),left:Math.max(1,Math.floor(width*.3))};
  const edge=Math.max(2,Math.round(height*.25));
  const end=Math.min(Math.floor(width*.31),Math.round(height*(id==='banner-title'?1.35:.65)));
  return {top:edge,right:id==='select-frame'?Math.min(Math.floor(width*.4),end+32):end,bottom:edge,left:end};
}

/** Canonical cutout geometry, not shared artwork: every state keeps its own RGB.
 * This prevents model subpixel border variations from causing a button to jump.
 * RGB is reprojected within the foreground bounds, so no normal-state
 * pixels are copied into a pressed/disabled image. */
export function alignStateAlpha(normal, state, width, height) {
  const out=Buffer.alloc(state.length);
  const box=data=>{const b={left:width,top:height,right:-1,bottom:-1};for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>8){b.left=Math.min(b.left,x);b.top=Math.min(b.top,y);b.right=Math.max(b.right,x);b.bottom=Math.max(b.bottom,y);}return b;};
  const a=box(normal),b=box(state);if(b.right<0)throw new Error('Empty state image');
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const dest=(y*width+x)*4,alpha=normal[dest+3];if(!alpha)continue;
      const sx=Math.round(b.left+(x-a.left)/Math.max(1,a.right-a.left)*(b.right-b.left));
      const sy=Math.round(b.top+(y-a.top)/Math.max(1,a.bottom-a.top)*(b.bottom-b.top));
      let src=(Math.max(0,Math.min(height-1,sy))*width+Math.max(0,Math.min(width-1,sx)))*4;
      if(state[src+3]<=8){let found=false;for(let d=1;d<Math.max(width,height)&&!found;d++)for(let dy=-d;dy<=d&&!found;dy++)for(let dx=-d;dx<=d;dx++){
        if(Math.abs(dx)!==d&&Math.abs(dy)!==d)continue;const nx=sx+dx,ny=sy+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const candidate=(ny*width+nx)*4;if(state[candidate+3]>8){src=candidate;found=true;break;}
      }}
      out[dest]=state[src];out[dest+1]=state[src+1];out[dest+2]=state[src+2];out[dest+3]=alpha;
    }
  }
  return out;
}

// The kit's specified palette contains no purple. Remove residual keyed matte
// pixels after resampling as well as before state-alpha alignment. This is
// isolated to this UI pipeline; violet skill FX are not changed.
export function removePinkMatte(data) {
  const cleaned=Buffer.from(data);
  for(let i=0;i<cleaned.length;i+=4)if(cleaned[i]>cleaned[i+1]+30&&cleaned[i+2]>cleaned[i+1]+30){cleaned[i]=cleaned[i+1]=cleaned[i+2]=cleaned[i+3]=0;}
  return cleaned;
}

// Align the visible stand baseline after keying/resampling, which may remove
// one almost-transparent bottom row differently in different flame poses.
export function alignBottom(data,width,height) {
  let bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>20)bottom=y;
  if(bottom<0)throw new Error('Empty bottom-anchored sprite');
  const offset=height-4-bottom,out=Buffer.alloc(data.length);
  for(let y=0;y<height;y++){
    const dest=y+offset;if(dest<0||dest>=height)continue;
    data.copy(out,dest*width*4,y*width*4,(y+1)*width*4);
  }
  return out;
}

async function contactSheet(entries,destination='docs/v0.6/previews/ui-kit.png') {
  const columns=5,tileWidth=240,tileHeight=212,layers=[];
  for(let i=0;i<entries.length;i++){
    const entry=entries[i],left=i%columns*tileWidth,top=Math.floor(i/columns)*tileHeight;
    const buffer=await sharp(`public/${entry.path}`).resize(216,166,{fit:'inside',kernel:'nearest'}).png().toBuffer();
    const meta=await sharp(buffer).metadata();
    layers.push({input:buffer,left:left+Math.floor((tileWidth-meta.width)/2),top:top+Math.floor((180-meta.height)/2)});
    const label=Buffer.from(`<svg width="240" height="32"><text x="120" y="14" text-anchor="middle" font-family="Arial" font-size="12" fill="#fff0c4">${entry.id}</text><text x="120" y="29" text-anchor="middle" font-family="Arial" font-size="11" fill="#dbc79d">${entry.size.width} × ${entry.size.height}</text></svg>`);
    layers.push({input:label,left,top:top+180});
  }
  await sharp({create:{width:columns*tileWidth,height:Math.ceil(entries.length/columns)*tileHeight,channels:4,background:'#231820'}}).composite(layers).png().toFile(destination);
}

async function prepare() {
  const overwrite=process.argv.includes('--overwrite');
  // Refuse accidental replacement of existing art unless explicitly requested.
  for(const {id} of KIT_ITEMS){try{await fs.access(`public/assets/ui/kit/${id}.png`);if(!overwrite)throw new Error(`Existing kit asset ${id}; pass --overwrite only for a reviewed regeneration.`);}catch(e){if(e.code!=='ENOENT')throw e;}}
  await fs.mkdir(output,{recursive:true});
  const sizes=new Map(), entries=[],manifestFiles=[];
  const groups=[{key:'sheet1-retry',items:KIT_ITEMS.slice(0,16)}, {key:'sheet2',items:KIT_ITEMS.slice(16,32)}, {key:'sheet3',items:KIT_ITEMS.slice(32)}];
  for(const [index,group]of groups.entries()){
    const sheet=await sharp(`art-source/v0.6/ui-kit/${group.key}.png`).resize(2048,2048,{kernel:'nearest'}).png().toBuffer();
    const sheetPath=`${output}/sheet-${index+1}-2048.png`;await fs.writeFile(sheetPath,sheet);
    const {data,info}=await sharp(sheet).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const found=detectSpriteCells(data,info.width,info.height,'magenta',4,4);
    if(found.cells.size!==group.items.length)throw new Error(`${group.key}: expected ${group.items.length} sprites, found ${found.cells.size}`);
    const torchBounds=group.key==='sheet3'?[2,3,4,5].map(i=>found.cells.get(i)):[];
    const torchScale=torchBounds.length?90/Math.max(...torchBounds.map(b=>b.bottom-b.top+1)):0;
    const torchWidth=torchBounds.length?Math.ceil(Math.max(...torchBounds.map(b=>b.right-b.left+1))*torchScale)+6:0;
    const items=group.items.map((item,i)=>{const bounds=found.cells.get(i);if(!bounds)throw new Error(`Missing cell ${i+1}`);const torch=item.id.startsWith('torch-');const size=torch?{width:torchWidth,height:96}:finalSize(item,bounds,sizes);sizes.set(item.id,size);return {file:`kit/${item.id}.png`,...size,...(torch?{spriteScale:torchScale,anchor:'bottom'}:{})};});
    const manifest={expectedCount:items.length,columns:4,rows:4,background:'magenta',outputDir:'public/assets/ui',contactSheet:`${output}/sheet-${index+1}-contact.png`,items};
    const manifestPath=`${output}/sheet-${index+1}.json`;await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');manifestFiles.push(manifestPath);
    await sliceSheet(sheetPath,manifestPath,'magenta',{overwrite});
  }
  for(const item of KIT_ITEMS){
    const file=`public/assets/ui/kit/${item.id}.png`,size=sizes.get(item.id);
    const data=await sharp(file).ensureAlpha().raw().toBuffer();
    let cleaned=removePinkMatte(data);
    if(item.id.startsWith('torch-'))cleaned=alignBottom(cleaned,size.width,size.height);
    await sharp(cleaned,{raw:{...size,channels:4}}).png().toFile(file);
  }
  for(const family of STATE_FAMILIES){
    const size=sizes.get(family[0]),normal=await sharp(`public/assets/ui/kit/${family[0]}.png`).ensureAlpha().raw().toBuffer();
    for(const id of family.slice(1)){
      const file=`public/assets/ui/kit/${id}.png`,state=await sharp(file).ensureAlpha().raw().toBuffer();
      const aligned=alignStateAlpha(normal,state,size.width,size.height);
      await sharp(aligned,{raw:{...size,channels:4}}).png().toFile(file);
    }
  }
  for(const item of KIT_ITEMS){
    const size=sizes.get(item.id),insets=sliceInsets(item.id,size);
    entries.push({...item,path:`assets/ui/kit/${item.id}.png`,type:insets?'nine-slice':'sprite',size,...(insets?{sliceInsets:insets}:{}),
      ...(STATE_FAMILIES.find(f=>f.includes(item.id))?{stateFamily:STATE_FAMILIES.find(f=>f.includes(item.id))[0]}:{})});
  }
  await fs.mkdir('public/assets/ui/bg',{recursive:true});
  for(const [key,id]of [['bg-hero','bg-hero-select'],['bg-map','bg-map-select'],['bg-subpage','bg-subpage']]){
    const file=`public/assets/ui/bg/${id}.webp`;
    try{await fs.access(file);if(!overwrite)throw new Error(`Existing background ${id}; refusing overwrite`);}catch(e){if(e.code!=='ENOENT')throw e;}
    await sharp(`art-source/v0.6/ui-kit/${key}.png`).resize(1920,1080,{fit:'cover',kernel:'lanczos3'}).webp({quality:90}).toFile(file);
    entries.push({id,path:`assets/ui/bg/${id}.webp`,type:'background',maxSize:1920,size:{width:1920,height:1080}});
  }
  const kit={version:'0.6.0',units:'px',items:entries};
  await fs.writeFile('src/data/uiKit.json',JSON.stringify(kit,null,2)+'\n');
  await contactSheet(entries);
  // Replace the intermediate slicer previews with the actual final keyed,
  // geometry-normalized PNGs; never leave stale fringe in review evidence.
  await contactSheet(entries.slice(0,16),`${output}/sheet-1-contact.png`);
  await contactSheet(entries.slice(16,32),`${output}/sheet-2-contact.png`);
  await contactSheet(entries.slice(32,38),`${output}/sheet-3-contact.png`);
  const hashes=await Promise.all(entries.map(async entry=>({id:entry.id,sha256:crypto.createHash('sha256').update(await fs.readFile(`public/${entry.path}`)).digest('hex')})));
  if(new Set(hashes.map(h=>h.sha256)).size!==entries.length)throw new Error('Duplicate final artwork');
  await fs.writeFile(`${output}/preparation.json`,JSON.stringify({entries:entries.length,manifestFiles,hashes,sourceCanvasNote:'Tool supplied 1254x1254 sheets, normalized to 2048x2048 by nearest-neighbor before slicing; native originals retained.'},null,2)+'\n');
  console.log(`Prepared ${entries.length} unique UI assets; ${entries.filter(e=>e.sliceInsets).length} nine-slice sources.`);
}
if(process.argv[1]&&path.basename(process.argv[1])==='prepare-ui-kit.mjs')prepare().catch(error=>{console.error(error);process.exitCode=1;});
