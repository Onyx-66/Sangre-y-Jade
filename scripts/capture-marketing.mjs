import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = process.env.SYJ_URL || 'http://127.0.0.1:5173/';
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = resolve('release/marketing');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 1 });

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.data.prologueRevision=2;app.save.markIntroSeen();app.showTitle();});
  await page.addStyleTag({ content: `
    .menu-stack,.tagline,.version,.language-switch { display:none !important; }
    .screen { padding:10px !important; align-items:center !important; }
    .brand-lockup { width:610px !important; }
    .brand-lockup h1 { font-size:6.2rem !important; }
  `});
  await page.screenshot({ path: resolve(out, 'cover-630x500.png') });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('sangre-y-jade-v0.1', JSON.stringify({ introSeen: true, prologueRevision:2 })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Play', exact:true }).click();
  await page.getByRole('heading', { name: 'Choose Your Hero' }).waitFor();
  await page.screenshot({ path: resolve(out, 'screenshot-hero-selection.png') });

  await page.locator('[data-hero="balam"]').click();
  await page.locator('[data-next]').click();
  await page.locator('[data-map="overgrown"]').click();
  await page.locator('[data-next]').click();
  await page.locator('[data-mode="quick"]').click();
  await page.locator('[data-next]').click();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await page.locator('.hud').waitFor();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    scene.elapsed = 60;
    scene.nextBossIndex = 3;
    scene.invulnerable = 10;
    scene.skillSlots = scene.heroData.skills.slice(0, 3).map((skill, i) => ({ ...skill, level: i + 1, remaining: 0 }));
    scene.hud.setSkills(scene.skillSlots);
    for (let i = 0; i < 34; i += 1) {
      const types = ['shade', 'bat', 'serpent', 'jaguar'];
      scene.spawnEnemy(types[i % types.length], 165 + (i % 7) * 34);
    }
    scene.castSkill(0);
    scene.castSkill(1);
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: resolve(out, 'screenshot-gameplay.png') });

  await page.evaluate(() => {
    const scene = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    scene.enemies.clear(true, true);
    scene.spawnBoss({ id: 'camazotz', name: 'Camazotz, the Death Bat', hp: 850, speed: 112, damage: 16, pattern: 'dash' });
    scene.activeBoss.x = scene.player.x + 260;
    scene.activeBoss.y = scene.player.y - 100;
    for (let i = 0; i < 16; i += 1) scene.spawnEnemy(i % 2 ? 'bat' : 'shade', 220 + (i % 5) * 30);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(out, 'screenshot-boss.png') });
} finally {
  await browser.close();
}

console.log(`Marketing images saved to ${out}`);

