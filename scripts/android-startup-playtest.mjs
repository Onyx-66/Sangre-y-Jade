import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const adb = process.env.ADB_BIN || 'C:/Users/kossa/AppData/Local/Android/Sdk/platform-tools/adb.exe';
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const call = (...args) => execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 }).trim();
const output = resolve('artifacts/android-startup');
mkdirSync(output, { recursive: true });
// A fresh emulator may show Android's own fullscreen education above the app.
// CDP clicks bypass it, but real Android Back/touches do not. Dismiss only this
// known system dialog; do not confuse its interception with a game bug.
function dismissFullscreenEducation() {
  if (!/mCurrentFocus=.*ImmersiveModeConfirmation/.test(call('shell', 'dumpsys', 'window'))) return;
  call('shell', 'uiautomator', 'dump', '/sdcard/syj-system-window.xml');
  const ui = call('shell', 'cat', '/sdcard/syj-system-window.xml');
  const ok = ui.match(/resource-id="com\.android\.systemui:id\/ok"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!ok) throw new Error('Fullscreen education is covering the app; its known OK button was not found.');
  call('shell', 'input', 'tap', String((Number(ok[1]) + Number(ok[3])) / 2), String((Number(ok[2]) + Number(ok[4])) / 2));
}
dismissFullscreenEducation();
const pid = call('shell', 'pidof', 'com.sangreyjade.game').split(' ')[0];
if (!pid) throw new Error('The Android game process is not running.');
call('forward', 'tcp:9223', `localabstract:webview_devtools_remote_${pid}`);
let browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
let page = browser.contexts()[0].pages()[0];
const errors = [];
const failedRequests = [];
const watch = target => {
  target.on('pageerror', error => errors.push(error.message));
  target.on('response', response => { if (response.status() >= 400) failedRequests.push({ url: response.url(), status: response.status() }); });
};
watch(page);
const checks = [];
const check = (condition, label) => { checks.push({ label, passed: !!condition }); assert.ok(condition, label); };
const report = { checks, errors, failedRequests, android: call('shell', 'getprop', 'ro.build.version.release') };
try {
  await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__, null, { timeout: 60000 });
  const state = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 1200),
    app: !!window.__SANGRE_Y_JADE__,
    nativeStartup: window.__SANGRE_Y_JADE__?.nativeStartup,
    introImages: document.querySelectorAll('.cinema-image').length,
    fontsComplete: document.documentElement.dataset.fontsComplete,
    viewport: [innerWidth, innerHeight],
    userAgent: navigator.userAgent,
    memory: performance.memory && { used: performance.memory.usedJSHeapSize, limit: performance.memory.jsHeapSizeLimit },
    loader: (() => {
      const load = window.__SANGRE_Y_JADE__?.game?.scene.getScene('RunLoader')?.load;
      return load && { state: load.state, totalToLoad: load.totalToLoad, totalComplete: load.totalComplete, totalFailed: load.totalFailed,
        inflight: load.inflight?.entries?.map(file => ({ key: file.key, state: file.state, url: file.src, xhrStatus: file.xhrLoader?.status })) };
    })(),
  }));
  report.state = state;
  check(state.app && state.fontsComplete === 'true', 'Packaged application and local fonts load');
  if (process.argv.includes('--renderer-crash')) {
    await page.evaluate(() => localStorage.setItem('android-startup-canary', 'preserved'));
    const session = await browser.contexts()[0].newCDPSession(page);
    await Promise.race([session.send('Page.crash').catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
    await new Promise(resolve => setTimeout(resolve, 3000));
    let survivingPid = '';
    try { survivingPid = call('shell', 'pidof', 'com.sangreyjade.game'); } catch {}
    report.rendererCrash = { processSurvived: !!survivingPid, survivingPid };
    report.nativeLog = call('logcat', '-d', `--pid=${pid}`).split('\n').filter(line => /SangreStartup|render.*crash|application crash|Cannot read properties/i.test(line)).join('\n');
    check(!!survivingPid, 'Android host survives the renderer crash');
    await Promise.race([browser.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
    page = browser.contexts()[0].pages()[0];
    watch(page);
    await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__, null, { timeout: 60000 });
    check(await page.evaluate(() => window.__SANGRE_Y_JADE__.nativeStartup.canvas && window.__SANGRE_Y_JADE__.nativeStartup.recovering), 'Recovery selects canvas and returns to the menu');
    check(await page.evaluate(() => localStorage.getItem('android-startup-canary') === 'preserved'), 'Renderer recovery preserves local save storage');
    check(call('shell', 'dumpsys', 'activity', 'activities').split('\n').some(line => /topResumedActivity=.*com.sangreyjade.game/.test(line)), 'Recovered Android game stays in the foreground');
    console.log('Renderer-crash recovery passed.');
  }
  if (process.argv.includes('--smoke')) {
    for (const [hero, map, locale] of [['balam', 'overgrown', 'en'], ['ixchel', 'bloodmoon', 'fr'], ['kukul', 'cenote', 'ar']]) {
      await page.evaluate(() => { const app = window.__SANGRE_Y_JADE__; app.cancelPrologue?.(); app.showTitle(); });
      await page.selectOption('[data-language]', locale);
      await page.locator('[data-action=play]').click();
      await page.locator(`[data-hero="${hero}"]`).click();
      await page.locator('[data-next]').click();
      await page.locator(`[data-map="${map}"]`).click();
      await page.locator('[data-next]').click();
      await page.locator('[data-next]').click();
      const started = Date.now();
      await page.locator('[data-start]').click();
      await page.waitForFunction(() => {
        const app = window.__SANGRE_Y_JADE__, scene = app.game?.scene.getScene('Ritual');
        return scene?.player?.active && !scene.loadingRun && !app.loadingSession;
      }, null, { timeout: 300000 });
      (report.runs ||= []).push({ hero, map, locale, loadingMs: Date.now() - started,
        renderer: await page.evaluate(() => window.__SANGRE_Y_JADE__.game.renderer.type) });
      await page.evaluate(() => {
        const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
        s.invulnerable = 10000;
        // Keep this input/startup smoke independent of random XP drops.
        s.stats.nextXp = 1e9;
      });
      for (let picks = 0; picks < 5 && await page.locator('button[data-choice]').count(); picks++) {
        await page.locator('button[data-choice]').first().click();
      }
      check(await page.locator('[data-fatal]').count() === 0, `${hero}/${map}/${locale}: game loads without fatal errors`);
      const before = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.x);
      const joy = await page.locator('.joystick').boundingBox();
      const session = await browser.contexts()[0].newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: joy.x + joy.width * .82, y: joy.y + joy.height * .5 }] });
      await page.waitForTimeout(1200);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const after = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').player.x);
      check(after > before + 3, `${hero}/${map}/${locale}: touch joystick moves the hero`);
      await page.locator('[data-dash]').click();
      check(await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').dash.cooldown > 0), `${hero}/${map}/${locale}: touch dash works`);
      await page.locator('.pause-btn').click();
      const paused = await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').elapsed);
      await page.waitForTimeout(600);
      check(await page.evaluate(t => { const s = window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'); return s.pausedForChoice && s.elapsed === t; }, paused), `${hero}/${map}/${locale}: pause freezes gameplay`);
      await page.locator('[data-settings]').click();
      dismissFullscreenEducation();
      call('shell', 'input', 'keyevent', '4');
      await page.locator('[data-resume]').waitFor();
      check(await page.evaluate(() => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').pausedForChoice), `${hero}/${map}/${locale}: Android Back closes Settings without resuming`);
      await page.locator('[data-resume]').click();
      await page.waitForTimeout(1500);
      check(await page.evaluate(t => window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').elapsed > t, paused), `${hero}/${map}/${locale}: Resume continues gameplay`);
      if (process.argv.includes('--renderer-crash')) check(await page.evaluate(() => window.__SANGRE_Y_JADE__.game.renderer.type === 1), `${hero}: recovery uses the real Phaser canvas renderer`);
      call('shell', 'screencap', '-p', '/sdcard/syj-startup-smoke.png');
      call('pull', '/sdcard/syj-startup-smoke.png', resolve(output, `${hero}-${locale}-gameplay.png`));
      console.log(`Android gameplay passed: ${hero}/${map}/${locale}.`);
    }
  }
  check(errors.length === 0, 'No JavaScript errors in the Android WebView');
  check(failedRequests.length === 0, 'No missing packaged assets in the Android WebView');
  if (process.argv.includes('--repeat-crash')) {
    check(await page.evaluate(() => window.__SANGRE_Y_JADE__.nativeStartup.canvas), 'Repeated-failure test starts in canvas recovery mode');
    const session = await browser.contexts()[0].newCDPSession(page);
    await Promise.race([session.send('Page.crash').catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
    await new Promise(resolve => setTimeout(resolve, 3000));
    check(!!call('shell', 'pidof', 'com.sangreyjade.game'), 'Android host also survives a second renderer crash');
    call('shell', 'uiautomator', 'dump', '/sdcard/syj-renderer-error.xml');
    const nativeUi = call('shell', 'cat', '/sdcard/syj-renderer-error.xml');
    check(nativeUi.includes('Your saved progress is kept.') && /text="Retry"/i.test(nativeUi), 'Second failure shows a native retry panel instead of an automatic restart loop');
    call('shell', 'screencap', '-p', '/sdcard/syj-renderer-error.png');
    call('pull', '/sdcard/syj-renderer-error.png', resolve(output, 'native-renderer-error.png'));
    const bounds = nativeUi.match(/text="Retry"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i);
    check(!!bounds, 'Native Retry button has a reachable touch target');
    call('shell', 'input', 'tap', String((Number(bounds[1]) + Number(bounds[3])) / 2), String((Number(bounds[2]) + Number(bounds[4])) / 2));
    await Promise.race([browser.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
    browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
    page = browser.contexts()[0].pages()[0];
    watch(page);
    await page.waitForFunction(() => !!window.__SANGRE_Y_JADE__, null, { timeout: 60000 });
    check(await page.evaluate(() => window.__SANGRE_Y_JADE__.nativeStartup.canvas), 'Native Retry restores a running application in safe rendering mode');
    check(await page.evaluate(() => localStorage.getItem('android-startup-canary') === 'preserved'), 'Native Retry keeps the saved-storage canary');
  }
  if (process.argv.includes('--intro')) {
    await page.evaluate(() => {
      const app = window.__SANGRE_Y_JADE__;
      app.cancelPrologue?.();
      app.playPrologue(() => app.showTitle());
    });
    await page.locator('.cinema-image').first().waitFor();
    await page.waitForTimeout(5000);
    check(!!call('shell', 'pidof', 'com.sangreyjade.game'), 'Intro playback keeps the Android host alive');
    await page.locator('[data-skip]').click();
    await page.locator('[data-action=play]').waitFor();
    check(await page.evaluate(() => window.__SANGRE_Y_JADE__.save.data.prologueRevision === 2), 'Intro skip returns to the menu and records completion');
    check(errors.length === 0 && failedRequests.length === 0, 'Intro has no JavaScript errors or missing packaged images');
  }
  console.log(`Android startup smoke: ${checks.length} checks passed.`);
} catch (error) {
  report.failure = error.stack;
  try { report.failureState = await page.evaluate(() => {
    const app = window.__SANGRE_Y_JADE__, scene = app?.game?.scene.getScene('Ritual');
    return { text: document.body.innerText.slice(0, 1500), loading: !!app?.loadingSession,
      scene: scene && { player: !!scene.player?.active, loadingRun: scene.loadingRun, elapsed: scene.elapsed, paused: scene.pausedForChoice } };
  }); } catch {}
  throw error;
} finally {
  writeFileSync(resolve(output, 'startup-report.json'), JSON.stringify(report, null, 2));
  await Promise.race([browser.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]);
}
