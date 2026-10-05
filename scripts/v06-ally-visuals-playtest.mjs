// Real Phaser, accelerated 600 gameplay seconds per companion. This is an
// animation/robustness coverage run, not an unmodified survival balance run.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
const candidate=process.argv.includes('--candidate'),output=path.resolve('docs/v0.6/previews/v16',candidate?'candidate':'runtime');
await fs.mkdir(output,{recursive:true});
const report={candidate,secondsPerAlly:600,policy:'High hero/enemy HP; fixed nearby threats; six active skills rotated one per 100s with both passives; no packs/bosses/XP. Real update, physics, AI, damage and FX.',runs:[],errors:[],warnings:[],checks:[]};
const check=(ok,label)=>{report.checks.push({label,passed:!!ok});assert.ok(ok,label);};
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const url=`http://127.0.0.1:${server.httpServer.address().port}`;
async function pageFor(){
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 if(candidate)await page.route('**/assets/pixel/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/assets/pixel/')[1],local=path.resolve('.tools/v16-candidate/pixel',file);
  if(/^frames\/support-|^fx\/(saintess-|tank-|assassin-|ally-skill-pop)/.test(file)){try{await fs.access(local);return route.fulfill({path:local,contentType:'image/png'});}catch{}}
  return route.continue();
 });return page;
}
try{
 const gallery=await pageFor();await gallery.goto(`${url}/tools/ally-preview.html${candidate?'?candidate=1':''}`);await gallery.waitForFunction(()=>window.__allyPreview?.ready);
 check(await gallery.evaluate(()=>window.__allyPreview.frames===48),'all 48 frames decode');await gallery.screenshot({path:path.join(output,'states.png'),fullPage:true});
 const effects=await gallery.evaluate(()=>{
  const {scene:s,effects}=window.__allyPreview;s.game.loop.stop();let clock=s.time.now;const rows=[];
  // Phaser's tween clock uses wall time: use forward() to exercise real tween completion in accelerated tests.
  for(const id of effects){s.fx.destroy();s.fx.play(id,'cast',{x:300,y:150,size:170,sound:false});const peak=s.fx.liveUnits;
   for(let n=0;n<20;n++){clock+=50;s.game.headlessStep(clock,50);for(const tween of s.tweens.getTweens())tween.forward(50);}
   s.fx.prune();rows.push({id,peak,remaining:s.fx.liveUnits,missing:[...s.fx.missing]});
  }return rows;
 });report.effects=effects;for(const e of effects)check(e.peak>0&&e.peak<=24&&e.remaining===0&&!e.missing.length,`${e.id}: bounded and cleaned`);await gallery.close();
 for(const role of ['saintess','tank','assassin']){
  const page=await pageFor();await page.goto(url);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(async role=>{
   const {GameScene}=await import('/src/scenes/GameScene.js'),create=GameScene.prototype.create;
   GameScene.prototype.create=function(){create.call(this);this.update=()=>{};};
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('damageNumbers',false);app.save.setSetting('screenShake',false);
   app.lastSelection={heroId:'kukul',mapId:'overgrown',modeId:'quick'};await app.startRun();app.game.loop.stop();
   const s=app.game.scene.getScene('Ritual');s.updateDirector=()=>{};s.stats.hp=60000;s.stats.maxHp=100000;s.stats.nextXp=Infinity;
   s.support.summon(role,5);s.sys.sceneUpdate=GameScene.prototype.update;s.modeData={...s.modeData,duration:1200};
   window.__allyRun={app,s,GameScene};
  },role);
  const run=await page.evaluate(async role=>{
   const {app,s}=window.__allyRun,{ALLY_CATALOG}=await import('/src/data/allyCatalog.js');
   const active=ALLY_CATALOG[role].filter(k=>k.kind==='active'),passive=ALLY_CATALOG[role].filter(k=>k.kind==='passive');
   const states=new Set(),strikeFrames=[],basicHits=[],fxIds=new Set();let clock=s.time.now,peakFx=0,selected=-1,lastRefresh=-1,inBasicStrike=false;
   const begin=s.support.visuals.begin.bind(s.support.visuals);s.support.visuals.begin=(kind,hit,target)=>begin(kind,()=>{inBasicStrike=kind==='attack';try{return hit();}finally{inBasicStrike=false;}},target);
   const damage=s.damageEnemy.bind(s);s.damageEnemy=(enemy,amount,...rest)=>{if(inBasicStrike){strikeFrames.push(s.companion.sprite.anims.currentFrame?.textureKey);basicHits.push(amount);}return damage(enemy,amount,...rest);};
   const play=s.fx.play.bind(s.fx);s.fx.play=(id,...args)=>{fxIds.add(id);return play(id,...args);};
   const started=s.elapsed,delta=1000/30;let frames=0;
   while(s.elapsed-started<600-1e-6&&!s.ended){
    const age=s.elapsed-started,index=Math.min(5,Math.floor(age/100));
    if(index!==selected){selected=index;for(const k of s.companion.skills)s.passives.unequip(k.id);s.companion.skills=[];s.support.equip(active[index]);for(const k of passive)s.support.equip(k);}
    if(Math.floor(age)!==lastRefresh){
     lastRefresh=Math.floor(age);s.stats.hp=40000;s.stats.shield=0;s.player.setData('poisonUntil',s.elapsed+2);
     while(s.enemies.countActive()<3){const e=s.spawnEnemy('priest',1,{affix:null});e.setData({hp:1000000,maxHp:1000000,ranged:true});}
     s.enemies.getChildren().filter(e=>e.active).forEach((e,i)=>{e.body.reset(s.player.x+45+i*20,s.player.y);e.setData({hp:300000,maxHp:1000000,ranged:true});});
     // Wall is reactive-only; real projectiles provide its authored trigger.
     if(role==='tank'&&index===0){const shot=s.enemyProjectiles.get(s.player.x-100,s.player.y,'fx-0');shot.enableBody(true,s.player.x-100,s.player.y,true,true);shot.setVelocity(100,0);shot.setData({life:2,damage:1});}
    }
    s.hud.move={x:Math.cos(age*.2)*.15,y:Math.sin(age*.2)*.15};
    clock+=delta;s.cameras.main.preRender();app.game.headlessStep(clock,delta);
    for(const tween of s.tweens.getTweens())tween.forward(delta);
    const a=s.companion.sprite;states.add(a.anims.currentAnim?.key);s.fx.prune();peakFx=Math.max(peakFx,s.fx.liveUnits);
    if(peakFx>24||!Number.isFinite(a.x+a.y))throw Error('Invalid ally/effect state');if(++frames>18002)throw Error('Simulation clock stopped');
   }
   // Validate animation hooks that have no ally-death gameplay trigger.
   for(const state of ['hurt','death']){s.animateCharacter(s.companion.sprite,`support-${role}`,state,.6);states.add(s.companion.sprite.anims.currentAnim?.key);}
   const result={role,seconds:s.elapsed-started,frames,states:[...states],casts:{...s.support.brain.casts},uncast:active.filter(k=>!s.support.brain.casts[k.id]).map(k=>k.id),peakFx,missing:[...s.fx.missing],basicHits:basicHits.length,basicDamage:[...new Set(basicHits)],strikeFrames:[...new Set(strikeFrames)],fx:[...fxIds]};
   s.animateCharacter(s.companion.sprite,`support-${role}`,'attack',.5);s.cameras.main.preRender();app.game.step(clock+16,0);
   return result;
  },role);
  report.runs.push(run);check(Math.abs(run.seconds-600)<.04,`${role}: 600 seconds`);check(!run.uncast.length,`${role}: every active casts`);
  check(run.missing.length===0&&run.peakFx<=24,`${role}: no missing stills and cap respected`);
  check(role==='saintess'||run.basicHits>0,`${role}: basic hits exercised`);
  check(run.strikeFrames.every(key=>key===`support-${role}-frame-8`)&&run.basicDamage.every(n=>n===(role==='tank'?7:12)),`${role}: basic damage unchanged and on frame 8`);
  await page.screenshot({path:path.join(output,`${role}-game.png`)});console.log(JSON.stringify(run));await page.close();
 }
 check(report.errors.length===0,'no console/HTTP errors');
 report.knownMissingAudio=report.warnings.filter(w=>/^Optional audio unavailable; using silence\/fallback: sfx\/ambience\/(overgrown-base|wind-soft|rain-light)\.mp3$/.test(w));
 check(report.warnings.length===report.knownMissingAudio.length,'no warnings except documented external ambience files (audio out of scope)');
}finally{
 report.passed=report.runs.length===3&&report.checks.every(c=>c.passed)&&!report.errors.length&&report.warnings.length===(report.knownMissingAudio?.length??0);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();console.log(JSON.stringify({passed:report.passed,errors:report.errors,warnings:report.warnings}));
}
