import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import roster from '../src/data/enemies-v06.json' with {type:'json'};
import { compileEnemies } from '../scripts/compile-enemies-v06.mjs';
import { ENEMY_BEHAVIORS } from '../src/enemies/index.js';
import { EnemyBehaviorSystem,rosterDamageMult } from '../src/systems/EnemyBehaviorSystem.js';
import { Telegraph } from '../src/systems/Telegraph.js';
import { eligiblePacks,PACK_TABLES } from '../src/systems/SpawnDirector.js';
import { HEROES } from '../src/data/heroes.js';
import { healthBarModel } from '../src/systems/EnemyHealthBars.js';
import { updateEnemyShield } from '../src/systems/EnemyAffixes.js';
import { makeScene,addEnemy,sprite } from './helpers/scene-fixture.js';
import { trophyHunter } from '../src/skills/kukul/passives/trophy-hunter.js';
import { SkillAudio } from '../src/systems/SkillAudio.js';
import { BOSSES } from '../src/data/world.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(type,x=100) {
  const scene=makeScene();scene.mapData.id=roster[type].maps[0]==='all'?'overgrown':roster[type].maps[0];
  scene.enemySerial=0;scene.telegraphs=new Telegraph(scene,{graphics:null,sound:()=>{}});
  scene.enemySystem=new EnemyBehaviorSystem(scene,{graphics:null,random:()=>.5});
  scene.fx={play:(...args)=>scene.fxCalls.push(args)};scene.fxCalls=[];
  scene.skillAudio={play:(...args)=>scene.soundCalls.push(args)};scene.soundCalls=[];
  scene.castTimes={};const count=scene.enemySystem.countCast.bind(scene.enemySystem);scene.enemySystem.countCast=(id,name)=>{scene.castTimes[`${id}:${name}`]=scene.elapsed;count(id,name);};
  scene.stats.hp=scene.stats.maxHp=1000;scene.options.onEnd=()=>{};
  const enemy=addEnemy(scene,{...roster[type],maxHp:roster[type].hp,type,tough:roster[type].tough},x);scene.enemySystem.init(enemy);
  scene.step=(seconds,move=true)=>{
    if(scene.pausedForChoice||scene.ended)return;
    for(let remaining=seconds;remaining>1e-9;){const dt=Math.min(.01,remaining);remaining-=dt;scene.elapsed+=dt;scene.invulnerable=Math.max(0,scene.invulnerable-dt);
      scene.enemySystem.updateWorld(dt);scene.updateEnemies(dt);scene.telegraphs.update(dt);
      if(move)for(const e of scene.enemies.getChildren())if(e.active){e.x+=e.body.velocity.x*dt;e.y+=e.body.velocity.y*dt;}
    }
  };
  scene.begin=()=>scene.updateEnemies(0);
  return {scene,enemy};
}

test('all 15 independent records/handlers are generated exactly from the supplied JSON',()=>{
  assert.equal(Object.keys(roster).length,15);assert.deepEqual(Object.keys(ENEMY_BEHAVIORS),Object.keys(roster));
  for(const id of Object.keys(roster)){assert.equal(ENEMY_BEHAVIORS[id].id,id);assert.ok(existsSync(`src/enemies/${id}.js`));}
  const file='docs/v0.6/v06_design.json';
  // The generated runtime also works without the user's untracked design files.
  if(existsSync(file))assert.deepEqual(roster,compileEnemies(JSON.parse(readFileSync(file,'utf8'))));
  const rows={shade:[72,70,14,10,16],bat:[44,128,10,8,12],jaguar:[210,90,22,24,20],serpent:[120,100,16,18,17],priest:[130,62,14,20,17],vine_lurker:[160,40,16,22,18],stone_guardian:[340,48,26,40,24],jungle_wasp:[36,150,8,8,11],blood_wraith:[150,96,20,24,16],bone_archer:[90,70,15,18,15],moon_cultist:[120,58,12,22,16],drowned_spirit:[140,66,16,20,17],abyssal_eel:[110,85,18,20,16],crystal_golem:[360,46,24,40,24],glow_wisp:[38,120,20,8,11]};
  for(const [id,row]of Object.entries(rows))assert.deepEqual(['hp','speed','damage','xp','radius'].map(key=>roster[id][key]),row);
});

