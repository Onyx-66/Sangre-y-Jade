import {chromium} from 'playwright-core';
import {SUPPORTS} from '../src/data/supports.js';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(v,label)=>{checks.push({label,passed:!!v});if(!v)throw Error(label);};
async function start(id,skills){
 await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__;a.cancelPrologue?.();a.save.setSetting('attackMode','manual');a.startRun();});await page.locator('.hud').waitFor();
 await page.evaluate(({id,skills})=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=5;s.stats.nextXp=100000;s.stats.crit=0;s.invulnerable=0;s.spawnTimer=10000;s.enemies.clear(true,true);s.support.summon(id);for(const skill of skills)s.support.equip(skill);s.pauseForSelection();},{id,skills:SUPPORTS[id].skills.filter(k=>skills.includes(k.id))});
}
try{
 await page.goto('http://127.0.0.1:4173/?qa=support-combat',{waitUntil:'networkidle'});
 await start('saintess',['valor','renewal-song','focus']);
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),before=s.support.modifiers();s.support.syncLevel(8);const after=s.support.modifiers();return before.damage>1&&after.damage>before.damage&&after.regen>before.regen&&after.haste>before.haste;}),'Saintess damage, regen and haste scale with rank');
 await start('tank',['guard','bomb','intercept']);
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.armor=0;s.stats.shield=0;s.stats.hp=100;s.damagePlayer(20,s.player.x+100,s.player.y);return s.stats.hp>80;}),'Tank Bodyguard reduces actual incoming damage');
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),a=s.companion;s.spawnEnemyProjectile(a.sprite.x,a.sprite.y,0,0,20);const before=s.enemyProjectiles.countActive();s.support.clearShots(a.sprite,90);return before>0&&s.enemyProjectiles.countActive()===0;}),'Tank shield destroys hostile projectiles');
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.support.placeTrap('bomb',1);const trap=s.support.traps[0];trap.armed=0;s.spawnEnemy('jaguar',100);const e=s.enemies.getChildren().find(e=>e.active);e.setPosition(trap.sprite.x,trap.sprite.y);e.setData({hp:1000,maxHp:1000});s.support.updateTraps(.1);return e.getData('hp')<1000&&s.support.traps.length===0;}),'Tank proximity bomb triggers, damages and removes itself');
 await start('assassin',['ambush','mark','venom']);
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.spawnEnemy('shade',80);s.spawnEnemy('jaguar',180);const [weak,strong]=s.enemies.getChildren().filter(e=>e.active);weak.setData({damage:1,hp:1000,maxHp:1000});strong.setData({damage:60,hp:1000,maxHp:1000});s.pausedForChoice=false;s.support.update(.5);s.pauseForSelection();return s.companion.target===strong&&strong.getData('hp')<1000&&weak.getData('hp')===1000;}),'Assassin attacks the higher-damage threat, not the nearest enemy');
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),e=s.companion.target;const before=e.getData('hp');s.support.updateEnemy(e,1);return e.getData('hp')<before&&e.getData('markUntil')>s.elapsed;}),'Assassin poison ticks and the damage mark persists');
 // Multiple levels earned at once must resolve every draft without unpausing between screens.
 await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__;a.startRun();});await page.locator('.hud').waitFor();
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.invulnerable=1000;s.stats.level=4;s.stats.nextXp=1;s.stats.xp=300;s.checkLevelUp();});
 let steps=0;while(await page.locator('.modal-backdrop').count()&&steps++<30){const keep=page.locator('[data-choice-cancel]');if(await keep.count())await keep.click();else await page.locator('.choice-card').first().click();}
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.stats.level>=7&&s.pendingLevelUps===0&&s.companion.skills.length===3&&s.companion.level===s.stats.level-4&&!s.pausedForChoice;}),'Multi-level XP gain resolves support recruitment and all queued drafts');
 // Every replacement and support modal must fit the smallest tested phones too.
 for(const locale of ['en','fr','ar'])for(const [w,h]of [[320,568],[568,320],[390,844]]){
  await page.setViewportSize({width:w,height:h});
  await page.evaluate(({locale})=>{const a=window.__SANGRE_Y_JADE__;a.showTitle();a.uiRoot.querySelector('[data-language]').value=locale;a.uiRoot.querySelector('[data-language]').dispatchEvent(new Event('change'));a.startRun();},{locale});await page.locator('.hud').waitFor();
  await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.pauseForSelection();s.support.chooseClass(()=>{});});
  const fit=()=>page.evaluate(()=>[...document.querySelectorAll('.modal,.modal .choice-card')].every(e=>e.scrollWidth<=e.clientWidth+2&&e.scrollHeight<=e.clientHeight+2));
  await page.evaluate(()=>document.fonts.ready);check(await fit(),`${locale} ${w}: support recruitment fits`);
  await page.screenshot({path:`artifacts/v0.5/support-${locale}-${w}.png`});
  await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.hud.el.querySelector('.modal-backdrop').remove();s.skillSlots=s.heroData.skills.slice(0,4).map(k=>({...k,level:3}));s.applyChoice({...s.heroData.skills[4],choiceType:'replace-skill'});});
  check(await fit(),`${locale} ${w}: four-slot replacement fits`);await page.screenshot({path:`artifacts/v0.5/replace-${locale}-${w}.png`});
 }
 check(errors.length===0,'Combat and modal regression checks have no runtime errors');
}finally{writeFileSync('artifacts/v0.5/combat.json',JSON.stringify({checks,errors},null,2));await browser.close();console.log(JSON.stringify({checks,errors},null,2));}
