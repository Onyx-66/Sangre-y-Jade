import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { FxDirector } from '../src/fx/FxDirector.js';
import { BALAM_FX_RECIPES, fxRecipeSignature } from '../src/fx/recipes/balam.js';
import { IXCHEL_FX_RECIPES } from '../src/fx/recipes/ixchel.js';
import { KUKUL_FX_RECIPES, KUKUL_FX_IDS } from '../src/fx/recipes/kukul.js';
import { KUKUL_DEFINITIONS } from '../src/skills/generated/kukul.js';
import { playKukulProjectile, kukulProjectileContext } from '../src/fx/kukulStages.js';
import { makeScene, addEnemy, sprite as combatSprite } from './helpers/scene-fixture.js';
import { HEROES } from '../src/data/heroes.js';
import { updateSkillEffects } from '../src/skills/common.js';

class Sprite extends EventEmitter{
 constructor(x,y,key){super();Object.assign(this,{x,y,key,active:true,visible:true,scaleX:1,scaleY:1,rotation:0,data:{}});}
 setDepth(v){this.depth=v;return this;}setRotation(v){this.rotation=v;return this;}
 setDisplaySize(w,h){this.width=w;this.height=h;this.scaleX=w/256;this.scaleY=h/256;return this;}
 setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;}setAlpha(v){this.alpha=v;return this;}
 setBlendMode(v){this.blend=v;return this;}setTint(v){this.tint=v;return this;}
 setPosition(x,y){this.x=x;this.y=y;return this;}setVisible(v){this.visible=v;return this;}
 setData(k,v){if(typeof k==='object')Object.assign(this.data,k);else this.data[k]=v;return this;}
 getData(k){return this.data[k];}destroy(){if(this.active){this.active=false;this.emit('destroy');}}
}
function scene(){const sprites=[],tweenCalls=[],timers=[],s={player:new Sprite(40,60,'hero'),elapsed:0,
 events:new EventEmitter().setMaxListeners(0),textures:{exists:()=>true},
 add:{image:(x,y,key)=>{const sprite=new Sprite(x,y,key);sprites.push(sprite);return sprite;}},
 tweens:{add:config=>{tweenCalls.push(config);return config;}},time:{delayedCall:(ms,callback)=>timers.push({ms,callback})},
 sprites,tweenCalls,timers};s.fx=new FxDirector(s);return s;}
const def=id=>KUKUL_DEFINITIONS.find(skill=>skill.id===id);

