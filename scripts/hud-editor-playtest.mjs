// Regression coverage for saved safe-area HUD editing, input and Android Back.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';

// Real local game, installed Chrome and actual Android Back hook; no downloads.
const output=path.resolve(process.env.SYJ_HUD_EDITOR_OUTPUT||'docs/v0.6/previews/v5');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:568,height:320},hasTouch:true,deviceScaleFactor:1});
await context.addInitScript(()=>localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2,settings:{attackMode:'manual'}})));
const page=await context.newPage(),checks=[],errors=[],captures=[],english=new Map();
page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const java=await fs.readFile('android/app/src/main/java/com/sangreyjade/game/MainActivity.java','utf8');
const backMatch=java.match(/private void handleBack\(\)[\s\S]*?web\.evaluateJavascript\(("(?:[^"\\]|\\.)*")/);
assert.ok(backMatch,'Android Back must expose an evaluable JS hook');
const androidBack=JSON.parse(backMatch[1]);
const check=(yes,label)=>{checks.push({label,passed:!!yes});assert.ok(yes,label);};
const scene=(fn,arg)=>page.evaluate(fn,arg);
const state=()=>scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return {paused:s.pausedForChoice&&s.time.paused&&s.physics.world.isPaused,elapsed:s.elapsed,x:s.player.x,y:s.player.y};});
const layout=()=>scene(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.layoutRuntime.layout);
const rects=()=>scene(()=>Object.fromEntries([...document.querySelectorAll('[data-hud-element]')].map(el=>{const b=el.getBoundingClientRect();return [el.dataset.hudElement,{x:b.x,y:b.y,width:b.width,height:b.height,hidden:el.hidden}];})));
const ready=()=>page.waitForFunction(()=>{const s=window.__SANGRE_Y_JADE__.game?.scene.getScene('Ritual');return s?.hud?.layoutRuntime?.wrappers.size===18;});
const open=async()=>{await page.locator('.pause-btn').click();await page.locator('.pause-menu [data-edit-hud]').click();await page.waitForFunction(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.editor?.history);};
const action=name=>page.locator(`.hud-editor-toolbar [data-editor-action="${name}"]`).click();
const select=async id=>{if(!await page.locator('.hud-editor-panel').isVisible())await page.locator('[data-editor-action=customize]').click();await page.locator('[data-editor-element]').selectOption(id);};
const screenshot=async name=>{await page.mouse.move(270,170);await page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'});captures.push(name);};
const presets=['Default','Left-handed','Minimal','Large','Compact'];
const equivalent=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-7:
 a&&b&&typeof a==='object'&&typeof b==='object'?Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>equivalent(a[k],b[k])):a===b;