test('Shade: 170px/420 lunge after .35s; one contact hit; .5s +20% recovery',()=>{
  const {scene:s,enemy:e}=fixture('shade');s.begin();const w=[...s.telegraphs.live][0];near(w.windup,.35);near(w.length,170);
  s.step(.34);assert.equal(e.getData('behaviorState').motion,null);s.step(.02);assert.ok(e.getData('behaviorState').motion);
  s.step(170/420+.01);near(e.x,-70);near(s.stats.hp,986);assert.ok(e.getData('recoveryUntil')>s.elapsed);
  near(rosterDamageMult(e,s.player,s.elapsed),1.2);const before=e.getData('hp');s.damageEnemy(e,10,0,0,s.player,{canCrit:false});near(e.getData('hp'),before-12);
  s.step(.51);near(rosterDamageMult(e,s.player,s.elapsed),1);near(s.stats.hp,986);
});

test('Bat: circles for 1.5-2.5s at r210, .4 marker, dives through it, retreats 1s',()=>{
  const {scene:s,enemy:e}=fixture('bat',210);s.step(1.99,false);assert.equal(s.telegraphs.live.size,0);s.step(.02,false);
  const warning=[...s.telegraphs.live][0];near(warning.windup,.4);near(warning.x,0);near(warning.y,0);
  s.step(.41,false);assert.ok(e.getData('behaviorState').motion);s.step(234/128+.02,false);near(s.stats.hp,990);assert.ok(e.x<0);
  assert.ok(e.getData('behaviorState').retreatUntil>s.elapsed);s.step(.5,false);assert.ok(e.body.velocity.x<0);s.step(.51,false);assert.equal(e.getData('behaviorState').circleTime,0);
});

test('Jaguar: .55 landing marker, .4 leap, r80/22 shockwave; one half-HP roar buffs 15%/6s',()=>{
  const {scene:s,enemy:e}=fixture('jaguar',280);s.begin();const w=[...s.telegraphs.live][0];near(w.radius,80);near(w.windup,.55);
  s.step(.54);near(s.stats.hp,1000);s.step(.02);s.step(.4);near(e.x,0);near(s.stats.hp,978);
  const ally=addEnemy(s,{},100);e.setData('hp',105);s.step(.61,false);assert.equal(e.getData('behaviorState').roared,true);near(ally.getData('roarSpeedMult'),1.15);near(ally.getData('roarUntil')-s.castTimes['jaguar:Pack Roar'],6);
  s.step(6.01,false);assert.equal(s.enemySystem.casts['jaguar:Pack Roar'],1);
});

test('Serpent: Tail Whip cone 110deg/r120/16 +120 knockback; underground immunity then emerge r70/18/.4 knock-up',()=>{
  const {scene:s,enemy:e}=fixture('serpent',100);s.begin();let w=[...s.telegraphs.live][0];near(w.arc,110*Math.PI/180);near(w.radius,120);s.step(.46,false);near(s.stats.hp,984);near(s.player.x,-120);
  const {scene:b,enemy:burrow}=fixture('serpent',300);b.begin();assert.equal(burrow.getData('invulnerableEnemy'),true);const hp=burrow.getData('hp');b.damageEnemy(burrow,999);near(burrow.getData('hp'),hp);
  b.step(1.09,false);assert.equal(b.telegraphs.live.size,0);b.step(.02,false);w=[...b.telegraphs.live][0];near(w.radius,70);near(w.windup,.5);
  assert.ok(burrow.x>=124-1e-6,'underground covers at most 176 units');b.step(.51,false);assert.equal(burrow.getData('invulnerableEnemy'),false);near(b.stats.hp,982);near(b.player.getData('knockupUntil')-b.castTimes['serpent:Burrow'],.4);
});

test('Priest: kites 260-340, Ward nearest ally 40/6s; three 210px/s bolts of 11/.2rad',()=>{
  const {scene:s,enemy:e}=fixture('priest',300),nearby=addEnemy(s,{},280),far=addEnemy(s,{},200);s.begin();near([...s.telegraphs.live][0].windup,.4);
  s.step(.41,false);near(nearby.getData('wardShield'),40);assert.equal(far.getData('wardShield'),undefined);near(nearby.getData('wardUntil')-s.castTimes['priest:Ward'],6);
  const hp=nearby.getData('hp');s.damageEnemy(nearby,45,0,0,s.player,{canCrit:false});near(nearby.getData('hp'),hp-5);near(nearby.getData('wardShield'),0);
  s.step(.51,false);const shots=s.enemyProjectiles.getChildren();assert.equal(shots.length,3);for(const shot of shots){near(shot.getData('damage'),11);near(Math.hypot(shot.body.velocity.x,shot.body.velocity.y),210);}
  near(Math.atan2(shots[1].body.velocity.y,shots[1].body.velocity.x)-Math.atan2(shots[0].body.velocity.y,shots[0].body.velocity.x),.2);
  nearby.setData({wardShield:40,wardUntil:s.elapsed+6});updateEnemyShield(nearby,s.elapsed+6);near(nearby.getData('wardShield'),0);
  e.x=100;s.begin();assert.ok(e.body.velocity.x>0,'retreats from hero');e.x=400;s.begin();assert.ok(e.body.velocity.x<0,'approaches kite band');
});

