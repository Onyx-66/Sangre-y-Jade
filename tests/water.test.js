// B3 contracts: exact water numbers, environmental damage and optional audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WaterGrid, WATER, waterSpeed, newBreath, stepBreath, waterTraits } from '../src/world/water.js';
import { WaterSystem } from '../src/world/WaterSystem.js';
import { WaterAudio } from '../src/audio/WaterAudio.js';
import { WaterEffects } from '../src/world/WaterEffects.js';
import { WorldCollision } from '../src/world/WorldCollision.js';
import { compileAudio } from '../scripts/audio-catalog.mjs';
import { sanitizeLayout, HUD_ELEMENTS } from '../src/systems/HudLayout.js';
const actor=(data={})=>({x:0,y:0,active:true,body:{velocity:{x:100,y:0}},getData(k){return data[k];},setData(k,v){data[k]=v;},setPosition(x,y){this.x=x;this.y=y;}});
const grid=()=>new WaterGrid([{x:0,y:0,radius:200,kind:'shallow'},{x:0,y:0,radius:100,kind:'deep',flow:{x:3,y:4}}]);
function runtime(){const p=actor(),scene={player:p,stats:{hp:100,maxHp:100},dash:{remaining:1},settings:{},elapsed:0,enemies:{getChildren:()=>[]},finishRun(){this.ended=true;}};
 const w=Object.assign(Object.create(WaterSystem.prototype),{scene,grid:grid(),breath:newBreath(),enemies:new Map(),previous:'dry',ripple:0,step:0,elapsed:0,
 audio:{play(){},loop(){},submerged(){},pause(){}},fx:{emit(){},update(){}},hud:{update(){}},drawWet(){}});scene.water=w;return w;}
