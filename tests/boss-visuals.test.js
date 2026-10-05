import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import definitions from '../src/data/bosses-v06.json' with {type:'json'};
import {BOSS_IDS,BOSS_ANIMATIONS,BOSS_FX_IDS,bossStillFiles,bossBodyCircle} from '../src/art/bossVisuals.js';
import {buildTextures} from '../src/art/TextureFactory.js';
import {textureManifest} from '../src/art/textureManifest.js';
import {FxDirector} from '../src/fx/FxDirector.js';
import {fxManifest} from '../src/systems/RunLoadManifest.js';
import {BOSS_FX_RECIPES,BOSS_ENTRY_RECIPES,animateBossStills,decorateBossProjectile} from '../src/fx/recipes/bosses.js';
import {fxRecipeSignature} from '../src/fx/recipes/balam.js';
import {BossVisualSystem} from '../src/systems/BossVisualSystem.js';

class Sprite extends EventEmitter {
 constructor(key){super();Object.assign(this,{active:true,visible:true,x:0,y:0,scaleX:1,scaleY:1,alpha:1,texture:{key},data:{},anims:{stop(){}}});}
 setTexture(key){this.texture.key=key;return this;}
 setPosition(x,y){this.x=x;this.y=y;return this;}
 setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;}
 setDisplaySize(w,h){this.displayWidth=w;this.displayHeight=h;return this;}
 setAlpha(a){this.alpha=a;return this;}
 setRotation(a){this.rotation=a;return this;}
 setTint(t){this.tint=t;return this;}
 setTintFill(t){this.fill=t;return this;}
 clearTint(){delete this.tint;delete this.fill;return this;}
 setDepth(d){this.depth=d;return this;}
 setBlendMode(b){this.blendMode=b;return this;}
 setOrigin(x,y){this.originX=x;this.originY=y;return this;}
 setFlipX(x){this.flipX=x;return this;}
 setVisible(v){this.visible=v;return this;}
 setMask(m){this.mask=m;return this;}
 getData(k){return this.data[k];}
 setData(k,v){this.data[k]=v;return this;}
 play(k){this.animation=k;return this;}
 destroy(){if(!this.active)return;this.active=false;this.emit('destroy');this.removeAllListeners();}
}
function fixture(){
 const sprites=[],graphics=[],masks=[],events=new EventEmitter();events.setMaxListeners(0);
 const scene={elapsed:1,events,settings:{reducedMotion:false},player:{x:200,y:50},textures:{exists:()=>true},tweens:{killTweensOf(){}},
  add:{image:(x,y,key)=>{const s=new Sprite(key).setPosition(x,y);sprites.push(s);return s;},sprite:(x,y,key)=>{const s=new Sprite(key).setPosition(x,y);sprites.push(s);return s;},graphics:()=>{
   const g=new Sprite('graphics');g.arcs=[];g.vertices=[];for(const m of ['clear','fillStyle','fillCircle','fillEllipse','lineStyle','strokeEllipse','beginPath','closePath','fillPath'])g[m]=()=>g;
   for(const m of ['moveTo','lineTo'])g[m]=(x,y)=>{g.vertices.push([x,y]);return g;};
   g.clear=()=>{g.arcs.length=0;g.vertices.length=0;return g;};g.arc=(...a)=>{g.arcs.push(a);return g;};g.createGeometryMask=()=>{const m={active:true,destroy(){this.active=false;}};masks.push(m);return m;};graphics.push(g);return g;
  }}};
 scene.fx=new FxDirector(scene);const step=seconds=>{scene.elapsed+=seconds;events.emit('update');scene.fx.prune();};
 return {scene,sprites,graphics,masks,step};
}
const ctx={x:0,y:0,angle:0,arena:{x:0,y:0,radius:600},sound:false};

