import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const started=performance.now(),output=path.resolve(process.env.SYJ_VIEWPORT_OUTPUT||'docs/v0.6/previews/prompt04');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:568,height:320},deviceScaleFactor:1,serviceWorkers:'block'});
await context.addInitScript(()=>localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2,settings:{attackMode:'manual'}})));
const page=await context.newPage(),checks=[],errors=[],layouts=[];
page.on('pageerror',error=>errors.push(error.stack));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
const check=(condition,label)=>{checks.push({label,passed:!!condition});assert.ok(condition,label);};
const near=(a,b)=>Math.abs(a-b)<.55;
let pageInk;
async function edges(buffer){
 const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const pixel=(x,y)=>{const i=(y*info.width+x)*info.channels;return pageInk.every((v,c)=>data[i+c]===v);};
 const lines=[Array.from({length:info.height},(_,y)=>pixel(1,y)),Array.from({length:info.height},(_,y)=>pixel(info.width-2,y)),
  Array.from({length:info.width},(_,x)=>pixel(x,1)),Array.from({length:info.width},(_,x)=>pixel(x,info.height-2))];
 return lines.map((line,i)=>{let run=0,longest=0;for(const ink of line){run=ink?run+1:0;longest=Math.max(longest,run);}return {edge:['left','right','top','bottom'][i],inkRatio:line.filter(Boolean).length/line.length,longest};});
}
function layoutState(){
 const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const app=window.__SANGRE_Y_JADE__,scene=app.game.scene.getScene('Ritual'),c=scene.cameras.main;
 const safe=rect(scene.hud.el),canvas=rect(app.game.canvas),selectors=['.bars','.hud-clock','.hud-currency','.ally-panel','.boss-wrap','.joystick','.xp-dock','#auto-indicator','[data-skill]','[data-passive]','[data-innate]','[data-dash]','[data-attack]'];
 const boxes=selectors.flatMap(selector=>[...scene.hud.el.querySelectorAll(selector)].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map((el,i)=>({name:`${selector}-${i}`,r:rect(el)})));
 const outside=boxes.filter(({r})=>r.x<safe.x-.5||r.y<safe.y-.5||r.right>safe.right+.5||r.bottom>safe.bottom+.5).map(({name})=>name);
 const overlap=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i].r,b=boxes[j].r;
  if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>.5)overlap.push(`${boxes[i].name}/${boxes[j].name}`);
 }
 return {canvas,safe,boxes,outside,overlap,buffer:[app.game.canvas.width,app.game.canvas.height],scale:[scene.scale.width,scene.scale.height],
  world:{x:c.worldView.x,y:c.worldView.y,width:c.worldView.width,height:c.worldView.height},zoom:[c.zoomX,c.zoomY],
  center:[c.scrollX+c.width/2,c.scrollY+c.height/2],floor:[scene.floor.width,scene.floor.height],gameSame:app.game===window.viewportTestGame,
  paused:scene.pausedForChoice&&scene.time.paused&&scene.physics.world.isPaused};
}
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await page.evaluate(async()=>{const app=window.__SANGRE_Y_JADE__;app.lastSelection.heroId='kukul';await app.startRun();});await page.locator('.hud').waitFor();
 await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__,s=app.game.scene.getScene('Ritual');window.viewportTestGame=app.game;s.invulnerable=10000;s.spawnTimer=10000;s.pauseForSelection();});
 pageInk=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0,3).map(Number));
 // A test that cannot spot bars is not evidence. Deliberately introduce them.
 const bars=await page.addStyleTag({content:'#game-root canvas{width:calc(100% - 60px)!important;margin-left:30px!important}'});
 check((await edges(await page.screenshot())).some(edge=>edge.inkRatio>.9),'edge-sampling gate rejects deliberately introduced side bars');await bars.evaluate(node=>node.remove());
 const english=new Map();
 for(const locale of ['en','ar'])for(const [width,height]of [[568,320],[640,360],[800,360],[960,540],[1024,768],[2400,1080],[3440,1440]])for(const inset of [false,true]){
  const before=(await page.evaluate(layoutState)).center;
  await page.setViewportSize({width,height});
  await page.evaluate(async({locale,inset})=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
   for(const [side,value]of Object.entries({top:20,right:12,bottom:10,left:24}))document.documentElement.style.setProperty(`--native-safe-${side}`,`${inset?value:0}px`);
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.hud.destroy();
   const {Hud}=await import('/src/systems/Hud.js');s.hud=new Hud(document.querySelector('#ui-root'),s.settings,{skill:()=>{},dash:()=>{},pause:()=>s.togglePause()});s.hud.setHero(s.heroData);
   const {applyHudFixture}=await import('/tests/fixtures/skill-hud.js');applyHudFixture(s.hud,s.heroData.skills,false);s.hud.setBoss('Vucub Caquix, the False Sun',.7);
   await document.fonts.ready;
  },{locale,inset});
  await page.waitForFunction(({width,height})=>{const c=window.__SANGRE_Y_JADE__.game.canvas;return c.width===width&&c.height===height;},{width,height});
  await page.waitForTimeout(100);
  await page.mouse.move(width/2,height/2);await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.hideTooltip());
  const name=`${locale}-${width}x${height}-${inset?'cutout':'plain'}`,layout=await page.evaluate(layoutState);layouts.push({name,...layout});
  check(near(layout.canvas.x,0)&&near(layout.canvas.y,0)&&near(layout.canvas.width,width)&&near(layout.canvas.height,height)&&layout.buffer[0]===width&&layout.buffer[1]===height,`${name}: CSS canvas and actual framebuffer fill the display`);
  check(near(layout.world.height,720)&&near(layout.zoom[1],height/720)&&near(layout.zoom[0],height/720),`${name}: uniform zoom and 720 world-unit height`);
  check(near(layout.world.width,720*width/height)&&layout.world.width/layout.world.height<=2.4,`${name}: correct live aspect without extra world height`);
  check(layout.floor[0]>=layout.world.width&&layout.floor[1]>=layout.world.height,`${name}: terrain covers the complete world view`);
  check(layout.gameSame&&layout.paused&&before.every((value,i)=>near(value,layout.center[i])),`${name}: resize retains run identity, pause and viewed center`);
  check(layout.outside.length===0,`${name}: all HUD anchors inside the safe area ${layout.outside.join(',')}`);
  check(layout.overlap.length===0,`${name}: safe-area HUD controls do not overlap ${layout.overlap.join(',')}`);
  check(near(layout.safe.x,inset?24:0)&&near(layout.safe.y,inset?20:0)&&near(layout.safe.right,width-(inset?12:0))&&near(layout.safe.bottom,height-(inset?10:0)),`${name}: native cutout variables combine with browser safe-area insets`);
  const positions=layout.boxes.map(({name,r})=>({name,...r})),key=`${width}x${height}-${inset}`;
  if(locale==='en')english.set(key,positions);else check(JSON.stringify(positions)===JSON.stringify(english.get(key)),`${name}: physical HUD positions remain identical in Arabic`);
  const snapshot=await page.screenshot();layout.edges=await edges(snapshot);
  check(layout.edges.every(edge=>edge.inkRatio<.05&&edge.longest<8),`${name}: screenshot edges contain terrain, not page-color bars ${JSON.stringify(layout.edges)}`);
  // Keep one screenshot per requested aspect/locale; the reports cover both inset states.
  if(inset)await fs.writeFile(path.join(output,`${name}.png`),snapshot);
  const spawn=await page.evaluate(async()=>{
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),{worldView}=await import('/src/systems/Viewport.js'),{BOSSES}=await import('/src/data/world.js');
   const view=worldView(s),random=Math.random,boxes=[];
   const outside=object=>{const b=object.getBounds();boxes.push({x:b.x,y:b.y,width:b.width,height:b.height});return b.right<view.x||b.x>view.right||b.bottom<view.y||b.y>view.bottom;};
   let regular=true,bosses=true;
   try{for(let edge=0;edge<4;edge++){
    let n=0;Math.random=()=>n++===0?(edge+.1)/4:.5;s.spawnEnemy('shade');const e=s.enemies.getChildren().at(-1);regular=outside(e)&&regular;e.destroy();
    n=0;s.activeBoss=null;s.spawnBoss(BOSSES[2]);const boss=s.activeBoss;bosses=outside(boss)&&bosses;boss.destroy();s.activeBoss=null;
   }}finally{Math.random=random;}
   s.hud.clearBoss();s.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());return {regular,bosses,boxes};
  });
  layout.spawn=spawn;check(spawn.regular&&spawn.bosses,`${name}: every ordinary enemy and boss edge spawn starts wholly outside the real view`);
  check(await page.evaluate(()=>{
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),p=s.input.activePointer,c=s.cameras.main;
   p.position.set(c.width*.75,c.height*.4);p.worldX=p.worldY=-10000;
   const at=c.getWorldPoint(p.x,p.y),expected=Math.atan2(at.y-s.player.y,at.x-s.player.x);
   s.manualPointer=true;const actual=s.getAimAngle();s.manualPointer=false;
   return Math.abs(actual-expected)<1e-8;
  }),`${name}: manual aiming uses current pixel-to-world coordinates after resize`);
  check(await page.evaluate(async()=>{
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),c=s.cameras.main,{shakePixels}=await import('/src/systems/Viewport.js');
   const settings={...s.settings},random=Math.random;c.preRender();const x=c.matrix.tx,y=c.matrix.ty;
   try{s.settings.screenShake=true;s.settings.reducedMotion=false;Math.random=()=>1;
    shakePixels(s,150,4);c.shakeEffect.update(0,10);c.preRender();
    return Math.abs(c.matrix.tx-x-4)<1.1&&Math.abs(c.matrix.ty-y-4)<1.1;
   }finally{s.settings=settings;Math.random=random;c.shakeEffect.reset();c.preRender();}
  }),`${name}: real Phaser screen shake stays approximately four pixels on both axes`);
  const pickup=await page.evaluate(()=>{
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.spawnPickup('cacao',s.player.x+150,s.player.y,1);const near=s.pickups.getChildren().at(-1);
   s.spawnPickup('cacao',s.player.x+250,s.player.y,1);const far=s.pickups.getChildren().at(-1);s.pausedForChoice=false;s.updatePickups();s.pausedForChoice=true;
   const result={near:near.body.velocity.x,far:far.body.velocity.x};near.destroy();far.destroy();return result;
  });
  check(pickup.near<0&&pickup.far===0,`${name}: pickup attraction stays in world units at every pixel density/aspect`);
  await page.locator('#auto-indicator').click();
  const tooltip=await page.locator('.skill-tooltip').boundingBox();
  check(tooltip.x>=layout.safe.x&&tooltip.y>=layout.safe.y&&tooltip.x+tooltip.width<=layout.safe.right&&tooltip.y+tooltip.height<=layout.safe.bottom,`${name}: tooltip stays within safe bounds`);
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').hud.hideTooltip());
 }
 // An active full-screen effect follows a resize even while time/tweens are paused.
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.fx.play('skyfall','cast',{duration:2});});
 await page.setViewportSize({width:800,height:360});await page.waitForTimeout(200);
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),c=s.cameras.main,o=s.fx.live.find(e=>e.object.getData?.('viewportOverlay'))?.object;
  return !!o&&o.active&&o.x===c.width/2&&o.y===c.height/2&&o.displayWidth>=c.width/c.zoomX&&o.displayHeight>=c.height/c.zoomY;}),'paused skyfall screen overlay covers a resized camera without changing its spell geometry');
 await page.setViewportSize({width:4000,height:1000});await page.waitForTimeout(200);
 const capped=await page.evaluate(layoutState);check(capped.world.width===1728&&capped.world.height===720&&capped.canvas.width===4000,'beyond 2.4:1 the world width is capped while the canvas still fills the display');
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.fx.destroy();s.pausedForChoice=false;});
 await page.setViewportSize({width:568,height:320});await page.waitForTimeout(200);
 await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').togglePause());
 const modal=await page.locator('.pause-menu .modal').boundingBox(),safe=(await page.evaluate(layoutState)).safe;
 check(modal.x>=safe.x&&modal.y>=safe.y&&modal.x+modal.width<=safe.right&&modal.y+modal.height<=safe.bottom,'pause overlay fits the inset phone viewport');
 await page.locator('[data-settings]').click();await page.locator('[data-back]').click();await page.locator('[data-resume]').click();
 check(await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return !s.pausedForChoice&&!s.time.paused&&!s.physics.world.isPaused;}),'settings and resume still work after wide/narrow cutout resizing');
 const resizeListeners=await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').scale.listenerCount('resize'));
 await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__;window.viewportOldScene=a.game.scene.getScene('Ritual');a.showTitle();});
 await page.waitForFunction(()=>window.viewportOldScene.cleaned);
 check(await page.evaluate(expected=>window.viewportOldScene.scale.listenerCount('resize')<expected,resizeListeners),'leaving the run removes its viewport resize listener');
 for(const locale of ['en','fr','ar'])for(const [width,height]of [[568,320],[640,360],[800,360],[960,540],[1024,768],[2400,1080],[3440,1440]]){
  await page.setViewportSize({width,height});
  await page.evaluate(async locale=>{const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);window.__SANGRE_Y_JADE__.showSettings();await document.fonts.ready;},locale);
  const panel=await page.locator('.settings-panel').boundingBox(),close=await page.locator('[data-back]').boundingBox();
  check(panel.x>=24&&panel.y>=20&&panel.x+panel.width<=width-12&&panel.y+panel.height<=height-10&&close.y+close.height<=panel.y+panel.height,`${locale}-${width}x${height}: main settings and its close action fit the safe area`);
  await page.evaluate(()=>{const a=window.__SANGRE_Y_JADE__;a.setupStep=0;a.showRunSetup();});
  for(let step=0;step<4;step++){
   const panel=await page.locator('.wizard-panel').boundingBox(),button=await page.locator(step===3?'[data-start]':'[data-next]').boundingBox();
   check(panel.x>=24&&panel.y>=20&&panel.x+panel.width<=width-12&&panel.y+panel.height<=height-10&&button.y+button.height<=panel.y+panel.height,`${locale}-${width}x${height}: setup step ${step+1} and its action fit the safe area`);
   if(step<3)await page.locator('[data-next]').click();
  }
 }
 check(errors.length===0,`no console/HTTP errors: ${errors.join(', ')}`);
 console.log(`Viewport checks: ${checks.length} passed; 7 requested sizes x 2 locales x 2 safe-area states.`);
}finally{
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors,layouts,durationMs:performance.now()-started},null,2));
 await browser.close();await server.close();
}
