import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { sliceSheet } from './slice-sheet.mjs';

const base = 'docs/v0.6/sources/v15';
const design = JSON.parse(await fs.readFile('docs/v0.6/v06_design.json', 'utf8'));
const sizes = {
  trees: [[288,288],[288,288],[256,288],[224,256],[512,512],[320,384],[288,320],[256,288],[320,384],[192,224]],
  plants: [[144,128],[160,128],[144,128],[192,160],[128,112],[128,144],[128,112],[128,112],[160,144],[160,192]],
  rocks: [[256,224],[128,112],[192,128],[224,160],[256,128],[160,256]],
  debris: [[160,96],[96,96],[80,80],[96,80],[96,80],[64,64]],
  buildings: [[768,768],[384,256],[320,320],[320,320],[384,320],[448,384],[320,256],[320,288],[256,256],[288,320],[320,288]],
  props: [[80,96],[96,144],[96,96],[96,128],[112,112],[160,160],[64,160],[160,96],[160,128],[96,128]],
};
export const catalog = Object.entries(design.assets.map_art.overgrown).flatMap(([category, list]) => list.map((item, i) => {
  const [width,height] = category === 'ground' ? [256,256] : sizes[category][i];
  return { ...item, category, file: `maps/overgrown/${category}/${item.id}.png`, width, height, ...(category === 'ground' ? { fullBleed: true } : {keyFringe:4}) };
})).concat(design.assets.weather.map(item => ({ ...item, category: 'weather', file: `weather/${item.id}.png`,
  width: /^(red-fog|cave-fog)$/.test(item.id) ? 512 : 128, height: /^(red-fog|cave-fog)$/.test(item.id) ? 512 : 128,
  ...(/^(red-fog|cave-fog)$/.test(item.id)?{fullBleed:true}:
    /^(mist-wisp|god-ray|spore|rain-streak|rain-splash|drip|lightning-flash)$/.test(item.id)?{softMatte:true}:{keyFringe:4}) })));
const sheets = [catalog.slice(0,16),catalog.slice(16,32),catalog.slice(32,48),catalog.slice(48,59),catalog.slice(59),catalog.slice(0,6)];
await fs.mkdir(base, { recursive: true });

async function contact(items, output, tiled = false) {
  const cell=256, columns=tiled?3:4, layers=[];
  for (let i=0;i<items.length;i++) {
    const item=items[i], input=await sharp(`public/assets/pixel/${item.file}`).resize(cell,cell,{fit:'contain',background:'#18362b'}).png().toBuffer();
    layers.push({input,left:(i%columns)*cell,top:Math.floor(i/columns)*cell});
  }
  await sharp({create:{width:columns*cell,height:Math.ceil(items.length/columns)*cell,channels:4,background:'#18362b'}}).composite(layers).png().toFile(output);
}

// Periodic texture conditioning only: opposite edges share the same colour and
// the correction tapers across 12px. This preserves each generated tile's art.
async function periodic(file) {
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info, band=12;
  for(let y=0;y<h;y++)for(let c=0;c<4;c++){
    const delta=(data[(y*w)*4+c]-data[(y*w+w-1)*4+c])/2;
    for(let x=0;x<band;x++){const t=1-x/(band-1);data[(y*w+x)*4+c]=Math.max(0,Math.min(255,data[(y*w+x)*4+c]-delta*t));data[(y*w+w-1-x)*4+c]=Math.max(0,Math.min(255,data[(y*w+w-1-x)*4+c]+delta*t));}
    data[(y*w+w-1)*4+c]=data[(y*w)*4+c];
  }
  for(let x=0;x<w;x++)for(let c=0;c<4;c++){
    const delta=(data[x*4+c]-data[((h-1)*w+x)*4+c])/2;
    for(let y=0;y<band;y++){const t=1-y/(band-1);data[(y*w+x)*4+c]=Math.max(0,Math.min(255,data[(y*w+x)*4+c]-delta*t));data[((h-1-y)*w+x)*4+c]=Math.max(0,Math.min(255,data[((h-1-y)*w+x)*4+c]+delta*t));}
    data[((h-1)*w+x)*4+c]=data[x*4+c];
  }
  await fs.writeFile(file,await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer());
}