async function run(locale='en'){
 await scene(async locale=>{const app=window.__SANGRE_Y_JADE__,{setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);app.save.setSetting('language',locale);app.save.setSetting('attackMode','manual');app.save.setHudLayouts({schemaVersion:1,landscape:null,portrait:null});app.lastSelection.heroId='ixchel';await app.startRun();},locale);
 await ready();await scene(async()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.invulnerable=10000;s.spawnTimer=10000;s.stats.level=s.loadoutLevel=20;s.skillSlots=s.heroData.skills.filter(x=>x.kind!=='passive').slice(0,4).map(x=>({...x,level:1,remaining:0}));s.hud.setSkills(s.skillSlots,4);s.hud.setBoss('Boss',.8);await s.hud.layoutRuntime.ready;});
}
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await run();
 check(await scene(()=>{const r=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.layoutRuntime;return [...r.nodes].every(([id,node])=>{if(node.hidden)return r.wrappers.get(id).hidden;const b=node.getBoundingClientRect(),m=r.metrics[id];return Math.abs(b.width-m.paintWidth)<.6&&Math.abs(b.height-m.paintHeight)<.6&&Math.abs(b.x-(m.x+(m.width-m.paintWidth)/2))<.6&&Math.abs(b.y-(m.y+(m.height-m.paintHeight)/2))<.6;});}),'default preserves painted CSS boxes and keeps inactive bars hidden');
 await open();check((await state()).paused,'editor freezes the real game');const frozen=await state();await page.waitForTimeout(150);check(JSON.stringify(await state())===JSON.stringify(frozen),'editor does not advance timer or movement');
 check(await scene(()=>['save','cancel'].every(key=>{const b=document.querySelector(`[data-editor-action=${key}]`).getBoundingClientRect();return b.x>=0&&b.right<=innerWidth&&b.y>=0&&b.bottom<=innerHeight;})),'Save and Cancel remain visible on a landscape phone without toolbar scrolling');
 check(await page.locator('[data-drag]').count()===18,'all 18 registered element handles including breath exist');
 await select('joystick');check(await page.locator('[data-toggle=hud-visible]').isDisabled(),'required joystick cannot be hidden');
 const before=await rects();await page.locator('[data-nudge=up]').click();const nudged=await rects();check(Math.abs(nudged.joystick.y-before.joystick.y+1)<.01,'nudge is precisely 1px with drag snapping enabled');
 await action('undo');check(Math.abs((await rects()).joystick.y-before.joystick.y)<.01,'Undo restores position');await action('redo');check(Math.abs((await rects()).joystick.y-nudged.joystick.y)<.01,'Redo restores nudge');
 await page.locator('[data-editor-action=customize]').click();
 const h=await page.locator('[data-drag=joystick]').boundingBox();await page.mouse.move(h.x+22,h.y+22);await page.mouse.down();await page.mouse.move(h.x+86,h.y-10,{steps:5});await page.mouse.up();
 const dragged=await rects();check(dragged.joystick.x>nudged.joystick.x+40&&dragged.joystick.y<nudged.joystick.y-20,'mouse drag moves the live joystick');
 await select('joystick');await page.locator('[data-toggle=hud-locked]').click();const locked=await rects();check(await page.locator('[data-nudge=right]').isDisabled(),'locked element disables nudges');await page.keyboard.press('ArrowRight');check(JSON.stringify(await rects())===JSON.stringify(locked),'locked element ignores keyboard movement');await page.locator('[data-toggle=hud-locked]').click();
 await page.keyboard.press('ArrowUp');check((await rects()).joystick.y<locked.joystick.y,'keyboard arrow nudge works');
 await select('boss-bar');check(await page.locator('[data-editor-field=opacity]').count()===0&&await page.locator('[data-toggle=hud-visible]').count()===0&&await page.locator('[data-toggle=hud-locked]').count()===0,'boss exposes position and scale only');
 await select('skill-q');await page.locator('[data-toggle=hud-group]').click();const groupBefore=await rects();await page.locator('[data-nudge=up]').click();const groupAfter=await rects();check(['q','e','r','t'].every(k=>Math.abs(groupAfter[`skill-${k}`].y-groupBefore[`skill-${k}`].y+1)<.01),'group nudge moves all four slots together');
 await action('export');const code=await page.locator('#hud-layout-code').inputValue();check(code.startsWith('SYJHUD:'),'export has a versioned/checksummed code');await page.locator('[data-editor-action=transfer-back]').click();await action('reset-all');await action('import');await page.locator('#hud-layout-code').fill(code+'x');await page.locator('[data-editor-action=apply-import]').click();check((await page.locator('.transfer-error').textContent()).length>0&&await page.locator('.hud-editor-transfer').isVisible(),'tampered import reports error without destroying draft');await page.locator('#hud-layout-code').fill(code);await page.locator('[data-editor-action=apply-import]').click();check(JSON.stringify(await rects())===JSON.stringify(groupAfter),'valid import restores live draft geometry');
 // Deliberately inject an invalid required control: Save must be blocked, not a tautology.
 await scene(()=>{const e=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.editor;e.runtime.layout.elements.pause.visible=false;e.draw();});check(await page.locator('[data-editor-action=save]').isDisabled(),'Save blocks hidden required controls with a message');await action('undo');
 await action('save');check(await page.locator('.pause-menu').isVisible()&&(await state()).paused,'Save returns to pause without resuming');const saved=await scene(()=>window.__SANGRE_Y_JADE__.save.data.hudLayouts);check(saved.landscape&&saved.portrait===null,'Save writes landscape without populating portrait');
 await page.locator('[data-edit-hud]').click();await page.waitForFunction(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.editor?.history);await action('reset-all');await action('cancel');check(JSON.stringify(await layout())===JSON.stringify(saved.landscape),'Cancel restores the saved HUD');
 await page.locator('[data-settings]').click();await page.locator('[data-settings-tab=hud]').click();await page.locator('[data-edit-hud]').click();await page.waitForFunction(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.editor?.history);await page.evaluate(androidBack);check(await page.locator('.pause-settings').isVisible()&&(await state()).paused,'actual Android Back from editor returns to paused Settings');await page.evaluate(androidBack);check(await page.locator('.pause-menu').isVisible()&&(await state()).paused,'Back from Settings returns to pause');await page.locator('[data-resume]').click();check(!(await state()).paused,'Resume restarts the same game');
 await open();await select('joystick');await page.locator('[data-nudge=up]').click();const landscape=await layout();await page.setViewportSize({width:320,height:568});await page.waitForFunction(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.editor.orientation==='portrait');await select('joystick');await page.locator('[data-nudge=up]').click();const portrait=await layout();await screenshot('en-portrait-editor');await page.setViewportSize({width:568,height:320});await page.waitForFunction(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.editor.orientation==='landscape');check(JSON.stringify(await layout())===JSON.stringify(landscape),'orientation switch restores independent landscape draft');await action('save');check(await scene(p=>JSON.stringify(window.__SANGRE_Y_JADE__.save.data.hudLayouts.portrait)===JSON.stringify(p),portrait),'portrait draft saves independently');await page.locator('[data-resume]').click();
 // Real touch controls moved away from their default locations.
 const client=await context.newCDPSession(page),touch=async(type,x,y)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:2,radiusY:2}]});
 await open();await select('joystick');await page.locator('[data-editor-action=reset-element]').click();await page.locator('[data-editor-action=customize]').click();
 const moveByTouch=async(id,dx,dy)=>{const h=await page.locator(`[data-drag=${id}]`).boundingBox();await touch('touchStart',h.x+22,h.y+22);await touch('touchMove',h.x+22+dx,h.y+22+dy);await touch('touchEnd');};
 const originalControls=await rects();await moveByTouch('joystick',56,-32);await moveByTouch('skill-q',-48,-48);
 check((await rects()).joystick.x>originalControls.joystick.x+40&&(await rects())['skill-q'].y<originalControls['skill-q'].y-30,'touch drag moves joystick and skill buttons substantially');
 await action('save');const moved=await rects();await page.locator('[data-resume]').click();
 const joy=moved.joystick,from=await state();await touch('touchStart',joy.x+joy.width/2,joy.y+joy.height/2);await touch('touchMove',joy.x+joy.width*.8,joy.y+joy.height/2);await page.waitForTimeout(350);await touch('touchEnd');check((await state()).x>from.x+5,'real moved joystick touch moves the Phaser player');
 await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');window.editorCasts=0;const original=s.castSkill.bind(s);s.castSkill=i=>{window.editorCasts++;return original(i);};s.stats.mana=s.stats.maxMana;s.skillSlots[0].remaining=0;});
 const q=moved['skill-q'];await touch('touchStart',q.x+q.width/2,q.y+q.height/2);await touch('touchEnd');check(await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return window.editorCasts===1&&s.skillSlots[0].remaining>0;}),'moved active button touch really casts the equipped skill');
 await open();await select('joystick');await page.locator('[data-joystick=mode]').selectOption('floating');
 await page.locator('[data-joystick=deadZone]').focus();await page.locator('[data-joystick=deadZone]').press('End');
 const sample=await page.locator('.joystick-sample').boundingBox();await touch('touchStart',sample.x+sample.width/2+3,sample.y+sample.height/2);check(await page.locator('[data-sample-value]').textContent()==='0.00, 0.00','sample touch respects the chosen dead zone');await touch('touchEnd');
 await action('save');await page.locator('[data-resume]').click();const pos=await rects();await touch('touchStart',100,175);const floating=await rects();check(Math.abs(floating.joystick.x-pos.joystick.x)>1,'floating joystick appears at touched arena location');await touch('touchMove',125,175);await page.waitForTimeout(120);await touch('touchEnd');check(Math.abs((await rects()).joystick.x-pos.joystick.x)<.1,'floating joystick returns to saved anchor on release');
 await open();await page.locator('[data-editor-preset]').selectOption('Left-handed');await select('joystick');await page.locator('[data-joystick=mode]').selectOption('floating');await action('save');await page.locator('[data-resume]').click();const leftHanded=await rects();await touch('touchStart',450,170);check(Math.abs((await rects()).joystick.y-leftHanded.joystick.y)>5,'left-handed floating joystick responds on the right side');await touch('touchEnd');await client.detach();
 const persisted=await layout();await scene(async()=>{const app=window.__SANGRE_Y_JADE__,{SaveSystem}=await import('/src/systems/SaveSystem.js');app.save=new SaveSystem();await app.startRun();});await ready();check(equivalent(await layout(),persisted),'saved layout reloads from storage in a new real run');
 // Two prescribed presets, both languages and sizes. All five also checked live.
 for(const locale of ['en','ar'])for(const [width,height]of [[568,320],[1280,720]]){
  await page.setViewportSize({width,height});await run(locale);await open();
  await select('joystick');await screenshot(`${locale}-customize-${width}x${height}`);
  check(await scene(()=>{const p=document.querySelector('.hud-editor-panel'),b=p.getBoundingClientRect();return b.x>=0&&b.right<=innerWidth+.5&&b.y>=0&&b.bottom<=innerHeight+.5&&p.scrollWidth<=p.clientWidth+1;}),`${locale} ${width}: editor panel fits without horizontal overflow`);
  if(locale==='ar')check((await page.locator('.hud-editor-panel').boundingBox()).x<width/2,`${locale} ${width}: panel mirrors to the left`);
  await select('clock');await page.locator('[data-toggle=hud-visible]').click();check((await rects()).clock.hidden,'optional visibility toggle updates the live HUD');await action('undo');
  await select('joystick');await page.locator('[data-editor-field=opacity]').focus();await page.locator('[data-editor-field=opacity]').press('Home');check(Math.abs((await layout()).elements.joystick.opacity-.1)<.001,'joystick can reach 10 percent opacity');await action('undo');
  await page.locator('[data-editor-field=scale]').focus();await page.locator('[data-editor-field=scale]').press('End');check(Math.abs((await layout()).elements.joystick.scale-2)<.001,'size can reach 200 percent within safe area');await action('undo');
  await page.locator('[data-editor-action=customize]').click();
  await action('preview');check(await page.locator('.hud-drag-handle').first().isHidden()&&await page.locator('.hud-editor-head').isHidden(),'Preview hides handles and controls covering the HUD');await screenshot(`${locale}-preview-${width}x${height}`);await action('preview');
  for(const preset of presets){await page.locator('[data-editor-preset]').selectOption(preset);
   const result=await scene(async()=>{const {validateLayout}=await import('/src/systems/HudLayout.js'),r=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.layoutRuntime;return validateLayout(r.layout,r.metrics,r.safe);});check(result.issues.length===0,`${locale} ${width} ${preset}: constrained 44dp controls`);
   if(!['Default','Left-handed'].includes(preset))continue;
   const name=`${locale}-${preset.toLowerCase()}-${width}x${height}`;await screenshot(name);const boxes=await rects();
   const key=`${width}-${preset}`;if(locale==='en')english.set(key,boxes);else check(Object.entries(boxes).every(([id,b])=>['x','y','width','height'].every(k=>Math.abs(b[k]-english.get(key)[id][k])<.6)),`${name}: physical HUD identical to English`);
   check(await page.locator('.hud-editor').getAttribute('dir')===(locale==='ar'?'rtl':'ltr'),`${name}: editor direction follows language`);
  }
  await action('cancel');await page.locator('[data-resume]').click();
 }
 await scene(()=>{const app=window.__SANGRE_Y_JADE__;app.showSettings();});await page.locator('[data-settings-tab=hud]').click();await page.locator('[data-edit-hud]').click();await page.waitForFunction(()=>!!document.querySelector('.hud-layout-preview [data-hud-element]'));check(await page.locator('.hud-editor').count()===1,'main-menu Settings opens the same editor with a HUD preview');await page.evaluate(androidBack);check(await page.locator('.settings-panel').isVisible()&&await page.locator('.hud-editor').count()===0&&await page.locator('.hud-layout-preview').count()===0,'Android Back cancels main-menu editor and cleans up preview');
 check(errors.length===0,`no browser or HTTP errors: ${errors.join('\n')}`);console.log(`HUD editor: ${checks.length} checks passed; ${captures.length} screenshots.`);
}finally{await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors,captures},null,2));await browser.close();await server.close();}
