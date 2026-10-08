import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MAP_KITS } from '../src/data/mapDefinitions.js';
import { mapArtManifest } from '../src/maps/MapArt.js';
import { createCenoteArt,cenoteGroundRegions } from '../src/maps/CenoteArt.js';
import { generateMapLayout } from '../src/maps/layout.js';
import { MapWorld, waterSpeedMultiplier } from '../src/maps/MapWorld.js';
import { WeatherDirector } from '../src/weather/WeatherDirector.js';
import { sliceSheet } from '../scripts/slice-sheet.mjs';
import os from 'node:os';
import path from 'node:path';
const kit=MAP_KITS.cenote;

test('sheet isolation preserves a subject crossing a grid boundary without copying it into its neighbor',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cenote-slice-'));
  const source=path.join(dir,'source.png'),manifest=path.join(dir,'manifest.json');
  const rgba=Buffer.alloc(80*80*4);
  for(let p=0;p<rgba.length;p+=4){rgba[p]=255;rgba[p+2]=255;rgba[p+3]=255;}
  const rect=(x,y,w,h,r,g,b)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=(yy*80+xx)*4;rgba[p]=r;rgba[p+1]=g;rgba[p+2]=b;}};
  // A wide blue subject crosses x=40 but is owned by cell 1. The green
  // cell-2 object's bounds enclose the blue extension: naïve crop duplicates it.
  rect(10,20,42,10,0,0,255);rect(48,5,5,10,0,255,0);rect(60,5,5,30,0,255,0);rect(48,5,17,5,0,255,0);
  await sharp(rgba,{raw:{width:80,height:80,channels:4}}).png().toFile(source);
  const output='.tools/v15c/slice-regression';
  await fs.writeFile(manifest,JSON.stringify({expectedCount:2,columns:2,rows:1,isolateCells:true,background:'magenta',outputDir:output,items:[{file:'blue.png',width:80,height:80},{file:'green.png',width:80,height:80}]}));
  await sliceSheet(source,manifest,undefined,{overwrite:true});
  const green=await sharp(`${output}/green.png`).ensureAlpha().raw().toBuffer();
  let blue=0,visible=0;for(let p=0;p<green.length;p+=4)if(green[p+3]>100){visible++;if(green[p+2]>green[p+1]+30)blue++;}
  assert.ok(visible>20);assert.equal(blue,0,'neighbor fragment leaked into cell');
});

test('V15c all 56 specified assets and three distinct glows have exact sizes, alpha and no pink fringe',async()=>{
  const manifests=await Promise.all([1,2,3,4,5].map(async n=>JSON.parse(await fs.readFile(`docs/v0.6/sources/v15c/sheet-${n}.json`,'utf8'))));
  const items=manifests.flatMap(x=>x.items),design=JSON.parse(await fs.readFile('docs/v0.6/v06_design.json','utf8'));
  const expected=Object.entries(design.assets.map_art.cenote).flatMap(([c,list])=>list.map(x=>`maps/cenote/${c}/${x.id}.png`)).concat(['cyan','violet','green'].map(c=>`maps/cenote/glow-${c}.png`));
  assert.equal(items.length,59);assert.deepEqual(items.map(x=>x.file).sort(),expected.sort());
  const hashes=new Set();
  for(const item of items){
    const {data,info}=await sharp(`public/assets/pixel/${item.file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,item.width,item.file);assert.equal(info.height,item.height,item.file);
    const hash=createHash('sha256').update(data).digest('hex');assert.ok(!hashes.has(hash),`duplicate ${item.file}`);hashes.add(hash);
    let visible=0,transparent=0,pink=0;
    for(let p=0;p<data.length;p+=4){if(data[p+3]>20)visible++;else transparent++;if(data[p+3]>50&&data[p]>210&&data[p+2]>210&&data[p+1]<45)pink++;}
    assert.ok(visible>20,item.file);assert.equal(pink,0,item.file);
    if(item.fullBleed)assert.equal(transparent,0,item.file);else assert.ok(transparent>0,item.file);
  }
});

test('all six authored grounds have identical opposing edge pixels',async()=>{
  for(const item of kit.ground){
    const {data,info:{width:w,height:h}}=await sharp(`public/assets/pixel/${item.image}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let y=0;y<h;y++)assert.deepEqual(data.subarray(y*w*4,y*w*4+4),data.subarray((y*w+w-1)*4,(y*w+w)*4),item.id);
    for(let x=0;x<w;x++)assert.deepEqual(data.subarray(x*4,x*4+4),data.subarray(((h-1)*w+x)*4,((h-1)*w+x)*4+4),item.id);
  }
});

