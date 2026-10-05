import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {detectSpriteCells,sliceSheet} from './slice-sheet.mjs';
import {BOSS_IDS} from '../src/art/bossVisuals.js';

const root=path.resolve(import.meta.dirname,'..'),sources=path.join(root,'art-source/v0.6/bosses');
const preview=path.join(root,'docs/v0.6/previews/v12'),candidate=path.join(root,'.tools/v12-candidate/pixel');

export async function prepareBossSheet(entry){
 await fs.mkdir(sources,{recursive:true});await fs.mkdir(preview,{recursive:true});
 const original=path.join(sources,`${entry.id}-original.png`),normalized=path.join(sources,`${entry.id}-sheet.png`);
 if(entry.source!==original){try{await fs.access(entry.source);await fs.copyFile(entry.source,original);}catch(error){if(error.code!=='ENOENT')throw error;await fs.access(original);}}
 for(const [i,source]of (entry.rejected||[]).entries())await fs.copyFile(source,path.join(sources,`${entry.id}-rejected-${i+1}.png`));
 const meta=await sharp(original).metadata();
 const columns=entry.columns||4,rows=entry.rows||4,background=entry.background||'magenta';
 const sheetWidth=columns*512,sheetHeight=rows*512;
 const {data,info}=await sharp(original).resize(sheetWidth,sheetHeight,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const detected=detectSpriteCells(data,info.width,info.height,background,columns,rows,{collectLabels:true});
 const actor=BOSS_IDS.includes(entry.id),count=actor?16:entry.items.length;
 if(detected.cells.size!==count||Array.from({length:count},(_,i)=>i).some(i=>!detected.cells.has(i)))throw Error(`${entry.id}: expected ${count} consecutive cells, found ${detected.cells.size}`);
 const largest=Math.max(...[...detected.cells.values()].map(b=>Math.max(b.right-b.left+1,b.bottom-b.top+1))),layers=[];
 // Move complete connected components, rather than cropping protruding wings.
 // One common scale and ground baseline prevents magnified death remnants.
 for(const [cell,b]of detected.cells){
  const width=b.right-b.left+1,height=b.bottom-b.top+1,scale=448/largest,pixels=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const from=(b.top+y)*info.width+b.left+x,to=(y*width+x)*4;
   if(detected.labels[from]===cell)data.copy(pixels,to,from*4,from*4+4);
   else pixels.set(background==='transparent'?[0,0,0,0]:[255,0,255,255],to);
  }
  const fitted=await sharp(pixels,{raw:{width,height,channels:4}}).resize(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)),{kernel:'nearest'}).png().toBuffer();
  const m=await sharp(fitted).metadata();layers.push({input:fitted,left:cell%columns*512+Math.floor((512-m.width)/2),top:Math.floor(cell/columns)*512+(actor?448-m.height:Math.floor((512-m.height)/2))});
 }
 await sharp({create:{width:sheetWidth,height:sheetHeight,channels:4,background:background==='transparent'?{r:0,g:0,b:0,alpha:0}:'#ff00ff'}}).composite(layers).png().toFile(normalized);
 const manifest={expectedCount:count,columns,rows,background,outputDir:path.relative(root,candidate),
  contactSheet:path.relative(root,path.join(preview,`${entry.id}-contact.png`)),items:actor?
   Array.from({length:16},(_,n)=>({file:`frames/boss-${entry.id}-${n}.png`,width:192,height:192,spriteScale:180/448,anchor:'bottom'})):
   entry.items.map(item=>({file:item.file,width:item.size,height:item.size}))};
 const manifestPath=path.join(sources,`${entry.id}-manifest.json`);
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 await sliceSheet(normalized,manifestPath,undefined,{overwrite:true});
 if(actor){const frames=[];for(let n=0;n<16;n++)frames.push({input:await sharp(path.join(candidate,manifest.items[n].file)).resize(256,256,{kernel:'nearest'}).png().toBuffer(),left:n%4*256,top:Math.floor(n/4)*256});
  await sharp({create:{width:1024,height:1024,channels:4,background:'#29251f'}}).composite(frames).png().toFile(path.join(preview,`${entry.id}-contact.png`));}
 return {id:entry.id,nativeSize:[meta.width,meta.height],normalizedSize:[sheetWidth,sheetHeight],count};
}
export async function promoteBossArt(entries){
 const legacy=path.join(sources,'legacy');await fs.mkdir(legacy,{recursive:true});
 for(const id of BOSS_IDS)for(let n=0;n<4;n++){
  const name=`boss-${id}-${n}.png`,backup=path.join(legacy,name);
  try{await fs.access(backup);}catch(error){if(error.code!=='ENOENT')throw error;await fs.copyFile(path.join(root,'public/assets/pixel/frames',name),backup);}
 }
 for(const entry of entries){const files=BOSS_IDS.includes(entry.id)?Array.from({length:16},(_,n)=>`frames/boss-${entry.id}-${n}.png`):entry.items.map(item=>item.file);
  for(const file of files){const to=path.join(root,'public/assets/pixel',file);await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(path.join(candidate,file),to);}}
 console.log('Promoted verified boss art; all 16 original frames retained byte-for-byte.');
}
if(process.argv[2]){
 const entries=JSON.parse(await fs.readFile(process.argv[3],'utf8')),selected=process.argv[4]?entries.filter(e=>e.id===process.argv[4]):entries;
 if(process.argv[2]==='prepare')for(const entry of selected)console.log(JSON.stringify(await prepareBossSheet(entry)));
 else if(process.argv[2]==='promote')await promoteBossArt(selected);
 else throw Error('Usage: node scripts/prepare-boss-art.mjs prepare|promote <sources.json> [sheet-id]');
}
