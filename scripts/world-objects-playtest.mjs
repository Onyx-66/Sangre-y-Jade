// Browser contract test for real streamed objects, doors, overhead crops and
// runtime stair routing. Uses installed Chrome and local assets only.
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const output=resolve('docs/v0.6/previews/b2b');await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});
await server.listen();const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={maps:[],errors:[]};
try{
  for(const mapId of ['overgrown','bloodmoon','cenote']){
    const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?debug=collision`);
    await page.waitForFunction(()=>window.__SANGRE_Y_JADE__);
    await page.evaluate(async mapId=>{
      const {GameScene}=await import('/src/scenes/GameScene.js');const original=GameScene.prototype.create;
      GameScene.prototype.create=function(){original.call(this);this.update=()=>{};};
      const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection={heroId:'kukul',mapId,modeId:'quick'};
      app.save.setSetting('master',0);app.save.setSetting('skipBossEntrances',true);await app.startRun();
    },mapId);
    await page.locator('.hud').waitFor();
    const result=await page.evaluate(async()=>{
      const {penetration,shapeBounds}=await import('/src/world/geometry.js');
      const {assemblePyramid}=await import('/src/world/assemblies.js');
      const app=window.__SANGRE_Y_JADE__,scene=app.game.scene.getScene('Ritual'),world=scene.mapWorld,collision=world.collision,hero=scene.player;
      app.game.loop.stop();scene.physics.world.pause();scene.time.paused=true;
      let sweeps=0;const failures=[];
      for(const item of world.layout.colliders){
        const b=shapeBounds(item),cx=b.x+b.width/2,cy=b.y+b.height/2;
        const extent=Math.hypot(b.width,b.height)+40;
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,x=cx+Math.cos(a)*extent,y=cy+Math.sin(a)*extent;
          hero.body.reset(x,y-24);collision.actors.delete(hero);collision.track(hero,{radius:11,footOffset:24});
          hero.body.reset(cx-Math.cos(a)*extent,cy-Math.sin(a)*extent-24);collision.resolve(hero);
          const p=collision.actors.get(hero);
          if(penetration(p,11,item))failures.push({id:item.id,angle:i,x:p.x,y:p.y});sweeps++;
        }
      }
      const structure=assemblePyramid({id:'qa',width:360,tiers:2,faces:['south']});
      collision.stairs=structure.stairs;collision.surfaces=structure.surfaces;
      for(const wall of structure.solids)world.spatialHash.insert(wall.worldId,wall,shapeBounds(wall));
      hero.setData('level',0);hero.body.reset(0,190);collision.actors.delete(hero);collision.track(hero,{radius:11,footOffset:24});
      for(let i=0;i<90;i++){hero.y-=2;collision.resolve(hero);}
      const finalLevel=hero.getData('level');if(finalLevel!==2)failures.push({stairs:'did not ascend',finalLevel,y:hero.y});
      for(const wall of structure.solids)world.spatialHash.remove(wall.worldId);
      collision.stairs=[];collision.surfaces=[];
      const landmark=world.layout.landmarks.find(i=>i.overhead)||world.layout.landmarks[0];
      hero.setData('level',0);hero.body.reset(landmark.x,landmark.y+100);collision.actors.delete(hero);
      scene.cameras.main.centerOn(hero.x,hero.y);scene.cameras.main.preRender();world.requestVisible(world.worldView());
      while(world.pendingCells.length)world.processPending(20);
      world.updateFades();collision.update();
      const split=[...world.overheads.parts.values()].length;
      const closedDoors=world.overheads.doors.size;
      app.game.renderer.preRender();scene.sys.render(app.game.renderer);app.game.renderer.postRender();
      return {map:scene.mapData.id,sweeps,failures,finalLevel,split,closedDoors,props:world.active.size};
    });
    report.maps.push(result);await page.screenshot({path:resolve(output,`${mapId}-collision.png`)});await context.close();
  }
  await writeFile(resolve(output,'objects-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  assert.equal(report.errors.length,0,report.errors.join('\n'));
  for(const map of report.maps){assert.ok(map.sweeps>100);assert.equal(map.failures.length,0,JSON.stringify(map));assert.ok(map.split>0);}
}finally{await browser.close();await server.close();}