test('indexed circular/rectangular masks, deep priority, shoreline smoothing and floor zero',()=>{
 const g=grid();assert.equal(g.waterAt(0,0).kind,'deep');assert.equal(g.waterAt(150,0).kind,'shallow');assert.equal(g.waterAt(201,0).kind,'dry');assert.equal(g.waterAt(0,0,1).kind,'dry');
 assert.ok(g.waterAt(195,0).edge<1);g.addZone({x:-500,y:0,width:80,height:60,kind:'deep'});assert.equal(g.waterAt(-500,0).deep,true);assert.equal(g.waterAt(-541,0).deep,false);
 assert.deepEqual(g.waterAt(0,0).flow,{x:.6,y:.8});assert.throws(()=>g.addZone({x:0,y:0,radius:-1}));
});
test('hero, swimmer, flier, boss and non-swimmer speeds use the specified values',()=>{
 const g=grid(),deep=g.waterAt(0,0),shallow=g.waterAt(150,0);
 assert.equal(waterSpeed(shallow),.82);assert.equal(waterSpeed(deep),.55);assert.equal(waterSpeed(deep,{enemy:true}),.45);
 assert.equal(waterSpeed(deep,{swimmer:true}),1.25);assert.equal(waterSpeed(deep,{boss:true}),.8);assert.equal(waterSpeed(deep,{flier:true}),1);
 for(const type of ['abyssal_eel','drowned_spirit'])assert.equal(waterTraits(actor({type})).swimmer,true);
});
test('eight seconds of air, 25% warning once, grace then 2/3/4/5/6/7/8 percent ticks',()=>{
 const b=newBreath(),damage=[];let warnings=0;
 for(let second=1;second<=18;second++){const r=stepBreath(b,1,true);warnings+=r.warning?1:0;damage.push(...r.damage);if(second<=9)assert.equal(damage.length,0);if(second===8)assert.equal(b.air,0);}
 assert.deepEqual(damage,[.02,.03,.04,.05,.06,.07,.08,.08,.08]);assert.equal(warnings,1);
});
test('breath is frame-partition independent, refills four per second and resets escalating damage',()=>{
 const a=newBreath(),b=newBreath();const damage=stepBreath(a,15,true).damage,other=[];
 for(let i=0;i<300;i++)other.push(...stepBreath(b,.05,true).damage);assert.deepEqual(damage,other);
 assert.equal(stepBreath(b,.5,false).gasp,true);assert.equal(b.air,2);stepBreath(b,2,false);assert.equal(b.air,8);
 assert.deepEqual(stepBreath(b,10,true).damage,[.02]);
});
test('shallow never drains and pause/cutscene freezes timers and HP without hit effects',()=>{
 const w=runtime();w.scene.damagePlayer=()=>assert.fail('environmental loss must not use enemy-hit pipeline');w.breath.air=0;
 w.update(2);assert.equal(w.scene.stats.hp,98);assert.equal(w.scene.invulnerable,undefined);
 for(const flag of ['pausedForChoice','bossCinematic','loadingRun']){w.scene[flag]=true;const before=JSON.stringify(w.breath);w.update(10);assert.equal(JSON.stringify(w.breath),before);w.scene[flag]=false;}
 w.scene.cutscenes={active:true};w.update(10);assert.equal(w.scene.stats.hp,98);w.scene.cutscenes.active=false;
 w.scene.player.x=150;w.update(1);assert.equal(w.breath.air,4);assert.equal(w.scene.stats.hp,98);
});
test('current is 60px/s; elevated actors are dry and dash cancels only in deep water',()=>{
 const w=runtime();w.heroCurrent(1);assert.equal(w.scene.player.x,36);assert.equal(w.scene.player.y,48);
 w.beforeMovement();assert.equal(w.scene.dash.remaining,0);assert.equal(w.range,.8);
 w.scene.player.setData('level',1);w.scene.dash.remaining=1;w.beforeMovement();assert.equal(w.speed,1);assert.equal(w.range,1);assert.equal(w.scene.dash.remaining,1);
});
test('non-swimmers lose 10% per second and drown at four seconds with half-XP kill flag',()=>{
 const w=runtime(),e=actor({hp:100,maxHp:100,type:'shade',serial:1});let kill;
 w.scene.killEnemy=(enemy,ally,options)=>{kill=options;enemy.active=false;};
 for(let i=0;i<3;i++)w.enemyBreath(e,1);assert.equal(e.getData('hp'),70);assert.equal(kill,undefined);
 w.enemyBreath(e,1);assert.deepEqual(kill,{drowned:true});
});
test('bosses, swimmers and fliers never drown; elites avoid instant four-second death',()=>{
 for(const data of [{isBoss:true},{flier:true},{type:'abyssal_eel'},{type:'drowned_spirit'},{tough:true}]){
   const w=runtime(),e=actor({hp:100,maxHp:100,serial:1,...data});w.scene.killEnemy=()=>assert.fail('protected entity drowned');
   for(let i=0;i<4;i++)w.enemyBreath(e,1);assert.equal(e.getData('hp'),data.tough?60:100);
 }
});
test('leaving deep resets enemy timer; recycled actors never inherit immersion',()=>{
 const w=runtime(),e=actor({hp:100,maxHp:100,serial:1});w.scene.killEnemy=()=>assert.fail('premature drown');w.enemyBreath(e,3);
 e.x=150;w.enemyBreath(e,.1);e.x=0;w.enemyBreath(e,2);assert.equal(w.enemies.get(e).seconds,2);
 e.setData('serial',2);w.enemyBreath(e,.1);assert.equal(w.enemies.get(e).seconds,.1);
});
test('voluntary shore crossing blocked but fear, pull and knockback can push enemies in',()=>{
 const w=runtime(),e=actor({type:'shade',level:0});e.x=150;
 assert.equal(w.mayEnter(e,{x:0,y:0}),false);
 for(const [key,value] of [['knockbackUntil',2],['fearUntil',2],['pullTo',{until:2}]]){e.setData(key,value);assert.equal(w.mayEnter(e,{x:0,y:0}),true);e.setData(key,null);}
 const collision=new WorldCollision({scene:w.scene,layout:{},blockersAround:()=>[]});collision.track(e,{radius:11});e.x=-150;collision.resolve(e);assert.ok(e.x>=100);
 // An ascending actor is above the water even before its integer floor changes.
 assert.equal(collision.allowed({x:0,y:0},{avoidWater:true,heightLevel:0,level:0}),false);
 assert.equal(collision.allowed({x:0,y:0},{avoidWater:true,heightLevel:.5,level:0,stairId:'bridge'}),true);
});
test('swimming enemy velocity factors and river current do not alter fliers',()=>{
 const w=runtime();for(const [data,expected]of [[{type:'shade'},45],[{isBoss:true},80],[{type:'drowned_spirit'},125],[{flier:true},100]]){
 const e=actor(data);w.enemyMotion(e,1);assert.equal(e.body.velocity.x,expected);assert.equal(e.x,data.flier?0:36);}
 const elevated=actor({elevation:20});elevated.x=105;elevated.body.velocity.x=-100;
 w.enemyMotion(elevated,1);assert.equal(elevated.body.velocity.x,-100);assert.equal(elevated.x,105);
});
test('particle allocations are capped and reduce effects lowers cost',()=>{
 const fx=new WaterEffects({settings:{particles:'high'}});for(let i=0;i<1000;i++)fx.emit(0,0);assert.equal(fx.pool.length,64);
 fx.scene.settings.reduceEffects=true;assert.equal(fx.cap,8);fx.scene.settings.reduceEffects=false;fx.scene.settings.particles='low';assert.equal(fx.cap,20);
});
test('low-pass only reroutes music/ambience, restores on surface and releases nodes',()=>{
 const values=[],nodes=[];const gain=()=>({connect(){},disconnect(){}});const e={master:gain(),gains:{music:gain(),ambience:gain(),sfx:gain()},stopOwner(){},context:{currentTime:1,sampleRate:48000,createBiquadFilter(){const f={...gain(),frequency:{setTargetAtTime:v=>values.push(v)}};nodes.push(f);return f;}}};
 const a=new WaterAudio({v2:e});a.submerged(true);assert.deepEqual(values,[1200,1200]);a.submerged(false);assert.deepEqual(values.slice(-2),[24000,24000]);a.destroy();assert.equal(a.filters,null);assert.equal(nodes.length,2);
});
test('all requested water and steps hooks resolve to optional manifest entries',()=>{
 const {catalog}=compileAudio();for(const name of ['enter-shallow','exit-shallow','enter-deep','exit-deep','wade-loop','swim-loop','bubbles-loop','gasp','drown-tick','breath-warning','enemy-splash-small','enemy-splash-large','enemy-drown','projectile-water-hit','river-loop','splash-ring'])assert.ok(catalog[`sfx/water/${name}`]);
 for(const n of ['stone','wade','swim'])assert.ok(catalog[`sfx/steps/${n}`]);
});
test('old HUD layouts gain mandatory breath without losing customized existing coordinates',()=>{
 const elements=Object.fromEntries(HUD_ELEMENTS.filter(x=>x.id!=='breath').map(x=>[x.id,{anchor:x.anchor,x:25,y:35,scale:1,opacity:1,visible:true,locked:false}]));
 const clean=sanitizeLayout({elements,joystick:{mode:'fixed',deadZone:.12}});assert.equal(clean.elements.vitals.x,25);assert.equal(clean.elements.breath.visible,true);
 clean.elements.breath.visible=false;clean.elements.breath.opacity=.2;assert.equal(sanitizeLayout(clean).elements.breath.opacity,1);
});
