// V10 uses real Phaser/DOM objects, existing local assets and a controlled clock.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';

const output=path.resolve(process.env.SYJ_BOSS_OUTPUT||'docs/v0.6/previews/v10/runtime');
await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],warnings=[],captures=[],evidence=[],started=performance.now();
const check=(ok,label,data)=>{checks.push({label,passed:!!ok,...(data?{evidence:data}:{})});assert.ok(ok,label);};
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const url=`http://127.0.0.1:${server.httpServer.address().port}`;
try{
 for(const locale of ['en','fr','ar'])for(const [width,height]of [[568,320],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.stack));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  const loaded=await page.evaluate(async locale=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
   const {GameScene}=await import('/src/scenes/GameScene.js'),create=GameScene.prototype.create;
   GameScene.prototype.create=function(){create.call(this);this.update=()=>{};};
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('language',locale);
   app.save.setSetting('attackMode','manual');app.save.setSetting('skipBossEntrances',false);app.save.setSetting('screenShake',false);
   app.lastSelection={heroId:'kukul',mapId:'overgrown',modeId:'quick'};await app.startRun();app.game.loop.stop();
   const scene=app.game.scene.getScene('Ritual'),{BOSSES}=await import('/src/data/world.js'),{worldView}=await import('/src/systems/Viewport.js');
   scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());scene.elapsed=142;scene.nextBossIndex=0;
   const hooks={horn:0,stinger:0,voice:0,music:0,phases:[],death:0};scene.options.bossHooks={horn:()=>hooks.horn++,stinger:()=>hooks.stinger++,voice:()=>hooks.voice++,music:()=>hooks.music++,phase:x=>hooks.phases.push(x.index),death:()=>hooks.death++};
   scene.bossController.random=()=>.25;scene.bossController.updateArrival();
   const warning=scene.bossController.warning,view=worldView(scene);
   window.__bossQA={app,scene,BOSSES,worldView,hooks,originalUpdate:GameScene.prototype.update,render(){scene.cameras.main.preRender();app.game.step(scene.time.now+16,16);}};
   return {warning:!!warning,spawnAt:warning?.spawnAt,horn:hooks.horn,point:warning?.point,view,
    arrow:(()=>{const rect=document.querySelector('.boss-arrival-warning>i').getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};})()};
  },locale);
  check(loaded.warning&&loaded.spawnAt===150&&loaded.horn===1,`${locale}/${width}: real eight-second arrival warning and one horn`,loaded);
  check(loaded.point.x<loaded.view.x||loaded.point.x>loaded.view.right||loaded.point.y<loaded.view.y||loaded.point.y>loaded.view.bottom,`${locale}/${width}: planned spawn outside actual camera view`);
  const warningFile=`${locale}-${width}x${height}-warning.png`;await page.screenshot({path:path.join(output,warningFile)});captures.push(warningFile);
  const entered=await page.evaluate(()=>{
   const q=window.__bossQA,s=q.scene;s.elapsed=149.99;s.bossController.updateArrival();const tooEarly=!!s.activeBoss;
   s.elapsed=150;s.bossController.updateArrival();q.boss=s.activeBoss;q.baseZoom=s.cutscenes.current.snapshot.zoomX;
   const hp=s.stats.hp,bhp=q.boss.getData('hp'),elapsed=s.elapsed;
   s.damagePlayer(999,s.player.x,s.player.y,q.boss);s.damagePlayer(999,0,0,null,false,{dot:true});s.damageEnemy(q.boss,999,0,0,s.player,{dot:true});s.autoAttack();s.tryDash();
   q.originalUpdate.call(s,0,500);q.render();
   return {tooEarly,active:s.cutscenes.active,age:s.cutscenes.current.age,paused:s.physics.world.isPaused&&s.time.paused&&s.pausedForChoice,
    noDamage:s.stats.hp===hp&&q.boss.getData('hp')===bhp,noTime:s.elapsed===elapsed,hp:bhp,manualShots:s.projectiles.countActive(),remaining:s.dash.remaining};
  });
  check(!entered.tooEarly&&entered.active&&entered.paused&&entered.noDamage&&entered.noTime&&entered.hp===1400&&entered.manualShots===0&&entered.remaining===0,`${locale}/${width}: actual cinematic freezes time/physics and blocks combat`,entered);
  await page.locator('.boss-cinematic').click({position:{x:width/2,y:height/2}});
  check(await page.evaluate(()=>window.__bossQA.scene.cutscenes.active),`${locale}/${width}: early tap cannot skip`);
  const banner=await page.evaluate(()=>{
   const q=window.__bossQA,s=q.scene;s.cutscenes.update(2.1-s.cutscenes.current.age);q.render();
   const el=document.querySelector('.boss-entry-name'),rect=el.getBoundingClientRect();
   return {zoom:s.cameras.main.zoomX/q.baseZoom,name:el.querySelector('strong').textContent,epithet:el.querySelector('small').textContent,
    visible:!el.hidden,inside:rect.x>=0&&rect.y>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,dir:el.dir,hooks:q.hooks};
  });
  check(Math.abs(banner.zoom-1.25)<1e-6&&banner.visible&&banner.inside&&banner.name&&banner.epithet&&banner.hooks.stinger===1&&banner.hooks.voice===1&&banner.hooks.music===1,`${locale}/${width}: camera zoom and readable kit banner with one-shot hooks`,banner);
  const cinematicFile=`${locale}-${width}x${height}-entrance.png`;await page.screenshot({path:path.join(output,cinematicFile)});captures.push(cinematicFile);
  const resumed=await page.evaluate(()=>{
   const q=window.__bossQA,s=q.scene;s.cutscenes.update(2.9);q.render();
   const c=s.cameras.main;s.bossController.refreshBar();q.boss.setData({hp:700,bossArmorPct:.25,bossShield:280});s.bossController.phaseChanged();s.bossController.refreshBar();q.render();
   const bar=s.hud.boss,rect=bar.getBoundingClientRect(),meter=bar.querySelector('.boss-bar').getBoundingClientRect();
   return {active:s.cutscenes.active,resumed:!s.physics.world.isPaused&&!s.time.paused&&!s.pausedForChoice,
    zoom:c.zoomX/q.baseZoom,follow:c._follow===s.player,bar:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,inside:rect.x>=0&&rect.y>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,
     notches:bar.querySelectorAll('.boss-notches i').length,phase:bar.querySelector('.boss-phase-icon').dataset.phase,
     hp:bar.querySelector('.boss-hp-number').textContent,shield:!bar.querySelector('.boss-shield').hidden,armor:!bar.querySelector('.boss-armor').hidden,
     direction:getComputedStyle(bar).direction,meter:{x:meter.x,y:meter.y,width:meter.width,height:meter.height}}};
  });
  check(!resumed.active&&resumed.resumed&&resumed.follow&&Math.abs(resumed.zoom-1)<1e-6,`${locale}/${width}: natural completion resumes and restores camera`,resumed);
  check(resumed.bar.inside&&resumed.bar.notches===1&&resumed.bar.phase==='2'&&resumed.bar.hp==='700 / 1400'&&resumed.bar.shield&&resumed.bar.armor&&resumed.bar.direction==='ltr',`${locale}/${width}: phase/shield/armor boss bar inside screen`,resumed.bar);
  const barFile=`${locale}-${width}x${height}-bar.png`;await page.screenshot({path:path.join(output,barFile)});captures.push(barFile);
  evidence.push({locale,width,height,bar:resumed.bar});
  if(locale==='en'&&width===568){
   const combat=await page.evaluate(()=>{
    const q=window.__bossQA,s=q.scene,records=[];s.stats.armor=0;
    const dispose=()=>{s.cutscenes.finish({abort:true});s.telegraphs.cancelAll();for(const actor of s.enemies.getChildren())if(actor.active)actor.disableBody(true,true);s.activeBoss=null;s.hud.clearBoss();s.bossController.state=null;};
    for(const data of q.BOSSES){
     dispose();s.settings.skipBossEntrances=true;const boss=s.spawnBoss(data,{position:{x:s.player.x+180,y:s.player.y}});s.cutscenes.update(2);
     s.bossController.state.initialReady=s.elapsed;s.bossController.state.recoveryUntil=0;boss.setData({bossArmorPct:0,bossShield:0});
     const before=s.enemyProjectiles.countActive(),hp=s.stats.hp;s.invulnerable=0;s.bossController.update(boss,0);const warning=[...s.telegraphs.live][0];
     if(!warning)throw Error(`No real warning: ${data.id}`);s.telegraphs.update(.61);const noEarly=s.enemyProjectiles.countActive()===before&&s.stats.hp===hp&&!s.bossController.state.motion;
     s.elapsed+=.62;s.telegraphs.update(.02);const state=s.bossController.state,motion=state.motion;
     if(motion){boss.body.reset(s.player.x,s.player.y);s.bossController.update(boss,.01);s.elapsed+=.6;s.bossController.update(boss,.6);}
     records.push({id:data.id,hp:boss.getData('maxHp'),warning:warning.windup,noEarly,casts:s.bossController.casts[`${data.id}:legacy-${data.pattern}`]||0,
      shots:s.enemyProjectiles.countActive()-before,damage:hp-s.stats.hp,recovery:state.recoveryUntil-s.elapsed,motionResolved:!state.motion});
     for(const shot of s.enemyProjectiles.getChildren())if(shot.active)shot.disableBody(true,true);
    }
    dispose();s.settings.skipBossEntrances=false;const boss=s.spawnBoss(q.BOSSES[3],{position:{x:s.player.x+200,y:s.player.y}});s.cutscenes.update(.99);
    q.render();return records;
   });
   check(combat.length===4&&combat.every(r=>r.noEarly&&r.warning>=.5&&r.recovery>=1.2-1e-6&&r.casts>=1&&r.motionResolved), 'all four current attacks use real pooled warnings, execute, and recover',combat);
   check(combat[0].damage===18&&combat[1].damage===22&&combat[2].shots===5&&combat[3].shots===7,'temporary attacks preserve current damage, dash and projectile counts',combat);
   check(await page.evaluate(()=>{const s=window.__bossQA.scene;s.togglePause();return s.cutscenes.active;}),'native Back before one second does not skip');
   await page.evaluate(()=>window.__bossQA.scene.cutscenes.update(.02));
   await page.locator('.boss-cinematic').click({position:{x:width/2,y:height/2}});
   check(await page.evaluate(()=>{const s=window.__bossQA.scene;return !s.cutscenes.active&&!s.pausedForChoice&&!s.physics.world.isPaused&&!!document.querySelector('.boss-name-flash');}),'real tap skip resumes immediately with a two-second name flash');
   const death=await page.evaluate(()=>{
    const q=window.__bossQA,s=q.scene,boss=s.activeBoss;let rewards=0;s.grantBossReward=()=>rewards++;
    // Exercise non-final reward/death path with the current actor.
    boss.setData('bossId','camazotz');s.damageEnemy(boss,999999,0,0,s.player,{canCrit:false,visuals:false});
    const before=!!s.bossController.state?.dead&&!s.activeBoss&&rewards===0;s.bossController.updateWorld(.89);
    const delayed=rewards===0;s.bossController.updateWorld(.01);const once=rewards===1;s.bossController.updateWorld(1);
    return {before,delayed,once,rewards,deathHook:q.hooks.death};
   });
   check(death.before&&death.delayed&&death.once&&death.rewards===1&&death.deathHook===1,'real death delays reward until sequence ends exactly once',death);
  }
  await context.close();
 }
 for(const width of [568,1280]){
  const rows=evidence.filter(row=>row.width===width),a=rows[0].bar;
  check(rows.every(row=>['x','y','width','height'].every(key=>Math.abs(row.bar[key]-a[key])<1)),`${width}: boss HUD position identical in EN/FR/AR`);
 }
 check(errors.length===0,'zero browser/HTTP errors',errors);check(warnings.length===0,'zero console warnings / missing assets',warnings);
 for(const state of ['bar','entrance','warning']){
  const tiles=[];for(const [i,row]of evidence.entries())tiles.push({input:await sharp(path.join(output,`${row.locale}-${row.width}x${row.height}-${state}.png`)).resize(568,320,{fit:'contain'}).toBuffer(),left:(i%2)*568,top:Math.floor(i/2)*320});
  const file=`boss-${state}-contact.png`;await sharp({create:{width:1136,height:960,channels:4,background:'#110d13'}}).composite(tiles).png().toFile(path.join(output,file));captures.push(file);
 }
}finally{
 const report={passed:checks.every(c=>c.passed)&&!errors.length&&!warnings.length,checks,errors,warnings,captures,evidence,wallSeconds:(performance.now()-started)/1000};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 await browser.close();await server.close();console.log(JSON.stringify({passed:report.passed,checks:checks.length,screenshots:captures.length,wallSeconds:report.wallSeconds,output}));
}
