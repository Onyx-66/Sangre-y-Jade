import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const started = performance.now(), output = path.resolve('docs/v0.6/previews/v3');
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ deviceScaleFactor: 1, serviceWorkers: 'block' });
await context.addInitScript(() => localStorage.setItem('sangre-y-jade-v0.1', JSON.stringify({ prologueRevision: 2, cacao: 1234, settings: { attackMode: 'manual' } })));
const page = await context.newPage(), errors = [], checks = [], layouts = [], shots = [];
page.on('pageerror', error => errors.push(error.stack));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const check = (condition, label) => { checks.push({ label, passed: !!condition }); assert.ok(condition, label); };

function audit() {
  const root = document.querySelector('.kit-screen'), failures = [], boxes = [];
  const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const inside = (a, b) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.right <= b.right + 1 && a.bottom <= b.bottom + 1;
  const horizontal = (a,b) => a.x >= b.x - 1 && a.right <= b.right + 1;
  const scrollRegion = el => { for(let p=el.parentElement;p&&p!==root;p=p.parentElement)if(/auto|scroll/.test(getComputedStyle(p).overflowY)&&p.scrollHeight>p.clientHeight+1)return p; return null; };
  const viewport = { x: 0, y: 0, right: innerWidth, bottom: innerHeight };
  for (const el of root.querySelectorAll('button,select,.selection-cards,.selection-header,.menu-title-logo,.menu-actions')) {
    const box = rect(el); boxes.push({ selector: el.dataset.hero || el.dataset.map || el.dataset.action || el.className, ...box });
    if (!horizontal(box, viewport) || (!scrollRegion(el) && !inside(box, viewport))) failures.push(`outside viewport: ${el.className} ${el.textContent.trim()}`);
    if (el.matches('button,select') && (box.width < 44 || box.height < 44)) failures.push(`small touch target: ${el.textContent.trim()}`);
    if (el.scrollWidth > el.clientWidth + 2 || (el.scrollHeight > el.clientHeight + 2 && !/auto|scroll/.test(getComputedStyle(el).overflowY))) failures.push(`overflow: ${el.className} ${el.textContent.trim()}`);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement, text = node.textContent.trim();
    if (!text || el.closest('option,script,style,[hidden]')) continue;
    const owner = el.closest('button,.kit-title,.selection-subtitle,.version') || root;
    const range = document.createRange(); range.selectNodeContents(node);
    const style = getComputedStyle(el);
    for (const box of range.getClientRects()) {
      if (!horizontal(box,viewport) || !horizontal(box,rect(owner)) || (!scrollRegion(el) && (!inside(box, viewport) || !inside(box, rect(owner))))) failures.push(`text bounds: ${text}`);
    }
    if (parseFloat(style.fontSize) < 14) failures.push(`small copy: ${text}`);
    if (parseFloat(style.lineHeight) < parseFloat(style.fontSize) * 1.35 - .1) failures.push(`line height: ${text}`);
    if (style.fontFamily.startsWith('"Jersey 15",') && style.fontWeight !== '400') failures.push(`bold Jersey: ${text}`);
  }
  const touch = [...root.querySelectorAll('button,select')].map(el => ({ el, box: rect(el) }));
  for (let i = 0; i < touch.length; i++) for (let j = i + 1; j < touch.length; j++) {
    const a = touch[i], b = touch[j];
    if (!scrollRegion(a.el) && !scrollRegion(b.el) && Math.min(a.box.right,b.box.right)-Math.max(a.box.x,b.box.x)>1 && Math.min(a.box.bottom,b.box.bottom)-Math.max(a.box.y,b.box.y)>1)
      failures.push(`overlap: ${a.el.textContent.trim()} / ${b.el.textContent.trim()}`);
  }
  for (const el of root.querySelectorAll('.hero-description')) {
    const style = getComputedStyle(el), range = document.createRange(); range.selectNodeContents(el);
    const rows = new Set([...range.getClientRects()].map(r => Math.round(r.y)));
    if (rows.size > 2) failures.push(`description longer than two lines: ${el.textContent}`);
    if (el.offsetHeight > parseFloat(style.lineHeight) * 2 + 2) failures.push('description box taller than two lines');
  }
  if (root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1) failures.push('screen scrolls');
  return { failures: [...new Set(failures)], boxes };
}

