import fs from 'node:fs/promises';
import {preview} from 'vite';
import {chromium} from 'playwright-core';
const output='docs/skills-redesign/verification';await fs.mkdir(output,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:0},logLevel:'error'});
const base=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={environment:{browser:browser.version(),host:process.platform,physicalPhone:false,cpuThrottle:1,notes:'Desktop headless Chromium, touch/mobile viewports; not physical-device certification.'},locales:[],performance:[],errors:[]};
let label='startup';
async function pageFor(width,height){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:'block'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({label,error:e.stack}));page.on('console',m=>{if(m.type()==='error')report.errors.push({label,error:m.text()});});page.on('response',r=>{if(r.status()>=400)report.errors.push({label,error:`${r.status()} ${r.url()}`});});
 return {context,page};
}
try{
 for(const locale of ['en','fr','ar'])for(const [width,height]of [[568,320],[320,568]]){
  label=`${locale}-${width}x${height}`;const {page,context}=await pageFor(width,height);
  await page.goto(base);await page.locator('[data-skip]').click();await page.locator('[data-language]').selectOption(locale);
  const title=await page.locator('[data-action="play"]').innerText();await page.locator('[data-action="play"]').click();
  for(let step=0;step<3;step++)await page.locator('[data-next]').click();await page.locator('[data-start]').click();await page.locator('.hud').waitFor();
  const result=await page.evaluate(()=>({language:document.documentElement.lang,direction:document.documentElement.dir,
   gameHandle:!!window.__SANGRE_Y_JADE__,allyHandle:!!window.__allyCasts,fatal:!!document.querySelector('[data-fatal]'),canvas:!!document.querySelector('canvas'),
   overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
   controls:[...document.querySelectorAll('[data-skill],[data-passive],[data-dash],.ally-panel')].map(el=>{const r=el.getBoundingClientRect();return {class:el.className,outside:r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5};})}));
  result.passed=result.language===locale&&result.direction===(locale==='ar'?'rtl':'ltr')&&!result.gameHandle&&!result.allyHandle&&!result.fatal&&result.canvas&&!result.overflow&&!result.controls.some(c=>c.outside);
  report.locales.push({locale,width,height,title,...result});await page.screenshot({path:`${output}/startup-${label}.png`});await context.close();console.log(`Production startup ${label}: ${result.passed?'PASS':'FAIL'}`);
 }
 for(const hero of ['balam','ixchel','kukul'])for(const [width,height]of [[568,320],[320,568]]){
  label=`performance-${hero}-${width}x${height}`;const {page,context}=await pageFor(width,height);
  await page.goto(`${base}/?fxdebug=1`);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(hero=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('fps',60);app.save.setSetting('particles','high');app.save.setSetting('attackMode','manual');app.lastSelection.heroId=hero;app.startRun();},hero);
  await page.locator('.hud').waitFor();
  const result=await page.evaluate(async hero=>{
   const game=window.__SANGRE_Y_JADE__.game,s=game.scene.getScene('Ritual');
   const ids={balam:['claw-cyclone','war-drum','sun-claw'],ixchel:['jade-halo','raincaller','serpent-coil'],kukul:['featherstorm','skyfall','kukulkans-breath']}[hero];
   s.invulnerable=100000;s.stats.level=s.loadoutLevel=20;s.stats.mana=s.stats.maxMana=100000;
   s.collectPickup=()=>{};s.props.clear(true,true);s.enemies.clear(true,true);
   s.skillSlots=ids.map(id=>({...s.heroData.skills.find(k=>k.id===id),level:6,remaining:0}));s.hud.setSkills(s.skillSlots,4);
   for(let i=0;i<60;i++){s.spawnEnemy('shade',1);const e=s.enemies.getChildren().at(-1),a=i*Math.PI*2/60;e.body.reset(Math.cos(a)*180,Math.sin(a)*180);e.setData({hp:1e7,maxHp:1e7,speed:0});}
   const casts=Object.fromEntries(ids.map(id=>[id,0]));s.passives.bus.on('skillCast',({skill})=>casts[skill.id]++);
   s.updateDirector=()=>{s.skillSlots.forEach((k,i)=>{if(k.remaining<=0)s.castSkill(i);});};
   await new Promise(resolve=>setTimeout(resolve,2000));
   const times=[];let last=null,peakFx=0,peakEffectSprites=0;
   const sample=()=>{const now=performance.now();if(last!==null)times.push(now-last);last=now;s.fx.prune();peakFx=Math.max(peakFx,s.fx.liveUnits);peakEffectSprites=Math.max(peakEffectSprites,s.effects.countActive()+s.fx.live.filter(e=>e.object?.active).length);};
   game.events.on('postrender',sample);await new Promise(resolve=>setTimeout(resolve,10000));game.events.off('postrender',sample);
   const ordered=[...times].sort((a,b)=>a-b),sum=times.reduce((a,b)=>a+b,0),gl=game.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
   return {seconds:sum/1000,frames:times.length,fps:times.length*1000/sum,p95FrameMs:ordered[Math.floor(ordered.length*.95)]??null,
    maxFrameMs:ordered.at(-1)??null,framesOver33ms:times.filter(t=>t>33.4).length,peakFx,peakEffectSprites,casts,
    renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):(gl?'WebGL':'Canvas'),passed:times.length*1000/sum>=55&&times.filter(t=>t>33.4).length===0&&peakFx<=24};
  },hero);
  report.performance.push({hero,width,height,...result});console.log(`${label}: ${result.fps.toFixed(1)} FPS, ${result.framesOver33ms} frames >33.4 ms, ${result.peakFx}/24 FX units`);
  await page.screenshot({path:`${output}/${label}.png`});await context.close();
 }
 report.passed=report.errors.length===0&&report.locales.every(r=>r.passed)&&report.performance.every(r=>r.passed);
 await fs.writeFile(`${output}/browser.json`,JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
}finally{await fs.writeFile(`${output}/browser.json`,JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