test('Vine Lurker: buried/invisible/untargetable until within200; .7 r90 snare roots .8 and deals12',()=>{
  const {scene:s,enemy:e}=fixture('vine_lurker',300);assert.equal(e.getData('buried'),true);s.begin();near(e.body.velocity.x,0);
  assert.equal(s.closestEnemy(0,0,1000),null);assert.equal(healthBarModel(e,{mode:'always'}),null);s.damageEnemy(e,999);near(e.getData('hp'),160);
  e.x=199;s.begin();assert.equal(e.getData('buried'),false);const w=[...s.telegraphs.live][0];near(w.radius,90);near(w.windup,.7);s.step(.71,false);near(s.stats.hp,988);near(s.player.getData('rootUntil')-s.castTimes['vine_lurker:Root Snare'],.8);
  s.updateMovement(.1);near(s.player.body.speed,0);s.tryDash();near(s.dash.remaining,0);
});

test('Stone Guardian: 90deg front guard reduces70%, flanks/DOT unaffected; .8 r100 slam26/knock160',()=>{
  const {scene:s,enemy:e}=fixture('stone_guardian',80);e.setData('heading',0);
  near(rosterDamageMult(e,{x:180,y:0},s.elapsed),.3);near(rosterDamageMult(e,{x:80,y:100},s.elapsed),1);near(rosterDamageMult(e,{x:180,y:0},s.elapsed,true),1);
  s.begin();near([...s.telegraphs.live][0].windup,.8);s.step(.81,false);near(s.stats.hp,974);near(s.player.x,-160);
});

test('Wasp: .35s spit8/speed240, poison3dps for3s; silence and bad range prevent shots',()=>{
  const {scene:s,enemy:e}=fixture('jungle_wasp',250);s.begin();s.step(.36,false);const shot=s.enemyProjectiles.getChildren()[0];assert.ok(shot);near(shot.getData('damage'),8);near(Math.hypot(shot.body.velocity.x,shot.body.velocity.y),240);
  s.onEnemyProjectileHit(shot);near(s.stats.hp,992);s.step(3,false);near(s.stats.hp,983);
  const f=fixture('jungle_wasp',100);f.scene.begin();assert.equal(f.scene.telegraphs.live.size,0);const before=s.enemyProjectiles.getChildren().length;e.setData('silenceUntil',s.elapsed+10);s.step(3,false);assert.equal(s.enemyProjectiles.getChildren().length,before);
});

test('Wraith: .5 behind-player marker, teleport then .3 delay slash20, bleed5dps/3s',()=>{
  const {scene:s,enemy:e}=fixture('blood_wraith',220);s.begin();const w=[...s.telegraphs.live][0];near(w.x,-34);near(w.windup,.5);
  s.step(.49,false);near(e.x,220);near(s.stats.hp,1000);s.step(.02,false);near(e.x,-34);near(s.stats.hp,1000);
  s.step(.3,false);near(s.stats.hp,980);near(s.player.getData('enemybleed').dps,5);s.step(3,false);near(s.stats.hp,965);
});

test('Archer: .6 red line, 380px/s piercing arrow15; below50% exactly3 in fan',()=>{
  for(const [hp,count]of [[90,1],[44,3]]){const {scene:s,enemy:e}=fixture('bone_archer',340);e.setData('hp',hp);s.begin();near([...s.telegraphs.live][0].windup,.6);s.step(.61,false);
    const shots=s.enemyProjectiles.getChildren();assert.equal(shots.length,count);for(const shot of shots){near(Math.hypot(shot.body.velocity.x,shot.body.velocity.y),380);near(shot.getData('damage'),15);assert.equal(shot.getData('piercing'),true);}
    s.onEnemyProjectileHit(shots[0]);near(s.stats.hp,985);assert.equal(shots[0].active,true);s.invulnerable=0;s.onEnemyProjectileHit(shots[0]);near(s.stats.hp,985);
  }
});

