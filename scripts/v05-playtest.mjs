import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),checks=[],errors=[];
mkdirSync('artifacts/v0.5',{recursive:true});
page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(`${r.status()} ${r.url()}`);});
const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
const state=fn=>page.evaluate(fn);
async function run(hero='balam'){
 await page.evaluate(hero=>{const a=window.__SANGRE_Y_JADE__;a.cancelPrologue?.();a.lastSelection.heroId=hero;a.save.setSetting('attackMode','manual');a.startRun();},hero);
 await page.locator('.hud').waitFor();await page.waitForTimeout(100);
 await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.invulnerable=10000;s.spawnTimer=10000;s.stats.nextXp=100000;});
}
try{
 await page.goto('http://127.0.0.1:4173/?qa=v05',{waitUntil:'networkidle'});
 await state(()=>{const a=window.__SANGRE_Y_JADE__;a.cancelPrologue?.();a.showTitle();});
 for(const locale of ['en','fr','ar'])for(const [w,h]of [[1280,720],[1024,600],[844,390],[667,375],[568,320],[390,844],[320,568]]){
  await page.setViewportSize({width:w,height:h});await page.selectOption('[data-language]',locale);
  await state(()=>{const a=window.__SANGRE_Y_JADE__;a.setupStep=0;a.showRunSetup();});
  for(let i=0;i<4;i++){
   await page.evaluate(()=>document.fonts.ready);
   const layout=await state(()=>{const p=document.querySelector('.wizard-panel'),screen=p.parentElement,btn=p.querySelector('[data-next],[data-start]'),r=btn.getBoundingClientRect();return {fits:[screen,p,p.querySelector('.wizard-content'),...p.querySelectorAll('.choice-card')].every(e=>e.scrollHeight<=e.clientHeight+2&&e.scrollWidth<=e.clientWidth+2),footer:r.bottom<=innerHeight&&r.top>=0,steps:document.querySelector('.setup-progress')===null};});
   if(!layout.fits||!layout.footer)await page.screenshot({path:`artifacts/v0.5/fail-${locale}-${w}-${h}-${i}.png`});
   check(layout.fits&&layout.footer&&layout.steps,`${locale} ${w}×${h}: setup ${i+1} fits without scrolling or step numbers`);
   if((w===390||w===844)&&i===0)await page.screenshot({path:`artifacts/v0.5/setup-${locale}-${w}.png`});
   if(i<3)await page.locator('[data-next]').click();
  }
  check(!/[٠-٩۰-۹]/.test(await page.locator('.screen').innerText()),`${locale} ${w}: Western digits`);
  await state(()=>window.__SANGRE_Y_JADE__.showTitle());
 }
 await page.setViewportSize({width:1280,height:720});await page.selectOption('[data-language]','en');await run();
 check(await page.locator('.skill-btn').count()===4,'Four hero active slots');
 await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.skillSlots=s.heroData.skills.slice(0,4).map(k=>({...k,level:1,remaining:0}));s.hud.setSkills(s.skillSlots);s.stats.level=4;s.pendingLevelUps=1;s.showLevelChoice();});
 const draft=await state(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').getSkillChoices(false));
 check(draft.filter(c=>c.choiceType==='skill-upgrade').length===2&&draft.filter(c=>c.choiceType==='replace-skill').length===1,'Full loadout draft: two upgrades and one replacement');
 await page.locator('.choice-card').nth(2).click();check(await page.locator('.choice-card').count()===4,'Replacement asks which equipped skill to remove');
 const old=await state(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').skillSlots.map(k=>k.id));
 await page.locator('[data-choice-cancel]').click();check(await page.locator('.choice-card').count()===3,'Cancel replacement returns to the same draft');
 await page.locator('.choice-card').nth(2).click();await page.locator('.choice-card').nth(1).click();
 check(await page.evaluate(old=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.skillSlots.length===4&&s.skillSlots[1].id!==old[1]&&s.skillSlots[1].level===1&&!s.pausedForChoice;},old),'Replacement changes one slot and resumes gameplay');
 await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=5;s.pendingLevelUps=1;s.showLevelChoice();});await page.locator('.choice-card').first().click();
 check(await page.locator('[data-choice=saintess]').count()===1&&await page.locator('[data-choice=tank]').count()===1&&await page.locator('[data-choice=assassin]').count()===1,'Level 5 offers the three distinct supports');
 await page.screenshot({path:'artifacts/v0.5/support-selection.png'});await page.locator('[data-choice=saintess]').click();
 for(let i=0;i<3;i++)await page.locator('.choice-card').first().click();
 check(await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.companion.id==='saintess'&&s.companion.skills.length===3&&s.companion.level===1&&!s.pausedForChoice;}),'Exactly one support and three equipped skills');
 check(await state(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').spawnCompanion('tank')===null),'Cannot summon a second support');
 await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=6;s.pendingLevelUps=1;s.showLevelChoice();});await page.locator('.choice-card').first().click();
 check(await state(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').companion.skills.every(k=>k.level===2)),'All equipped support skills rank up with the hero');
 await page.locator('.choice-card').first().click();await page.locator('.choice-card').first().click();
 check(await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.companion.skills.length===3&&s.companion.skills.every(k=>k.level===2)&&!s.pausedForChoice;}),'Support replacement keeps three slots and current rank');
 await state(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.hud.el.querySelector('[data-support]').click();});await page.locator('[data-choice-cancel]').click();
 for(const id of ['saintess','tank','assassin']){
  await run('ixchel');
  const result=await page.evaluate(id=>{
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=5;s.support.summon(id);
   const catalog=new Map();for(let i=0;i<100;i++)for(const k of s.support.choices())catalog.set(k.id,k);
   s.stats.hp=30;s.stats.mana=0;s.stats.shield=0;s.spawnEnemy('jaguar',100);
   const e=s.enemies.getChildren().find(e=>e.active);e.setData({hp:100000,maxHp:100000,damage:35});
   const events=[];
   for(const k of catalog.values()){
    s.companion.skills=[{...k,remaining:0,level:1}];
    if(k.cooldown&&!['rescue','bulwark'].includes(k.id)){s.support.cast(k,e,1);events.push(k.id);}
    else if(k.id==='rescue'||k.id==='bulwark'){s.stats.hp=1;s.support.preventFatal(999);events.push(k.id);}
    else{s.support.modifiers();s.support.update(.05);events.push(k.id);}
   }
   return {count:catalog.size,events,hp:s.stats.hp,shield:s.stats.shield,damage:s.stats.damageDone,finite:Number.isFinite(s.stats.hp)&&Number.isFinite(e.getData('hp'))};
  },id);
  check(result.count===10&&result.events.length===10&&result.finite,`${id}: all 10 support skills execute without invalid state`);
  if(id==='saintess')check(result.hp>1&&result.shield>0,'Saintess heals and grants shields');
  if(id==='tank')check(await state(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').support.traps.length>0),'Tank creates persistent proximity traps');
  if(id==='assassin')check(result.damage>0,'Assassin deals damage to threats');
 }
 await run();
 const pickups=await state(()=>{
  const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.hp=20;
  for(const kind of ['xp','cacao','potion'])s.spawnPickup(kind,s.player.x+10,s.player.y,10);
  s.updatePickups();const collected=s.stats.xp>0&&s.stats.cacao>0&&s.stats.hp>20;
  const prop=s.props.create(s.player.x,s.player.y,'basket');prop.setData({hp:1000});prop.refreshBody();s.updatePickups();
  return {collected,opened:!prop.active};
 });check(pickups.collected&&pickups.opened,'XP, cacao, potions and unopened containers collect without attacks');
 check(await page.locator('.pause-btn svg').count()===1&&await page.locator('.hud-counter svg').count()===2,'Pause and score counters use distinct SVG icons');
 for(const [w,h]of [[844,390],[390,844],[320,568]]){await page.setViewportSize({width:w,height:h});await page.waitForTimeout(150);await page.screenshot({path:`artifacts/v0.5/hud-${w}.png`});}
 check(errors.length===0,'No JavaScript or missing-asset errors');
}finally{writeFileSync('artifacts/v0.5/playtest.json',JSON.stringify({checks,errors},null,2));await browser.close();console.log(JSON.stringify({checks,errors},null,2));}
