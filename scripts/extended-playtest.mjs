import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.stack));
const check=(value,label)=>{checks.push({label,passed:!!value});if(!value)throw new Error(label);};
try{
  await page.goto(process.env.SYJ_URL||'http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.playPrologue(()=>window.__SANGRE_Y_JADE__.showTitle()));
  const start=Date.now();
  await page.locator('.brand-lockup').waitFor({timeout:35000});
  check(Date.now()-start>=26000 && Date.now()-start<33000,'Cinematic finishes automatically in 27 seconds');
  for(const [heroId,mapId] of [['balam','overgrown'],['ixchel','bloodmoon'],['kukul','cenote']]){
    await page.evaluate(async({heroId,mapId})=>{const a=window.__SANGRE_Y_JADE__;a.lastSelection={heroId,mapId,modeId:'quick'};await a.startRun();},{heroId,mapId});
    await page.locator('.hud').waitFor();
    await page.waitForTimeout(300);
    for(let i=0;i<20;i++){
      await page.evaluate(i=>{
        const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
        s.invulnerable=100;s.stats.mana=s.stats.maxMana;s.stats.nextXp=100000;
        s.skillSlots=[{...s.heroData.skills[i],level:2,remaining:0}];s.hud.setSkills(s.skillSlots);
        if(s.enemies.countActive()<10)for(const type of ['shade','bat','serpent','jaguar','priest'])s.spawnEnemy(type,140);
        s.castSkill(0);
      },i);
      await page.waitForTimeout(100);
    }
    check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.player.active&&Number.isFinite(s.stats.damageDone)&&s.elapsed>1;}),`${heroId}: all 20 abilities execute on ${mapId}`);
    await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.togglePause();});
    const time=await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').elapsed);
    await page.waitForTimeout(700);
    check(await page.evaluate(t=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.elapsed===t&&s.time.paused&&s.tweens.paused;},time),`${heroId}: pause freezes delayed combat effects`);
    await page.getByRole('button',{name:'Resume',exact:true}).click();
  }
  check(errors.length===0,'All hero/map/ability combinations stay free of runtime errors');
}finally{writeFileSync('artifacts/extended-playtest-report.json',JSON.stringify({checks,errors},null,2));await browser.close();}
console.log(`Extended test: ${checks.length} checks passed.`);
