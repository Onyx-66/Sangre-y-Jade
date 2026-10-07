// B3 real Phaser water traversal and HUD regression; local Chrome, no downloads.
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const output=resolve('docs/v0.6/previews/b3');await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});
await server.listen();const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={errors:[],httpErrors:[],layouts:[]};
try{
 const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?debug=water`);await page.waitForFunction(()=>window.__SANGRE_Y_JADE__);
 await page.evaluate(async()=>{const {GameScene}=await import('/src/scenes/GameScene.js');const create=GameScene.prototype.create;
 GameScene.prototype.create=function(){create.call(this);this.update=()=>{};};const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('skipBossEntrances',true);app.lastSelection={heroId:'kukul',mapId:'cenote',modeId:'quick'};await app.startRun();});
 await page.locator('.hud').waitFor();
 report.contract=await page.evaluate(async()=>{
   const app=window.__SANGRE_Y_JADE__,s=app.game.scene.getScene('Ritual');app.game.loop.stop();s.physics.world.pause();
   const teleport=(x,y,level=0)=>{s.player.setData('level',level);s.player.setData('elevation',level*48);s.player.body.reset(x,y);s.mapWorld.collision.actors.delete(s.player);s.mapWorld.collision.track(s.player,{radius:11,footOffset:24});};
   teleport(120,-24);s.water.beforeMovement();s.dash.cooldown=0;s.tryDash();const dash=s.dash.remaining;
   s.water.update(1);const deepShown=!s.water.hud.el.hidden,air=s.water.breath.air;
   s.pausedForChoice=true;s.water.update(9);const pausedAir=s.water.breath.air;s.pausedForChoice=false;
   teleport(-200,-24);s.water.update(1);const shallowHidden=s.water.hud.el.hidden,refilled=s.water.breath.air;
   teleport(120,-24,1);s.water.update(1);const aboveHidden=s.water.hud.el.hidden;
   teleport(120,-24);s.water.update(.1);s.cameras.main.centerOn(120,-24);s.cameras.main.preRender();
   return {dash,deepShown,air,pausedAir,shallowHidden,refilled,aboveHidden};
 });
 assert.deepEqual(report.contract,{dash:0,deepShown:true,air:7,pausedAir:7,shallowHidden:true,refilled:8,aboveHidden:true});
 for(const language of ['en','fr','ar'])for(const [width,height]of [[568,320],[1280,720]]){
  // Fresh rendered runs avoid resizing an intentionally stopped/headless GL
  // pipeline. Locale is selected before mounting, as in the real menu flow.
  const captureContext=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),capture=await captureContext.newPage();
  capture.on('pageerror',e=>report.errors.push(e.stack));capture.on('response',r=>{if(r.status()>=400)report.httpErrors.push(`${r.status()} ${r.url()}`);});
  await capture.goto(`http://127.0.0.1:${server.httpServer.address().port}/?debug=water`);await capture.waitForFunction(()=>window.__SANGRE_Y_JADE__);
  await capture.evaluate(async lang=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(lang);const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('language',lang);app.save.setSetting('master',0);app.lastSelection={heroId:'kukul',mapId:'cenote',modeId:'quick'};await app.startRun();
   const s=app.game.scene.getScene('Ritual');s.player.body.reset(120,-24);s.mapWorld.collision.actors.delete(s.player);s.cameras.main.centerOn(120,-24);s.invulnerable=100;s.spawnTimer=100;
  },language);
  await capture.waitForFunction(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.water.breath.deep&&s.elapsed>.5;});
  const layout=await capture.evaluate(()=>{const el=document.querySelector('[data-hud-element=breath]'),b=el.getBoundingClientRect();return {visible:!el.hidden,x:b.x,y:b.y,right:b.right,bottom:b.bottom,direction:getComputedStyle(el.querySelector('.breath-bar')).direction};});
  assert.ok(layout.visible&&layout.x>=0&&layout.y>=0&&layout.right<=width&&layout.bottom<=height);assert.equal(layout.direction,'ltr');
  report.layouts.push({language,width,height,...layout});await capture.screenshot({path:resolve(output,`${language}-${width}x${height}.png`)});await captureContext.close();
 }
 report.editor=await page.evaluate(async()=>{
  const app=window.__SANGRE_Y_JADE__,s=app.game.scene.getScene('Ritual');let saved;
  s.hud.showHudEditor(value=>{saved=value;app.save.setHudLayouts(value);},()=>{});
  await Promise.resolve();await s.hud.layoutRuntime.ready;await Promise.resolve();
  const editor=s.hud.editor;editor.selected='breath';editor.renderPanel();
  const fields=[...editor.el.querySelectorAll('[data-editor-field]')].map(el=>el.dataset.editorField);
  const old=s.hud.layoutRuntime.layout.elements.breath.x;editor.nudge(12,0);
  const draft=structuredClone(s.hud.layoutRuntime.layout);draft.elements.breath.scale=1.25;editor.commit(draft);editor.action('save');
  const result={fields,saved:!!saved,moved:saved?.landscape.elements.breath.x!==old,scale:saved?.landscape.elements.breath.scale,stored:app.save.data.hudLayouts.landscape.elements.breath.scale};
  s.hud.layoutRuntime.store.landscape=null;s.hud.layoutRuntime.apply(s.hud.layoutRuntime.defaults);return result;
 });
 assert.deepEqual(report.editor.fields,['anchor','x','y','scale']);assert.ok(report.editor.saved&&report.editor.moved);assert.equal(report.editor.scale,1.25);assert.equal(report.editor.stored,1.25);
 report.run=await page.evaluate(async()=>{
  const {GameScene}=await import('/src/scenes/GameScene.js'),app=window.__SANGRE_Y_JADE__,game=app.game,s=game.scene.getScene('Ritual');
  s.physics.world.resume();s.sys.sceneUpdate=GameScene.prototype.update;s.stats.hp=s.stats.maxHp=1000000;
  let pending; s.hud.showChoice=(title,cards,choose,_subtitle,secondary)=>{pending={title,cards,choose,secondary};};
  let frames=0,clock=s.time.now,deepFrames=0,shallowFrames=0,maxParticles=0,goal=-260;const times=[];
  while(s.elapsed<600-.00001&&!s.ended){
   for(let guard=0;pending&&guard<12;guard++){const c=pending;pending=null;if(c.cards?.length)c.choose(c.cards[0],0);else c.secondary?.action();}
   if(Math.abs(s.player.x-goal)<30)goal=goal<0?280:-260;
   const dx=goal-s.player.x,dy=-24-s.player.y,len=Math.hypot(dx,dy)||1;s.hud.move={x:dx/len,y:dy/len};
   if(s.water.breath.air<2){s.player.body.reset(-200,-24);s.mapWorld.collision.actors.delete(s.player);}
   clock+=50;const before=performance.now();game.headlessStep(clock,50);times.push(performance.now()-before);frames++;
   if(s.water.zone.deep)deepFrames++;else if(s.water.zone.kind==='shallow')shallowFrames++;maxParticles=Math.max(maxParticles,s.water.fx.pool.length);
   if(frames>16000)throw Error('Water run stalled');
  }
  times.sort((a,b)=>a-b);return {seconds:s.elapsed,frames,deepFrames,shallowFrames,maxParticles,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],enemies:s.stats.kills};
 });
 assert.ok(report.run.seconds>=599.9&&report.run.deepFrames>100&&report.run.shallowFrames>100);assert.ok(report.run.maxParticles<=64);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
}finally{await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
