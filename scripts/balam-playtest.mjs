import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve('docs/skills-redesign/previews/step8');
await fs.mkdir(output,{recursive:true});
const start=performance.now(),server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:568,height:320}}),errors=[];
page.on('pageerror',error=>errors.push(error.stack));
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))errors.push(`${response.status()} ${response.url()}`);});
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection.heroId='balam';app.save.setSetting('attackMode','manual');app.startRun();});
 await page.locator('.hud').waitFor();
 const result=await page.evaluate(async()=>{
  const {HEROES}=await import('/src/data/heroes.js'),{updateSkillEffects}=await import('/src/skills/common.js');
  const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');scene.scene.pause();scene.settings.damageNumbers=false;
  const casts=[],passives=[];
  for(const original of HEROES.balam.skills)for(let level=1;level<=6;level++){
   scene.ended=true;scene.skillEffects.forEach(effect=>effect.destroy());scene.ended=false;scene.skillEffects=[];scene.skillBuffs.clear();scene.skillMotion=scene.balamWard=scene.blackMirror=null;
   scene.enemies.clear(true,true);scene.projectiles.clear(true,true);scene.enemyProjectiles.clear(true,true);
   scene.player.setPosition(0,0).setVelocity(0,0);scene.elapsed=1;scene.stats.hp=scene.stats.maxHp;scene.stats.shield=0;scene.stats.intangibleUntil=scene.stats.reflectUntil=0;scene.stats.crit=0;scene.stats.damageDone=0;scene.invulnerable=10000;
   scene.spawnEnemy('shade',90);const target=scene.enemies.getChildren().at(-1);target.setData({hp:100000,maxHp:100000,speed:0,damage:10});
   scene.stats.level=20;scene.loadoutLevel=20;scene.skillSlots=[{...original,level,remaining:0}];scene.castSkill(0);
   for(let i=0;i<280;i++){scene.elapsed+=.05;scene.passives.emit('tick',{dt:.05});scene.updateProjectiles(.05);updateSkillEffects(scene,.05);}
   casts.push({id:original.id,level,damageDone:scene.stats.damageDone,cooldown:scene.skillSlots[0].remaining,finite:Number.isFinite(scene.stats.damageDone)&&Number.isFinite(scene.player.x)});
  }
  for(const original of HEROES.balam.passives){const entry=scene.passives.equip(original,5);scene.passives.emit('kill',{enemy:scene.enemies.getChildren()[0],byAlly:false});scene.passives.emit('tick',{dt:.05});passives.push({id:original.id,level:entry.level,hasState:!!entry.state.hudState});scene.passives.unequip(original.id);}
  scene.passiveSlots=[{...HEROES.balam.passives[0],level:5},{...HEROES.balam.passives[3],level:5}];scene.passiveSlots.forEach(skill=>scene.passives.equip(skill,5));
  for(let i=0;i<7;i++)scene.passives.emit('kill',{byAlly:false});scene.passives.emit('tick',{dt:.05});
  scene.skillSlots=HEROES.balam.skills.slice(0,4).map(skill=>({...skill,level:6,remaining:0}));scene.hud.setSkills(scene.skillSlots,4);scene.refreshPassiveHud();scene.updateHud();scene.hud.hideTooltip();scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());
  return {casts,passives,fxPlaceholders:scene.fx.missing.size,audioFallbacks:scene.skillAudio.missing.size,liveFx:scene.fx.live.filter(sprite=>sprite.active).length,feast:scene.passives.equipped.get('feast-of-the-fallen').state.hudState.value};
 });
 assert.equal(result.casts.length,96);assert.ok(result.casts.every(cast=>cast.finite&&cast.cooldown>0));assert.equal(result.passives.length,8);assert.ok(result.passives.filter(passive=>passive.id!=='obsidian-thorns').every(passive=>passive.hasState));assert.ok(result.fxPlaceholders>=16);assert.ok(result.liveFx<=24);assert.equal(result.feast,7);
 await page.screenshot({path:path.join(output,'balam-568x320.png')});
 await page.locator('[data-passive="1"]').click();assert.match(await page.locator('.skill-tooltip').innerText(),/7\/12/);
 await page.locator('[data-innate="jade-bounty"]').click();assert.match(await page.locator('.skill-tooltip').innerText(),/0.4 HP.*25%/);
 assert.equal(errors.length,0,errors.join('\n'));
 const report={...result,errors,elapsedMs:Math.round(performance.now()-start)};await fs.writeFile(path.join(output,'balam-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Balam browser check: 96 casts, 8 passives, live HUD states; 0 runtime/asset errors (${report.elapsedMs}ms).`);
}finally{await browser.close();await server.close();}
