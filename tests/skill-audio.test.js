import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { synthesize, wav, inspectWav, oscillator, adsr } from '../scripts/synth-sfx.mjs';
import manifest from '../src/audio/sfx-manifest.json' with {type:'json'};
import { SkillAudio } from '../src/systems/SkillAudio.js';
import { AudioDirector } from '../src/systems/AudioDirector.js';
import { makeScene, addEnemy } from './helpers/scene-fixture.js';
import { HEROES } from '../src/data/heroes.js';
import { SupportSystem } from '../src/systems/SupportSystem.js';
import { ALLY_CATALOG } from '../src/data/allyCatalog.js';
import { updateSkillEffects } from '../src/skills/common.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness({fail=false,random=.5}={}){
  const settings={master:.8,sfx:.5,music:.6},audio=new AudioDirector({data:{settings}});audio.unlocked=true;
  const fallback=[];audio.sfx=(...args)=>fallback.push(args);
  let now=0,loads=0;const sources=[];
  const param=value=>({value,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
  const context={currentTime:1,state:'running',destination:{},resume:async()=>{},close:async()=>{context.closed=true;},
    createGain:()=>({gain:param(1),connect(){},disconnect(){}}),
    createBufferSource:()=>{const s={playbackRate:param(1),connect(){},disconnect(){},start(...args){this.args=args;this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;},
    decodeAudioData:async()=>({duration:2})};
  const player=new SkillAudio(audio,{createContext:()=>context,fetcher:async()=>{loads++;return{ok:!fail,arrayBuffer:async()=>new ArrayBuffer(0)};},clock:()=>now,random:()=>random});
  return {player,context,sources,settings,audio,fallback,advance(ms){now+=ms;},get loads(){return loads;}};
}

test('98 JSON briefs and eight UI sounds have complete recipe coverage, with intentional silence only',async()=>{
  const json=JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json','utf8'));
  const skills=[...Object.values(json.heroes).flat(),...json.shared,...Object.values(json.allies).flat()];
  assert.equal(skills.length,98);assert.deepEqual(Object.keys(manifest.skills).sort(),skills.map(s=>s.id).sort());assert.equal(Object.keys(manifest.ui).length,8);
  let silent=0;
  for(const skill of skills){const r=JSON.parse(await fs.readFile(`scripts/sfx-recipes/${skill.id}.json`,'utf8'));
    assert.equal(r.brief,skill.sfx);assert.deepEqual(Object.keys(r.sounds),manifest.skills[skill.id].kinds);
    if(/^None \(passive\)/.test(skill.sfx)){assert.equal(Object.keys(r.sounds).length,0);silent++;}
    else assert.ok(r.sounds[skill.kind==='active'?'cast':'proc'],skill.id);
    if(/loop|sustained/i.test(skill.sfx))assert.ok(r.sounds.loop,skill.id);
  }assert.equal(silent,8);
});

test('150 authored WAVs meet PCM, duration, peak, silence, seamless-loop and uniqueness gates',async()=>{
  const names=(await fs.readdir('scripts/sfx-recipes')).filter(n=>n.endsWith('.json')),hashes=new Set(),parameters=new Set();let count=0,loops=0;
  for(const name of names){const r=JSON.parse(await fs.readFile(`scripts/sfx-recipes/${name}`,'utf8'));
    for(const [kind,sound]of Object.entries(r.sounds)){
      assert.ok(sound.layers.length>=2,`${r.id} layers`);
      const signature=JSON.stringify({...sound,seed:undefined});assert.ok(!parameters.has(signature),`${r.id} duplicate params`);parameters.add(signature);
      const file=`public/assets/audio/sfx/${r.owner==='ui'?'ui':'skills'}/sfx-${r.id}${r.owner==='ui'?'':`-${kind}`}.wav`,bytes=await fs.readFile(file),m=inspectWav(bytes);
      assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(20),1);assert.equal(m.sampleRate,44100);assert.equal(m.channels,1);assert.equal(m.bits,16);
      assert.ok(Math.abs(m.duration-sound.duration)<=1/44100);assert.ok(Math.abs(m.peakDb-sound.peakDb)<.01);assert.ok(m.peak<1);assert.ok(m.leadingMs<=20,`${r.id}: ${m.leadingMs} ms`);
      if(kind==='cast')assert.ok(m.duration>=.2&&m.duration<=1);if(kind==='hit'||kind==='proc')assert.ok(m.duration>=.1&&m.duration<=.4);
      if(kind==='loop'){assert.ok(m.duration<=6);assert.ok(m.boundaryJump<=.002);loops++;}
      assert.ok(!hashes.has(m.hash),file);hashes.add(m.hash);count++;
    }
  }assert.equal(count,150);assert.equal(loops,18);
});

test('synthesis is deterministic, seeded and provides all oscillator / envelope primitives',async()=>{
  const r=JSON.parse(await fs.readFile('scripts/sfx-recipes/jaguar-roar.json','utf8')).sounds.cast;
  const a=wav(synthesize(r)),b=wav(synthesize(r));assert.deepEqual(a,b);
  assert.deepEqual(a,await fs.readFile('public/assets/audio/sfx/skills/sfx-jaguar-roar-cast.wav'));
  assert.notDeepEqual(a,wav(synthesize({...r,seed:r.seed+1})));
  for(const type of ['sine','saw','square','triangle'])for(let i=0;i<30;i++)assert.ok(Math.abs(oscillator(type,i*.37))<=1);
  assert.equal(adsr(-1,1),0);assert.equal(adsr(1,1),0);assert.ok(adsr(.01,1)>0);
});

test('buffer cache, 60 ms per-ID throttle, pitch ±5%, and bounded voice pools',async()=>{
  const h=harness({random:1}),p=h.player;
  assert.equal(p.play('jaguar-roar'),true);assert.equal(p.play('jaguar-roar'),false);await settle();
  assert.equal(h.sources.length,1);assert.equal(h.sources[0].playbackRate.value,1.05);
  for(let i=0;i<8;i++){h.advance(61);p.play('jaguar-roar');await settle();}
  assert.equal(h.loads,1);assert.equal(p.voices.filter(v=>!v.stopped).length,4);
  for(const id of Object.keys(manifest.skills).filter(id=>manifest.skills[id].kinds.includes('cast')).slice(0,30)){h.advance(61);p.play(id);await settle();}
  assert.ok(p.voices.filter(v=>!v.stopped).length<=24);p.destroy();assert.ok(h.sources.every(s=>s.stopped));assert.equal(h.audio.effectClients.size,0);
});

test('loop lifetime follows simulation time, pause/resume, early effect end and mute/volume settings',async()=>{
  const h=harness(),p=h.player;let active=true;
  p.loop('war-drum',{duration:6,isAlive:()=>active});p.loop('war-drum');await settle();assert.equal(h.sources.length,1);
  p.update(2);assert.equal(p.loops.get('war-drum').remaining,4);h.context.currentTime=1.5;
  p.pause();p.update(10);assert.equal(p.loops.get('war-drum').remaining,4);assert.equal(h.sources[0].stopped,true);
  assert.equal(p.play('jaguar-roar'),false);assert.equal(p.ui('pick-active'),true);await settle();
  p.resume();await settle();assert.equal(p.loops.get('war-drum').voice.offset,.5);
  h.settings.master=0;h.audio.applySettings();assert.equal(p.gain.gain.value,0);assert.equal(p.play('jaguar-roar'),false);
  h.settings.master=.5;h.settings.sfx=.4;h.audio.applySettings();assert.ok(Math.abs(p.gain.gain.value-.11)<1e-12);
  active=false;p.update(.1);assert.equal(p.loops.size,0);
  p.loop('clay-bomb',{duration:3});await settle();p.onFx('clay-bomb','impact');assert.equal(p.loops.size,0);
  p.loop('storm-nest',{duration:1});await settle();p.update(1);assert.equal(p.loops.size,0);p.destroy();
});

test('optional/silent cues are quiet; a missing file warns once and falls back without throwing',async()=>{
  const h=harness({fail:true}),warn=console.warn,warnings=[];console.warn=(message)=>warnings.push(message);
  try{assert.equal(h.player.play('bodyguard','proc'),false);assert.equal(h.player.play('jaguar-roar','hit'),false);assert.equal(h.loads,0);
    h.player.play('jaguar-roar');await settle();h.advance(100);h.player.play('jaguar-roar');await settle();
    assert.equal(warnings.length,1);assert.equal(h.fallback.length,2);assert.equal(h.player.missing.size,1);h.player.destroy();
  }finally{console.warn=warn;}
});

test('stopping/destroying before decode finishes cannot start a late loop or one-shot',async()=>{
  const h=harness(),p=h.player;let resolve;p.fetcher=()=>new Promise(done=>{resolve=done;});
  p.loop('war-drum');p.stop('war-drum');resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});await settle();assert.equal(h.sources.length,0);
  p.play('jaguar-roar');p.destroy();resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});await settle();assert.equal(h.sources.length,0);
});

