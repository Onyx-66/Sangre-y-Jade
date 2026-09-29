import {chromium} from 'playwright-core';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const adb='C:/Users/kossa/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const call=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{encoding:'utf8'}).trim();
call('forward','tcp:9223',`localabstract:webview_devtools_remote_${call('shell','pidof','com.sangreyjade.game')}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223'),context=browser.contexts()[0],page=context.pages()[0],checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(v,name)=>{checks.push({name,passed:!!v});if(!v)throw Error(name);};
try{
 await page.evaluate(()=>window.__SANGRE_Y_JADE__.showTitle());await page.selectOption('[data-language]','fr');
 check(await page.locator('[data-action=play]').innerText()==='Jouer','APK French menus');
 await page.selectOption('[data-language]','ar');check(await page.locator('html').getAttribute('dir')==='rtl','APK Arabic RTL');
 await page.locator('[data-action=play]').click();await page.locator('[data-hero=balam]').click();await page.selectOption('#run-attack','manual');await page.locator('[data-start]').click();await page.locator('.hud').waitFor();await page.waitForTimeout(600);
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.invulnerable=100;s.stats.nextXp=100000;s.testAttacks=0;const a=s.autoAttack.bind(s);s.autoAttack=()=>{s.testAttacks++;a();};});await page.waitForTimeout(500);
 check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').testAttacks===0),'APK manual attacks wait for input');
 const cdp=await context.newCDPSession(page),attack=await page.locator('[data-attack]').boundingBox();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:attack.x+attack.width/2,y:attack.y+attack.height/2}]});await page.waitForTimeout(800);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').testAttacks>0),'APK touch Attack fires');
 const joy=await page.locator('.joystick').boundingBox();
 for(const [fraction,dir] of [[.18,'up'],[.82,'down']]){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width/2,y:joy.y+joy.height*fraction}]});await page.waitForTimeout(650);
  check(await page.evaluate(dir=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.texture.key===`hero-balam-${dir}`,dir),`APK ${dir} directional sprite`);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=4;s.stats.xp=s.stats.nextXp;s.checkLevelUp();});await page.locator('.choice-card').first().click();
 check((await page.locator('[data-ally]').innerText()).includes('كوكول'),'APK level-5 teammate and Arabic HUD');
 await page.waitForTimeout(1200);call('shell','screencap','-p','/sdcard/syj-v03.png');call('pull','/sdcard/syj-v03.png',resolve('artifacts/v0.3/android-ar-gameplay.png'));
 await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').togglePause());check(await page.locator('.modal h2').innerText()==='إيقاف مؤقت','APK pause translation');
 check(errors.length===0,'APK v0.3 no JavaScript errors');
}finally{writeFileSync('artifacts/v0.3/android-smoke.json',JSON.stringify({checks,errors},null,2));await browser.close();console.log(JSON.stringify({checks,errors},null,2));}
