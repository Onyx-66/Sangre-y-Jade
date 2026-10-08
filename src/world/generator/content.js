// Map set pieces: reachable door spurs, usable landmark tops, stilt huts and
// bridge-side rails. Named RNG streams keep content independent of vegetation.
import {WORLD_CONFIGS} from '../configs/index.js';
import {randomStream} from '../seed.js';
import {assemblePyramid} from '../assemblies.js';
import {sweepMove} from '../geometry.js';
import {candidate,boundsOf,canPlace} from './structures.js';
import {CELL,indexAt,pointAt,neighbors} from './grid.js';
const directions={south:[0,1],north:[0,-1],east:[1,0],west:[-1,0]};
const samples=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/16));return Array.from({length:steps+1},(_,i)=>({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}));};
const solids=w=>w.objects.flatMap(o=>o.solidParts?.map(collider=>({...o,collider}))||[o]).filter(o=>o.collider.type!=='none');
function clearSegment(w,a,b,extra=[]){const out=sweepMove(a,b,11,()=>[...solids(w),...extra],0);return Math.hypot(out.x-b.x,out.y-b.y)<.01;}
function faceDoor(o,target){
 if(o.door?.authored)return {x:o.x+o.door.x*o.scale,y:o.y+(o.door.y+28)*o.scale};
 const b=boundsOf(o),cx=b.x+b.width/2,cy=b.y+b.height/2,dx=target.x-cx,dy=target.y-cy;
 const facing=Math.abs(dx)>Math.abs(dy)?dx>0?'east':'west':dy>0?'south':'north',[vx,vy]=directions[facing];
 const at={x:cx+vx*b.width/2,y:cy+vy*b.height/2};
 o.door={...(o.door||{}),closed:true,facing,x:(at.x-o.x)/o.scale,y:(at.y-o.y)/o.scale,width:34,height:62};
 return {x:at.x+vx*28,y:at.y+vy*28};
}
function addDoor(w,o,site){
 if(!o.door)return true;const approach=faceDoor(o,site),routes=[[approach,site]];
 // Painted south doors cannot be rotated to another wall. A side spur brings
 // the path to the actual door when the plaza lies behind the building.
 if(o.door.authored){const b=boundsOf(o);for(const x of [b.x-40,b.x+b.width+40])routes.push([approach,{x,y:approach.y},{x,y:site.y},site]);}
 for(const route of routes){const points=route.slice(1).flatMap((p,i)=>samples(route[i],p));
  if(points.some(p=>w.water.mask[indexAt(w,p.x,p.y)]&&!w.bridgeMask[indexAt(w,p.x,p.y)])||route.slice(1).some((p,i)=>!clearSegment(w,route[i],p,[o])))continue;
  w.doorPaths.push({owner:o.worldId,site:site.id,points,approach,target:{x:site.x,y:site.y}});o.doorApproach=approach;return true;
 }return false;
}
function landmark(w,kit,site,config,random){
 const rule=config.landmark,faces=rule.randomFaces?rule.faces.slice(0,1+Math.floor(random()*rule.faces.length)):rule.faces;
 const options={id:site.id,x:site.x,y:site.y-220,width:rule.width,tiers:rule.tiers,faces,stairWidth:96};
 const a=assemblePyramid(options);site.assembly=options;w.stairs.push(...a.stairs);w.surfaces.push(...a.surfaces);w.assemblySolids.push(...a.solids);
 const focus=kit.items.find(i=>i.id===rule.top),top=candidate(focus,options.x-(focus.collider.offsetX||0)*.22,options.y-(focus.collider.offsetY||0)*.22,.22);top.level=rule.tiers;top.role='platform-focus';top.siteId=site.id;top.door=null;top.lightSource=config.lights.includes(top.id);w.objects.push(top);site.topObject=top.worldId;
 if(rule.edgeGate){const gate=candidate(kit.items.find(i=>i.id===rule.edgeGate),site.x+384,site.y,.4);gate.siteId=site.id;gate.role='shore-gate';w.objects.push(gate);}
}
function settlement(w,kit,site,config,random){
 const count=config.buildingRange[0]+Math.floor(random()*(config.buildingRange[1]-config.buildingRange[0]+1));site.buildingCount=0;
 for(let n=0;n<count;n++)for(let attempt=0;attempt<160;attempt++){
  const angle=(n/count+attempt*.137)*Math.PI*2,d=300+random()*80,item=kit.items.find(i=>i.id===config.houses[n%config.houses.length]);
  const o=candidate(item,site.x+Math.cos(angle)*d,site.y+Math.sin(angle)*d,config.buildingScale||.55);o.siteId=site.id;o.role='village-house';
  if(!canPlace(w,o,{site:true})||!addDoor(w,o,site))continue;w.objects.push(o);site.buildingCount++;break;
 }if(site.buildingCount<3)throw Error('Settlement needs three reachable houses');
}
function dockVillage(w,kit,site,config){
 site.buildingCount=3;
 for(let n=0;n<3;n++){
  const o=candidate(kit.items.find(i=>i.id===config.houses[n%2]),site.x+(n-1)*256,1024,.42);o.siteId=site.id;o.role='dock-house';o.kind='dock';
  // Only four stilts block at water level; the roof/walls are not a solid box.
  const c=o.collider,half=c.width/2-10,near=c.offsetY+c.height/2-10,far=c.offsetY-c.height/2+10;
  o.solidParts=[[-half,far],[half,far],[-half,near],[half,near]].map(([offsetX,offsetY])=>({type:'circle',radius:10,offsetX,offsetY}));
  const target={x:o.x,y:site.y},approach=faceDoor(o,target);
  const points=[...samples(approach,target),...samples(target,site)];
  for(const p of points)for(const dx of [-24,24])for(const dy of [-24,24]){const i=indexAt(w,p.x+dx,p.y+dy);if(w.water.mask[i])w.bridgeMask[i]=1;w.roadMask[i]=1;}
  w.doorPaths.push({owner:o.worldId,site:site.id,points,approach,target:{x:site.x,y:site.y}});o.doorApproach=approach;
  w.objects.push(o);
 }
}
function setPiece(w,kit,site,config){
 const ids=config.setPieces[site.kind]||[];site.buildingCount=0;
 if(site.kind==='island'){
  const o=candidate(kit.items.find(i=>i.id==='shrine-island'),site.x,site.y-144,.35);o.siteId=site.id;o.role='island-shrine';
  if(!addDoor(w,o,site))throw Error('Island shrine door');w.objects.push(o);site.buildingCount=1;return;
 }
 if(site.kind==='ruins'&&config.id==='overgrown'){
  for(const dy of [-384,384]){
   const row=[-176,0,176].map(dx=>candidate(kit.items.find(i=>i.id===config.wall),site.x+dx,site.y+dy,.45));
   if(!row.every(o=>canPlace(w,o,{site:true})))continue;
   for(const o of row){o.siteId=site.id;o.role='wall-run';w.objects.push(o);}site.buildingCount=3;return;
  }
  throw Error('Ruined wall run obstructed');
 }
 for(let n=0;n<ids.length;n++){
  const item=kit.items.find(i=>i.id===ids[n]);if(!item)throw Error(`Missing catalog item ${ids[n]}`);
  for(let attempt=0;attempt<32;attempt++){
   const angle=attempt*Math.PI/8,o=candidate(item,site.x+Math.cos(angle)*320,site.y+Math.sin(angle)*320,config.structureScales?.[item.id]||.45);o.siteId=site.id;o.role=site.kind;
   if(!canPlace(w,o,{site:true})||!addDoor(w,o,site))continue;w.objects.push(o);site.buildingCount++;break;
  }
 }if(site.buildingCount<ids.length)throw Error(`Incomplete ${site.kind}`);
}
function torches(w,kit,config){
 if(!config.torchAvenues)return;const item=kit.items.find(i=>i.id==='torch-post-lit');let count=0;
 for(const path of w.paths.filter(p=>!p.repair))for(let n=2;n<path.points.length;n+=3){const p=path.points[n],before=path.points[n-1],vertical=p.y!==before.y;for(const side of [-1,1]){
  const o=candidate(item,p.x+(vertical?side*384:0),p.y+(vertical?0:side*384),.65);o.role='avenue-light';o.lightSource=true;
  if(canPlace(w,o,{site:true})){w.objects.push(o);count++;}
 }}if(!count)throw Error('Torch avenue missing');
}
function supplies(w,kit){
 const item=kit.items.find(i=>i.breakable);
 for(const site of w.sites.filter(s=>s.kind==='settlement')){
  let placed=false;
  for(let n=0;n<96;n++){const angle=n*Math.PI/12,d=400+Math.floor(n/24)*32,o=candidate(item,site.x+Math.cos(angle)*d,site.y+Math.sin(angle)*d,.7);o.siteId=site.id;o.role='village-supplies';if(!canPlace(w,o,{site:true}))continue;w.objects.push(o);placed=true;break;}
  if(!placed)throw Error('Village supply footprint obstructed');
 }
}
function landmarkLights(w,kit){
 if(w.mapId!=='cenote')return;
 const item=kit.items.find(i=>i.id==='lantern-hanging');
 for(const site of w.sites.filter(s=>['landmark','island'].includes(s.kind))){
  const o=candidate(item,site.x-(site.kind==='landmark'?320:128),site.y+(site.kind==='landmark'?-32:96),.65);
  o.role='landmark-light';o.siteId=site.id;o.lightSource=true;o.lightEnabled=true;w.objects.push(o);
 }
}
function bridgeRails(w,config){
 w.bridgeRails=[];
 for(let i=0;i<w.bridgeMask.length;i++)if(w.bridgeMask[i]){
  const p=pointAt(w,i);for(const k of neighbors(w,i))if(w.water.mask[k]&&!w.bridgeMask[k]){
   const q=pointAt(w,k),vertical=p.x!==q.x,id=`bridge-rail-${i}-${k}`;
   const style=config.bridgeStyle==='rope-and-wood'?(p.y<0?'rope':'wood'):config.bridgeStyle;
   const rail={id,worldId:id,kind:'wall',role:'bridge-rail',level:0,x:(p.x+q.x)/2,y:(p.y+q.y)/2,scale:1,style,
    collider:{type:'rect',width:vertical?6:CELL,height:vertical?CELL:6,offsetX:0,offsetY:0},size:{width:vertical?6:CELL,height:vertical?CELL:6},anchor:{x:.5,y:.5}};
   w.bridgeRails.push(rail);w.assemblySolids.push(rail);
  }
 }
}
export function buildMapContent(w,kit){
 const config=WORLD_CONFIGS[w.mapId],random=randomStream(w.derivedSeed,'buildings');w.objects=[];w.stairs=[];w.surfaces=[];w.assemblySolids=[];w.doorPaths=[];
 w.content={biomes:config.biomes,water:config.water,ground:config.ground,spawn:config.spawn};
 for(const site of w.sites){if(site.kind==='landmark')landmark(w,kit,site,config,random);else if(site.docks)dockVillage(w,kit,site,config);else if(site.kind==='settlement')settlement(w,kit,site,config,random);else setPiece(w,kit,site,config);}
 supplies(w,kit);landmarkLights(w,kit);torches(w,kit,config);bridgeRails(w,config);
 for(const o of w.objects)if(config.lights.includes(o.id))o.lightSource=true;
}
