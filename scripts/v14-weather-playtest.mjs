import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const maps = ['overgrown', 'bloodmoon', 'cenote'];
const outputDir = path.resolve('docs/v0.6/previews/v14');
const report = { createdAt: new Date().toISOString(), viewport: { width: 1280, height: 720 }, maps: [], errors: [], optionalWeatherAssetsMissing: [] };
await fs.mkdir(outputDir, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0,
  watch: { ignored: ['**/docs/**', '**/.tools/**'] } }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

try {
  for (const mapId of maps) {
    const context = await browser.newContext({ viewport: report.viewport, serviceWorkers: 'block' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/assets/pixel/weather/')) report.optionalWeatherAssetsMissing.push(response.url());
      else if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__);
    await page.evaluate(async mapId => {
      const app = window.__SANGRE_Y_JADE__;
      app.cancelPrologue?.();
      app.lastSelection = { heroId: 'kukul', mapId, modeId: 'quick' };
      app.save.setSetting('master', 0);
      app.save.setSetting('reducedMotion', true);
      app.save.setSetting('reduceFlashing', false);
      await app.startRun();
    }, mapId);
    await page.locator('.hud').waitFor();
    const state = await page.evaluate(mapId => {
      const game = window.__SANGRE_Y_JADE__.game;
      const scene = game.scene.getScene('Ritual');
      scene.update = () => {};
      const weather = scene.weather;
      weather.clock = weather.event.nextAt - 0.05;
      weather.update(0.05);
      const scheduled = weather.event.activeUntil > weather.clock;
      if (mapId === 'bloodmoon') weather.triggerLightning();
      for (let i = 0; i < 30; i++) weather.update(0.05);
      const rockfallMarker = mapId === 'cenote' ? weather.spawnRockfallMarker() : false;
      if (rockfallMarker) scene.telegraphs.draw();
      weather.drawOverlays();
      return { mapId, event: weather.event?.id, scheduled, rockfallMarker,
        quality: weather.quality, particles: weather.particleCount, cap: weather.maxParticles,
        torchGlows: weather.lightSources.length, telegraphs: scene.telegraphs.live.size,
        visibilityReduction: weather.visibilityReduction };
    }, mapId);
    await page.waitForTimeout(2200);
    assert.equal(state.scheduled, true, `${mapId}: timed weather event is renderable`);
    assert.ok(state.particles <= state.cap, `${mapId}: weather respects its pool cap`);
    if (mapId === 'cenote') assert.equal(state.rockfallMarker, true);
    const screenshot = path.join(outputDir, `${mapId}-weather-1280x720.png`);
    await page.screenshot({ path: screenshot });
    report.maps.push({ ...state, screenshot: path.relative(process.cwd(), screenshot), errors });
    report.errors.push(...errors.map(error => `${mapId}: ${error}`));
    await context.close();
  }
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
} finally {
  await fs.writeFile(path.join(outputDir, 'weather-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await server.close();
}
console.log(`Weather screenshots saved to ${outputDir}`);
