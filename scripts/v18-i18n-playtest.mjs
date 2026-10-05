import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';

const output=path.resolve('docs/v0.6/previews/v18');await fs.mkdir(output,{recursive:true});
const server=await createServer({optimizeDeps:{entries:['index.html']},server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({deviceScaleFactor:1,serviceWorkers:'block'}),results=[],errors=[],hudBoxes=new Map();
await page.addInitScript(()=>localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2,settings:{attackMode:'manual'}})));
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
async function capture(name,root,locale,size){
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(70);
 const result=await page.evaluate(async selector=>{
  const root=document.querySelector(selector),failures=[];
  if(!root)return {failures:[`missing ${selector}`]};
  const {translationEntries}=await import('/src/i18n/index.js');
  const untranslated=new Set(translationEntries().filter(([en,fr,ar])=>en!==(document.documentElement.lang==='ar'?ar:fr)).map(row=>row[0]));
  const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[hidden]');
  const scrollParent=el=>{for(let p=el;p&&p!==root.parentElement;p=p.parentElement)if(/auto|scroll/.test(getComputedStyle(p).overflowY))return p;return null;};
  const scrollX=el=>{for(let p=el;p&&p!==root.parentElement;p=p.parentElement)if(/auto|scroll/.test(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth)return p;return null;};
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walk.nextNode())){
   const el=node.parentElement,text=node.textContent.trim();if(!text||!visible(el)||el.closest('option,pre,textarea,script,style,[data-no-translate]'))continue;
   if(document.documentElement.lang!=='en'&&untranslated.has(text))failures.push(`English fallback: ${text}`);
   const style=getComputedStyle(el),range=document.createRange();range.selectNodeContents(node);
   if(document.documentElement.lang==='ar'&&/[\u0600-\u06ff]/.test(text)&&!style.fontFamily.includes('Noto'))failures.push(`Arabic font: ${el.className} ${text}`);
   if(/[٠-٩۰-۹]/.test(text))failures.push(`non-Western digits: ${text}`);
   for(const box of range.getClientRects()){
    if(box.width<1||box.height<1)continue;
    const card=el.closest('.choice-card');
    if(card){const bounds=card.getBoundingClientRect();if(box.x<bounds.x-1||box.right>bounds.right+1||box.y<bounds.y-1||box.bottom>bounds.bottom+1)failures.push(`text escapes card: ${text}`);}
    // Vertical scrolling is intentional in lists; hidden clipping is not.
    if(!scrollParent(el)&&(box.y<-.6||box.bottom>innerHeight+.6))failures.push(`vertical clipping: ${text}`);
    for(let p=el;p&&root.contains(p);p=p.parentElement){
     const s=getComputedStyle(p),b=p.getBoundingClientRect();
     if(/hidden|clip/.test(s.overflowX)&&!scrollX(el)&&(box.x<b.x-1||box.right>b.right+1))failures.push(`horizontal clipping: ${text}`);
     if(/hidden|clip/.test(s.overflowY)&&!scrollParent(el)&&(box.y<b.y-1||box.bottom>b.bottom+1))failures.push(`hidden text: ${text}`);
    }
   }
  }
  if(root.scrollWidth>root.clientWidth+2)failures.push('horizontal overflow');
  const direction=getComputedStyle(root).direction;
  if(!root.matches('.hud,.boss-wrap,.boss-cinematic')&&direction!==(document.documentElement.lang==='ar'?'rtl':'ltr'))failures.push(`menu direction: ${direction}`);
  if(root.matches('.hud,.boss-wrap')&&direction!=='ltr')failures.push('mirrored HUD');
  if(root.matches('.boss-cinematic')&&getComputedStyle(root.querySelector('.boss-entry-name')).direction!==(document.documentElement.lang==='ar'?'rtl':'ltr'))failures.push('boss banner direction');
  for(const button of root.querySelectorAll('[data-toggle]'))if(visible(button)){
   const track=button.querySelector('.toggle-track').getBoundingClientRect(),knob=button.querySelector('.toggle-knob').getBoundingClientRect();
   if(knob.x<track.x||knob.right>track.right||knob.y<track.y||knob.bottom>track.bottom)failures.push('toggle knob escaped');
  }
  return {failures:[...new Set(failures)],direction,geometry:[...root.querySelectorAll('.modal,.card-grid,h2')].map(el=>{const r=el.getBoundingClientRect();return {class:el.className,text:el.matches('h2')?el.textContent:undefined,y:r.y,height:r.height,scrollTop:el.scrollTop,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};})};
 },root);
 const file=`${locale}-${size.width}x${size.height}-${name}.png`;
 await page.screenshot({path:path.join(output,file),animations:'disabled'});
 results.push({file,...result});if(result.failures.length)console.log(file,JSON.stringify(result.failures));
}
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__,null,{timeout:60000});
 for(const size of [{width:568,height:320},{width:1280,height:720}].filter(s=>!process.env.V18_WIDTH||s.width===Number(process.env.V18_WIDTH)))for(const locale of ['en','fr','ar'].filter(l=>!process.env.V18_LOCALE||l===process.env.V18_LOCALE)){
  await page.setViewportSize(size);console.log(`V18 ${locale} ${size.width}x${size.height}`);
  await page.evaluate(async locale=>{const a=window.__SANGRE_Y_JADE__,{setLanguage}=await import('/src/i18n/index.js');a.clearGame();setLanguage(locale);a.save.setSetting('language',locale);},locale);
  for(const screen of ['menu','hero','map','mode','ready','upgrades','shop','help','settings']){
   await page.evaluate(screen=>{const a=window.__SANGRE_Y_JADE__;if(['hero','map','mode','ready'].includes(screen)){a.setupStep=['hero','map','mode','ready'].indexOf(screen);a.showRunSetup();}else a[({menu:'showTitle',upgrades:'showShrine',shop:'showStore',help:'showCodex',settings:'showSettings'})[screen]]();},screen);
   await capture(screen,'.screen',locale,size);
   if(screen==='help')for(const tab of ['heroes','ritual','accessibility']){await page.locator(`[data-tab=${tab}]`).click();await page.locator('.codex-content').scrollIntoViewIfNeeded();await capture(`help-${tab}`,'.screen',locale,size);}
  }
  for(const tab of ['audio','hud']){await page.locator(`[data-settings-tab=${tab}]`).click();await capture(`settings-${tab}`,'.settings-panel',locale,size);}
  await page.evaluate(async()=>{const {LoadingScreen}=await import('/src/ui/LoadingScreen.js'),{MAPS}=await import('/src/data/world.js'),{heroList}=await import('/src/data/heroes.js');window.loadingTest=new LoadingScreen({hero:heroList()[1],map:MAPS[2],reduceMotion:true});window.loadingTest.update({percent:75,phase:'skills',label:'Preparing heroes and skills'});});
  await capture('loading','.run-loading',locale,size);
  await page.evaluate(()=>{window.loadingTest.failure([{critical:false,url:'assets/optional/very-long-file-name-to-exercise-error-line-wrapping.png'}]);});
  await capture('loading-error','.run-loading',locale,size);await page.evaluate(()=>window.loadingTest.destroy());
  await page.evaluate(async()=>{const a=window.__SANGRE_Y_JADE__;a.lastSelection.heroId='balam';await a.startRun();const s=a.game.scene.getScene('Ritual');window.localeScene=s;s.invulnerable=99999;s.spawnTimer=99999;s.pausedForChoice=true;s.time.paused=true;s.physics.world.pause();s.skillSlots=s.heroData.skills.slice(0,3).map(v=>({...v,level:1,remaining:0}));s.passiveSlots=s.heroData.passives.slice(0,1).map(v=>({...v,level:1}));s.hud.setSkills(s.skillSlots,3);s.hud.setPassives(s.passiveSlots,1);await s.hud.layoutRuntime.ready;});
  await capture('hud','.hud',locale,size);
  const boxes=await page.locator('[data-hud-element]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>{const r=n.getBoundingClientRect();return[n.dataset.hudElement,[r.x,r.y,r.width,r.height]];})));
  if(locale==='en')hudBoxes.set(size.width,boxes);else if(hudBoxes.has(size.width))for(const [id,box]of Object.entries(boxes))assert.ok(box.every((v,i)=>Math.abs(v-hudBoxes.get(size.width)[id][i])<1),`${locale}: HUD ${id} moved`);
  await page.evaluate(async()=>{const h=window.localeScene.hud,{ALLY_CATALOG}=await import('/src/data/allyCatalog.js');h.setAlly({id:'saintess',level:5,rank:5,skills:ALLY_CATALOG.saintess.slice(0,3).map(s=>({...s,remaining:0,level:5}))});h.showTooltip(h.passiveEls[0]);});
  await capture('ally-panel-tooltip','.hud',locale,size);await page.evaluate(()=>window.localeScene.hud.hideTooltip());
  for(const kind of ['passive','active']){
   await page.evaluate(kind=>{const h=window.localeScene.hud;h.showUnlock(kind);h.unlockTimers.forEach(clearTimeout);h.unlockTimers.clear();document.querySelector('.milestone-banner').style.animation='none';},kind);
   assert.ok(await page.locator('.milestone-banner').isVisible(),'unlock banner exists for layout audit');
   await capture(`unlock-${kind}`,'.hud',locale,size);
   await page.evaluate(()=>document.querySelectorAll('.milestone-banner,.slot-unlock-burst').forEach(n=>n.remove()));
  }
  for(const screen of ['pause','pause-settings','skills','help','ally','level-up','boss-reward']){
   await page.evaluate(async screen=>{const s=window.localeScene,h=s.hud;h.el.querySelectorAll('.modal-backdrop').forEach(n=>n.remove());const noop=()=>{};
    if(screen==='pause')h.showPause(noop,noop,noop,noop,noop,noop);
    if(screen==='pause-settings')h.showSettings(noop,noop,noop);
    if(screen==='skills')h.showSkills(s.getSkillLoadout(),noop);
    if(screen==='help')h.showHelp(noop);
    if(screen==='ally'){const {SUPPORTS}=await import('/src/data/supports.js');h.showChoice('Choose Your Companion',Object.values(SUPPORTS),noop,'Companion arrives at level 5');}
    if(screen==='level-up'||screen==='boss-reward')h.showChoice(screen==='level-up'?'Level 2':'Boss Defeated',s.heroData.skills.slice(2,5),noop,screen==='level-up'?'Choose an upgrade.':'Boss reward: choose a skill upgrade.',{label:'Replace a skill',action:noop},{className:'skill-pick'});
   },screen);
   await capture(screen==='help'?'pause-help':screen,'.modal-backdrop',locale,size);
  }
  await page.evaluate(()=>{const s=window.localeScene;s.hud.el.querySelectorAll('.modal-backdrop').forEach(n=>n.remove());s.showReplacement(()=>{},()=>{});});
  for(const stage of ['remove','new','confirm']){await capture(`replace-${stage}`,'.replacement-choice',locale,size);if(stage!=='confirm')await page.locator('.replacement-choice button.choice-card').first().click();}
  await page.evaluate(()=>{const s=window.localeScene;s.hud.el.querySelectorAll('.modal-backdrop').forEach(n=>n.remove());s.hud.showHudEditor(()=>{},()=>{});});
  await page.waitForFunction(()=>window.localeScene.hud.editor?.history);
  await page.locator('[data-editor-action=customize]').click();await capture('hud-editor','.hud-editor',locale,size);
  // Scroll each toolbar action into view: scrolling is allowed, inaccessible
  // offscreen controls or clipped labels are not.
  for(const action of ['undo','redo','snap','guides','preview','reset-all','export','import']){
   const control=page.locator(`[data-editor-action=${action}]`);await control.scrollIntoViewIfNeeded();
   assert.ok(await control.evaluate(el=>{const b=el.getBoundingClientRect(),p=el.closest('.hud-editor-tools').getBoundingClientRect();return b.x>=p.x-1&&b.right<=p.right+1&&el.scrollWidth<=el.clientWidth+1;}),`${locale} toolbar ${action} reachable`);
  }
  await page.locator('[data-editor-action=export]').click();await capture('hud-export','.hud-editor',locale,size);await page.locator('[data-editor-action=transfer-back]').click();
  await page.locator('[data-editor-action=import]').click();await page.locator('#hud-layout-code').fill('invalid');await page.locator('[data-editor-action=apply-import]').click();await capture('hud-import-error','.hud-editor',locale,size);
  await page.evaluate(async()=>{const s=window.localeScene;s.hud.editor.destroy();const {BossPresentation}=await import('/src/ui/BossPresentation.js'),{BOSSES}=await import('/src/data/world.js');window.bossTest=new BossPresentation(s);window.bossTest.start(BOSSES[3]);window.bossTest.update({age:2,duration:8,nameVisible:true,letterbox:1,hudOpacity:1});s.hud.setBoss(BOSSES[3].name,.6,{epithet:BOSSES[3].epithet,phase:3,hp:600,maxHp:1000});});
  await capture('boss-entry','.boss-cinematic',locale,size);await page.evaluate(()=>window.bossTest.destroy());
  await capture('boss-bar','.boss-wrap',locale,size);
  for(const victory of [false,true]){await page.evaluate(victory=>window.__SANGRE_Y_JADE__.showSummary({victory,survived:600,kills:1234,level:24,cacao:345,heroName:'Ixchel',gear:[]}),victory);await capture(victory?'victory':'defeat','.modal-backdrop',locale,size);}
 }
 assert.deepEqual(errors,[],'browser console errors');
 assert.deepEqual(results.filter(r=>r.failures.length),[],'screen translation/layout failures');
 console.log(`V18: ${results.length} localized screen captures passed.`);
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({results,errors},null,2));await browser.close();await server.close();
}
