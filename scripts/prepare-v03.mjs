import sharp from 'sharp';
import { mkdirSync,existsSync,copyFileSync,readFileSync,writeFileSync } from 'node:fs';
const sources=JSON.parse(readFileSync('scripts/art-v03-sources.json','utf8'));
const out='public/assets/pixel';
mkdirSync('art-source/v0.3',{recursive:true});
for(const [key,entry] of Object.entries(sources))if(!existsSync(`art-source/v0.3/${key}.png`))copyFileSync(entry.source,`art-source/v0.3/${key}.png`);
async function cell(key,col,row,cols,rows,size){
 const file=`art-source/v0.3/${key}.png`,m=await sharp(file).metadata();
 const left=Math.round(col*m.width/cols),top=Math.round(row*m.height/rows),width=Math.round((col+1)*m.width/cols)-left,height=Math.round((row+1)*m.height/rows)-top;
 return sharp(file).extract({left,top,width,height}).resize(size,size,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer();
}
const props=['temple','palm','tree','rocks','ruin','stela','foliage','roots','crystal'];
for(let i=0;i<props.length;i++)writeFileSync(`${out}/top-${props[i]}.png`,await cell('overhead',i%3,Math.floor(i/3),3,3,192));
for(const [row,id] of ['balam','ixchel','kukul'].entries())for(const [dir,offset] of [['down',0],['up',2]]){
 const frames=[];for(let i=0;i<4;i++)frames.push({input:await cell('directions',offset+i%2,row,4,3,128),left:i*128,top:0});
 await sharp({create:{width:512,height:128,channels:4,background:'#00000000'}}).composite(frames).png().toFile(`${out}/hero-${id}-${dir}.png`);
}
mkdirSync('release/branding',{recursive:true});
await sharp('art-source/v0.3/logo.png').resize(512,512,{kernel:'nearest'}).toColourspace('srgb').ensureAlpha().png().toFile('public/assets/branding/play-store-icon-512.png');
copyFileSync('public/assets/branding/play-store-icon-512.png','release/branding/play-store-icon-512.png');
await sharp('art-source/v0.3/logo.png').resize(256,256,{kernel:'nearest'}).png().toFile('public/assets/branding/logo-menu.png');
mkdirSync('android/app/src/main/res/drawable-nodpi',{recursive:true});
copyFileSync('public/assets/branding/play-store-icon-512.png','android/app/src/main/res/drawable-nodpi/game_logo.png');
console.log('Prepared overhead scenery, directional heroes, menu logo and Play Store icon.');
