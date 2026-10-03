import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { sliceSheet, detectSpriteCells } from './slice-sheet.mjs';

const inputs=process.argv.slice(2).filter(value=>value!=='--overwrite');
if(inputs.length!==5)throw Error('Usage: node scripts/prepare-kukul-fx-sheets.mjs <sheet1> <sheet2> <sheet3> <white-flint> <rejected-sheet1> [--overwrite]');
const source=JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json','utf8'));
const skills=source.heroes.kukul;
if(skills.length!==24)throw Error('Expected the authoritative 24 Kukul skills.');
const items=skills.flatMap(skill=>(skill.kind==='active'?['main','accent']:['proc']).map(still=>({
  file:`fx/${skill.id}/${still}.png`,width:skill.kind==='active'?256:128,height:skill.kind==='active'?256:128,
})));
const output=path.resolve('docs/skills-redesign/previews/step16');
await fs.mkdir(output,{recursive:true});
for(let i=0;i<3;i++)await fs.copyFile(inputs[i],path.join(output,`sheet-${i+1}.png`));
await fs.copyFile(inputs[3],path.join(output,'white-flint-correction.png'));
await fs.copyFile(inputs[4],path.join(output,'sheet-1-rejected-spacing.png'));
for(let i=0;i<3;i++){
  let working=await sharp(inputs[i]).resize(2048,2048,{kernel:'lanczos3'}).ensureAlpha().png().toBuffer();
  if(i===2){
    // The model spread the eight objects over more than the first two rows.
    // Repack the actual 4x2 objects; preserve the generated original unchanged.
    const compact=await sharp(inputs[i]).ensureAlpha().trim().png().toBuffer(),
      {data,info}=await sharp(compact).raw().toBuffer({resolveWithObject:true}),
      found=detectSpriteCells(data,info.width,info.height,'transparent',4,2);
    if(found.cells.size!==8)throw Error(`Passive source layout: expected eight objects, found ${found.cells.size}.`);
    const layers=[];
    for(let cell=0;cell<8;cell++){
      const b=found.cells.get(cell);if(!b)throw Error(`Missing passive cell ${cell+1}.`);
      const crop=await sharp(compact).extract({left:b.left,top:b.top,width:b.right-b.left+1,height:b.bottom-b.top+1})
        .resize(416,416,{fit:'inside',kernel:'lanczos3'}).png().toBuffer(),size=await sharp(crop).metadata();
      layers.push({input:crop,left:cell%4*512+Math.floor((512-size.width)/2),top:Math.floor(cell/4)*512+Math.floor((512-size.height)/2)});
    }
    working=await sharp({create:{width:2048,height:2048,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toBuffer();
    await sharp(working).toFile(path.join(output,'sheet-3-2048-original.png'));
    const correction=await sharp(inputs[3]).ensureAlpha().trim().resize(380,380,{fit:'inside',kernel:'lanczos3'}).png().toBuffer(),size=await sharp(correction).metadata();
    const erase=await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:1}}}).png().toBuffer();
    working=await sharp(working).composite([{input:erase,left:0,top:0,blend:'dest-out'},
      {input:correction,left:Math.floor((512-size.width)/2),top:Math.floor((512-size.height)/2)}]).png().toBuffer();
  }
  const sheet=path.join(output,`sheet-${i+1}-2048.png`);await fs.writeFile(sheet,working);
  const manifest={expectedCount:Math.min(16,items.length-i*16),columns:4,rows:4,background:'transparent',
    outputDir:'public/assets/pixel',contactSheet:`docs/skills-redesign/previews/step16/contact-sheet-${i+1}.png`,items:items.slice(i*16,i*16+16)};
  const manifestPath=`docs/skills-redesign/fx-kukul-sheet-${i+1}.json`;
  await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  await sliceSheet(sheet,manifestPath,undefined,{overwrite:process.argv.includes('--overwrite')});
}
console.log('Prepared 40 Kukul stills with preserved source sheets and one white-flint correction.');
