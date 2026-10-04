import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve(process.env.SYJ_HUD_OUTPUT||'docs/v0.6/previews/prompt02');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const url=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:568,height:320},deviceScaleFactor:1});
const errors=[],checks=[];
const layouts=[],englishBounds=new Map();
page.on('pageerror',error=>errors.push(error.stack));
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))errors.push(`${response.status()} ${response.url()}`);});
const check=(condition,label)=>{checks.push({label,passed:!!condition});assert.ok(condition,label);};
function measureHud(){
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
 const visible=el=>!!el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
 const select=selector=>[...document.querySelectorAll(selector)].filter(visible);
 const name=el=>el.dataset.skill!==undefined?`active-${el.dataset.skill}`:el.dataset.passive!==undefined?`passive-${el.dataset.passive}`:el.dataset.innate?`innate-${el.dataset.innate}`:el.dataset.allySkill!==undefined?`ally-skill-${el.dataset.allySkill}`:el.id||el.className;
 const main=select('[data-skill],[data-passive],[data-innate],[data-attack],[data-dash],.joystick,.ally-panel,.xp-dock,#auto-indicator,.hud-currency,.bars,.hud-clock,.boss-wrap');
 const ally=select('.ally-lock,.ally-portrait,[data-ally-skill],.ally-name,.ally-rank-badge');
 const children=select('.hud-counter,.pause-btn,.ally-lock>.interface-icon,[data-ally-level]');
 const boxes=[...main,...ally,...children].map(el=>({name:name(el),r:rect(el)}));
 const overlap=[];
 for(const group of [main,ally,select('.hud-counter,.pause-btn'),select('.ally-lock>.interface-icon,[data-ally-level]')])
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
   const a=rect(group[i]),b=rect(group[j]);
   if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5)overlap.push(`${name(group[i])}/${name(group[j])}`);
  }
 const outside=boxes.filter(({r})=>r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5).map(({name})=>name);
 const panelOutside=[...ally,...children].filter(el=>{
  const parent=el.closest('.ally-panel,.hud-currency'),a=rect(el),b=rect(parent);
  return a.left<b.left-.5||a.top<b.top-.5||a.right>b.right+.5||a.bottom>b.bottom+.5;
 }).map(name);
 const buttons=select('[data-skill],[data-attack],[data-dash],[data-passive],[data-innate],#auto-indicator');
 const dash=document.querySelector('[data-dash]'),icon=dash.querySelector('.pixel-icon'),key=dash.querySelector('.key');
 const d=rect(dash),i=rect(icon),k=rect(key);
 return {boxes,outside,overlap,panelOutside,
  usable:buttons.every(el=>{const r=rect(el);return r.width>=44&&r.height>=44;}),
  ringsFilled:select('.passive-slot:not(.locked):not(.empty),.innate-slot').every(el=>{
   const r=rect(el),i=rect(el.querySelector('.passive-icon'));
   return i.width/r.width>=.70&&i.height/r.height>=.70&&getComputedStyle(el).filter!=='none';
  }),
  dashCoverage:i.width*i.height/(d.width*d.height),dashPlate:getComputedStyle(dash).backgroundImage===getComputedStyle(document.querySelector('[data-skill="0"]')).backgroundImage,
  cornerKey:k.top>=d.top&&k.top<=d.top+4&&k.left>=d.left&&k.left<=d.left+4&&k.width<d.width*.8,
  dashKey:k,dashButton:d,dashFont:{size:getComputedStyle(key).fontSize,family:getComputedStyle(key).fontFamily,spacing:getComputedStyle(key).letterSpacing},
  keyLabels:select('[data-skill] .key').map(el=>el.textContent),
  ltr:[...select('.hud,.hud .bar,.hud .bar label,.hud .key,.hud-counter b')].every(el=>getComputedStyle(el).direction==='ltr'),
  barsLtr:select('.hud .bar,.boss-bar').every(el=>Math.abs(rect(el.querySelector('span')).left-(rect(el).left+parseFloat(getComputedStyle(el).borderLeftWidth)))<.5),
  lockText:document.querySelector('[data-ally-level]').textContent,
  question:document.querySelector('[data-support]').textContent.includes('?'),
  lockOverflow:document.querySelector('[data-ally-level]').scrollWidth>document.querySelector('[data-ally-level]').clientWidth,
  dir:document.documentElement.dir};
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('attackMode','manual');app.lastSelection.heroId='ixchel';app.startRun();});
 await page.locator('.hud').waitFor();
 await page.evaluate(()=>{const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');scene.invulnerable=10000;scene.spawnTimer=10000;scene.stats.xp=scene.stats.nextXp;scene.checkLevelUp();});
 await page.locator('.choice-card[data-kind="active"]').first().click();
 await page.locator('[data-skill="0"]').click();
 check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').skillSlots[0]?.remaining>0),'real level-up card equips an active and its HUD button casts');
 check(await page.locator('[data-skill="3"]').isDisabled()&&await page.locator('[data-passive="1"].locked').count()===1,'real early run reserves both future locked slots');
 await page.evaluate(()=>{const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');scene.scene.pause();window.hudCasts=0;scene.hud.callbacks.skill=()=>{window.hudCasts+=1;};});
 for(const locale of ['en','ar'])for(const [width,height]of [[568,320],[800,360],[1280,720],[320,568]])for(const allyLocked of [true,false])for(const locked of [true,false]){
  await page.setViewportSize({width,height});
  await page.mouse.move(width/2,height/2);
  await page.evaluate(async({locale,locked,allyLocked})=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
   const {Hud}=await import('/src/systems/Hud.js');const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
   window.supportOpens=0;window.hudCasts=0;scene.hud.destroy();scene.hud=new Hud(document.querySelector('#ui-root'),{attackMode:'manual'},{skill:()=>window.hudCasts++,attack:()=>{},dash:()=>{},pause:()=>{},support:()=>window.supportOpens++});scene.hud.setHero(scene.heroData);
   const {applyHudFixture}=await import('/tests/fixtures/skill-hud.js');applyHudFixture(scene.hud,scene.heroData.skills,locked);
   if(allyLocked)scene.hud.setAlly(null);
   scene.hud.setBoss('Vucub Caquix, the False Sun',.65);
   scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());await document.fonts.ready;
  },{locale,locked,allyLocked});
  await page.waitForTimeout(120);
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.hideTooltip());
  const key=`${width}x${height}-ally-${allyLocked?'locked':'unlocked'}-slots-${locked?'locked':'unlocked'}`;
  const name=`${locale}-${key}`;
  const layout=await page.evaluate(measureHud);layouts.push({name,...layout});
  await page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'});
  check(layout.outside.length===0,`${name}: all HUD elements inside screen ${JSON.stringify(layout.outside)}`);
  check(layout.overlap.length===0&&layout.panelOutside.length===0,`${name}: independent HUD controls and panel children do not overlap/escape ${JSON.stringify({overlap:layout.overlap,panelOutside:layout.panelOutside})}`);
  check(layout.usable&&layout.keyLabels.join('')==='QERT',`${name}: all action/passive/innate targets are at least 44 px; QERT labels visible`);
  check(layout.ringsFilled,`${name}: passive and innate art fills the ring and has contrast edging`);
  check(layout.dashCoverage>=.70&&layout.dashPlate&&layout.cornerKey,`${name}: Dash art fills at least 70% of its gold skill plate; SPACE is a corner tag`);
  check(layout.ltr&&layout.barsLtr,`${name}: HUD geometry, fills, digits and keys stay LTR`);
  check(layout.dir===(locale==='ar'?'rtl':'ltr'),`${name}: locale direction`);
  check(await page.locator('[data-skill="3"]').isDisabled()===locked&&await page.locator('[data-passive="1"].locked').count()===(locked?1:0),`${name}: active/passive lock state`);
  check(await page.locator('[data-ally-lock]').isVisible()===allyLocked&&!layout.question&&!layout.lockOverflow&&layout.lockText.includes('5'),`${name}: clear ally lock, contained Lv 5, no question mark`);
  check(await page.locator('.combat-status').count()===0&&await page.locator('#auto-indicator').count()===1,`${name}: text block replaced by separate mode indicator`);
  const positions=layout.boxes.map(({name,r})=>({name,x:r.x,y:r.y,width:r.width,height:r.height}));
  if(locale==='en')englishBounds.set(key,positions);
  else check(JSON.stringify(positions)===JSON.stringify(englishBounds.get(key)),`${name}: HUD and panel child rectangles exactly match English`);
  if(locked){await page.locator('[data-skill="3"]').dispatchEvent('pointerdown');check(await page.evaluate(()=>window.hudCasts)===0,`${name}: locked slot cannot cast`);}
  check(await page.locator('.passive-counter-label').innerText()==='7/12',`${name}: passive kill counter`);
  await page.locator('[data-passive="0"]').click();
  check(await page.locator('.skill-tooltip').isVisible()&&await page.evaluate(()=>window.hudCasts)===0,`${name}: passive tap shows tooltip without casting`);
  check(await page.locator('.skill-tooltip').getAttribute('dir')===(locale==='ar'?'rtl':'ltr'),`${name}: tooltip text follows locale direction`);
  await page.locator('#auto-indicator').click();check(await page.locator('.skill-tooltip').isVisible()&&await page.evaluate(()=>window.hudCasts)===0,`${name}: mode indicator is tooltip-only`);
 }
 // Stateful presentation and unlock events remain display-only fixtures.
 await page.locator('[data-innate="jade-bounty"]').hover();check(await page.locator('.skill-tooltip').isVisible()&&await page.evaluate(()=>window.hudCasts)===0,'innate trait tooltip does not cast');
 await page.locator('[data-skill="0"]').click();check(await page.evaluate(()=>window.hudCasts)===1,'active button preserves its cast callback');
 await page.evaluate(async()=>{const {PASSIVE_FIXTURES}=await import('/tests/fixtures/skill-hud.js');const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;hud.setPassives([PASSIVE_FIXTURES.stacks,PASSIVE_FIXTURES.timer],2);hud.hideTooltip();});
 check(await page.locator('.passive-stacks i.filled').count()===3&&await page.locator('.passive-timer.is-ready').count()===1,'stack pips and ready timer render');
 check(await page.locator('.ally-skill').count()===3&&await page.locator('.ally-skill button').count()===0,'three automatic ally slots render without cast buttons');
 const rankBadgeSrc=await page.locator('[data-ally-rank]').getAttribute('src');
 check(await page.locator('.ally-skill.passive').count()===1&&await page.locator('[data-ally-rank]').isVisible()&&rankBadgeSrc?.includes('rank-badge-2.png'),'ally passive uses its jade frame and the rank badge is shown');
 await page.locator('.hud-counter').first().click();check(await page.locator('.skill-tooltip').isVisible()&&await page.locator('.hud-counter [data-icon="cacao"]').count()===1,'cacao pouch has a touch tooltip');
 await page.locator('.hud-counter').nth(1).click();check(await page.locator('.skill-tooltip').isVisible()&&await page.locator('.hud-counter [data-icon="kills"]').count()===1,'skull kill counter has a touch tooltip');
 await page.evaluate(()=>{
  const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;
  hud.setStats({hp:80,maxHp:105,mana:73,maxMana:110,stamina:.85,xp:12,nextXp:40,level:20,elapsed:45,duration:600,cacao:999999,kills:123456});
 });
 check(await page.locator('.hud-counter b').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth&&/^[0-9]+$/.test(node.textContent))),'large cacao/kill totals fit their counters with Western digits');
 await page.evaluate(()=>{const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;hud.hideTooltip();hud.setAttackMode('auto');});
 check(await page.locator('[data-attack]').isHidden()&&await page.locator('#auto-indicator').getAttribute('data-mode')==='auto','auto mode indicator reflects automatic attacks');
 const autoLayout=await page.evaluate(measureHud);check(autoLayout.overlap.length===0&&autoLayout.outside.length===0,'automatic mode remains within the HUD without overlap');
 await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.setAttackMode('manual'));
 await page.locator('.ally-panel').click({position:{x:140,y:7}});check(await page.evaluate(()=>window.supportOpens)===1,'tapping the ally panel opens its read-only loadout');
 const before=await page.locator('[data-skill="3"]').boundingBox();
 await page.evaluate(()=>{const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;hud.setSkills([],3);});
 assert.deepEqual(await page.locator('[data-skill="3"]').boundingBox(),before);
 await page.evaluate(()=>{const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;hud.setSkills([],4);hud.showUnlock('active');});
 assert.deepEqual(await page.locator('[data-skill="3"]').boundingBox(),before);
 check(await page.locator('.slot-unlock-burst').count()===1&&await page.locator('.milestone-banner').count()===1,'unlock keeps slot position and shows burst/banner');
 await page.waitForTimeout(1550);check(await page.locator('.milestone-banner').count()===0,'unlock banner clears after 1.5 seconds');
 await page.evaluate(()=>{const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;hud.showChoice('Level 20',[{id:'a',name:'Active',kind:'active',art:1,description:'Active skill'},{id:'p',name:'Passive',kind:'passive',art:4,description:'Passive skill'},{id:'s',name:'Stat',kind:'stat',art:63,description:'Stat bonus'},{id:'ally',name:'Saintess',kind:'ally',supportPortrait:'saintess',description:'Heals, shields, and buffs your hero.'}],()=>{});});
 check(await page.locator('.skill-ribbon').count()===4&&await page.locator('.skill-ribbon').evaluateAll(nodes=>nodes.every(node=>node.textContent.trim().length>0)),'draft cards carry text ribbons for every kind');
 await page.screenshot({path:path.join(output,'ar-cards-320x568.png'),animations:'disabled'});
 check(errors.length===0,`no runtime or missing-asset errors: ${errors.join(', ')}`);
 console.log(`HUD screenshot checks: ${checks.length} passed; ${layouts.length} layout screenshots saved (24 required plus 8 portrait).`);
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors,layouts},null,2));
 await browser.close();await server.close();
}
