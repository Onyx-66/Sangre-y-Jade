import test from 'node:test';
import assert from 'node:assert/strict';
import bosses from '../src/data/bosses-v06.json' with {type:'json'};
import {BossController} from '../src/systems/BossController.js';
import {EnemyBehaviorSystem} from '../src/systems/EnemyBehaviorSystem.js';
import {Telegraph} from '../src/systems/Telegraph.js';
import {BOSS_BEHAVIORS} from '../src/bosses/index.js';
import {makeScene,addEnemy,sprite} from './helpers/scene-fixture.js';
import {HEROES} from '../src/data/heroes.js';
import {at,parameters} from '../src/bosses/common.js';
import {inFlareGap} from '../src/bosses/vucub.js';
import {CutsceneDirector} from '../src/systems/CutsceneDirector.js';

const near=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function fixture(id,{hero='kukul',phase=0}={}){
 const scene=makeScene(HEROES[hero]),definition=bosses.find(d=>d.id===id);
 scene.elapsed=0;scene.stats.hp=scene.stats.maxHp=10000;scene.enemySerial=1;scene.mapData.id='overgrown';scene.lastMove.set(1,0);
 const damage=[],fx=[],audio=[];scene.options.bossHooks={audio:id=>audio.push(id)};scene.fx={play:(...args)=>fx.push(args)};
 scene.enemySystem=new EnemyBehaviorSystem(scene,{graphics:null});scene.telegraphs=new Telegraph(scene,{graphics:null,sound:()=>{}});
 const boss=addEnemy(scene,{isBoss:true,bossId:id,hp:definition.hp,maxHp:definition.hp,speed:60,damage:definition.damage,serial:1},0,0);
 scene.activeBoss=boss;scene.player.setPosition(100,0);scene.bossController=new BossController(scene,{graphics:null});
 const state=scene.bossController.init(boss,definition,{initialDelay:Infinity});state.phase=phase;
 const original=scene.damagePlayer.bind(scene);scene.damagePlayer=(amount,x,y,source,melee,options)=>{
  const before=scene.stats.hp,result=original(amount,x,y,source,melee,options);
  if(scene.stats.hp<before)damage.push({amount:before-scene.stats.hp,time:scene.elapsed,options});return result;};
 const p=id=>parameters(scene.bossController.context(),id);
 const cast=id=>{
  const ctx=scene.bossController.context(),ability=state.behavior.abilities(ctx).find(a=>a.id===id);
  assert.ok(ability,`Missing ${id}`);assert.ok(scene.bossController.cast(state,ability,ctx),`Did not cast ${id}`);return ability;
 };
 const step=seconds=>{for(let rest=seconds;rest>1e-9;){const dt=Math.min(.01,rest);rest-=dt;
  if(scene.pausedForChoice||scene.ended)continue;scene.elapsed+=dt;scene.invulnerable=Math.max(0,scene.invulnerable-dt);
  scene.bossController.updateWorld(dt);scene.updateEnemies(dt);scene.telegraphs.update(dt);
 }};
 return {scene,boss,state,p,cast,step,damage,fx,audio,definition};
}

