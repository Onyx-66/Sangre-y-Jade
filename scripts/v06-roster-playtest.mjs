// V8 map-roster audit. Real Phaser physics and damage; no forced XP, kills or immortality.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const arg=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const label=arg('label')||'baseline';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Label must be lowercase letters, numbers and hyphens');
const heroes=(arg('heroes')||'kukul').split(',');
const modes=(arg('modes')||'quick').split(',');
const seeds=(arg('seeds')||'1701').split(',').map(Number);
const seconds=Number(arg('seconds'))||null;
const verification=true;
const enemyVisuals=process.argv.includes('--enemy-visuals');
const maps=(arg('maps')||'overgrown,bloodmoon,cenote').split(',');
assert.ok(maps.every(id=>['overgrown','bloodmoon','cenote'].includes(id)),'Unknown map');
const preferredAlly=arg('ally')||'saintess';
assert.ok(['saintess','tank','assassin'].includes(preferredAlly),'Unknown companion');
assert.ok(heroes.every(id=>['balam','ixchel','kukul'].includes(id)),'Unknown hero');
assert.ok(modes.every(id=>['quick','full'].includes(id)),'Unknown mode');
assert.ok(seeds.length&&seeds.every(Number.isSafeInteger)&&new Set(seeds).size===seeds.length,'Seeds must be distinct integers');
assert.ok(seconds===null||(seconds>0&&seconds<=1200),'Invalid duration');
const output=path.resolve(arg('output')||'docs/v0.6/previews/v8/roster');
await fs.mkdir(output,{recursive:true});
const start=performance.now();
const report={label,createdAt:new Date().toISOString(),policy:'roster-bot-v8-coverage-packs',maps,viewport:[1280,720],
 stepHz:30,seeds,seconds,meta:'fresh save; no shrine upgrades',settings:'auto attack/aim, high detail, muted presentation audio (no wall-clock RNG)',
 targets:{quick:{10:[210,270],20:[480,570]},full:{10:[240,330],20:[540,720]}},runs:[],errors:[]};
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function save(){
 const file=path.join(output,`${label}.json`),temporary=file+'.tmp';
 for(let attempt=0;attempt<8;attempt++)try{
  await fs.writeFile(temporary,JSON.stringify({...report,wallSeconds:(performance.now()-start)/1000},null,2)+'\n');
  await fs.rename(temporary,file);return;
 }catch(error){if(attempt===7)throw error;await new Promise(done=>setTimeout(done,75));}
}
try{
 for(const map of maps)for(const hero of heroes)for(const mode of modes)for(const seed of seeds){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
  const errors=[],warnings=[],httpErrors=[];page.on('pageerror',error=>{errors.push(error.stack);report.errors.push(`${map}/${hero}/${mode}/${seed}: ${error.stack}`);console.error(error.stack);});
  if(verification){page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning'&&/Placeholder:|Sound fallback:|No active handler:/.test(message.text()))warnings.push(message.text());});page.on('response',r=>{if(r.status()>=400)httpErrors.push(`${r.status()} ${r.url()}`);});}
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(async({hero,mode,seed,map})=>{
   const {GameScene}=await import('/src/scenes/GameScene.js');
   const original=GameScene.prototype.create;
   GameScene.prototype.create=function(){
    let state=seed>>>0;Math.random=()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};
    window.Phaser.Math.RND.sow([String(seed)]);
    original.call(this);
    // Freeze the initial wall-clock frame; the audit supplies all simulation steps.
    // Keep rendering for V6 warm-up, but never advance gameplay before the bot.
    // SceneManager overwrites sys.sceneUpdate after create; gate the instance
    // method it copies instead. Rendering/asset warm-up still runs normally.
    this.update=()=>{};
   };
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();
   app.lastSelection={heroId:hero,mapId:map,modeId:mode};
   app.save.setSetting('master',0);app.save.setSetting('attackMode','auto');app.save.setSetting('autoAim',true);
   app.save.setSetting('damageNumbers',false);app.save.setSetting('screenShake',false);
   await app.startRun();
  },{hero,mode,seed,map});
  await page.locator('.hud').waitFor();
  const result=await page.evaluate(async({hero,mode,seed,seconds,verification,preferredAlly,map,enemyVisuals})=>{
   const {GameScene}=await import('/src/scenes/GameScene.js');
   const game=window.__SANGRE_Y_JADE__.game,scene=game.scene.getScene('Ritual');game.loop.stop();
   const audit=false?(await import('/scripts/verification-observers.mjs')).observeRun(scene,(await import('/src/systems/SkillDraft.js')).slotCount):null;
   const delta=1000/30;let clock=scene.time.now,frames=0,nextDecision=0,pending=null;
   const times={},levels=[{level:1,seconds:0,xpTotal:0}],choices=[],samples=[];
   let xpTotal=0,spawned=0,collected=0,nextSample=30,summary=null,peakAlive=0,peakFxUnits=0,peakTelegraphs=0,peakPuddles=0;
   const firstHit=new Map(),ttk=[],baseKills={},bossKills=[],spawnCounts={},stuck=[],lastMotion=new Map();
   const {telegraphContains}=await import('/src/systems/Telegraph.js');
   const packChoice=scene.spawnDirector.choosePack;
   // Override only pack selection, never map/time/cap/spawn geometry or enemy
   // numbers. Prefer each eligible unseen pack once, then return to RNG.
   scene.spawnDirector.choosePack=packs=>packs.find(pack=>pack.members.some(id=>!spawnCounts[id]))||packChoice(packs);
   const collect=scene.collectPickup.bind(scene);scene.collectPickup=pickup=>{
    if(pickup?.active&&!scene.pausedForChoice&&!scene.ended&&pickup.getData('kind')==='xp'){xpTotal+=pickup.getData('value')*scene.stats.xpGain;collected++;}
    const before=scene.stats.level;collect(pickup);
    for(let level=before+1;level<=scene.stats.level;level++){times[level]=scene.elapsed;levels.push({level,seconds:scene.elapsed,xpTotal});}
   };
   const spawn=scene.spawnEnemy.bind(scene);scene.spawnEnemy=(...args)=>{const serial=scene.enemySerial,result=spawn(...args);if(scene.enemySerial>serial){spawned++;const id=result.getData('type');spawnCounts[id]=(spawnCounts[id]||0)+1;}return result;};
   const damage=scene.damageEnemy.bind(scene);scene.damageEnemy=(enemy,...args)=>{
    if(enemy?.active&&!enemy.getData('isBoss')&&!firstHit.has(enemy.getData('serial'))&&args[0]>0)firstHit.set(enemy.getData('serial'),scene.elapsed);
    return damage(enemy,...args);
   };
   const kill=scene.killEnemy.bind(scene);scene.killEnemy=(enemy,...args)=>{
    if(enemy?.active){const type=enemy.getData('type');
     if(enemy.getData('isBoss'))bossKills.push({type,seconds:scene.elapsed});
     else {baseKills[type]=(baseKills[type]||0)+1;const start=firstHit.get(enemy.getData('serial'));if(start!==undefined)ttk.push({type,elite:!!enemy.getData('affix'),seconds:scene.elapsed-start});}
    }return kill(enemy,...args);
   };
   scene.options.onEnd=value=>{summary=value;};
   scene.sys.sceneUpdate=GameScene.prototype.update;
   scene.tweens.getDelta=()=>delta;
   // Audio throttles use wall time and pitch shares the global RNG. Muted
   // presentation must not alter a fast simulation's combat/draft randomness.
   scene.audio.sfx=()=>{};
   for(const method of ['play','loop','ui'])scene.skillAudio[method]=()=>null;
   const excludedAllyFx=new Set(),animationStates=new Set();
   if(enemyVisuals){
    const {FxDirector}=await import('/src/fx/FxDirector.js'),{ALLY_CATALOG}=await import('/src/data/allyCatalog.js');
    const allies=new Set(Object.values(ALLY_CATALOG).flat().map(skill=>skill.id));
    const play=scene.fx.play.bind(scene.fx);scene.fx.play=(id,...args)=>{
     // This is the enemy presentation audit, not the unfinished ally FX step.
     // Report unregistered ally presentation explicitly; do not filter console
     // output, asset errors, enemy recipes, hero FX or game mechanics.
     if(allies.has(id)&&!FxDirector.recipes.has(id)){excludedAllyFx.add(id);return null;}return play(id,...args);};
    const animate=scene.animateCharacter.bind(scene);scene.animateCharacter=(sprite,key,state,...args)=>{
     if(key?.startsWith('enemy-'))animationStates.add(state);return animate(sprite,key,state,...args);};
    const die=scene.enemyVisuals.die.bind(scene.enemyVisuals);scene.enemyVisuals.die=enemy=>{animationStates.add('death');return die(enemy);};
   }
   // Presentation only. Choices still go through the original progression callbacks.
   for(const method of ['setStats','setSkills','setCooldown','setPassives','setInnates','setAlly','setBoss','clearBoss','toast','showUnlock'])scene.hud[method]=()=>{};
   scene.floatText=()=>{};
   scene.hud.showChoice=(title,cards,choose,subtitle,secondary,options)=>{pending={title,cards,choose,secondary,options};};
   const priority={balam:['jaguar-roar','claw-cyclone','sun-claw','heart-of-balam','nine-lives','earthshaker','feast-of-the-fallen','bloodlust'],
    ixchel:['ancestor-flame','jade-needles','glyph-comet','raincaller','verdant-mercy','ixchels-mantle'],
    kukul:['featherstorm','atlatl-volley','gale-ring','skyfall','plume-guard','venomous-darts','full-quiver','jungle-instinct']}[hero];
   const score=card=>{
    if(card.supportPortrait)return card.id===preferredAlly?100:0;
    if(card.kind==='ally')return ({'saving-grace':100,'jade-ward':90,'sanctuary-dome':80,'lifebond':70,'sacred-fervor':60})[card.id]||20;
    let value=priority.includes(card.id)?100-priority.indexOf(card.id)*3:30;
    if(card.choiceType?.startsWith('new-'))value+=8;
    if(card.id==='jade-bounty')value=60;
    if(card.kind==='stat')value=({renewal:scene.stats.regen<2?82:35,vigor:scene.stats.hp/scene.stats.maxHp<.65?85:45,might:55,haste:52,armor:48,reach:42,critical:36,swiftness:25,wisdom:20,fortune:0})[card.id]??0;
    return value;
   };
   function choose(){
    let count=0;while(pending){
     if(++count>100)throw Error('Unbounded draft choices');
     const item=pending;pending=null;
     if(item.options?.readOnly&&item.options?.primary){choices.push({seconds:scene.elapsed,level:scene.loadoutLevel,title:item.title,kind:'confirmation'});item.options.primary.action();continue;}
     const ranked=item.cards.map((card,index)=>({card,index,score:score(card)})).sort((a,b)=>b.score-a.score);
     if(!ranked.length){if(item.secondary)item.secondary.action();else throw Error(`Empty draft: ${item.title}`);continue;}
     const pick=ranked[0];choices.push({seconds:scene.elapsed,level:scene.loadoutLevel,title:item.title,id:pick.card.id,kind:pick.card.kind,choice:pick.card.choiceType});item.choose(pick.card,pick.index);
    }
   }
   function drive(){
    const p=scene.player,foes=scene.enemies.getChildren().filter(e=>e.active);
    const nearest=[...foes].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
    const distance=nearest?Math.hypot(nearest.x-p.x,nearest.y-p.y):Infinity;
    const drops=scene.pickups.getChildren().filter(e=>e.active&&(e.getData('kind')==='xp'||(e.getData('kind')==='potion'&&scene.stats.hp<scene.stats.maxHp*.9)));
    const goal=drops.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||nearest;
    const desired=hero==='balam'?72:210;
    let best={score:-Infinity,x:0,y:0};
    for(let i=-1;i<16;i++){
     const angle=i*Math.PI/8,x=i<0?0:Math.cos(angle),y=i<0?0:Math.sin(angle);
     const px=p.x+x*scene.stats.speed*.3,py=p.y+y*scene.stats.speed*.3;
     let value=0;
     if(goal)value-=Math.hypot(px-goal.x,py-goal.y)*.3;
     if(nearest&&!drops.length)value-=Math.abs(Math.hypot(px-nearest.x,py-nearest.y)-desired)*.6;
     for(const e of foes){const d=Math.hypot(px-e.x,py-e.y);if(d<110)value-=Math.pow(110-d,2)*.035;if(e.getData('isBoss')&&d<170)value-=(170-d)*2;}
     for(const shot of scene.enemyProjectiles.getChildren())if(shot.active){const d=Math.hypot(px-shot.x-shot.body.velocity.x*.2,py-shot.y-shot.body.velocity.y*.2);if(d<65)value-=(65-d)*4;}
     for(const w of scene.telegraphs.live)if(telegraphContains(w,{x:px,y:py}))value-=3000*(.2+w.progress);
     // Avoid needless movement when in a safe firing position.
     if(i<0)value+=3;
     if(value>best.score)best={score:value,x,y};
    }
    scene.hud.move={x:best.x,y:best.y};
    for(let slot=0;slot<scene.skillSlots.length;slot++){
     const skill=scene.skillSlots[slot];
     const healing=['nine-lives','verdant-mercy'].includes(skill.id);
     if(!skill.remaining&&((healing&&scene.stats.hp<scene.stats.maxHp*.72)||(!healing&&distance<650)))scene.castSkill(slot);
    }
    if((distance<50||[...scene.telegraphs.live].some(w=>w.progress>.55&&telegraphContains(w,p)))&&scene.dash.cooldown<=0)scene.tryDash();
   }
   const end=seconds||scene.modeData.duration;
   while(scene.elapsed<end-1e-6&&!scene.ended){
    choose();audit?.snapshot();
    if(scene.pausedForChoice)throw Error('Choice paused without a draft');
    if(scene.elapsed>=nextDecision){drive();nextDecision=scene.elapsed+.2;}
    peakAlive=Math.max(peakAlive,scene.enemies.countActive());
    peakFxUnits=Math.max(peakFxUnits,scene.fx.liveUnits);peakTelegraphs=Math.max(peakTelegraphs,scene.telegraphs.live.size);peakPuddles=Math.max(peakPuddles,scene.enemySystem.puddles.length);
    if(scene.fx.liveUnits>24||scene.telegraphs.live.size>64||scene.enemySystem.puddles.length>128)throw Error('Presentation pool cap exceeded');
    clock+=delta;
    // HeadlessStep omits renderer camera preRender, but spawning uses worldView.
    scene.cameras.main.preRender();game.headlessStep(clock,delta);frames++;
    for(const enemy of scene.enemies.getChildren())if(enemy.active){
     if(!Number.isFinite(enemy.x+enemy.y))throw Error(`Non-finite position: ${enemy.getData('type')}`);
     const serial=enemy.getData('serial'),old=lastMotion.get(serial),state=enemy.getData('behaviorState');
     const expectedIdle=enemy.getData('buried')||state?.busy||state?.after||state?.motion||state?.recoveryUntil>scene.elapsed||['stunUntil','rootUntil','fearUntil','spawningUntil'].some(key=>enemy.getData(key)>scene.elapsed);
     if(!old||Math.hypot(enemy.x-old.x,enemy.y-old.y)>4||expectedIdle)lastMotion.set(serial,{x:enemy.x,y:enemy.y,time:scene.elapsed});
     else if(scene.elapsed-old.time>20){stuck.push({id:enemy.getData('type'),serial,seconds:scene.elapsed,x:enemy.x,y:enemy.y});lastMotion.set(serial,{x:enemy.x,y:enemy.y,time:scene.elapsed});}
    }
    if(frames%300===0){const alive=new Set(scene.enemies.getChildren().filter(e=>e.active).map(e=>e.getData('serial')));for(const serial of lastMotion.keys())if(!alive.has(serial))lastMotion.delete(serial);}
    if(scene.elapsed>=nextSample){samples.push({seconds:scene.elapsed,level:scene.stats.level,xpTotal,kills:scene.stats.kills,hp:scene.stats.hp,alive:scene.enemies.countActive(),drops:scene.pickups.countActive()});nextSample+=30;}
    if(frames>Math.ceil(end*31)+100)throw Error('Simulation stopped advancing');
   }
   choose();
   return {map,hero,mode,seed,spawnCounts,stuck,enemyCasts:{...scene.enemySystem.casts},excludedAllyFx:[...excludedAllyFx],animationStates:[...animationStates],peakFxUnits,peakTelegraphs,peakPuddles,seconds:scene.elapsed,level10:times[10]??null,level20:times[20]??null,endLevel:scene.stats.level,
    completedDuration:scene.elapsed>=end-1e-6,ended:scene.ended,hp:scene.stats.hp,kills:scene.stats.kills,damageTaken:scene.stats.damageTaken,
    cacao:scene.stats.cacao,peakAlive,baseKills,bossKills,ttk,averageBaseTtk:ttk.filter(t=>!t.elite).reduce((sum,t)=>sum+t.seconds,0)/Math.max(1,ttk.filter(t=>!t.elite).length),
    xpTotal,collected,spawned,frames,levels,choices,samples,skills:scene.skillSlots.map(s=>({id:s.id,level:s.level})),
    passives:scene.passiveSlots.map(s=>({id:s.id,level:s.level})),ally:scene.companion?.id,summary,
    ...(audit?{audit:{...audit,snapshot:undefined,allyCasts:{...scene.allyCasts}}}:{})};
  },{hero,mode,seed,seconds,verification,preferredAlly,map,enemyVisuals});
  if(verification){result.warnings=warnings;result.httpErrors=httpErrors;}
  result.errors=errors;report.runs.push(result);await save();
  assert.equal(result.errors.length,0,'Browser exceptions');assert.equal(result.httpErrors.length,0,'Failed asset requests');assert.equal(result.stuck.length,0,'Stuck enemies');
  if(enemyVisuals)assert.equal(result.warnings.length,0,`Missing presentation assets: ${result.warnings.join('\n')}`);
  const roster=JSON.parse(await fs.readFile('src/data/enemies-v06.json','utf8'));
  const eligible=Object.values(roster).filter(e=>(e.maps.includes('all')||e.maps.includes(map))&&!(hero==='balam'&&e.flier));
  if(!seconds){assert.equal(result.completedDuration,true,'Bot died before ten minutes');for(const enemy of eligible)assert.ok(result.spawnCounts[enemy.id]>0,`${map}: missing enemy ${enemy.id}`);
   for(const enemy of eligible)for(const name of Object.keys(enemy.attacks))if(!['Stone Guard','Puddle Trail'].includes(name))assert.ok(result.enemyCasts[`${enemy.id}:${name}`]>0,`${map}: unexercised ${enemy.id}/${name}`);}
  console.log(`${label} ${map}/${hero}/${mode}/${seed}: Lv10=${result.level10?.toFixed(1)??'-'}s Lv20=${result.level20?.toFixed(1)??'-'}s end=${result.endLevel} at ${result.seconds.toFixed(1)}s kills=${result.kills} cacao=${result.cacao} TTK=${result.averageBaseTtk.toFixed(2)}s ${result.completedDuration?'FULL DURATION':'DIED'}`);
  await context.close();
 }
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 await save();console.log(`Saved ${report.runs.length} runs to ${path.join(output,`${label}.json`)}`);
}finally{await save();await browser.close();await server.close();}