test('real Cenote textures load once with colored light metadata and preserved footprints',()=>{
  // B8 retains the original 59 files and adds 12 water, 15 structure and 3 statue assets.
  const manifest=mapArtManifest('cenote');assert.equal(manifest.length,89);assert.equal(new Set(manifest.map(x=>x.key)).size,89);
  for(const item of kit.items){assert.ok(manifest.some(x=>x.file===item.image));assert.ok(item.textureKey.startsWith('map-cenote-'));
    if(item.category==='buildings')assert.equal(item.collider.type,'rect');
    if(item.id==='root-giant'){assert.equal(item.solidParts.length,2);assert.ok(item.solidParts.every(p=>p.type==='circle'));}
    else if(item.category==='rocks'||item.category==='trees')assert.equal(item.collider.type,'circle');
  }
  for(const color of ['cyan','violet','green'])assert.equal(kit.items.find(x=>x.id===`crystal-${color}`).lightColor,color);
  assert.ok(kit.items.find(x=>x.id==='lantern-hanging').lightSource);
  assert.ok(kit.items.find(x=>x.id==='crystal-lamp').lightSource);
  assert.ok(kit.items.find(x=>x.id==='barrel-wet').breakable);
});

test('B4 generated water rectangles match the physical grid and B3 shallow movement is 82 percent',()=>{
  const layout=generateMapLayout('cenote',kit,12),world={waterZones:layout.waterZones,isWaterAt:MapWorld.prototype.isWaterAt};
  assert.ok(layout.waterZones.length>50);
  for(const zone of layout.waterZones){
    assert.equal(zone.width,128);assert.equal(zone.height,128);assert.ok(['shallow','deep'].includes(zone.kind));
    assert.equal(waterSpeedMultiplier(world,zone),.82);
  }
  assert.equal(waterSpeedMultiplier(world,{x:0,y:0}),1);
});

test('legacy Cenote art remains usable for authored layouts without replacing B4 grid rendering',()=>{
  const made=[];
  const object=()=>{const o={destroyCount:0,destroy(){this.destroyCount++;},setAlpha(v){this.alpha=v;return this;}};for(const method of ['setTexture','setDepth','setTint','setMask','setBlendMode','setRotation','fillStyle','fillCircle'])o[method]=()=>o;made.push(o);return o;};
  const scene={floor:object(),settings:{reducedMotion:false},add:{tileSprite:()=>object()},make:{graphics:()=>{const o=object();o.createGeometryMask=()=>object();return o;}},textures:{exists:()=>true}};
  const art=createCenoteArt(scene,kit,{groundRegions:cenoteGroundRegions(kit.waterZones)}),count=made.length;
  for(let t=0;t<600000;t+=16)art.update(t);
  assert.equal(made.length,count);assert.ok(art.handlesWater);
  const shimmers=art.objects.filter(x=>x.tilePositionX!==undefined);assert.equal(shimmers.length,2);assert.ok(shimmers.some(x=>x.tilePositionX!==0));
  scene.settings.reducedMotion=true;art.update(100);for(const s of shimmers){assert.equal(s.tilePositionX,0);assert.equal(s.tilePositionY,0);}
  art.destroy();art.destroy();for(const o of made.slice(1))assert.equal(o.destroyCount,1);
});

test('pooled lights switch to the matching authored color and recover when source leaves view',()=>{
  const glow={setPosition(){return this;},setScale(){return this;},setAlpha(){return this;},setTexture(key){this.key=key;return this;},setDisplaySize(w,h){this.width=w;this.height=h;return this;},setVisible(v){this.visible=v;return this;},setActive(v){this.active=v;return this;},setDepth(){return this;}};
  const weather={mapId:'cenote',maxTorches:32,torchGlows:[glow],scene:{textures:{exists:()=>true},lightSources:new Set([{x:40,y:40,color:'violet'}])}};
  const view={x:0,y:0,right:1280,bottom:720};WeatherDirector.prototype.syncTorchGlows.call(weather,view);
  assert.equal(glow.key,'map-cenote-glow-violet');assert.equal(glow.width,240);assert.ok(glow.active);
  weather.scene.lightSources.clear();WeatherDirector.prototype.syncTorchGlows.call(weather,view);assert.equal(glow.active,false);
});
