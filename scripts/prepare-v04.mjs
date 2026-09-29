import sharp from 'sharp';
import {mkdirSync,readdirSync,existsSync,copyFileSync,writeFileSync,unlinkSync} from 'node:fs';
const root='public/assets/pixel';mkdirSync(`${root}/frames`,{recursive:true});mkdirSync('art-source/runtime-atlases',{recursive:true});
const names=[...['balam','ixchel','kukul'].flatMap(id=>[`hero-${id}`,`hero-${id}-up`,`hero-${id}-down`]),...['shade','bat','jaguar','serpent','priest'].map(id=>`enemy-${id}`),...['camazotz','zipacna','vucub','ahpuch'].map(id=>`boss-${id}`),...Array.from({length:6},(_,i)=>`fx-${i}`)];
const manifest=[];
for(const name of names){
 const original=`art-source/runtime-atlases/${name}.png`;
 if(existsSync(`${root}/${name}.png`))copyFileSync(`${root}/${name}.png`,original);
 for(let n=0;n<4;n++){const file=`frames/${name}-${n}.png`;await sharp(original).extract({left:n*128,top:0,width:128,height:128}).png().toFile(`${root}/${file}`);manifest.push({name:`${name}-${n}`,file,width:128,height:128});}
 // Preserve the atlas in art-source; ship only standalone frame images.
 if(existsSync(`${root}/${name}.png`))unlinkSync(`${root}/${name}.png`);
}
// Reviewed borders of the original generated atlas. The last row contains TEN
// icons, not eight; row spacing is not uniform. Never guess a fractional grid.
const ys=[0,153,308,464,621,777,928,1075,1232];
const regular=[0,155,312,470,628,785,942,1099,1254];
const last=[0,156,274,389,510,629,748,866,982,1104,1254];
for(let i=0;i<66;i++){
 const row=i<56?Math.floor(i/8):7,col=i<56?i%8:i-56,xs=row===7?last:regular;
 const left=xs[col]+2,top=ys[row]+2,width=xs[col+1]-xs[col]-4,height=ys[row+1]-ys[row]-4;
 await sharp('art-source/icons.png').extract({left,top,width,height}).resize(112,112,{fit:'fill',kernel:'nearest'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png().toFile(`${root}/icon-${i}.png`);
 manifest.push({name:`icon-${i}`,file:`icon-${i}.png`,width:128,height:128});
}
const panels=['city','stars','cenote','breach','heroes','battle'];
for(const [i,name]of panels.entries())if(existsSync(`art-source/v0.4/${name}.png`))await sharp(`art-source/v0.4/${name}.png`).webp({quality:96}).toFile(`${root}/story-${i}.webp`);
for(const file of readdirSync(root).filter(f=>/\.(png|webp)$/.test(f)&&!names.includes(f.replace('.png',''))&&!f.startsWith('icon-'))){const m=await sharp(`${root}/${file}`).metadata();manifest.push({name:file.replace(/\.[^.]+$/,''),file,width:m.width,height:m.height});}
writeFileSync(`${root}/asset-manifest.json`,JSON.stringify(manifest,null,2));
const icons=[];for(let i=0;i<66;i++)icons.push({input:`${root}/icon-${i}.png`,left:(i%8)*128,top:Math.floor(i/8)*128});
mkdirSync('artifacts/v0.4',{recursive:true});await sharp({create:{width:1024,height:1152,channels:4,background:'#24202b'}}).composite(icons).png().toFile('artifacts/v0.4/icon-contact-sheet.png');
console.log(`Prepared ${manifest.length} standalone assets; atlas sources retained outside runtime.`);
