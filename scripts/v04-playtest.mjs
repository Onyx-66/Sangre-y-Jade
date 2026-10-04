import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[];
mkdirSync('artifacts/v0.4',{recursive:true});page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(`${r.status()} ${r.url()}`);});
const check=(v,name)=>{checks.push({name,passed:!!v});if(!v)throw Error(name);};
try{
 await page.goto('http://127.0.0.1:4173/?qa=04',{waitUntil:'networkidle'});await page.locator('.subtitle').waitFor();
 check(await page.locator('.cinema-image').evaluateAll(imgs=>imgs.length===6&&imgs.every(i=>i.naturalWidth>1500)),'Six independently rendered high-resolution prologue images');
 await page.locator('[data-sound]').click();await page.waitForTimeout(700);
 check(await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__.audio;return a.narration&&!a.narration.paused&&a.narration.currentTime>.2&&a.current.volume<a.narration.volume;}),'Male narration plays above ducked background music');
 await page.screenshot({path:'artifacts/v0.4/prologue.png'});await page.locator('[data-skip]').click();
 check(await page.evaluate(()=>!window.__SANGRE_Y_JADE__.audio.narration),'Skipping stops narration');
 for(const locale of ['en','fr','ar']){
  await page.selectOption('[data-language]',locale);await page.screenshot({path:`artifacts/v0.4/${locale}-title.png`});
  check(await page.locator('[data-action=settings] svg').count()===1&&await page.locator('.language-switch svg').count()===1,`${locale}: real settings and language icons`);
  if(locale==='ar'){
   check(await page.evaluate(()=>getComputedStyle(document.querySelector('.cinematic-bg'),'::before').transform.startsWith('matrix(-1')),'Arabic menu artwork is mirrored');
   check(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Noto Sans Arabic'&&f.status==='loaded')&&getComputedStyle(document.querySelector('[data-action=play]')).fontFamily.includes('Noto Sans Arabic')),'Arabic uses the bundled v0.6 font');
  }
  await page.locator('[data-action=play]').click();
  for(let step=0;step<4;step++){
   check(await page.locator('[data-setup-step]').getAttribute('data-setup-step')===String(step),`${locale}: wizard step ${step+1}`);
   check(await page.locator('[data-hero]').count()===(step===0?3:0)&&await page.locator('[data-map]').count()===(step===1?3:0)&&await page.locator('[data-mode]').count()===(step===2?2:0),`${locale}: one selection section at a time`);
   await page.screenshot({path:`artifacts/v0.4/${locale}-step-${step}.png`});if(step<3)await page.locator('[data-next]').click();
  }
  await page.locator('[data-back]').click();check(await page.locator('[data-setup-step]').getAttribute('data-setup-step')==='2',`${locale}: Back returns one step`);
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.showTitle());
 }
 await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__;a.lastSelection.heroId='ixchel';a.save.setSetting('attackMode','manual');a.startRun();});await page.locator('.hud').waitFor();await page.waitForTimeout(800);
 check(await page.locator('.vital-row:not([hidden])').count()===3,'Mage HUD shows health, stamina and magic');
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.invulnerable=100;s.spawnPickup('potion',s.player.x+140,s.player.y+25,20);s.spawnPickup('cacao',s.player.x+200,s.player.y,10);});
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.pickups.getChildren().every(p=>p.getData('bubble')?.active); }),'Pickups have animated bubble visuals');
 await page.getByRole('button',{name:'اندفاع',exact:true}).click();await page.waitForTimeout(100);
 check(await page.locator('.stamina span').evaluate(el=>parseFloat(el.style.width)<30),'Stamina bar responds to dash cooldown');
 for(const [w,h]of [[1440,900],[844,390],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(350);
  const box=await page.locator('.xp-dock').boundingBox(),joy=await page.locator('.joystick').boundingBox(),skills=await page.locator('.skills').boundingBox();
  check(box.width<w*.5&&box.y>h*.65,`${w}: compact XP bar near bottom`);
  check(w<500?box.y+box.height<skills.y:box.x>joy.x+joy.width&&box.x+box.width<skills.x,`${w}: XP bar avoids controls`);
  await page.screenshot({path:`artifacts/v0.4/hud-${w}.png`});
 }
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return new Set(s.decorGroup.getChildren().filter(i=>i.texture.key==='top-tree').map(i=>i.scaleX.toFixed(2))).size>3;}),'Trees have varied sizes in the same world');
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.xp=s.stats.nextXp;s.checkLevelUp();});await page.locator('.choice-card').first().waitFor();
 check(await page.locator('.card-icon img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth===128&&i.naturalHeight===128)),'Skill icons load as standalone 1:1 files');await page.screenshot({path:'artifacts/v0.4/ar-upgrades.png'});
 check(errors.length===0,'No runtime JavaScript errors');
}finally{writeFileSync('artifacts/v0.4/playtest.json',JSON.stringify({checks,errors},null,2));await browser.close();console.log(JSON.stringify({checks,errors},null,2));}
