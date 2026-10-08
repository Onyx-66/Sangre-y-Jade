// Compile inspected B8 base measurements into a source patch. No art or audio
// is generated here; coordinates are native pixels relative to bottom centre.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const file='src/data/mapKits/cenote.json',before=await fs.readFile(file,'utf8'),kit=JSON.parse(before);
const catalog=JSON.parse(await fs.readFile('docs/v0.6/sources/b8/catalog.json','utf8'));
const rect=(width,height,offsetY=-height/2-3,offsetX=0)=>({type:'rect',width,height,offsetX,offsetY});
const circle=(radius,offsetY=-radius-3,offsetX=0)=>({type:'circle',radius,offsetX,offsetY:Math.min(offsetY,-radius-3)});
// Measured visible bases, excluding canopy/roof and soft shadows.
const measured={
 'root-hanging-a':circle(63,-49),'root-giant':rect(418,100,-47),'root-ground':circle(61,-51),
 'mushroom-giant-a':circle(49,-38),'mushroom-giant-b':circle(42,-32),'fern-cave':circle(29,-24),'tree-cave-small':circle(26,-22),'vine-glow':circle(43,-30),
 'stalagmite-a':circle(39,-30),'stalagmite-b':circle(64,-43),'crystal-cyan':circle(50,-35),'crystal-violet':circle(65,-37),'crystal-green':circle(51,-34),'boulder-wet':circle(60,-41),'boulder-large':circle(91,-77),'stone-slab-wet':circle(75,-38),
 'log-driftwood':rect(130,32,-25),
 'temple-gate-submerged':rect(620,90,-65),'shrine-island':rect(285,58,-38),
 'dock-hut-a':rect(293,52,-30),'dock-hut-b':rect(240,44,-28),
 'bridge-rope':rect(386,96,-55),'dock-planks':rect(320,88,-55),'idol-head-large':rect(392,83,-52),'stairs-water':rect(316,78,-50),'altar-water':rect(251,59,-40),'gate-small':rect(260,45,-30),
 'boat-small':rect(142,27,-20),'lantern-hanging':circle(12,-14),'crystal-lamp':circle(20,-18),'barrel-wet':circle(31,-24),
 'net-hanging':rect(143,16,-13),'pot-wet':circle(30,-25),'totem-water':rect(47,18,-15),'sign-rune':rect(57,20,-16),'rack-fish':rect(136,16,-13),'chest-old':rect(106,25,-21),
 'statue-jaguar':rect(134,36,-23),'statue-warrior':rect(109,32,-20),'statue-serpent':rect(116,34,-22),
};

kit.artVersion='b8';kit.world={width:8192,height:6144,wallThickness:400,cellSize:640};
const describe=x=>({id:x.id,image:x.file,textureKey:`map-cenote-${x.id}`,size:{width:x.width,height:x.height}});
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
 delete item.solidParts; // Old V15 pier dimensions must not survive replacement art.
 item.kind=['root-giant','temple-gate-submerged','gate-small','net-hanging','rack-fish'].includes(x.id)?'arch':x.category==='trees'?'tree':x.category==='statues'?'statue':/dock-hut/.test(x.id)?'house':/bridge-rope|dock-planks/.test(x.id)?'bridge':item.breakable?'breakable':x.category==='buildings'?'statue':item.collider.type==='none'?'decoration':'rock';
 if(x.id==='root-giant')item.solidParts=[circle(56,-42,-153),circle(56,-42,153)];
 if(x.id==='temple-gate-submerged')item.solidParts=[rect(210,42,-29,-225),rect(210,42,-29,225)];
 if(x.id==='gate-small')item.solidParts=[rect(94,34,-22,-101),rect(94,34,-22,101)];
 if(/^dock-hut/.test(x.id)){const c=item.collider;item.solidParts=[-1,1].flatMap(side=>[-1,1].map(row=>circle(14,c.offsetY+row*(c.height/2-12),side*(c.width/2-14))));}
 const tall=['tree','house','arch'].includes(item.kind);item.fadeBehind=tall;const ratio=item.kind==='tree'?.66:item.kind==='arch'?.40:.48;
 item.occluder=tall?{x:-x.width/2,y:-x.height,width:x.width,height:Math.round(x.height*ratio)}:null;item.overhead=tall?{cropRatio:ratio}:null;
 item.lightSource=['crystal-cyan','crystal-violet','crystal-green','lantern-hanging','crystal-lamp'].includes(x.id);
 item.light=item.lightSource;item.lightEnabled=item.lightSource;item.lightColor=x.id==='crystal-violet'?'violet':x.id==='crystal-green'?'green':'cyan';item.lightOffsetY=item.lightSource?-Math.round(x.height*.7):0;
 item.door=item.kind==='house'?{x:0,y:-8,facing:'south',closed:true,width:Math.round(x.width*.20),height:Math.round(x.height*.28),authored:true}:null;
 item.baseReview={source:'B8 inspected base measurements',tolerancePx:8};
}
const after=JSON.stringify(kit,null,2)+'\n';console.log(`*** Begin Patch\n*** Update File: ${file}\n@@\n${before.trimEnd().split(/\r?\n/).map(l=>'-'+l).join('\n')}\n${after.trimEnd().split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch`);
