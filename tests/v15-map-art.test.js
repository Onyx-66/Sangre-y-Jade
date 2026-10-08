import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MAP_KITS } from '../src/data/mapDefinitions.js';
import { MapWorld } from '../src/maps/MapWorld.js';
import { textureManifest } from '../src/art/textureManifest.js';
import { weatherStillIds, WEATHER_STILL_PATHS, WeatherDirector } from '../src/weather/WeatherDirector.js';

const kit=MAP_KITS.overgrown;
test('V15 has every specified map/weather asset, exact sizes, clean alpha and unique image data',async()=>{
  const manifests=await Promise.all([1,2,3,4,5].map(async n=>JSON.parse(await fs.readFile(`docs/v0.6/sources/v15/sheet-${n}.json`,'utf8'))));
  const items=manifests.flatMap(x=>x.items);assert.equal(items.length,73);
  const design=JSON.parse(await fs.readFile('docs/v0.6/v06_design.json','utf8'));
  const expected=Object.entries(design.assets.map_art.overgrown).flatMap(([c,rows])=>rows.map(row=>`maps/overgrown/${c}/${row.id}.png`)).concat(design.assets.weather.map(row=>`weather/${row.id}.png`));
  assert.deepEqual(items.map(x=>x.file).sort(),expected.sort());
  const hashes=new Set();
  for(const item of items){
    const {data,info}=await sharp(`public/assets/pixel/${item.file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,item.width,item.file);assert.equal(info.height,item.height,item.file);
    const hash=createHash('sha256').update(data).digest('hex');assert.ok(!hashes.has(hash),`duplicate ${item.file}`);hashes.add(hash);
    let visible=0,transparent=0,pink=0;
    for(let p=0;p<data.length;p+=4){if(data[p+3]>20)visible++;else transparent++;if(data[p+3]>50&&data[p]>210&&data[p+2]>210&&data[p+1]<45)pink++;}
    assert.ok(visible>5,item.file);assert.equal(pink,0,`magenta fringe: ${item.file}`);
    if(item.fullBleed)assert.equal(transparent,0,`tile opacity: ${item.file}`);
    else assert.ok(transparent>0,`transparent surround: ${item.file}`);
  }
});

test('all six ground textures and both fog textures have matching periodic edges',async()=>{
  const files=[...kit.ground.map(x=>x.image),'weather/red-fog.png','weather/cave-fog.png'];
  for(const file of files){const {data,info:{width:w,height:h}}=await sharp(`public/assets/pixel/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<h;y++)assert.deepEqual(data.subarray(y*w*4,y*w*4+4),data.subarray((y*w+w-1)*4,(y*w+w)*4),`${file}: horizontal seam`);
    for(let x=0;x<w;x++)assert.deepEqual(data.subarray(x*4,x*4+4),data.subarray(((h-1)*w+x)*4,((h-1)*w+x)*4+4),`${file}: vertical seam`);
  }
});

test('selected-map preload references all current kit textures and only its weather',()=>{
  const manifest=textureManifest({map:{id:'overgrown',kit}}),keys=manifest.map(x=>x.key);
  assert.equal(new Set(keys).size,keys.length);
  for(const item of [...kit.items,...kit.ground])assert.ok(manifest.some(x=>x.key===item.textureKey&&x.url.endsWith(item.image)));
  assert.equal(manifest.filter(x=>x.key.startsWith('map-overgrown-')).length,89);
  assert.deepEqual(manifest.filter(x=>x.key.startsWith('weather-')).map(x=>x.key).sort(),weatherStillIds('overgrown').map(x=>`weather-${x}`).sort());
  for(const [id,file] of Object.entries(WEATHER_STILL_PATHS))assert.equal(file,`weather/${id}.png`);
  assert.ok(!textureManifest({map:{id:'cenote'}}).some(x=>x.key.startsWith('map-overgrown-')));
});

test('authored prop footprints survive StaticBody refresh and reuse instead of expanding to the image',()=>{
  const object={x:100,y:200,displayWidth:400,displayHeight:480};
  const body={offset:{x:17,y:25,set(x,y){this.x=x;this.y=y;}},position:{x:0,y:0},
    updateFromGameObject(){this.width=object.displayWidth;this.height=object.displayHeight;this.position={x:object.x-object.displayWidth*.5,y:object.y-object.displayHeight*.9};},
    setSize(w,h){this.width=w;this.height=h;return this;},
    setCircle(r,x,y){this.width=this.height=r*2;this.offset.set(x,y);return this;},
    setOffset(x,y){this.position.x+=x-this.offset.x;this.position.y+=y-this.offset.y;this.offset.set(x,y);return this;}};
  object.body=body;
  for(const shape of [{type:'circle',radius:32,offsetX:2,offsetY:0},{type:'rect',width:220,height:68,offsetX:0,offsetY:-35}]){
    MapWorld.prototype.configureBody(object,{scale:1.25,anchor:{x:.5,y:.9},collider:shape});
    const w=(shape.radius?shape.radius*2:shape.width)*1.25,h=(shape.radius?shape.radius*2:shape.height)*1.25;
    assert.equal(body.width,w);assert.equal(body.height,h);
    assert.equal(body.position.x+w/2,object.x+shape.offsetX*1.25);
    assert.equal(body.position.y+h/2,object.y+shape.offsetY*1.25);
  }
});

test('large authored weather textures retain the original small particle footprint',()=>{
  const sprite={active:false,setTexture(){return this;},setDisplaySize(w,h){this.w=w;this.h=h;return this;},setActive(v){this.active=v;return this;}};
  const weather={destroyed:false,maxParticles:80,liveParticles:new Set(),particles:[sprite],rng:()=>.5,currentView:()=>({x:0,y:0,width:1280,height:720}),stillKeys:new Map([['leaf-a','weather-leaf-a']]),scene:{textures:{exists:()=>true}},particleTint:()=>0xffffff};
  const emitter={id:'leaf-a',live:0,maxAlive:20,life:[3,5]};
  assert.equal(WeatherDirector.prototype.spawn.call(weather,'leaf-a',emitter),true);
  assert.ok(sprite.w>=15&&sprite.w<=32);assert.equal(sprite.w,sprite.h);
});
