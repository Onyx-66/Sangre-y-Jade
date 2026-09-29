import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const sources=JSON.parse(readFileSync('scripts/art-sources.json','utf8'));
const out=resolve('public/assets/pixel');
mkdirSync(out,{recursive:true});
mkdirSync('art-source',{recursive:true});
for(const [key,entry] of Object.entries(sources)) {
  if(!existsSync(`art-source/${key}.png`))copyFileSync(entry.source,`art-source/${key}.png`);
  const m=await sharp(`art-source/${key}.png`).metadata();
  console.log(key,m.width,m.height,'alpha:',m.hasAlpha);
}
async function cell(key,col,row,cols,rows,size=128) {
  const source=`art-source/${key}.png`, m=await sharp(source).metadata();
  // Generated atlases have hand-drawn, non-uniform gutters. These reviewed
  // slice rectangles prevent neighboring feet/weapons leaking into a frame.
  const layouts={
    hero:{y:[0,350,710,1086],x:[[0,341,701,1122,1448],[0,333,694,1140,1448],[0,330,649,1150,1448]]},
    enemy:{y:[0,278,510,771,1025,1402],x:[[0,285,555,888,1122],[0,298,568,887,1122],[0,299,585,913,1122],[0,284,571,875,1122],[0,282,564,896,1122]]},
    boss:{y:[0,296,600,905,1254],x:[[0,314,637,953,1254],[0,309,649,972,1254],[0,308,631,957,1254],[0,307,624,953,1254]]},
    props:{y:[0,337,630,927,1254],x:Array(4).fill([0,316,637,954,1254])}
  };
  const layout=layouts[key];
  const left=layout?layout.x[row][col]:Math.round(col*m.width/cols),top=layout?layout.y[row]:Math.round(row*m.height/rows);
  const width=(layout?layout.x[row][col+1]:Math.round((col+1)*m.width/cols))-left,height=(layout?layout.y[row+1]:Math.round((row+1)*m.height/rows))-top;
  return sharp(source).extract({left,top,width,height}).resize(size,size,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toBuffer();
}
for(const [key,names] of [['hero',['balam','ixchel','kukul']],['enemy',['shade','bat','jaguar','serpent','priest']],['boss',['camazotz','zipacna','vucub','ahpuch']]]) {
  for(let row=0;row<names.length;row++) {
    const pieces=[];
    for(let col=0;col<4;col++) pieces.push({input:await cell(key,col,row,4,names.length),left:col*128,top:0});
    await sharp({create:{width:512,height:128,channels:4,background:'#00000000'}}).composite(pieces).png().toFile(`${out}/${key}-${names[row]}.png`);
  }
}
const props=['stela','ruin','palm','foliage','roots','crystal','urn','basket','weapon-balam','weapon-ixchel','weapon-kukul','bracers','pendant','headdress','cacao','potion'];
for(let i=0;i<props.length;i++) writeFileSync(`${out}/${props[i]}.png`,await cell('props',i%4,Math.floor(i/4),4,4));
for(let i=0;i<66;i++) writeFileSync(`${out}/icon-${i}.png`,await cell('icons',i<56?i%8:i-56,i<56?Math.floor(i/8):7,i<56?8:10,8,96));
for(let row=0;row<6;row++) {
  const pieces=[];
  for(let col=0;col<4;col++) pieces.push({input:await cell('fx',col,row,4,6),left:col*128,top:0});
  await sharp({create:{width:512,height:128,channels:4,background:'#00000000'}}).composite(pieces).png().toFile(`${out}/fx-${row}.png`);
}
await sharp('art-source/ground.png').resize(640,640,{kernel:'nearest'}).png().toFile(`${out}/ground.png`);
await sharp('art-source/title.png').webp({quality:94}).toFile(`${out}/title.webp`);
const m=await sharp('art-source/story.png').metadata();
for(let i=0;i<6;i++) {
  const left=Math.round((i%2)*m.width/2),top=Math.round(Math.floor(i/2)*m.height/3);
  const width=Math.round((i%2+1)*m.width/2)-left,height=Math.round((Math.floor(i/2)+1)*m.height/3)-top;
  await sharp('art-source/story.png').extract({left,top,width,height}).webp({quality:95}).toFile(`${out}/story-${i}.webp`);
}
console.log('Prepared sprite sheets and cinematic panels.');