test('boss manifest and animation factory use all seven 16-frame states with four-frame fallback',()=>{
 const files=textureManifest({hero:{id:'kukul'},map:{id:'overgrown'}});
 for(const id of BOSS_IDS)for(let n=0;n<16;n++)assert.ok(files.some(f=>f.key===`boss-${id}-frame-${n}`));
 const keys=new Set(['boss-camazotz',...Array.from({length:16},(_,n)=>`boss-camazotz-frame-${n}`)]),anims=new Map();
 const scene={textures:{exists:k=>keys.has(k)},anims:{exists:k=>anims.has(k),create:r=>anims.set(r.key,r)}};buildTextures(scene);
 for(const [state,{frames}]of Object.entries(BOSS_ANIMATIONS))assert.deepEqual(anims.get(`boss-camazotz-${state}`).frames.map(f=>f.key),frames.map(n=>`boss-camazotz-frame-${n}`));
 keys.delete('boss-camazotz-frame-15');anims.clear();buildTextures(scene);assert.ok(!anims.has('boss-camazotz-death'));
 assert.deepEqual(anims.get('boss-camazotz-attack').frames.map(f=>f.key),[2,2,0].map(n=>`boss-camazotz-frame-${n}`));
});
test('192px boss body retains the original world-space radius and centre',()=>{
 const sprite={scene:{textures:{exists:()=>true}}};assert.deepEqual(bossBodyCircle(sprite,'boss-camazotz'),[24,72,76]);
 sprite.scene.textures.exists=()=>false;assert.deepEqual(bossBodyCircle(sprite,'boss-camazotz'),[24,40,44]);
 for(const size of [128,192]){const offset=size/2-20;assert.equal(offset+24-size/2,4);}
});
test('canonical recipes have unique signatures and preload each of the 46 actual still paths once',()=>{
 const recipes={...BOSS_FX_RECIPES,...BOSS_ENTRY_RECIPES};assert.equal(Object.keys(recipes).length,25);
 assert.equal(new Set(Object.values(recipes).map(fxRecipeSignature)).size,25);
 const entries=fxManifest([...BOSS_FX_IDS,...BOSS_FX_IDS],FxDirector.recipes),paths=entries.map(e=>e.url.replace('/assets/pixel/',''));
 assert.equal(paths.length,46);assert.equal(new Set(paths).size,46);assert.deepEqual(new Set(paths),new Set(bossStillFiles().map(f=>f.file)));
 const loaded=new Set(),calls=[],scene={textures:{exists:k=>loaded.has(k)},load:{image:(k,url)=>{loaded.add(k);calls.push(url);}}};
 assert.equal(FxDirector.preload(scene,BOSS_FX_IDS),46);assert.equal(FxDirector.preload(scene,BOSS_FX_IDS),0);
 assert.equal(calls.filter(url=>url.includes('/boss-entry/')).length,4);
});
test('all 64 boss frames and 46 effects have exact sizes, transparent pixels, and unique hashes',async()=>{
 const files=[...BOSS_IDS.flatMap(id=>Array.from({length:16},(_,n)=>({file:`frames/boss-${id}-${n}.png`,size:192}))),...bossStillFiles()],hashes=new Set();
 for(const {file,size}of files){const bytes=await fs.readFile(`public/assets/pixel/${file}`),m=await sharp(bytes).metadata();
  assert.equal(m.width,size,file);assert.equal(m.height,size,file);assert.ok(m.hasAlpha,file);
  const {data}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.ok(data.some((v,n)=>n%4===3&&v===0),file);assert.ok(data.some((v,n)=>n%4===3&&v>180),file);
  const hash=createHash('sha256').update(bytes).digest('hex');assert.ok(!hashes.has(hash),file);hashes.add(hash);
 }assert.equal(hashes.size,110);
});
for(const id of Object.keys(BOSS_FX_RECIPES))test(`${id}: cast, impact, interrupted owner and shutdown clean all effects`,()=>{
 const f=fixture();let alive=true;const c={...ctx,isAlive:()=>alive};
 f.scene.fx.play(id,'cast',c);f.step(10);assert.equal(f.scene.fx.liveUnits,0);
 f.scene.fx.play(id,'impact',c);f.step(.2);assert.ok(f.scene.fx.liveUnits<=24);alive=false;f.step(.01);
 assert.equal(f.scene.fx.liveUnits,0);assert.equal(f.scene.events.listenerCount('update'),0);assert.ok(f.masks.every(m=>!m.active));
 alive=true;f.scene.fx.play(id,'impact',c);f.scene.events.emit('shutdown');f.scene.fx.prune();assert.equal(f.scene.fx.liveUnits,0);assert.equal(f.scene.events.listenerCount('update'),0);
});
test('gameplay-clock pause freezes boss visuals; eviction removes listeners and geometry masks',()=>{
 const f=fixture();f.scene.fx.play('boss-vucub-solar-flare-rings','impact',ctx);f.step(.2);
 const ring=f.sprites[0],before=ring.displayWidth;f.scene.events.emit('update');assert.equal(ring.displayWidth,before);
 for(let n=0;n<40;n++)f.scene.fx.play('boss-vucub-sunbeam-sweep','impact',ctx);
 assert.ok(f.scene.fx.liveUnits<=24);assert.ok(f.masks.slice(0,3).every(m=>!m.active));
 f.scene.fx.destroy();assert.ok(f.masks.every(m=>!m.active));assert.equal(f.scene.events.listenerCount('update'),0);assert.equal(f.scene.events.listenerCount('shutdown'),0);
});
test('beams, sequential fissure, eclipse and flare circles use the gameplay geometry and lifetimes',()=>{
 const f=fixture(),p=definitions.find(b=>b.id==='vucub').phases[0].abilities[0].parameters;
 f.scene.fx.play('boss-vucub-sunbeam-sweep','impact',ctx);assert.equal(f.sprites[0].displayWidth,p.length);
 assert.ok(Math.abs(Math.hypot(...f.graphics[0].vertices[0].map((v,i)=>v-f.graphics[0].vertices[3][i]))-p.width)<1e-6);
 f.step(p.duration/2);assert.ok(Math.abs(f.sprites[0].rotation)<1e-6);f.step(p.duration/2);assert.equal(f.scene.fx.liveUnits,0);
 const line=fixture(),q=definitions.find(b=>b.id==='zipacna').phases[0].abilities[2].parameters;line.scene.fx.play('boss-zipacna-fissure-line','impact',ctx);
 assert.equal(line.sprites.reduce((sum,s)=>sum+s.displayWidth,0),q.length);assert.ok(line.sprites.every(s=>s.displayHeight===q.width));line.step(q.duration);assert.equal(line.scene.fx.liveUnits,0);
 const eclipse=fixture();eclipse.scene.fx.play('boss-camazotz-eclipse','impact',ctx);assert.equal(eclipse.sprites[0].displayWidth,560);eclipse.step(10);assert.equal(eclipse.scene.fx.liveUnits,0);
 const flare=fixture();flare.scene.fx.play('boss-vucub-solar-flare-rings','impact',ctx);flare.step(1);assert.equal(flare.sprites[0].displayWidth,340);
 assert.equal(flare.graphics[0].arcs.length,2);assert.ok(Math.abs(flare.graphics[0].arcs[0][3]-Math.PI/6)<1e-6);
});
test('Zenith trail marks the actual moving player every 0.5s and expires with its flight',()=>{
 const f=fixture(),p=definitions.find(b=>b.id==='vucub').phases[2].abilities[0].parameters;
 f.scene.fx.play('boss-vucub-zenith','aura',ctx);assert.equal(f.sprites.length,p.trail/.5);assert.ok(f.sprites.every(s=>s.alpha===0));
 f.step(.5);assert.equal(f.sprites[0].x,200);f.scene.player.x=350;f.step(.5);assert.equal(f.sprites[1].x,350);f.step(3);assert.equal(f.scene.fx.liveUnits,0);
});
test('manual cinematic clock animates the four entry stills and finish/skip removes them',()=>{
 for(const id of BOSS_IDS){const f=fixture(),entry=f.scene.fx.play(`boss-${id}-entry`,'cast',ctx);
  assert.equal(entry.sprite.texture.key,`fx-still-boss-${id}-entry-main`);entry.update(.5);assert.ok(entry.sprite.alpha>0);assert.equal(f.scene.elapsed,1);
  entry.finish();entry.update(.8);assert.equal(entry.sprite.active,false);f.scene.fx.prune();assert.equal(f.scene.fx.liveUnits,0);
 }
});
test('scheduler cues before execution do not lose armor, and interrupted channels/dives leave no moving still',()=>{
 const f=fixture(),boss=new Sprite('boss-zipacna'),state={channel:null,runtime:{tasks:[]}};boss.setData('bossArmorPct',0);
 f.scene.fx.play('boss-zipacna-stone-armor','impact',{...ctx,boss,state});assert.ok(f.sprites[0].active);
 boss.setData('bossArmorPct',.5);f.step(.1);assert.ok(f.sprites[0].active);boss.setData('bossArmorPct',0);f.step(.01);assert.equal(f.scene.fx.liveUnits,0);
 for(const id of ['boss-vucub-sunbeam-sweep','boss-camazotz-blood-dive','boss-camazotz-twin-dive']){
  const q=fixture(),state={channel:null,runtime:{tasks:[]}};q.scene.fx.play(id,'impact',{...ctx,state});assert.ok(q.scene.fx.liveUnits>0);
  state.channel={};state.runtime.tasks.push({movement:true});q.step(.1);assert.ok(q.scene.fx.liveUnits>0);
  state.channel=null;state.runtime.tasks=[];q.step(.01);assert.equal(q.scene.fx.liveUnits,0);assert.equal(q.scene.events.listenerCount('update'),0);
 }
});
test('boss clone poses, cinematic entry and white hit flashes never resize its physics actor',()=>{
 const f=fixture(),boss=new Sprite('boss-camazotz');boss.scene=f.scene;boss.setData('artKey','boss-camazotz').setData('serial',1).setScale(1.35);boss.body={radius:24,offset:{x:72,y:76}};
 const before=JSON.stringify(boss.body),system=new BossVisualSystem(f.scene);system.init(boss);system.pose(boss,'windup',.8);system.update();
 assert.ok(system.render(boss).scaleX>1.35);assert.equal(boss.scaleX,1.35);assert.equal(JSON.stringify(boss.body),before);
 system.pose(boss,'hurt',.2);system.update();assert.equal(system.render(boss).fill,0xffffff);f.step(.07);system.update();assert.equal(system.render(boss).fill,undefined);
 system.entryProgress(boss,.3);assert.equal(system.render(boss).texture.key,'boss-camazotz-frame-7');assert.equal(JSON.stringify(boss.body),before);
 const old=system.die(boss);assert.equal(old.animation,'boss-camazotz-death');assert.equal(system.actors.size,0);
 boss.setData('serial',2);system.init(boss);old.destroy();assert.ok(system.render(boss).active);system.destroy();assert.ok(f.graphics.every(g=>!g.active));
});
test('boss feather and bone projectiles retain their world collision radii',()=>{
 for(const [boss,ability]of [['vucub','feather-barrage'],['ahpuch','bone-spear-ring']]){const f=fixture(),shot=new Sprite('fx-5');shot.rotation=0;shot.body={setCircle:(...args)=>shot.circle=args};
  decorateBossProjectile(f.scene,shot,boss,ability);assert.equal(shot.texture.key,`fx-still-boss-${boss}-${ability}-main`);assert.deepEqual(shot.circle,[42,86,86]);
  assert.equal(42*(42/256),21*(42/128));
 }
});
test('owner death does not cancel its short death puff and cap cleanup releases its listener',()=>{
 const f=fixture(),s=new Sprite('test');let alive=true;animateBossStills(f.scene,{isAlive:()=>alive},[s],1,()=>{});alive=false;f.step(.01);assert.equal(s.active,false);
 f.scene.fx.play('boss-ahpuch-entry','proc',{...ctx,isAlive:()=>false});assert.ok(f.sprites.at(-1).active);f.step(1);assert.equal(f.scene.fx.liveUnits,0);
});
