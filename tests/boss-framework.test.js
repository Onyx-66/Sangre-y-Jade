import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import definitions from '../src/data/bosses-v06.json' with {type:'json'};
import {compileBosses} from '../scripts/compile-bosses-v06.mjs';
import {BossController,bossStateDefaults} from '../src/systems/BossController.js';
import {CutsceneDirector,entranceSteps} from '../src/systems/CutsceneDirector.js';
import {BOSS_BEHAVIORS} from '../src/bosses/index.js';
import {BOSS_FAIRNESS,fairAbility,bossDamage,warningEdgePoint} from '../src/bosses/rules.js';
import {Telegraph} from '../src/systems/Telegraph.js';
import {BOSSES} from '../src/data/world.js';
import {makeScene,addEnemy,sprite} from './helpers/scene-fixture.js';
import {HEROES} from '../src/data/heroes.js';
import {setLanguage,t,hasTranslation} from '../src/i18n/index.js';
import {bossV06Messages} from '../src/i18n/bosses-v06.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture({phases=[{threshold:1,speedMult:1},{threshold:.5,speedMult:1.15,invulnerability:.8},{threshold:.25,speedMult:1.25}],ability={},definition={}}={}){
 const scene=makeScene(HEROES.kukul);scene.elapsed=0;scene.stats.hp=scene.stats.maxHp=1000;scene.modeData={id:'quick',duration:600};
 scene.options.bossHooks={};scene.nextBossIndex=0;scene.finalSpawned=false;
 scene.telegraphs=new Telegraph(scene,{graphics:null,sound:()=>{}});
 scene.cameras={main:{width:640,height:360,scrollX:-320,scrollY:-180,zoomX:.5,zoomY:.5,lerp:{x:.09,y:.09},_follow:scene.player,
  setZoom(x,y=x){this.zoomX=x;this.zoomY=y;return this;},centerOn(x,y){this.scrollX=x-this.width/2;this.scrollY=y-this.height/2;return this;},
  stopFollow(){this._follow=null;},startFollow(player){this._follow=player;}}};
 scene.physics={world:{isPaused:false},pause(){this.world.isPaused=true;},resume(){this.world.isPaused=false;}};
 scene.tweens.paused=false;scene.tweens.pauseAll=()=>{scene.tweens.paused=true;};scene.tweens.resumeAll=()=>{scene.tweens.paused=false;};
 const classes=new Set();scene.hud.el={style:{opacity:'.85'},classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}};
 scene.skillAudio={paused:false,pause(){this.paused=true;},resume(){this.paused=false;}};
 const row={id:'stub',name:'Stub',epithet:'Test',entryDuration:5,phases:phases.map(p=>({abilities:[],...p})),...definition};
 const events=[];scene.options.bossHooks.phase=({index})=>events.push(`phase:${index}`);
 const attacks={id:'blast',windup:.1,recovery:.1,cooldown:2,shape:()=>({shape:'circle',radius:200}),
  execute:(ctx,w)=>{events.push('execute');scene.executedAt=scene.elapsed;ctx.damage(999,w.x,w.y);},...ability};
 const behavior={id:'stub',move:ctx=>ctx.boss.setVelocity(Math.cos(ctx.angle)*ctx.speed,Math.sin(ctx.angle)*ctx.speed),abilities:()=>[attacks]};
 scene.bossController=new BossController(scene,{bosses:[row],behaviors:{stub:behavior},graphics:null,random:()=>0});
 const boss=addEnemy(scene,{isBoss:true,bossId:'stub',speed:100,hp:1000,maxHp:1000,...bossStateDefaults()},100,0);scene.activeBoss=boss;
 scene.bossController.init(boss,row,{initialDelay:0});
 scene.step=seconds=>{for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(.01,remaining);remaining-=dt;
  if(scene.pausedForChoice||scene.ended)continue;scene.elapsed+=dt;scene.bossController.updateWorld(dt);scene.updateEnemies(dt);scene.telegraphs.update(dt);}};
 return {scene,boss,row,events,attacks,behavior};
}
function presentation(){return {updates:[],start(definition,options){this.definition=definition;this.options=options;},
 update(value){this.updates.push(value);},finish(options){this.finished=options;},clearWarning(){}};}

