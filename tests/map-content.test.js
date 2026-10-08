// B5 content gates cover 100 seeds/map and mutate geometry to prove rejection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld} from '../src/world/generator/index.js';
import {validateStructures,contentQuery,walkRoute} from '../src/world/generator/validateContent.js';
import {WORLD_CONFIGS} from '../src/world/configs/index.js';
import {indexAt} from '../src/world/generator/grid.js';
import {WorldCollision} from '../src/world/WorldCollision.js';

test('100 seeds per map have reachable doors, useful platforms, unique content and real water bridges',{timeout:180000},()=>{
 for(const map of Object.keys(WORLD_CONFIGS))for(let seed=0;seed<100;seed++){
  const w=generateWorld(map,`content-${seed}`),config=WORLD_CONFIGS[map];assert.deepEqual(validateStructures(w),[],`${map}/${seed}`);
  assert.equal(w.sites.filter(s=>s.kind==='settlement').length,map==='overgrown'?2:1);
  assert.deepEqual(w.content.water,config.water);assert.ok(w.objects.some(o=>o.role==='platform-focus'));
  assert.ok(w.sites.filter(s=>s.kind==='settlement').every(s=>s.buildingCount>=3&&s.buildingCount<=7));
  for(const o of w.objects.filter(o=>o.door)){
   const p=w.doorPaths.find(p=>p.owner===o.worldId),v={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]}[o.door.facing];
   const door={x:o.x+o.door.x*o.scale,y:o.y+o.door.y*o.scale};
   assert.ok((p.approach.x-door.x)*v[0]+(p.approach.y-door.y)*v[1]>0,'door faces its reachable path approach');
   assert.ok(walkRoute(p.points,contentQuery(w)),'door path reaches plaza without passing through walls');
  }
  for(let i=0;i<w.bridgeMask.length;i++)if(w.bridgeMask[i])assert.ok(w.water.mask[i],'no bridges on land');
  if(map==='overgrown'){assert.ok(w.objects.filter(o=>o.role==='wall-run').length>=3);assert.ok(w.sites[0].assembly.faces.length>=1&&w.sites[0].assembly.faces.length<=4);}
  if(map==='bloodmoon'){assert.equal(w.sites[0].assembly.faces.length,2);assert.ok(w.objects.some(o=>o.id==='ossuary'));assert.ok(w.objects.filter(o=>o.role==='avenue-light'&&o.lightSource).length>2);}
  if(map==='cenote'){assert.ok(w.lake);assert.ok(w.objects.some(o=>o.role==='island-shrine'));assert.ok(w.objects.some(o=>o.role==='shore-gate'));assert.equal(w.objects.filter(o=>o.role==='landmark-light'&&o.lightSource&&o.lightEnabled).length,2);for(const o of w.objects.filter(o=>o.role==='dock-house')){assert.equal(o.solidParts.length,4);assert.equal(w.water.mask[indexAt(w,o.x,o.y)],1);}}
 }
});
test('collision bot reaches a settlement and the landmark top on every map',()=>{
 for(const map of Object.keys(WORLD_CONFIGS)){
  const w=generateWorld(map,'b5-preview'),query=contentQuery(w),site=w.sites.find(s=>s.kind==='settlement'),path=w.paths.find(p=>p.to.x===site.x&&p.to.y===site.y);
  assert.ok(walkRoute([{x:0,y:0},...path.points,site],query));
  const stair=w.stairs.find(s=>s.id.endsWith('1-south')),data={},actor={active:true,x:stair.from.x,y:stair.from.y+20,getData:k=>data[k],setData(k,v){data[k]=v;},setPosition(x,y){this.x=x;this.y=y;}};
  const collision=new WorldCollision({layout:w,scene:{player:actor,elapsed:0},blockersAround:(x,y,r)=>query({x,y},r)});collision.track(actor);
  for(const s of w.stairs.filter(s=>s.id.endsWith('-south')))for(let y=actor.y;y>=s.to.y-1;y-=2){actor.y=y;collision.resolve(actor);}
  assert.equal(data.level,3,map);
 }
});
test('structure validator rejects blocked doors, missing top focus and a dock moved onto land',()=>{
 const w=generateWorld('overgrown','mutation'),p=w.doorPaths[0].approach;
 w.assemblySolids.push({x:p.x,y:p.y,level:0,scale:1,collider:{type:'rect',width:80,height:80,offsetX:0,offsetY:0}});assert.ok(validateStructures(w).some(e=>e.startsWith('door')));
 const b=generateWorld('bloodmoon','mutation');b.objects=b.objects.filter(o=>o.role!=='platform-focus');assert.ok(validateStructures(b).some(e=>e.startsWith('empty top')));
 const c=generateWorld('cenote','mutation'),dock=c.objects.find(o=>o.role==='dock-house');c.water.mask[indexAt(c,dock.x,dock.y)]=0;assert.ok(validateStructures(c).some(e=>e.startsWith('stilts')));
});
