import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer, preview } from 'vite';
import { chromium } from 'playwright-core';

// All requests stay local, including the production Android-origin test.
const native=process.argv.includes('--native');
const output=path.resolve(process.env.SYJ_SETTINGS_OUTPUT||'docs/v0.6/previews/prompt03');
await fs.mkdir(output,{recursive:true});
const server=native?await preview({preview:{host:'127.0.0.1',port:0},logLevel:'error'})
 :await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
if(!native)await server.listen();
const local=`http://127.0.0.1:${server.httpServer.address().port}`;
const url=native?'https://appassets.androidplatform.net':local;
const java=await fs.readFile('android/app/src/main/java/com/sangreyjade/game/MainActivity.java','utf8');
const backSource=java.match(/private void handleBack\(\)\{web\.evaluateJavascript\(("(?:[^"\\]|\\.)*")/);
assert.ok(backSource,'read the actual Android Back hook, not a test-only replacement');
const androidBack=JSON.parse(backSource[1]);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
 args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:568,height:320},deviceScaleFactor:1,hasTouch:true,serviceWorkers:'block'});
await context.addInitScript(()=>localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2})));
if(native)await context.route('**/*',async route=>{
 const request=new URL(route.request().url());
 if(request.origin===url){
  const response=await route.fetch({url:`${local}${request.pathname}${request.search}`});
  await route.fulfill({response});
 }else await route.abort();
});
const page=await context.newPage(),checks=[],errors=[],layouts=[],geometry=new Map();
page.on('pageerror',error=>errors.push(error.stack));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
const check=(condition,label)=>{checks.push({label,passed:!!condition});assert.ok(condition,label);};
const screenshot=async name=>page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'});
const back=()=>page.evaluate(androidBack);

function settingsGeometry(){
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const contained=(a,b)=>a.x>=b.x-.5&&a.y>=b.y-.5&&a.right<=b.right+.5&&a.bottom<=b.bottom+.5;
 const rows=[...document.querySelectorAll('.settings-panel [data-toggle]')].filter(button=>button.offsetWidth>0&&button.offsetHeight>0).map(button=>{
  const track=button.querySelector('.toggle-track'),knob=button.querySelector('.toggle-knob'),word=button.querySelector('.toggle-word');
  const label=button.closest('.settings-row').querySelector('label');
  const b=rect(button),r=rect(track),k=rect(knob),w=rect(word),l=rect(label);
  return {id:button.dataset.toggle,state:button.dataset.state,checked:button.getAttribute('aria-checked'),word:word.textContent,
   mark:button.querySelector('.toggle-symbol').textContent,color:getComputedStyle(track).backgroundColor,
   knobInside:contained(k,r),wordFits:word.scrollWidth<=word.clientWidth,
   rowOrder:document.documentElement.dir==='rtl'?l.x>=b.right-.5:l.right<=b.x+.5,
   fixed:b.width===136&&b.height===44&&r.width===60&&r.height===32,
   internalDirection:getComputedStyle(button).direction,
   relative:[r.x-b.x,r.y-b.y,r.width,r.height,k.x-r.x,k.y-r.y,k.width,k.height,w.x-b.x,w.y-b.y,w.width,w.height]};
 });
 const panel=document.querySelector('.settings-panel'),p=rect(panel),close=rect(panel.querySelector('[data-back]'));
 return {rows,panel:p,close,dir:panel.dir,
  closeVisible:contained(close,p)&&close.x>=0&&close.y>=0&&close.right<=innerWidth&&close.bottom<=innerHeight,
  inside:p.x>=-.5&&p.y>=-.5&&p.right<=innerWidth+.5&&p.bottom<=innerHeight+.5,
  controls:[...panel.querySelectorAll('[data-setting-row]')].map(row=>({key:row.dataset.settingRow,type:row.querySelector('input,select,button').type,tag:row.querySelector('input,select,button').tagName}))};
}
function pauseGeometry(){
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const buttons=[...document.querySelectorAll('.pause-menu .pause-actions button')].map(el=>({key:Object.keys(el.dataset)[0],text:el.textContent,r:rect(el)}));
 const overlaps=[];
 for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){
  const a=buttons[i].r,b=buttons[j].r;
  if(Math.min(a.right,b.right)>Math.max(a.x,b.x)+.5&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+.5)overlaps.push(`${buttons[i].key}/${buttons[j].key}`);
 }
 return {buttons,overlaps,dir:document.querySelector('.pause-menu').dir,quitColor:getComputedStyle(document.querySelector('.pause-menu [data-exit]')).color,
  inside:buttons.every(({r})=>r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight),
  touch:buttons.every(({r})=>r.width>=44&&r.height>=44)};
}
const frozen=()=>page.evaluate(()=>{
 const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
 return scene.pausedForChoice&&scene.time.paused&&scene.physics.world.isPaused;
});
const closeState=()=>page.evaluate(()=>({
 game:window.__SANGRE_Y_JADE__.game===window.settingsTestGame,
 elapsed:window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').elapsed,
 x:window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.x,
 y:window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.y,
}));