test('real hero handler stops its loop and passive suppression / ally event cues stay tied to gameplay',()=>{
  const s=makeScene(HEROES.balam),cues=[];s.fx={play(){return null;}};s.skillAudio={play:(id,kind)=>cues.push(`${id}:${kind}`),loop:id=>cues.push(`${id}:loop`),stop:id=>cues.push(`${id}:stop`),ui:name=>cues.push(`ui:${name}`)};
  s.loadoutLevel=20;s.skillSlots=[{...HEROES.balam.skills.find(k=>k.id==='claw-cyclone'),level:1,remaining:0}];addEnemy(s);s.castSkill(0);
  assert.ok(cues.includes('claw-cyclone:loop'));for(let i=0;i<50;i++){s.elapsed+=.1;updateSkillEffects(s,.1);}assert.ok(cues.includes('claw-cyclone:stop'));
  s.hud.setAlly=()=>{};s.support=new SupportSystem(s);s.support.summon('tank',5);assert.ok(cues.includes('ui:companion-join'));
  s.support.syncLevel(10);assert.ok(cues.includes('ui:ally-rank'));
  s.support.equip(ALLY_CATALOG.tank.find(k=>k.id==='guardian-link'));assert.ok(cues.includes('ui:pick-ally'));
  s.support.preventFatal(10);assert.ok(cues.includes('guardian-link:proc'));s.companion.skills[0].remaining=0;s.support.brain.evaluate();assert.ok(cues.includes('ui:ally-cast'));
});