test('Kukul registers exactly its 24 JSON skills; all 74 shipped recipe signatures are distinct',()=>{
 assert.deepEqual([...KUKUL_FX_IDS].sort(),KUKUL_DEFINITIONS.map(d=>d.id).sort());
 const signatures=Object.values({...BALAM_FX_RECIPES,...IXCHEL_FX_RECIPES,...KUKUL_FX_RECIPES}).map(fxRecipeSignature);
 assert.equal(signatures.length,74);assert.equal(new Set(signatures).size,74);
 for(const d of KUKUL_DEFINITIONS){assert.equal(FxDirector.recipes.get(d.id),KUKUL_FX_RECIPES[d.id]);
  assert.deepEqual(KUKUL_FX_RECIPES[d.id].stills,d.kind==='active'?['main','accent']:['proc']);}
});
test('Kukul FX uses scaled hit geometry, exact catalogue duration, centred trail and moving beam origin',()=>{
 const s=scene();s.fx.play('featherstorm','travel',{x:100,y:200});assert.equal(s.sprites[0].width,def('featherstorm').params.radius*2);
 assert.equal(s.tweenCalls[0].delay,3700);assert.equal(s.tweenCalls[0].duration,300);
 const net=s.fx.play('hunter-snare','ground',{x:90,y:80,radius:180});assert.equal(net.width,360);
 const trail=s.fx.play('windstep','ground',{x:125,y:0,range:250,width:44});assert.equal(trail.x,125);assert.equal(trail.width,250);assert.equal(trail.height,44);
 const ring=s.fx.play('gale-ring','ground',{x:0,y:0,radius:375});assert.equal(ring.width,750);assert.equal(s.tweenCalls.at(-1).duration,400);
 const beam=s.fx.play('kukulkans-breath','aura',{target:s.player,range:780,width:90,angle:Math.PI/2,duration:2.25});
 assert.equal(beam.width,780);assert.equal(beam.height,90);assert.ok(Math.abs(beam.x-40)<1e-8);assert.equal(beam.y,450);
 s.player.setPosition(75,90);s.events.emit('update');assert.ok(Math.abs(beam.x-75)<1e-8);assert.equal(beam.y,480);
 const focus=s.fx.play('eagle-eye','aura',{target:s.player});assert.equal(s.tweenCalls.at(-1).duration,600);
 assert.equal(focus.active,true);s.fx.destroy();assert.equal(s.events.listenerCount('update'),0);
});
test('every Kukul stage renders without missing stills under the shared 24-unit budget',()=>{
 const s=scene();let count=0;
 for(const [id,recipe] of Object.entries(KUKUL_FX_RECIPES))for(const stage of ['cast','travel','impact','ground','aura','proc']){
  if(!recipe[stage])continue;s.fx.play(id,stage,{x:120,y:80,target:s.player,from:{x:0,y:0},to:{x:120,y:80},angle:.2});
  assert.ok(s.fx.liveUnits<=24,id);assert.ok(s.sprites.every(sprite=>Number.isFinite(sprite.x)&&Number.isFinite(sprite.y)),id);count++;
 }
 assert.ok(count>50);assert.equal(s.fx.missing.size,0);s.fx.destroy();assert.equal(s.events.listenerCount('update'),0);
});
test('Kukul travel follows and rotates with real projectile bodies, preserves hit data, and handles eviction/reuse',()=>{
 const s=scene(),shot=new Sprite(12,22,'old-art').setData({life:1,damage:64,pierce:12});shot.body={velocity:{x:0,y:600}};
 assert.equal(kukulProjectileContext(s,shot).angle,Math.PI/2);
 const effect=playKukulProjectile(s,def('atlatl-volley'),shot);assert.equal(shot.visible,false);
 shot.setPosition(80,45);shot.body.velocity={x:-600,y:0};s.events.emit('update');assert.equal(effect.x,80);assert.equal(effect.y,45);assert.equal(effect.rotation,Math.PI);
 assert.equal(shot.getData('damage'),64);assert.equal(shot.getData('pierce'),12);
 for(let i=0;i<24;i++)s.fx.play('atlatl-volley','cast',{x:i,y:0});assert.equal(shot.visible,true);assert.equal(effect.active,false);
 const reuse=playKukulProjectile(s,def('serpent-path'),shot);shot.setData('fxGeneration',null);s.events.emit('update');assert.equal(reuse.active,false);
 s.fx.destroy();assert.equal(s.events.listenerCount('update'),0);
});
test('Kukul selected-hero preload loads all 40 stills once and never queues another hero',()=>{
 const loaded=new Set(),urls=[],s={textures:{exists:key=>loaded.has(key)},load:{image:(key,url)=>{loaded.add(key);urls.push(url);}}};
 assert.equal(FxDirector.preload(s,KUKUL_FX_IDS),40);assert.equal(FxDirector.preload(s,KUKUL_FX_IDS),0);
 assert.ok(urls.every(url=>KUKUL_FX_IDS.some(id=>url.includes(`/fx/${id}/`))));
});
test('all 40 Kukul PNGs have the required sizes, alpha safety margins and distinct image bytes',async()=>{
 const manifests=await Promise.all([1,2,3].map(async i=>JSON.parse(await fs.readFile(`docs/skills-redesign/fx-kukul-sheet-${i}.json`,'utf8'))));
 const items=manifests.flatMap(m=>m.items),hashes=new Set();assert.equal(items.length,40);
 for(const item of items){const bytes=await fs.readFile(`public/assets/pixel/${item.file}`),meta=await sharp(bytes).metadata();
  assert.equal(meta.width,item.width);assert.equal(meta.height,item.height);assert.equal(meta.hasAlpha,true);
  assert.equal(item.width,item.file.endsWith('proc.png')?128:256);assert.equal(item.width,item.height);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let x=0;x<info.width;x++){assert.equal(data[x*4+3],0,item.file);assert.equal(data[((info.height-1)*info.width+x)*4+3],0,item.file);}
  for(let y=0;y<info.height;y++){assert.equal(data[(y*info.width)*4+3],0,item.file);assert.equal(data[(y*info.width+info.width-1)*4+3],0,item.file);}
  for(let pixel=0;pixel<data.length;pixel+=4)assert.ok(!(data[pixel+3]>32&&data[pixel]>200&&data[pixel+1]<50&&data[pixel+2]>200),`magenta fringe: ${item.file}`);
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
 }assert.equal(hashes.size,40);
});
test('proc event hooks attach Fleet Hunter to only the next basic darts and Steady Aim follows its actual ready state',()=>{
 const s=makeScene(HEROES.kukul),calls=[];s.fx={play:(id,stage,ctx)=>{calls.push({id,stage,ctx});return combatSprite();}};
 addEnemy(s);s.passives.equip(def('fleet-hunter'));s.passives.emit('dash');s.autoAttack();
 const wind=calls.find(call=>call.id==='fleet-hunter');assert.equal(wind.stage,'proc');assert.equal(wind.ctx.target,s.projectiles.getChildren()[0]);
 assert.equal(wind.ctx.replace,false);const n=calls.filter(call=>call.id==='fleet-hunter').length;s.autoAttack();assert.equal(calls.filter(call=>call.id==='fleet-hunter').length,n);
 const entry=s.passives.equip(def('steady-aim'));s.passives.emit('tick',{dt:1});assert.ok(entry.state.fx.active);
 assert.ok(calls.find(call=>call.id==='steady-aim'&&call.stage==='aura').ctx.isAlive());
 s.keys.right={isDown:true};s.passives.emit('tick',{dt:.1});assert.equal(entry.state.ready,false);assert.equal(entry.state.fx,null);
});
test('Skyfall FX precedes each unchanged impact and telegraphs persist to their exact staggered hit times',()=>{
 const s=makeScene(HEROES.kukul),calls=[];s.fx={play:(id,stage,ctx)=>{calls.push({stage,ctx,at:s.elapsed});return combatSprite();}};addEnemy(s);
 s.loadoutLevel=s.stats.level=20;s.skillSlots=[{...def('skyfall'),level:1,remaining:0}];s.castSkill(0);
 const markers=calls.filter(c=>c.stage==='ground');assert.equal(markers.length,12);
 assert.equal(markers[0].ctx.duration,.6+1.5/12);assert.equal(markers.at(-1).ctx.duration,2.1);
 for(let i=0;i<64;i++){s.elapsed+=1/30;updateSkillEffects(s,1/30);}
 const travel=calls.filter(c=>c.stage==='travel'),impact=calls.filter(c=>c.stage==='impact');assert.equal(travel.length,12);assert.equal(impact.length,12);
 for(let i=0;i<12;i++){assert.ok(travel[i].at<impact[i].at);assert.ok(Math.abs(impact[i].at-1-markers[i].ctx.duration)<1/30+1e-6);}
});
