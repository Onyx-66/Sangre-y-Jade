// V13 seeded 10-minute map streaming/performance smoke test.
// Advances the real Phaser scene at a fixed 20 Hz under Chrome 4x CPU throttling.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const maps = process.env.MAP_BOT_MAPS?.split(',') || ['overgrown', 'bloodmoon', 'cenote'];
const seedFor = map => ({ overgrown: 13001, bloodmoon: 13002, cenote: 13003 })[map];
const output = path.resolve(process.env.MAP_BOT_REPORT || 'docs/v0.6/previews/v13/map-bot-report.json');
await fs.mkdir(path.dirname(output), { recursive: true });
const report = { createdAt: new Date().toISOString(), simulatedSeconds: 600, stepHz: 20,
  cpuThrottleRate: 4, maps: [], errors: [], httpErrors: [] };
const server = await createServer({ server: { host: '127.0.0.1', port: 0,
  watch: { ignored: ['**/docs/**', '**/.tools/**'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

try {
  for (const mapId of maps) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [], httpErrors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__);
    await page.evaluate(async ({ mapId, seed }) => {
      const { GameScene } = await import('/src/scenes/GameScene.js');
      const original = GameScene.prototype.create;
      GameScene.prototype.create = function() {
        let state = seed >>> 0;
        Math.random = () => {
          state += 0x6D2B79F5; let value = state;
          value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
          return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
        window.Phaser.Math.RND.sow([String(seed)]);
        original.call(this); this.update = () => {};
      };
      const app = window.__SANGRE_Y_JADE__;
      app.cancelPrologue?.(); app.lastSelection = { heroId: 'kukul', mapId, modeId: 'quick' };
      app.save.setSetting('master', 0); app.save.setSetting('attackMode', 'auto'); app.save.setSetting('autoAim', true);
      app.save.setSetting('damageNumbers', false); app.save.setSetting('screenShake', false);
      app.save.setSetting('skipBossEntrances', true);
      await app.startRun();
    }, { mapId, seed: seedFor(mapId) });
    await page.locator('.hud').waitFor();

    const result = await page.evaluate(async ({ mapId, seed }) => {
      const { GameScene } = await import('/src/scenes/GameScene.js');
      const { penetration, blocksLevel } = await import('/src/world/geometry.js');
      const app = window.__SANGRE_Y_JADE__, game = app.game, scene = game.scene.getScene('Ritual');
      game.loop.stop(); scene.sys.sceneUpdate = GameScene.prototype.update;
      // Preserve ordinary enemy, XP and level-up logic; an oversized HP pool keeps this
      // performance-only bot alive long enough to exercise late-run streamed regions.
      scene.stats.hp = scene.stats.maxHp = 1000000;
      scene.audio.sfx = () => {};
      for (const method of ['play', 'loop', 'ui']) scene.skillAudio[method] = () => null;
      for (const method of ['toast', 'showUnlock']) scene.hud[method] = () => {};
      scene.floatText = () => {};
      const delta = 50, frameTimes = [], heapSamples = [], activeSamples = [], collisionFailures=[],stuckFailures=[],movementSamples=new Map();
      let clock = scene.time.now, frames = 0, nextDecision = 0, maxHeap = 0, maxActive = 0, maxSprites = 0, pendingChoice = null;
      scene.hud.showChoice = (title, cards, choose, _subtitle, secondary, options) => { pendingChoice = { title, cards, choose, secondary, options }; };
      while (scene.elapsed < 600 - 1e-5 && !scene.ended) {
        const frameStart = performance.now();
        let choiceCount = 0;
        while (pendingChoice) {
          if (++choiceCount > 20) throw new Error(`${mapId}: unbounded level-up choice queue`);
          const choice = pendingChoice; pendingChoice = null;
          if (choice.options?.readOnly && choice.options?.primary) choice.options.primary.action();
          else if (choice.cards?.length) choice.choose(choice.cards[0], 0);
          else if (choice.secondary) choice.secondary.action();
          else throw new Error(`${mapId}: empty choice without a back action (${choice.title})`);
        }
        if (scene.elapsed >= nextDecision) {
          const p = scene.player, enemies = scene.enemies.getChildren().filter(enemy => enemy.active);
          const nearest = [...enemies].sort((a, b) => Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
          const drops = scene.pickups.getChildren().filter(item => item.active &&
            (item.getData('kind') === 'xp' || (item.getData('kind') === 'potion' && scene.stats.hp < scene.stats.maxHp * 0.9)));
          const goal = [...drops].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0] || nearest;
          const distance = nearest ? Math.hypot(nearest.x-p.x,nearest.y-p.y) : Infinity;
          const desired = 210; let best = { score: -Infinity, x: 0, y: 0 };
          for (let i=-1;i<16;i++) {
            const angle=i*Math.PI/8,x=i<0?0:Math.cos(angle),y=i<0?0:Math.sin(angle),px=p.x+x*scene.stats.speed*.3,py=p.y+y*scene.stats.speed*.3;
            let score=0;
            if(goal)score-=Math.hypot(px-goal.x,py-goal.y)*.3;
            if(nearest&&!drops.length)score-=Math.abs(Math.hypot(px-nearest.x,py-nearest.y)-desired)*.6;
            for(const enemy of enemies){const d=Math.hypot(px-enemy.x,py-enemy.y);if(d<110)score-=Math.pow(110-d,2)*.035;}
            if(i<0)score+=3;
            if(score>best.score)best={score,x,y};
          }
          scene.hud.move = { x: best.x, y: best.y };
          if (nearest && distance < 650) {
            for (let i = 0; i < scene.skillSlots.length; i++) if (!scene.skillSlots[i].remaining) scene.castSkill(i);
          }
          if (scene.dash?.cooldown <= 0 && distance < 65) scene.tryDash();
          nextDecision = scene.elapsed + 0.2;
        }
        clock += delta; scene.cameras.main.preRender(); game.headlessStep(clock, delta); frames++;
        const elapsed = performance.now() - frameStart; frameTimes.push(elapsed);
        if (frames % 100 === 0) {
          for(const [actor,state] of scene.mapWorld.collision.actors){
            if(!actor.active||state.flier)continue;
            for(const item of scene.mapWorld.blockersAround(state.x,state.y,state.radius))if(blocksLevel(item,state.level)&&penetration(state,state.radius,item))
              collisionFailures.push({time:scene.elapsed,actor:actor.getData('type')||'hero/ally',object:item.worldId,x:state.x,y:state.y});
          }
          for(const enemy of scene.enemies.getChildren()){
            if(!enemy.active||enemy.getData('flier')||enemy.getData('isBoss')||enemy.getData('ranged')||enemy.getData('buried'))continue;
            const serial=enemy.getData('serial'),old=movementSamples.get(serial),action=enemy.getData('behaviorState');
            const stationary=old&&Math.hypot(enemy.x-old.x,enemy.y-old.y)<2&&!action?.busy&&!action?.motion;
            const samples=stationary?old.samples+1:0;
            movementSamples.set(serial,{x:enemy.x,y:enemy.y,samples});
            if(samples>=3&&Math.hypot(enemy.x-scene.player.x,enemy.y-scene.player.y)>100&&scene.mapWorld.blockersAround(enemy.x,enemy.y,40).length)
              stuckFailures.push({serial,type:enemy.getData('type'),time:scene.elapsed,x:enemy.x,y:enemy.y,velocity:{x:enemy.body.velocity.x,y:enemy.body.velocity.y},recovery:scene.mapWorld.stuck.get(serial)});
          }
          const used = performance.memory?.usedJSHeapSize || 0; heapSamples.push(used); maxHeap = Math.max(maxHeap, used);
          const active = scene.mapWorld?.active.size || 0;
          const sprites = active + (scene.mapWorld?.visualPool.length || 0) + (scene.mapWorld?.colliderPool.length || 0)
            +scene.mapWorld.overheads.parts.size+scene.mapWorld.overheads.pool.length;
          activeSamples.push(active); maxActive = Math.max(maxActive, active); maxSprites = Math.max(maxSprites, sprites);
        }
        if (frames > 14000) throw new Error(`${mapId}: simulation clock stopped at ${scene.elapsed.toFixed(2)}s (choice=${!!pendingChoice}, paused=${scene.pausedForChoice}, ended=${scene.ended})`);
      }
      const sorted = frameTimes.toSorted((a,b)=>a-b), sum = frameTimes.reduce((total,n)=>total+n,0);
      const percentile = p => sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))] || 0;
      const usedFirst = heapSamples.find(value => value > 0) || 0, usedLast = [...heapSamples].reverse().find(value => value > 0) || 0;
      return { mapId, seed, simSeconds: scene.elapsed, frames, completed: scene.elapsed >= 599.95 || scene.ended,
        collisionFailures, stuckFailures, level: scene.stats.level, kills: scene.stats.kills, player: { x: scene.player.x, y: scene.player.y },
        frameMs: { mean: sum / Math.max(1, frames), p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted.at(-1) || 0,
          estimatedFps: 1000 / Math.max(0.001, sum / Math.max(1, frames)), over16_7ms: frameTimes.filter(value => value > 16.7).length },
        memory: { firstSampleBytes: usedFirst || null, lastSampleBytes: usedLast || null, peakBytes: maxHeap || null,
          growthBytes: usedFirst && usedLast ? usedLast - usedFirst : null },
        streaming: { peakActiveProps: maxActive, peakAllocatedSprites: maxSprites, sampleCount: activeSamples.length,
          activePropSamples: activeSamples }, seedPolicy: 'seeded map base layout; deterministic decoration' };
    }, { mapId, seed: seedFor(mapId) });
    result.errors = errors; result.httpErrors = httpErrors;
    report.maps.push(result); report.errors.push(...errors.map(error => `${mapId}: ${error}`)); report.httpErrors.push(...httpErrors.map(error => `${mapId}: ${error}`));
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    assert.equal(result.completed, true, `${mapId}: 10-minute simulation completed`);
    assert.equal(result.collisionFailures.length,0,`${mapId}: actors embedded in solids: ${JSON.stringify(result.collisionFailures.slice(0,10))}`);
    assert.equal(result.stuckFailures.length,0,`${mapId}: stationary ground enemies near obstacles: ${JSON.stringify(result.stuckFailures.slice(0,10))}`);
    assert.ok(result.streaming.peakAllocatedSprites <= 350, `${mapId}: prop sprite pool remained <=350`);
    console.log(`${mapId}: ${result.simSeconds.toFixed(1)} simulated s, ${result.frames} frames, FPS=${result.frameMs.estimatedFps.toFixed(1)}, p95=${result.frameMs.p95.toFixed(2)}ms, peak sprites=${result.streaming.peakAllocatedSprites}`);
    await context.close();
  }
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.httpErrors.length, 0, report.httpErrors.join('\n'));
} finally {
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await server.close();
}
