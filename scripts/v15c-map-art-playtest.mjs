import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output='docs/v0.6/previews/v15c', report={date:new Date().toISOString(),viewport:{width:1280,height:720},captures:[],errors:[],httpErrors:[]};
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const context=await browser.newContext({viewport:report.viewport,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.stack||e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)report.httpErrors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(async()=>{
    const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection={heroId:'kukul',mapId:'cenote',modeId:'quick'};
    app.save.setSetting('master',0);app.save.setSetting('screenShake',false);app.save.setSetting('skipBossEntrances',true);await app.startRun();
    const s=app.game.scene.getScene('Ritual');s.__originalUpdate=s.sys.sceneUpdate;s.stats.hp=s.stats.maxHp=100000;
    s.sys.sceneUpdate=()=>{s.mapWorld.update();s.weather.update(1/60);s.enemyVisuals.update();s.telegraphs.draw();s.updateHud();};
    s.cameras.main.stopFollow();s.physics.pause();
  });
  await page.locator('.hud').waitFor();
  for(const position of ['centre','corner','landmark','boundary']){
    const state=await page.evaluate(async position=>{
      const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),world=s.mapWorld,temple=world.layout.landmarks.find(x=>x.id==='temple-gate-submerged');
      const spots={centre:{x:0,y:0},corner:{x:2300,y:-1550},landmark:{x:temple.x+430,y:temple.y-160},boundary:{x:-2720,y:700}},p=spots[position];
      s.player.setPosition(p.x,p.y).setDepth(p.y+20);s.player.body.reset(p.x,p.y);s.cameras.main.centerOn(p.x,p.y);s.cameras.main.preRender();
      world.update();while(world.pendingCells.length)world.processPending(4);
      for(const enemy of s.enemies.getChildren())if(enemy.active)enemy.disableBody(true,true);
      for(const [id,dx,dy]of [['shade',170,65],['jaguar',-150,80]]){const enemy=s.spawnEnemy(id);if(!enemy)throw new Error(`Failed to create ${id}`);enemy.setPosition(p.x+dx,p.y+dy);enemy.body.reset(p.x+dx,p.y+dy);}
      for(const enemy of s.enemies.getChildren())if(enemy.active)enemy.setDepth(enemy.y+12);
      s.telegraphs.play({shape:'circle',x:p.x+170,y:p.y+65,radius:75,windup:30,sound:false,onResolve:()=>{}});
      s.telegraphs.draw();world.updateFades();s.weather.drawOverlays();s.weather.syncTorchGlows(s.weather.currentView());
      const wrong=[];
      for(const {item,object}of world.active.values())if(object.body){
        const expected=item.collider.type==='circle'?item.collider.radius*item.scale*2:item.collider.width*item.scale;
        if(Math.abs(expected-object.body.width)>.01)wrong.push(item.id);
      }
      return {position,player:p,activeProps:world.active.size,allocatedProps:world.active.size+world.visualPool.length+world.colliderPool.length,wrongBodies:wrong,
        realProps:[...world.active.values()].filter(x=>x.object.texture.key.startsWith('map-cenote-')).length,ground:s.floor.texture.key,
        lights:s.weather.torchGlows.filter(x=>x.active).map(x=>x.texture.key),waterZones:world.waterZones,weather:[...s.weather.stillKeys.values()].map(key=>({key,loaded:s.textures.exists(key)}))};
    },position);
    await page.waitForTimeout(250);await page.screenshot({path:`${output}/${position}-1280x720.png`});
    assert.equal(state.wrongBodies.length,0,JSON.stringify(state));assert.equal(state.realProps,state.activeProps);assert.ok(state.weather.every(x=>x.loaded));assert.ok(state.allocatedProps<=350);
    report.captures.push(state);
  }
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  report.performance=await page.evaluate(async()=>{
    const app=window.__SANGRE_Y_JADE__,s=app.game.scene.getScene('Ritual'),intervals=[],updates=[],gameFrames=[];
    let previousGameFrame;
    s.player.setPosition(1300,1100);s.player.body.reset(1300,1100);s.cameras.main.startFollow(s.player,true,.09,.09);s.physics.resume();
    s.hud.showChoice=(_title,cards,choose)=>{if(cards.length)setTimeout(()=>choose(cards[0],0),0);};
    s.sys.sceneUpdate=function(time,delta){const start=performance.now();if(previousGameFrame!==undefined)gameFrames.push(start-previousGameFrame);previousGameFrame=start;s.__originalUpdate.call(this,time,delta);updates.push(performance.now()-start);};
    let last=performance.now();await new Promise(resolve=>{const tick=now=>{intervals.push(now-last);last=now;if(updates.length>=600)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    const metrics=values=>{const v=values.slice(10).sort((a,b)=>a-b);return {samples:v.length,mean:v.reduce((a,b)=>a+b,0)/v.length,p50:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],max:v.at(-1)};};
    return {cpuThrottle:4,rafFrameMs:metrics(intervals),gameFrameMs:metrics(gameFrames),sceneUpdateMs:metrics(updates),activeProps:s.mapWorld.active.size,allocatedProps:s.mapWorld.active.size+s.mapWorld.visualPool.length+s.mapWorld.colliderPool.length,weatherParticles:s.weather.particleCount,loadedMapTextures:s.textures.getTextureKeys().filter(k=>k.startsWith('map-cenote-')).length};
  });
  assert.ok(report.performance.sceneUpdateMs.samples>100,'performance capture must execute real game updates');
  assert.equal(report.errors.length,0,report.errors.join('\n'));assert.equal(report.httpErrors.length,0,report.httpErrors.join('\n'));
  console.log(JSON.stringify(report.performance,null,2));
}finally{await fs.writeFile(`${output}/map-art-report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
