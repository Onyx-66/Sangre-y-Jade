// B4 deterministic generation, physical route bots and seed persistence gates.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {generateWorld,hydrateWorld} from '../src/world/generator/index.js';
import {validateWorld} from '../src/world/generator/validate.js';
import {hashSeed,randomStream,valueNoise,validSeed,normalizeSeed} from '../src/world/seed.js';
import {SpatialHash} from '../src/maps/SpatialHash.js';
import {shapeBounds,sweepMove} from '../src/world/geometry.js';
import {WorldCollision} from '../src/world/WorldCollision.js';
import {SaveSystem} from '../src/systems/SaveSystem.js';
import {t,setLanguage} from '../src/i18n/index.js';

test('text/number hashing, independent streams, seed validation and portable noise',()=>{
 assert.equal(hashSeed(123),hashSeed('123'));assert.ok(validSeed('jade_123 - temple'));assert.ok(validSeed('معبد'));assert.ok(!validSeed('<script>'));assert.ok(!validSeed('x'.repeat(65)));assert.throws(()=>normalizeSeed(' '));
 const water=randomStream('jade','water'),again=randomStream('jade','water'),buildings=randomStream('jade','buildings');buildings();buildings();assert.deepEqual(Array.from({length:20},water),Array.from({length:20},again));
 assert.equal(valueNoise(2,3,4),valueNoise(2,3,4));
 const files=fs.readdirSync('src/world/generator').filter(f=>f.endsWith('.js')&&!['client.js','worker.js','GroundRenderer.js'].includes(f));
 for(const file of ['src/world/seed.js',...files.map(f=>`src/world/generator/${f}`)])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/Math\.random\s*\(|\bDate\s*[.(]/,file);
});
test('same seed hashes identically after serialization and in another Node process',()=>{
 const a=generateWorld('overgrown','portable-jade'),b=generateWorld('overgrown','portable-jade');assert.equal(a.hash,b.hash);assert.deepEqual(JSON.parse(JSON.stringify(a)),b);
 const other=execFileSync(process.execPath,['--input-type=module','-e',"import {generateWorld} from './src/world/generator/index.js';console.log(generateWorld('overgrown','portable-jade').hash)"],{encoding:'utf8'}).trim();assert.equal(a.hash,other);assert.notEqual(a.hash,generateWorld('overgrown','portable-jade-2').hash);
 console.log(`B4 portable fixture: overgrown/portable-jade = ${a.hash}`);
});
test('300 seeds per map: real validation, dry clear arenas, all sites and tiers, coverage and finite bounds',{timeout:180000},()=>{
 let max=0,minConnectivity=1,retries=0;
 for(const map of ['overgrown','bloodmoon','cenote'])for(let seed=0;seed<300;seed++){
   const start=performance.now(),w=generateWorld(map,String(seed));max=Math.max(max,performance.now()-start);retries+=w.attempt;const v=validateWorld(w);
   assert.equal(v.valid,true,`${map}/${seed}: ${v.errors}`);minConnectivity=Math.min(minConnectivity,v.connectivity);
   assert.equal(w.sites.filter(s=>s.kind==='landmark').length,1);assert.equal(w.stairs.length,3*w.sites[0].assembly.faces.length);assert.equal(w.levelMap.length,3);
   assert.deepEqual(w.size,{width:8192,height:6144});assert.equal(w.boundary.thickness,400);assert.ok(w.spawnPoints.length>20);assert.ok(w.attempt<8);
 }
 console.log(JSON.stringify({worlds:900,maxMs:max,minConnectivity,retries}));
 // CPU contention in the full suite is not a desktop benchmark; the dedicated
 // serial audit enforces the 600ms performance budget and stores measurements.
});
test('collision bot reaches every site and ascends landmark stairs for 20 seeds per map',{timeout:120000},()=>{
 let reached=0;
 for(const map of ['overgrown','bloodmoon','cenote'])for(let seed=0;seed<20;seed++){
   const w=generateWorld(map,`bot-${seed}`),layout=hydrateWorld(w),hash=new SpatialHash(256);
   for(const o of layout.colliders)hash.insert(o.worldId,o,shapeBounds(o));const query=(p,r)=>hash.query({x:p.x-r,y:p.y-r,width:r*2,height:r*2});
   for(const path of w.paths.filter(p=>!p.repair)){let p={x:0,y:0};for(const next of path.points){const q=sweepMove(p,next,11,query,0);assert.ok(Math.hypot(q.x-next.x,q.y-next.y)<.01,`${map}/${seed}: blocked path to ${JSON.stringify(path.to)} at ${JSON.stringify(next)}`);p=q;}reached++;}
   const entry=w.stairs.find(s=>s.id.endsWith('1-south')),data={},a={active:true,x:entry.from.x,y:entry.from.y+20,getData:k=>data[k],setData(k,v){data[k]=v;},setPosition(x,y){this.x=x;this.y=y;}};
   const collision=new WorldCollision({layout,scene:{player:a,elapsed:0},blockersAround:(x,y,r)=>query({x,y},r)});collision.track(a);
   for(const stair of w.stairs.filter(s=>s.id.endsWith('-south'))){for(let y=a.y;y>=stair.to.y-1;y-=2){a.y=y;collision.resolve(a);}assert.equal(data.level,stair.toLevel,`${map}/${seed}: stairs`);}
 }
 console.log(`B4 physical route bot reached ${reached} sites and 60 pyramid tops`);
});
test('validator rejects actual overlap, wet arena and broken required sites',()=>{
 const w=generateWorld('overgrown','mutations');w.objects.push({...w.objects[0],worldId:'duplicate'});assert.ok(validateWorld(w).errors.some(e=>e.startsWith('overlap')));
 const v=generateWorld('overgrown','mutations');v.sites[0].x=1e6;assert.ok(validateWorld(v).errors.some(e=>e.startsWith('site')));
 const wet=generateWorld('cenote','mutations');wet.water.mask[Math.floor(wet.rows/2)*wet.columns+Math.floor(wet.columns/2)]=2;assert.ok(validateWorld(wet).errors.includes('wet arena'));
});
test('run seeds persist without resetting older saves; all seed UI labels translate',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),storage={getItem:()=>JSON.stringify({cacao:20,totalRuns:2}),setItem(){}};Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});const save=new SaveSystem();
 save.recordRun({seed:'my-world',worldHash:'abcd',mapId:'cenote',heroId:'balam',modeId:'quick',cacao:0,survived:10,kills:1});assert.equal(save.data.lastWorld.seed,'my-world');assert.equal(save.data.cacao,20);
 for(const language of ['fr','ar']){setLanguage(language);for(const key of ['World seed','Random seed','Copy seed','Seed copied'])assert.notEqual(t(key),key);}setLanguage('en');
 if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;
});
