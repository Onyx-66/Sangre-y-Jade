// Local real-browser B4 acceptance: seed UI, worker portability, finite bounds,
// live streaming and serialized saves. No downloaded browser or assets.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {generateWorld} from '../src/world/generator/index.js';
const output='docs/v0.6/previews/b4';await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={errors:[],httpErrors:[],screens:[],maps:[]};
try{
 for(const lang of ['en','fr','ar'])for(const [width,height]of [[568,320],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.stack));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?seed=portable-jade`);await page.waitForFunction(()=>window.__SANGRE_Y_JADE__);
  await page.evaluate(async language=>{const a=window.__SANGRE_Y_JADE__;a.cancelPrologue?.();const {setLanguage}=await import('/src/i18n/index.js');setLanguage(language);a.save.setSetting('language',language);a.save.setSetting('master',0);a.setupStep=1;a.showRunSetup();},lang);
  assert.equal(await page.locator('#world-seed').inputValue(),'portable-jade');
  await page.locator('#world-seed').fill('<invalid>');assert.equal(await page.locator('[data-next]').isDisabled(),true);
  await page.locator('[data-seed-dice]').click();assert.notEqual(await page.locator('#world-seed').inputValue(),'portable-jade');
  await page.locator('#world-seed').fill('portable-jade');await page.locator('[data-seed-copy]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'portable-jade');
  const boxes=await page.locator('.world-seed input,.world-seed button,.selection-actions button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};}));
  assert.ok(boxes.every(b=>b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1&&b.height>=43.99),JSON.stringify({lang,width,boxes}));
  await page.screenshot({path:`${output}/${lang}-seed-${width}x${height}.png`});report.screens.push({lang,width,height});
  if(lang==='en'&&width===1280){
   for(const map of ['overgrown','bloodmoon','cenote']){
    const measured=await page.evaluate(async map=>{const a=window.__SANGRE_Y_JADE__;a.lastSelection={heroId:'kukul',mapId:map,modeId:'quick',seed:'portable-jade'};const t=performance.now();await a.startRun();const s=a.game.scene.getScene('Ritual');s.invulnerable=1e9;s.spawnTimer=1e9;s.nextBossIndex=3;s.finalSpawned=true;return {map,loadMs:performance.now()-t,hash:s.mapLayout.hash,width:s.physics.world.bounds.width,height:s.physics.world.bounds.height};},map);
    assert.equal(measured.hash,generateWorld(map,'portable-jade').hash);assert.equal(measured.width,7392);assert.equal(measured.height,5344);
    await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),site=s.mapLayout.sites[0];s.player.body.reset(site.x,site.y+130);s.mapWorld.collision.actors.delete(s.player);s.cameras.main.centerOn(site.x,site.y);});
    await page.waitForTimeout(250);await page.screenshot({path:`${output}/${map}-landmark.png`});
    const stream=await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),w=s.mapWorld;let peak=0;for(let round=0;round<20;round++)for(const site of w.layout.sites){w.update({x:site.x-640,y:site.y-360,right:site.x+640,bottom:site.y+360,width:1280,height:720});for(let k=0;k<10;k++)w.processPending(2);peak=Math.max(peak,w.active.size+w.visualPool.length+w.colliderPool.length+w.overheads.parts.size+w.overheads.pool.length);}return {peak,pending:w.pendingCells.length,sites:w.layout.sites.length};});
    assert.ok(stream.peak<=350);report.maps.push({...measured,...stream});
   }
   await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.finishRun(false);});await page.locator('.summary-stats').waitFor();
   assert.equal(await page.locator('#world-seed').inputValue(),'portable-jade');assert.equal(await page.evaluate(()=>window.__SANGRE_Y_JADE__.save.data.lastWorld.seed),'portable-jade');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
}finally{await writeFile(`${output}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
