import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES, BOSSES } from '../src/data/world.js';
import { BossController } from '../src/systems/BossController.js';
import { HEROES } from '../src/data/heroes.js';
import { Telegraph, telegraphContains } from '../src/systems/Telegraph.js';
import { EnemyHealthBars, healthBarModel } from '../src/systems/EnemyHealthBars.js';
import { AFFIXES, applyAffix, eliteChance, rollAffix, enemyAffixDefaults, frontalDamageMult, absorbEnemyShield, updateEnemyShield, healVampiric } from '../src/systems/EnemyAffixes.js';
import { SpawnDirector, aliveCap, eligiblePacks, packPositions, PACK_TABLES } from '../src/systems/SpawnDirector.js';
import { updateEnemy, canEnemyAttack } from '../src/skills/StatusEffects.js';
import { applySettingChange } from '../src/systems/RuntimeSettings.js';
import { setLanguage, hasTranslation } from '../src/i18n/index.js';
import { DEFAULT_SAVE } from '../src/systems/SaveSystem.js';
import { makeScene, addEnemy, sprite } from './helpers/scene-fixture.js';

function graphics() {
 const g={calls:[],destroyed:false};
 for(const key of ['clear','setDepth','lineStyle','fillStyle','lineBetween','fillRect','strokeRect','fillCircle','strokeCircle','fillTriangle','fillPoints','beginPath','arc','strokePath'])
  g[key]=(...args)=>{g.calls.push([key,...args]);return g;};
 g.destroy=()=>g.destroyed=true;return g;
}
function warnings(scene,capacity=64) {const g=graphics(),sounds=[];scene.telegraphs=new Telegraph(scene,{graphics:g,sound:w=>sounds.push(w.shape),capacity});return {g,sounds,fx:scene.telegraphs};}

test('base-five numbers exactly match the independent V06 roster rows',()=>{
 const rows={shade:[72,70,14,10,16],bat:[44,128,10,8,12],jaguar:[210,90,22,24,20],serpent:[120,100,16,18,17],priest:[130,62,14,20,17]};
 assert.equal(Object.keys(ENEMIES).length,15);assert.deepEqual(Object.keys(ENEMIES).slice(0,5),Object.keys(rows));
 for(const [id,numbers]of Object.entries(rows))assert.deepEqual(['hp','speed','damage','xp','radius'].map(key=>ENEMIES[id][key]),numbers,id);
});

test('health bars implement all modes, targeting, three-second expiry, bosses and real-view culling',()=>{
 const enemy=sprite(100,40,{radius:16,hp:72,maxHp:72,serial:1}),view={x:0,y:0,right:200,bottom:100};
 assert.equal(healthBarModel(enemy,{view}),null);assert.ok(healthBarModel(enemy,{view,mode:'always'}));
 enemy.setData('targetedUntil',.3);assert.ok(healthBarModel(enemy,{view,seconds:.2}));assert.equal(healthBarModel(enemy,{view,seconds:.3}),null);
 enemy.setData('damagedUntil',3);assert.ok(healthBarModel(enemy,{view,seconds:2.99}));assert.equal(healthBarModel(enemy,{view,seconds:3}),null);
 assert.equal(healthBarModel(enemy,{view,mode:'off'}),null);enemy.x=230;assert.equal(healthBarModel(enemy,{view,mode:'always'}),null);
 enemy.x=100;enemy.setData('isBoss',true);assert.equal(healthBarModel(enemy,{view,mode:'always'}),null);
});

