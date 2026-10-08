// B5 real-browser content montage. Existing art only; local Chrome and Vite,
// no downloads. Captures each landmark and settlement/island with live streaming.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
const output='docs/v0.6/previews/b5';await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={errors:[],httpErrors:[],maps:[]},tiles=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>report.errors.push(e.stack));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?seed=b5-preview`);await page.waitForFunction(()=>window.__SANGRE_Y_JADE__);
 for(const [column,map]of ['overgrown','bloodmoon','cenote'].entries()){
  const data=await page.evaluate(async map=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.lastSelection={heroId:'balam',mapId:map,modeId:'quick',seed:'b5-preview'};await app.startRun();const s=app.game.scene.getScene('Ritual');s.invulnerable=1e9;s.spawnTimer=1e9;s.nextBossIndex=3;s.finalSpawned=true;s.scene.pause();s.cameras.main.stopFollow();s.cameras.main.setZoom(.7);return {map,hash:s.mapLayout.hash,objects:s.mapLayout.objects.length,lights:s.mapWorld.lightSources.size,faces:s.mapLayout.sites[0].assembly.faces};},map);
  for(const [row,kind]of ['landmark',map==='cenote'?'island':'settlement'].entries()){
   const counts=await page.evaluate(kind=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),site=s.mapLayout.sites.find(x=>x.kind===kind),x=site.x,y=site.assembly?site.assembly.y:site.y;
    s.player.body.reset(x,y+230);s.cameras.main.centerOn(x,y);s.mapWorld.update(s.mapWorld.worldView());for(let i=0;i<30;i++)s.mapWorld.processPending(2);s.mapWorld.updateFades();for(let i=0;i<12;i++)s.weather?.update?.(.05);document.querySelectorAll('.hud,.touch-controls').forEach(el=>el.style.visibility='hidden');return {active:s.mapWorld.active.size,pooled:s.mapWorld.visualPool.length+s.mapWorld.colliderPool.length,overheads:s.mapWorld.overheads.parts.size+s.mapWorld.overheads.pool.length,glows:s.weather.torchGlows.filter(g=>g.visible).length};},kind);
   assert.ok(counts.active+counts.pooled+counts.overheads<=350);
   if(map!=='overgrown')assert.ok(counts.glows>0,'visible registered light sources');
   await page.waitForTimeout(180);const path=`${output}/${map}-${kind}.png`;await page.screenshot({path});
   tiles.push({input:await sharp(path).resize(640,360).png().toBuffer(),left:column*640,top:row*360});data[kind]=counts;
  }
  report.maps.push(data);
 }
 await sharp({create:{width:1920,height:720,channels:4,background:'#101d2b'}}).composite(tiles).png().toFile('docs/v0.6/previews/maps-montage.png');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);
}finally{await writeFile(`${output}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
