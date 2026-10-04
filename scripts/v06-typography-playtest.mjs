import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const started = performance.now(), output = path.resolve('docs/v0.6/previews/v1');
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 568, height: 320 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
await context.addInitScript(() => localStorage.setItem('sangre-y-jade-v0.1', JSON.stringify({ prologueRevision: 2, settings: { attackMode: 'manual' } })));
const page = await context.newPage(), checks = [], errors = [], layouts = [];
page.on('pageerror', error => errors.push(error.stack));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const check = (condition, label) => { checks.push({ label, passed: !!condition }); assert.ok(condition, label); };

function audit(selector) {
  const root = document.querySelector(selector), failures = [], samples = [];
  const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const viewport = { x: 0, y: 0, right: innerWidth, bottom: innerHeight };
  const inside = (a, b, slack = 1) => a.x >= b.x - slack && a.y >= b.y - slack && a.right <= b.right + slack && a.bottom <= b.bottom + slack;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement, text = node.textContent.trim();
    if (!text || el.closest('script,style,option,[hidden]') || !el.getClientRects().length) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const range = document.createRange(); range.selectNodeContents(node);
    const boxes = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    const scroller = el.closest('.settings-content,.skills-readonly .card-grid');
    const clip = scroller && rect(scroller);
    // Scrollable settings are intentionally a bounded list. Audit all of them
    // horizontally, and only visible text against the viewport vertically.
    const owner = el.closest('.choice-card,.btn,.skill-tooltip,.panel,.modal,.brand-lockup') || root;
    const bounds = rect(owner);
    for (const box of boxes) {
      if (clip && (box.bottom < clip.y || box.top > clip.bottom)) {
        if (box.x < clip.x - 1 || box.right > clip.right + 1) failures.push(`scroll width: ${text}`);
        continue;
      }
      if (!inside(box, viewport)) failures.push(`viewport: ${text}`);
      // A line partially visible at a scroll clip is normal, but must not escape
      // its card/button horizontally or overlap a fixed footer.
      if (!inside(box, bounds)) failures.push(`container: ${text}`);
    }
    if (parseFloat(style.fontSize) < 14 - .1) failures.push(`small body: ${text} ${style.fontSize}`);
    if (parseFloat(style.lineHeight) < parseFloat(style.fontSize) * 1.35 - .1) failures.push(`line height: ${text} ${style.lineHeight}`);
    if (style.fontFamily.startsWith('"Jersey 15",') && style.fontWeight !== '400') failures.push(`bold Jersey: ${text}`);
    samples.push({ text, family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight });
  }
  const buttons = [...root.querySelectorAll('.btn')].filter(el => el.getClientRects().length).map(rect);
  for (const box of buttons) if (!inside(box, viewport)) failures.push('action outside screen');
  const cards = [...root.querySelectorAll('.choice-card')].map(el => ({ el, r: rect(el) }));
  for (const { el, r } of cards) {
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) failures.push(`card overflow: ${el.textContent.trim().slice(0, 50)}`);
    for (const button of buttons) if (Math.min(r.right, button.right) - Math.max(r.x, button.x) > 1 && Math.min(r.bottom, button.bottom) - Math.max(r.y, button.y) > 1)
      failures.push('card/action overlap');
  }
  return { failures: [...new Set(failures)], samples, fonts: window.__SANGRE_Y_JADE__?.typography };
}

