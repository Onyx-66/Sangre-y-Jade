import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {ENEMY_IDS,ENEMY_EFFECT_IDS} from '../src/art/enemyVisuals.js';

const root=process.cwd(),base=path.resolve(root,process.argv.includes('--candidate')?'.tools/v9-candidate/pixel':'public/assets/pixel');
const preview=path.join(root,'docs/v0.6/previews/v9');await fs.mkdir(preview,{recursive:true});
const images=[],hashes=new Map(),errors=[];let fringes=0;
for(const id of ENEMY_IDS)for(let n=0;n<16;n++)images.push({id:`${id}-${n}`,file:`frames/enemy-${id}-${n}.png`,size:128});
for(const id of ENEMY_EFFECT_IDS)images.push({id,file:`fx/${id}/main.png`,size:256});
for(const image of images){const file=path.join(base,image.file),buffer=await fs.readFile(file),meta=await sharp(buffer).metadata();
 if(meta.width!==image.size||meta.height!==image.size||!meta.hasAlpha)errors.push(`${image.file}: invalid size or alpha`);
 const hash=createHash('sha256').update(buffer).digest('hex');if(hashes.has(hash))errors.push(`Identical files: ${image.file} and ${hashes.get(hash)}`);hashes.set(hash,image.file);
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let count=0,minY=128,maxY=-1;
 for(let i=0;i<data.length;i+=4)if(data[i+3]>30){count++;const y=Math.floor(i/4/info.width);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  if(data[i+3]>180&&data[i]>210&&data[i+2]>210&&data[i+1]<80){fringes++;errors.push(`${image.file}: opaque keyed-magenta pixel`);break;}}
 if(count<10)errors.push(`${image.file}: empty sprite`);
 if(image.size===128&&maxY>125)errors.push(`${image.file}: inconsistent ground baseline`);
 image.opaquePixels=count;image.boundsY=[minY,maxY];
}
const signatures=[];
for(const id of ENEMY_IDS){const source=await sharp(path.join(base,`frames/enemy-${id}-0.png`)).resize(48,48).flatten({background:'#29251f'}).removeAlpha().raw().toBuffer();
 const gray=await sharp(source,{raw:{width:48,height:48,channels:3}}).resize(9,8).grayscale().raw().toBuffer();
 const bits=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits.push(gray[y*9+x]>gray[y*9+x+1]);
 signatures.push({id,source,bits});}
const pairs=[];
for(let a=0;a<signatures.length;a++)for(let b=a+1;b<signatures.length;b++){
 const x=signatures[a],y=signatures[b],hamming=x.bits.filter((bit,i)=>bit!==y.bits[i]).length;
 const difference=x.source.reduce((sum,v,i)=>sum+Math.abs(v-y.source[i]),0)/x.source.length;
 pairs.push({a:x.id,b:y.id,hamming,difference:+difference.toFixed(3)});
 if(hamming<=6&&difference<12)errors.push(`Too similar: ${x.id} / ${y.id} (dHash ${hamming}, RGB difference ${difference.toFixed(2)})`);
}
const layers=[];
for(const [i,id]of ENEMY_IDS.entries())layers.push({input:await sharp(path.join(base,`frames/enemy-${id}-0.png`)).resize(192,192,{kernel:'nearest'}).png().toBuffer(),left:i%5*192,top:Math.floor(i/5)*192});
await sharp({create:{width:960,height:576,channels:4,background:'#29251f'}}).composite(layers).png().toFile(path.join(preview,'enemy-lineup.png'));
const effects=[];
for(const [i,id]of ENEMY_EFFECT_IDS.entries())effects.push({input:await sharp(path.join(base,`fx/${id}/main.png`)).png().toBuffer(),left:i%6*256,top:Math.floor(i/6)*256});
await sharp({create:{width:1536,height:768,channels:4,background:'#29251f'}}).composite(effects).png().toFile(path.join(preview,'effects-final.png'));
const report={createdAt:new Date().toISOString(),files:images.length,uniqueHashes:hashes.size,fringes,images,pairs:pairs.sort((a,b)=>a.hamming-b.hamming),errors};
await fs.writeFile(path.join(preview,'art-quality.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:images.length,uniqueHashes:hashes.size,fringes,closestPairs:report.pairs.slice(0,5),errors}));
if(errors.length)process.exitCode=1;
