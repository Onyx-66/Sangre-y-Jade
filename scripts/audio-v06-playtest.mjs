import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {compileAudio,audioCatalogPlugin} from './audio-catalog.mjs';

const staged=process.argv.includes('--staged');
const {catalog}=compileAudio(),output=path.resolve('docs/v0.6/previews/v17',staged?'staged':'.');await fs.mkdir(output,{recursive:true});
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sangre-v17-audio-'));
// MPEG-1 Layer III, 128 kb/s, 44.1 kHz stereo. Empty granules encode silence.
// Test-only files, never copied into public/ or used as production fallbacks.
const silent=Buffer.alloc(417*500);for(let i=0;i<500;i++)silent.set([0xff,0xfb,0x90,0x00],i*417);
for(const item of Object.values(catalog)){const file=path.join(temp,item.file);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,silent);}
const report={policy:'600 accelerated gameplay seconds in real Phaser/Web Audio per case; silent MP3 fixtures only in OS temp directory.',runs:[],errors:[]};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const present of [false,true]){
 const server=await createServer({configFile:false,base:'/',plugins:[{name:'staged-v17-verification',enforce:'pre',async transform(code,id){if(!staged)return;const file=path.join('.tools/v17-index',path.relative(process.cwd(),id.split('?')[0]));try{return await fs.readFile(file,'utf8');}catch{}}},audioCatalogPlugin(),{name:'test-audio-availability',enforce:'post',transform(code,id){if(present&&id.replaceAll('\\','/').endsWith('/src/audio/catalog.js'))return `export const AUDIO_CATALOG=${JSON.stringify(catalog)};export const AUDIO_AVAILABLE=${JSON.stringify(Object.values(catalog).map(i=>i.file))};`;}}],server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
 const page=await browser.newPage({viewport:{width:568,height:320}}),errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 if(present)await page.route('**/assets/audio-v06/**',route=>route.fulfill({path:path.join(temp,new URL(route.request().url()).pathname.split('/assets/audio-v06/')[1]),contentType:'audio/mpeg'}));
 try{
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.waitForFunction(()=>window.__SANGRE_Y_JADE__);
  await page.mouse.click(280,160);
  const initialized=await page.evaluate(async()=>{
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.audio.unlock();app.audio.stopNarration();app.audio.stopMusic();
   app.save.setSetting('master',.5);app.save.setSetting('music',0);app.audio.applySettings();
   const engine=app.audio.v2;if(!engine)throw Error('Manifest engine was not installed');
   const buffer=await engine.buffer('sfx/core/click');if(!buffer)throw Error('MP3/WAV did not decode');
   const meter=engine.context.createAnalyser();meter.fftSize=2048;engine.master.connect(meter);
   await engine.play('click');let peak=0;for(let n=0;n<12;n++){await new Promise(r=>setTimeout(r,30));const data=new Float32Array(2048);meter.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));}meter.disconnect();
   const {GameScene}=await import('/src/scenes/GameScene.js'),create=GameScene.prototype.create;
   GameScene.prototype.create=function(){create.call(this);this.update=()=>{};};
   app.lastSelection={heroId:'balam',mapId:'overgrown',modeId:'quick'};await app.startRun();app.game.loop.stop();
   const scene=app.game.scene.getScene('Ritual');scene.sys.sceneUpdate=GameScene.prototype.update;scene.updateDirector=()=>{};scene.stats.hp=scene.stats.maxHp=1000000;scene.stats.nextXp=Infinity;scene.modeData={...scene.modeData,duration:1200};scene.support.summon('tank',5);
   window.__audioTest={app,scene,clock:scene.time.now,peakEffects:0,peakEnemy:0};return {duration:buffer.duration,peak};
  });
  assert.ok(initialized.duration>0);if(!present)assert.ok(initialized.peak>1e-5,'legacy fallback reaches output mixer');else assert.ok(initialized.peak<1e-6,'stub MP3 is silent');
  for(let batch=0;batch<60;batch++)await page.evaluate(async()=>{
   const state=window.__audioTest,{app,scene:s}=state,engine=app.audio.v2;
   if(s.enemies.countActive()<5)for(let n=0;n<5;n++){const e=s.spawnEnemy('shade',1,{affix:null});e.body.reset(s.player.x+100+n*25,s.player.y);e.setData({hp:1000000,maxHp:1000000});}
   for(let frame=0;frame<300;frame++){state.clock+=1000/30;s.cameras.main.preRender();app.game.headlessStep(state.clock,1000/30);for(const tween of s.tweens.getTweens())tween.forward(1000/30);}
   await new Promise(r=>setTimeout(r,15));engine.update();state.peakEffects=Math.max(state.peakEffects,[...engine.voices].filter(v=>v.effect).length);state.peakEnemy=Math.max(state.peakEnemy,[...engine.voices].filter(v=>v.enemy).length);
   if(s.ended||s.pausedForChoice)throw Error('Unexpected stopped test run');if(state.peakEffects>24||state.peakEnemy>8)throw Error('Voice cap exceeded');
  });
  const result=await page.evaluate(()=>{const {app,scene,peakEffects,peakEnemy}=window.__audioTest;return {seconds:scene.elapsed,peakEffects,peakEnemy,decoded:app.audio.v2.buffers.size,missing:[...app.audio.v2.warnings]};});
  assert.ok(result.seconds>=599.9);if(present)assert.deepEqual(result.missing,[]);
  const unexpected=warnings.filter(w=>!w.startsWith('[audio] Optional missing:')&&!w.includes('Canvas2D:'));
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  for(const language of ['en','fr','ar']){await page.evaluate(async language=>{const app=window.__SANGRE_Y_JADE__;app.clearGame();const {setLanguage}=await import('/src/i18n/index.js');setLanguage(language);app.save.setSetting('language',language);app.showSettings();},language);await page.locator('[data-settings-tab="audio"]').click();await page.screenshot({path:path.join(output,`${present?'present':'missing'}-${language}-audio.png`)});
   for(const key of ['master','music','sfx','ambience','voice','ui','voiceEnabled']){const row=page.locator(`[data-setting-row="${key}"]`);await row.scrollIntoViewIfNeeded();const box=await row.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=569&&box.height>=44,`${language}:${key} fits and has a touch target`);}
   await page.locator('[data-toggle="voiceEnabled"]').click();assert.equal(await page.evaluate(()=>window.__SANGRE_Y_JADE__.save.data.settings.voiceEnabled),false);await page.locator('[data-toggle="voiceEnabled"]').click();
   await page.screenshot({path:path.join(output,`${present?'present':'missing'}-${language}-voice.png`)});
  }
  assert.deepEqual(errors,[]);
  report.runs.push({present,...initialized,...result,errors,warnings});console.log(JSON.stringify({present,seconds:result.seconds,peakEffects:result.peakEffects,peakEnemy:result.peakEnemy,decoded:result.decoded}));
 }catch(error){report.errors.push(String(error));throw error;}finally{await page.close();await server.close();}
}}finally{await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 // Only this validated OS-temp directory contains disposable test fixtures.
 const resolved=path.resolve(temp);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('sangre-v17-audio-'));await fs.rm(resolved,{recursive:true,force:true});}
