// B7 image-tool sheet preparation: counted slicing, bottom anchors, periodic
// tiles and staged assets. Existing live assets are backed up before install.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {sliceSheet} from './slice-sheet.mjs';
const design=JSON.parse(await fs.readFile('docs/v0.6/v06_design.json','utf8'));
const old=JSON.parse(await fs.readFile('src/data/mapKits/bloodmoon.json','utf8'));
const staging='.tools/b7/assets',sourceDir='docs/v0.6/sources/b7',preview='docs/v0.6/previews/b7';
const asset=(category,id,width,height=width,description=id)=>({id,category,width,height,description,file:category==='weather'?`weather/${id}.png`:`maps/bloodmoon/${category}/${id}.png`,anchor:'bottom',keyFringe:4,...(['ground'].includes(category)?{fullBleed:true}:{})});
const originals=Object.entries(design.assets.map_art.bloodmoon).flatMap(([category,list])=>list.map(x=>{const size=old.items.find(i=>i.id===x.id)?.size;return asset(category,x.id,category==='plants'?Math.max(96,size?.width||96):size?.width||256,category==='plants'?Math.max(96,size?.height||96):size?.height||256,x.description);}));
const statues=['jaguar','warrior','serpent'].map(id=>asset('statues',`statue-${id}`,192));
// Village doors stay approximately 1.3 hero-heights at the authored 1.2 scale.
for(const item of originals.filter(x=>x.id.startsWith('hut-burned-'))){item.width=320;item.height=250;}
const water=[...['deep','shallow'].flatMap(kind=>Array.from({length:4},(_,i)=>({...asset('water',`water-${kind}-${i}`,256),fullBleed:true}))),asset('water','foam-edge',256,64),asset('water','ripple-ring',128),asset('water','splash-burst',256),asset('water','bubbles',128)];
for(const x of water.filter(x=>!x.fullBleed)){x.anchor='center';}
const structures=[...['n','s','e','w'].map(dir=>asset('structures',`stairs-stone-${dir}`,256,192)),asset('structures','platform-edge-straight',256),asset('structures','platform-edge-corner',256),...['straight','corner','gap'].map(x=>asset('structures',`wall-stone-${x}`,256,128)),asset('structures','bridge-h',512,192),asset('structures','bridge-v',192,512),asset('structures','pyramid-tier-a',768),asset('structures','pyramid-tier-b',512),asset('structures','pyramid-tier-c',320),asset('structures','pyramid-top-shrine',192)];
const glow={...asset('glow','glow-torch',256,256,'soft orange torch additive glow'),file:'maps/bloodmoon/glow-torch.png',softMatte:true,keyFringe:0,anchor:'center'};
export const catalog=[...originals,...water,...structures,...statues,glow];
const sheets=[originals.slice(0,16),originals.slice(16,32),originals.slice(32,48),[...originals.slice(48),...statues,glow],[...water,...structures.slice(0,4)],structures.slice(4)];
sheets.push([structures[1],structures[2],structures[3],structures[5],structures[7]]);
sheets.push([structures[1],structures[2],structures[3]]);
sheets.push([water[9],water[10],water[11],glow,originals[5]]);
sheets.push(water.slice(0,8));
// Isolated specks below a wall are not its base. Re-seat the actual wall on
// the bottom anchor without stretching or re-painting the generated subject.
async function reseatBase(file){
 const {data,info:{width,height}}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let bottom=height-1;
 for(;bottom>0;bottom--){let n=0;for(let x=0;x<width;x++)if(data[(bottom*width+x)*4+3]>80)n++;if(n>=width*.08)break;}
 const crop=await sharp(data,{raw:{width,height,channels:4}}).extract({left:0,top:0,width,height:bottom+1}).png().toBuffer();
 await fs.writeFile(file,await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite([{input:crop,left:0,top:height-bottom-1}]).png().toBuffer());
}
// Periodic edge conditioning preserves generated subjects; it is not new art.
async function periodic(file,horizontalOnly=false){
 const {data,info:{width:w,height:h}}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),band=12,clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
 for(let y=0;y<h;y++)for(let c=0;c<4;c++){const d=(data[y*w*4+c]-data[(y*w+w-1)*4+c])/2;for(let x=0;x<band;x++){const t=1-x/(band-1);data[(y*w+x)*4+c]=clamp(data[(y*w+x)*4+c]-d*t);data[(y*w+w-1-x)*4+c]=clamp(data[(y*w+w-1-x)*4+c]+d*t);}data[(y*w+w-1)*4+c]=data[y*w*4+c];}
 if(!horizontalOnly)for(let x=0;x<w;x++)for(let c=0;c<4;c++){const d=(data[x*4+c]-data[((h-1)*w+x)*4+c])/2;for(let y=0;y<band;y++){const t=1-y/(band-1);data[(y*w+x)*4+c]=clamp(data[(y*w+x)*4+c]-d*t);data[((h-1-y)*w+x)*4+c]=clamp(data[((h-1-y)*w+x)*4+c]+d*t);}data[((h-1)*w+x)*4+c]=data[x*4+c];}
 await fs.writeFile(file,await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer());
}
async function slice(n){
 const items=sheets[n-1],native=path.join(sourceDir,`sheet-${n}-native.png`),input=path.join(sourceDir,`sheet-${n}.png`);
 await fs.copyFile(process.argv[4],native);
 if(n===8){
  // Tool added grid lines outside the subjects; extract cell interiors only.
  const raw=await sharp(native).resize(2048,2048,{kernel:'nearest'}).png().toBuffer(),layers=[];
  for(let i=0;i<3;i++)layers.push({input:await sharp(raw).extract({left:i*512+12,top:12,width:488,height:488}).png().toBuffer(),left:i*512+12,top:12});
  await sharp({create:{width:2048,height:2048,channels:4,background:'#ff00ff'}}).composite(layers).png().toFile(input);
 }else await sharp(native).resize(2048,2048,{kernel:'nearest'}).png().toFile(input);
 const manifest={expectedCount:items.length,columns:4,rows:4,background:'magenta',isolateCells:true,outputDir:staging,contactSheet:`${preview}/sheet-${n}.png`,items};
 const file=`${sourceDir}/sheet-${n}.json`;await fs.writeFile(file,JSON.stringify(manifest,null,2));await sliceSheet(input,file,undefined,{overwrite:true});
 for(const x of items)if(x.fullBleed||x.id==='foam-edge')await periodic(`${staging}/${x.file}`,x.id==='foam-edge');
 for(const x of items)if(['ossuary','altar-sacrificial'].includes(x.id))await reseatBase(`${staging}/${x.file}`);
}
async function previews(){
 for(const category of new Set(catalog.map(x=>x.category))){const items=catalog.filter(x=>x.category===category),layers=[];
  for(let i=0;i<items.length;i++)layers.push({input:await sharp(`${staging}/${items[i].file}`).resize(256,256,{fit:'contain',background:'#29202e'}).png().toBuffer(),left:(i%4)*256,top:Math.floor(i/4)*256});
  await sharp({create:{width:1024,height:Math.ceil(items.length/4)*256,channels:4,background:'#29202e'}}).composite(layers).png().toFile(`${preview}/${category}-contact.png`);
 }
 for(const x of catalog.filter(x=>x.fullBleed)){const input=await sharp(`${staging}/${x.file}`).resize(256,256).png().toBuffer();await sharp({create:{width:768,height:768,channels:4,background:'#201c2c'}}).composite(Array.from({length:9},(_,i)=>({input,left:i%3*256,top:Math.floor(i/3)*256}))).png().toFile(`${preview}/tile-${x.id}.png`);}
 await fs.writeFile(`${sourceDir}/catalog.json`,JSON.stringify(catalog,null,2));
}
const command=process.argv[2];await fs.mkdir(sourceDir,{recursive:true});await fs.mkdir(preview,{recursive:true});
if(command==='slice'){await slice(Number(process.argv[3]));}
if(command==='previews')await previews();
if(command==='install')for(const x of catalog){const dest=`public/assets/pixel/${x.file}`,backup=`.tools/b7/previous/${x.file}`;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.mkdir(path.dirname(backup),{recursive:true});try{await fs.copyFile(dest,backup,1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}await fs.copyFile(`${staging}/${x.file}`,dest);}