test('bar dimensions, white chip, shield and elite border stay left-to-right in EN/AR',()=>{
 const scene=makeScene(),g=graphics(),enemy=addEnemy(scene,{hp:100,maxHp:100,radius:20,shield:20,maxShield:40,affix:'shielded'},0);
 const bars=new EnemyHealthBars(scene,{graphics:g});scene.settings.enemyHealthBars='always';enemy.setData('hp',50);bars.damage(enemy,100);
 for(const [seconds,expected]of [[1,1],[1.2,.75],[1.4,.5]]){
  scene.elapsed=seconds;const bar=bars.draw()[0];assert.ok(Math.abs(bar.chip-expected)<1e-9);assert.equal(bar.height,4);assert.equal(bar.width,44);assert.equal(bar.shield,.5);assert.equal(bar.border,0xffcf4a);assert.equal(bar.fill,0xd4484f);
 }
 setLanguage('en');const en=bars.draw();setLanguage('ar');assert.deepEqual(bars.draw(),en);setLanguage('en');
 assert.ok(g.calls.filter(([key])=>key==='fillRect').every(call=>call[3]>=0));
 enemy.setData('radius',1);assert.equal(bars.draw()[0].width,28);enemy.setData('radius',100);assert.equal(bars.draw()[0].width,64);
 enemy.active=false;bars.draw();assert.equal(bars.chips.size,0);bars.destroy();assert.equal(g.destroyed,true);
});

for(const shape of ['circle','ring','line','cone'])test(`${shape} telegraph animates wind-up and resolves exactly once in one batch`,()=>{
 const scene=makeScene(),{fx,g,sounds}=warnings(scene);let calls=0;
 const w=fx.play({shape,x:0,y:0,radius:90,innerRadius:40,length:150,width:30,arc:Math.PI/2,angle:0,windup:.6,onResolve:()=>calls++});
 fx.update(.3);assert.equal(w.progress,.5);assert.equal(calls,0);assert.equal(fx.live.size,1);
 assert.ok(g.calls.some(([key])=>key==='lineBetween'));assert.deepEqual(sounds,[shape]);
 fx.update(.3);fx.update(5);assert.equal(calls,1);assert.equal(fx.live.size,0);assert.equal(fx.free.length,1);
});

test('shape containment matches visible circle/ring/rotated line/cone footprints',()=>{
 const w={x:0,y:0,radius:100,innerRadius:50,angle:Math.PI/2,length:100,width:20,arc:Math.PI/2};
 assert.equal(telegraphContains({...w,shape:'circle'},{x:99,y:0}),true);assert.equal(telegraphContains({...w,shape:'circle'},{x:101,y:0}),false);
 assert.equal(telegraphContains({...w,shape:'ring'},{x:0,y:49}),false);assert.equal(telegraphContains({...w,shape:'ring'},{x:0,y:75}),true);
 assert.equal(telegraphContains({...w,shape:'line'},{x:5,y:90}),true);assert.equal(telegraphContains({...w,shape:'line'},{x:30,y:90}),false);
 assert.equal(telegraphContains({...w,shape:'cone'},{x:0,y:90}),true);assert.equal(telegraphContains({...w,shape:'cone'},{x:90,y:0}),false);
});

test('stun, death and pooled-sprite reuse cancel live attacks without resolving',()=>{
 for(const cause of ['stun','death','reuse']){
  const scene=makeScene(),enemy=addEnemy(scene),{fx}=warnings(scene);let cast=0,cancel=0;
  fx.play({owner:enemy,windup:.1,onResolve:()=>cast++,onCancel:()=>cancel++});
  if(cause==='stun')enemy.setData('stunUntil',scene.elapsed+1);else if(cause==='death')enemy.active=false;else enemy.setData('serial',50);
  fx.update(.2);assert.equal(cast,0,cause);assert.equal(cancel,1,cause);assert.equal(fx.live.size,0);
  assert.equal(fx.free[0].owner,null);assert.equal(fx.free[0].onResolve,null);
 }
});

test('telegraphs freeze during choices/loading, cancel at end, respect cap and reuse records',()=>{
 const scene=makeScene(),{fx}=warnings(scene,2);let casts=0;
 const first=fx.play({windup:1,onResolve:()=>casts++});fx.play({windup:1,onResolve:()=>casts++});assert.equal(fx.play({}),null);
 scene.pausedForChoice=true;fx.update(10);assert.equal(first.age,0);assert.equal(fx.play({}),null);
 scene.pausedForChoice=false;scene.loadingRun=true;fx.update(10);assert.equal(first.age,0);
 scene.loadingRun=false;fx.update(1);assert.equal(casts,2);assert.equal(fx.live.size,0);
 const free=[...fx.free];assert.ok(free.includes(fx.play({})));scene.ended=true;fx.update(10);assert.equal(casts,2);assert.equal(fx.live.size,0);
 fx.destroy();assert.equal(fx.free.length,0);
});

