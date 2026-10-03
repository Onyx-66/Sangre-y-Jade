import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve('docs/skills-redesign/previews/step10');
await fs.mkdir(output,{recursive:true});
const start=performance.now(),server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:568,height:320}}),errors=[];
page.on('pageerror',error=>errors.push(error.stack));
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))errors.push(`${response.status()} ${response.url()}`);});
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection.heroId='kukul';app.save.setSetting('attackMode','manual');app.startRun();});
 await page.locator('.hud').waitFor();
 const result=await page.evaluate(async()=>{
  const {HEROES}=await import('/src/data/heroes.js'),{updateSkillEffects}=await import('/src/skills/common.js');
  const scene=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');scene.scene.pause();scene.settings.damageNumbers=false;
  const casts=[],passives=[];
  function reset(){
   scene.ended=true;scene.skillEffects.forEach(effect=>effect.destroy());scene.ended=false;scene.pausedForChoice=false;scene.skillEffects=[];scene.skillBuffs.clear();scene.skillMotion=scene.eagleFocus=scene.plumeGuard=null;
   for(const group of [scene.enemies,scene.projectiles,scene.enemyProjectiles])group.clear(true,true);
   scene.player.body.reset(0,0);scene.player.setVelocity(0,0);scene.elapsed=1;scene.stats.hp=scene.stats.maxHp;scene.stats.shield=scene.stats.dodgeCharges=0;scene.stats.intangibleUntil=scene.stats.reflectUntil=0;scene.stats.crit=0;scene.stats.damageDone=0;scene.invulnerable=10000;scene.dash.remaining=0;
   scene.spawnEnemy('shade',90);const enemy=scene.enemies.getChildren().at(-1);enemy.body.reset(100,0);enemy.setData({hp:100000,maxHp:100000,speed:0,damage:10});return enemy;
  }
  const advance=seconds=>{for(let left=seconds;left>1e-9;){const dt=Math.min(.05,left);scene.elapsed+=dt;scene.passives.emit('tick',{dt});scene.updateProjectiles(dt);updateSkillEffects(scene,dt);left-=dt;}};
  for(const original of HEROES.kukul.skills)for(let level=1;level<=6;level++){
   reset();scene.stats.level=scene.loadoutLevel=20;scene.skillSlots=[{...original,level,remaining:0}];scene.castSkill(0);advance(14);
   casts.push({id:original.id,level,damageDone:scene.stats.damageDone,cooldown:scene.skillSlots[0].remaining,finite:Number.isFinite(scene.stats.damageDone)&&Number.isFinite(scene.player.x)});
  }
  for(const original of HEROES.kukul.passives){const enemy=reset(),entry=scene.passives.equip(original,5);scene.passives.emit('basicAttack',{count:5,weapon:scene.heroData.automatic,target:enemy});scene.passives.emit('hit',{enemy,basicAttack:true,byAlly:false,dot:false});scene.passives.emit('tick',{dt:.05});passives.push({id:original.id,level:entry.level,hasState:!!entry.state.hudState});scene.passives.unequip(original.id);}
  const enemy=reset();scene.invulnerable=0;scene.basicAttackCount=5;scene.stats.critDamage=1.65;scene.stats.level=20;
  scene.passives.equip(HEROES.kukul.passives.find(skill=>skill.id==='full-quiver'),5);scene.passives.equip(HEROES.kukul.passives.find(skill=>skill.id==='venomous-darts'),5);
  scene.autoAttack();const shots=scene.projectiles.getChildren().filter(shot=>shot.active);shots.slice(0,4).forEach(shot=>scene.onProjectileHit(shot,enemy));
  const live={burst:shots.length,poisonStacks:enemy.getData('basicPoisonStacks').length,basicDamage:100000-enemy.getData('hp')};
  scene.passives.unequip('venomous-darts');scene.passives.unequip('full-quiver');reset();
  scene.skillSlots=[{...HEROES.kukul.skills.find(skill=>skill.id==='eagle-eye'),level:1,remaining:0}];scene.castSkill(0);scene.hud.move.x=1;scene.updateMovement(.05);scene.hud.move.x=0;advance(.7);live.cancelledCooldown=scene.skillSlots[0].remaining;live.cancelledShots=scene.projectiles.countActive();
  reset();scene.skillSlots=[{...HEROES.kukul.skills.find(skill=>skill.id==='serpent-path'),level:1,remaining:0}];scene.castSkill(0);const wave=scene.projectiles.getChildren()[0];scene.updateProjectiles(560/600/4);live.wave={x:wave.x,y:wave.y,bodyX:wave.body.center.x,bodyY:wave.body.center.y};
  scene.passiveSlots=[{...HEROES.kukul.passives.find(skill=>skill.id==='full-quiver'),level:5},{...HEROES.kukul.passives.find(skill=>skill.id==='hunters-focus'),level:5}];scene.passiveSlots.forEach(skill=>scene.passives.equip(skill,5));
  scene.passives.emit('basicAttack',{count:5,weapon:scene.heroData.automatic});scene.passives.emit('hit',{enemy:scene.enemies.getChildren()[0],byAlly:false,dot:false,basicAttack:true});
  scene.skillSlots=HEROES.kukul.skills.slice(0,4).map(skill=>({...skill,level:6,remaining:0}));scene.hud.setSkills(scene.skillSlots,4);scene.refreshPassiveHud();scene.updateHud();scene.hud.hideTooltip();scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());
  return {casts,passives,live,liveFx:scene.fx.live.filter(sprite=>sprite.active).length,fxPlaceholders:scene.fx.missing.size,audioFallbacks:scene.skillAudio.missing.size};
 });
 assert.equal(result.casts.length,96);assert.ok(result.casts.every(cast=>cast.finite&&cast.cooldown>0));assert.equal(result.passives.length,8);assert.ok(result.liveFx<=24);
 assert.equal(result.live.burst,5);assert.equal(result.live.poisonStacks,3);assert.ok(result.live.basicDamage>0);assert.equal(result.live.cancelledCooldown,0);assert.equal(result.live.cancelledShots,0);assert.ok(Math.abs(result.live.wave.x-140)<1e-6&&Math.abs(result.live.wave.y-60)<1e-6);
 // Arcade rounds scaled body dimensions to pixels, allowing a sub-pixel centre offset.
 assert.ok(Math.abs(result.live.wave.bodyX-result.live.wave.x)<.5&&Math.abs(result.live.wave.bodyY-result.live.wave.y)<.5,`Arcade body follows the serpent path: ${JSON.stringify(result.live.wave)}`);
 await page.screenshot({path:path.join(output,'kukul-568x320.png')});
 await page.locator('[data-passive="0"]').click();assert.match(await page.locator('.skill-tooltip').innerText(),/5\/6/);
 await page.locator('[data-passive="1"]').click();assert.match(await page.locator('.skill-tooltip').innerText(),/1\/5/);
 assert.equal(errors.length,0,errors.join('\n'));
 const report={...result,errors,elapsedMs:Math.round(performance.now()-start)};await fs.writeFile(path.join(output,'kukul-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Kukul browser check: 96 casts, 8 passives, real projectile metadata/poison/cancellation/wave/HUD; 0 runtime/asset errors (${report.elapsedMs}ms).`);
}finally{await browser.close();await server.close();}
