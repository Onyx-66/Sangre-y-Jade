import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { sliceSheet } from './slice-sheet.mjs';

const base='docs/v0.6/sources/v15c', preview='docs/v0.6/previews/v15c';
const design=JSON.parse(await fs.readFile('docs/v0.6/v06_design.json','utf8'));
const sizes={
  trees:[[256,320],[512,512],[256,192],[288,320],[288,320],[224,192],[224,288],[192,256]],
  plants:[[128,96],[128,128],[128,160],[160,128],[128,128],[128,128],[128,128],[160,96]],
  rocks:[[128,256],[192,224],[160,192],[192,160],[160,160],[160,128],[256,224],[192,128]],
  debris:[[160,96],[128,80],[96,80],[96,96],[128,64],[96,80]],
  buildings:[[768,768],[384,320],[384,384],[320,320],[448,256],[384,256],[512,448],[384,320],[320,288],[320,384]],
  props:[[160,96],[80,144],[80,160],[96,128],[160,144],[96,96],[96,144],[96,128],[160,144],[128,96]],
};
export const catalog=Object.entries(design.assets.map_art.cenote).flatMap(([category,list])=>list.map((item,i)=>{
  const [width,height]=category==='ground'?[256,256]:sizes[category][i];
  return {...item,category,file:`maps/cenote/${category}/${item.id}.png`,width,height,...(category==='ground'?{fullBleed:true}:{keyFringe:3})};
})).concat(['cyan','violet','green'].map(color=>({id:`glow-${color}`,description:`soft additive ${color} light halo`,category:'glows',file:`maps/cenote/glow-${color}.png`,width:256,height:256})));