test('high-contrast outlines thicken and circles have real dash gaps',()=>{
 const scene=makeScene(),{fx,g}=warnings(scene);fx.play({radius:50});fx.update(.1);
 const length=g.calls.filter(c=>c[0]==='lineBetween').reduce((sum,c)=>sum+Math.hypot(c[3]-c[1],c[4]-c[2]),0);
 assert.ok(length>100&&length<250,'circle outline is dashed, not continuous');assert.ok(g.calls.some(c=>c[0]==='lineStyle'&&c[1]===2));
 scene.settings.telegraphHighContrast=true;fx.draw();assert.ok(g.calls.some(c=>c[0]==='lineStyle'&&c[1]===4));
});

test('time caps are bounded and independent of quality, level and map',()=>{
 for(const [duration,end]of [[600,38],[1200,46]]){
  assert.equal(aliveCap(0,duration),12);assert.equal(aliveCap(duration,duration),end);assert.equal(aliveCap(duration*2,duration),end);
  let previous=12;for(let seconds=0;seconds<=duration;seconds++){const cap=aliveCap(seconds,duration);assert.ok(cap>=previous&&cap<=end);previous=cap;}
 }
});

test('pack tables preserve base packs and add only their map roster, with exact flier groups',()=>{
 for(const map of Object.keys(PACK_TABLES)){
  assert.deepEqual(eligiblePacks(map,HEROES.ixchel,0).map(p=>p.id),['shades','bats']);assert.ok(eligiblePacks(map,HEROES.kukul,90).length>4);
  assert.ok(eligiblePacks(map,HEROES.balam,90).every(pack=>!pack.members.some(id=>['bat','jungle_wasp'].includes(id))));assert.equal(eligiblePacks(map,HEROES.balam,90,1).length,0);
  for(const pack of PACK_TABLES[map])assert.ok(pack.members.every(id=>ENEMIES[id]&&(ENEMIES[id].maps.includes('all')||ENEMIES[id].maps.includes(map))));assert.deepEqual(PACK_TABLES[map].find(p=>p.id==='bats').members,['bat','bat']);
 }
});

test('whole pack footprints spawn >=120 outside real view at seven aspect ratios',()=>{
 for(const [width,height]of [[568,320],[640,360],[800,360],[960,540],[1024,768],[2400,1080],[3440,1440]]){
  const view={x:-80,y:20,width:Math.min(2.4,width/height)*720,height:720};view.right=view.x+view.width;view.bottom=view.y+720;
  for(const side of [0,.25,.5,.75])for(const point of packPositions(view,4,()=>side))
   assert.ok(point.x+40<=view.x-120||point.x-40>=view.right+120||point.y+40<=view.y-120||point.y-40>=view.bottom+120,`${width}x${height}`);
 }
});

test('director never partially spawns a pack or exceeds cap including queued starts',()=>{
 const scene=makeScene(HEROES.balam);scene.elapsed=0;scene.mapData.id='overgrown';const seen=[];
 scene.spawnEnemy=(type,_radius,options)=>{seen.push({type,options});return addEnemy(scene,{type});};
 const director=new SpawnDirector(scene,{graphics:graphics(),random:()=>0});
 for(let i=0;i<50;i++){director.nextPack=0;director.update(.1);assert.ok(scene.enemies.countActive()<=12);}
 assert.equal(scene.enemies.countActive(),12);assert.equal(seen.length,12);assert.ok(director.history.every(p=>p.id==='shades'&&p.count===4));assert.ok(seen.every(p=>p.options.emerge));
 scene.pausedForChoice=true;director.nextPack=0;director.update(1);assert.equal(director.nextPack,0);director.destroy();assert.equal(director.history.length,0);
});

