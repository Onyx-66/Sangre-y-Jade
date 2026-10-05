import test from 'node:test';
import assert from 'node:assert/strict';
import {AllyVisuals,ALLY_WINDUP,ALLY_EFFECT_IDS} from '../src/art/allyVisuals.js';
import {harness} from './helpers/ally-skills-fixture.js';
import {addEnemy} from './helpers/scene-fixture.js';
import {FxDirector} from '../src/fx/FxDirector.js';
import '../src/fx/recipes/allies.js';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {ALLY_IDS} from '../src/art/allyVisuals.js';
import {buildTextures} from '../src/art/TextureFactory.js';

function setup(role='tank',skills=[]){
 const h=harness(role,skills);h.scene.textures={exists:key=>key.endsWith('-frame-15')};
 h.poses=[];h.scene.animateCharacter=(_s,_id,state)=>h.poses.push(state);return h;
}
test('basic damage is unchanged and occurs on strike, never during windup',()=>{
 const {scene,support,poses}=setup();const target=addEnemy(scene,{hp:1000,maxHp:1000},0,0);scene.companion.shot=0;
 const hits=[];scene.damageEnemy=(_e,n)=>hits.push({n,pose:poses.at(-1)});
 support.update(.01);assert.deepEqual(hits,[]);assert.equal(poses.at(-1),'windup');
 support.update(ALLY_WINDUP-.01);assert.deepEqual(hits,[]);support.update(.01);
 assert.deepEqual(hits,[{n:7,pose:'attack'}]);support.update(.2);assert.equal(poses.at(-1),'recover');
 support.update(.25);assert.equal(support.visuals.busy,false);assert.equal(target.active,true);
});
test('cast effects wait for strike; cooldown and global gap reserve at windup',()=>{
 const {scene,support,brain,poses}=setup('saintess',['healing-circle']);const skill=scene.companion.skills[0];let hits=0;
 assert.equal(brain.cast(skill,null,{cast(){hits++;assert.equal(poses.at(-1),'attack');return true;}}),true);
 assert.equal(hits,0);assert.equal(skill.remaining,skill.cooldown);assert.equal(brain.cast(skill,null,{cast(){throw Error('double cast');}}),false);
 support.visuals.update(.25);assert.equal(hits,1);assert.equal(brain.casts[skill.id],1);
 support.visuals.update(2);assert.equal(hits,1);
});
test('presentation hooks use ally audio ids and failed casts release reservations',()=>{
 const {scene,support,brain}=setup('saintess',['healing-circle']);const calls=[];scene.audio={play:id=>calls.push(id)};
 const skill=scene.companion.skills[0];const before=brain.lastCast;
 brain.cast(skill,null,{cast:()=>false});support.visuals.update(.25);assert.equal(skill.remaining,0);assert.equal(brain.lastCast,before);assert.deepEqual(calls,[]);
 support.visuals.update(.5);brain.cast(skill,null,{cast:()=>true});support.visuals.update(.25);assert.deepEqual(calls,['ally-saintess-cast']);
 const heal=scene.fx.plays.findLast(p=>p[0]==='saintess-heal-pulse');assert.equal(heal[2].x,scene.player.x);assert.equal(heal[2].y,scene.player.y);
});
test('no-waste conditions are rechecked on strike without losing the failsafe flag',()=>{
 const {scene,support,brain}=setup('saintess',['healing-circle']);const skill=scene.companion.skills[0];scene.stats.hp=40;
 brain.cast(skill,null);scene.stats.hp=scene.stats.maxHp;support.visuals.update(.25);
 assert.equal(brain.casts[skill.id],undefined);assert.equal(skill.remaining,0);
 support.visuals.update(.5);let passed=false;brain.cast(skill,null,{canCast:(_s,_a,_k,_t,o)=>o.failsafe,cast:()=>{passed=true;return true;}},{failsafe:true});
 support.visuals.update(.25);assert.equal(passed,true);
});
test('paused support does not move, attack or tick cooldowns; shutdown cancels pending actions',()=>{
 const {scene,support}=setup('assassin',['ambush']);addEnemy(scene,{},0,0);scene.companion.shot=0;scene.pausedForChoice=true;
 const before={x:scene.companion.sprite.x,y:scene.companion.sprite.y,shot:scene.companion.shot};support.update(5);
 assert.deepEqual({x:scene.companion.sprite.x,y:scene.companion.sprite.y,shot:scene.companion.shot},before);
 scene.pausedForChoice=false;let hits=0;support.visuals.begin('cast',()=>hits++);support.visuals.destroy();support.visuals.update(1);assert.equal(hits,0);
});
test('choice pause freezes queued hits; end cancels them; dead targets are ignored',()=>{
 const {scene,support}=setup();let hits=0;const target={active:true};support.visuals.begin('attack',()=>hits++,target);
 scene.pausedForChoice=true;support.visuals.update(10);assert.equal(hits,0);
 scene.pausedForChoice=false;support.visuals.update(.25);assert.equal(hits,1);support.visuals.update(1);
 support.visuals.begin('attack',()=>hits++,target);target.active=false;support.visuals.update(.25);assert.equal(hits,1);
 support.visuals.update(1);support.visuals.begin('cast',()=>hits++);scene.ended=true;support.visuals.update(10);assert.equal(hits,1);assert.equal(support.visuals.busy,false);
});
test('legacy actors remain immediate; every new effect has a distinct signature',()=>{
 const {scene}=harness('tank',[]);const v=new AllyVisuals(scene);let hits=0;v.begin('attack',()=>hits++);assert.equal(hits,1);
 assert.equal(new Set(ALLY_EFFECT_IDS.map(id=>JSON.stringify(FxDirector.recipes.get(id).signature))).size,8);
});
test('16-frame allies register all states, while absent frame 15 retains legacy animations',()=>{
 for(const modern of [true,false]){
  const rows=[];buildTextures({textures:{exists:key=>key==='support-tank'||(modern&&key==='support-tank-frame-15')},anims:{exists:()=>false,create:row=>rows.push(row)}});
  const attack=rows.find(r=>r.key==='support-tank-attack');assert.equal(attack.frames[0].key,`support-tank-frame-${modern?8:2}`);
  assert.equal(rows.some(r=>r.key==='support-tank-death'),modern);
 }
});
test('all 56 exported images have exact dimensions, alpha and unique content; legacy files retained',async()=>{
 const hashes=new Set();
 for(const [file,size]of [...ALLY_IDS.flatMap(id=>Array.from({length:16},(_,n)=>[`frames/support-${id}-${n}.png`,128])),...ALLY_EFFECT_IDS.map(id=>[`fx/${id}/main.png`,256])]){
  const data=await fs.readFile(`public/assets/pixel/${file}`),meta=await sharp(data).metadata();assert.equal(meta.width,size,file);assert.equal(meta.height,size,file);assert.ok(meta.hasAlpha,file);
  const hash=createHash('sha256').update(data).digest('hex');assert.ok(!hashes.has(hash),`duplicate ${file}`);hashes.add(hash);
  const pixels=await sharp(data).ensureAlpha().raw().toBuffer();let clear=false,pink=0;
  for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]===0)clear=true;if(pixels[p+3]>64&&pixels[p]>210&&pixels[p+2]>210&&pixels[p+1]<45)pink++;}
  assert.ok(clear,file);assert.equal(pink,0,`magenta fringe ${file}`);
 }
 assert.equal(hashes.size,56);
 for(const id of ALLY_IDS)for(let n=0;n<4;n++)await fs.access(`art-source/v0.6/allies/legacy/support-${id}-${n}.png`);
});
