import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {ENEMY_IDS,ENEMY_ANIMATIONS,ENEMY_EFFECT_IDS,deathEffect,enemiesForArt} from '../src/art/enemyVisuals.js';
import {textureManifest} from '../src/art/textureManifest.js';
import {buildTextures} from '../src/art/TextureFactory.js';
import {FxDirector} from '../src/fx/FxDirector.js';
import {ENEMY_FX_RECIPES,decorateEnemyProjectile} from '../src/fx/recipes/enemies.js';
import {EnemyVisualSystem} from '../src/systems/EnemyVisualSystem.js';
import {cue} from '../src/enemies/common.js';
import {detectSpriteCells} from '../scripts/slice-sheet.mjs';

test('enemy manifest loads 16 frames per eligible enemy, without loading other maps or fliers for melee',()=>{
 assert.equal(ENEMY_IDS.length,15);
 const files=textureManifest({hero:{id:'kukul'},map:{id:'cenote'}}),keys=files.map(file=>file.key);
 for(const id of enemiesForArt({id:'kukul'},{id:'cenote'}))for(let n=0;n<16;n++)assert.ok(keys.includes(`enemy-${id}-frame-${n}`));
 assert.ok(!keys.includes('enemy-vine_lurker-frame-0'));
 const melee=textureManifest({hero:{id:'balam',automatic:{type:'melee'}},map:{id:'overgrown'}});
 assert.ok(!melee.some(file=>/enemy-(bat|jungle_wasp)/.test(file.key)));
 assert.equal(files.filter(file=>/^hero-kukul-frame-/.test(file.key)).length,4);
});
test('animation ranges match all 16 frames; a four-frame actor still uses the old animations',()=>{
 const keys=new Set(['enemy-shade','hero-balam',...Array.from({length:16},(_,i)=>`enemy-shade-frame-${i}`)]),created=new Map();
 const scene={textures:{exists:key=>keys.has(key)},anims:{exists:key=>created.has(key),create:recipe=>created.set(recipe.key,recipe)}};
 buildTextures(scene);
 for(const [state,value]of Object.entries(ENEMY_ANIMATIONS))assert.deepEqual(created.get(`enemy-shade-${state}`).frames.map(frame=>frame.key),value.frames.map(n=>`enemy-shade-frame-${n}`));
 assert.deepEqual(created.get('hero-balam-attack').frames.map(frame=>frame.key),['hero-balam-frame-2','hero-balam-frame-2','hero-balam-frame-0']);
 keys.delete('enemy-shade-frame-15');created.clear();buildTextures(scene);
 assert.ok(!created.has('enemy-shade-death'));assert.deepEqual(created.get('enemy-shade-walk').frames.map(frame=>frame.key),[0,1,0,1].map(n=>`enemy-shade-frame-${n}`));
});
test('18 canonical enemy FX and every ability alias are registered, with unique visual signatures',()=>{
 assert.deepEqual(Object.keys(ENEMY_FX_RECIPES),ENEMY_EFFECT_IDS);
 assert.equal(new Set(Object.values(ENEMY_FX_RECIPES).map(recipe=>JSON.stringify(recipe.signature))).size,18);
 for(const id of ENEMY_IDS)for(const phase of ['windup','attack'])assert.ok(FxDirector.recipes.has(`enemy-${id}-${phase}`));
});

test('windup decoration is stationary and cancels on interrupted cast, death or serial reuse',()=>{
 const f=visualFixture();f.enemy.data.behaviorState={serial:1,busy:'Lunge'};
 const ctx={scene:f.scene,enemy:f.enemy,state:f.enemy.data.behaviorState,data:{id:'shade'}};
 cue(ctx,'windup',{x:10,y:20},{ability:'Lunge'});
 const options=f.calls.at(-1)[2];assert.equal(options.isAlive(),true);
 ctx.state.busy=null;assert.equal(options.isAlive(),false);ctx.state.busy='Lunge';
 f.enemy.data.serial=2;assert.equal(options.isAlive(),false);f.enemy.data.serial=1;f.enemy.active=false;assert.equal(options.isAlive(),false);
 const alive=()=>false,follow=[];const sprite={x:10,y:20,rotation:0,scaleX:1,scaleY:1};
 ENEMY_FX_RECIPES['telegraph-glyph'].cast({tweens:{add(){}}},{x:10,y:20,isAlive:alive},{image:()=>sprite,follow:(...args)=>follow.push(args)});
 assert.deepEqual(follow[0][1],{x:10,y:20});assert.equal(follow[0][2].isAlive,alive);
});

