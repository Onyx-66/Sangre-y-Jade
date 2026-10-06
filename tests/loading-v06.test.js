import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import { RunLoadProgress,LOAD_PHASES,loadWithRecovery,minimumDisplay } from '../src/systems/RunLoadProgress.js';
import { loadTextureBatch,loadAudioBatch } from '../src/systems/RunAssetLoader.js';
import { textureManifest } from '../src/art/textureManifest.js';
import { runSkillIds,fxManifest,runAudioManifest,prepareMapData } from '../src/systems/RunLoadManifest.js';
import { AudioDirector } from '../src/systems/AudioDirector.js';
import { SkillAudio } from '../src/systems/SkillAudio.js';
import { loadingMessages } from '../src/i18n/loading-v06.js';
import { t,setLanguage,hasTranslation } from '../src/i18n/index.js';

const hero={id:'balam',automatic:{type:'melee'},skills:[{id:'jaguar-roar'}],passives:[{id:'bloodlust'}]},map={id:'overgrown',music:'day',colors:{ground:0x173f31}};
test('weighted progress uses measured work, never rewinds on retry, and cannot finish early',()=>{
 const seen=[],progress=new RunLoadProgress(state=>seen.push(state.percent));assert.throws(()=>progress.finish(),/not complete/);
 progress.set('map',1);assert.equal(progress.percent,5);progress.set('textures',.5);assert.equal(progress.percent,25);progress.set('textures',.1);assert.equal(progress.percent,25);
 for(const phase of LOAD_PHASES)progress.set(phase.id,1);assert.equal(progress.percent,99);progress.finish();assert.equal(progress.percent,100);
 assert.ok(seen.every((n,i)=>!i||n>=seen[i-1]));assert.throws(()=>progress.set('audio',NaN));assert.throws(()=>progress.set('invented',1));
});
test('minimum display is 600ms but never adds another 600ms to a slow real load',async()=>{
 const waits=[];await minimumDisplay(100,{now:()=>300,sleep:async ms=>waits.push(ms)});await minimumDisplay(100,{now:()=>1500,sleep:async ms=>waits.push(ms)});assert.deepEqual(waits,[400,0]);
});
test('critical failures pause for retry; only failed assets are retried, and skipping critical work is rejected',async()=>{
 const a={key:'hero',critical:true},b={key:'ground',critical:true},calls=[];let choices=0;
 await loadWithRecovery([a,b],async files=>{calls.push(files.map(f=>f.key));return calls.length===1?[a]:[];},async failures=>{choices++;assert.deepEqual(failures,[a]);return 'retry';});
 assert.deepEqual(calls,[['hero','ground'],['hero']]);assert.equal(choices,1);
 await assert.rejects(loadWithRecovery([a],async files=>files,async()=> 'continue'),/cannot be skipped/);
});
test('non-critical failure can continue; cancellation releases a waiting recovery',async()=>{
 const file={key:'proc',critical:false};let choices=0;await loadWithRecovery([file],async files=>files,async()=>{choices++;return 'continue';});assert.equal(choices,1);
 const controller=new AbortController();controller.abort();await assert.rejects(loadWithRecovery([file],async()=>[],async()=> 'retry',{signal:controller.signal}),{name:'AbortError'});
});
function textureScene({fail=[]}={}){
 const keys=new Set(),load=new EventEmitter(),queued=[];
 for(const type of ['image','atlas','spritesheet'])load[type]=(key,...data)=>queued.push({key,type,data});
 load.reset=()=>queued.splice(0);load.start=()=>queueMicrotask(()=>{const batch=queued.splice(0);batch.forEach((file,i)=>{if(fail.includes(file.key))load.emit('loaderror',file);else keys.add(file.key);load.emit('progress',(i+1)/batch.length);});load.emit('complete');});
 return {load,keys,queued,textures:{exists:key=>keys.has(key)}};
}
test('Phaser queue reports cache hits, actual progress and failed files, then removes listeners',async()=>{
 const scene=textureScene({fail:['bad']}),seen=[];scene.keys.add('cached');
 const files=[{key:'cached',url:'c.png'},{key:'good',url:'g.png'},{key:'bad',url:'b.png',critical:true}];
 assert.deepEqual(await loadTextureBatch(scene,files,{onProgress:v=>seen.push(v)}),[files[2]]);assert.ok(seen.includes(1/3));assert.equal(seen.at(-1),1);assert.equal(scene.load.listenerCount('progress'),0);assert.equal(scene.load.listenerCount('loaderror'),0);
 scene.keys.add('bad');assert.deepEqual(await loadTextureBatch(scene,files),[]);
});
test('atlas and frame-sheet queues use their own data; timeout and abort do not deadlock',async()=>{
 const scene=textureScene();scene.load.start=()=>{};
 const files=[{key:'atlas',type:'atlas',url:'a.png',dataUrl:'a.json',critical:true},{key:'sheet',type:'spritesheet',url:'s.png',config:{frameWidth:128}}];
 const result=await loadTextureBatch(scene,files,{timeout:5});assert.deepEqual(result,files);assert.equal(scene.load.listenerCount('complete'),0);
 const cancel=new AbortController();const waiting=loadTextureBatch(scene,files,{signal:cancel.signal});cancel.abort();await assert.rejects(waiting,{name:'AbortError'});assert.equal(scene.load.listenerCount('progress'),0);
});
test('a slow texture batch keeps loading while real progress advances, even beyond the timeout duration',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const scene=textureScene();scene.load.start=()=>{};
 const files=['one','two','three'].map(key=>({key,url:`${key}.png`,critical:true}));
 const result=loadTextureBatch(scene,files,{timeout:20});
 for(let i=0;i<files.length;i++){
  t.mock.timers.tick(19);scene.keys.add(files[i].key);scene.load.emit('progress',(i+1)/files.length);
 }
 scene.load.emit('complete');
 assert.deepEqual(await result,[],'healthy 57ms batch must not fail at a fixed 20ms deadline');
 assert.equal(scene.load.listenerCount('progress'),0);
});
test('a texture batch that stops making progress still times out and identifies only missing assets',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const scene=textureScene();scene.load.start=()=>{};
 const files=['loaded','stalled'].map(key=>({key,url:`${key}.png`,critical:true}));
 const result=loadTextureBatch(scene,files,{timeout:20});
 t.mock.timers.tick(19);scene.keys.add('loaded');scene.load.emit('progress',.5);
 t.mock.timers.tick(19);scene.load.emit('progress',.5);t.mock.timers.tick(2);
 assert.deepEqual(await result,[files[1]]);
 assert.equal(scene.load.listenerCount('complete'),0);
});
test('selected hero and map manifest excludes other heroes and unused aerial/terrain art without dropping shared run assets',()=>{
 const files=textureManifest({hero,map}),keys=files.map(f=>f.key);assert.equal(new Set(keys).size,keys.length);assert.ok(keys.includes('hero-balam-up-frame-3'));assert.ok(!keys.some(k=>k.startsWith('hero-ixchel')||k.startsWith('hero-kukul')));assert.ok(!keys.includes('enemy-bat'));assert.ok(!keys.includes('top-crystal'));assert.ok(keys.includes('ground')&&keys.includes('support-saintess-frame-0')&&keys.includes('top-tree'));
 const cenote=textureManifest({hero:{...hero,id:'kukul',automatic:{type:'ranged'}},map:{...map,id:'cenote'}});assert.ok(cenote.some(f=>f.key==='top-crystal'));assert.ok(!cenote.some(f=>f.key==='top-tree'));assert.ok(cenote.some(f=>f.key==='enemy-bat'));
});
test('FX and sound manifests are unique per selected skill, include innate/ally skills, and support an audio-key list',()=>{
 const ids=runSkillIds(hero,{extraIds:['jaguar-roar'],allies:[{skills:[{id:'war-cry'}]}]});assert.equal(ids.filter(id=>id==='jaguar-roar').length,1);assert.ok(ids.includes('jade-bounty')&&ids.includes('war-cry'));
 const fx=fxManifest(ids,new Map([['jaguar-roar',{stills:['main','accent']}]]));assert.equal(fx.length,2);assert.ok(fx.every(f=>!f.critical));assert.equal(fx[0].key,'fx-still-jaguar-roar-main');
 const sounds=runAudioManifest(ids,map,{audioKeys:['sfx:hit','sfx:hit']});assert.equal(sounds.filter(f=>f.key==='sfx:hit').length,1);assert.ok(sounds.some(f=>f.file==='skills/sfx-jaguar-roar-cast.wav'));assert.ok(sounds.some(f=>f.file==='music-day.wav'));assert.ok(!sounds.some(f=>f.file?.includes('copal-star')));
});
test('audio preload uses real work callbacks, bounded decoders, cached buffers and retry after decode/fetch failure',async()=>{
 let active=0,max=0,prepared=0;const audio={prepareKey:async()=>{max=Math.max(max,++active);await new Promise(r=>setTimeout(r,2));active--;prepared++;}};
 const files=Array.from({length:9},(_,i)=>({key:String(i),type:'audio',critical:false})),seen=[];
 assert.deepEqual(await loadAudioBatch(audio,{},files,{onProgress:v=>seen.push(v)}),[]);assert.equal(prepared,9);assert.ok(max<=4);assert.equal(seen.at(-1),1);
 let calls=0,decodes=0;const gain={gain:{setValueAtTime(){}},connect(){}},context={currentTime:0,createGain:()=>gain,decodeAudioData:async()=>{decodes++;return {duration:1};}};
 const client=new SkillAudio({base:'/',unlocked:false,volumes:()=>({sfx:0})},{createContext:()=>context,fetcher:async()=>{calls++;return {ok:calls>1,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 await assert.rejects(client.prepareFile('skills/test.wav'),/Missing sound/);await client.prepareFile('skills/test.wav');await client.prepareFile('skills/test.wav');assert.equal(calls,2);assert.equal(decodes,1);assert.equal(client.audio.unlocked,false);client.destroy();
});
test('common audio waits for a playback-decoded frame, reuses the prepared media and does not auto-play',async()=>{
 const previous=globalThis.Audio;const voices=[];
 class Media extends EventTarget {constructor(){super();this.readyState=0;voices.push(this);}load(){queueMicrotask(()=>{this.readyState=2;this.dispatchEvent(new Event('loadeddata'));});}play(){throw Error('Preloading must not play');}}
 globalThis.Audio=Media;
 try{const audio=new AudioDirector({data:{settings:{master:0,music:0,sfx:0}}});const voice=await audio.prepareKey('music:day');assert.equal(await audio.prepareKey('music:day'),voice);assert.equal(voices.length,1);await assert.rejects(audio.prepareKey('unknown'),/Unknown audio key/);}finally{globalThis.Audio=previous;}
});
test('a stuck audio decoder times out or cancels, releases its cache and allows retry',async()=>{
 const context={currentTime:0,createGain:()=>({gain:{setValueAtTime(){}},connect(){}}),decodeAudioData:()=>new Promise(()=>{})};
 const client=new SkillAudio({unlocked:false,volumes:()=>({sfx:0})},{createContext:()=>context,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});
 await assert.rejects(client.prepareFile('skills/stuck.wav',{timeout:5}),/timed out/);assert.equal(client.buffers.size,0);
 const controller=new AbortController(),pending=client.prepareFile('skills/cancelled.wav',{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(client.buffers.size,0);assert.ok(!client.unavailable.has('skills/cancelled.wav'));
 context.decodeAudioData=async()=>({duration:1});await client.prepareFile('skills/stuck.wav');assert.ok(!client.unavailable.has('skills/stuck.wav'));client.destroy();
});
test('skipped optional sounds fall back without repeated fetches; a successful retry clears that state',async()=>{
 let fetches=0,fallbacks=0;
 const context={currentTime:0,createGain:()=>({gain:{setValueAtTime(){}},connect(){}}),decodeAudioData:async()=>({duration:1})};
 const client=new SkillAudio({unlocked:false,sfx:()=>fallbacks++,volumes:()=>({sfx:1})},{createContext:()=>context,fetcher:async()=>{fetches++;return {ok:false};},clock:()=>100});
 await assert.rejects(client.prepareFile('skills/sfx-jaguar-roar-cast.wav'));client.audio.unlocked=true;assert.equal(client.play('jaguar-roar'),false);assert.equal(fetches,1);assert.equal(fallbacks,1);
 client.fetcher=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await client.prepareFile('skills/sfx-jaguar-roar-cast.wav');assert.equal(client.unavailable.size,0);client.destroy();
 const audio=new AudioDirector({data:{settings:{}}});audio.unavailable.add('music:day');audio.currentName='menu';audio.applySettings=()=>{};assert.doesNotThrow(()=>audio.music('day'));assert.equal(audio.currentName,'menu');
});
test('map preparation preserves the real terrain seed and validates required data',()=>{assert.equal(prepareMapData(map,hero).seed,83492791);assert.throws(()=>prepareMapData({},hero),/Invalid/);});
test('all loading copy has explicit EN/FR/AR text and static reduced-motion torch fallback',async()=>{
 for(const locale of ['en','fr','ar']){setLanguage(locale);for(const [key]of loadingMessages){assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);assert.ok(t(key));}}setLanguage('en');
 const css=await fs.readFile(new URL('../src/ui/loading.css',import.meta.url),'utf8');assert.ok(css.includes('prefers-reduced-motion:reduce')&&css.includes('data-reduced-motion=true'));
});
