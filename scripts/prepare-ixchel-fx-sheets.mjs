import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { sliceSheet, detectSpriteCells } from './slice-sheet.mjs';

const inputs=process.argv.slice(2).filter(value=>value!=='--overwrite');
if(inputs.length!==4)throw new Error('Usage: node scripts/prepare-ixchel-fx-sheets.mjs <sheet1> <sheet2> <sheet3> <five-point-star> [--overwrite]');
const output=path.resolve('docs/skills-redesign/previews/step15');
await fs.mkdir(output,{recursive:true});
for(let i=0;i<3;i++)await fs.copyFile(inputs[i],path.join(output,`sheet-${i+1}.png`));
await fs.copyFile(inputs[3],path.join(output,'copal-star-correction.png'));
const normalized=await sharp(inputs[0]).resize(2048,2048,{kernel:'lanczos3'}).ensureAlpha().png().toBuffer();
await sharp(normalized).toFile(path.join(output,'sheet-1-2048-original.png'));
const star=await sharp(inputs[3]).ensureAlpha().trim().resize(448,448,{fit:'inside',kernel:'lanczos3'}).png().toBuffer();
const metadata=await sharp(star).metadata();
const erase=await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:1}}}).png().toBuffer();
await sharp(normalized).composite([{input:erase,left:0,top:0,blend:'dest-out'},
  {input:star,left:Math.floor((512-metadata.width)/2),top:Math.floor((512-metadata.height)/2)}]).png().toFile(path.join(output,'sheet-1-2048.png'));
await sharp(inputs[1]).resize(2048,2048,{kernel:'lanczos3'}).ensureAlpha().png().toFile(path.join(output,'sheet-2-2048.png'));
// ImageGen spread the eight passive objects over more than half the source square.
// Trim only empty outer alpha, group the actual 4x2 objects, then repack them with
// generous margins into a 4x4 working sheet. No drawing, recolouring or aspect stretch.
const passive=await sharp(inputs[2]).ensureAlpha().trim().png().toBuffer();
const {data,info}=await sharp(passive).raw().toBuffer({resolveWithObject:true});
const found=detectSpriteCells(data,info.width,info.height,'transparent',4,2);
if(found.cells.size!==8)throw new Error(`Passive source layout: expected eight objects, found ${found.cells.size}.`);
const layers=[];
for(let i=0;i<8;i++){
  const bounds=found.cells.get(i);if(!bounds)throw new Error(`Missing passive object ${i+1}.`);
  const crop=await sharp(passive).extract({left:bounds.left,top:bounds.top,width:bounds.right-bounds.left+1,height:bounds.bottom-bounds.top+1})
    .resize(416,416,{fit:'inside',kernel:'lanczos3'}).png().toBuffer(),size=await sharp(crop).metadata();
  layers.push({input:crop,left:i%4*512+Math.floor((512-size.width)/2),top:Math.floor(i/4)*512+Math.floor((512-size.height)/2)});
}
await sharp({create:{width:2048,height:2048,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(path.join(output,'sheet-3-2048.png'));
for(let i=0;i<3;i++)await sliceSheet(path.join(output,`sheet-${i+1}-2048.png`),`docs/skills-redesign/fx-ixchel-sheet-${i+1}.json`,undefined,{overwrite:process.argv.includes('--overwrite')});
