import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const started=performance.now(),output=path.resolve('docs/skills-redesign/previews/step18');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:900,height:600}}),errors=[],soundWarnings=[],badAudio=[];
page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.text().includes('Sound fallback:'))soundWarnings.push(m.text());});
page.on('response',r=>{if(r.url().includes('/audio/sfx/')&&r.status()>=400)badAudio.push(`${r.status()} ${r.url()}`);});
try{
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  // A real browser gesture unlocks audio; no autoplay-policy override.
  await page.mouse.click(440,290);
  await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.audio.unlock();app.audio.stopMusic();app.audio.stopNarration();
    app.save.setSetting('master',.7);app.save.setSetting('sfx',.6);app.save.setSetting('music',0);app.lastSelection.heroId='balam';app.startRun();});
  await page.locator('.hud').waitFor();
  const report=await page.evaluate(async()=>{
    const manifest=(await import('/src/audio/sfx-manifest.json')).default,
      {HEROES}=await import('/src/data/heroes.js'),{SupportSystem}=await import('/src/systems/SupportSystem.js'),
      {ALLY_CATALOG}=await import('/src/data/allyCatalog.js'),{IXCHEL_COMPATIBILITY_HANDLERS}=await import('/src/skills/ixchel/compatibility.js');
    const app=window.__SANGRE_Y_JADE__,scene=app.game.scene.getScene('Ritual'),audio=scene.skillAudio;app.game.loop.stop();
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const files=Object.entries(manifest.skills).flatMap(([id,r])=>r.kinds.map(kind=>audio.file(id,kind))).concat(Object.keys(manifest.ui).map(name=>audio.file(name,'ui')));
    const decoded=await Promise.all(files.map(file=>audio.buffer(file)));if(decoded.some(b=>b.numberOfChannels!==1))throw Error('Unexpected channel format');
    audio.unlock();await wait(100);if(audio.context.state!=='running')throw Error(`Audio context is ${audio.context.state}`);
    const meter=audio.context.createAnalyser();meter.fftSize=2048;audio.gain.connect(meter);
    const rms=()=>{const samples=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);};
    audio.play('jaguar-roar');let audiblePeak=0;
    for(let i=0;i<12;i++){await wait(35);audiblePeak=Math.max(audiblePeak,rms());}
    if(audiblePeak<.0001)throw Error('Decoded cue produced no audible mixer signal');
    audio.stopAll();audio.loop('war-drum',{duration:6});await wait(150);
    const beforeMute=rms();app.save.setSetting('master',0);app.audio.applySettings();await wait(160);const masterMuted=rms();
    app.save.setSetting('master',.7);app.save.setSetting('sfx',0);app.audio.applySettings();await wait(160);const effectsMuted=rms();
    app.save.setSetting('sfx',.6);app.audio.applySettings();await wait(200);const unmuted=rms();
    if(masterMuted>1e-6||effectsMuted>1e-6||unmuted<.00001)throw Error('Master/SFX mute did not reach the mixer');
    audio.pause();await wait(100);const paused=rms();audio.resume();await wait(100);const resumed=rms();
    if(paused>1e-6||!audio.loops.get('war-drum')?.voice)throw Error('Pause/resume loop failed');audio.stopAll();
    const requests=[],ui=[];const oldPlay=audio.play.bind(audio),oldUi=audio.ui.bind(audio);
    audio.play=(id,kind='cast')=>{requests.push(`${id}:${kind}`);return oldPlay(id,kind);};audio.ui=name=>{ui.push(name);return oldUi(name);};
    const reset=()=>{audio.stopAll();audio.last.clear();audio.resume();scene.ended=false;scene.pausedForChoice=false;scene.elapsed=10;
      scene.stats.level=scene.loadoutLevel=20;scene.stats.hp=scene.stats.maxHp;scene.stats.mana=scene.stats.maxMana=1000;
      scene.stats.shield=0;scene.skillEffects.forEach(e=>e.destroy());scene.skillEffects=[];scene.skillBuffs.clear();
      for(const group of [scene.enemies,scene.projectiles,scene.enemyProjectiles])group.clear(true,true);
      for(const entry of [...scene.passives.equipped.values()])if(!entry.innate)scene.passives.unequip(entry.id);
      if(scene.companion){scene.companion.sprite.destroy();scene.companion=null;}scene.support=new SupportSystem(scene);
      scene.player.setPosition(0,0);scene.invulnerable=1000;scene.collectPickup=()=>{};
      scene.spawnEnemy('shade',1);const enemy=scene.enemies.getChildren().at(-1);enemy.body.reset(100,0);enemy.setData({hp:100000,maxHp:100000,speed:0});return enemy;};
    // Every converted hero active calls its real handler; pending Ixchel entries
    // are audio-ready, not falsely counted as implemented gameplay.
    const heroCasts=[];
    for(const owner of ['balam','kukul'])for(const definition of HEROES[owner].skills){
      reset();scene.heroData=HEROES[owner];scene.skillSlots=[{...definition,level:1,remaining:0}];scene.castSkill(0);
      if(!requests.includes(`${definition.id}:cast`))throw Error(`No cast cue: ${definition.id}`);heroCasts.push(definition.id);
    }
    // Compatibility bridge keeps current Ixchel rules but routes recognised IDs.
    reset();scene.heroData=HEROES.ixchel;const ixchelCasts=[];
    for(const definition of HEROES.ixchel.skills){scene.skillSlots=[{...definition,level:1,remaining:0}];scene.stats.mana=1000;scene.castSkill(0);ixchelCasts.push(definition.id);}
    const allyCasts=[];
    for(const [role,skills]of Object.entries(ALLY_CATALOG))for(const definition of skills.filter(k=>k.kind==='active')){
      const enemy=reset();scene.support.summon(role,5);scene.companion.skills=[];scene.support.equip(definition,{silent:true});
      const skill=scene.companion.skills[0];scene.support.brain.cast(skill,enemy);
      if(!requests.includes(`${skill.id}:cast`))throw Error(`No ally cast cue: ${skill.id}`);allyCasts.push(skill.id);
    }
    // These are the real HUD and scene callbacks; no direct UI sound invocation.
    reset();scene.heroData=HEROES.balam;scene.skillSlots=[];scene.passiveSlots=[];scene.completedSkillMilestones=new Set();
    scene.hud.showUnlock('active');
    scene.hud.showChoice('Level 2',[{...HEROES.balam.skills[0],kind:'active',choiceType:'new-active'}],card=>scene.applyChoice(card));
    scene.hud.el.querySelector('.modal-backdrop:last-child [data-choice]').click();
    scene.hud.showChoice('Level 3',[{...HEROES.balam.passives[0],kind:'passive',choiceType:'new-passive'}],card=>scene.applyChoice(card));
    scene.hud.el.querySelector('.modal-backdrop:last-child [data-choice]').click();
    scene.showSkillMilestone(10,()=>{});scene.hud.el.querySelector('.modal-backdrop:last-child [data-choice]').click();
    scene.support.summon('tank',5);scene.support.equip(ALLY_CATALOG.tank.find(k=>k.id==='guardian-link'));scene.support.syncLevel(10);
    await wait(120);const requiredUi=Object.keys(manifest.ui);if(requiredUi.some(name=>!ui.includes(name)))throw Error(`Missing UI cues: ${requiredUi.filter(name=>!ui.includes(name))}`);
    // Verify all 18 loops actually start and stop; no silent-passive fallback.
    const loops=[];audio.stopAll();audio.resume();
    for(const [id,r]of Object.entries(manifest.skills))if(r.kinds.includes('loop')){
      audio.loop(id,{duration:.1});await wait(5);if(!audio.loops.get(id)?.voice)throw Error(`Loop did not start: ${id}`);
      audio.update(.1);if(audio.loops.has(id))throw Error(`Loop did not expire: ${id}`);loops.push(id);
    }
    for(const [id,r]of Object.entries(manifest.skills))if(r.silent&&audio.play(id,'proc')!==false)throw Error(`Silent passive played: ${id}`);
    audio.stopAll();meter.disconnect();
    return {decoded:decoded.length,contextState:audio.context.state,audiblePeak,beforeMute,masterMuted,effectsMuted,unmuted,paused,resumed,
      heroCasts,ixchelCompatibilityCasts:ixchelCasts,allyCasts,ui:[...new Set(ui)],loops,missing:[...audio.missing],
      limitation:'Ixchel Step 9 is absent; eight redesigned passives remain data/audio-ready, not live gameplay.'};
  });
  assert.equal(report.decoded,150);assert.equal(report.heroCasts.length,32);assert.equal(report.allyCasts.length,18);assert.equal(report.ui.length,8);assert.equal(report.loops.length,18);
  assert.equal(report.missing.length,0);assert.equal(soundWarnings.length,0,soundWarnings.join('\n'));assert.equal(errors.length,0,errors.join('\n'));assert.equal(badAudio.length,0,badAudio.join('\n'));
  await fs.writeFile(path.join(output,'playback-report.json'),JSON.stringify({...report,errors,soundWarnings,badAudio,elapsedMs:Math.round(performance.now()-started)},null,2)+'\n');
  console.log(`Audio browser audit: ${report.decoded} decoded WAVs, ${report.heroCasts.length} hero + ${report.allyCasts.length} ally handlers, 8 UI cues, 18 loops, audible mixer signal; mute/pause respected.`);
}finally{await browser.close();await server.close();}