test('Cultist: every10s warns .8, adds2 capped4 incl remaining space; summons disappear with owner',()=>{
  const {scene:s,enemy:e}=fixture('moon_cultist',250);s.step(9.99,false);assert.equal(s.telegraphs.live.size,0);s.step(.02,false);near([...s.telegraphs.live][0].windup,.8);
  s.step(.81,false);let owned=()=>s.enemies.getChildren().filter(n=>n.active&&n.getData('summoner')===e);assert.equal(owned().length,2);
  s.step(10.01,false);assert.equal(owned().length,4);s.step(20,false);assert.equal(owned().length,4);
  s.killEnemy(e);assert.equal(owned().length,0);assert.equal(s.enemies.countActive(),0);assert.equal(s.telegraphs.live.size,0);
  const pulse=fixture('moon_cultist',100);pulse.scene.begin();near([...pulse.scene.telegraphs.live][0].radius,140);pulse.scene.step(.81,false);near(pulse.scene.stats.hp,982);
});

test('Drowned Spirit: .4 marker pulls120 then16; trail r50 lasts6s, slows35%, bounded pool',()=>{
  const {scene:s,enemy:e}=fixture('drowned_spirit',150);s.begin();near([...s.telegraphs.live][0].windup,.4);s.step(.41,false);near(s.player.x,120);near(s.stats.hp,984);
  e.x=400;s.step(.01,false);const puddle=s.enemySystem.puddles[0];near(puddle.radius,50);near(puddle.until-s.castTimes['drowned_spirit:Grasp'],6.01);s.player.setPosition(puddle.x,puddle.y);s.enemySystem.updateWorld(.01);near(s.player.getData('slowPct'),.35);
  s.enemySystem.updateWorld(0);s.elapsed+=6.01;s.enemySystem.updateWorld(0);assert.equal(s.enemySystem.puddles.length,0);
  for(let i=0;i<200;i++)s.enemySystem.addPuddle(e,roster.drowned_spirit.attacks['Puddle Trail']);assert.equal(s.enemySystem.puddles.length,128);
});

test('Eel: dry85/water150; .45 line then260/440 dash; +8 only within120 of water',()=>{
  for(const water of [false,true]){const {scene:s,enemy:e}=fixture('abyssal_eel',200);s.waterZones=water?[{x:0,y:0,radius:30}]:[];
    s.begin();const w=[...s.telegraphs.live][0];near(w.windup,.45);near(w.length,260);s.step(.46,false);s.step(260/440+.01,false);near(e.x,-60);near(s.stats.hp,water?974:982);
  }
  const f=fixture('abyssal_eel',400);f.scene.waterZones=[{x:400,y:0,radius:100}];f.scene.begin();near(Math.hypot(f.enemy.body.velocity.x,f.enemy.body.velocity.y),150);f.scene.waterZones=[];f.scene.begin();near(Math.hypot(f.enemy.body.velocity.x,f.enemy.body.velocity.y),85);
});

test('Golem: every8s .5 warning then3s100% reflection; .7 eight lines resolve only8 shards14',()=>{
  const {scene:s,enemy:e}=fixture('crystal_golem',500);s.step(7.99,false);assert.equal(s.telegraphs.live.size,0);s.step(.02,false);near([...s.telegraphs.live][0].windup,.5);s.step(.51,false);near(e.getData('prismUntil')-s.castTimes['crystal_golem:Prism Shield'],3);
  const shot=s.fireProjectile(e.x,e.y,0,33,500,1,2);s.onProjectileHit(shot,e);assert.equal(shot.active,false);near(e.getData('hp'),360);
  const reflected=s.enemyProjectiles.getChildren()[0];near(reflected.getData('damage'),33);near(reflected.body.velocity.x,-500);
  s.elapsed=e.getData('prismUntil');const normal=s.fireProjectile(e.x,e.y,0,10,500,1,2);s.onProjectileHit(normal,e);near(e.getData('hp'),350);
  const b=fixture('crystal_golem',200);b.scene.begin();assert.equal(b.scene.telegraphs.live.size,8);b.scene.step(.71,false);assert.equal(b.scene.enemyProjectiles.countActive(),8);for(const shard of b.scene.enemyProjectiles.getChildren())near(shard.getData('damage'),14);
});

