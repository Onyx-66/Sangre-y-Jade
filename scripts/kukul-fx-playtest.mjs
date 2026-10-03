import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve('docs/skills-redesign/previews/step16');
await fs.mkdir(output,{recursive:true});
const started=performance.now(),server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:568,height:320}}),errors=[],missingStills=[],consoleErrors=[];
page.on('pageerror',error=>errors.push(error.stack));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());
 if(message.type()==='warning'&&message.text().includes('fx/'))missingStills.push(message.text());});
page.on('response',response=>{if(response.status()>=400&&response.url().includes('/assets/'))errors.push(`${response.status()} ${response.url()}`);});
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection.heroId='kukul';
  app.save.setSetting('attackMode','manual');app.startRun();});
 await page.locator('.hud').waitFor();
 const report=await page.evaluate(async()=>{
  const {KUKUL_FX_RECIPES,KUKUL_FX_IDS}=await import('/src/fx/recipes/kukul.js'),
   {KUKUL_DEFINITIONS}=await import('/src/skills/generated/kukul.js'),
   {HEROES}=await import('/src/data/heroes.js'),{updateSkillEffects}=await import('/src/skills/common.js');
  const app=window.__SANGRE_Y_JADE__,game=app.game,scene=game.scene.getScene('Ritual');game.loop.stop();
  // Advance real Phaser bodies, events, timers, tweens and particles at 30 Hz,
  // but suppress pacing/XP drafts: this audit isolates skill presentation.
  scene.collectPickup=()=>{};scene.settings.damageNumbers=false;scene.settings.screenShake=false;
  const delta=1000/30;let clock=scene.time.now,maxUnits=0,caseUnits=0,observed=[];
  scene.tweens.getDelta=()=>delta;
  const play=scene.fx.play.bind(scene.fx);scene.fx.play=(id,stage,ctx)=>{
   observed.push({id,stage,at:scene.elapsed});const result=play(id,stage,ctx);
   caseUnits=Math.max(caseUnits,scene.fx.liveUnits);maxUnits=Math.max(maxUnits,scene.fx.liveUnits);
   if(scene.fx.liveUnits>24)throw Error('Effect cap exceeded inside a stage');return result;
  };
  scene.sys.sceneUpdate=(_time,ms)=>{const dt=ms/1000;scene.elapsed+=dt;
   scene.updateProjectiles(dt);updateSkillEffects(scene,dt);scene.passives.emit('tick',{dt});};
  const step=()=>{clock+=delta;game.headlessStep(clock,delta);scene.fx.prune();
   if(scene.ended)throw Error('FX audit unexpectedly ended the run');
   caseUnits=Math.max(caseUnits,scene.fx.liveUnits);maxUnits=Math.max(maxUnits,scene.fx.liveUnits);
   if(scene.fx.liveUnits>24)throw Error('Effect cap exceeded');};
  const reset=()=>{
   scene.ended=true;scene.skillEffects.forEach(effect=>effect.destroy());scene.ended=false;
   scene.skillEffects=[];scene.skillBuffs.clear();scene.skillMotion=scene.eagleFocus=scene.plumeGuard=null;
   for(const entry of [...scene.passives.equipped.values()])if(!entry.innate)scene.passives.unequip(entry.id);
   scene.fx.destroy();scene.tweens.killAll();scene.time.removeAllEvents();
   for(const group of [scene.projectiles,scene.enemyProjectiles,scene.enemies,scene.pickups,scene.effects])group.clear(true,true);
   scene.player.body.reset(0,0);scene.player.setVelocity(0,0);scene.player.setVisible(true);scene.elapsed=1;
   scene.stats.level=scene.loadoutLevel=20;scene.stats.mana=scene.stats.maxMana=999;
   scene.stats.hp=scene.stats.maxHp;scene.stats.shield=scene.stats.dodgeCharges=0;scene.stats.intangibleUntil=Infinity;
   scene.stats.damageDone=0;scene.stats.crit=0;scene.invulnerable=10000;scene.autoTimer=scene.basicAttackCount=0;
   scene.dash.remaining=0;scene.hud.move.x=scene.hud.move.y=0;scene.pausedForChoice=false;
   observed=[];caseUnits=0;
   return [120,175,230,280].map(x=>{scene.spawnEnemy('shade',90);const enemy=scene.enemies.getChildren().at(-1);
    enemy.body.reset(x,0);enemy.setVelocity(0,0).setData({hp:100000,maxHp:100000,speed:0,damage:10});return enemy;});
  };
  const audits=[];
  for(const definition of KUKUL_DEFINITIONS){
   const enemies=reset(),id=definition.id,start=scene.elapsed;let cooldown;
   if(definition.kind==='active'){
    scene.skillSlots=[{...definition,level:1,remaining:0}];scene.castSkill(0);cooldown=scene.skillSlots[0].remaining;
    if(!(cooldown>0))throw Error(`Skill did not cast: ${id}`);
   }else{
    scene.skillSlots=[];scene.passives.equip(definition,1);
   }
   const basicHit=()=>{scene.autoAttack();const shot=scene.projectiles.getChildren().filter(p=>p.active&&p.getData('basicAttack')).at(-1);
    if(!shot)throw Error(`No basic shot for ${id}`);scene.onProjectileHit(shot,enemies[0]);};
   for(let frame=0;frame<300;frame++){
    if(id==='plume-guard'&&[30,60,90].includes(frame)){
     scene.stats.intangibleUntil=0;scene.invulnerable=0;scene.damagePlayer(10,120,0);scene.stats.intangibleUntil=Infinity;
    }
    if(definition.kind==='passive'&&frame%30===0){
     if(id==='sharpened-flint')scene.autoAttack();
     if(id==='venomous-darts'||id==='hunters-focus')basicHit();
     if(id==='full-quiver')for(let n=0;n<6;n++)scene.autoAttack();
     if(id==='fleet-hunter'){scene.passives.emit('dash');scene.autoAttack();}
     if(id==='jungle-instinct'){
      const random=Math.random;Math.random=()=>0;
      try{scene.stats.intangibleUntil=0;scene.invulnerable=0;scene.damagePlayer(10,120,0,enemies[0]);}finally{Math.random=random;}
     }
     if(id==='trophy-hunter'){
      scene.spawnEnemy('jaguar',90);const trophy=scene.enemies.getChildren().at(-1);trophy.body.reset(150,30);
      scene.damageEnemy(trophy,100000); // Real kill event, not a fabricated proc.
     }
    }
    // Steady Aim must remain visible while ready, then vanish on real motion.
    if(id==='steady-aim'&&frame>=240)scene.player.body.reset((frame-239)*2,0);
    step();
   }
   const stages=[...new Set(observed.filter(c=>c.id===id).map(c=>c.stage))];
   const required=Object.keys(KUKUL_FX_RECIPES[id]).filter(key=>typeof KUKUL_FX_RECIPES[id][key]==='function');
   if(required.some(stage=>!stages.includes(stage)))throw Error(`Stage gap for ${id}: ${required.filter(stage=>!stages.includes(stage)).join(', ')}`);
   if(Math.abs(scene.elapsed-start-10)>1e-6)throw Error(`Wrong audit duration for ${id}`);
   if(id==='steady-aim'&&scene.passives.equipped.get(id).state.fx?.active)throw Error('Stationary reticle survived movement');
   audits.push({id,kind:definition.kind,seconds:10,frames:300,stages,cooldown,maxLiveUnits:caseUnits});
  }
  // Exercise optional visual branches not guaranteed by target geometry:
  // pop the three guarded hits through the real damage pipeline.
  reset();scene.skillSlots=[{...HEROES.kukul.skills.find(s=>s.id==='plume-guard'),level:1,remaining:0}];scene.castSkill(0);
  scene.stats.intangibleUntil=0;
  for(let i=0;i<3;i++){scene.invulnerable=0;scene.damagePlayer(10,120,0);step();}
  const plumePops=observed.filter(c=>c.id==='plume-guard'&&c.stage==='impact').length;
  reset();scene.skillSlots=['atlatl-volley','featherstorm','skyfall','gale-ring'].map(id=>({...HEROES.kukul.skills.find(s=>s.id===id),level:6,remaining:0}));
  scene.skillSlots.forEach((_skill,index)=>scene.castSkill(index));for(let i=0;i<90;i++)step();
  const stressMaxLiveUnits=caseUnits;
  const loaded=KUKUL_FX_IDS.flatMap(id=>KUKUL_FX_RECIPES[id].stills.map(still=>`fx-still-${id}-${still}`));
  const result={audits,plumePops,stressMaxLiveUnits,loadedStills:loaded.length,missingTextures:loaded.filter(key=>!scene.textures.exists(key)),
   maxLiveUnits:maxUnits,missingSeen:[...scene.fx.missing]};
  reset();scene.enemies.clear(true,true);scene.activeBoss=null;scene.hud.boss.hidden=true;scene.elapsed=15;scene.stats.kills=0;
  scene.skillSlots=HEROES.kukul.skills.slice(0,4).map(skill=>({...skill,level:1,remaining:0}));scene.hud.setSkills(scene.skillSlots,4);
  scene.passiveSlots=HEROES.kukul.passives.filter(skill=>['hunters-focus','steady-aim'].includes(skill.id)).map(skill=>({...skill,level:1}));
  scene.passiveSlots.forEach(skill=>scene.passives.equip(skill,1));scene.refreshPassiveHud();scene.updateHud();scene.hud.hideTooltip();
  scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());
  scene.fx.play('storm-nest','ground',{x:90,y:30});scene.fx.play('hunters-trance','aura',{target:scene.player});
  scene.fx.play('serpent-path','impact',{x:140,y:-35});for(let i=0;i<35;i++)step();game.step(clock,0);
  return result;
 });
 assert.equal(report.audits.length,24);assert.ok(report.audits.every(a=>a.seconds===10&&a.frames===300));
 assert.equal(report.plumePops,3);assert.equal(report.loadedStills,40);assert.equal(report.missingTextures.length,0);
 assert.equal(report.stressMaxLiveUnits,24);
 assert.equal(report.missingSeen.length,0);assert.ok(report.maxLiveUnits<=24);
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(consoleErrors.length,0,consoleErrors.join('\n'));
 assert.equal(missingStills.length,0,missingStills.join('\n'));
 await page.screenshot({path:path.join(output,'kukul-568x320.png')});
 await fs.writeFile(path.join(output,'kukul-report.json'),JSON.stringify({...report,errors,consoleErrors,missingStills,elapsedMs:Math.round(performance.now()-started)},null,2)+'\n');
 console.log(`Kukul FX: 24 skills x 10 seconds through gameplay, 40 stills, ${report.maxLiveUnits}/24 peak units, no errors or missing stills.`);
}finally{await browser.close();await server.close();}
