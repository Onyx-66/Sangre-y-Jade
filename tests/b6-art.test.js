// B6 art and renderer contracts: exact assets, unique data, periodic edges,
// level-direction mapping and bounded camera-local terrain reuse.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {MAP_KITS} from '../src/data/mapDefinitions.js';
import {WorldArt,TERRAIN_SPRITE_CAP,stairArtId,stairRuns} from '../src/world/generator/WorldArt.js';
const catalog=JSON.parse(await fs.readFile('docs/v0.6/sources/b6/catalog.json','utf8'));
test('B6 has 103 distinct correctly-sized files, clean keying and periodic tiles',async()=>{
 assert.equal(catalog.length,103);const hashes=new Set();
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
test('B6 bases, closed doors, explicit stair axes and unlit torch metadata are consistent',()=>{
 const k=MAP_KITS.overgrown;assert.equal(k.artVersion,'b6');
 for(const x of k.items){assert.deepEqual(x.anchor,{x:.5,y:1});assert.deepEqual(x.footprint,x.collider);if(x.category==='trees')assert.equal(x.collider.type,'circle');if(x.category==='statues')assert.equal(x.collider.type,'rect');if(x.door){assert.equal(x.door.closed,true);assert.equal(x.door.authored,true);assert.ok(x.door.height>=x.size.height*.39);}}
 assert.equal(k.items.find(x=>x.id==='torch-post').lightEnabled,false);
 const stairs=k.structureArt.filter(x=>x.kind==='stairs');assert.equal(stairs.length,4);assert.deepEqual(stairs.map(x=>x.ascending),['n','s','e','w']);assert.ok(stairs.every(x=>x.rails&&x.toLevel===x.fromLevel+1));
 for(const [dir,x,y]of [['n',0,-40],['s',0,40],['e',40,0],['w',-40,0]])assert.equal(stairArtId({from:{x:0,y:0},to:{x,y}}),`stairs-stone-${dir}`);
});
test('terrain pool is bounded, water frames advance, reduced motion freezes and destroy releases sprites',()=>{
 const images=[];const image=()=>{const o={key:'',dead:false,setTexture(v){this.key=v;return this;},destroy(){this.dead=true;}};for(const n of ['setDisplaySize','setDepth','setPosition','setAlpha','setTint','setVisible'])o[n]=()=>o;images.push(o);return o;};
 const w={size:{width:8192,height:6144},columns:64,rows:48,interior:Array(3072).fill(1),water:{mask:Array(3072).fill(2)},bridgeMask:Array(3072).fill(0),roadMask:Array(3072).fill(0),biomes:Array(3072).fill(0),sites:[],stairs:[],doorPaths:[]};
 const g=new Proxy({destroy(){}},{get:(t,k)=>t[k]||(()=>g)}),scene={settings:{},textures:{exists:()=>true},add:{image,graphics:()=>g},cameras:{main:{worldView:{x:0,y:0,width:1280,height:720}}}};
 const art=new WorldArt(scene,w);art.update(0);assert.ok(art.pool.some(x=>x.key.endsWith('deep-0')));art.update(181);assert.ok(art.pool.some(x=>x.key.endsWith('deep-1')));
 assert.equal(art.image('stairs-stone-s',0,0,96,120),null,'unapproved directional art cannot replace the safe fallback');
 scene.settings.reducedMotion=true;art.update(542);assert.ok(art.pool.every(x=>x.key.endsWith('deep-0')));
 for(let n=0;n<600;n++){scene.cameras.main.worldView.x=(n%20)*128-1280;art.update(n*16);}assert.ok(art.pool.length<=TERRAIN_SPRITE_CAP);art.destroy();assert.ok(images.every(x=>x.dead));
});
