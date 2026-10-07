// Regression tests exercise actual kit footprints, not just canned rectangles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_KITS } from '../src/data/mapDefinitions.js';
import { shapeBounds,penetration,sweepMove,pushOut,firstWall } from '../src/world/geometry.js';
import { advanceStairs,stairWaypoint } from '../src/world/elevation.js';
import { assemblePyramid,assembleTemple } from '../src/world/assemblies.js';
import { WorldCollision } from '../src/world/WorldCollision.js';
import { OBJECT_KINDS } from '../src/world/objects.js';
import { generateMapLayout } from '../src/maps/layout.js';
import { applyElevation } from '../src/world/ElevationVisual.js';
import { legacyFootprint } from '../src/world/objects.js';
import { footprintBaseY,worldDepth } from '../src/render/layers.js';

test('every solid kit object stops a feet-circle sweep from 16 directions without corner cutting',()=>{
  let count=0;
  for(const kit of Object.values(MAP_KITS))for(const item of kit.items){
    assert.ok(OBJECT_KINDS[item.kind]);assert.equal(item.level,0);
    if(item.collider.type==='none')continue;
    const prop={...item,x:0,y:0,scale:1},b=shapeBounds(prop),center={x:b.x+b.width/2,y:b.y+b.height/2};
    const extent=Math.hypot(b.width,b.height)+50,query=()=>[prop];
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,from={x:center.x+Math.cos(a)*extent,y:center.y+Math.sin(a)*extent};
      const to={x:center.x-Math.cos(a)*extent,y:center.y-Math.sin(a)*extent};
      const p=sweepMove(from,to,11,query);
      assert.equal(penetration(p,11,prop),null,`${kit.id}/${item.id}/${i}`);
      assert.ok(Math.hypot(p.x-to.x,p.y-to.y)>1,'cannot teleport to opposite side');
    }
    const pushed=pushOut(center,11,query);assert.equal(penetration(pushed,11,prop),null,item.id);
    const base=footprintBaseY(prop);assert.ok(worldDepth(base-12)<worldDepth(base)&&worldDepth(base+12)>worldDepth(base));count++;
  }
  assert.equal(count,Object.values(MAP_KITS).flatMap(k=>k.items).filter(i=>i.collider.type!=='none').length);
  assert.ok(count>50,'exercise the shipped kits, not an empty catalog');
});
test('polygon corners, same-floor walls and fast projectiles use exact geometry',()=>{
  const item={x:0,y:0,level:1,collider:{type:'polygon',points:[[-40,-40],[40,-40],[40,40],[-40,40]]}};
  const query=()=>[item],from={x:-100,y:-100},to={x:100,y:100};
  const pass=sweepMove(from,to,11,query,0);assert.ok(Math.hypot(pass.x-to.x,pass.y-to.y)<1e-6);
  const p=sweepMove(from,to,11,query,1);assert.ok(p.x<0||p.y<0);assert.equal(penetration(p,11,item),null);
  assert.equal(firstWall(from,to,3,query,0),null);assert.equal(firstWall(from,to,3,query,1),item);
});
const stair={id:'steps',from:{x:0,y:100},to:{x:0,y:0},fromLevel:0,toLevel:1,width:64};
test('stairs permit axis entry and interpolate height, but reject sides and knockback',()=>{
  const initial={level:0,heightLevel:0},from={x:0,y:110},to={x:0,y:50};
  const half=advanceStairs(initial,from,to,[stair]);assert.equal(half.stairId,'steps');assert.equal(half.heightLevel,.5);assert.equal(half.level,0);
  const end=advanceStairs(half,to,{x:0,y:-1},[stair]);assert.equal(end.level,1);assert.equal(end.stairId,null);
  assert.equal(advanceStairs(initial,from,to,[stair],{knockback:true}).level,0);
  const side=advanceStairs(initial,{x:80,y:50},to,[stair]);assert.equal(side.stairId,undefined);
  const blocked=advanceStairs(half,to,{x:80,y:50},[stair]);assert.deepEqual(blocked.position,to);
});
test('enemy stair waypoint traverses gate, ascends and reaches hero level',()=>{
  let actor={x:0,y:145,level:0,heightLevel:0};const target={x:0,y:-20,level:1};
  for(let i=0;i<100&&actor.level!==1;i++){
    const goal=stairWaypoint(actor,target,[stair]),d=Math.hypot(goal.x-actor.x,goal.y-actor.y)||1;
    const to={x:actor.x+(goal.x-actor.x)/d*Math.min(d,5),y:actor.y+(goal.y-actor.y)/d*Math.min(d,5)};
    const next=advanceStairs(actor,actor,to,[stair]);actor={...next,...next.position};
  }
  assert.equal(actor.level,1);
});
test('solid breakables persist until hash removal; fliers pass and spawned allies push out',()=>{
  let items=[{worldId:'pot',level:0,x:0,y:0,breakable:true,collider:{type:'circle',radius:20}}];
  const world={scene:{elapsed:0},layout:{},blockersAround:()=>items};const system=new WorldCollision(world);
  const make=(x,y)=>({active:true,x,y,data:{},getData(k){return this.data[k];},setData(k,v){this.data[k]=v;},setPosition(x,y){this.x=x;this.y=y;}});
  const actor=make(-50,0);system.track(actor);actor.x=50;system.resolve(actor);assert.ok(actor.x<-20);
  const ally=make(0,0);system.resolve(ally);assert.ok(Math.hypot(ally.x,ally.y)>=31);
  const flier=make(-50,0);system.track(flier,{flier:true});flier.x=50;system.resolve(flier);assert.equal(flier.x,50);
  items=[];actor.x=50;system.resolve(actor);assert.ok(Math.abs(actor.x-50)<1e-6);
});
test('pyramid and temple emit four-face stairs, wall rails and elevated platforms',()=>{
  const pyramid=assemblePyramid({tiers:3,faces:['north','south','east','west']});
  assert.equal(pyramid.stairs.length,12);assert.equal(pyramid.surfaces.length,3);
  assert.equal(pyramid.solids.length,24);assert.ok(pyramid.solids.every(s=>s.levels.length===2));
  assert.equal(assembleTemple().solids.at(-1).door.closed,true);
  assert.throws(()=>assemblePyramid({faces:['sideways']}));
});
test('WorldCollision rejects side stair entry and keeps knockback on its floor',()=>{
  const map={scene:{elapsed:0},layout:{stairs:[stair]},blockersAround:()=>[]},system=new WorldCollision(map);
  const data={},actor={active:true,x:80,y:50,getData:k=>data[k],setData(k,v){data[k]=v;},setPosition(x,y){this.x=x;this.y=y;}};
  system.track(actor);actor.x=0;system.resolve(actor);assert.ok(actor.x>=stair.width/2+11);
});
test('arches and bridges leave a real passage between separate pillar/rail footprints',()=>{
  const layout=generateMapLayout('cenote',MAP_KITS.cenote,51);
  const arch=layout.placements.find(p=>p.kind==='arch');assert.ok(arch);
  const parts=layout.colliders.filter(p=>p.ownerId===arch.worldId);assert.equal(parts.length,2);
  const y=arch.y+arch.collider.offsetY*arch.scale;
  const from={x:arch.x,y:y-arch.collider.height*arch.scale},to={x:arch.x,y:y+arch.collider.height*arch.scale};
  const p=sweepMove(from,to,11,()=>parts);assert.ok(Math.hypot(p.x-to.x,p.y-to.y)<1e-6);
});
test('legacy bottom-centre footprint adaptation does not put Blood Moon walls below their art',()=>{
  for(const item of MAP_KITS.bloodmoon.items){
    if(item.collider.type==='none')continue;
    const b=shapeBounds({...item,x:0,y:0,scale:1});
    assert.ok(b.y+b.height<=(1-item.anchor.y)*item.size.height+8,item.id);
  }
  const root=legacyFootprint('top-roots',{width:192,height:192});assert.equal(root.radius,25);
});
test('elevation rendering restores origins and body offsets without moving world feet or alpha',()=>{
  const data={},actor={x:10,y:20,height:128,scaleY:.5,originX:.5,originY:.5,alpha:.8,
    getData:k=>data[k],setData(k,v){data[k]=v;},setOrigin(x,y){this.originX=x;this.originY=y;},
    body:{offset:{x:5,y:8},setOffset(x,y){this.offset={x,y};}}};
  applyElevation(actor,48);assert.equal(actor.originY,1.25);assert.equal(actor.body.offset.y,104);
  assert.equal(actor.y,20);assert.equal(actor.alpha,.8);
  applyElevation(actor,0);assert.equal(actor.originY,.5);assert.equal(actor.body.offset.y,8);
});
