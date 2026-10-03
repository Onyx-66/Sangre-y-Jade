import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { FxDirector } from '../src/fx/FxDirector.js';
import { BALAM_FX_RECIPES, fxRecipeSignature } from '../src/fx/recipes/balam.js';
import { IXCHEL_FX_RECIPES, IXCHEL_FX_IDS } from '../src/fx/recipes/ixchel.js';
import { IXCHEL_FX_DEFINITIONS } from '../src/fx/generated/ixchel.js';
import { decorateIxchelProjectile, ixchelFxId } from '../src/fx/ixchelStages.js';

class Sprite extends EventEmitter {
  constructor(x,y,key){super();Object.assign(this,{x,y,key,active:true,visible:true,scaleX:1,scaleY:1,rotation:0,data:{}});}
  setDepth(v){this.depth=v;return this;} setRotation(v){this.rotation=v;return this;}
  setDisplaySize(w,h){this.width=w;this.height=h;this.scaleX=w/256;this.scaleY=h/256;return this;}
  setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;} setAlpha(v){this.alpha=v;return this;}
  setBlendMode(v){this.blend=v;return this;} setTint(v){this.tint=v;return this;}
  setPosition(x,y){this.x=x;this.y=y;return this;} setVisible(v){this.visible=v;return this;}
  setData(k,v){if(typeof k==='object')Object.assign(this.data,k);else this.data[k]=v;return this;}
  getData(k){return this.data[k];} destroy(){if(this.active){this.active=false;this.emit('destroy');}}
}
function scene(){
  const sprites=[],tweenCalls=[],timers=[];
  const s={player:new Sprite(40,60,'player'),elapsed:0,events:new EventEmitter().setMaxListeners(0),textures:{exists:()=>true},
    add:{image:(x,y,key)=>{const sprite=new Sprite(x,y,key);sprites.push(sprite);return sprite;}},
    tweens:{add:config=>{tweenCalls.push(config);return config;}},time:{delayedCall:(ms,callback)=>{timers.push({ms,callback});}},
    sprites,tweenCalls,timers};s.fx=new FxDirector(s);return s;
}

