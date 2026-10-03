import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
const spec=JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json','utf8'));
const skills=[...Object.values(spec.heroes).flat(),...spec.shared,...Object.values(spec.allies).flat()];
const output='docs/skills-redesign/verification';await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:568,height:320}}),report={cases:[],errors:[],warnings:[],httpErrors:[]};
let current='startup';
page.on('pageerror',e=>report.errors.push({id:current,message:e.stack}));
page.on('console',m=>{if(m.type()==='error')report.errors.push({id:current,message:m.text()});if(m.type()==='warning'&&/Placeholder:|Sound fallback:|No active handler:/.test(m.text()))report.warnings.push({id:current,message:m.text()});});
page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({id:current,message:`${r.status()} ${r.url()}`});});
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?fxdebug=1`);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 await page.mouse.click(280,160);
 await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.showTitle();app.audio.unlock();app.save.setSetting('music',0);app.save.setSetting('attackMode','manual');});
 for(const definition of skills){
  current=definition.id;
  const owner=definition.owner.startsWith('ally:')||definition.owner==='shared'?'balam':definition.owner;
  await page.evaluate(owner=>{const app=window.__SANGRE_Y_JADE__;app.lastSelection.heroId=owner;app.startRun();},owner);
  await page.locator('.hud').waitFor();
  const result=await page.evaluate(async definition=>{
   const {HEROES}=await import('/src/data/heroes.js'),{ACTIVE_HANDLERS,PASSIVE_HANDLERS}=await import('/src/skills/index.js'),
    {ALLY_CATALOG}=await import('/src/data/allyCatalog.js'),{FxDirector}=await import('/src/fx/FxDirector.js'),
    {updateSkillEffects}=await import('/src/skills/common.js'),{SHARED_DEFINITIONS}=await import('/src/skills/generated/balam.js');
   const app=window.__SANGRE_Y_JADE__,scene=app.game.scene.getScene('Ritual');app.game.loop.stop();
   const id=definition.id,ally=definition.owner.startsWith('ally:'),role=ally?definition.owner.split(':')[1]:null;
   const runtime=ally?ALLY_CATALOG[role].find(s=>s.id===id):[...HEROES[scene.heroData.id].skills,...HEROES[scene.heroData.id].passives||[],...SHARED_DEFINITIONS].find(s=>s.id===id);
   if(!runtime||(!ally&&definition.kind==='passive'&&!PASSIVE_HANDLERS[id])||(!ally&&definition.kind==='active'&&!ACTIVE_HANDLERS[id]))return {id,owner:definition.owner,seconds:0,missing:'Gameplay definition/handler is absent'};
   scene.collectPickup=()=>{};scene.floatText=()=>{};scene.settings.damageNumbers=false;scene.settings.screenShake=false;
   scene.stats.level=scene.loadoutLevel=20;scene.stats.mana=scene.stats.maxMana=10000;scene.stats.crit=0;
   scene.invulnerable=10000;scene.stats.intangibleUntil=0;scene.elapsed=1;scene.stats.hp=scene.stats.maxHp*.35;
   scene.props.clear(true,true);scene.enemies.clear(true,true);scene.player.body.reset(0,0);
   const targets=[80,110,140,170].map(x=>{scene.spawnEnemy('shade',1);const e=scene.enemies.getChildren().at(-1);e.body.reset(x,0);e.setData({hp:100000,maxHp:400000,speed:0,damage:10,ranged:false});return e;});
   const delta=1000/30;let clock=scene.time.now,peak=0;const stages=[];
   const play=scene.fx.play.bind(scene.fx);scene.fx.play=(key,stage,ctx)=>{stages.push({id:key,stage});const r=play(key,stage,ctx);peak=Math.max(peak,scene.fx.liveUnits);return r;};
   scene.tweens.getDelta=()=>delta;
   scene.sys.sceneUpdate=(_time,ms)=>{const dt=ms/1000;scene.elapsed+=dt;scene.skillAudio.update(dt);scene.updateEnemies(dt);scene.updateProjectiles(dt);scene.updateSummons(dt);updateSkillEffects(scene,dt);scene.passives.emit('tick',{dt});if(ally){for(const k of scene.companion.skills)k.remaining=Math.max(0,k.remaining-dt);scene.support.brain.update(dt);scene.support.updateTraps(dt);}};
   let attempts=0;
   if(ally){scene.support.summon(role,5);scene.companion.skills=[];scene.support.equip(runtime,{silent:true});scene.companion.sprite.setPosition(0,0);}
   else if(definition.kind==='active'){scene.skillSlots=[{...runtime,level:1,remaining:0}];scene.castSkill(0);attempts=Number(scene.skillSlots[0].remaining>0);}
   else scene.passives.equip(runtime,1);
   function stimulate(){
    if(ally){
     if(id==='cleansing-light')scene.player.setData('poisonUntil',scene.elapsed+2);
     if(id==='silencing-dart')targets[0].setData('ranged',true);
     if(id==='bulwark-wall'){scene.spawnEnemyProjectile(100,0,Math.PI,60,1,targets[0]);}
     if(id==='saving-grace')scene.support.preventFatal(scene.stats.maxHp*2);
     if(id==='guardian-link')scene.passives.redirectDamage(20,{source:targets[0]});
     if(id==='bounty-contract')scene.passives.emit('kill',{enemy:targets[0],byAlly:true,wasTopThreat:true});
     if(id==='sacred-fervor'||id==='relentless-pursuit')scene.passives.modifiers({ally:scene.companion});
     if(id==='bodyguard')scene.support.modifiers();
    }else if(definition.kind==='passive'){
     if(['bloodlust','feast-of-the-fallen'].includes(id))for(let n=0;n<12;n++)scene.passives.emit('kill',{enemy:targets[0],byAlly:false});
     if(id==='predators-rhythm')scene.passives.emit('crit',{enemy:targets[0]});
     if(['obsidian-thorns','survivors-will'].includes(id))scene.passives.emit('damageTaken',{source:targets[0],melee:true,amount:8});
     if(id==='earthshaker')scene.passives.emit('basicAttack',{count:4,weapon:{damage:24}});
     if(id==='jade-bounty')scene.passives.emit('pickup',{kind:'xp',value:1,pickup:{x:10,y:0}});
     if(id==='fleet-hunter')scene.passives.emit('dash');
     if(['sharpened-flint','venomous-darts','hunters-focus','full-quiver','fleet-hunter'].includes(id)){
      for(let n=0;n<(id==='full-quiver'?6:1);n++){scene.autoAttack();const shot=scene.projectiles.getChildren().findLast(p=>p.active&&p.getData('basicAttack'));if(shot)scene.onProjectileHit(shot,targets[0]);}
     }
     if(id==='jungle-instinct'){const random=Math.random;Math.random=()=>0;try{scene.invulnerable=0;scene.damagePlayer(10,80,0,targets[0]);}finally{Math.random=random;scene.invulnerable=10000;}}
     if(id==='trophy-hunter'){scene.spawnEnemy('jaguar',1);const e=scene.enemies.getChildren().at(-1);e.body.reset(100,10);scene.damageEnemy(e,100000);}
    }
   }
   const start=scene.elapsed;
   for(let i=0;i<300;i++){if(i%30===0)stimulate();clock+=delta;app.game.headlessStep(clock,delta);scene.fx.prune();peak=Math.max(peak,scene.fx.liveUnits);}
   await new Promise(resolve=>setTimeout(resolve,120));
   const state=scene.passives.equipped.get(id)?.state;
   return {id,owner:definition.owner,kind:definition.kind,seconds:scene.elapsed-start,frames:300,
    casts:ally?(scene.allyCasts[id]||0):attempts,stages:[...new Set(stages.filter(s=>s.id===id).map(s=>s.stage))],state:state?.hudState||null,
    damage:scene.stats.damageDone,peakFx:peak,missingStills:[...scene.fx.missing],missingSounds:[...scene.skillAudio.missing],
    recipe:FxDirector.recipes.has(id),compatibility:definition.owner==='ixchel',
    passiveEvidence:definition.kind==='passive'?{registered:scene.passives.equipped.has(id),modifiers:scene.passives.modifiers({ally:scene.companion}),support:ally?scene.support.modifiers():null}:null};
  },definition);
  report.cases.push(result);
  if(result.missing||result.missingStills?.length||result.missingSounds?.length||(result.kind==='active'&&!result.casts)||result.peakFx>24)console.log(`${current}: FAIL ${result.missing||'cast/assets/cap gate'}`);
  await fs.writeFile(`${output}/skills.json`,JSON.stringify(report,null,2)+'\n');
 }
 report.passed=report.errors.length===0&&report.warnings.length===0&&report.httpErrors.length===0&&report.cases.every(c=>!c.missing&&!c.compatibility&&Math.abs(c.seconds-10)<1e-6&&c.peakFx<=24&&(c.kind!=='active'||c.casts>0));
 await fs.writeFile(`${output}/skills.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`Skill audit: ${report.cases.length} catalog entries; ${report.cases.filter(c=>!c.missing).length} ten-second fixtures; ${report.warnings.length} missing-asset warnings; passed=${report.passed}`);
 if(!report.passed)process.exitCode=1;
}finally{await browser.close();await server.close();}