async function periodic(file){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info,band=12;
  for(let y=0;y<h;y++)for(let c=0;c<4;c++){
    const delta=(data[y*w*4+c]-data[(y*w+w-1)*4+c])/2;
    for(let x=0;x<band;x++){const t=1-x/(band-1);for(const [index,sign]of [[(y*w+x)*4+c,-1],[(y*w+w-1-x)*4+c,1]])data[index]=Math.max(0,Math.min(255,data[index]+sign*delta*t));}
    data[(y*w+w-1)*4+c]=data[y*w*4+c];
  }
  for(let x=0;x<w;x++)for(let c=0;c<4;c++){
    const delta=(data[x*4+c]-data[((h-1)*w+x)*4+c])/2;
    for(let y=0;y<band;y++){const t=1-y/(band-1);for(const [index,sign]of [[(y*w+x)*4+c,-1],[((h-1-y)*w+x)*4+c,1]])data[index]=Math.max(0,Math.min(255,data[index]+sign*delta*t));}
    data[((h-1)*w+x)*4+c]=data[x*4+c];
  }
  await fs.writeFile(file,await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer());
}
async function contact(items,file,columns=4){
  const layers=[];
  for(let i=0;i<items.length;i++)layers.push({input:await sharp(`public/assets/pixel/${items[i].file}`).resize(256,256,{fit:'contain',background:'#101d2b'}).png().toBuffer(),left:i%columns*256,top:Math.floor(i/columns)*256});
  await sharp({create:{width:columns*256,height:Math.ceil(items.length/columns)*256,channels:4,background:'#101d2b'}}).composite(layers).png().toFile(file);
}
const [command,arg,source]=process.argv.slice(2);
if(command==='sheet'){
  const n=Number(arg),items=n===6?catalog.slice(0,6):n===5?catalog.slice(56):catalog.slice((n-1)*16,Math.min(n*16,56));
  if(!items.length||n<1||n>6)throw new Error('Expected sheet 1..6 (5 = glows; 6 = quieter ground repair)');
  await fs.mkdir(base,{recursive:true});await fs.mkdir(preview,{recursive:true});await fs.mkdir('.tools/v15c',{recursive:true});
  const native=`${base}/sheet-${n}-native.png`,normalized=`.tools/v15c/sheet-${n}.png`,manifest=`${base}/sheet-${n}.json`;
  if(path.resolve(source)!==path.resolve(native))await fs.copyFile(source,native);
  const scaled=await sharp(source).resize(2048,2048,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
  // Sheet 2 contains thin unwanted white grid rules; other sheets have none.
  if(n===2)for(let y=0;y<2048;y++)for(let x=0;x<2048;x++)if(x%512<5||x%512>506||y%512<5||y%512>506){const p=(y*2048+x)*4;scaled[p]=255;scaled[p+1]=0;scaled[p+2]=255;scaled[p+3]=255;}
  await sharp(scaled,{raw:{width:2048,height:2048,channels:4}}).png().toFile(normalized);
  await fs.writeFile(manifest,JSON.stringify({expectedCount:items.length,columns:4,rows:4,isolateCells:true,background:n===5?'transparent':'magenta',outputDir:'public/assets/pixel',contactSheet:`${preview}/sheet-${n}-contact.png`,items},null,2)+'\n');
  await sliceSheet(normalized,manifest,undefined,{overwrite:true});
  for(const item of items.filter(x=>x.fullBleed))await periodic(`public/assets/pixel/${item.file}`);
}else if(command==='kit'){
  const kit=JSON.parse(await fs.readFile('src/data/mapKits/cenote.json','utf8'));
  kit.artVersion='v15c';
  for(const category of ['ground','glows'])kit[category]=catalog.filter(x=>x.category===category).map(x=>({id:x.id,image:x.file,size:{width:x.width,height:x.height},textureKey:`map-cenote-${x.id}`}));
  kit.boundaryTreeIds=['stalagmite-a','stalagmite-b','root-hanging-a'];
  for(const item of kit.items){
    const art=catalog.find(x=>x.id===item.id),w=art.width,h=art.height;
    item.image=art.file;item.textureKey=`map-cenote-${item.id}`;item.size={width:w,height:h,minScale:.85,maxScale:1.12};
    item.anchor={x:.5,y:.92};item.depthOffset=2;item.fadeBehind=['trees','buildings'].includes(item.category);
    item.breakable=/^(barrel-wet|pot-wet)$/.test(item.id);
    item.lightSource=/^crystal-|^lantern-hanging$/.test(item.id);item.lightEnabled=item.lightSource;
    if(item.lightSource){item.lightColor=item.id==='crystal-violet'?'violet':item.id==='crystal-green'?'green':'cyan';item.lightOffsetY=-Math.round(h*.45);}
    if(item.category==='trees')item.collider={type:'circle',radius:Math.round(w*.10),offsetX:item.id==='root-giant'?-Math.round(w*.30):0,offsetY:0};
    else if(item.category==='buildings')item.collider={type:'rect',width:Math.round(w*.70),height:Math.round(h*.26),offsetX:0,offsetY:-Math.round(h*.14)};
    else if(item.category==='rocks')item.collider={type:'circle',radius:Math.round(Math.min(w,h)*.28),offsetX:0,offsetY:-Math.round(h*.20)};
    else if(item.breakable||/^(chest-old|boat-small|totem-water|sign-rune)$/.test(item.id))item.collider={type:'circle',radius:Math.round(w*.24),offsetX:0,offsetY:-Math.round(h*.15)};
    else item.collider={type:'none',radius:0,width:0,height:0,offsetX:0,offsetY:0};
  }
  await fs.writeFile('src/data/mapKits/cenote.json',JSON.stringify(kit,null,2)+'\n');
}else if(command==='previews'){
  for(const category of [...new Set(catalog.map(x=>x.category))]){
    const items=catalog.filter(x=>x.category===category);await contact(items,`${preview}/${category}-contact.png`);
    if(category==='ground')for(const item of items)await contact(Array(9).fill(item),`${preview}/tile-${item.id}-3x3.png`,3);
  }
}else if(command==='log'){
  const lines=catalog.map(item=>`| public/assets/pixel/${item.file} | Built-in image tool; requested gpt-image-2.5 Flare (routing unexposed) | 2026-10-05 | ${item.description}; top-down 3/4 Maya cavern pixel art, no text |`);
  await fs.appendFile('docs/v0.6/ASSET_LOG.md',`\n## V15c — Sunken Cenote art\n\nDistinct generated cells; source sheets and manifests in docs/v0.6/sources/v15c. Native outputs normalized to 2048px before slice-sheet.mjs; opposite ground edges conditioned with a 12px blend. Tool model/variant routing is not exposed. No audio created or modified.\n\n| File | Model/tool | Date | Prompt |\n|---|---|---|---|\n${lines.join('\n')}\n`);
}