test('elite probability starts at 90s, rises every 20s, caps at 25%, covers all five',()=>{
 assert.equal(eliteChance(89.999),0);assert.equal(eliteChance(90),.01);assert.equal(eliteChance(109.99),.01);assert.equal(eliteChance(110),.02);assert.equal(eliteChance(570),.25);assert.equal(eliteChance(1200),.25);
 assert.equal(rollAffix(89,()=>0),null);assert.equal(rollAffix(90,()=>.02),null);
 for(let i=0;i<5;i++){let n=0;assert.equal(rollAffix(90,()=>n++?i/5:0),AFFIXES[i]);}
});

test('armored adds 60% HP, triples XP, reduces front only, reads vertical facing',()=>{
 const enemy=sprite(0,0,{hp:100,maxHp:100,xp:10,speed:70,heading:Math.PI/2});applyAffix(enemy,'armored');
 assert.equal(enemy.getData('hp'),160);assert.equal(enemy.getData('maxHp'),160);assert.equal(enemy.getData('xp'),30);
 assert.equal(frontalDamageMult(enemy,{x:0,y:100}),.6);assert.equal(frontalDamageMult(enemy,{x:0,y:-100}),1);assert.equal(frontalDamageMult(enemy,{x:0,y:100},true),1);
 const scene=makeScene(),armored=addEnemy(scene,{affix:'armored',heading:0},100);
 scene.damageEnemy(armored,100,0,0,{x:200,y:0});assert.equal(armored.getData('hp'),940);scene.damageEnemy(armored,100,0,0,{x:0,y:0});assert.equal(armored.getData('hp'),840);
});

test('swift changes speed only, shield absorbs and regenerates 6s after full break',()=>{
 const enemy=sprite(0,0,{hp:100,maxHp:100,xp:10,speed:100});applyAffix(enemy,'swift');assert.equal(enemy.getData('speed'),135);assert.equal(enemy.getData('hp'),100);
 const scene=makeScene(),shielded=addEnemy(scene);applyAffix(shielded,'shielded');
 assert.equal(absorbEnemyShield(shielded,15,1),0);assert.equal(shielded.getData('shieldRegenAt'),0);assert.equal(absorbEnemyShield(shielded,30,2),5);assert.equal(shielded.getData('shieldRegenAt'),8);
 updateEnemyShield(shielded,7.99);assert.equal(shielded.getData('shield'),0);updateEnemyShield(shielded,8);assert.equal(shielded.getData('shield'),40);assert.equal(shielded.getData('shieldRegenAt'),0);
 scene.damageEnemy(shielded,50);assert.equal(shielded.getData('hp'),990);
});

test('vampiric heals 30% actual damage, caps HP, cannot heal blocked hits',()=>{
 const scene=makeScene(),enemy=addEnemy(scene,{affix:'vampiric',hp:900});scene.damagePlayer(20,100,0,enemy,true);assert.equal(enemy.getData('hp'),906);
 scene.damagePlayer(20,100,0,enemy,true);assert.equal(enemy.getData('hp'),906);scene.invulnerable=0;scene.stats.shield=30;scene.damagePlayer(20,100,0,enemy,true);assert.equal(enemy.getData('hp'),906);
 healVampiric(enemy,1000);assert.equal(enemy.getData('hp'),1000);enemy.active=false;enemy.setData('hp',1);healVampiric(enemy,100);assert.equal(enemy.getData('hp'),1);
});

test('explosive death cancels live warnings but resolves detached r90/18/.6s burst',()=>{
 const scene=makeScene(),enemy=addEnemy(scene,{affix:'explosive',hp:1},50),{fx}=warnings(scene);let old=0;
 fx.play({owner:enemy,onResolve:()=>old++});scene.killEnemy(enemy);assert.equal(enemy.active,false);assert.equal(fx.live.size,1);
 const burst=[...fx.live][0];assert.equal(burst.radius,90);assert.equal(burst.windup,.6);assert.equal(burst.owner,null);
 fx.update(.59);assert.equal(scene.stats.hp,100);fx.update(.01);assert.equal(scene.stats.hp,82);assert.equal(old,0);fx.update(1);assert.equal(scene.stats.hp,82);
});

