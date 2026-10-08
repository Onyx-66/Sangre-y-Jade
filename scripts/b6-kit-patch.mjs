// Compile inspected B6 base measurements into a source patch. No art or audio
// is generated here; coordinates are native pixels relative to bottom centre.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const file='src/data/mapKits/overgrown.json',before=await fs.readFile(file,'utf8'),kit=JSON.parse(before);
const catalog=JSON.parse(await fs.readFile('docs/v0.6/sources/b6/catalog.json','utf8'));
const rect=(width,height,offsetY=-height/2-3,offsetX=0)=>({type:'rect',width,height,offsetX,offsetY});
const circle=(radius,offsetY=-radius-3,offsetX=0)=>({type:'circle',radius,offsetX,offsetY});
// Measured visible bases, excluding canopy/roof and soft shadows.
const measured={
 'tree-broadleaf-a':circle(24),'tree-broadleaf-b':circle(23),'tree-palm-a':circle(19),'tree-palm-b':circle(29),
 'tree-ceiba':circle(68),'tree-fig':circle(46),'tree-flowering-pink':circle(24),'tree-fruit-orange':circle(25),'tree-willow':circle(29),'tree-sapling':circle(13),
 'rock-mossy-large':circle(75,-78),'rock-mossy-small':circle(36,-39),'rock-slab':circle(44,-47),'rubble-pile':circle(55,-58),
 'stela-fallen':rect(168,45,-27),'stela-standing':rect(133,53,-30),
 'temple-central':rect(620,185,-98),'temple-wall-a':rect(325,55,-32),'temple-wall-corner':rect(258,83,-47),
 'hut-thatched-a':rect(253,60,-35),'hut-thatched-b':rect(284,64,-36),'hut-thatched-c':rect(365,69,-40),
 'market-stall-a':rect(260,52,-30),'market-stall-b':rect(275,58,-34),'altar':rect(217,42,-25),'shrine-small':rect(216,60,-35),'fountain-dry':circle(62,-66),
 'pot-clay-a':circle(24),'pot-clay-b':circle(27),'basket-woven':circle(32),'barrel-wood':circle(34),'crate-wood':rect(84,34,-22),
 'well-stone':circle(48),'torch-post':circle(12),'fence-wood':rect(145,14,-10),'cart-wooden':rect(124,40,-25),'sign-carved':rect(66,29,-18),
 'statue-jaguar':rect(158,46,-27),'statue-warrior':rect(120,42,-25),'statue-serpent':rect(129,40,-24),
 'log-fallen':rect(132,28,-19),'stump':circle(30),
};
kit.artVersion='b6';kit.world={width:8192,height:6144,wallThickness:400,cellSize:640};
const describe=x=>({id:x.id,image:x.file,textureKey:`map-overgrown-${x.id}`,size:{width:x.width,height:x.height}});
kit.ground=catalog.filter(x=>x.category==='ground').map(describe);
kit.waterArt=catalog.filter(x=>x.category==='water').map(describe);
kit.structureArt=catalog.filter(x=>x.category==='structures').map(x=>{
 const item={...describe(x),anchor:{x:.5,y:1},level:0};
 if(x.id.startsWith('stairs-')){const dir=x.id.at(-1);Object.assign(item,{kind:'stairs',axis:['n','s'].includes(dir)?'y':'x',ascending:dir,fromLevel:0,toLevel:1,rails:true,approved:dir!=='s'});}
 else Object.assign(item,{kind:x.id.startsWith('bridge-')?'bridge':x.id.startsWith('wall-')?'wall':'platform',rails:x.id.startsWith('bridge-')});
 return item;
});
for(const item of kit.structureArt){
 const {data,info}=await sharp(`public/assets/pixel/${item.image}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 item.artBounds={x:left,y:top,width:right-left+1,height:bottom-top+1};
}
for(const x of catalog.filter(x=>!['ground','weather','water','structures'].includes(x.category))){
 let item=kit.items.find(i=>i.id===x.id);if(!item){item={id:x.id,category:x.category,description:x.description};kit.items.push(item);}
 Object.assign(item,describe(x),{anchor:{x:.5,y:1},size:{width:x.width,height:x.height,minScale:.85,maxScale:1.12},level:0,depthOffset:0,collider:measured[x.id]||{type:'none',offsetX:0,offsetY:0}});
 item.footprint={...item.collider};item.kind=x.category==='trees'?'tree':x.category==='statues'||x.id.startsWith('stela')?'statue':x.category==='buildings'?/wall/.test(x.id)?'wall':/hut|stall|shrine|temple-central/.test(x.id)?'house':'statue':item.breakable?'breakable':item.collider.type==='none'?'decoration':'rock';
 const tall=['tree','house'].includes(item.kind);item.fadeBehind=tall;const ratio=item.kind==='tree'?.66:.48;
 item.occluder=tall?{x:-x.width/2,y:-x.height,width:x.width,height:Math.round(x.height*ratio)}:null;item.overhead=tall?{cropRatio:ratio}:null;
 item.lightSource=false;item.light=false;item.lightEnabled=false;
 item.door=item.kind==='house'?{x:0,y:-5,facing:'south',closed:true,width:Math.round(x.width*.23),height:Math.round(x.height*.40),authored:true}:null;
 item.baseReview={source:'B6 inspected base measurements',tolerancePx:8};
}
const after=JSON.stringify(kit,null,2)+'\n';console.log(`*** Begin Patch\n*** Update File: ${file}\n@@\n${before.trimEnd().split(/\r?\n/).map(l=>'-'+l).join('\n')}\n${after.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch`);
