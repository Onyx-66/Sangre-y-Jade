import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const adb='C:/Users/kossa/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const call=(...args)=>execFileSync(adb,['-s','emulator-5554',...args],{encoding:'utf8'}).trim();
const pid=call('shell','pidof','com.sangreyjade.game');
call('forward','tcp:9223',`localabstract:webview_devtools_remote_${pid}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const context=browser.contexts()[0],page=context.pages()[0];
const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.stack));
const check=(condition,label)=>{checks.push({label,passed:!!condition});if(!condition)throw new Error(label);};
try{
  await page.evaluate(()=>{localStorage.clear();location.reload();});
  await page.locator('.cinema-image').first().waitFor({state:'attached'});
  check(await page.locator('.cinema-image').count()===6,'APK first-launch prologue');
  check(await page.locator('.cinema-image').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth>1500)),'APK high-resolution prologue panels');
  await page.locator('[data-sound]').click();
  await page.waitForTimeout(800);
  check(await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__.audio.narration;return a&&!a.paused&&a.currentTime>0;}),'APK bundled male narration plays offline');
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.playPrologue(()=>window.__SANGRE_Y_JADE__.showTitle()));
  await page.waitForTimeout(1100);
  check((await page.locator('.subtitle').innerText()).length>8,'APK progressive subtitles');
  await page.screenshot({path:resolve('artifacts/android-prologue.png')});
  await page.getByRole('button',{name:'Skip Intro'}).click();
  await page.selectOption('[data-language]','ar');
  await page.evaluate(()=>document.fonts.ready);
  check(await page.evaluate(()=>document.fonts.check('16px Unixel')&&getComputedStyle(document.querySelector('.cinematic-bg'),'::before').transform.startsWith('matrix(-1')),'APK Arabic pixel font and mirrored title');
  call('shell','screencap','-p','/sdcard/syj-qa.png');
  call('pull','/sdcard/syj-qa.png',resolve('artifacts/v0.4/android-ar-title.png'));
  await page.selectOption('[data-language]','en');
  await page.getByRole('button',{name:'Play', exact:true}).click();
  await page.locator('[data-hero="kukul"]').click();
  for(let i=0;i<3;i++){
    check(await page.locator('[data-setup-step]').getAttribute('data-setup-step')===String(i),`APK separate setup step ${i+1}`);
    await page.locator('[data-next]').click();
  }
  await page.getByRole('button',{name:'Start Run'}).click();
  await page.locator('.hud').waitFor();
  await page.waitForTimeout(1500);
  check(await page.evaluate(()=>!!window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.active),'APK offline game assets loaded');
  check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').textures.exists('hero-kukul-frame-0')),'APK individual animation frames');
  const xp=await page.locator('.xp-dock').boundingBox(),viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  check(xp.y>viewport.height*.65&&xp.width<viewport.width*.5,'APK compact bottom XP dock');
  const cdp=await context.newCDPSession(page);
  const joy=await page.locator('.joystick').boundingBox();
  const before=await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.x);
  const x=joy.x+joy.width*.82,y=joy.y+joy.height*.5;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await page.waitForTimeout(650);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.x);
  check(after>before+15,'Android touch joystick moves hero');
  await page.getByRole('button',{name:'Dash',exact:true}).click();
  check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').dash.cooldown>0),'Android dash control');
  // WebView CDP screenshots can omit the GPU canvas. The native framebuffer
  // is the authoritative visual capture for this offline emulator build.
  call('shell','screencap','-p','/sdcard/syj-qa.png');
  call('pull','/sdcard/syj-qa.png',resolve('artifacts/android-gameplay.png'));
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('heading',{name:'Paused'}).waitFor();
  const time=await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').elapsed);
  await page.waitForTimeout(500);
  check(await page.evaluate(t=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').elapsed===t,time),'Android pause freezes simulation');
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.audio.current.readyState>=2),'Bundled Android soundtrack is decodable');
  check(errors.length===0,'Android WebView has no JavaScript errors');
}finally{
  writeFileSync('artifacts/android-smoke-report.json',JSON.stringify({checks,errors,device:call('shell','getprop','ro.build.version.release')},null,2));
  await browser.close();
}
console.log(`Android smoke test: ${checks.length} checks passed.`);