async function show(locale, screen) {
  await page.evaluate(async ({ locale, screen }) => {
    const { setLanguage } = await import('/src/i18n/index.js'); setLanguage(locale);
    const app = window.__SANGRE_Y_JADE__;
    if (screen === 'menu') app.showTitle();
    else { app.setupStep = screen === 'hero' ? 0 : 1; app.showRunSetup(); }
  }, { locale, screen });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.kit-screen img')].every(img => img.complete && img.naturalWidth));
}

try {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.locator('[data-action=play]').waitFor();
  for (const size of [{ width: 568, height: 320 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(size);
    for (const locale of ['en','fr','ar']) for (const screen of ['menu','hero','map']) {
      console.log(`Menu V3: ${size.width}x${size.height} ${locale} ${screen}`);
      await show(locale, screen); await page.mouse.move(0, 0);
      const file = `${locale}-${screen}-${size.width}x${size.height}.png`;
      await page.screenshot({ path: path.join(output, file), animations: 'disabled' }); shots.push({ file, ...size });
      const result = await page.evaluate(audit); layouts.push({ locale, screen, ...size, ...result });
      check(result.failures.length === 0, `${file}: no overflow/overlap, 44dp targets, two-line descriptions: ${result.failures.join('; ')}`);
      if (screen === 'menu') {
        check(await page.locator('.brand-lockup,h1,.tagline,.brand-logo,.eyebrow').count() === 0, `${file}: old title block absent`);
        check(await page.locator('.menu-title-logo').evaluate(img => new URL(img.src).pathname) === '/assets/branding/logo-title.png', `${file}: supplied wordmark used`);
        check(await page.locator('.menu-secondary-grid button').count() === 5, `${file}: five secondary actions, including text Settings`);
      }
      if (screen === 'hero') {
        check(await page.locator('[data-hero]').count() === 3 && await page.locator('[data-hero][aria-pressed=true]').count() === 1, `${file}: three heroes, one selection`);
        check(await page.locator('[data-hero][aria-pressed=true] [data-hero-trait]').count() === 2, `${file}: selected hero shows two innate traits`);
        for (const id of ['ixchel','kukul','balam']) {
          await page.locator(`[data-hero=${id}]`).click();
          const selected = await page.evaluate(audit);
          check(selected.failures.length === 0, `${file} selected ${id}: ${selected.failures.join('; ')}`);
        }
      }
      if (screen === 'map') {
        check(await page.locator('[data-map]').count() === 3, `${file}: three map cards`);
        const files = await page.locator('.selection-map-art').evaluateAll(images => images.map(img => new URL(img.src).pathname));
        check(files.join(',') === '/assets/pixel/story-0.webp,/assets/pixel/story-3.webp,/assets/pixel/story-2.webp', `${file}: existing map images kept`);
      }
    }
  }
  // Additional portrait safety check, without widening the requested screen redesign.
  await page.setViewportSize({ width: 320, height: 568 });
  for (const locale of ['en','ar']) for (const screen of ['menu','hero','map']) {
    await show(locale, screen); const result = await page.evaluate(audit);
    check(result.failures.length === 0, `portrait ${locale} ${screen}: ${result.failures.join('; ')}`);
  }

  await page.setViewportSize({ width: 568, height: 320 }); await show('en','menu');
  const damaged = await page.addStyleTag({ content: '.menu-actions{width:900px!important}' });
  check((await page.evaluate(audit)).failures.length > 0, 'layout audit rejects deliberately oversized controls');
  await damaged.evaluate(el => el.remove());
  await page.locator('[data-action=play]').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-setup-step="0"]').waitFor();
  await page.locator('[data-hero=balam]').focus(); await page.keyboard.press('ArrowRight');
  check(await page.locator('[data-hero=ixchel]').evaluate(el => el === document.activeElement), 'arrow keys follow card geometry');
  check(await page.locator('[data-hero=ixchel]').evaluate(el => getComputedStyle(el).outlineStyle === 'solid'), 'keyboard has a visible focus ring');
  await page.keyboard.press('Enter');
  check(await page.locator('[data-hero=ixchel]').evaluate(el => el === document.activeElement && el.getAttribute('aria-pressed') === 'true'), 'selection rerender preserves keyboard focus');
  await page.selectOption('[data-language]', 'ar');
  check(await page.locator('[data-setup-step="0"]').count() === 1 && await page.locator('[data-hero=ixchel]').getAttribute('aria-pressed') === 'true', 'language selector keeps current wizard step and hero');
  await page.locator('[data-next]').click(); await page.locator('[data-map=cenote]').click();
  await page.locator('[data-back]').click();
  check(await page.locator('[data-hero=ixchel]').getAttribute('aria-pressed') === 'true', 'Back preserves selection');
  await page.keyboard.press('Escape'); await page.locator('[data-action=play]').waitFor();

  // Real requestAnimationFrame polling with a deterministic virtual standard gamepad.
  await page.evaluate(() => { window.menuTestPad = { buttons: Array.from({length:16},()=>({pressed:false})), axes:[0,0] };
    Object.defineProperty(navigator,'getGamepads',{ configurable:true, value:()=>[window.menuTestPad] });
    document.querySelector('[data-action=play]').focus(); window.menuTestPad.buttons[0].pressed = true; });
  await page.locator('[data-setup-step="0"]').waitFor();
  await page.evaluate(() => { window.menuTestPad.buttons[0].pressed=false;document.querySelector('[data-hero=balam]').focus();window.menuTestPad.buttons[14].pressed=true; });
  await page.waitForFunction(() => document.activeElement?.dataset.hero === 'ixchel');
  check(await page.locator('[data-hero=ixchel]').evaluate(el => getComputedStyle(el).outlineStyle==='solid'), 'RTL gamepad follows physical card positions with visible focus ring');
  await page.evaluate(() => { window.menuTestPad.buttons[14].pressed=false; window.menuTestPad.buttons[0].pressed=true; });
  await page.waitForFunction(() => document.querySelector('[data-hero=ixchel]')?.getAttribute('aria-pressed')==='true');
  await page.evaluate(() => { window.menuTestPad.buttons[0].pressed=false; });
  await page.waitForTimeout(250);
  await page.evaluate(() => { window.menuTestPad.buttons[1].pressed=true; });
  await page.locator('[data-action=play]').waitFor();
  await page.evaluate(() => { window.menuTestPad=null; });

  // Preserve the existing four-step flow and real audio hooks through an actual run.
  await show('en','menu');
  await page.evaluate(() => { const app=window.__SANGRE_Y_JADE__,original=app.audio.sfx.bind(app.audio);window.menuSounds=[];app.audio.sfx=(...args)=>{window.menuSounds.push(args[0]);return original(...args);}; });
  await page.locator('[data-action=play]').click(); await page.locator('[data-hero=kukul]').click();
  await page.locator('[data-next]').click(); await page.locator('[data-map=bloodmoon]').click();
  await page.locator('[data-next]').click(); await page.locator('[data-mode=quick]').click();
  await page.locator('[data-next]').click(); await page.selectOption('#run-attack','manual');
  await page.locator('[data-start]').click(); await page.locator('.hud').waitFor();
  check(await page.evaluate(() => { const app=window.__SANGRE_Y_JADE__,s=app.game.scene.getScene('Ritual');return s.heroData.id==='kukul'&&app.lastSelection.mapId==='bloodmoon'&&app.save.data.settings.attackMode==='manual'&&app.screenCleanup===null; }), 'menu → hero → map → mode → controls → playable run; menu listeners disposed');
  check(await page.evaluate(()=>window.menuSounds.filter(id=>id==='click').length>=8), 'existing click/confirm hooks still play audio');
  await page.keyboard.press('ArrowRight');
  check(await page.locator('.kit-screen').count()===0, 'menu navigation does not reappear during gameplay');
  check(errors.length === 0, `no console/page/HTTP errors: ${errors.join('; ')}`);
  console.log(`Menu V3: ${checks.length} checks passed, ${shots.length} screenshots.`);
} finally {
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,errors,layouts,durationMs:performance.now()-started},null,2));
  // One labelled review sheet per locale/viewport; all requested screens remain full-resolution too.
  for (const size of [{width:568,height:320},{width:1280,height:720}]) for(const locale of ['en','fr','ar']) {
    const group=shots.filter(shot=>shot.width===size.width&&shot.file.startsWith(`${locale}-`));
    if(group.length!==3)continue;
    const width=640,height=Math.round(size.height*width/size.width),label=30;
    const composite=[];
    for(let i=0;i<group.length;i++){
      composite.push({input:await sharp(path.join(output,group[i].file)).resize(width,height).png().toBuffer(),left:0,top:i*(height+label)+label});
      composite.push({input:Buffer.from(`<svg width="640" height="30"><rect width="100%" height="100%" fill="#181820"/><text x="12" y="21" fill="#ffcf4a" font-size="16">${group[i].file}</text></svg>`),left:0,top:i*(height+label)});
    }
    await sharp({create:{width,height:(height+label)*3,channels:4,background:'#181820'}}).composite(composite).png().toFile(path.join(output,`review-${locale}-${size.width}x${size.height}.png`));
  }
  await browser.close();await server.close();
}