try {
  console.log('Typography: checking cold font-loading gate.');
  let releaseFont, seenFont;
  const hold = new Promise(resolve => { releaseFont = resolve; });
  const seen = new Promise(resolve => { seenFont = resolve; });
  await page.route(/NotoSansArabic.*\.ttf/, async route => {
    if (route.request().resourceType() !== 'font') return route.continue();
    seenFont(); await hold; await route.continue();
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`, { waitUntil: 'commit' });
  let fontTimeout;
  try { await Promise.race([seen, new Promise((_, reject) => { fontTimeout = setTimeout(() => reject(new Error('No Arabic font request seen during cold startup')), 30000); })]); }
  finally { clearTimeout(fontTimeout); }
  check(await page.evaluate(() => !document.querySelector('#ui-root').children.length && !document.querySelector('canvas') && !window.__SANGRE_Y_JADE__),
    'delayed font request blocks first menu and Phaser, not just fonts.ready after rendering');
  releaseFont(); await page.locator('[data-action=play]').waitFor(); await page.unroute(/NotoSansArabic.*\.ttf/);
  check(await page.evaluate(() => document.documentElement.dataset.fontsReady === 'true' &&
    ['Jersey 15','Atkinson Hyperlegible','Noto Sans Arabic'].every(family => [...document.fonts].some(face => face.family.replaceAll('"','') === family && face.status === 'loaded')) &&
    window.__SANGRE_Y_JADE__.typography.missing.length === 0), 'all three bundled font families actually loaded before menu');
  // Prove the bounds test can fail on a real, deliberately damaged layout.
  const bad = await page.addStyleTag({ content: '.brand-lockup .btn{width:900px!important}' });
  check((await page.evaluate(audit, '.screen')).failures.length > 0, 'overflow detector rejects deliberately oversized menu buttons');
  await bad.evaluate(el => el.remove());
  for (const locale of ['en', 'fr', 'ar']) {
    console.log(`Typography: checking ${locale} screens and all hero/stat card copy.`);
    await page.evaluate(async locale => { const { setLanguage } = await import('/src/i18n/index.js'); setLanguage(locale); window.__SANGRE_Y_JADE__.showTitle(); }, locale);
    for (const screen of ['menu', 'hero', 'settings', 'level-up']) {
      await page.evaluate(async screen => {
        const app = window.__SANGRE_Y_JADE__;
        if (screen === 'menu') app.showTitle();
        if (screen === 'hero') { app.setupStep = 0; app.showRunSetup(); }
        if (screen === 'settings') app.showSettings();
        if (screen === 'level-up') {
          app.lastSelection.heroId = 'ixchel'; await app.startRun();
        }
      }, screen);
      if (screen === 'level-up') {
        await page.locator('.hud').waitFor();
        await page.evaluate(() => {
          const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
          s.invulnerable = 10000; s.spawnTimer = 10000; s.stats.xp = s.stats.nextXp; s.checkLevelUp();
          s.hud.el.querySelectorAll('.toast').forEach(el => el.remove());
        });
        await page.locator('.skill-pick').waitFor();
      }
      await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
      const selector = screen === 'level-up' ? '.skill-pick .modal' : '.screen';
      const result = await page.evaluate(audit, selector); layouts.push({ locale, screen, ...result });
      await page.screenshot({ path: path.join(output, `${locale}-${screen}-568x320.png`) });
      check(result.failures.length === 0, `${locale} ${screen}: readable text and no overflow: ${result.failures.join('; ')}`);
      if (screen === 'settings') {
        // Read the entire scrollable list; not just the initial audio sliders.
        await page.locator('.settings-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
        const bottom = await page.evaluate(audit, selector); layouts.push({ locale, screen: 'settings-bottom', ...bottom });
        check(bottom.failures.length === 0, `${locale} settings bottom: ${bottom.failures.join('; ')}`);
        await page.screenshot({ path: path.join(output, `${locale}-settings-bottom-568x320.png`) });
      }
      if (screen === 'level-up') {
        const phaser = await page.evaluate(() => {
          const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
          s.floatText(s.player.x, s.player.y, '128');
          s.floatText(s.player.x, s.player.y, 'Level 20');
          return s.children.list.filter(o => o.type === 'Text').map(o => ({ text: o.text, family: o.style.fontFamily, style: o.style.fontStyle }));
        });
        check(phaser.length >= 2 && phaser.every(o => o.style === 'normal' && !/Pixelify|Unixel/.test(o.family)), `${locale}: actual Phaser labels use new styles without synthetic bold`);
        const count = await page.evaluate(async () => {
          const { heroList, MODIFIERS } = await import('/src/data/heroes.js');
          window.typographyCards = [...heroList().flatMap(h => [...h.skills, ...(h.passives || [])]), ...MODIFIERS.map(c => ({ ...c, kind: 'stat' }))];
          return window.typographyCards.length;
        });
        for (let offset = 0; offset < count; offset += 3) {
          await page.evaluate(offset => {
            const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
            s.hud.el.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            s.hud.showChoice('Level 20', window.typographyCards.slice(offset, offset + 3), () => {},
              'Choose an upgrade.', { label: 'Replace a skill', action: () => {} }, { className: 'skill-pick' });
          }, offset);
          const draft = await page.evaluate(audit, '.skill-pick .modal');
          layouts.push({ locale, screen: `card-batch-${offset}`, ...draft });
          if (draft.failures.length) await page.screenshot({ path: path.join(output, `${locale}-card-batch-${offset}.png`) });
          check(draft.failures.length === 0, `${locale} all hero/stat cards batch ${offset}: ${draft.failures.join('; ')}`);
        }
      }
    }
  }
  check(errors.length === 0, `no browser/HTTP errors: ${errors.join('; ')}`);
  console.log(`Typography: ${checks.length} checks passed. Latin font assets: ${JSON.stringify(layouts[0].fonts)}.`);
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, errors, layouts, durationMs: performance.now() - started }, null, 2));
  await browser.close(); await server.close();
}
