import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {detectSpriteCells,sliceSheet} from './slice-sheet.mjs';
import {ALLY_IDS,ALLY_EFFECT_IDS} from '../src/art/allyVisuals.js';

const root=path.resolve(import.meta.dirname,'..'),sources=path.join(root,'art-source/v0.6/allies');
const preview=path.join(root,'docs/v0.6/previews/v16'),candidate=path.join(root,'.tools/v16-candidate/pixel');
export async function prepare(entry){
 await fs.mkdir(sources,{recursive:true});await fs.mkdir(preview,{recursive:true});
 const original=path.join(sources,`${entry.id}-original.png`),normalized=path.join(sources,`${entry.id}-sheet.png`);
 if(entry.source)try{await fs.copyFile(entry.source,original);}catch(error){if(error.code!=='ENOENT')throw error;await fs.access(original);}
 const meta=await sharp(original).metadata();
 const normalizedPixels=await sharp(original).resize(2048,2048,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
 // Effects retry has thin black grid dividers in the empty margins only.
 if(entry.clearGrid)for(let y=0;y<2048;y++)for(let x=0;x<2048;x++)if(x%512<8||x%512>503||y%512<8||y%512>503)normalizedPixels.set([255,0,255,255],(y*2048+x)*4);
 await sharp(normalizedPixels,{raw:{width:2048,height:2048,channels:4}}).png().toFile(normalized);
 const {data,info}=await sharp(normalized).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const found=detectSpriteCells(data,info.width,info.height,'magenta',4,4),actor=ALLY_IDS.includes(entry.id),count=actor?16:8;
 if(found.cells.size!==count)throw Error(`${entry.id}: ${found.cells.size} cells, expected ${count}`);
 const largest=Math.max(...[...found.cells.values()].map(b=>Math.max(b.right-b.left+1,b.bottom-b.top+1)));
 const manifest={expectedCount:count,columns:4,rows:4,background:'magenta',isolateCells:true,
  outputDir:path.relative(root,candidate),contactSheet:path.relative(root,path.join(preview,`${entry.id}-contact.png`)),
  items:actor?Array.from({length:16},(_,n)=>({file:`frames/support-${entry.id}-${n}.png`,width:128,height:128,spriteScale:118/largest,anchor:'bottom',keyFringe:1})):
  ALLY_EFFECT_IDS.map(id=>({file:`fx/${id}/main.png`,width:256,height:256,keyFringe:1}))};
 const file=path.join(sources,`${entry.id}-manifest.json`);await fs.writeFile(file,JSON.stringify(manifest,null,2)+'\n');
 await sliceSheet(normalized,file,undefined,{overwrite:true});
 console.log(JSON.stringify({id:entry.id,nativeSize:[meta.width,meta.height],normalized:[2048,2048],count}));
}
export async function promote(){
 const legacy=path.join(sources,'legacy');await fs.mkdir(legacy,{recursive:true});
 for(const id of ALLY_IDS)for(let n=0;n<4;n++){
  const file=`support-${id}-${n}.png`,backup=path.join(legacy,file);
  try{await fs.access(backup);}catch(error){if(error.code!=='ENOENT')throw error;await fs.copyFile(path.join(root,'public/assets/pixel/frames',file),backup);}
 }
 for(const file of [...ALLY_IDS.flatMap(id=>Array.from({length:16},(_,n)=>`frames/support-${id}-${n}.png`)),...ALLY_EFFECT_IDS.map(id=>`fx/${id}/main.png`)]){
  const to=path.join(root,'public/assets/pixel',file);await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(path.join(candidate,file),to);
 }
}
if(process.argv[2]==='prepare')for(const entry of JSON.parse(await fs.readFile(process.argv[3],'utf8')))await prepare(entry);
else if(process.argv[2]==='promote')await promote();