test('Ixchel registers all 24 JSON-owned recipes and signatures differ across all 50 shipped recipes',()=>{
  assert.equal(IXCHEL_FX_IDS.length,24);
  assert.deepEqual([...IXCHEL_FX_IDS].sort(),IXCHEL_FX_DEFINITIONS.map(d=>d.id).sort());
  const recipes={...BALAM_FX_RECIPES,...IXCHEL_FX_RECIPES};
  const signatures=Object.values(recipes).map(fxRecipeSignature);
  assert.equal(new Set(signatures).size,50);
  for(const id of IXCHEL_FX_IDS)assert.equal(FxDirector.recipes.get(id),IXCHEL_FX_RECIPES[id]);
});
test('Ixchel spatial and timing metadata stays linked to the exact authoritative mechanics',async()=>{
  const json=JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json','utf8'));
  for(const d of IXCHEL_FX_DEFINITIONS){const source=json.heroes.ixchel.find(skill=>skill.id===d.id);
    assert.equal(d.mechanics,source.mech);assert.equal(d.brief,source.vfx);
    const numbers=[...source.mech.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
    assert.deepEqual(Object.entries(d.params).filter(([key])=>key!=='projectiles').map(([,v])=>v),numbers,d.id);
  }
  const s=scene();s.fx.play('moonwell','ground',{x:100,y:200});
  assert.equal(s.sprites[0].width,290);assert.equal(s.tweenCalls[0].delay,7000);assert.equal(s.tweenCalls[0].duration,1000);
  s.fx.play('verdant-mercy','ground',{x:100,y:200});assert.equal(s.sprites[2].width,280);
  s.fx.play('cacao-bloom','ground',{x:100,y:200});assert.equal(s.timers.at(-1).ms,800);
  s.fx.play('glyph-comet','ground',{x:0,y:0,angle:0});
  const decals=s.sprites.slice(-5);assert.equal(decals[0].x,50);assert.equal(decals.at(-1).x,450);
  assert.ok(decals.every(d=>d.width===100&&d.height===80));
  s.fx.play('four-directions','travel',{x:100,y:200,angle:Math.PI});
  assert.equal(s.sprites.at(-2).tint,0xf2f2f2);assert.equal(s.sprites.at(-1).tint,0x1a1a1a);
  assert.equal(s.sprites.at(-1).blend,'NORMAL');
});
test('all Ixchel stages render without placeholders and share the 24 effect budget',()=>{
  const s=scene();let calls=0;
  for(const [id,recipe] of Object.entries(IXCHEL_FX_RECIPES))for(const stage of ['cast','travel','impact','ground','aura','proc']){
    if(!recipe[stage])continue;s.fx.play(id,stage,{x:120,y:80,from:s.player,target:s.player,angle:.2});calls++;
    assert.ok(s.fx.liveUnits<=24,id);assert.ok(s.fx.live.length<=24,id);
  }
  assert.ok(calls>50);assert.equal(s.fx.missing.size,0);
  s.fx.destroy();assert.equal(s.events.listenerCount('update'),0);
});
test('projectile FX follows its real body, preserves combat data, and restores visibility when evicted',()=>{
  const s=scene(),owner=new Sprite(12,22,'old-art').setData({life:1,damage:52,pierce:3});owner.body={velocity:{x:720,y:0}};
  decorateIxchelProjectile(s,owner,'copal-star');assert.equal(owner.visible,false);
  owner.setPosition(80,45);s.events.emit('update');assert.equal(s.sprites[0].x,80);assert.equal(s.sprites[0].y,45);
  assert.equal(owner.getData('damage'),52);assert.equal(owner.getData('pierce'),3);
  for(let i=0;i<24;i++)s.fx.play('copal-star','cast',{x:i,y:0});
  assert.equal(owner.visible,true);assert.ok(s.fx.liveUnits<=24);
  decorateIxchelProjectile(s,owner,'copal-star');owner.setData('fxGeneration',null);s.events.emit('update');
  assert.equal(s.sprites.at(-1).active,false);assert.equal(s.events.listenerCount('update'),0);
  assert.equal(ixchelFxId('smoking-mirror'),'copal-veil');assert.equal(ixchelFxId('blue-fire'),null);
});
test('Ixchel preload caches exactly its 40 stills and does not load another hero',()=>{
  const loaded=new Set(),calls=[];const s={textures:{exists:key=>loaded.has(key)},load:{image:(key,url)=>{loaded.add(key);calls.push(url);}}};
  assert.equal(FxDirector.preload(s,IXCHEL_FX_IDS),40);assert.equal(FxDirector.preload(s,IXCHEL_FX_IDS),0);
  assert.ok(calls.every(url=>!url.includes('jaguar')));
});
test('all 40 Ixchel stills are distinct transparent PNGs at 256 or 128 pixels with clear borders',async()=>{
  const manifests=await Promise.all([1,2,3].map(async i=>JSON.parse(await fs.readFile(`docs/skills-redesign/fx-ixchel-sheet-${i}.json`,'utf8'))));
  const items=manifests.flatMap(m=>m.items),hashes=new Set();assert.equal(items.length,40);
  const {createHash}=await import('node:crypto');
  for(const item of items){const bytes=await fs.readFile(`public/assets/pixel/${item.file}`),meta=await sharp(bytes).metadata();
    assert.equal(meta.width,item.width);assert.equal(meta.height,item.height);assert.equal(meta.hasAlpha,true);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0,item.file);assert.equal(data[((info.height-1)*info.width+x)*4+3],0,item.file);}
    for(let y=0;y<info.height;y++){assert.equal(data[(y*info.width)*4+3],0,item.file);assert.equal(data[(y*info.width+info.width-1)*4+3],0,item.file);}
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size,40);
});
