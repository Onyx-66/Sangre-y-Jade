// V11 integration/robustness audit, not a balance run. Real Phaser physics,
// attacks, skill/projectile collisions and effects; high hero HP and bounded
// boss damage allow a complete180s coverage fight with every phase represented.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';

const visuals=process.env.SYJ_BOSS_VISUALS==='1';
const output=path.resolve(process.env.SYJ_BOSS_OUTPUT||(visuals?'docs/v0.6/previews/v12/fights':'docs/v0.6/previews/v11'));
await fs.mkdir(output,{recursive:true});
const report={createdAt:new Date().toISOString(),policy:`${visuals?'V12 visual':'V11 boss'} coverage stress audit; not balance or FPS measurement`,
 secondsPerBoss:180,stepHz:30,runs:[],checks:[],errors:[],warnings:[],captures:[]},started=performance.now();
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const url=`http://127.0.0.1:${server.httpServer.address().port}`;
const check=(condition,label)=>{report.checks.push({label,passed:!!condition});assert.ok(condition,label);};
async function start(page,id,{locale='en',skip=false}={}){
 page.on('pageerror',error=>report.errors.push(error.stack));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
 return page.evaluate(async({id,locale,skip})=>{
  const {GameScene}=await import('/src/scenes/GameScene.js'),create=GameScene.prototype.create;
  GameScene.prototype.create=function(){create.call(this);this.update=()=>{};};
  const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
  const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('language',locale);
  app.save.setSetting('attackMode','auto');app.save.setSetting('autoAim',true);app.save.setSetting('damageNumbers',false);app.save.setSetting('screenShake',false);
  app.save.setSetting('skipBossEntrances',skip);app.lastSelection={heroId:'kukul',mapId:'overgrown',modeId:'quick'};await app.startRun();app.game.loop.stop();
  const scene=app.game.scene.getScene('Ritual'),{BOSSES}=await import('/src/data/world.js');
  scene.updateDirector=()=>{};scene.stats.hp=scene.stats.maxHp=20000;scene.stats.nextXp=Infinity;
  scene.hud.el.querySelectorAll('.toast').forEach(node=>node.remove());
  const boss=scene.spawnBoss(BOSSES.find(b=>b.definitionId===id),{position:{x:180,y:0}});
  window.__bossV11={app,scene,boss,GameScene,render(){scene.cameras.main.preRender();app.game.step(scene.time.now+16,16);}};
  scene.cutscenes.update(skip?1:2);window.__bossV11.render();return {active:scene.cutscenes.active,hp:boss.getData('hp'),entryKind:scene.cutscenes.current.entry.kind};
 },{id,locale,skip});
}
try{
 for(const id of ['camazotz','zipacna','vucub','ahpuch']){
  const context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'}),page=await context.newPage();
  const loaded=await start(page,id);check(loaded.active,`${id}: cinematic started`);
  const file=`${id}-entry.png`;await page.screenshot({path:path.join(output,file)});report.captures.push(file);
  const run=await page.evaluate(async({id,visuals})=>{
   const q=window.__bossV11,{scene:s,boss:b,app,GameScene}=q,{telegraphContains}=await import('/src/systems/Telegraph.js');
   s.cutscenes.update(20);app.game.loop.stop();s.sys.sceneUpdate=GameScene.prototype.update;
   const delta=1000/30,start=s.elapsed;let clock=s.time.now,frames=0,nextDecision=0;
   const d=s.bossController.state.definition,damage=[],phaseTimes=[],warnings=[],targetKills={},samples=[],readyTimes={};
   let peakFx=0,peakWarnings=0,peakTasks=0,peakTargets=0,nextSample=30;
   const apply=s.damageEnemy.bind(s);s.damageEnemy=(enemy,amount,...args)=>apply(enemy,enemy===b?Math.min(amount,d.hp*.0003):amount,...args);
   const kill=s.killEnemy.bind(s);s.killEnemy=(enemy,...args)=>{
    if(enemy===b){b.setData('hp',1);return;}
    if(enemy.getData('bossObject')){const kind=enemy.getData('bossTargetKind');targetKills[kind]=(targetKills[kind]||0)+1;}
    return kill(enemy,...args);
   };
   const hurt=s.damagePlayer.bind(s);s.damagePlayer=(amount,...args)=>{const before=s.stats.hp,value=hurt(amount,...args);if(s.stats.hp<before)damage.push({seconds:s.elapsed-start,amount:before-s.stats.hp});return value;};
   const play=s.telegraphs.play.bind(s.telegraphs);s.telegraphs.play=options=>{
    const warning=play(options);if(warning&&options.tag?.startsWith('boss:'))warnings.push({tag:options.tag,start:s.elapsed,windup:warning.windup,end:null});
    return warning;
   };
   const release=s.telegraphs.release.bind(s.telegraphs);s.telegraphs.release=(record,cancelled)=>{
    const row=warnings.findLast(w=>w.tag===record.tag&&w.end===null&&Math.abs(w.start-(record.bornAt??w.start))<1e-6);
    if(row){row.end=s.elapsed;row.cancelled=!!cancelled;}return release(record,cancelled);
   };
   const bossPhase=s.bossController.phaseChanged.bind(s.bossController);s.bossController.phaseChanged=()=>{
    const before=s.bossController.state?.phase;bossPhase();if(s.bossController.state?.phase!==before)phaseTimes.push({phase:s.bossController.state.phase+1,seconds:s.elapsed-start});
   };
   let lastPhase=0;
   function drive(){
    const hero=s.player,state=s.bossController.state,foes=s.enemies.getChildren().filter(e=>e.active);
    const target=foes.filter(e=>e.getData('bossObject')).sort((a,b)=>Math.hypot(a.x-hero.x,a.y-hero.y)-Math.hypot(b.x-hero.x,b.y-hero.y))[0]||b;
    const rite=[...s.telegraphs.live].find(w=>w.tag==='boss:final-rite'),safe=rite?.safeCircles||state.fog?.circles;
    const safeGoal=safe?.reduce((a,c)=>Math.hypot(a.x-hero.x,a.y-hero.y)<Math.hypot(c.x-hero.x,c.y-hero.y)?a:c);
    const desired=target.getData('bossObject')?100:240;
    let best={score:-Infinity,x:0,y:0};
    for(let i=-1;i<24;i++){
     const angle=i*Math.PI/12,x=i<0?0:Math.cos(angle),y=i<0?0:Math.sin(angle),p={x:hero.x+x*s.stats.speed*.35,y:hero.y+y*s.stats.speed*.35};
     let score=-Math.abs(Math.hypot(p.x-target.x,p.y-target.y)-desired)*.4;
     if(safeGoal)score-=Math.hypot(p.x-safeGoal.x,p.y-safeGoal.y)*3;
     if(Math.hypot(p.x-state.arena.x,p.y-state.arena.y)>570)score-=2000;
     for(const w of s.telegraphs.live)if(telegraphContains(w,p))score-=500*(.1+w.progress);
     for(const shot of s.enemyProjectiles.getChildren())if(shot.active&&Math.hypot(p.x-shot.x,p.y-shot.y)<65)score-=300;
     if(i<0)score+=1;if(score>best.score)best={score,x,y};
    }
    s.hud.move={x:best.x,y:best.y};
    for(let slot=0;slot<s.skillSlots.length;slot++)if(!s.skillSlots[slot].remaining&&Math.hypot(target.x-hero.x,target.y-hero.y)<650)s.castSkill(slot);
    if([...s.telegraphs.live].some(w=>w.progress>.7&&telegraphContains(w,hero))&&s.dash.cooldown<=0)s.tryDash();
   }
   while(s.elapsed-start<180-1e-6&&!s.ended){
    const age=s.elapsed-start,phase=Math.min(d.phases.length-1,Math.floor(age/(180/d.phases.length)));
    if(phase>lastPhase){lastPhase=phase;b.setData('hp',d.hp*(d.phases[phase].threshold-.01));s.bossController.phaseChanged();}
    if(age>=nextDecision){drive();nextDecision=age+.2;}
    clock+=delta;s.cameras.main.preRender();app.game.headlessStep(clock,delta);frames++;
    const state=s.bossController.state;if(!state||state.dead)throw Error(`${id}: premature boss death`);
    if(s.pausedForChoice)throw Error(`${id}: unexpected choice pause`);
    for(const actor of s.enemies.getChildren())if(actor.active&&!Number.isFinite(actor.x+actor.y))throw Error(`${id}: nonfinite actor`);
    peakFx=Math.max(peakFx,s.fx.liveUnits);peakWarnings=Math.max(peakWarnings,s.telegraphs.live.size);peakTasks=Math.max(peakTasks,state.runtime.tasks.length);peakTargets=Math.max(peakTargets,state.runtime.targets.length);
    if(peakFx>24||peakWarnings>64||peakTasks>128||peakTargets>6)throw Error(`${id}: unbounded pool`);
    if(age>=nextSample){samples.push({seconds:age,hp:s.stats.hp,bossHp:b.getData('hp'),phase:state.phase+1,alive:s.enemies.countActive()});nextSample+=30;}
    if(frames>5500)throw Error(`${id}: stopped simulation clock`);
   }
   const casts={...s.bossController.casts},seconds=s.elapsed-start,hp=s.stats.hp,missing=[...s.fx.missing];
   const uncast=d.phases.flatMap(p=>p.abilities).filter(a=>!casts[`${id}:${a.id}`]).map(a=>a.id);
   const early=warnings.filter(w=>!w.cancelled&&w.end!==null&&w.end-w.start<w.windup-1e-6);
   let visualAudit=null;
   if(visuals){
    const keys=['idle','walk','windup','attack','recover','hurt','death'].map(state=>`${b.getData('artKey')}-${state}`),clone=s.bossVisuals.render(b);
    const registered=keys.every(key=>s.anims.exists(key)),clonePresent=!!clone?.active&&b.alpha===0;
    let deathDone=0;s.bossController.die(b,()=>deathDone++);const death=s.bossController.state.death.sprite;
    const deathState=death.anims.currentAnim?.key===keys.at(-1);b.disableBody(true,true);
    const seen=new Set();for(let n=0;n<30;n++){if(death.active)seen.add(death.anims.currentFrame?.textureKey);clock+=delta;app.game.headlessStep(clock,delta);}
    s.fx.prune();visualAudit={registered,clonePresent,deathState,deathFrames:[...seen],deathDone,deathCleaned:!death.active,bossFxRemaining:s.fx.live.filter(e=>e.object.active&&e.object.texture?.key?.startsWith('fx-still-boss-')).length};
   }
   s.bossController.destroy();const cleanup=s.telegraphs.live.size===0&&s.enemies.getChildren().every(e=>!e.active||!e.getData('bossObject'));
   return {id,seconds,frames,hp,casts,uncast,phaseTimes,damageTaken:20000-hp,targetKills,peakFx,peakWarnings,peakTasks,peakTargets,early,cleanup,samples,missing,
    visualAudit,instrumentation:'hero HP20000; boss-hit damage bounded for180s; staged phase thresholds; no normal pack spawns; real player/enemy/orb collisions'};
  },{id,visuals});
  report.runs.push(run);check(Math.abs(run.seconds-180)<.04,`${id}: complete180s fight`);check(run.uncast.length===0,`${id}: every roster ability executed`);
  check(run.early.length===0,`${id}: no warning resolved early`);check(run.cleanup,`${id}: all boss objects/warnings cleaned up`);
  if(visuals)check(run.missing.length===0,`${id}: no missing boss/skill stills`);
  if(visuals)check(run.visualAudit?.registered&&run.visualAudit.clonePresent&&run.visualAudit.deathState&&run.visualAudit.deathFrames.length===4&&run.visualAudit.deathDone===1&&run.visualAudit.deathCleaned&&run.visualAudit.bossFxRemaining===0,`${id}: all states, four death frames and zero leaked boss FX`);
  console.log(`${id}: ${run.seconds.toFixed(2)}s, casts=${JSON.stringify(run.casts)}, targets=${JSON.stringify(run.targetKills)}, peaks FX${run.peakFx}/warnings${run.peakWarnings}/tasks${run.peakTasks}`);
  await context.close();
 }
 // Readability of special mechanics inEN/AR at a landscape-phone viewport.
 for(const locale of ['en','ar'])for(const [id,skill,phase]of [['camazotz','eclipse',1],['zipacna','stone-armor',1],['vucub','solar-flare-rings',0],['ahpuch','final-rite',2]]){
  const context=await browser.newContext({viewport:{width:568,height:320}}),page=await context.newPage();await start(page,id,{locale,skip:true});
  const state=await page.evaluate(({skill,phase})=>{
   const q=window.__bossV11,s=q.scene;s.cutscenes.update(2);s.elapsed=0;s.bossController.state.phase=phase;
   const ctx=s.bossController.context(),ability=ctx.behavior.abilities(ctx).find(a=>a.id===skill);s.bossController.cast(ctx.state,ability,ctx);
   if(skill!=='final-rite'){s.elapsed=ability.windup;s.telegraphs.update(ability.windup);s.elapsed+=.6;s.bossController.updateWorld(.6);}else{s.elapsed=2;s.telegraphs.update(2);}
   s.bossController.refreshBar();q.render();
   const r=s.hud.boss.getBoundingClientRect();return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,live:s.fx.liveUnits,warnings:s.telegraphs.live.size};
  },{skill,phase});
  check(state.inside&&state.live<=24,`${locale}/${id}: phone HUD and effect bounds`);
  const file=`${locale}-${skill}-568x320.png`;await page.screenshot({path:path.join(output,file)});report.captures.push(file);await context.close();
 }
 check(report.errors.length===0,'zero browser exceptions, console errors or HTTP failures');
 check(visuals?report.warnings.length===0:report.warnings.every(w=>/\[skills\] (Placeholder: fx\/boss-|Sound fallback: skills\/sfx-boss-)/.test(w)),visuals?'zero console or missing-asset warnings':'only documented future boss-art/audio warnings');
 const tiles=[];for(const [i,file]of report.captures.entries())tiles.push({input:await sharp(path.join(output,file)).resize(568,320).toBuffer(),left:i%3*568,top:Math.floor(i/3)*320});
 await sharp({create:{width:1704,height:Math.ceil(tiles.length/3)*320,channels:4,background:'#15121c'}}).composite(tiles).png().toFile(path.join(output,'bosses-contact.png'));
}finally{
 report.wallSeconds=(performance.now()-started)/1000;report.passed=report.runs.length===4&&report.checks.length===(visuals?38:30)&&report.checks.every(c=>c.passed)&&report.errors.length===0;
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();
 console.log(JSON.stringify({passed:report.passed,runs:report.runs.length,checks:report.checks.length,errors:report.errors.length,wallSeconds:report.wallSeconds,output}));
}
