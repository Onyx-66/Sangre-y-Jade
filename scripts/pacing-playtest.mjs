// Full-run XP pacing audit. No forced kills, XP, starting upgrades or immortality.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const arg=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const label=arg('label')||'baseline';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Label must be lowercase letters, numbers and hyphens');
const heroes=(arg('heroes')||'balam,ixchel,kukul').split(',');
const modes=(arg('modes')||'quick,full').split(',');
const seeds=(arg('seeds')||'1701,1702,1703').split(',').map(Number);
const seconds=Number(arg('seconds'))||null;
const verification=process.argv.includes('--verification');
const preferredAlly=arg('ally')||'saintess';
assert.ok(['saintess','tank','assassin'].includes(preferredAlly),'Unknown companion');
assert.ok(heroes.every(id=>['balam','ixchel','kukul'].includes(id)),'Unknown hero');
assert.ok(modes.every(id=>['quick','full'].includes(id)),'Unknown mode');
assert.ok(seeds.length&&seeds.every(Number.isSafeInteger)&&new Set(seeds).size===seeds.length,'Seeds must be distinct integers');
assert.ok(seconds===null||(seconds>0&&seconds<=1200),'Invalid duration');
const output=path.resolve(verification?'docs/skills-redesign/verification':'docs/skills-redesign/pacing');
await fs.mkdir(output,{recursive:true});
const start=performance.now();
const report={label,createdAt:new Date().toISOString(),policy:'pacing-bot-v1',map:'overgrown',viewport:[1280,720],
 stepHz:30,seeds,seconds,meta:'fresh save; no shrine upgrades',settings:'auto attack/aim, high enemy density, muted audio',
 targets:{quick:{10:[210,270],20:[480,570]},full:{10:[240,330],20:[540,720]}},runs:[],errors:[]};
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const save=()=>fs.writeFile(path.join(output,`${label}.json`),JSON.stringify({...report,wallSeconds:(performance.now()-start)/1000},null,2)+'\n');
try{
 for(const hero of heroes)for(const mode of modes)for(const seed of seeds){
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
  const errors=[],warnings=[],httpErrors=[];page.on('pageerror',error=>{errors.push(error.stack);report.errors.push(`${hero}/${mode}/${seed}: ${error.stack}`);console.error(error.stack);});
  if(verification){page.on('console',message=>{if(message.type()==='error')errors.push(message.text());if(message.type()==='warning'&&/Placeholder:|Sound fallback:|No active handler:/.test(message.text()))warnings.push(message.text());});page.on('response',r=>{if(r.status()>=400)httpErrors.push(`${r.status()} ${r.url()}`);});}
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(async({hero,mode,seed})=>{
   const {GameScene}=await import('/src/scenes/GameScene.js');
   const original=GameScene.prototype.create;
   GameScene.prototype.create=function(){
    let state=seed>>>0;Math.random=()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};
    window.Phaser.Math.RND.sow([String(seed)]);
    original.call(this);
    // Freeze the initial wall-clock frame; the audit supplies all simulation steps.
    this.sys.sceneUpdate=()=>{};this.game.loop.stop();
   };
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();
   app.lastSelection={heroId:hero,mapId:'overgrown',modeId:mode};
   app.save.setSetting('master',0);app.save.setSetting('attackMode','auto');app.save.setSetting('autoAim',true);
   app.save.setSetting('damageNumbers',false);app.save.setSetting('screenShake',false);
   app.startRun();
  },{hero,mode,seed});
  await page.locator('.hud').waitFor();
  const result=await page.evaluate(async({hero,mode,seed,seconds,verification,preferredAlly})=>{
   const {GameScene}=await import('/src/scenes/GameScene.js');
   const game=window.__SANGRE_Y_JADE__.game,scene=game.scene.getScene('Ritual');game.loop.stop();
   const audit=verification?(await import('/scripts/verification-observers.mjs')).observeRun(scene,(await import('/src/systems/SkillDraft.js')).slotCount):null;
   const delta=1000/30;let clock=scene.time.now,frames=0,nextDecision=0,pending=null;
   const times={},levels=[{level:1,seconds:0,xpTotal:0}],choices=[],samples=[];
   let xpTotal=0,spawned=0,collected=0,nextSample=30,summary=null;
   const collect=scene.collectPickup.bind(scene);scene.collectPickup=pickup=>{
    if(pickup?.active&&!scene.pausedForChoice&&!scene.ended&&pickup.getData('kind')==='xp'){xpTotal+=pickup.getData('value')*scene.stats.xpGain;collected++;}
    const before=scene.stats.level;collect(pickup);
    for(let level=before+1;level<=scene.stats.level;level++){times[level]=scene.elapsed;levels.push({level,seconds:scene.elapsed,xpTotal});}
   };
   const spawn=scene.spawnEnemy.bind(scene);scene.spawnEnemy=(...args)=>{spawned++;return spawn(...args);};
   scene.options.onEnd=value=>{summary=value;};
   scene.sys.sceneUpdate=GameScene.prototype.update;
   scene.tweens.getDelta=()=>delta;
   // Presentation only. Choices still go through the original progression callbacks.
   for(const method of ['setStats','setSkills','setCooldown','setPassives','setInnates','setAlly','setBoss','clearBoss','toast','showUnlock'])scene.hud[method]=()=>{};
   scene.floatText=()=>{};
   scene.hud.showChoice=(title,cards,choose,subtitle,secondary)=>{pending={title,cards,choose,secondary};};
   const priority={balam:['jaguar-roar','claw-cyclone','sun-claw','heart-of-balam','nine-lives','earthshaker','feast-of-the-fallen','bloodlust'],
    ixchel:['ancestor-flame','jade-needles','glyph-comet','raincaller','verdant-mercy','ixchels-mantle'],
    kukul:['featherstorm','atlatl-volley','gale-ring','skyfall','plume-guard','venomous-darts','full-quiver','jungle-instinct']}[hero];
   const score=card=>{
    if(card.supportPortrait)return card.id===preferredAlly?100:0;
    if(card.kind==='ally')return ({'saving-grace':100,'jade-ward':90,'sanctuary-dome':80,'lifebond':70,'sacred-fervor':60})[card.id]||20;
    if(card.choiceType==='swap')return -100;
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
    if(distance<50&&scene.dash.cooldown<=0)scene.tryDash();
   }
   const end=seconds||scene.modeData.duration;
   while(scene.elapsed<end-1e-6&&!scene.ended){
    choose();audit?.snapshot();
    if(scene.pausedForChoice)throw Error('Choice paused without a draft');
    if(scene.elapsed>=nextDecision){drive();nextDecision=scene.elapsed+.2;}
    clock+=delta;
    // HeadlessStep omits renderer camera preRender, but spawning uses worldView.
    scene.cameras.main.preRender();game.headlessStep(clock,delta);frames++;
    if(scene.elapsed>=nextSample){samples.push({seconds:scene.elapsed,level:scene.stats.level,xpTotal,kills:scene.stats.kills,hp:scene.stats.hp,alive:scene.enemies.countActive(),drops:scene.pickups.countActive()});nextSample+=30;}
    if(frames>Math.ceil(end*31)+100)throw Error('Simulation stopped advancing');
   }
   choose();
   return {hero,mode,seed,seconds:scene.elapsed,level10:times[10]??null,level20:times[20]??null,endLevel:scene.stats.level,
    completedDuration:scene.elapsed>=end-1e-6,ended:scene.ended,hp:scene.stats.hp,kills:scene.stats.kills,damageTaken:scene.stats.damageTaken,
    xpTotal,collected,spawned,frames,levels,choices,samples,skills:scene.skillSlots.map(s=>({id:s.id,level:s.level})),
    passives:scene.passiveSlots.map(s=>({id:s.id,level:s.level})),ally:scene.companion?.id,summary,
    ...(audit?{audit:{...audit,snapshot:undefined,allyCasts:{...scene.allyCasts}}}:{})};
  },{hero,mode,seed,seconds,verification,preferredAlly});
  if(verification){result.warnings=warnings;result.httpErrors=httpErrors;}
  result.errors=errors;report.runs.push(result);await save();
  console.log(`${label} ${hero}/${mode}/${seed}: Lv10=${result.level10?.toFixed(1)??'-'}s Lv20=${result.level20?.toFixed(1)??'-'}s end=${result.endLevel} at ${result.seconds.toFixed(1)}s kills=${result.kills} ${result.completedDuration?'FULL DURATION':'DIED'}`);
  await context.close();
 }
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 await save();console.log(`Saved ${report.runs.length} runs to ${path.join(output,`${label}.json`)}`);
}finally{await save();await browser.close();await server.close();}