test('Camazotz Sonic Screech is a90-degree320 cone:18 damage,200 knockback,1s confusion',()=>{
 const {scene:s,cast,step,p}=fixture('camazotz');cast('sonic-screech');step(p('sonic-screech').windup);
 near(s.stats.hp,9982);near(s.player.x,300);near(s.player.getData('confuseUntil')-s.elapsed,1);
 s.hud.move={x:1,y:0};s.updateMovement(.01);near(s.player.body.velocity.x,-s.stats.speed*s.passives.modifiers().speedMult);
 const miss=fixture('camazotz');miss.cast('sonic-screech');miss.scene.player.setPosition(0,100);miss.step(.8);near(miss.scene.stats.hp,10000);
});
test('Camazotz Bat Swarm warns sixV positions and summons sixCave Bats; ground-only aliases stay playable',()=>{
 for(const hero of ['kukul','balam']){const f=fixture('camazotz',{hero});f.cast('bat-swarm');assert.equal(f.scene.telegraphs.live.size,6);
  f.step(.5);const adds=f.scene.enemies.getChildren().filter(e=>e.active&&!e.getData('isBoss'));
  assert.equal(adds.length,6);assert.ok(adds.every(e=>e.getData('type')===(hero==='balam'?'shade':'bat')));
  assert.equal(new Set(adds.map(e=>`${e.x}/${e.y}`)).size,6);
 }
});
test('Camazotz Blood Dive travels600 at520, hits24 once and leaves a3s6DPS trail',()=>{
 const f=fixture('camazotz');f.cast('blood-dive');f.step(.7);near(f.boss.x,0);f.step(600/520);near(f.boss.x,600);
 assert.equal(f.damage.filter(d=>!d.options.dot).length,1);near(f.damage.find(d=>!d.options.dot).amount,24);
 f.scene.player.setPosition(300,0);const hp=f.scene.stats.hp;f.step(.5);near(hp-f.scene.stats.hp,3);
 f.step(3.1);const later=f.scene.stats.hp;f.step(.5);near(f.scene.stats.hp,later);assert.equal(f.state.runtime.tasks.length,0);
});
test('Camazotz Eclipse uses a280px moving visibility hole for exactly10s, without hidden damage',()=>{
 const f=fixture('camazotz',{phase:1});f.cast('eclipse');f.step(1);const task=f.state.runtime.tasks[0];near(task.duration,10);near(f.p('eclipse').radius,280);
 const calls=[],g=new Proxy({},{get:(_,name)=>(...args)=>{calls.push([name,...args]);return g;}});f.state.runtime.dark=g;
 f.scene.player.setPosition(250,75);f.step(.01);const polygons=calls.filter(c=>c[0]==='fillPoints');assert.equal(polygons.length,2);
 assert.ok(polygons.some(c=>c[1].some(q=>Math.abs(q.x-530)<1e-6&&Math.abs(q.y-75)<1e-6)));
 f.step(9.99);assert.equal(f.state.runtime.tasks.length,0);near(f.scene.stats.hp,10000);
});
test('Camazotz Twin Dive has two crossing warnings and simultaneous600-unit dives; phase2 speed is+15%',()=>{
 const f=fixture('camazotz',{phase:1});near(f.scene.bossController.context().speed,69);f.cast('twin-dive');
 const warnings=[...f.scene.telegraphs.live];assert.equal(warnings.length,2);near(warnings[1].angle-warnings[0].angle,Math.PI/2);
 for(const w of warnings){const midpoint=at(w,300,w.angle);near(midpoint.x,100);near(midpoint.y,0);}
 f.step(.8);assert.equal(f.state.runtime.tasks.length,4);f.step(600/520);near(f.boss.x,100+300/Math.sqrt(2));near(f.boss.y,-300/Math.sqrt(2));
});
test('Zipacna Stone Slam hits only r150 for26 with220 knockback',()=>{
 const f=fixture('zipacna');f.cast('stone-slam');f.step(.9);near(f.scene.stats.hp,9974);near(f.scene.player.x,320);
});
test('Zipacna Rock Rain has exactly8 independent r55 markers and20-damage boulders',()=>{
 const f=fixture('zipacna');f.cast('rock-rain');const warnings=[...f.scene.telegraphs.live];assert.equal(warnings.length,8);assert.ok(warnings.every(w=>w.radius===55&&w.windup===1));
 f.step(.99);assert.equal(f.damage.length,0);f.step(.01);near(f.damage[0].amount,20);
});
test('Zipacna Fissure Line erupts sequentially over1.2s along700x70, not as an immediate full-line hit',()=>{
 const f=fixture('zipacna');f.scene.player.setPosition(650,0);f.cast('fissure-line');f.step(.8);assert.equal(f.damage.length,0);
 f.step(.9);assert.equal(f.damage.length,0);f.step(.15);near(f.damage[0].amount,24);near(f.p('fissure-line').width,70);
});
test('Zipacna Stone Armor has3 shootable150HP stones;50% reduction ends only after the third dies, with no loot',()=>{
 const f=fixture('zipacna',{phase:1});f.cast('stone-armor');f.step(.5);assert.equal(f.state.heartStones.length,3);near(f.boss.getData('bossArmorPct'),.5);
 for(const t of f.state.heartStones)assert.equal(t.actor.getData('maxHp'),150);
 const hp=f.boss.getData('hp');f.scene.damageEnemy(f.boss,100,0,0,f.scene.player,{canCrit:false,visuals:false});near(f.boss.getData('hp'),hp-50);
 for(const [i,t]of f.state.heartStones.entries()){
  const shot=f.scene.fireProjectile(t.actor.x,t.actor.y,0,150,500,1);f.scene.onProjectileHit(shot,t.actor);
  near(f.boss.getData('bossArmorPct'),i===2?0:.5);
 }
 assert.equal(f.scene.stats.kills,0);assert.equal(f.scene.pickups.countActive(),0);assert.equal(f.state.runtime.targets.length,0);
});
test('Zipacna Avalanche warns staggered edge falls; all r55 footprints are inside its600 arena and hit16',()=>{
 const f=fixture('zipacna',{phase:1});f.cast('avalanche');f.step(.51);const w=[...f.scene.telegraphs.live][0];assert.ok(w);near(Math.hypot(w.x,w.y)+w.radius,600);
 f.scene.player.setPosition(w.x,w.y);f.step(.69);assert.equal(f.damage.length,0);f.step(.02);near(f.damage[0].amount,16);
});
test('Vucub Sunbeam Sweep is520x50 rotating180degrees over4s,20 per.3s contact and recovery follows the channel',()=>{
 const f=fixture('vucub');f.cast('sunbeam-sweep');f.step(1);const channel=f.state.channel;assert.ok(channel);near(channel.duration,4);
 f.scene.player.setPosition(0,0);f.step(.9);assert.equal(f.damage.length,3);assert.ok(f.damage.every(d=>d.amount===20));
 f.step(3.1);assert.equal(f.state.channel,null);near(f.state.recoveryUntil-f.scene.elapsed,1.2);near(f.p('sunbeam-sweep').rotation,Math.PI);
});
test('Vucub Feather Barrage fires9 feathers at260 for12 only after its.5s warning',()=>{
 const f=fixture('vucub');f.cast('feather-barrage');f.step(.49);assert.equal(f.scene.enemyProjectiles.countActive(),0);f.step(.01);
 const shots=f.scene.enemyProjectiles.getChildren();assert.equal(shots.length,9);assert.ok(shots.every(s=>s.getData('damage')===12&&Math.abs(s.body.speed-260)<1e-6));
});
test('Vucub Solar Flare Rings have3 distinct expanding rings,2 safe gaps each,20 damage outside and none inside',()=>{
 assert.ok(inFlareGap(0,[0,Math.PI],Math.PI/3));assert.ok(!inFlareGap(Math.PI/2,[0,Math.PI],Math.PI/3));
 const safe=fixture('vucub');safe.cast('solar-flare-rings');assert.equal([...safe.scene.telegraphs.live][0].safeAngles.length,2);safe.step(3);near(safe.scene.stats.hp,10000);
 const unsafe=fixture('vucub');unsafe.cast('solar-flare-rings');unsafe.scene.player.setPosition(0,100);unsafe.step(3);assert.equal(unsafe.damage.length,3);assert.ok(unsafe.damage.every(d=>d.amount===20));
});
test('Vucub Second Sun spawns3 shootable80HP orbs, destroying an orb stuns boss1.5s, contact hits22',()=>{
 const f=fixture('vucub',{phase:1});f.cast('second-sun');f.step(.5);assert.equal(f.state.sunOrbs.length,3);
 const [t]=f.state.sunOrbs;near(t.actor.getData('hp'),80);f.scene.damageEnemy(t.actor,80,0,0,f.scene.player,{canCrit:false,visuals:false});near(f.boss.getData('stunUntil')-f.scene.elapsed,1.5);
 f.step(1.5);const other=f.state.sunOrbs[1];other.actor.setPosition(f.scene.player.x,f.scene.player.y);f.scene.bossController.updateObject(other.actor,.01);
 assert.ok(f.damage.some(d=>d.amount===22));assert.equal(other.actor.active,false);
});
test('Vucub Zenith is invulnerable for4s flight plus1.2s landing warning, then crashes r200 for34',()=>{
 const f=fixture('vucub',{phase:2});f.cast('zenith');near(f.scene.bossController.damageMultiplier(f.boss),0);f.step(4);
 const w=[...f.scene.telegraphs.live][0];assert.ok(w);near(w.windup,1.2);near(w.radius,200);assert.equal(f.damage.length,0);
 f.step(1.19);assert.equal(f.damage.length,0);f.step(.01);near(f.damage[0].amount,34);near(f.boss.x,100);near(f.scene.bossController.damageMultiplier(f.boss),1);
});
test('Ah Puch Death Gaze tracks then locks for the final.5s;520 laser deals28 every.3s for1s',()=>{
 const f=fixture('ahpuch');f.cast('death-gaze');f.scene.player.setPosition(0,100);f.step(.8);const w=[...f.scene.telegraphs.live][0];near(w.angle,Math.PI/2);
 f.step(.2);f.scene.player.setPosition(100,0);f.step(.49);near(w.angle,Math.PI/2);assert.equal(f.damage.length,0);
 f.scene.player.setPosition(0,100);f.step(.91);assert.equal(f.damage.length,3);assert.ok(f.damage.every(d=>d.amount===28));
});
test('Ah Puch Bone Spear Ring emits12 at r220 and12 half-step-offset spears with a separate.5s warning',()=>{
 const f=fixture('ahpuch');f.cast('bone-spear-ring');assert.equal(f.scene.telegraphs.live.size,12);f.step(.8);
 assert.equal(f.scene.enemyProjectiles.countActive(),12);assert.equal(f.scene.telegraphs.live.size,12);f.step(.49);assert.equal(f.scene.enemyProjectiles.countActive(),12);f.step(.01);
 const shots=f.scene.enemyProjectiles.getChildren();assert.equal(shots.length,24);assert.ok(shots.every(s=>s.getData('damage')===20&&Math.abs(Math.hypot(s.x,s.y)-220)<1e-6));
 near(Math.atan2(shots[12].y,shots[12].x)-Math.atan2(shots[0].y,shots[0].x),Math.PI/12);
});
test('Ah Puch Soul Drain pulls only within r380 for2s, deals10 once and heals actual lost HP without exceeding max',()=>{
 const f=fixture('ahpuch');f.boss.setData('hp',f.definition.hp-100);f.cast('soul-drain');f.step(.6);near(f.scene.stats.hp,9990);near(f.boss.getData('hp'),f.definition.hp-90);
 assert.ok(f.scene.player.getData('bossPull'));f.scene.hud.move={x:0,y:0};f.scene.updateMovement(.01);near(f.scene.player.body.velocity.x,-100);
 f.step(2);assert.equal(f.scene.player.getData('bossPull'),null);
 const outside=fixture('ahpuch');outside.scene.player.setPosition(400,0);outside.cast('soul-drain');outside.step(.6);assert.equal(outside.scene.player.getData('bossPull'),undefined);near(outside.scene.stats.hp,10000);
});
test('Ah Puch Summon Lords opens2 portals and summons2 eliteHollow Priests after1s',()=>{
 const f=fixture('ahpuch');f.cast('summon-lords');assert.equal(f.scene.telegraphs.live.size,2);f.step(1);
 const adds=f.scene.enemies.getChildren().filter(e=>e.active&&!e.getData('isBoss'));assert.equal(adds.length,2);assert.ok(adds.every(e=>e.getData('type')==='priest'&&e.getData('affix')==='armored'));
});
test('Ah Puch Xibalba Shift has4 r120 lights, moves them every15s and deals8DPS only outside light inside arena',()=>{
 const f=fixture('ahpuch',{phase:1});f.cast('xibalba-shift');f.step(2);assert.equal(f.state.fog.circles.length,4);assert.ok(f.state.fog.circles.every(c=>c.radius===120));
 f.scene.player.setPosition(0,0);let hp=f.scene.stats.hp;f.step(1);near(hp-f.scene.stats.hp,8);
 const c=f.state.fog.circles[0];f.scene.player.setPosition(c.x,c.y);hp=f.scene.stats.hp;f.step(1);near(hp-f.scene.stats.hp,0);
 f.scene.player.setPosition(700,0);hp=f.scene.stats.hp;f.step(13);near(hp-f.scene.stats.hp,0);assert.equal(f.state.fog.moves,1);f.step(2);assert.notDeepEqual(f.state.fog.circles[0],c);
});
test('Ah Puch Final Rite has exactly3 r130 circles;80 blast at6s into phase, repeats every20s, phase3 speed+25%',()=>{
 const f=fixture('ahpuch',{phase:2});near(f.scene.bossController.context().speed,75);f.state.initialReady=0;
 const original=f.state.behavior;f.state.behavior={...original,move:()=>{}};
 f.scene.bossController.update(f.boss,0);assert.equal(f.scene.telegraphs.live.size,0);
 f.step(1);const w=[...f.scene.telegraphs.live][0];assert.ok(w);assert.equal(w.safeCircles.length,3);assert.ok(w.safeCircles.every(c=>c.radius===130));
 f.scene.player.setPosition(0,0);f.step(4.99);assert.equal(f.damage.length,0);f.step(.01);near(f.damage[0].time,6);near(f.damage[0].amount,80);
 // Isolate the Rite's scheduler from other real attacks for exact cooldown proof.
 f.state.behavior={...f.state.behavior,abilities:ctx=>original.abilities(ctx).filter(a=>a.id==='final-rite')};
 f.step(19.99);assert.equal(f.damage.length,1);f.step(.01);near(f.damage[1].time,26);near(f.damage[1].amount,80);
 const safe=fixture('ahpuch',{phase:2});safe.cast('final-rite');const c=[...safe.scene.telegraphs.live][0].safeCircles[0];safe.scene.player.setPosition(c.x,c.y);safe.step(5);near(safe.scene.stats.hp,10000);
 const outside=fixture('ahpuch',{phase:2});outside.scene.player.setPosition(900,0);outside.cast('final-rite');outside.step(5);near(outside.scene.stats.hp,9920);
});

