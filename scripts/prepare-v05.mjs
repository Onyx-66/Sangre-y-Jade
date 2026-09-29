import sharp from 'sharp';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
const generated='C:/Users/kossa/.codex/generated_images/01a0ecbe-a0d5-7053-9b16-a3a7f2f3f89d/';
const assets={
 saintess:{file:'exec-1b35c35b-b932-4026-b8b7-1a7c7e87ec63.png',cuts:[0,555,1085,1710,2172]},
 tank:{file:'exec-2e22d891-7371-47cc-8fc9-b538c070f340.png',cuts:[0,543,1086,1629,2172]},
 assassin:{file:'exec-a587c860-91ac-42ff-8e30-ece0181649d4.png',cuts:[0,543,1086,1670,2172]},
};
await mkdir('art-source/v0.5',{recursive:true});
await mkdir('public/assets/pixel/frames',{recursive:true});
for(const[id,{file,cuts}]of Object.entries(assets)){
 const source=`art-source/v0.5/${id}.png`;
 try{await readFile(source);}catch{await copyFile(generated+file,source);}
 const meta=await sharp(source).metadata();
 for(let i=0;i<4;i++){
  const cell=await sharp(source).extract({left:cuts[i],top:0,width:cuts[i+1]-cuts[i],height:meta.height}).toBuffer();
  const crop=await sharp(cell).trim().toBuffer();
  await sharp(crop).resize(116,116,{fit:'contain',background:'#00000000',kernel:'nearest'}).extend({top:6,bottom:6,left:6,right:6,background:'#00000000'}).png().toFile(`public/assets/pixel/frames/support-${id}-${i}.png`);
 }
}
const prompts=JSON.parse(await readFile('scripts/art-v05-prompts.json','utf8'));
for(const item of prompts.assets){item.source=generated+assets[item.id].file;item.destination=`art-source/v0.5/${item.id}.png`;}
await writeFile('scripts/art-v05-prompts.json',JSON.stringify(prompts,null,2));
const manifest=JSON.parse(await readFile('public/assets/pixel/asset-manifest.json','utf8')).filter(a=>!a.file.startsWith('frames/support-'));
for(const id of Object.keys(assets))for(let i=0;i<4;i++)manifest.push({name:`support-${id}-${i}`,file:`frames/support-${id}-${i}.png`,width:128,height:128});
const traps={bomb:'exec-98098e5e-9c3b-4273-8940-ea59b44b5cbd.png',snare:'exec-0fb955fe-1963-44af-9f19-04d3108c9e23.png'};
const trapPrompts=JSON.parse(await readFile('scripts/art-v05-traps.json','utf8'));
for(const[id,file]of Object.entries(traps)){
 const source=`art-source/v0.5/${id}.png`;
 try{await readFile(source);}catch{await copyFile(generated+file,source);}
 await sharp(source).trim().resize(116,116,{fit:'contain',background:'#00000000',kernel:'nearest'}).extend({top:6,bottom:6,left:6,right:6,background:'#00000000'}).png().toFile(`public/assets/pixel/support-${id}.png`);
 if(!manifest.some(a=>a.file===`support-${id}.png`))manifest.push({name:`support-${id}`,file:`support-${id}.png`,width:128,height:128});
 const entry=trapPrompts.assets.find(a=>a.id===id);entry.source=generated+file;entry.destination=source;
}
await writeFile('scripts/art-v05-traps.json',JSON.stringify(trapPrompts,null,2));
await writeFile('public/assets/pixel/asset-manifest.json',JSON.stringify(manifest,null,2));
console.log('Exported 12 standalone support frames with preserved alpha.');