test('Wisp: at90 begins1.2 fuse/r90/20, dies; early kill or stun cancels harmlessly',()=>{
  const {scene:s,enemy:e}=fixture('glow_wisp',80);s.begin();near([...s.telegraphs.live][0].windup,1.2);near([...s.telegraphs.live][0].radius,90);s.step(1.19,false);near(s.stats.hp,1000);s.step(.02,false);near(s.stats.hp,980);assert.equal(e.active,false);
  const killed=fixture('glow_wisp',80);killed.scene.begin();killed.scene.killEnemy(killed.enemy);killed.scene.step(2,false);near(killed.scene.stats.hp,1000);
  const stunned=fixture('glow_wisp',80);stunned.scene.begin();stunned.enemy.setData('stunUntil',stunned.scene.elapsed+2);stunned.scene.step(1.3,false);near(stunned.scene.stats.hp,1000);assert.equal(stunned.scene.telegraphs.live.size,0);
});

test('map packs cover each eligible roster, flier groups exact, tanks capped2 and ordinary body overlap does not duplicate attacks',()=>{
  for(const map of Object.keys(PACK_TABLES)){
    const expected=Object.values(roster).filter(e=>e.maps.includes('all')||e.maps.includes(map)).map(e=>e.id).sort();
    assert.deepEqual([...new Set(eligiblePacks(map,HEROES.ixchel,600).flatMap(p=>p.members))].sort(),expected);
  }
  assert.equal(PACK_TABLES.overgrown.find(p=>p.id==='wasps').members.length,3);assert.equal(PACK_TABLES.cenote.find(p=>p.id==='wisps').members.length,4);
  for(const id of ['stone_guardian','crystal_golem']){const f=fixture(id,500);f.scene.spawnEnemy(id,600);assert.equal(f.scene.spawnEnemy(id,600),null);assert.equal(f.scene.spawnEnemy(id==='stone_guardian'?'crystal_golem':'stone_guardian',600),null);
    assert.ok(!eligiblePacks(f.scene.mapData.id,HEROES.ixchel,600,38,f.scene.enemies.getChildren()).some(p=>p.members.includes(id)));}
  const f=fixture('shade',0);f.scene.touchEnemy(f.enemy);near(f.scene.stats.hp,1000);
});

test('choices freeze actions/DOT; stun, fear, death and reuse release burrow/timers/warnings safely',()=>{
  for(const type of Object.keys(roster)){const f=fixture(type,type==='bat'?210:200);f.scene.begin();const before=f.enemy.x;f.scene.pausedForChoice=true;f.scene.step(2);near(f.enemy.x,before);f.scene.pausedForChoice=false;
    f.enemy.setData('stunUntil',f.scene.elapsed+1);f.scene.step(.01,false);assert.equal(f.scene.telegraphs.live.size,0,type);assert.equal(f.enemy.getData('invulnerableEnemy'),false,type);
    f.scene.enemySystem.despawn(f.enemy);assert.equal(f.enemy.active,false,type);}
  const f=fixture('serpent',300);f.scene.begin();f.enemy.setData('fearUntil',f.scene.elapsed+2);f.scene.step(.1,false);assert.equal(f.enemy.getData('invulnerableEnemy'),false);assert.ok(f.enemy.body.velocity.x>0);
});

test('roster hooks emit enemy-id windup/attack, source reuse cannot heal or apply old shooter ownership',()=>{
  const f=fixture('jungle_wasp',250);f.scene.begin();f.scene.step(.36,false);
  assert.ok(f.scene.fxCalls.some(call=>call[0]==='enemy-jungle_wasp-windup'));assert.ok(f.scene.fxCalls.some(call=>call[0]==='enemy-jungle_wasp-attack'));
  assert.ok(f.scene.soundCalls.some(call=>call[0]==='enemy-jungle_wasp-attack'));
  const shot=f.scene.enemyProjectiles.getChildren()[0];f.enemy.setData({serial:999,affix:'vampiric',hp:10});f.scene.onEnemyProjectileHit(shot);near(f.enemy.getData('hp'),10);
});

test('new tough enemies count for Trophy Hunter, while base Shades/Wisps do not',()=>{
  for(const id of ['stone_guardian','crystal_golem','blood_wraith','glow_wisp','shade']){const f=fixture(id,500);f.scene.stats.hp=500;f.scene.passives.equip(trophyHunter,1);f.scene.killEnemy(f.enemy);
    near(f.scene.stats.hp,roster[id].tough?700:500);}
});

