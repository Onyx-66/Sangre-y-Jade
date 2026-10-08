// B8 art and renderer contracts: exact assets, unique data, periodic edges,
// level-direction mapping and bounded camera-local terrain reuse.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {MAP_KITS} from '../src/data/mapDefinitions.js';
import {WorldArt,TERRAIN_SPRITE_CAP,stairArtId,stairRuns} from '../src/world/generator/WorldArt.js';
const catalog=JSON.parse(await fs.readFile('docs/v0.6/sources/b8/catalog.json','utf8'));
test('B8 has 89 distinct correctly-sized files, clean keying and periodic tiles',async()=>{
 assert.equal(catalog.length,89);const hashes=new Set();
 for(const x of catalog){const {data,info:{width:w,height:h}}=await sharp(`public/assets/pixel/${x.file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(w,x.width,x.id);assert.equal(h,x.height,x.id);const hash=createHash('sha256').update(data).digest('hex');assert.ok(!hashes.has(hash),x.id);hashes.add(hash);
  let pixels=0;for(let p=0;p<data.length;p+=4){if(data[p+3]>20)pixels++;assert.ok(!(data[p+3]>50&&data[p]>210&&data[p+2]>210&&data[p+1]<45),`pink ${x.id}`);}assert.ok(pixels>5,x.id);
  if(x.fullBleed||x.id==='foam-edge')for(let y=0;y<h;y++)assert.deepEqual(data.subarray(y*w*4,y*w*4+4),data.subarray((y*w+w-1)*4,(y*w+w)*4),x.id);
  if(x.fullBleed)for(let col=0;col<w;col++)assert.deepEqual(data.subarray(col*4,col*4+4),data.subarray(((h-1)*w+col)*4,((h-1)*w+col)*4+4),x.id);
 }
});
test('tier stair art forms one continuous strip per face without altering collision levels',()=>{
 const stairs=[0,1,2].flatMap(i=>['north','south'].map(face=>({id:`p-stairs-${i+1}-${face}`,width:96,fromLevel:i,toLevel:i+1,from:{x:0,y:(face==='north'?-1:1)*(172-i*40)},to:{x:0,y:(face==='north'?-1:1)*(132-i*40)}})));
 const runs=stairRuns(stairs);assert.equal(runs.length,2);assert.equal(stairs.length,6);assert.ok(runs.every(s=>s.fromLevel===0&&s.toLevel===3&&Math.abs(s.to.y-s.from.y)===120));
});
test('B8 bases, closed doors, explicit stair axes and coloured light metadata are consistent',()=>{
 const k=MAP_KITS.cenote;assert.equal(k.artVersion,'b8');
 for(const x of k.items){assert.deepEqual(x.anchor,{x:.5,y:1});assert.deepEqual(x.footprint,x.collider);if(x.category==='trees'&&x.id!=='root-giant')assert.equal(x.collider.type,'circle');if(x.category==='statues')assert.equal(x.collider.type,'rect');if(x.door){assert.equal(x.door.closed,true);assert.equal(x.door.authored,true);assert.ok(x.door.height>=x.size.height*.27);}}
 for(const colour of ['cyan','violet','green']){const item=k.items.find(x=>x.id===`crystal-${colour}`);assert.equal(item.lightEnabled,true);assert.equal(item.lightColor,colour);}
 const stairs=k.structureArt.filter(x=>x.kind==='stairs');assert.equal(stairs.length,4);assert.deepEqual(stairs.map(x=>x.ascending),['n','s','e','w']);assert.ok(stairs.every(x=>x.rails&&x.toLevel===x.fromLevel+1&&x.railFootprints.length===2));
 for(const [dir,x,y]of [['n',0,-40],['s',0,40],['e',40,0],['w',-40,0]])assert.equal(stairArtId({from:{x:0,y:0},to:{x,y}}),`stairs-stone-${dir}`);
});
test('terrain pool is bounded, water frames advance, reduced motion freezes and destroy releases sprites',()=>{
 const images=[];const image=()=>{const o={key:'',dead:false,setTexture(v){this.key=v;return this;},setDisplaySize(w,h){this.size=[w,h];return this;},destroy(){this.dead=true;}};for(const n of ['setDepth','setPosition','setAlpha','setTint','setVisible'])o[n]=()=>o;images.push(o);return o;};
 const w={mapId:'cenote',size:{width:8192,height:6144},columns:64,rows:48,interior:Array(3072).fill(1),water:{mask:Array(3072).fill(2)},bridgeMask:Array(3072).fill(0),roadMask:Array(3072).fill(0),biomes:Array(3072).fill(0),sites:[],stairs:[],doorPaths:[]};
 const g=new Proxy({destroy(){}},{get:(t,k)=>t[k]||(()=>g)}),scene={settings:{},textures:{exists:()=>true},add:{image,graphics:()=>g},cameras:{main:{worldView:{x:0,y:0,width:1280,height:720}}}};
 const art=new WorldArt(scene,w);art.update(0);assert.ok(art.pool.some(x=>x.key.endsWith('deep-0')));assert.ok(art.pool.every(x=>x.size[0]===128&&x.size[1]===128),'no double-alpha seams between night tiles');art.update(181);assert.ok(art.pool.some(x=>x.key.endsWith('deep-1')));
 assert.ok(art.image('stairs-stone-s',0,0,96,120),'approved south stairs load for Cenote');
 scene.settings.reducedMotion=true;art.update(542);assert.ok(art.pool.every(x=>x.key.endsWith('deep-0')));
 for(let n=0;n<600;n++){scene.cameras.main.worldView.x=(n%20)*128-1280;art.update(n*16);}assert.ok(art.pool.length<=TERRAIN_SPRITE_CAP);art.destroy();assert.ok(images.every(x=>x.dead));
});

test('B8 shallow banks are brighter than deep water and glow chroma survives keying',async()=>{
 const mean=async id=>{const {data}=await sharp('public/assets/pixel/maps/cenote/'+id+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});let r=0,g=0,b=0,a=0;
 for(let p=0;p<data.length;p+=4){const weight=data[p+3]/255;r+=data[p]*weight;g+=data[p+1]*weight;b+=data[p+2]*weight;a+=weight;}return [r/a,g/a,b/a];};
 for(let frame=0;frame<4;frame++){const shallow=await mean('water/water-shallow-'+frame),deep=await mean('water/water-deep-'+frame);assert.ok(shallow[1]>deep[1]+35,'clear shallows/depth contrast');}
 const violet=await mean('glow-violet'),cyan=await mean('glow-cyan'),green=await mean('glow-green');
 assert.ok(violet[2]>violet[1]*1.3&&violet[0]>violet[1]*.65,'violet must not become cyan');
 assert.ok(cyan[1]>cyan[0]*1.5&&cyan[2]>cyan[0]*1.5);assert.ok(green[1]>green[0]&&green[1]>green[2]);
});
test('B8 authored root arch feet and stilt huts retain separate colliders',()=>{
 const k=MAP_KITS.cenote,arch=k.items.find(x=>x.id==='root-giant');assert.equal(arch.solidParts.length,2);assert.ok(arch.solidParts.every(x=>x.type==='circle'));
 for(const hut of k.items.filter(x=>x.id.startsWith('dock-hut'))){assert.equal(hut.solidParts.length,4);assert.ok(hut.solidParts.every(x=>x.type==='circle'&&x.radius===14));}
});

test('B8 bridge gaps contain no purple matte and soft glows have translucent falloff',async()=>{
 for(const id of ['bridge-h','bridge-v']){const data=await sharp(`public/assets/pixel/maps/cenote/structures/${id}.png`).ensureAlpha().raw().toBuffer();
  for(let p=0;p<data.length;p+=4)assert.ok(!(data[p+3]>30&&data[p]>data[p+1]+20&&data[p+2]>data[p+1]+20),id);
 }
 for(const colour of ['cyan','violet','green']){const data=await sharp(`public/assets/pixel/maps/cenote/glow-${colour}.png`).ensureAlpha().raw().toBuffer();let soft=0;
  for(let p=3;p<data.length;p+=4)if(data[p]>5&&data[p]<220)soft++;assert.ok(soft>4000,colour);
 }
});
