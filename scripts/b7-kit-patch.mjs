// Compile inspected B7 base measurements into a source patch. No art or audio
// is generated here; coordinates are native pixels relative to bottom centre.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const file='src/data/mapKits/bloodmoon.json',before=await fs.readFile(file,'utf8'),kit=JSON.parse(before);
const catalog=JSON.parse(await fs.readFile('docs/v0.6/sources/b7/catalog.json','utf8'));
const rect=(width,height,offsetY=-height/2-3,offsetX=0)=>({type:'rect',width,height,offsetX,offsetY});
const circle=(radius,offsetY=-radius-3,offsetX=0)=>({type:'circle',radius,offsetX,offsetY});
// Measured visible bases, excluding canopy/roof and soft shadows.
const measured={
 'tree-dead-a':circle(24),'tree-dead-b':circle(24),'tree-twisted':circle(23),'tree-burned':circle(31),'tree-thorn':circle(22),'tree-stump-large':circle(43,-43),'tree-weeping-dark':circle(27),'tree-red-leaf':circle(25),
 'obsidian-shard-a':circle(43,-43),'obsidian-shard-b':circle(25,-26),'rock-cracked':circle(37,-38),'altar-stone':circle(33,-34),'skull-pile':circle(53,-54),'bone-pile':circle(49,-50),
 'log-burned':rect(112,35,-23),'stump-burned':circle(29),'rib-cage':circle(33,-34),'spears-crossed':circle(15,-19),
 'hut-burned-a':rect(231,54,-33),'hut-burned-b':rect(261,48,-30),'hut-burned-c':rect(286,42,-28),
 'ritual-platform':rect(636,144,-80),'ossuary':rect(289,57,-36),'temple-wing-collapsed':rect(280,82,-49),
 'altar-sacrificial':rect(267,65,-41),'skull-rack':rect(251,31,-22),'brazier-stone':rect(170,45,-29),'gate-ruined':rect(267,53,-34),
 'torch-post-lit':circle(9,-14),'torch-ground':circle(7,-12),'banner-torn':circle(12,-15),'chains':rect(79,15,-12),
 'cage-wood':rect(76,31,-23),'pot-cracked':circle(26,-27),'crate-broken':rect(67,33,-25),'cart-burned':rect(83,29,-22),'stake-fence':rect(96,14,-12),'totem-bone':rect(59,23,-18),
 'statue-jaguar':rect(136,32,-22),'statue-warrior':rect(116,30,-22),'statue-serpent':rect(156,32,-22),
};
kit.artVersion='b7';kit.world={width:8192,height:6144,wallThickness:400,cellSize:640};
const describe=x=>({id:x.id,image:x.file,textureKey:`map-bloodmoon-${x.id}`,size:{width:x.width,height:x.height}});
kit.ground=catalog.filter(x=>x.category==='ground').map(describe);
kit.glows=catalog.filter(x=>x.category==='glow').map(describe);
kit.waterArt=catalog.filter(x=>x.category==='water').map(describe);
kit.structureArt=catalog.filter(x=>x.category==='structures').map(x=>{
 const item={...describe(x),anchor:{x:.5,y:1},level:0};
 if(x.id.startsWith('stairs-')){const dir=x.id.at(-1);Object.assign(item,{kind:'stairs',axis:['n','s'].includes(dir)?'y':'x',ascending:dir,fromLevel:0,toLevel:1,rails:true,approved:true});}
 else Object.assign(item,{kind:x.id.startsWith('bridge-')?'bridge':x.id.startsWith('wall-')?'wall':'platform',rails:x.id.startsWith('bridge-')});
 return item;
});
for(const item of kit.structureArt){
 const {data,info}=await sharp(`public/assets/pixel/${item.image}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 item.artBounds={x:left,y:top,width:right-left+1,height:bottom-top+1};
 // Native rail footprints describe the visible sides; the assembler scales
 // these art pieces to its authoritative walkable strip and level endpoints.
 const width=right-left+1,height=bottom-top+1,cx=(left+right)/2-item.size.width/2,cy=(top+bottom)/2-item.size.height;
 item.footprint=rect(width,height,cy,cx);
 if(item.rails){const alongY=item.axis==='y'||item.id==='bridge-v',rail=12;
  item.railFootprints=[-1,1].map(side=>alongY?rect(rail,height,cy,cx+side*(width-rail)/2):rect(width,rail,cy+side*(height-rail)/2,cx));
 }
}
for(const x of catalog.filter(x=>!['ground','glow','water','structures'].includes(x.category))){
 let item=kit.items.find(i=>i.id===x.id);if(!item){item={id:x.id,category:x.category,description:x.description};kit.items.push(item);}
 Object.assign(item,describe(x),{anchor:{x:.5,y:1},size:{width:x.width,height:x.height,minScale:.85,maxScale:1.12},level:0,depthOffset:0,collider:measured[x.id]||{type:'none',offsetX:0,offsetY:0}});
 item.footprint={...item.collider};
 item.kind=x.category==='trees'?'tree':x.category==='statues'?'statue':x.id==='gate-ruined'||x.id==='chains'?'arch':/hut-burned|ossuary/.test(x.id)?'house':item.breakable?'breakable':x.category==='buildings'?'statue':item.collider.type==='none'?'decoration':'rock';
 const tall=['tree','house','arch'].includes(item.kind);item.fadeBehind=tall;const ratio=item.kind==='tree'?.66:item.kind==='arch'?.40:.48;
 item.occluder=tall?{x:-x.width/2,y:-x.height,width:x.width,height:Math.round(x.height*ratio)}:null;item.overhead=tall?{cropRatio:ratio}:null;
 item.lightSource=['torch-post-lit','torch-ground','brazier-stone','ritual-platform'].includes(x.id);
 item.light=item.lightSource;item.lightEnabled=item.lightSource;item.lightColor='torch';item.lightOffsetY=item.lightSource?-Math.round(x.height*.7):0;
 item.door=item.kind==='house'?{x:0,y:-8,facing:'south',closed:true,width:Math.round(x.width*.23),height:Math.round(x.height*.30),authored:true}:null;
 item.baseReview={source:'B7 inspected base measurements',tolerancePx:8};
}
const after=JSON.stringify(kit,null,2)+'\n';console.log(`*** Begin Patch\n*** Update File: ${file}\n@@\n${before.trimEnd().split(/\r?\n/).map(l=>'-'+l).join('\n')}\n${after.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch`);
