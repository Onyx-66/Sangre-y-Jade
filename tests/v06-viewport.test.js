import test from 'node:test';
import assert from 'node:assert/strict';
import { viewportMetrics,worldView,resizeCamera,retentionRadius,shakePixels,PICKUP_MAGNET_RANGE } from '../src/systems/Viewport.js';
import { spawnOutsideView } from '../src/systems/CombatRules.js';
import fs from 'node:fs/promises';
import { makeScene } from './helpers/scene-fixture.js';

const sizes=[[568,320],[640,360],[800,360],[960,540],[1024,768],[2400,1080],[3440,1440]];
function cameraFixture(){return {width:640,height:360,scrollX:-320,scrollY:-180,zoomX:.5,zoomY:.5,worldView:{x:9999},
 setSize(w,h){this.width=w;this.height=h;return this;},setZoom(x,y){this.zoomX=x;this.zoomY=y;return this;},
 setBounds(x,y,width,height){this.bounds={x,y,width,height};return this;},
 centerOn(x,y){this.scrollX=x-this.width/2;this.scrollY=y-this.height/2;return this;}};}
test('resize mode fills the parent instead of fitting a fixed 1280x720 canvas',async()=>{
 const main=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(main.includes('Phaser.Scale.RESIZE'));assert.ok(!main.includes('Phaser.Scale.FIT'));
 const css=await fs.readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.ok(!css.includes('object-fit: contain'));
});
test('all requested aspects have uniform zoom and exactly 720 visible world units vertically',()=>{
 for(const [width,height]of sizes){const v=viewportMetrics(width,height);
  assert.equal(v.zoom,height/720);assert.ok(Math.abs(v.zoomX-v.zoom)<1e-12);
  assert.equal(v.worldHeight,720);assert.ok(v.aspect<=2.4);
  assert.ok(Math.abs(v.worldWidth/720-width/height)<1e-12);
 }
 const wide=viewportMetrics(4000,1000);assert.equal(wide.worldWidth,1728);assert.equal(wide.worldHeight,720);
 assert.equal(PICKUP_MAGNET_RANGE,170,'pickup attraction keeps its existing world-unit balance');
});
test('camera resize preserves its viewed center, and live bounds ignore a stale worldView',()=>{
 const camera=cameraFixture();
 resizeCamera(camera,800,360);const view=worldView({cameras:{main:camera}});
 assert.equal(view.x,-800);assert.equal(view.y,-360);assert.equal(view.width,1600);assert.equal(view.height,720);
 assert.ok(retentionRadius({cameras:{main:camera},player:{x:0,y:0}},100)>Math.hypot(800,360));
});
test('camera resize also preserves center after Phaser has already resized its camera',()=>{
 const camera=cameraFixture(),previous=viewportMetrics(camera.width,camera.height);
 camera.setSize(1024,768);resizeCamera(camera,1024,768,previous);
 const view=worldView({cameras:{main:camera}});
 assert.equal(view.x+view.width/2,0);assert.equal(view.y+view.height/2,0);
 assert.equal(view.height,720);
});
test('the real scene resize keeps finite terrain fixed and updates fog, map streaming and effects while choices are paused',()=>{
 const scene=makeScene(),camera=cameraFixture(),rects=[];scene.cameras={main:camera};
 scene.pausedForChoice=scene.time.paused=true;scene.mapData={id:'bloodmoon',colors:{fog:0x663344}};
 const object=()=>({active:true,setPosition(x,y){this.x=x;this.y=y;return this;},
  setSize(width,height){this.width=width;this.height=height;return this;},
  setDisplaySize(width,height){this.displayWidth=width;this.displayHeight=height;return this;},getData:()=>true});
 scene.floor=Object.assign(object(),{x:0,y:0,width:8192,height:6144});
 scene.fog={...object(),clear(){rects.length=0;return this;},fillStyle(color,alpha){this.color=color;this.alpha=alpha;return this;},fillRect(...args){rects.push(args);return this;}};
 const shade=object();scene.fx={live:[{object:shade}]};scene.decorGroup={};let streamed=0;
 scene.mapWorld={update(view){streamed++;assert.deepEqual(view,worldView(scene));}};scene.hud.hideTooltip=()=>{};
 for(const [width,height]of sizes){scene.resizeViewport({width,height});const view=worldView(scene);
  assert.equal(scene.floor.width,8192);assert.equal(scene.floor.height,6144);
  assert.equal(scene.floor.x,0);assert.equal(scene.floor.y,0);
  assert.deepEqual(camera.bounds,{x:-4096,y:-3072,width:8192,height:6144});
  assert.deepEqual(rects,[[-view.width/2-64,-view.height/2-64,view.width+128,view.height+128]]);assert.equal(scene.fog.alpha,.14);
  assert.equal(shade.x,width/2);assert.equal(shade.y,height/2);assert.equal(shade.displayWidth,view.width+128);assert.equal(shade.displayHeight,view.height+128);
  assert.equal(scene.pausedForChoice,true);assert.equal(scene.time.paused,true);
 }
 assert.equal(streamed,sizes.length);
});
test('manual aim refreshes the pointer world position against the current resized camera',()=>{
 const scene=makeScene(),camera=cameraFixture();scene.cameras={main:camera};scene.settings.attackMode='manual';scene.manualPointer=true;
 let refreshed=0;scene.input={activePointer:{worldX:-100,worldY:0,updateWorldPoint(c){assert.equal(c,camera);refreshed++;this.worldX=0;this.worldY=100;return this;}}};
 assert.equal(scene.getAimAngle(),Math.PI/2);assert.equal(refreshed,1);
 scene.manualPointer=false;scene.getAimAngle({x:100,y:0});assert.equal(refreshed,1,'automatic/keyboard aiming is unchanged');
});
test('all spawn edges remain outside every live viewport with their full padding',()=>{
 for(const [width,height]of sizes){const v=viewportMetrics(width,height),view={x:350-v.worldWidth/2,y:-360,width:v.worldWidth,height:720};
  for(let edge=0;edge<4;edge++){let n=0;const p=spawnOutsideView(view,()=>n++===0?(edge+.1)/4:.5,90);
   assert.ok(p.x<=view.x-90||p.x>=view.x+view.width+90||p.y<=view.y-90||p.y>=view.y+view.height+90);
  }
 }
});
test('screen shake normalizes each axis including zoom and honors reduced motion',()=>{
 for(const [width,height]of sizes){const v=viewportMetrics(width,height),calls=[],camera={width,height,zoomX:v.zoomX,zoomY:v.zoom,shake:(...args)=>calls.push(args)};
  const scene={cameras:{main:camera},settings:{screenShake:true}};shakePixels(scene,150,4);
  const average=(v.zoomX+v.zoom)/2;
  assert.ok(Math.abs(calls[0][1].x*width*v.zoomX*average-4)<1e-12);assert.ok(Math.abs(calls[0][1].y*height*v.zoom*average-4)<1e-12);
  scene.settings.reducedMotion=true;shakePixels(scene,150,4);assert.equal(calls.length,1);
 }
});
