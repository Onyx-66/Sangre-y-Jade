import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {BOSS_IDS,bossStillFiles} from '../src/art/bossVisuals.js';

const root=process.cwd(),base=path.resolve(root,process.argv.includes('--candidate')?'.tools/v12-candidate/pixel':'public/assets/pixel');
const output=path.resolve(root,'docs/v0.6/previews/v12');await fs.mkdir(output,{recursive:true});
const files=[...BOSS_IDS.flatMap(id=>Array.from({length:16},(_,n)=>({id:`${id}-${n}`,file:`frames/boss-${id}-${n}.png`,size:192}))),...bossStillFiles()];
const hashes=new Map(),errors=[],images=[];
for(const entry of files){
 const bytes=await fs.readFile(path.join(base,entry.file)),meta=await sharp(bytes).metadata(),hash=createHash('sha256').update(bytes).digest('hex');
 if(hashes.has(hash))errors.push(`Duplicate: ${entry.file} / ${hashes.get(hash)}`);hashes.set(hash,entry.file);
 if(meta.width!==entry.size||meta.height!==entry.size||!meta.hasAlpha)errors.push(`Wrong dimensions/alpha: ${entry.file}`);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let count=0,pink=0,minX=info.width,minY=info.height,maxX=-1,maxY=-1;
 for(let n=0;n<data.length;n+=4)if(data[n+3]>30){count++;const x=n/4%info.width,y=Math.floor(n/4/info.width);
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  // Check the matte boundary, not intentional violet glints inside purple FX.
  const pixel=n/4,edge=x===0||y===0||x===info.width-1||y===info.height-1||
   [pixel-1,pixel+1,pixel-info.width,pixel+info.width].some(p=>data[p*4+3]<=30);
  if(edge&&data[n+3]>180&&data[n]>210&&data[n+2]>210&&data[n+1]<130)pink++;
 }
 if(count<10)errors.push(`Empty image: ${entry.file}`);
 if(pink)errors.push(`Opaque magenta fringe: ${entry.file} (${pink})`);
 if(minX<2||maxX>entry.size-3||minY<2||maxY>entry.size-3)errors.push(`Insufficient edge margin: ${entry.file}`);
 images.push({...entry,hash,opaquePixels:count,pink,bounds:[minX,minY,maxX,maxY]});
}
async function signature(entry){
 const rgb=await sharp(path.join(base,entry.file)).resize(48,48).flatten({background:'#29251f'}).removeAlpha().raw().toBuffer();
 const gray=await sharp(rgb,{raw:{width:48,height:48,channels:3}}).resize(9,8).grayscale().raw().toBuffer();
 const bits=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits.push(gray[y*9+x]>gray[y*9+x+1]);return {...entry,rgb,bits};
}
const pairs=[];
for(const group of [BOSS_IDS.map(id=>({id,file:`frames/boss-${id}-0.png`})),bossStillFiles()]){
 const sigs=await Promise.all(group.map(signature));
 for(let a=0;a<sigs.length;a++)for(let b=a+1;b<sigs.length;b++){
  const x=sigs[a],y=sigs[b],hamming=x.bits.filter((v,i)=>v!==y.bits[i]).length,difference=x.rgb.reduce((sum,v,i)=>sum+Math.abs(v-y.rgb[i]),0)/x.rgb.length;
  const pair={a:x.id,b:y.id,hamming,difference:+difference.toFixed(3)};pairs.push(pair);
  if(hamming<=6&&difference<12)errors.push(`Too similar: ${x.id} / ${y.id} (${hamming}, ${difference.toFixed(2)})`);
 }
}
async function contact(entries,file,columns,size){
 const layers=[];for(const [i,entry]of entries.entries())layers.push({input:await sharp(path.join(base,entry.file)).resize(size,size,{kernel:'nearest'}).png().toBuffer(),left:i%columns*size,top:Math.floor(i/columns)*size});
 await sharp({create:{width:columns*size,height:Math.ceil(entries.length/columns)*size,channels:4,background:'#29251f'}}).composite(layers).png().toFile(path.join(output,file));
}
await contact(BOSS_IDS.map(id=>({file:`frames/boss-${id}-0.png`})),'boss-lineup.png',4,256);
await contact(bossStillFiles(),'effects-final.png',6,256);
const report={createdAt:new Date().toISOString(),files:files.length,uniqueHashes:hashes.size,images,pairs:pairs.sort((a,b)=>a.hamming-b.hamming),errors};
await fs.writeFile(path.join(output,'art-quality.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:files.length,uniqueHashes:hashes.size,closestPairs:report.pairs.slice(0,6),errors}));if(errors.length)process.exitCode=1;
