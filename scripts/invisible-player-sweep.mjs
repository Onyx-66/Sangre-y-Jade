// Permanent visibility regression: sweep all three maps on a 160px grid and
// compare the hero's render state with actual magenta pixels in Phaser's canvas.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const MAPS = ['overgrown', 'bloodmoon', 'cenote'];
const STEP = 160;
const SEED = 83492791;
const LIMIT = Number(process.env.DEPTH_SWEEP_LIMIT || Infinity);
const BASELINE = process.env.DEPTH_SWEEP_BASELINE === '1';
const report = { seed: SEED, step: STEP, maps: [], errors: [], httpErrors: [] };
const fullMaps = [];
const server = await createServer({ server: { host: '127.0.0.1', port: 0,
  watch: { ignored: ['**/docs/**', '**/.tools/**'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

try {
  for (const mapId of MAPS) {
    const context = await browser.newContext({ viewport: { width: 800, height: 450 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.stack || error.message));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.httpErrors.push(`${response.status()} ${response.url()}`); });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?debug=depth`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__);
    await page.evaluate(async ({ mapId, seed, baseline }) => {
      const { GameScene } = await import('/src/scenes/GameScene.js');
      if (baseline) {
        const { MapWorld } = await import('/src/maps/MapWorld.js');
        MapWorld.prototype.depthForItem = item => item.y + item.depthOffset;
        MapWorld.prototype.updateFades = function() {
          const hero = this.scene.player;
          for (const { item, object } of this.active.values()) {
            const behind = item.fadeBehind && hero?.y < item.y && Math.abs(hero.x - item.x) < item.size.width * .55;
            object.setAlpha(behind ? .6 : 1);
          }
        };
      }
      const originalCreate = GameScene.prototype.create;
      GameScene.prototype.create = function() {
        originalCreate.call(this); this.update = () => {};
        if (baseline) { this.debugDepth = false; this.fog?.setDepth?.(4); this.playerOcclusion?.graphics?.setVisible?.(false); }
      };
      const app = window.__SANGRE_Y_JADE__;
      app.cancelPrologue?.();
      app.lastSelection = { heroId: 'kukul', mapId, modeId: 'quick' };
      app.save.setSetting('master', 0); app.save.setSetting('screenShake', false); app.save.setSetting('skipBossEntrances', true);
      await app.startRun({ seed });
    }, { mapId, seed: SEED, baseline: BASELINE });
    await page.locator('.hud').waitFor();
    const mapResult = await page.evaluate(async ({ mapId, step, seed, limit, baseline }) => {
      const { setWorldDepth, objectBaseY } = await import('/src/render/layers.js');
      const app = window.__SANGRE_Y_JADE__, game = app.game, scene = game.scene.getScene('Ritual');
      game.loop.stop();
      scene.time.paused = true; scene.physics.pause();
      for (const actor of scene.enemies.getChildren()) if (actor.active) {
        scene.enemyVisuals?.remove(actor); actor.disableBody(true, true);
      }
      const probe = scene.spawnEnemy('shade', undefined, { position: { x: 0, y: 0 } });
      if (!probe) throw new Error(`sweep could not create probe enemy on ${mapId}`);
      const entries = [], failures = [];
      const overlapObjects = hero => {
        const heroBounds=hero.getBounds(),left=heroBounds.x,top=heroBounds.y,right=left+heroBounds.width,bottom=top+heroBounds.height;
        return scene.children.list.filter(object=>object!==hero&&object?.active&&object.visible!==false&&(object.alpha??1)>0&&object.scrollFactorX!==0)
          .map(object=>({object,bounds:object.getBounds?.()}))
          .filter(({object,bounds})=>bounds&&bounds.x<right&&bounds.x+bounds.width>left&&bounds.y<bottom&&bounds.y+bounds.height>top)
          .map(({object})=>{const bounds=object.getBounds?.();return{name:object.getData?.('mapItemId')||object.name||object.texture?.key||object.type,
            x:object.x,y:object.y,bounds:bounds&&{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},
            depth:object.depth,alpha:object.alpha,blendMode:object.blendMode,frame:object.frame?.name};});
      };
      const screenPoint = hero => {
        const camera=scene.cameras.main,canvas=game.renderer.gameCanvas||game.canvas;
        camera.preRender();
        const zoomX=camera.zoomX||camera.zoom||1,zoomY=camera.zoomY||camera.zoom||1;
        return {x:(hero.x-camera.worldView.x)*zoomX*canvas.width/camera.width,
          y:(hero.y-camera.worldView.y)*zoomY*canvas.height/camera.height,width:canvas.width,height:canvas.height};
      };
      const snapshotMarker = hero => new Promise(resolve => {
        if(!baseline)scene.playerOcclusion?.update(hero);
        const renderer=game.renderer,canvas=renderer.gameCanvas||game.canvas;
        const point=screenPoint(hero),size=128,x=Math.max(0,Math.min(canvas.width-size,Math.floor(point.x-size/2))),y=Math.max(0,Math.min(canvas.height-size,Math.floor(point.y-size/2)));
        renderer.snapshotArea(x,y,size,size,image=>{
          const buffer=document.createElement('canvas');buffer.width=image.width;buffer.height=image.height;
          const context=buffer.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
          const pixels=context.getImageData(0,0,buffer.width,buffer.height).data;let count=0;
          // Ambient map tint is intentionally translucent over the frame, so
          // count the marker's magenta hue with tolerance rather than exact RGB.
          for(let i=0;i<pixels.length;i+=4){const[r,g,b,a]=pixels.subarray(i,i+4);if(r>170&&g<100&&b>170&&Math.abs(r-b)<35&&a>0)count++;}
          resolve({count,pixels,point:{x:point.x,y:point.y,canvasWidth:canvas.width,canvasHeight:canvas.height},crop:{x,y,width:image.width,height:image.height}});
        },'image/png');
        renderer.preRender();game.scene.render(renderer);renderer.postRender();
      });
      let done=false;
      for(let y=-2000;y<=2000&&!done;y+=step)for(let x=-2800;x<=2800;x+=step){
        const hero=scene.player;hero.setPosition(x,y);hero.body.reset(x,y);hero.setAlpha(1).setTintFill(0xff00ff);
        if(!baseline){
          // Solid objects now reject this invalid spawn rather than allowing a
          // test-only teleport to leave the hero inside an opaque wall base.
          const free=scene.mapWorld.collision.free({x,y:y+24},11);
          hero.body.reset(free.x,free.y-24);hero.setData('worldFootY',free.y);
        }
        if (baseline) hero.setDepth(y + 20);
        probe.setPosition(hero.x,hero.y);probe.body.reset(hero.x,hero.y);setWorldDepth(probe,objectBaseY(probe));
        scene.cameras.main.centerOn(hero.x,hero.y);scene.mapWorld?.requestVisible();
        // Bring the target chunk set into the render list; production itself still streams by frame budget.
        while(scene.mapWorld?.pendingCells?.length)scene.mapWorld.processPending(32);
        scene.enemyVisuals?.update();
        if (baseline) scene.enemyVisuals?.actors.get(probe)?.sprite?.setDepth?.(y + 12);
        else setWorldDepth(hero,objectBaseY(hero));
        scene.renderDepthDebug?.();
        scene.mapWorld?.updateFades();if(!baseline)scene.playerOcclusion?.update();
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const pixelSample=await snapshotMarker(hero);let markerPixels=pixelSample.count;
        if(!baseline){
          // Compare the SAME frozen frame with the marker actor hidden. This
          // detects real rendered pixels even under a legitimate 55% canopy,
          // and cannot pass merely because the background happens to be pink.
          hero.setVisible(false);const absent=await snapshotMarker(hero);hero.setVisible(true);markerPixels=0;
          for(let i=0;i<pixelSample.pixels.length;i+=4){const a=pixelSample.pixels,b=absent.pixels;
            if(a[i]>a[i+1]+20&&a[i+2]>a[i+1]+20&&Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>30)markerPixels++;}
        }
        const entry=scene.enemyVisuals?.actors.get(probe),visual=entry?.sprite;
        const state={x,y,resolvedX:hero.x,resolvedY:hero.y,markerPixels,screenPoint:pixelSample.point,hero:{visible:hero.visible,alpha:hero.alpha,depth:hero.depth,
          parent:hero.parentContainer?.name||(hero.displayList===scene.sys.displayList?'scene':'other'),texture:hero.texture?.key,frame:hero.frame?.name},
          enemy:{visible:visual?.visible,alpha:visual?.alpha,depth:visual?.depth,texture:visual?.texture?.key,frame:visual?.frame?.name}};
        entries.push(state);
        if(!hero.visible||hero.alpha<=0||(!hero.displayList&&!hero.parentContainer)||!hero.texture?.key||!visual?.visible||markerPixels===0){
          failures.push({...state,overlapObjects:overlapObjects(hero)});
        }
        if(entries.length>=limit){done=true;break;}
      }
      return { mapId, seed, placements:entries.length, markerPixels:{min:Math.min(...entries.map(e=>e.markerPixels)),max:Math.max(...entries.map(e=>e.markerPixels))},
        lastScreenPoint:entries.at(-1)?.screenPoint,
        failures, northSouthActors:entries.filter(e=>Math.abs(e.x)<1&&Math.abs(e.y)===160).map(e=>({x:e.x,y:e.y,heroDepth:e.hero.depth,enemyDepth:e.enemy.depth,markerPixels:e.markerPixels})) };
    }, { mapId, step: STEP, seed: SEED, limit: Number.isFinite(LIMIT)?LIMIT:1e9, baseline: BASELINE });
    if(Number.isFinite(LIMIT)){
      const canvas=await page.locator('canvas').boundingBox(),point=mapResult.lastScreenPoint;
      const clip={x:Math.max(canvas.x,canvas.x+point.x*canvas.width/point.canvasWidth-64),
        y:Math.max(canvas.y,canvas.y+point.y*canvas.height/point.canvasHeight-64),width:128,height:128};
      const png=await page.screenshot({type:'png',clip}),raw=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let markerPixels=0;for(let i=0;i<raw.data.length;i+=raw.info.channels){const[r,g,b]=raw.data.subarray(i,i+3);if(r>170&&g<100&&b>170&&Math.abs(r-b)<35)markerPixels++;}
      mapResult.screenshotMarkerPixels=markerPixels;
      if (markerPixels === 0) {
        const debugDir = join(process.cwd(), 'artifacts', 'depth-sweep-debug');
        await mkdir(debugDir, { recursive: true });
        await page.screenshot({ path: join(debugDir, `${mapId}.png`) });
      }
    }
    fullMaps.push(mapResult);
    report.maps.push({...mapResult, failureCount:mapResult.failures.length,failures:mapResult.failures.slice(0,10)});
    await context.close();
  }
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.httpErrors.length, 0, report.httpErrors.join('\n'));
  if(!Number.isFinite(LIMIT))assert.ok(report.maps.every(map => map.placements >= 5), 'each map needs at least five regression placements');
  if(process.env.DEPTH_SWEEP_REPORT)await writeFile(resolve(process.env.DEPTH_SWEEP_REPORT),JSON.stringify({...report,maps:fullMaps},null,2));
  if(!BASELINE)assert.ok(report.maps.every(map => map.failureCount === 0), report.maps.flatMap(map => map.failures.map(f => `${map.mapId} (${f.x},${f.y}) pixels=${f.markerPixels}`)).join('\n'));
} finally {
  await browser.close(); await server.close();
}