test('Ward ring follows its ally and cancels on ally death or serial reuse without retaining references',()=>{
  for(const reason of ['resolve','death','reuse']){const f=fixture('priest',300),ally=addEnemy(f.scene,{radius:16},280);
    f.scene.begin();const w=[...f.scene.telegraphs.live][0];assert.equal(w.follow,ally);assert.equal(w.color,0x8ec5ff);
    ally.setPosition(255,80);f.scene.step(.1,false);near(w.x,255);near(w.y,80);
    if(reason==='death')ally.active=false;if(reason==='reuse')ally.setData('serial',111);
    f.scene.step(.31,false);near(ally.getData('wardShield')||0,reason==='resolve'?40:0);
    assert.ok(f.scene.telegraphs.free.every(record=>record.follow===null));
  }
});

test('a Grasp cannot drag an intangible, invulnerable or dodging hero; rooted Spirit leaves no puddle',()=>{
  for(const protection of ['intangible','invulnerable','dodge']){const f=fixture('drowned_spirit',150);
    if(protection==='intangible')f.scene.stats.intangibleUntil=f.scene.elapsed+5;
    if(protection==='invulnerable')f.scene.invulnerable=5;
    if(protection==='dodge')f.scene.stats.dodgeCharges=1;
    f.scene.begin();f.scene.step(.41,false);near(f.scene.player.x,0);near(f.scene.stats.hp,1000);
  }
  const f=fixture('drowned_spirit',500);f.enemy.setData('rootUntil',f.scene.elapsed+2);f.scene.step(1,false);assert.equal(f.scene.enemySystem.puddles.length,0);
});

test('fear/aggro-drop cancels pending warnings immediately; cooldown cannot re-cast and Ward cannot affect reused allies',()=>{
  const f=fixture('shade',100);f.scene.begin();f.enemy.setData('fearUntil',f.scene.elapsed+1);f.scene.step(.01,false);assert.equal(f.scene.telegraphs.live.size,0);assert.ok(f.enemy.body.velocity.x>0);
  const hide=fixture('jaguar',280);hide.scene.begin();hide.scene.player.hiddenUntil=hide.scene.elapsed+1;hide.scene.step(.01,false);assert.equal(hide.scene.telegraphs.live.size,0);assert.equal(hide.enemy.getData('behaviorState').motion,null);
});

test('enemy audio hooks use existing sound without fetching, warn once per missing file, and respect mute',()=>{
  const warnings=[],played=[],old=console.warn;let time=0,volume=1,requests=0;
  console.warn=message=>warnings.push(message);
  try{const audio={unlocked:true,volumes:()=>({sfx:volume}),sfx:id=>played.push(id)};
    const client=new SkillAudio(audio,{createContext:()=>null,fetcher:()=>{requests++;throw Error('No fetch expected');},clock:()=>time});
    client.play('enemy-shade-windup');time=100;client.play('enemy-shade-windup');time=200;client.play('enemy-shade-attack');
    assert.equal(warnings.length,2);assert.equal(played.length,3);assert.equal(requests,0);
    volume=0;time=300;client.play('enemy-bat-attack');assert.equal(warnings.length,2);assert.equal(played.length,3);client.destroy();
  }finally{console.warn=old;}
});

test('boss and ordinary pool reuse clears buried, immunity, reflection, timed shield, recovery and summoner fields',()=>{
  const {scene:s,enemy:e}=fixture('serpent',300);s.begin();e.setData({prismUntil:100,wardUntil:100,wardShield:40,summoner:e,buried:true,recoveryUntil:100,recoveryVulnerability:.2});
  e.active=false;s.enemies.get=()=>e;s.audio.music=()=>{};
  s.spawnBoss(BOSSES[0]);assert.equal(e.getData('type'),null);assert.equal(e.getData('invulnerableEnemy'),false);assert.equal(e.getData('buried'),false);near(e.getData('prismUntil'),0);near(e.getData('wardShield'),0);assert.equal(e.getData('summoner'),null);near(rosterDamageMult(e,s.player,s.elapsed),1);
  s.activeBoss=null;e.active=false;s.spawnEnemy('shade',600,{affix:null});assert.equal(e.getData('type'),'shade');assert.equal(e.getData('isBoss'),false);near(e.getData('hp'),72);assert.equal(e.getData('behaviorState').serial,e.getData('serial'));
});
