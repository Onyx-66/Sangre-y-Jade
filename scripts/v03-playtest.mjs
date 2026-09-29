import { chromium } from 'playwright-core';
import { mkdirSync,writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[];
mkdirSync('artifacts/v0.3',{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
const check=(value,name)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
const scene=fn=>page.evaluate(fn);
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.locator('[data-skip]').click();
 for(const locale of ['fr','ar','en']){
  await page.selectOption('[data-language]',locale);
  check(await page.locator('html').getAttribute('lang')===locale,`${locale}: language selector applies`);
  check(await page.locator('html').getAttribute('dir')===(locale==='ar'?'rtl':'ltr'),`${locale}: correct text direction`);
  for(const menu of ['showTitle','showSettings','showRunSetup','showShrine','showStore','showCodex']){
   await page.evaluate(method=>window.__SANGRE_Y_JADE__[method](),menu);
   await page.screenshot({path:`artifacts/v0.3/${locale}-${menu}.png`});
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${locale}: ${menu} has no page overflow`);
  }
  if(locale!=='en'){
   await page.evaluate(()=>window.__SANGRE_Y_JADE__.playPrologue(()=>window.__SANGRE_Y_JADE__.showTitle()));
   await page.locator('.subtitle').waitFor();await page.waitForTimeout(1100);
   const sub=await page.locator('.subtitle').innerText();
   check(locale==='ar'?/[\u0600-\u06ff]/.test(sub):sub.startsWith('Les cités'),`${locale}: progressive intro translated`);
   await page.screenshot({path:`artifacts/v0.3/${locale}-intro.png`});await page.locator('[data-skip]').click();
  }
 }
 await page.evaluate(()=>window.__SANGRE_Y_JADE__.showRunSetup());
 await page.selectOption('#run-attack','manual');await page.locator('[data-start]').click();await page.locator('.hud').waitFor();
 await page.waitForTimeout(400);
 await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.armor=999;s.updateDirector=()=>{};s.enemies.clear(true,true);s.testAttacks=0;const original=s.autoAttack.bind(s);s.autoAttack=()=>{s.testAttacks++;original();};});
 await page.waitForTimeout(950);
 check(await scene(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').testAttacks===0),'Manual mode does not attack while idle');
 await page.keyboard.down('KeyF');await page.waitForTimeout(800);await page.keyboard.up('KeyF');
 check(await scene(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').testAttacks>0),'F triggers manual attacks');
 const attackBounds=await page.locator('[data-attack]').boundingBox();await page.mouse.move(attackBounds.x+20,attackBounds.y+20);await page.mouse.down();await page.waitForTimeout(800);await page.mouse.up();
 for(const [key,direction] of [['KeyW','up'],['KeyS','down'],['KeyA','side'],['KeyD','side']]){
  await page.keyboard.down(key);await page.waitForTimeout(650);
  const state=await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return{facing:s.facing,texture:s.player.texture.key,flip:s.player.flipX};});
  await page.keyboard.up(key);check(state.facing===direction,`${key}: correct facing`);
  if(direction!=='side')check(state.texture===`hero-balam-${direction}`,`${direction}: actual directional sprite`);
  else check(state.flip===(key==='KeyA'),`${key}: left/right appearance preserved`);
 }
 check(await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=9;s.elapsed=550;for(let i=0;i<90;i++)s.spawnEnemy();const v=s.cameras.main.worldView;return s.enemies.getChildren().every(e=>e.getData('type')!=='bat'&&(e.x<v.x||e.x>v.right||e.y<v.y||e.y>v.bottom))&&s.spawnEnemy('bat')===null;}),'Melee spawns stay offscreen and exclude flying enemies');
 await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.enemies.clear(true,true);s.elapsed=50;s.stats.level=4;s.stats.xp=s.stats.nextXp;s.checkLevelUp();});
 check(await scene(()=>!!window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').companion),'Level 5 summons teammate');
 await page.locator('.choice-card').first().click();
 check((await page.locator('[data-ally]').innerText()).includes('Kukul'),'HUD names the teammate');
 check(await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.spawnEnemy('shade',180);s.companion.shot=0;s.updateCompanion(.01);return s.projectiles.countActive()>0;}),'Teammate fires at enemies');
 await page.screenshot({path:'artifacts/v0.3/gameplay-ally.png'});
 await scene(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.settings.attackMode='auto';s.testAttacks=0;s.autoTimer=0;});await page.waitForTimeout(300);
 check(await scene(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').testAttacks>0),'Automatic mode attacks without input');
 await page.evaluate(()=>window.__SANGRE_Y_JADE__.showTitle());await page.selectOption('[data-language]','ar');
 await page.reload({waitUntil:'networkidle'});check(await page.locator('html').getAttribute('lang')==='ar','Language survives reload');
 for(const viewport of [{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>window.__SANGRE_Y_JADE__.showRunSetup());
  await page.screenshot({path:`artifacts/v0.3/ar-setup-${viewport.width}.png`});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Arabic mobile setup fits width');
  await page.locator('[data-start]').click();await page.locator('.hud').waitFor();await page.waitForTimeout(500);
  await page.screenshot({path:`artifacts/v0.3/ar-game-${viewport.width}.png`});
  check((await page.locator('.xp label').innerText()).includes('المستوى'),'Arabic HUD updates in Arabic');
  const bounds=await page.locator('[data-attack]').boundingBox();check(bounds&&bounds.x>=0&&bounds.x+bounds.width<=viewport.width,'Mobile manual attack control fits');
  await page.evaluate(()=>window.__SANGRE_Y_JADE__.showTitle());
 }
 check(errors.length===0,'No runtime JavaScript errors');
}finally{writeFileSync('artifacts/v0.3/playtest.json',JSON.stringify({checks,errors},null,2));await browser.close();console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,checks,errors},null,2));}
