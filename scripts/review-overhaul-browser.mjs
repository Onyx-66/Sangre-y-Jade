// Real-Phaser review probes, including negative evidence. No production debug API added.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
const output = 'docs/skills-redesign/review';
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 568, height: 320 }, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
const report = { date: '2026-10-03', browser: browser.version(), physicalPhone: false, checks: [], errors: [], knownGaps: [] };
page.on('pageerror', error => report.errors.push(error.stack));
page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
try {
  await page.addInitScript(() => localStorage.setItem('sangre-y-jade-v0.1', JSON.stringify({ prologueRevision: 2 })));
  await page.goto(base);
  await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__);
  for (const hero of ['balam', 'ixchel', 'kukul']) {
    await page.evaluate(async hero => {
      const { setLanguage } = await import('/src/i18n/index.js'); setLanguage('en');
      const app = window.__SANGRE_Y_JADE__;
      app.save.setSetting('attackMode', 'manual');
      app.save.setSetting('master', .1);
      app.lastSelection.heroId = hero;
      await app.startRun();
    }, hero);
    await page.locator('.hud').waitFor();
    await page.evaluate(() => {
      const app = window.__SANGRE_Y_JADE__, s = app.game.scene.getScene('Ritual');
      app.audio.unlock();
      s.invulnerable = 1e6; s.stats.level = s.loadoutLevel = 20;
      s.stats.mana = s.stats.maxMana = 100000;
      s.collectPickup = () => {}; s.updateDirector = () => {};
      s.skillSlots = s.heroData.skills.slice(0, 4).map(skill => ({ ...skill, level: 1, remaining: 0 }));
      s.hud.setSkills(s.skillSlots, 4);
      s.reviewCasts = 0; s.passives.bus.on('skillCast', () => s.reviewCasts++);
      s.spawnEnemy('shade', 1);
      const enemy = s.enemies.getChildren().at(-1);
      enemy.body.reset(s.player.x + 75, s.player.y); enemy.setData({ hp: 1e7, maxHp: 1e7, speed: 0 });
    });
    // Skill input remains manual even while the basic attack mode is automatic.
    for (const mode of ['manual', 'auto']) {
      await page.evaluate(mode => {
        const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
        s.settings.attackMode = mode; s.skillSlots[0].remaining = 0;
      }, mode);
      const before = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').reviewCasts);
      await page.locator('[data-skill="0"]').click();
      const after = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').reviewCasts);
      assert.equal(after, before + 1, `${hero}/${mode} skill button`);
      report.checks.push({ hero, check: `${mode} skill input`, passed: true });
    }
    for (const locale of ['en', 'fr', 'ar']) {
      await page.evaluate(async locale => {
        const { setLanguage } = await import('/src/i18n/index.js'); setLanguage(locale);
        const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
        s.hud.setSkills(s.skillSlots, 4); s.updateHud();
      }, locale);
      for (const [width, height] of [[568, 320], [320, 568]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const layout = await page.evaluate(() => ({ direction: document.documentElement.dir,
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
          outside: [...document.querySelectorAll('[data-skill],[data-passive],[data-innate],[data-dash],[data-attack],.ally-panel')]
            .filter(el => !el.hidden).filter(el => { const r = el.getBoundingClientRect(); return r.left < -.5 || r.top < -.5 || r.right > innerWidth + .5 || r.bottom > innerHeight + .5; }).map(el => el.className),
        }));
        assert.equal(layout.direction, locale === 'ar' ? 'rtl' : 'ltr');
        assert.equal(layout.overflow, false); assert.deepEqual(layout.outside, []);
        report.checks.push({ hero, check: `resize ${locale} ${width}x${height}`, ...layout, passed: true });
      }
    }
    const language = await page.evaluate(async () => {
      const { t } = await import('/src/i18n/index.js');
      return { actual: document.querySelector('.pause-btn').getAttribute('aria-label'), expected: t('Pause') };
    });
    if (language.actual !== language.expected) report.knownGaps.push({ hero, check: 'mid-run locale switch leaves mounted static labels stale', ...language });
    const paused = await page.evaluate(() => {
      const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'); s.togglePause();
      return { elapsed: s.elapsed, casts: s.reviewCasts, mana: s.stats.mana };
    });
    await page.waitForTimeout(250);
    assert.deepEqual(await page.evaluate(() => {
      const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
      return { elapsed: s.elapsed, casts: s.reviewCasts, mana: s.stats.mana };
    }), paused);
    await page.locator('[data-resume]').click();
    report.checks.push({ hero, check: 'pause freezes simulation and skill state', passed: true });
    const lifecycle = await page.evaluate(async () => {
      const app = window.__SANGRE_Y_JADE__, s = app.game.scene.getScene('Ritual');
      for (let n = 0; n < 80; n++) s.fx.play('jade-bounty', 'proc', { x: s.player.x, y: s.player.y, sound: false });
      s.fx.prune(); const peak = s.fx.liveUnits;
      const audio = s.skillAudio;
      audio.loop('war-drum', { duration: 6 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const before = { fx: s.fx.liveUnits, voices: audio.voices.filter(voice => !voice.stopped).length, context: audio.context?.state };
      app.clearGame();
      for (let n = 0; n < 100 && !s.cleaned; n++) await new Promise(resolve => setTimeout(resolve, 20));
      await new Promise(resolve => setTimeout(resolve, 100));
      return { peak, before, cleaned: s.cleaned, effects: s.fx.liveUnits,
        voices: audio.voices.filter(voice => !voice.stopped).length, loops: audio.loops.size,
        clients: app.audio.effectClients.size, context: audio.context?.state,
        updateListeners: s.events.listenerCount('update'), huds: document.querySelectorAll('.hud').length };
    });
    assert.ok(lifecycle.peak <= 24);
    assert.equal(lifecycle.cleaned, true); assert.equal(lifecycle.effects, 0); assert.equal(lifecycle.voices, 0);
    assert.equal(lifecycle.loops, 0); assert.equal(lifecycle.clients, 0); assert.equal(lifecycle.huds, 0);
    assert.equal(lifecycle.updateListeners, 0); assert.equal(lifecycle.context, 'closed');
    report.checks.push({ hero, check: 'FX cap and run shutdown', ...lifecycle, passed: true });
    console.log(`${hero}: input, resize, pause, FX/audio shutdown checked`);
  }
  assert.deepEqual(report.errors, []);
  report.passed = report.knownGaps.length === 0;
  if (!report.passed) process.exitCode = 1;
  console.log(`${report.checks.length} passed probes; ${report.knownGaps.length} known locale-refresh findings; ${report.errors.length} runtime errors`);
} catch (error) {
  report.failure = error.stack; process.exitCode = 1; console.error(error);
} finally {
  await fs.writeFile(`${output}/browser.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await server.close();
}
