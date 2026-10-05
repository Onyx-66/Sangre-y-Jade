import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';

const output=path.resolve(process.env.SYJ_LOADING_OUTPUT||'docs/v0.6/previews/v6');await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:568,height:320},deviceScaleFactor:1,serviceWorkers:'block'});
await context.addInitScript(()=>localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2,settings:{master:0,reducedMotion:false}})));
const page=await context.newPage(),checks=[],errors=[],expectedFailures=[],runs=[],captures=[];
page.on('pageerror',error=>errors.push(error.stack));page.on('console',message=>{if(message.type()==='error'&&!expectedFailures.some(url=>message.location().url.includes(url)))errors.push(`${message.text()} @ ${message.location().url}`);});
page.on('response',response=>{if(response.status()>=400&&!expectedFailures.some(url=>response.url().includes(url)))errors.push(`${response.status()} ${response.url()}`);});
const check=(value,label)=>{checks.push({label,passed:!!value});assert.ok(value,label);};
const capture=async name=>{await page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'});captures.push(name);};
const java=await fs.readFile('android/app/src/main/java/com/sangreyjade/game/MainActivity.java','utf8');
const androidBack=JSON.parse(java.match(/private void handleBack\(\)\{web\.evaluateJavascript\(("(?:[^"\\]|\\.)*")/)[1]);
async function start({locale='en',hero='balam',map='overgrown',reduced=false,hooks=false}={}){
 await page.evaluate(async({locale,hero,map,reduced,hooks})=>{
  const app=window.__SANGRE_Y_JADE__,{setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);app.save.setSetting('language',locale);app.save.setSetting('reducedMotion',reduced);app.lastSelection={heroId:hero,mapId:map,modeId:'quick'};
  window.loadTrace=[];window.loadFrames=[];window.loadRequestsStart=performance.now();window.loadReadyAt=null;window.loadStartedAt=performance.now();
  app.startRun().then(()=>window.loadReadyAt=performance.now());
  const session=app.loadingSession,callback=session.progress.onChange;session.progress.onChange=value=>{window.loadTrace.push({...value,time:performance.now()});callback(value);};
  if(hooks){window.loadHooks={maps:0,worlds:0,paused:false};session.prepareMap=async data=>{window.loadHooks.maps++;window.loadHooks.seed=data.seed;};session.prepareWorld=async(scene,progress)=>{window.loadHooks.worlds++;window.loadHooks.paused=scene.loadingRun&&scene.time.paused;progress(.5);if(window.loadHooks.worlds===1)throw new Error('Injected world-generation hook failure');progress(1);};}
  const sample=()=>{const el=document.querySelector('.run-loading');if(el){const s=app.game?.scene.getScene('Ritual');window.loadFrames.push({opaque:getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)',elapsed:s?.elapsed??0,hud:!!document.querySelector('.hud')});requestAnimationFrame(sample);}};requestAnimationFrame(sample);
 },{locale,hero,map,reduced,hooks});await page.locator('.run-loading').waitFor();
}
async function finish(){await page.waitForFunction(()=>window.loadReadyAt!==null&&!!window.__SANGRE_Y_JADE__.game?.scene.getScene('Ritual').player,{timeout:45000});}
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 // Delay real local frame requests so the screenshots capture actual work.
 await page.route('**/assets/pixel/frames/hero-*.png',async route=>{await new Promise(r=>setTimeout(r,120));await route.continue();});
 for(const [i,locale]of ['en','fr','ar'].entries())for(const [width,height]of [[568,320],[1280,720]]){
  await page.setViewportSize({width,height});const hero=['balam','ixchel','kukul'][i],map=['overgrown','bloodmoon','cenote'][i];await start({locale,hero,map,reduced:locale==='ar'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.load-logo,.load-hero,.load-map')].length===3&&[...document.querySelectorAll('.load-logo,.load-hero,.load-map')].every(el=>el.complete&&el.naturalWidth>0));
  check(await page.locator('.run-loading').isVisible(),`${locale} ${width}: logo, selected hero and map decode during the real load`);
  await capture(`${locale}-loading-${width}x${height}`);
  const bounds=await page.evaluate(()=>{const panel=document.querySelector('.load-panel'),p=panel.getBoundingClientRect();return {x:p.x,y:p.y,right:p.right,bottom:p.bottom,scroll:panel.scrollWidth>panel.clientWidth+1||panel.scrollHeight>panel.clientHeight+1,dir:panel.parentElement.dir,percentageDir:getComputedStyle(document.querySelector('.load-percent')).direction,fonts:document.fonts.status};});
  check(bounds.x>=0&&bounds.y>=0&&bounds.right<=width+.5&&bounds.bottom<=height+.5&&!bounds.scroll,`${locale} ${width}: complete loading panel fits without overflow`);
  check(bounds.dir===(locale==='ar'?'rtl':'ltr')&&bounds.percentageDir==='ltr',`${locale} ${width}: localized layout with Western LTR percentage`);
  check(await page.locator('.load-hero').getAttribute('src')===`/assets/pixel/frames/hero-${hero}-0.png`,`${locale} ${width}: selected hero art`);
  if(locale==='ar')check(await page.evaluate(()=>[...document.querySelectorAll('.load-torch img')].every(el=>getComputedStyle(el).animationName==='none')),'reduced motion disables torch animation');
  await finish();
  const result=await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__,s=app.game.scene.getScene('Ritual');return {trace:window.loadTrace,frames:window.loadFrames,duration:window.loadReadyAt-window.loadStartedAt,active:s.scene.isActive(),music:app.audio.currentName,decodes:s.skillAudio.buffers.size,loading:s.loadingRun,otherHeroes:['balam','ixchel','kukul'].filter(id=>id!==s.heroData.id&&s.textures.exists(`hero-${id}`)),terrain:s.floor.displayTexture.key,elapsed:s.elapsed};});runs.push({locale,width,height,...result});
  check(result.trace.length>5&&result.trace.every((item,n)=>!n||item.percent>=result.trace[n-1].percent)&&result.trace.at(-1).percent===100,`${locale} ${width}: measured progress is monotonic and reaches 100`);
  check(result.duration>=600&&result.active&&!result.loading&&result.terrain==='ground',`${locale} ${width}: at least 600ms and rendered terrain before reveal`);
  check(result.frames.length>1&&result.frames.every(frame=>frame.opaque&&frame.elapsed===0),`${locale} ${width}: no green-page exposure or early simulation behind the overlay`);
  check(result.otherHeroes.length===0&&result.decodes>0&&result.music===({overgrown:'day',bloodmoon:'night',cenote:'cenote'})[map],`${locale} ${width}: lazy hero frames, real decoded skills and selected music`);
 }
 await page.unroute('**/assets/pixel/frames/hero-*.png');await page.setViewportSize({width:568,height:320});
 const critical='/assets/pixel/frames/hero-balam-1.png';expectedFailures.push(critical);let attempts=0;
 await page.route(`**${critical}`,async route=>{if(++attempts===1)await route.fulfill({status:503,body:'Injected critical failure'});else await route.continue();});
 await start();await page.locator('.load-failure').waitFor();await capture('critical-failure');
 check((await page.locator('.load-failed-assets').textContent()).includes('hero-balam-1.png')&&await page.locator('[data-load-continue]').isHidden(),'critical failure shows asset name and cannot be skipped');
 const before=await page.locator('[role=progressbar]').getAttribute('aria-valuenow'),retryAt=await page.evaluate(()=>performance.now());await page.locator('[data-load-retry]').click();await finish();check(attempts===2,'Retry fetches the failed critical asset again');
 check(await page.evaluate(({before,retryAt})=>{const after=window.loadTrace.filter(p=>p.time>=retryAt);return after.length>0&&after.every(p=>p.percent>=Number(before));},{before,retryAt}),'retry does not rewind progress');await page.unroute(`**${critical}`);
 const optional='/assets/pixel/fx/jaguar-roar/accent.png';expectedFailures.push(optional);await page.route(`**${optional}`,route=>route.fulfill({status:503,body:'Injected optional failure'}));
 await start({locale:'ar'});await page.locator('.load-failure').waitFor();await capture('ar-optional-failure');check(await page.locator('[data-load-continue]').isVisible()&&(await page.locator('.load-failed-assets').textContent()).includes('accent.png'),'optional failure shows asset name and Continue anyway');
 await page.locator('[data-load-continue]').click();await finish();check(await page.locator('.hud').isVisible()&&await page.locator('.run-loading').count()===0,'optional failure can reveal a playable run');await page.unroute(`**${optional}`);
 const missingSound='/assets/audio/sfx/skills/sfx-jaguar-roar-cast.wav';expectedFailures.push(missingSound);let soundAttempts=0;
 await page.route(`**${missingSound}`,route=>{soundAttempts++;return route.fulfill({status:503,body:'Injected optional sound failure'});});
 await start({locale:'fr'});await page.locator('.load-failure').waitFor();check(await page.locator('[data-load-continue]').isVisible()&&(await page.locator('.load-failed-assets').textContent()).includes('sfx-jaguar-roar-cast.wav'),'decode failure identifies the optional sound and offers Continue');
 await page.locator('[data-load-continue]').click();await finish();const beforePlay=soundAttempts;await page.evaluate(async()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');await s.skillAudio.play('jaguar-roar','cast');});check(soundAttempts===beforePlay,'continued missing sound uses the old fallback without fetching the failed file again');await page.unroute(`**${missingSound}`);
 await start({hooks:true});
 await page.locator('.load-failure').waitFor();check((await page.locator('.load-failed-assets').textContent()).includes('map-generation')&&await page.locator('[data-load-continue]').isHidden(),'later map/prop-pool hook participates in critical recovery');await page.locator('[data-load-retry]').click();await finish();
 check(await page.evaluate(()=>window.loadHooks.maps===1&&window.loadHooks.seed===83492791&&window.loadHooks.worlds===2&&window.loadHooks.paused&&window.loadTrace.every((p,n)=>!n||p.percent>=window.loadTrace[n-1].percent)),'map data and prop-pool hooks run on real paused scene, retry once and preserve progress');
 // Hook completion is genuine asynchronous work, and tips rotate while waiting.
 await page.route('**/assets/pixel/ground.png',async route=>{await new Promise(r=>setTimeout(r,3800));await route.continue();});await start();const tip=await page.locator('.load-tip').textContent();await page.waitForTimeout(3550);check(await page.locator('.load-tip').textContent()!==tip,'tip rotates during a real slow load');await page.evaluate(androidBack);
 check(await page.locator('.run-loading').count()===0&&await page.evaluate(()=>!window.__SANGRE_Y_JADE__.game),'Android Back cancels loading, cleans up and returns to the menu');await page.unroute('**/assets/pixel/ground.png');
 check(errors.length===0,`no unexpected console/HTTP errors: ${errors.join('\n')}`);console.log(`Loading checks: ${checks.length} passed; ${captures.length} screenshots.`);
}finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors,expectedFailures,runs,captures},null,2));await browser.close();await server.close();}