for(const definition of bosses)for(let phase=1;phase<definition.phases.length;phase++)test(`${definition.id}: phase${phase+1} transitions once at${definition.phases[phase].threshold*100}% including multiphase jumps`,()=>{
 const f=fixture(definition.id);const events=[];f.scene.options.bossHooks.phase=({index})=>events.push(index);
 f.boss.setData('hp',definition.hp*definition.phases[phase].threshold+.001);f.scene.bossController.phaseChanged();assert.equal(f.state.phase,phase-1);
 f.boss.setData('hp',definition.hp*definition.phases[phase].threshold);f.scene.bossController.phaseChanged();assert.equal(f.state.phase,phase);
 f.scene.bossController.phaseChanged();assert.deepEqual(events,Array.from({length:phase},(_,i)=>i+1));
 f.boss.setData('hp',definition.hp);f.scene.bossController.phaseChanged();assert.equal(f.state.phase,phase);
 const jumped=fixture(definition.id);jumped.boss.setData('hp',1);jumped.scene.bossController.phaseChanged();assert.equal(jumped.state.phase,definition.phases.length-1);
});
for(const d of bosses)for(const [index,phase]of d.phases.entries())for(const row of phase.abilities)test(`${d.id}/${row.id}: no damage, projectile or summon before the entire warning ends`,()=>{
 const f=fixture(d.id,{phase:index});f.cast(row.id);const delay=row.parameters.windup+(row.parameters.trail||0);
 f.step(delay-.01);assert.equal(f.damage.length,0);assert.equal(f.scene.enemyProjectiles.countActive(),0);assert.equal(f.state.runtime.targets.length,0);assert.equal(f.scene.enemies.countActive(),1);
 f.step(.02);assert.equal(f.scene.bossController.casts[`${d.id}:${row.id}`],1);
 assert.ok(f.fx.some(([id])=>id===`boss-${d.id}-${row.id}-accent`));assert.ok(f.audio.includes(`boss-${d.id}-${row.id}-cast`));
});
test('boss channels, persistent zones and shootable targets freeze on choices and clean up on death/reuse',()=>{
 for(const [id,skill,phase]of [['camazotz','blood-dive',0],['vucub','second-sun',1],['ahpuch','xibalba-shift',1],['vucub','zenith',2]]){
  const f=fixture(id,{phase});f.cast(skill);f.step(skill==='zenith'?2:2.1);const age=f.state.runtime.tasks.map(t=>t.age),hp=f.scene.stats.hp;
  f.scene.pausedForChoice=true;f.step(3);assert.deepEqual(f.state.runtime.tasks.map(t=>t.age),age);near(f.scene.stats.hp,hp);
  f.scene.pausedForChoice=false;f.scene.bossController.destroy();assert.equal(f.scene.telegraphs.live.size,0);assert.equal(f.state.runtime.tasks.length,0);assert.equal(f.state.runtime.targets.length,0);
 }
});
test('stun cancels tracking laser and airborne Zenith without a late hit or lingering invulnerability',()=>{
 for(const [id,skill,phase]of [['ahpuch','death-gaze',0],['vucub','zenith',2]]){const f=fixture(id,{phase});f.cast(skill);f.step(.4);f.boss.setData('stunUntil',20);f.step(6);
  assert.equal(f.damage.length,0);assert.equal(f.state.channel,null);assert.equal(f.state.busy,null);assert.equal(f.scene.telegraphs.live.size,0);
  if(id==='vucub')near(f.scene.bossController.damageMultiplier(f.boss),1);
 }
});
test('each entry has distinct procedural choreography, honours skip/reduced motion and destroys temporary drawing',()=>{
 const kinds=[];for(const definition of bosses){const f=fixture(definition.id),calls=[],g=new Proxy({},{get:(_,name)=>(...args)=>{calls.push(name);return g;}});
  f.scene.add.graphics=()=>g;const entry=BOSS_BEHAVIORS[definition.id].entry(f.scene.bossController.context());kinds.push(entry.kind);entry.update(.4);assert.ok(calls.includes('clear'));entry.finish();entry.finish();assert.equal(calls.filter(n=>n==='destroy').length,1);
  assert.ok(f.audio.includes(`boss-${definition.id}-entry-cast`));
 }
 assert.equal(new Set(kinds).size,4);
});
test('destroyed heart stones reused as ordinary enemies cannot keep Stone Armor active',()=>{
 const f=fixture('zipacna',{phase:1});f.cast('stone-armor');f.step(.5);const [first,...remaining]=f.state.heartStones;
 f.scene.damageEnemy(first.actor,150,0,0,f.scene.player,{canCrit:false,visuals:false});
 first.actor.enableBody(true,600,600,true,true).setData({serial:99,bossObject:false,bossTarget:null,hp:72,maxHp:72});
 for(const t of remaining)f.scene.damageEnemy(t.actor,150,0,0,f.scene.player,{canCrit:false,visuals:false});
 near(f.boss.getData('bossArmorPct'),0);assert.ok(first.actor.active);assert.equal(first.actor.getData('hp'),72);
});
test('Zenith cancellation after source-body reuse never changes the new actor alpha or invulnerability',()=>{
 const f=fixture('vucub',{phase:2});f.boss.setAlpha=value=>{f.boss.alpha=value;return f.boss;};f.cast('zenith');f.step(.4);
 f.boss.setData({serial:99,bossState:null,bossInvulnerableUntil:20}).setAlpha(.7);
 f.scene.bossController.updateWorld(.01);near(f.boss.alpha,.7);near(f.boss.getData('bossInvulnerableUntil'),20);
 assert.equal(f.state.runtime.tasks.length,0);assert.equal(f.damage.length,0);
});
test('root cancels physical and ghost dives without teleporting on channel completion; non-moving casts remain allowed',()=>{
 const f=fixture('camazotz',{phase:1});f.cast('twin-dive');f.step(.9);const x=f.boss.x,y=f.boss.y;
 f.boss.setData('rootUntil',20);f.step(2);near(f.boss.x,x);near(f.boss.y,y);
 assert.ok(f.state.runtime.tasks.every(t=>!t.movement));assert.equal(f.state.channel,null);
 f.boss.setData('rootUntil',0);f.step(1.3);f.boss.setData('rootUntil',20);f.cast('sonic-screech');f.step(.8);
 assert.equal(f.scene.bossController.casts['camazotz:sonic-screech'],1);
});
test('aborting an entrance after boss-body reuse destroys its drawing without mutating the new actor',()=>{
 const f=fixture('camazotz');let destroyed=0;const g=new Proxy({destroy(){destroyed++;}},{get:(o,key)=>o[key]||(()=>g)});
 f.scene.add.graphics=()=>g;f.scene.physics={pause(){},resume(){}};f.scene.tweens.pauseAll=f.scene.tweens.resumeAll=()=>{};
 f.boss.setAlpha=value=>{f.boss.alpha=value;return f.boss;};
 const director=new CutsceneDirector(f.scene),entry=BOSS_BEHAVIORS.camazotz.entry(f.scene.bossController.context());
 assert.ok(director.start(f.boss,f.definition,{entry}));f.boss.setData('serial',99).setAlpha(.7);
 director.update(.1);assert.equal(director.active,false);assert.equal(destroyed,1);near(f.boss.alpha,.7);
});
test('Final Rite still blasts at phase+6s when the threshold interrupts a previous channel in recovery',()=>{
 const f=fixture('ahpuch',{phase:1});f.cast('death-gaze');f.step(1.6);assert.ok(f.state.channel);
 f.boss.setData('hp',f.definition.hp*.33);f.scene.bossController.phaseChanged();const phaseStart=f.scene.elapsed;
 assert.equal(f.state.channel,null);near(f.state.recoveryUntil-phaseStart,1.2);f.state.initialReady=0;
 f.scene.player.setPosition(0,0);f.step(5.99);assert.equal(f.damage.length,0);f.step(.01);
 near(f.damage[0].time,phaseStart+6);near(f.damage[0].amount,80);
});
test('a reused Lurker/Golem body cannot make heart stones or sun orbs buried, shielded or reflective',()=>{
 const f=fixture('vucub',{phase:1}),old=addEnemy(f.scene,{buried:true,invulnerableEnemy:true,prismUntil:20,prismReflect:1,
  wardShield:40,wardUntil:20,shield:90,maxShield:90,affix:'shielded',serial:70});old.disableBody(true,true);
 const get=f.scene.enemies.get.bind(f.scene.enemies);let reuse=true;f.scene.enemies.get=(...args)=>{if(reuse){reuse=false;return old;}return get(...args);};
 f.cast('second-sun');f.step(.5);assert.equal(f.state.sunOrbs[0].actor,old);
 for(const key of ['buried','invulnerableEnemy'])assert.equal(old.getData(key),false);
 for(const key of ['prismUntil','wardShield','shield','maxShield'])assert.equal(old.getData(key),0);
 const shot=f.scene.fireProjectile(old.x,old.y,0,80,500,1);f.scene.onProjectileHit(shot,old);
 assert.equal(old.active,false);near(f.boss.getData('stunUntil')-f.scene.elapsed,1.5);assert.equal(f.scene.enemyProjectiles.countActive(),0);
});
