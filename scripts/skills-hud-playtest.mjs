import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve(process.env.SYJ_HUD_OUTPUT||'docs/skills-redesign/previews/step7');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const url=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:568,height:320},deviceScaleFactor:1});
const errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.stack));
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))errors.push(`${response.status()} ${response.url()}`);});
const check=(condition,label)=>{checks.push({label,passed:!!condition});assert.ok(condition,label);};
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
 for(const locale of ['en','ar'])for(const [width,height]of [[568,320],[320,568]])for(const locked of [true,false]){
  await page.setViewportSize({width,height});
  await page.mouse.move(width/2,height/2);
  await page.evaluate(async({locale,locked})=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
   const {Hud}=await import('/src/systems/Hud.js');const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
   scene.hud.destroy();scene.hud=new Hud(document.querySelector('#ui-root'),{attackMode:'manual'},{skill:()=>window.hudCasts++,attack:()=>{},dash:()=>{},pause:()=>{},support:()=>{}});scene.hud.setHero(scene.heroData);
   const {applyHudFixture}=await import('/tests/fixtures/skill-hud.js');applyHudFixture(scene.hud,scene.heroData.skills,locked);
   scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());await document.fonts.ready;
  },{locale,locked});
  await page.waitForTimeout(120);
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.hideTooltip());
  const name=`${locale}-${width}x${height}-${locked?'locked':'unlocked'}`;
  const layout=await page.evaluate(()=>{
   const elements=[...document.querySelectorAll('[data-skill],[data-passive],[data-innate],[data-attack],[data-dash],.joystick,.ally-panel,.xp-dock,.hud-currency,.bars,.hud-clock')];
   const boxes=elements.map(el=>({name:el.getAttribute('data-skill')??el.className,r:el.getBoundingClientRect()}));
   const outside=boxes.filter(({r})=>r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5).map(({name})=>name);
   const actions=[...document.querySelectorAll('[data-skill],[data-attack],[data-dash]')];
   const overlap=[];const controls=[...actions,document.querySelector('.joystick'),...document.querySelectorAll('[data-passive],.xp-dock')];
   for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlap.push(`${controls[i].className}/${controls[j].className}`);}
   return {outside,overlap,usable:actions.every(el=>{const r=el.getBoundingClientRect();return r.width>=42&&r.height>=42;}),keyLabels:[...document.querySelectorAll('[data-skill] .key')].map(el=>({text:el.textContent,visible:getComputedStyle(el).display!=='none'})),dir:document.documentElement.dir};
  });
  await page.screenshot({path:path.join(output,`${name}.png`),animations:'disabled'});
  check(layout.outside.length===0,`${name}: all HUD elements inside screen ${JSON.stringify(layout.outside)}`);
  check(layout.overlap.length===0,`${name}: combat controls do not overlap ${JSON.stringify(layout.overlap)}`);
  check(layout.usable&&layout.keyLabels.every(key=>key.visible)&&layout.keyLabels.map(key=>key.text).join('')==='QERT',`${name}: six usable actions and visible QERT labels`);
  check(layout.dir===(locale==='ar'?'rtl':'ltr'),`${name}: locale direction`);
  check(await page.locator('[data-skill="3"]').isDisabled()===locked&&await page.locator('[data-passive="1"].locked').count()===(locked?1:0),`${name}: active/passive lock state`);
  if(locked){await page.locator('[data-skill="3"]').dispatchEvent('pointerdown');check(await page.evaluate(()=>window.hudCasts)===0,`${name}: locked slot cannot cast`);}
  check(await page.locator('.passive-counter-label').innerText()==='7/12',`${name}: passive kill counter`);
  await page.locator('[data-passive="0"]').click();
  check(await page.locator('.skill-tooltip').isVisible()&&await page.evaluate(()=>window.hudCasts)===0,`${name}: passive tap shows tooltip without casting`);
 }
 // Stateful presentation and unlock events remain display-only fixtures.
 await page.locator('[data-innate="jade-bounty"]').hover();check(await page.locator('.skill-tooltip').isVisible()&&await page.evaluate(()=>window.hudCasts)===0,'innate trait tooltip does not cast');
 await page.locator('[data-skill="0"]').click();check(await page.evaluate(()=>window.hudCasts)===1,'active button preserves its cast callback');
 await page.evaluate(async()=>{const {PASSIVE_FIXTURES}=await import('/tests/fixtures/skill-hud.js');const hud=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud;hud.setPassives([PASSIVE_FIXTURES.stacks,PASSIVE_FIXTURES.timer],2);hud.hideTooltip();});
 check(await page.locator('.passive-stacks i.filled').count()===3&&await page.locator('.passive-timer.is-ready').count()===1,'stack pips and ready timer render');
 check(await page.locator('.ally-skill').count()===3&&await page.locator('.ally-skill button').count()===0,'three automatic ally slots render without cast buttons');
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
 console.log(`HUD screenshot checks: ${checks.length} passed; 8 required layout screenshots saved.`);
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors},null,2));
 await browser.close();await server.close();
}