test('connected-component reflow labels retain an entire sprite crossing a gutter',()=>{
 const width=20,height=10,pixels=Buffer.alloc(width*height*4);
 for(let y=2;y<8;y++)for(let x=3;x<12;x++)pixels.set([50,160,90,255],(y*width+x)*4);
 for(let y=3;y<7;y++)for(let x=16;x<19;x++)pixels.set([210,110,50,255],(y*width+x)*4);
 const result=detectSpriteCells(pixels,width,height,'transparent',2,1,{collectLabels:true});
 assert.equal(result.cells.size,2);assert.equal(result.cells.get(0).right,11);
 assert.equal(result.labels[5*width+11],0);assert.equal(result.labels[5*width+17],1);assert.equal(result.labels[0],-1);
 assert.equal(detectSpriteCells(pixels,width,height,'transparent',2,1).labels,undefined);
});
test('all 240 frames and 18 effects are real transparent images at exact final sizes',async()=>{
 const hashes=new Set();
 for(const file of [...ENEMY_IDS.flatMap(id=>Array.from({length:16},(_,n)=>({path:`frames/enemy-${id}-${n}.png`,size:128}))),...ENEMY_EFFECT_IDS.map(id=>({path:`fx/${id}/main.png`,size:256}))]){
  const bytes=await fs.readFile(`public/assets/pixel/${file.path}`),m=await sharp(bytes).metadata();
  assert.equal(m.width,file.size,file.path);assert.equal(m.height,file.size,file.path);assert.equal(m.hasAlpha,true,file.path);
  const hash=(await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');assert.ok(!hashes.has(hash),file.path);hashes.add(hash);
 }
 assert.equal(hashes.size,258);
});
test('projectile replacement preserves its old world collision size and uses the correct still',()=>{
 const calls=[],shot={anims:{stop:()=>calls.push('stop')},setTexture:key=>{calls.push(key);return shot;},setDisplaySize:()=>shot,body:{setCircle:(...values)=>calls.push(values)},setData:()=>shot};
 decorateEnemyProjectile({textures:{exists:()=>true}},shot,{getData:()=> 'priest'});
 assert.ok(calls.includes('fx-still-soul-bolt-main'));assert.deepEqual(calls.at(-1),[42,86,86]);
 assert.equal(42*(42/256),21*(42/128));
});

function visualFixture(){
 const calls=[],delayed=[],tracked=[];
 const make=()=>{const object={active:true,scaleX:1,scaleY:1,texture:{key:'enemy-shade'},anims:{},data:{},alpha:1,visible:true,x:0,y:0,
  getData:key=>object.data[key],setData:(key,value)=>{object.data[key]=value;return object;},destroy(){object.active=false;},
  setTexture(key){object.texture.key=key;return object;},setPosition(x,y){object.x=x;object.y=y;return object;},setAlpha(a){object.alpha=a;return object;},
  setScale(x,y=x){object.scaleX=x;object.scaleY=y;return object;},setVisible(v){object.visible=v;return object;},setFlipX(v){object.flipX=v;return object;},
  setTintFill(tint){object.fill=tint;return object;},clearTint(){delete object.fill;return object;},setTint:()=>object,
  setOrigin:()=>object,setDepth:()=>object,play:key=>{object.animation=key;return object;}};return object;};
 const graphics={setDepth(){return this;},clear(){return this;},fillStyle(){return this;},fillEllipse(...values){calls.push(values);return this;},destroy(){this.destroyed=true;}};
 const scene={elapsed:1,settings:{reducedMotion:false},textures:{exists:()=>true},add:{graphics:()=>graphics,sprite:()=>make()},
  time:{delayedCall:(_ms,callback)=>delayed.push(callback)},fx:{track:sprite=>tracked.push(sprite),play:(...args)=>calls.push(args)}};
 const enemy=make();enemy.setScale(.56);enemy.data={type:'shade',artKey:'enemy-shade',serial:1,radius:16};enemy.body={radius:28,velocity:{x:1,y:0}};
 const system=new EnemyVisualSystem(scene);system.init(enemy);
 return {scene,enemy,system,entry:system.actors.get(enemy),calls,delayed,tracked,graphics};
}
test('windup squash, white hit flash and jump shadow do not mutate physics size',()=>{
 const f=visualFixture(),before=JSON.stringify(f.enemy.body);f.system.pose(f.enemy,'windup',.35);f.system.update();
 assert.equal(f.enemy.scaleX,.56);assert.equal(JSON.stringify(f.enemy.body),before);assert.ok(f.entry.sprite.scaleX>.56);
 f.system.pose(f.enemy,'hurt',.2);f.system.update();assert.equal(f.entry.sprite.fill,0xffffff);
 f.scene.elapsed+=.1;f.system.update();assert.equal(f.entry.sprite.fill,undefined);
 f.enemy.data.behaviorState={motion:{leap:true,age:.2,duration:.4}};f.system.update();assert.ok(f.entry.sprite.y<f.enemy.y);assert.ok(f.calls.at(-1)[2]<16*2.1);
});
test('death visuals detach immediately and serial reuse cannot destroy a newly spawned actor',()=>{
 const f=visualFixture(),old=f.entry.sprite;f.system.die(f.enemy);assert.equal(f.system.actors.size,0);assert.equal(f.tracked[0],old);assert.equal(old.animation,'enemy-shade-death');
 f.enemy.setData('serial',2);f.system.init(f.enemy);const current=f.system.actors.get(f.enemy).sprite;f.delayed.forEach(callback=>callback());
 assert.equal(old.active,false);assert.equal(current.active,true);f.system.destroy();assert.equal(current.active,false);assert.equal(f.graphics.destroyed,true);
 assert.equal(deathEffect('blood_wraith'),'death-puff-red');assert.equal(deathEffect('crystal_golem'),'death-puff-cyan');
});
test('buried actors have no visible clone or shadow; re-emerge fades upward; culling cleans the clone',()=>{
 const f=visualFixture();f.enemy.data.buried=true;f.system.update();assert.equal(f.entry.sprite.visible,false);assert.equal(f.calls.length,1);
 f.enemy.data.buried=false;f.system.emerge(f.enemy);f.system.update();assert.equal(f.entry.sprite.alpha,0);f.scene.elapsed+=.55;f.system.update();assert.ok(f.entry.sprite.alpha>0);
 f.enemy.active=false;f.system.update();assert.equal(f.system.actors.size,0);assert.equal(f.entry.sprite.active,false);
});