const [command,arg,source]=process.argv.slice(2);
if(command==='sheet'){
  const number=Number(arg), items=sheets[number-1];
  if(!items)throw new Error('Sheet number must be 1..6 (6 is the low-contrast ground repair)');
  const native=`${base}/sheet-${number}-native.png`, normalized=`.tools/v15/sheet-${number}.png`, manifest=`${base}/sheet-${number}.json`;
  await fs.mkdir('.tools/v15',{recursive:true}); await fs.mkdir('docs/v0.6/previews/v15',{recursive:true});
  if(path.resolve(source)!==path.resolve(native))await fs.copyFile(source,native);
  const scaled=await sharp(source).resize(2048,2048,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
  // Clear only empty cell gutters: some generations draw unwanted grid rules.
  // Six pixels at each grid boundary are well outside every inspected subject.
  for(let y=0;y<2048;y++)for(let x=0;x<2048;x++)if(x%512<6||x%512>505||y%512<6||y%512>505){
    const p=(y*2048+x)*4;scaled[p]=255;scaled[p+1]=0;scaled[p+2]=255;scaled[p+3]=255;
  }
  await sharp(scaled,{raw:{width:2048,height:2048,channels:4}}).png().toFile(normalized);
  await fs.writeFile(manifest,JSON.stringify({expectedCount:items.length,columns:4,rows:4,background:'magenta',outputDir:'public/assets/pixel',contactSheet:`docs/v0.6/previews/v15/sheet-${number}-contact.png`,items},null,2)+'\n');
  await sliceSheet(normalized,manifest,undefined,{overwrite:true});
  for(const item of items.filter(item=>item.fullBleed||/^(red-fog|cave-fog)$/.test(item.id)))await periodic(`public/assets/pixel/${item.file}`);
} else if(command==='kit'){
  const kit=JSON.parse(await fs.readFile('src/data/mapKits/overgrown.json','utf8'));
  kit.artVersion='v15'; kit.ground=catalog.filter(x=>x.category==='ground').map(x=>({id:x.id,image:x.file,size:{width:x.width,height:x.height},textureKey:`map-overgrown-${x.id}`}));
  kit.boundaryTreeIds=['tree-broadleaf-a','tree-broadleaf-b','tree-fig'];
  for(const item of kit.items){
    const art=catalog.find(x=>x.id===item.id); const w=art.width,h=art.height;
    item.image=art.file; item.textureKey=`map-overgrown-${item.id}`;
    item.size={width:w,height:h,minScale:0.85,maxScale:1.12};
    item.anchor={x:.5,y:item.category==='trees'?.94:.9};
    item.depthOffset=2; item.fadeBehind=['trees','buildings'].includes(item.category);
    item.breakable=/^(pot-clay|barrel-wood|crate-wood)/.test(item.id);
    item.lightSource=item.id==='torch-post'; item.lightEnabled=false; // The supplied torch is explicitly unlit.
    if(item.category==='trees')item.collider={type:'circle',radius:Math.round(w*(item.id==='tree-ceiba'?.13:.085)),offsetX:0,offsetY:0};
    else if(item.category==='buildings')item.collider={type:'rect',width:Math.round(w*.72),height:Math.round(h*(item.id==='temple-central'?.60:.28)),offsetX:0,offsetY:-Math.round(h*(item.id==='temple-central'?.32:.16))};
    else if(item.category==='rocks')item.collider={type:'circle',radius:Math.round(Math.min(w,h)*.28),offsetX:0,offsetY:-Math.round(h*.20)};
    else if(item.breakable||['well-stone','cart-wooden','sign-carved'].includes(item.id))item.collider={type:'circle',radius:Math.round(w*.24),offsetX:0,offsetY:-Math.round(h*.15)};
    else item.collider={type:'none',radius:0,width:0,height:0,offsetX:0,offsetY:0};
  }
  await fs.writeFile('src/data/mapKits/overgrown.json',JSON.stringify(kit,null,2)+'\n');
} else if(command==='previews'){
  for(const category of [...new Set(catalog.map(x=>x.category))]){
    if(arg&&category!==arg)continue;
    const items=catalog.filter(x=>x.category===category);
    await contact(items,`docs/v0.6/previews/v15/${category}-contact.png`);
    if(category==='ground')for(const item of items)await contact(Array(9).fill(item),`docs/v0.6/previews/v15/tile-${item.id}-3x3.png`,true);
  }
} else if(command==='log'){
  const lines=catalog.map(item=>`| public/assets/pixel/${item.file} | Built-in image tool; requested gpt-image-2.5 Flare (routing unexposed) | 2026-10-05 | ${item.description}; overhead Maya jungle pixel art, sheet cell, no text |`);
  await fs.appendFile('docs/v0.6/ASSET_LOG.md',`\n## V15 — Overgrown map and weather artwork\n\nSource sheets and slice manifests: docs/v0.6/sources/v15. Requested model/variant cannot be verified by the tool. Generated natively, normalized to 2048px, sliced with slice-sheet.mjs; seamless tile edges conditioned with a 12px periodic blend. Each cell is a distinct generated image.\n\n| File | Model/tool | Date | Prompt brief |\n|---|---|---|---|\n${lines.join('\n')}\n`);
} else if(command!=='catalog') console.log('Usage: node scripts/prepare-overgrown-art.mjs sheet <1..5> <source> | kit | previews | log');
