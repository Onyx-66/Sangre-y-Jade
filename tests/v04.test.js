import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import sharp from 'sharp';
test('all skill icons are square with a transparent safety border',async()=>{
 for(let i=0;i<66;i++){const {data,info}=await sharp(`public/assets/pixel/icon-${i}.png`).raw().toBuffer({resolveWithObject:true});assert.equal(info.width,128);assert.equal(info.height,128);assert.equal(info.channels,4);for(let x=0;x<128;x++)assert.equal(data[x*4+3],0);}
});
test('195 separately addressable visual assets are inventoried',()=>{
 const list=JSON.parse(readFileSync('public/assets/pixel/asset-manifest.json'));assert.ok(list.length>=195);assert.equal(new Set(list.map(i=>i.file)).size,list.length);for(const entry of list)assert.ok(existsSync(`public/assets/pixel/${entry.file}`));assert.equal(existsSync('public/assets/pixel/hero-balam.png'),false);
});
test('six male narration files fit their 4.5-second cinematic beats',()=>{
 const list=JSON.parse(readFileSync('public/assets/audio/narration/manifest.json'));assert.equal(list.length,6);for(const entry of list){assert.equal(entry.voice,'am_michael');assert.ok(entry.seconds>2&&entry.seconds<4.5);const audio=readFileSync(`public/assets/audio/narration/${entry.file}`);assert.equal(audio.toString('ascii',0,4),'RIFF');assert.ok(audio.length>90000);}
});
test('new cinematic panels retain independent high-resolution artwork',async()=>{
 for(let i=0;i<6;i++){const m=await sharp(`public/assets/pixel/story-${i}.webp`).metadata();assert.ok(m.width>=1600&&m.height>=900);}
 assert.ok(existsSync('public/assets/fonts/Unixel.woff2'));assert.match(readFileSync('public/assets/fonts/OFL-Unixel.txt','utf8'),/SIL OPEN FONT LICENSE/);
});