test('all four definitions retain every JSON number, phase and ability; only temporary current behaviours are registered',()=>{
 if(existsSync('docs/v0.6/v06_design.json'))assert.deepEqual(definitions,compileBosses(JSON.parse(readFileSync('docs/v0.6/v06_design.json','utf8'))));
 assert.deepEqual(definitions.map(d=>d.hp),[1400,2300,3300,7800]);assert.deepEqual(definitions.map(d=>d.damage),[18,26,30,34]);
 assert.deepEqual(definitions.map(d=>d.entryDuration),[5,5,6,8]);assert.deepEqual(definitions.map(d=>d.arrival.quick),[150,300,450,600]);
 assert.deepEqual(definitions.map(d=>d.arrival.full),[300,600,900,1200]);assert.deepEqual(Object.keys(BOSS_BEHAVIORS),definitions.map(d=>d.id));
 assert.ok(Object.values(BOSS_BEHAVIORS).every(b=>b.temporary&&typeof b.entry==='function'));
 assert.deepEqual(BOSSES.map(d=>d.hp),definitions.map(d=>d.hp));
});
test('phases transition at exact thresholds, emit each crossed phase once and never regress on healing',()=>{
 const {scene:s,boss:b,events}=fixture();b.setData('hp',501);s.bossController.phaseChanged();assert.equal(b.getData('bossState').phase,0);
 b.setData('hp',500);s.bossController.phaseChanged();assert.equal(b.getData('bossState').phase,1);assert.deepEqual(events,['phase:1']);
 b.setData('hp',249);s.bossController.phaseChanged();s.bossController.phaseChanged();b.setData('hp',900);s.bossController.phaseChanged();
 assert.deepEqual(events,['phase:1','phase:2']);
 const jumped=fixture();jumped.boss.setData('hp',200);jumped.scene.bossController.phaseChanged();assert.deepEqual(jumped.events,['phase:1','phase:2']);
});
test('damaging cast is telegraphed before execute and every big cast has at least1.2s recovery',()=>{
 const {scene:s,events}=fixture();s.updateBoss(s.activeBoss,0);const warning=[...s.telegraphs.live][0];near(warning.windup,.5);assert.deepEqual(events,[]);
 s.step(.49);assert.equal(s.stats.hp,1000);assert.deepEqual(events,[]);s.step(.02);assert.deepEqual(events,['execute']);near(s.stats.hp,920);
 const state=s.bossController.state;near(state.recoveryUntil-s.executedAt,1.2);const castCount=Object.values(s.bossController.casts).reduce((a,b)=>a+b,0);
 s.step(1.18);assert.equal(Object.values(s.bossController.casts).reduce((a,b)=>a+b,0),castCount);assert.equal(s.telegraphs.live.size,0);
 s.step(.82);assert.ok(s.telegraphs.live.size||Object.values(s.bossController.casts).reduce((a,b)=>a+b,0)>castCount);
});
test('phase transformations block hits and DOT until the explicit invulnerability window ends',()=>{
 const {scene:s,boss:b}=fixture();b.setData('hp',500);s.bossController.phaseChanged();const hp=b.getData('hp');
 s.damageEnemy(b,50,0,0,s.player,{canCrit:false});s.damageEnemy(b,50,0,0,s.player,{dot:true});near(b.getData('hp'),hp);
 s.elapsed=.79;s.damageEnemy(b,50,0,0,s.player,{dot:true});near(b.getData('hp'),hp);s.elapsed=.8;
 s.damageEnemy(b,50,0,0,s.player,{canCrit:false,visuals:false});near(b.getData('hp'),hp-50);
});
test('phase and optional timed enrage multipliers are read without inventing timers or compounding speed',()=>{
 const {scene:s,boss:b}=fixture({definition:{enrage:{after:2,speedMult:1.2,damageMult:2}}});b.setData('hp',500);s.bossController.phaseChanged();near(s.bossController.context().speed,115);
 s.elapsed=2;s.bossController.updateWorld(.01);near(s.bossController.context().speed,138);s.bossController.updateWorld(.01);near(s.bossController.context().speed,138);
 s.bossController.context().damage(100);near(s.stats.hp,920);assert.ok(definitions.every(d=>d.enrage===undefined));
});
test('stun, silence, death and recycled boss bodies cannot execute a pending warning',()=>{
 for(const change of ['stun','silence','death','reuse']){
  const {scene:s,boss:b,events}=fixture();s.updateBoss(b,0);
  if(change==='stun')b.setData('stunUntil',10);if(change==='silence')b.setData('silenceUntil',10);if(change==='death')b.active=false;if(change==='reuse')b.setData('serial',99);
  s.step(.7);assert.deepEqual(events,[],change);near(s.stats.hp,1000);assert.equal(s.telegraphs.live.size,0,change);
 }
});
test('cancelled casts consume cooldown and a full warning pool cannot leave a boss stuck',()=>{
 const {scene:s,boss:b}=fixture();s.bossController.update(b,0);near(s.bossController.state.cooldowns.blast,2);
 s.telegraphs.cancelOwner(b);s.elapsed=1.2;s.bossController.update(b,0);assert.equal(s.telegraphs.live.size,0);
 s.elapsed=2;s.telegraphs.capacity=0;s.bossController.update(b,0);assert.equal(s.bossController.state.busy,null);
 near(s.bossController.state.cooldowns.blast,2);s.telegraphs.capacity=64;s.bossController.update(b,0);assert.equal(s.telegraphs.live.size,1);
});
test('boss single hits stay capped after vulnerability and expired pooled sources; ordinary hits are unchanged',()=>{
 const {scene:s,boss:b}=fixture();s.stats.damageTakenMult=2;s.damagePlayer(999,100,0,b);near(s.stats.hp,920);
 s.invulnerable=0;const shot=s.spawnEnemyProjectile(0,0,0,200,999,b);b.setData('serial',99);s.onEnemyProjectileHit(shot);near(s.stats.hp,840);
 s.invulnerable=0;s.damagePlayer(100,0,0,null);near(s.stats.hp,640);
});
test('boss pursuit still honors taunt and only hero-directed aiming is blinded',()=>{
 const {scene:s,boss:b}=fixture();s.companion={sprite:sprite(200,0)};b.setData({tauntUntil:10,blindUntil:10});
 near(s.bossController.context().angle,0);s.bossController.state.initialReady=100;s.bossController.update(b,.1);near(b.body.velocity.x,100);
 b.setData({tauntUntil:0,blindUntil:0});s.bossController.update(b,.1);near(b.body.velocity.x,-100);
});
test('choices freeze cooldowns, warnings and death sequence; no cast is allowed during cinematic or after end',()=>{
 const {scene:s,boss:b,events}=fixture();s.updateBoss(b,0);s.pausedForChoice=true;s.step(1);near([...s.telegraphs.live][0].age,0);assert.deepEqual(events,[]);
 s.pausedForChoice=false;s.bossCinematic=true;s.updateBoss(b,1);assert.deepEqual(events,[]);s.bossCinematic=false;s.ended=true;s.telegraphs.update(1);assert.equal(s.telegraphs.live.size,0);
});
test('all entrances have step-based2s banners,5/6/8s total, relative1.25 zoom and restore follow/physics/timers/HUD',()=>{
 for(const row of definitions){
  const {scene:s,boss:b}=fixture(),ui=presentation();s.invulnerable=.58;const director=new CutsceneDirector(s,{presentation:ui});
  let completed=0;assert.ok(director.start(b,row,{onComplete:()=>completed++}));assert.ok(s.bossCinematic&&s.pausedForChoice&&s.physics.world.isPaused&&s.time.paused&&s.tweens.paused&&s.skillAudio.paused);
  assert.equal(s.invulnerable,Infinity);const nameStep=entranceSteps(row.entryDuration).find(step=>step.id==='name');near(nameStep.end-nameStep.start,2);
  director.update(2);near(s.cameras.main.zoomX,.625);assert.ok(s.cameras.main.scrollX>-320);assert.equal(s.cameras.main._follow,null);
  director.update(row.entryDuration-2);assert.equal(completed,1);assert.equal(director.active,false);assert.equal(s.cameras.main._follow,s.player);
  near(s.cameras.main.zoomX,.5);near(s.cameras.main.scrollX,-320);near(s.invulnerable,.58);assert.equal(s.hud.el.style.opacity,'.85');
  assert.ok(!s.bossCinematic&&!s.pausedForChoice&&!s.physics.world.isPaused&&!s.time.paused&&!s.tweens.paused&&!s.skillAudio.paused);
 }
});
test('cinematic blocks all damage, DOT, skill/manual attacks, dash and enemy-shot consumption',()=>{
 const {scene:s,boss:b}=fixture();s.cutscenes=new CutsceneDirector(s,{presentation:presentation()});s.cutscenes.start(b,definitions[0]);
 const hp=s.stats.hp,enemyHp=b.getData('hp');s.damagePlayer(999,0,0,b);s.damagePlayer(999,0,0,null,false,{dot:true});s.damageEnemy(b,999,0,0,s.player,{dot:true});
 s.autoAttack();s.tryDash();const shot=s.enemyProjectiles.get(0,0);shot.setData({damage:900,source:b,sourceSerial:b.getData('serial')});s.onEnemyProjectileHit(shot);
 near(s.stats.hp,hp);near(b.getData('hp'),enemyHp);assert.equal(shot.active,true);near(s.dash.remaining,0);assert.equal(s.projectiles.countActive(),0);
});
test('tap/Back skip is gated at1s, restores game immediately, retains a readable banner, cues only once',()=>{
 const {scene:s,boss:b}=fixture(),ui=presentation(),cues=[];s.options.bossHooks={stinger:()=>cues.push('stinger'),voice:()=>cues.push('voice'),music:()=>cues.push('music')};
 s.cutscenes=new CutsceneDirector(s,{presentation:ui});s.cutscenes.start(b,definitions[3]);s.cutscenes.update(.99);s.togglePause();assert.equal(s.cutscenes.active,true);
 s.cutscenes.update(.01);s.togglePause();assert.equal(s.cutscenes.active,false);assert.equal(ui.finished.keepName,true);assert.deepEqual(cues,['stinger','voice','music']);
 assert.equal(s.pausedForChoice,false);assert.equal(s.cutscenes.skip(),false);
});
test('Skip boss entrances setting gives only a2s name banner; reduced motion leaves camera unchanged',()=>{
 const {scene:s,boss:b}=fixture(),ui=presentation();s.settings.skipBossEntrances=true;const director=new CutsceneDirector(s,{presentation:ui});director.start(b,definitions[3]);
 assert.equal(director.current.duration,2);director.update(1.99);assert.equal(director.active,true);near(s.cameras.main.zoomX,.5);assert.ok(ui.updates.every(u=>u.nameVisible&&u.hudOpacity===1&&u.letterbox===0));
 director.update(.01);assert.equal(director.active,false);
 const reduced=fixture();reduced.scene.settings.reducedMotion=true;const r=new CutsceneDirector(reduced.scene,{presentation:presentation()});r.start(reduced.boss,definitions[0]);r.update(2);near(reduced.scene.cameras.main.zoomX,.5);near(reduced.scene.cameras.main.scrollX,-320);r.destroy();
});
test('cinematic cancellation, shutdown and resize restore camera without accidentally resuming ended physics',()=>{
 const {scene:s,boss:b}=fixture(),d=new CutsceneDirector(s,{presentation:presentation()});d.start(b,definitions[0]);d.update(2);d.resize({zoomX:1.1,zoom:1});d.skip();near(s.cameras.main.zoomX,1.1);near(s.cameras.main.zoomY,1);
 d.start(b,definitions[0]);s.ended=true;d.update(.1);assert.equal(d.active,false);assert.equal(s.physics.world.isPaused,true);assert.equal(s.bossCinematic,false);
});
test('arrival warning is exactly8s ahead, once per boss, serialised, usesJSON schedule in both modes',()=>{
 for(const mode of ['quick','full']){
  const s=makeScene(HEROES.kukul);s.modeData={id:mode,duration:mode==='quick'?600:1200};s.nextBossIndex=0;s.finalSpawned=false;s.activeBoss=null;s.options.bossHooks={horn:()=>horns++};let horns=0;
  s.bossController=new BossController(s,{graphics:null,random:()=>0});const spawns=[];s.spawnBoss=(data,options)=>{spawns.push({id:data.id,time:s.elapsed,point:options.position});s.activeBoss=sprite();return s.activeBoss;};
  const due=definitions[0].arrival[mode];s.elapsed=due-8.001;s.bossController.updateArrival();assert.equal(horns,0);s.elapsed=due-8;s.bossController.updateArrival();assert.equal(horns,1);
  const point={...s.bossController.warning.point};s.elapsed=due-.001;s.bossController.updateArrival();assert.equal(spawns.length,0);assert.equal(horns,1);
  s.elapsed=due;s.bossController.updateArrival();assert.deepEqual(spawns,[{id:'camazotz',time:due,point}]);assert.equal(s.nextBossIndex,1);s.elapsed=1200;s.bossController.updateArrival();assert.equal(horns,1);
 }
});
test('overdue/queued boss still gets a complete8s warning and full cap failure retries instead of spending boss',()=>{
 const s=makeScene();s.nextBossIndex=1;s.activeBoss=null;s.modeData={id:'quick',duration:600};const c=new BossController(s,{graphics:null});s.elapsed=400;
 c.updateArrival();near(c.warning.spawnAt,408);s.spawnBoss=()=>null;s.elapsed=408;c.updateArrival();assert.equal(s.nextBossIndex,1);assert.ok(c.warning);
 s.spawnBoss=()=>sprite();c.updateArrival();assert.equal(s.nextBossIndex,2);assert.equal(c.warning,null);
});
test('arena isfixed600 world units; Final Rite framework creates exactly3 safe circles and caps damage80',()=>{
 const {scene:s,boss:b}=fixture({definition:{phases:[{threshold:1,abilities:[{id:'final-rite',safeRadius:130,safeCircleCount:3}]}]},
  ability:{id:'final-rite',shape:c=>({shape:'circle',radius:c.state.arena.radius}),execute:c=>{s.safe=c.safeCircles;c.damage(999);}}});
 near(s.bossController.state.arena.radius,600);s.updateBoss(b,0);const warning=[...s.telegraphs.live][0];assert.equal(warning.safeCircles.length,3);assert.ok(warning.safeCircles.every(c=>c.radius===130));
 s.player.setPosition(warning.safeCircles[0].x,warning.safeCircles[0].y);s.step(.51);near(s.stats.hp,1000);
 assert.equal(bossDamage(999),80);assert.equal(bossDamage(-10),0);near(fairAbility({windup:.1,recovery:.1}).windup,.5);near(fairAbility({windup:.1,recovery:.1}).recovery,1.2);
});
test('boss bar reports phase notches, shield, armor and protection without changing physical anchor',()=>{
 const {scene:s,boss:b}=fixture();const calls=[];s.hud.setBoss=(...args)=>calls.push(args);b.setData({bossShield:200,bossArmorPct:.5,hp:500});s.bossController.phaseChanged();s.bossController.refreshBar();
 const model=calls.at(-1)[2];assert.deepEqual(model.thresholds,[.5,.25]);near(model.shieldRatio,.2);near(model.armorPct,.5);assert.equal(model.phase,2);assert.equal(model.invulnerable,true);
});
test('death is one-shot, delayed.9s, paused by choices and survives body reuse without mutating new actor',()=>{
 const {scene:s,boss:b}=fixture();let rewards=0;s.bossController.die(b,()=>rewards++);assert.equal(s.bossController.die(b,()=>rewards++),false);b.disableBody();
 s.pausedForChoice=true;s.bossController.updateWorld(1);assert.equal(rewards,0);s.pausedForChoice=false;b.setData({serial:999,bossState:null}).setActive(true).setVelocity(17,18);
 s.bossController.updateWorld(.89);assert.equal(rewards,0);s.bossController.updateWorld(.01);assert.equal(rewards,1);assert.equal(s.bossController.state,null);assert.equal(b.body.velocity.x,17);
});
test('shutdown cancels pending death reward and active warning, releases death sprite exactly once',()=>{
 const {scene:s,boss:b}=fixture();let rewards=0;s.bossController.die(b,()=>rewards++);const visual=s.bossController.state.death.sprite;s.bossController.destroy();s.bossController.destroy();
 s.bossController.updateWorld(10);assert.equal(rewards,0);assert.equal(visual.active,false);assert.equal(s.telegraphs.live.size,0);
});
test('boss HP stays exactlyJSON on all maps/modes and ground-only aliases keep canonical phases',()=>{
 for(const difficulty of [1,1.18,1.36])for(const mode of ['quick','full']){
  const s=makeScene(HEROES.balam);s.mapData.difficulty=difficulty;s.modeData.id=mode;s.bossController=new BossController(s,{graphics:null});
  const b=s.spawnBoss(BOSSES[0]);assert.equal(b.getData('maxHp'),1400);assert.equal(b.getData('damage'),18);assert.equal(b.getData('bossId'),'jaguar-chief');assert.equal(b.getData('bossState').definition.id,'camazotz');
 }
});
test('arrival direction uses the real safe rectangle, never RTL or a hard-coded1280x720 edge',()=>{
 const view={x:-640,y:-360,width:1280,height:720},safe={x:12,y:15,width:544,height:280};
 for(const target of [{x:-1000,y:0},{x:1000,y:0},{x:0,y:-1000},{x:0,y:1000}]){
  const point=warningEdgePoint(view,target,safe);assert.ok(point.x>=safe.x+24-1e-6&&point.x<=safe.x+safe.width-24+1e-6);assert.ok(point.y>=safe.y+24-1e-6&&point.y<=safe.y+safe.height-24+1e-6);
 }
});
test('all new player-facing boss strings exist inEN/FR/AR withWestern digits',()=>{
 for(const locale of ['en','fr','ar']){setLanguage(locale);for(const [key]of bossV06Messages)assert.ok(hasTranslation(key,locale),`${locale}:${key}`);assert.match(t('Phase {n}',{n:3}),/3/);}
 setLanguage('en');
});