test('contact and priest shots use warnings; stun cancels before damage/creation',()=>{
 const scene=makeScene(),enemy=addEnemy(scene,{ranged:true,damage:14}),{fx}=warnings(scene);updateEnemy(scene,enemy,.1);
 assert.equal(scene.enemyProjectiles.countActive(),0);assert.equal([...fx.live][0].shape,'line');fx.update(.5);assert.equal(scene.enemyProjectiles.countActive(),1);assert.equal(scene.enemyProjectiles.getChildren()[0].getData('damage'),14);
 scene.touchEnemy(enemy);assert.equal(scene.stats.hp,100);assert.equal(fx.live.size,1);enemy.setData('stunUntil',scene.elapsed+1);fx.update(.4);assert.equal(enemy.getData('contactReadyUntil'),0);assert.equal(scene.stats.hp,100);
 enemy.setData('stunUntil',0);scene.touchEnemy(enemy);fx.update(.35);scene.touchEnemy(enemy);assert.equal(scene.stats.hp,86);
});

test('spawn emergence prevents attacks/movement without permanent inertia',()=>{
 const scene=makeScene(),enemy=addEnemy(scene,{spawningUntil:2,ranged:true});updateEnemy(scene,enemy,.1);
 assert.deepEqual(enemy.body.velocity,{x:0,y:0});assert.equal(scene.enemyProjectiles.countActive(),0);assert.equal(canEnemyAttack(scene,enemy,true),false);
 scene.elapsed=2;updateEnemy(scene,enemy,.1);assert.equal(scene.enemyProjectiles.countActive(),1);
});

test('all current boss patterns use pooled warnings and cancel on stun',()=>{
 for(const data of BOSSES){
  const scene=makeScene(),boss=addEnemy(scene,{isBoss:true,bossId:data.id,hp:1000,maxHp:1000}),{fx}=warnings(scene);
  scene.activeBoss=boss;scene.bossController=new BossController(scene,{graphics:null});scene.bossController.init(boss,data,{initialDelay:0});
  scene.updateBoss(boss,.1);assert.equal(fx.live.size,1,data.pattern);assert.equal(scene.enemyProjectiles.countActive(),0);
  boss.setData('stunUntil',scene.elapsed+1);fx.update(1);assert.equal(fx.live.size,0);assert.equal(scene.enemyProjectiles.countActive(),0);
  assert.equal(scene.bossController.state.motion,null);assert.equal(scene.bossController.state.busy,null);
 }
});

test('settings have saved defaults, EN/FR/AR text and live redraw while paused',()=>{
 assert.equal(DEFAULT_SAVE.settings.enemyHealthBars,'damaged');assert.equal(DEFAULT_SAVE.settings.telegraphHighContrast,false);
 for(const locale of ['en','fr','ar'])for(const key of ['Enemy health bars','Always','When damaged','Off','High-contrast telegraphs','Armored','Swift','Vampiric','Explosive','Shielded'])assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
 const changed=[],scene={settings:{},pausedForChoice:true,enemyBars:{draw:()=>changed.push('bars')},telegraphs:{draw:()=>changed.push('warnings')}};
 applySettingChange({save:{setSetting(){}},audio:{applySettings(){}},scene},'enemyHealthBars','off');applySettingChange({save:{setSetting(){}},audio:{applySettings(){}},scene},'telegraphHighContrast',true);
 assert.deepEqual(changed,['bars','warnings']);assert.equal(scene.pausedForChoice,true);
});

test('reused enemies reset shield, affix, target and warning data',()=>{
 const enemy=sprite(0,0,{affix:'shielded',shield:40,shieldRegenAt:100,spawningUntil:999,targetedUntil:999,contactReadyUntil:999});enemy.setData(enemyAffixDefaults());assert.equal(enemy.getData('affix'),null);
 for(const key of ['shield','shieldRegenAt','spawningUntil','targetedUntil','contactReadyUntil'])assert.equal(enemy.getData(key),0);
});
