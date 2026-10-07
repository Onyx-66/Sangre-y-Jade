import test from 'node:test';
import assert from 'node:assert/strict';
import { DEPTH_BANDS, backgroundDepth, depthBandName, effectDepth, footprintBaseY, objectBaseY,
  overheadDepth, weatherBackdropDepth, weatherDepth, worldDepth, setWorldDepth } from '../src/render/layers.js';
import { hasHigherWorldOverlap, PlayerOcclusion } from '../src/render/PlayerOcclusion.js';
import { MapWorld } from '../src/maps/MapWorld.js';

test('depth bands preserve the specified offsets and sort world objects by their base', () => {
  assert.equal(worldDepth(120), 1120);
  assert.equal(overheadDepth(120), 10120);
  assert.equal(effectDepth(0), 20000);
  assert.equal(weatherDepth(120), 30120);
  assert.equal(backgroundDepth(), -10000);
  assert.equal(DEPTH_BANDS.hud, 40000);
  assert.ok(worldDepth(-100) < worldDepth(100), 'north objects render behind south objects');
  assert.ok(overheadDepth(-100) > worldDepth(100), 'deliberate overhead art stays above world actors');
  assert.ok(weatherBackdropDepth(0) < effectDepth(0,5), 'screen tints never wash over telegraph warnings');
  assert.equal(depthBandName(worldDepth(-1959)),'world','negative-y world actors remain in the world band');
  assert.equal(depthBandName(overheadDepth(-2000)),'overhead');
  assert.equal(depthBandName(effectDepth(0,901)),'effects');
  assert.equal(depthBandName(weatherDepth(-2000)),'weather');
  assert.equal(depthBandName(DEPTH_BANDS.occlusion),'occlusion');
  assert.equal(depthBandName(40000),'hud');
});

test('visible base and collider footprint calculations use bottom coordinates, not top or centre', () => {
  assert.equal(objectBaseY({y:10,displayHeight:80,originY:.75}),30);
  assert.equal(footprintBaseY({y:10,scale:2,collider:{type:'circle',radius:12,offsetY:3}}),40);
  assert.equal(footprintBaseY({y:10,scale:1,collider:{type:'rect',height:40,offsetY:5}}),35);
  assert.ok(Math.abs(footprintBaseY({y:10,size:{height:90},anchor:{y:.8},collider:{type:'none'}})-28)<1e-9);
  const object={y:20,originY:1,displayHeight:40,setDepth(value){this.depth=value;return this;},displayList:{getIndex:()=>4}};
  setWorldDepth(object);
  assert.equal(object.depth,1020.000004);
});

test('tree, rock and building sprites sort north/south from their collider base', () => {
  const world=Object.create(MapWorld.prototype);
  for(const item of [
    {id:'tree',fadeBehind:true,x:0,y:0,scale:1,depthOffset:0,size:{width:160,height:200},anchor:{x:.5,y:1},collider:{type:'circle',radius:22,offsetY:0}},
    {id:'rock',fadeBehind:false,x:0,y:0,scale:1,depthOffset:0,size:{width:100,height:80},anchor:{x:.5,y:1},collider:{type:'circle',radius:18,offsetY:0}},
    {id:'building',fadeBehind:true,x:0,y:0,scale:1,depthOffset:0,size:{width:220,height:180},anchor:{x:.5,y:1},collider:{type:'rect',height:32,offsetY:0}},
  ]){
    const base=footprintBaseY(item),north=world.depthForItem(item),actorNorth=worldDepth(base-100),actorSouth=worldDepth(base+100);
    assert.ok(actorNorth<north,`${item.id}: object covers a hero north of its base`);
    assert.ok(actorSouth>north,`${item.id}: hero south of ${item.id} draws in front`);
  }
});

test('occlusion indicator activates only for higher overlapping world objects', () => {
  const hero={x:20,y:30,width:24,height:36,active:true,visible:true,alpha:1,depth:100};
  const overhead={x:10,y:10,width:40,height:50,active:true,visible:true,alpha:1,depth:10001,
    getBounds(){return {x:this.x,y:this.y,width:this.width,height:this.height};}};
  const decor={children:{list:[hero,overhead]}};
  assert.equal(hasHigherWorldOverlap(decor,hero),true);
  overhead.x=200;assert.equal(hasHigherWorldOverlap(decor,hero),false);
  overhead.x=10;overhead.depth=90;assert.equal(hasHigherWorldOverlap(decor,hero),false);
  overhead.depth=10001;overhead.scrollFactorX=0;assert.equal(hasHigherWorldOverlap(decor,hero),false);
});

test('occlusion silhouette tracks its actor and clears after the actor is no longer covered', () => {
  const calls=[];
  const graphic={
    setDepth(value){this.depth=value;return this;},setData(){return this;},clear(){calls.push('clear');return this;},
    setVisible(value){this.visible=value;return this;},lineStyle(){return this;},strokeRoundedRect(){calls.push('outline');return this;},destroy(){this.destroyed=true;},
  };
  const actor={x:0,y:0,width:20,height:40,active:true,visible:true,depth:100};
  const cover={x:-20,y:-30,width:40,height:50,active:true,visible:true,alpha:1,depth:10001,getBounds(){return{x:this.x,y:this.y,width:this.width,height:this.height};}};
  const scene={player:actor,children:{list:[actor,cover]},add:{graphics:()=>graphic}};
  const system=new PlayerOcclusion(scene);
  assert.equal(system.update(),true);assert.equal(graphic.visible,true);assert.ok(calls.includes('outline'));
  cover.x=200;assert.equal(system.update(),false);assert.equal(graphic.visible,false);
  system.destroy();assert.equal(graphic.destroyed,true);
});
