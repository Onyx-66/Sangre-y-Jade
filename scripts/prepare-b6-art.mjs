// B6 image-tool sheet preparation: counted slicing, bottom anchors, periodic
// tiles and staged assets. Existing live assets are backed up before install.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {sliceSheet} from './slice-sheet.mjs';
const design=JSON.parse(await fs.readFile('docs/v0.6/v06_design.json','utf8'));
const old=JSON.parse(await fs.readFile('src/data/mapKits/overgrown.json','utf8'));
const staging='.tools/b6/assets',sourceDir='docs/v0.6/sources/b6',preview='docs/v0.6/previews/b6';
const asset=(category,id,width,height=width,description=id)=>({id,category,width,height,description,file:category==='weather'?`weather/${id}.png`:`maps/overgrown/${category}/${id}.png`,anchor:'bottom',keyFringe:4,...(['ground'].includes(category)?{fullBleed:true}:{})});
const originals=Object.entries(design.assets.map_art.overgrown).flatMap(([category,list])=>list.map(x=>{const size=old.items.find(i=>i.id===x.id)?.size;return asset(category,x.id,size?.width||256,size?.height||256,x.description);}));
const statues=['jaguar','warrior','serpent'].map(id=>asset('statues',`statue-${id}`,192));
const water=[...['deep','shallow'].flatMap(kind=>Array.from({length:4},(_,i)=>({...asset('water',`water-${kind}-${i}`,256),fullBleed:true}))),asset('water','foam-edge',256,64),asset('water','ripple-ring',128),asset('water','splash-burst',256),asset('water','bubbles',128)];
for(const x of water.filter(x=>!x.fullBleed)){x.softMatte=true;x.anchor='center';}
const structures=[...['n','s','e','w'].map(dir=>asset('structures',`stairs-stone-${dir}`,256,192)),asset('structures','platform-edge-straight',256),asset('structures','platform-edge-corner',256),...['straight','corner','gap'].map(x=>asset('structures',`wall-stone-${x}`,256,128)),asset('structures','bridge-h',512,192),asset('structures','bridge-v',192,512),asset('structures','pyramid-tier-a',768),asset('structures','pyramid-tier-b',512),asset('structures','pyramid-tier-c',320),asset('structures','pyramid-top-shrine',192)];
const weather=design.assets.weather.map(x=>({...asset('weather',x.id,/^(red-fog|cave-fog)$/.test(x.id)?512:128,undefined,x.description),...(/^(red-fog|cave-fog)$/.test(x.id)?{fullBleed:true}:/mist|ray|spore|rain|drip|lightning|ember/.test(x.id)?{softMatte:true}:{} )}));
export const catalog=[...originals,...water,...structures,...statues,...weather];
const sheets=[originals.slice(0,16),originals.slice(16,32),originals.slice(32,48),[...originals.slice(48),...statues],[...water,...structures.slice(0,4)],structures.slice(4),weather,[structures[1]]];
sheets.push([originals.find(x=>x.id==='temple-central'),structures[1],structures.find(x=>x.id==='wall-stone-gap')]);
const sources=['exec-4f9adecb-2957-4446-9797-addf45e43f95.png','exec-b5cf036d-84ad-44a4-b84f-40b5b2669a8a.png','exec-7fa98828-eebb-4394-abc5-fe8fb28e2c2b.png','exec-8411d2fd-9a4c-4081-903a-45c78a42dda2.png','exec-db7308a2-768f-495b-9661-1b670b5e1017.png','exec-854d4622-ad2f-4ddb-b6df-5a661a5d4cab.png','exec-adab83b1-1f78-481a-bee5-067b7d017f4f.png','exec-1c8c3f3c-a14b-47d3-af1a-1da23bc1aac8.png'];
sources.push('exec-71d11857-00e8-45af-ab82-99a89f2cac1a.png');
// Periodic edge conditioning preserves generated subjects; it is not new art.
async function periodic(file,horizontalOnly=false){
 const {data,info:{width:w,height:h}}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),band=12,clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
 for(let y=0;y<h;y++)for(let c=0;c<4;c++){const d=(data[y*w*4+c]-data[(y*w+w-1)*4+c])/2;for(let x=0;x<band;x++){const t=1-x/(band-1);data[(y*w+x)*4+c]=clamp(data[(y*w+x)*4+c]-d*t);data[(y*w+w-1-x)*4+c]=clamp(data[(y*w+w-1-x)*4+c]+d*t);}data[(y*w+w-1)*4+c]=data[y*w*4+c];}
 if(!horizontalOnly)for(let x=0;x<w;x++)for(let c=0;c<4;c++){const d=(data[x*4+c]-data[((h-1)*w+x)*4+c])/2;for(let y=0;y<band;y++){const t=1-y/(band-1);data[(y*w+x)*4+c]=clamp(data[(y*w+x)*4+c]-d*t);data[((h-1-y)*w+x)*4+c]=clamp(data[((h-1-y)*w+x)*4+c]+d*t);}data[((h-1)*w+x)*4+c]=data[x*4+c];}
 await fs.writeFile(file,await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer());
}
async function slice(n){
 const items=sheets[n-1],native=path.join(sourceDir,`sheet-${n}-native.png`),input=path.join(sourceDir,`sheet-${n}.png`);
 await fs.copyFile(path.join('C:/Users/kossa/.codex/generated_images/01a0ecbe-a0d5-7053-9b16-a3a7f2f3f89d',sources[n-1]),native);
 if(n===8){const raw=await sharp(native).resize(2048,2048).png().toBuffer();const one=await sharp(raw).extract({left:0,top:0,width:690,height:730}).resize(480,480,{fit:'inside'}).png().toBuffer();await sharp({create:{width:2048,height:2048,channels:4,background:'#ff00ff'}}).composite([{input:one,left:16,top:16}]).png().toFile(input);}
 else if(n===9){
  const raw=await sharp(native).resize(2048,2048,{kernel:'nearest'}).png().toBuffer(),layers=[];
  for(const [i,[left,width]]of [[0,575],[587,440],[1040,510]].entries())layers.push({input:await sharp(raw).extract({left,top:0,width,height:530}).resize(470,470,{fit:'inside',kernel:'nearest'}).png().toBuffer(),left:i*512+20,top:20});
  await sharp({create:{width:2048,height:2048,channels:4,background:'#ff00ff'}}).composite(layers).png().toFile(input);
 }else await sharp(native).resize(2048,2048,{kernel:'nearest'}).png().toFile(input);
 const manifest={expectedCount:items.length,columns:4,rows:4,background:'magenta',isolateCells:true,outputDir:staging,contactSheet:`${preview}/sheet-${n}.png`,items};
 const file=`${sourceDir}/sheet-${n}.json`;await fs.writeFile(file,JSON.stringify(manifest,null,2));await sliceSheet(input,file,undefined,{overwrite:true});
 for(const x of items)if(x.fullBleed||x.id==='foam-edge')await periodic(`${staging}/${x.file}`,x.id==='foam-edge');
}
async function previews(){
 for(const category of new Set(catalog.map(x=>x.category))){const items=catalog.filter(x=>x.category===category),layers=[];
  for(let i=0;i<items.length;i++)layers.push({input:await sharp(`${staging}/${items[i].file}`).resize(256,256,{fit:'contain',background:'#28372b'}).png().toBuffer(),left:(i%4)*256,top:Math.floor(i/4)*256});
  await sharp({create:{width:1024,height:Math.ceil(items.length/4)*256,channels:4,background:'#28372b'}}).composite(layers).png().toFile(`${preview}/${category}-contact.png`);
 }
 for(const x of catalog.filter(x=>x.fullBleed)){const input=await sharp(`${staging}/${x.file}`).resize(256,256).png().toBuffer();await sharp({create:{width:768,height:768,channels:4,background:'#173f31'}}).composite(Array.from({length:9},(_,i)=>({input,left:i%3*256,top:Math.floor(i/3)*256}))).png().toFile(`${preview}/tile-${x.id}.png`);}
 await fs.writeFile(`${sourceDir}/catalog.json`,JSON.stringify(catalog,null,2));
}
const command=process.argv[2];await fs.mkdir(sourceDir,{recursive:true});await fs.mkdir(preview,{recursive:true});
if(command==='slice'){for(const n of process.argv.slice(3).map(Number))await slice(n);}
if(command==='previews')await previews();
if(command==='install')for(const x of catalog){const dest=`public/assets/pixel/${x.file}`,backup=`.tools/b6/previous/${x.file}`;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.mkdir(path.dirname(backup),{recursive:true});try{await fs.copyFile(dest,backup,1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}await fs.copyFile(`${staging}/${x.file}`,dest);}
