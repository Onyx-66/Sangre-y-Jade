import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve('docs/skills-redesign/previews/step15');
await fs.mkdir(output,{recursive:true});
const started=performance.now(),server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:568,height:320}}),errors=[],missingStills=[],consoleErrors=[];
page.on('pageerror',error=>errors.push(error.stack));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());
  if(message.type()==='warning'&&message.text().includes('fx/'))missingStills.push(message.text());});
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))errors.push(`${response.status()} ${response.url()}`);});
try{
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection.heroId='ixchel';
    app.save.setSetting('attackMode','manual');app.startRun();});
  await page.locator('.hud').waitFor();
  const report=await page.evaluate(async()=>{
    const {IXCHEL_FX_RECIPES}=await import('/src/fx/recipes/ixchel.js'),
      {IXCHEL_FX_DEFINITIONS}=await import('/src/fx/generated/ixchel.js'),
      {HEROES}=await import('/src/data/heroes.js'),{updateSkillEffects}=await import('/src/skills/common.js');
    const app=window.__SANGRE_Y_JADE__,game=app.game,scene=game.scene.getScene('Ritual');game.loop.stop();
    scene.stats.intangibleUntil=Infinity;scene.enemies.clear(true,true);
    // This is an FX audit, not a pacing bot: prop drops must not open drafts.
    scene.collectPickup=()=>{};
    const delta=1000/30;let clock=scene.time.now,maxUnits=0;
    // Phaser 3.90 tweens read Date.now rather than the scene delta. Supply the
    // same deterministic delta so timers, tweens, emitters and following images
    // all advance through a real ten seconds of animation in this audit.
    scene.tweens.getDelta=()=>delta;
    // Systems caches scene.update at boot; replace that cached callback, not
    // only the method on the scene, to isolate the visual timeline from AI.
    scene.sys.sceneUpdate=(_time,ms)=>{scene.elapsed+=ms/1000;};
    const step=()=>{clock+=delta;game.headlessStep(clock,delta);scene.fx.prune();
      if(scene.ended)throw Error('Visual audit unexpectedly ended the run');
      maxUnits=Math.max(maxUnits,scene.fx.liveUnits);if(scene.fx.liveUnits>24)throw Error('FX cap exceeded');};
    const clear=()=>{scene.fx.destroy();scene.tweens.killAll();scene.time.removeAllEvents();};
    const audits=[];
    for(const definition of IXCHEL_FX_DEFINITIONS){
      clear();const id=definition.id,recipe=IXCHEL_FX_RECIPES[id],stages=new Set(),
        proxy=scene.add.image(scene.player.x+90,scene.player.y,`fx-still-${id}-${recipe.stills[0]}`).setVisible(false);
      const startElapsed=scene.elapsed;
      const play=(stage,extra={})=>{if(!recipe[stage])return;stages.add(stage);
        scene.fx.play(id,stage,{x:scene.player.x+90,y:scene.player.y,angle:0,from:scene.player,...extra});};
      play('cast');play('ground');play('aura',{target:id==='spirit-familiar'?proxy:scene.player});
      play('travel',{target:proxy,duration:1});play('proc',{target:proxy});
      for(let frame=0;frame<300;frame++){
        proxy.setPosition(scene.player.x+90+Math.sin(frame/30)*40,scene.player.y+Math.cos(frame/30)*24);
        if(frame===Math.round((definition.params.delay??definition.params.pullSeconds??.3)*30))play('impact');
        if(frame>0&&frame%30===0){if(definition.kind==='passive'){play('proc',{target:proxy});play('aura',{target:scene.player,duration:.8});}
          else if(recipe.travel)play('travel',{target:proxy,duration:.8});}
        step();
      }
      const expected=['cast','travel','impact','ground','aura','proc'].filter(stage=>typeof recipe[stage]==='function');
      if(expected.some(stage=>!stages.has(stage)))throw Error(`Stage gap for ${id}`);
      const seconds=scene.elapsed-startElapsed;if(Math.abs(seconds-10)>.00001)throw Error(`Wrong duration for ${id}: ${seconds}`);
      audits.push({id,seconds:Math.round(seconds*1000)/1000,frames:300,stages:[...stages],maxLiveUnits:maxUnits});proxy.destroy();
    }
    clear();scene.stats.level=20;scene.loadoutLevel=20;scene.stats.maxMana=999;scene.stats.mana=999;
    const currentCasts=[];scene.enemies.clear(true,true);scene.spawnEnemy('shade',90);
    const enemy=scene.enemies.getChildren().at(-1);enemy.setPosition(scene.player.x+120,scene.player.y).setData({hp:100000,maxHp:100000,speed:0});
    for(const original of HEROES.ixchel.skills){
      clear();scene.projectiles.clear(true,true);scene.stats.mana=999;scene.ended=false;
      scene.skillSlots=[{...original,level:1,remaining:0}];scene.castSkill(0);
      for(let i=0;i<40;i++){scene.updateProjectiles(delta/1000);updateSkillEffects(scene,delta/1000);scene.updateSummons(delta/1000);step();}
      currentCasts.push({id:original.id,cooldown:scene.skillSlots[0].remaining});
    }
    clear();scene.summons.forEach(s=>s.sprite.destroy());scene.summons=[];
    scene.enemies.clear(true,true);scene.enemyProjectiles.clear(true,true);scene.pickups.clear(true,true);
    scene.effects.clear(true,true);scene.activeBoss=null;scene.hud.boss.hidden=true;scene.elapsed=15;scene.stats.kills=0;scene.stats.level=20;
    scene.skillSlots=HEROES.ixchel.skills.slice(0,4).map(skill=>({...skill,level:1,remaining:0}));
    scene.hud.setSkills(scene.skillSlots,4);scene.updateHud();scene.hud.hideTooltip();
    scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());
    scene.fx.play('moonwell','ground',{x:scene.player.x+90,y:scene.player.y});
    scene.fx.play('copal-veil','aura',{target:scene.player});scene.fx.play('lunar-boon','aura',{duration:2});
    for(let i=0;i<10;i++)step();game.step(clock,0);
    const loaded=IXCHEL_FX_DEFINITIONS.flatMap(d=>(d.kind==='active'?['main','accent']:['proc']).map(still=>`fx-still-${d.id}-${still}`));
    return{audits,currentCasts,loadedStills:loaded.length,missingTextures:loaded.filter(key=>!scene.textures.exists(key)),
      maxLiveUnits:maxUnits,missingSeen:[...scene.fx.missing],
      integrationLimit:'Step 9 is absent: 20 current compatibility casts are checked separately; Copal Veil and eight new passive mechanics are tested as FX recipes, not invented gameplay.'};
  });
  assert.equal(report.audits.length,24);assert.ok(report.audits.every(skill=>skill.seconds===10));
  assert.equal(report.currentCasts.length,20);assert.ok(report.currentCasts.every(c=>c.cooldown>0),JSON.stringify(report.currentCasts));
  assert.equal(report.loadedStills,40);assert.equal(report.missingTextures.length,0);assert.equal(report.missingSeen.length,0);
  assert.ok(report.maxLiveUnits<=24);assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(consoleErrors.length,0,consoleErrors.join('\n'));assert.equal(missingStills.length,0,missingStills.join('\n'));
  await page.screenshot({path:path.join(output,'ixchel-568x320.png')});
  await fs.writeFile(path.join(output,'ixchel-report.json'),JSON.stringify({...report,errors,consoleErrors,missingStills,elapsedMs:Math.round(performance.now()-started)},null,2)+'\n');
  console.log(`Ixchel FX: 24 recipes x 10 seconds, 20 compatibility casts, 40 stills, ${report.maxLiveUnits}/24 peak units, no errors or missing stills.`);
}finally{await browser.close();await server.close();}
