import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = process.env.SYJ_URL || 'http://127.0.0.1:5173/';
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifacts = resolve('artifacts');
mkdirSync(artifacts, { recursive: true });
const errors = [];
const checks = [];
const check = (condition, label, detail = '') => {
  checks.push({ label, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`Playtest failed: ${label}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.stack}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.subtitle').waitFor();
  check(await page.locator('.cinema-image').count()===6,'First launch automatically opens six-panel prologue');
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.playPrologue(()=>window.__SANGRE_Y_JADE__.showTitle()));
  const firstSubtitle=await page.locator('.subtitle').innerText();
  await page.waitForTimeout(850);
  check((await page.locator('.subtitle').innerText()).length>firstSubtitle.length,'Subtitles reveal progressively');
  await page.screenshot({path:resolve(artifacts,'prologue-desktop.png')});
  await page.getByRole('button',{name:'Skip Intro'}).click();
  await page.reload({waitUntil:'networkidle'});
  check(await page.locator('.cutscene').count()===0,'Prologue completion persists across reload');
  await page.locator('.brand-lockup h1').waitFor();
  check((await page.locator('.brand-lockup h1').innerText()).includes('Sangre'), 'Title screen renders');
  await page.screenshot({ path: resolve(artifacts, 'title-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'Play', exact:true }).click();
  await page.getByRole('heading', { name: 'Choose Your Hero' }).waitFor();
  check(await page.locator('[data-hero]').count() === 3, 'Three heroes are selectable');
  await page.locator('[data-hero="ixchel"]').click();
  await page.locator('[data-next]').click();
  check(await page.locator('[data-map]').count() === 3, 'Three maps are selectable');
  await page.locator('[data-map="overgrown"]').click();
  await page.locator('[data-next]').click();
  check(await page.locator('[data-mode]').count() === 2, 'Quick and full rites are selectable');

  await page.locator('[data-mode="quick"]').click();
  await page.locator('[data-next]').click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.locator('.hud').waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);
  check(await page.evaluate(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').textures.exists('hero-ixchel-frame-3')),'Hero uses individually loaded animation frames');
  check(await page.locator('.mana').isVisible(), 'Shaman mana bar is visible');
  check(await page.locator('.skill-btn').count() === 4, 'Four active-skill buttons render');

  const before = await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    return { x: scene.player.x, y: scene.player.y, enemies: scene.enemies.countActive() };
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  const after = await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    return { x: scene.player.x, y: scene.player.y, enemies: scene.enemies.countActive() };
  });
  check(after.x > before.x + 20, 'Keyboard movement changes world position', `${before.x} -> ${after.x}`);
  check(after.enemies > 0, 'Enemy director is spawning enemies');

  await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    scene.stats.xp = scene.stats.nextXp;
    scene.checkLevelUp();
  });
  await page.getByRole('heading', { name: 'Level 2' }).waitFor();
  const skillChoice = page.locator('.choice-card').filter({ hasText: 'New skill' }).first();
  check(await skillChoice.count() === 1, 'Level-up guarantees a new skill while a slot is empty');
  await skillChoice.click();
  await page.waitForTimeout(150);
  check(!(await page.locator('.skill-btn').first().getAttribute('class')).includes('empty'), 'Chosen skill enters the first slot');
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(80);
  const cooldown = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').skillSlots[0].remaining);
  check(cooldown > 0, 'Keyboard skill casting starts cooldown');

  await page.keyboard.press('Space');
  const dashCooldown = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').dash.cooldown);
  check(dashCooldown > 0, 'Dash starts invulnerability/cooldown state');
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: 'Paused' }).waitFor();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.screenshot({ path: resolve(artifacts, 'combat-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  const mobile = await page.locator('.hud').boundingBox();
  check(mobile && mobile.width <= 844 && mobile.height <= 390, 'HUD adapts to mobile landscape viewport');
  await page.screenshot({ path: resolve(artifacts, 'combat-mobile.png'), fullPage: true });

  await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').finishRun(false));
  await page.getByRole('heading', { name: 'Game Over' }).waitFor();
  check((await page.locator('.summary-stats').innerText()).includes('Enemies defeated'), 'Run summary records performance');
  await page.screenshot({ path: resolve(artifacts, 'run-summary-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Try Again' }).click();
  await page.locator('.hud').waitFor();
  await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    scene.invulnerable = 20;
    scene.spawnBoss({ id: 'camazotz', name: 'Camazotz, the Death Bat', hp: 80, speed: 112, damage: 16, pattern: 'dash' });
    scene.damageEnemy(scene.activeBoss, 100000);
  });
  await page.getByRole('heading', { name: 'Boss Defeated' }).waitFor();
  await page.locator('.choice-card').first().click();
  const gearCount = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').gear.length);
  check(gearCount === 1, 'Mini-boss grants one rule-changing relic plus a skill choice');
  await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    scene.spawnBoss({ id: 'ahpuch', name: 'Ah Puch, Lord of Xibalba', hp: 100, speed: 76, damage: 30, pattern: 'final' });
    scene.damageEnemy(scene.activeBoss, 100000);
  });
  await page.getByRole('heading', { name: 'Victory!' }).waitFor();
  check((await page.locator('.modal').innerText()).includes('defeated the final boss'), 'Final-boss defeat reaches the victory summary');
  await page.getByRole('button', { name: 'Main Menu' }).click();
  await page.getByRole('button', { name: /Upgrades/ }).click();
  check(await page.locator('.upgrade').count() === 4, 'Progression shrine exposes four permanent upgrade tracks');

  await page.getByRole('button', { name: 'Return' }).click();
  await page.getByRole('button', { name: 'Shop' }).click();
  check(await page.locator('.store-item').count() === 4, 'Supporter catalog renders four non-pay-to-win offerings');
  check(errors.length === 0, 'Runtime console stays clean', errors.join(' | '));
} catch (error) {
  await page.screenshot({ path: resolve(artifacts, 'playtest-failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  const report = { url: URL, generatedAt: new Date().toISOString(), checks, errors };
  writeFileSync(resolve(artifacts, 'playtest-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

console.log(`Playtest passed: ${checks.length} checks, ${errors.length} browser errors.`);