try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 if(native){
  check(await page.evaluate(()=>!location.search&&location.hostname==='appassets.androidplatform.net'),'production native bridge is available without a debug query');
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.startRun());
  await page.locator('.hud').waitFor();
  await page.locator('.pause-btn').click();await page.locator('[data-settings]').click();
  check(await frozen(),'production Settings opens over a paused run');
  await screenshot('native-settings-568x320');
  await back();check(await page.locator('.pause-menu').isVisible()&&await frozen(),'actual native Back closes production Settings without resuming');
  await screenshot('native-pause-568x320');
  await back();check(await page.locator('.modal-backdrop').count()===0&&!await frozen(),'native Back from production pause resumes');
  const plain=await browser.newPage();await plain.goto(local,{waitUntil:'networkidle'});
  check(await plain.evaluate(()=>!window.__SANGRE_Y_JADE__),'ordinary production web page remains debug-gated');await plain.close();
 }else{
  const words={en:['Off','On'],fr:['Désactivé','Activé'],ar:['متوقف','مفعل']};
  for(const locale of ['en','fr','ar'])for(const [width,height]of [[568,320],[320,568],[1280,720]])for(const on of [false,true]){
   await page.setViewportSize({width,height});
   await page.evaluate(async({locale,on})=>{
    const app=window.__SANGRE_Y_JADE__,{setLanguage}=await import('/src/i18n/index.js');
    app.save.setSetting('language',locale);setLanguage(locale);
    for(const key of ['screenShake','damageNumbers','reducedMotion','telegraphHighContrast','voiceEnabled'])app.save.setSetting(key,on);
    document.documentElement.classList.toggle('reduce-motion',on);app.showSettings();await document.fonts.ready;
   },{locale,on});
   const name=`${locale}-settings-${width}x${height}-${on?'on':'off'}`,layout=await page.evaluate(settingsGeometry);
   layouts.push({name,...layout});
   check(layout.rows.length===4&&layout.controls.length===16,`${name}: four visible shared toggles and all sixteen settings are present`);
   check(layout.rows.every(row=>row.knobInside&&row.fixed&&row.internalDirection==='ltr'),`${name}: every visible knob inside its fixed track`);
   check(layout.rows.every(row=>row.rowOrder&&row.wordFits),`${name}: row label/control order and unclipped localized word`);
   check(layout.rows.every(row=>row.checked===String(on)&&row.mark===(on?'✓':'×')&&row.word===words[locale][Number(on)]&&row.color===(on?'rgb(22, 128, 103)':'rgb(98, 95, 107)')),`${name}: readable on/off state with mark, word and color`);
   check(layout.inside&&layout.closeVisible,`${name}: panel and close button remain on screen`);
   const key=`${width}x${height}-${on}`,relative=layout.rows.map(row=>row.relative);
   if(locale==='en')geometry.set(key,relative);
   else check(JSON.stringify(relative)===JSON.stringify(geometry.get(key)),`${name}: internal geometry identical to English`);
   await page.locator('[data-settings-tab="audio"]').click();
   const voiceToggle=await page.locator('[data-toggle="voiceEnabled"]').evaluate(button=>{
    const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const track=rect(button.querySelector('.toggle-track')),knob=rect(button.querySelector('.toggle-knob'));
    return{inside:knob.x>=track.x&&knob.y>=track.y&&knob.right<=track.right&&knob.bottom<=track.bottom,
     fixed:button.getBoundingClientRect().width===136&&track.width===60&&track.height===32};
   });
   check(voiceToggle.inside&&voiceToggle.fixed,`${name}: audio-tab voice switch shares fixed, contained toggle geometry`);
   await page.locator('[data-settings-tab="general"]').click();
   // Scroll only the controls region, including the new warning toggle.
   await page.locator('[data-toggle="telegraphHighContrast"]').scrollIntoViewIfNeeded();
   await screenshot(name);
  }
  for(const locale of ['en','fr','ar']){
   await page.setViewportSize({width:568,height:320});
   await page.evaluate(async locale=>{
    const app=window.__SANGRE_Y_JADE__,{setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
    const values={language:locale,attackMode:'auto',fps:60,particles:'high',screenShake:true,damageNumbers:true,reducedMotion:false,autoAim:true,master:.82,music:.58,sfx:.78,enemyHealthBars:'damaged',telegraphHighContrast:false};
    for(const [key,value]of Object.entries(values))app.save.setSetting(key,value);
    document.documentElement.classList.remove('reduce-motion');app.showSettings();await document.fonts.ready;
   },locale);
   const mainControls=(await page.evaluate(settingsGeometry)).controls;
   await page.locator('.settings-panel [data-back]').click();
   await page.evaluate(()=>window.__SANGRE_Y_JADE__.startRun());await page.locator('.hud').waitFor();
   await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__,scene=app.game.scene.getScene('Ritual');window.settingsTestGame=app.game;scene.invulnerable=10000;scene.spawnTimer=10000;});
   await page.locator('.pause-btn').click();
   const layout=await page.evaluate(pauseGeometry);layouts.push({name:`${locale}-pause`,...layout});
   const [resume,settings,skills,help,quit]=layout.buttons;
   check(layout.buttons.length===5&&layout.buttons.map(b=>b.key).join(',')==='resume,settings,skills,help,exit',`${locale}: pause includes the requested five entries`);
   check(resume.r.y===settings.r.y&&skills.r.y>=resume.r.bottom&&help.r.y>=skills.r.bottom&&quit.r.y>=help.r.bottom,`${locale}: Resume/Settings first row, other entries below`);
   check(layout.inside&&layout.touch&&layout.overlaps.length===0,`${locale}: pause fits 568x320 with separate 44 px touch targets`);
   check(layout.quitColor==='rgb(255, 241, 206)',`${locale}: Quit label is readable on its dark red button`);
   check(layout.dir===(locale==='ar'?'rtl':'ltr'),`${locale}: pause menu direction follows the locale`);
   await screenshot(`${locale}-pause-568x320`);
   await page.locator('[data-settings]').click();
   check(await frozen(),`${locale}: settings does not resume the paused game`);
   const pausedState=await closeState();await page.waitForTimeout(350);
   check(JSON.stringify(await closeState())===JSON.stringify(pausedState),`${locale}: run identity, timer and player remain frozen`);
   check(JSON.stringify((await page.evaluate(settingsGeometry)).controls)===JSON.stringify(mainControls),`${locale}: menu/pause settings controls are identical`);
   await page.locator('#attack-mode').selectOption('manual');
   await page.locator('#aim').selectOption('direction');
   await page.locator('#particles').selectOption('low');
   await page.locator('#enemy-health-bars').selectOption('always');
   await page.locator('[data-toggle="telegraphHighContrast"]').click();
   for(const [id,value]of [['master',.3],['music',.4],['sfx',.5]])await page.locator(`#${id}`).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await page.locator('#fps').selectOption('30');
   check(await frozen(),`${locale}: changing the frame cap does not unpause`);
   check(await page.evaluate(()=>{const loop=window.__SANGRE_Y_JADE__.game.loop;return loop.targetFps===30&&loop.fpsLimit===30&&loop.forceSetTimeOut&&loop.running;}),`${locale}: live 30 FPS limit changes the existing render loop`);
   await page.locator('#fps').selectOption('60');
   await page.locator('[data-toggle="screenShake"]').click();await page.locator('[data-toggle="damageNumbers"]').click();await page.locator('[data-toggle="reducedMotion"]').click();
   await page.waitForTimeout(200);
   const changed=await page.evaluate(()=>{
    const app=window.__SANGRE_Y_JADE__,scene=app.game.scene.getScene('Ritual'),loop=app.game.loop;
    return {save:app.save.data.settings,run:scene.settings,volumes:app.audio.volumes(),musicVolume:app.audio.current.volume,
     reduced:document.documentElement.classList.contains('reduce-motion'),enemies:scene.enemies.maxSize,projectiles:scene.projectiles.maxSize,
     fps:loop.targetFps,limit:loop.fpsLimit,mode:document.querySelector('#auto-indicator').dataset.mode};
   });
   for(const [key,value]of Object.entries({attackMode:'manual',autoAim:false,particles:'low',master:.3,music:.4,sfx:.5,fps:60,screenShake:false,damageNumbers:false,reducedMotion:true,enemyHealthBars:'always',telegraphHighContrast:true})){
    check(changed.save[key]===value&&changed.run[key]===value,`${locale}: ${key} saves and updates the run immediately`);
   }
   check(changed.reduced&&changed.mode==='manual'&&changed.enemies===90&&changed.projectiles===100&&changed.fps===60&&changed.limit===60,`${locale}: live HUD, effect budget, reduced motion and render cap`);
   check(Math.abs(changed.volumes.music-.12)<.001&&Math.abs(changed.musicVolume-.12)<.001&&Math.abs(changed.volumes.sfx-.15)<.001,`${locale}: existing music/SFX volume controls apply live`);
   check((await page.evaluate(settingsGeometry)).rows.every(row=>row.knobInside),`${locale}: toggled knobs remain inside their tracks`);
   await screenshot(`${locale}-pause-settings-568x320`);
   const toggle=page.locator('[data-toggle="screenShake"]');await toggle.focus();await page.keyboard.press('Space');
   check(await toggle.getAttribute('aria-checked')==='true',`${locale}: Space activates the switch once despite game key capture`);
   await page.keyboard.press('Enter');check(await toggle.getAttribute('aria-checked')==='false',`${locale}: Enter activates the switch once`);
   await page.locator('.pause-settings [data-back]').click();check(await page.locator('.pause-menu').isVisible()&&await frozen(),`${locale}: settings Back returns to pause`);
   await page.locator('[data-settings]').click();check(await toggle.getAttribute('aria-checked')==='false',`${locale}: saved switch value survives reopening`);
   check(await page.locator('#enemy-health-bars').inputValue()==='always'&&await page.locator('[data-toggle="telegraphHighContrast"]').getAttribute('aria-checked')==='true',`${locale}: saved health bar/warning settings survive reopening`);
   for(const value of ['off','damaged']){
    await page.locator('#enemy-health-bars').selectOption(value);
    check(await page.evaluate(value=>{const app=window.__SANGRE_Y_JADE__;return app.save.data.settings.enemyHealthBars===value&&app.game.scene.getScene('Ritual').settings.enemyHealthBars===value;},value),`${locale}: health bar mode ${value} updates the paused run`);
   }
   await back();check(await page.locator('.pause-menu').isVisible()&&await frozen(),`${locale}: actual Android hook closes settings to pause`);
   await page.locator('[data-help]').click();check(await page.locator('.pause-help').isVisible()&&await frozen(),`${locale}: How to Play opens over the paused run`);
   await back();check(await page.locator('.pause-menu').isVisible()&&await frozen(),`${locale}: Back from How to Play returns to pause`);
   await page.locator('[data-skills]').click();check(await page.locator('.skills-readonly').isVisible()&&await frozen(),`${locale}: Skills stays read-only and paused`);
   await back();check(await page.locator('.pause-menu').isVisible()&&await frozen(),`${locale}: Back from Skills returns to pause`);
   await page.locator('[data-resume]').click();await page.waitForTimeout(250);
   check(await page.locator('.modal-backdrop').count()===0&&!await frozen()&&(await closeState()).elapsed>pausedState.elapsed,`${locale}: Resume restarts the same run correctly`);
   await back();check(await page.locator('.pause-menu').isVisible()&&await frozen(),`${locale}: native Back while running opens pause`);
   await back();check(await page.locator('.modal-backdrop').count()===0&&!await frozen(),`${locale}: native Back from pause resumes`);
   await page.locator('.pause-btn').click();const runs=await page.evaluate(()=>window.__SANGRE_Y_JADE__.save.data.totalRuns);
   await page.locator('[data-exit]').click();await page.locator('[data-action="play"]').waitFor();
   check(await page.evaluate(runs=>!window.__SANGRE_Y_JADE__.game&&window.__SANGRE_Y_JADE__.save.data.totalRuns===runs+1,runs),`${locale}: Quit to Menu records the abandoned run and returns to the main menu`);
  }
 }
 check(errors.length===0,`no browser/HTTP errors: ${errors.join(', ')}`);
 console.log(`Settings ${native?'production native':'layout/navigation'} checks: ${checks.length} passed.`);
}finally{
 await fs.writeFile(path.join(output,native?'native-report.json':'report.json'),JSON.stringify({checks,errors,layouts},null,2));
 await browser.close();if(native)await new Promise(resolve=>server.httpServer.close(resolve));else await server.close();
}
