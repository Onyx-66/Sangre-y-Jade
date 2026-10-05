// Strict V9 presentation check. No combat values or audio files are changed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';

const candidate=process.argv.includes('--candidate');
const output=path.resolve(process.env.SYJ_ENEMY_VISUALS_OUTPUT||'docs/v0.6/previews/v9/runtime');
await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],warnings=[],captures=[];
const check=(ok,label,evidence)=>{checks.push({label,passed:!!ok,...(evidence?{evidence}:{})});assert.ok(ok,label);};
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const url=`http://127.0.0.1:${server.httpServer.address().port}`;
function observe(page){
 page.on('pageerror',error=>errors.push(error.stack));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
 page.on('console',message=>{
  if(message.type()==='log'&&message.text().startsWith('[V9 QA]'))console.log(message.text());
  if(message.type()==='error')errors.push(message.text());
  if(message.type()==='warning'&&/Placeholder:|Sound fallback:|No active handler:/.test(message.text()))warnings.push(message.text());
 });
}
try{
 const preview=await browser.newPage({viewport:{width:1280,height:720}});observe(preview);
 await preview.goto(`${url}/tools/actor-preview.html${candidate?'?candidate=1':''}`);
 await preview.waitForFunction(()=>window.__actorPreview?.ready);
 await preview.locator('#motion').click();
 await preview.evaluate(()=>Promise.all([...document.querySelectorAll('figure img')].map(image=>image.decode())));
 const gallery=await preview.evaluate(()=>({meta:window.__actorPreview,images:[...document.querySelectorAll('figure img')].map(image=>({width:image.naturalWidth,height:image.naturalHeight,src:image.src}))}));
 check(gallery.meta.frames===240&&gallery.meta.ids.length===15&&gallery.meta.states.length===7,'preview decodes every one of the 240 frames');
 check(gallery.images.length===105&&gallery.images.every(image=>image.width===128&&image.height===128),'preview displays 105 independent actor/state animations');
 const before=gallery.images.map(image=>image.src);await preview.locator('#motion').click();await preview.waitForTimeout(270);
 const after=await preview.locator('figure img').evaluateAll(images=>images.map(image=>image.src));
 check(after.some((source,i)=>source!==before[i]),'preview actually advances animation frames');
 await preview.locator('#motion').click();const paused=await preview.locator('figure img').evaluateAll(images=>images.map(image=>image.src));await preview.waitForTimeout(200);
 check(JSON.stringify(paused)===JSON.stringify(await preview.locator('figure img').evaluateAll(images=>images.map(image=>image.src))),'preview pause is functional');
 const galleryFile=candidate?'candidate-actor-preview.png':'actor-preview.png';await preview.screenshot({path:path.join(output,galleryFile),fullPage:true});captures.push(galleryFile);await preview.close();

 if(!candidate)for(const locale of ['en','ar'])for(const [width,height]of [[568,320],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage();observe(page);
  await page.goto(url);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  const evidence=await page.evaluate(async locale=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
   const {GameScene}=await import('/src/scenes/GameScene.js'),original=GameScene.prototype.create;
   GameScene.prototype.create=function(){original.call(this);this.update=()=>{};};
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('language',locale);
   app.save.setSetting('attackMode','manual');app.save.setSetting('screenShake',false);app.lastSelection={heroId:'kukul',mapId:'overgrown',modeId:'quick'};
   await app.startRun();console.log('[V9 QA] Run loaded');
   const scene=app.game.scene.getScene('Ritual');scene.physics.pause();scene.elapsed=180;
   const {textureManifest}=await import('/src/art/textureManifest.js'),{buildTextures}=await import('/src/art/TextureFactory.js');
   const {ENEMY_IDS,ENEMY_EFFECT_IDS,ENEMY_ANIMATIONS}=await import('/src/art/enemyVisuals.js');
   const {default:roster}=await import('/src/data/enemies-v06.json');
   const files=textureManifest({hero:scene.heroData}).filter(file=>!scene.textures.exists(file.key));
   console.log(`[V9 QA] Loading ${files.length} additional gallery textures`);
   if(files.length)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error(`Gallery loader stalled: ${scene.load.state}`)),15000);scene.load.once('complete',()=>{clearTimeout(timeout);resolve();});scene.load.once('loaderror',file=>{clearTimeout(timeout);reject(Error(file.key));});for(const file of files)scene.load.image(file.key,file.url);scene.load.start();});
   console.log('[V9 QA] Gallery textures loaded');
   buildTextures(scene);app.game.loop.stop();scene.cameras.main.preRender();const view=scene.cameras.main.worldView;
   const actors=[];let peak=0;
   for(const [i,id]of ENEMY_IDS.entries()){
    const data=roster[id];scene.mapData={...scene.mapData,id:data.maps.includes('all')?'overgrown':data.maps[0]};
    // This gallery fixture deliberately bypasses only the alive cap; ordinary
    // gameplay keeps all map, spawn and cap rules in the ten-minute audit.
    const enemy=scene.spawnEnemy(id,1,{affix:i===6?'armored':i===13?'shielded':null});
    assertActor(enemy,id);enemy.body.reset(view.x+view.width*(.14+(i%5)*.18),view.y+view.height*(.3+Math.floor(i/5)*.23));
    enemy.setData('buried',false).setVisible(true);scene.animateCharacter(enemy,enemy.getData('artKey'),'walk');
    const entry=scene.enemyVisuals.actors.get(enemy);actors.push({enemy,entry,id});
   }
   function assertActor(enemy,id){if(!enemy||enemy.getData('artKey')!==`enemy-${id}`)throw Error(`Missing actual actor: ${id}`);}
   scene.enemyVisuals.update();scene.enemyBars.draw();
   const states=Object.entries(ENEMY_ANIMATIONS).map(([state,animation])=>({state,actors:actors.map(({id})=>{
    const definition=scene.anims.get(`enemy-${id}-${state}`);return {id,frames:definition.frames.map(frame=>frame.textureKey),expected:animation.frames.map(n=>`enemy-${id}-frame-${n}`)};
   })}));
   const before=actors.map(({enemy})=>({id:enemy.getData('type'),radius:enemy.body.radius,scale:enemy.scaleX}));
   for(const {enemy}of actors)scene.animateCharacter(enemy,enemy.getData('artKey'),'windup',.35);
   scene.enemyVisuals.update();const squash=actors.every(({enemy,entry})=>entry.sprite.scaleX>enemy.scaleX);
   scene.enemyVisuals.pose(actors[0].enemy,'hurt',.2);scene.enemyVisuals.update();const flash=actors[0].entry.sprite.tintFill;
   scene.elapsed+=.4;scene.enemyVisuals.update();
   for(const {enemy}of actors)scene.animateCharacter(enemy,enemy.getData('artKey'),'idle');
   for(const [i,id]of ENEMY_EFFECT_IDS.entries()){
    scene.fx.play(id,'impact',{x:view.x+view.width*(.1+(i%6)*.16),y:view.y+view.height*(.25+Math.floor(i/6)*.25),radius:id==='puddle'?50:undefined,size:60,duration:.6,sound:false});peak=Math.max(peak,scene.fx.liveUnits);
   }
   const allEffects=scene.fx.live.map(effect=>effect.object?.texture?.key).filter(Boolean);
   for(let i=0;i<30;i++){scene.fx.play('dust-puff','impact',{x:scene.player.x,y:scene.player.y,size:40,duration:.4,sound:false});peak=Math.max(peak,scene.fx.liveUnits);}
   scene.fx.destroy();
   const playback=[];
   for(const state of Object.keys(ENEMY_ANIMATIONS)){
    const seen=actors.map(()=>new Set());
    for(const {enemy}of actors)scene.animateCharacter(enemy,enemy.getData('artKey'),state,.7);
    for(let n=0;n<40;n++){scene.elapsed+=1/60;app.game.step(scene.time.now+1000/60,1000/60);scene.enemyVisuals.update();
     actors.forEach(({entry},i)=>seen[i].add(entry.sprite.texture.key));}
    playback.push({state,actors:actors.map(({id},i)=>({id,seen:[...seen[i]],expected:ENEMY_ANIMATIONS[state].frames.map(n=>`enemy-${id}-frame-${n}`)}))});
   }
   scene.elapsed+=1;for(const {enemy}of actors)scene.animateCharacter(enemy,enemy.getData('artKey'),'walk',.1);
   scene.enemyVisuals.update();scene.enemyBars.draw();app.game.step(scene.time.now+16,16);
   window.__enemyGallery={actors,scene};
   return {actors:actors.map(({id,enemy,entry})=>({id,key:enemy.getData('artKey'),renderVisible:entry.sprite.visible,renderAlpha:entry.sprite.alpha,physicsAlpha:enemy.alpha,scale:enemy.scaleX,radius:enemy.body.radius})),states,playback,squash,flash,before,peak,allEffects,missing:[...scene.fx.missing],renderer:app.game.renderer.type};
  },locale);
  check(evidence.actors.length===15&&evidence.actors.every(actor=>actor.key===`enemy-${actor.id}`&&actor.renderVisible&&actor.renderAlpha>0&&actor.physicsAlpha===0),`${locale}/${width}: every real enemy renders through its own non-physics sprite`);
  check(evidence.states.every(state=>state.actors.every(actor=>JSON.stringify(actor.frames)===JSON.stringify(actor.expected))),`${locale}/${width}: all 105 real Phaser animation definitions use the exact frames`);
  check(evidence.playback.every(state=>state.actors.every(actor=>actor.expected.every(frame=>actor.seen.includes(frame)))),`${locale}/${width}: all 240 real frames advance on the rendered sprites`);
  check(evidence.squash&&evidence.flash,`${locale}/${width}: real windup stretch and white hit flash`);
  check(evidence.before.every((body,i)=>body.radius===evidence.actors[i].radius&&body.scale===evidence.actors[i].scale),`${locale}/${width}: presentation leaves collision size unchanged`);
  check(evidence.allEffects.length===18&&new Set(evidence.allEffects).size===18,`${locale}/${width}: all 18 actual FX textures render`);
  check(evidence.peak===24&&evidence.missing.length===0,`${locale}/${width}: strict 24-unit cap, no procedural still fallback`);
  const file=`${locale}-${width}x${height}-actors.png`;await page.screenshot({path:path.join(output,file)});captures.push(file);
  await page.evaluate(async()=>{
   const {scene}=window.__enemyGallery,{ENEMY_EFFECT_IDS}=await import('/src/art/enemyVisuals.js'),view=scene.cameras.main.worldView;
   for(const [i,id]of ENEMY_EFFECT_IDS.entries())scene.fx.play(id,'impact',{x:view.x+view.width*(.1+(i%6)*.16),y:view.y+view.height*(.3+Math.floor(i/6)*.21),size:85,duration:.6,sound:false});
   scene.game.step(scene.time.now+16,16);
  });
  const fxFile=`${locale}-${width}x${height}-fx.png`;await page.screenshot({path:path.join(output,fxFile)});captures.push(fxFile);
  const lifecycle=await page.evaluate(async()=>{
   const {actors,scene}=window.__enemyGallery,old=actors[0],oldSprite=old.entry.sprite;
   scene.enemyVisuals.die(old.enemy);scene.enemySystem.interrupt(old.enemy);old.enemy.disableBody(true,true);
   const replacement=scene.spawnEnemy('shade',1,{affix:null});replacement.body.reset(scene.player.x+75,scene.player.y+70);
   scene.enemyVisuals.update();const sprite=scene.enemyVisuals.actors.get(replacement).sprite;
   for(let i=0;i<40;i++){scene.elapsed+=1/60;scene.game.step(scene.time.now+1000/60,1000/60);scene.enemyVisuals.update();}
   scene.fx.prune();const result={sameBody:replacement===old.enemy,oldDestroyed:!oldSprite.active,currentActive:sprite.active,actors:scene.enemyVisuals.actors.size,missing:[...scene.fx.missing],fx:scene.fx.liveUnits};
   scene.enemyVisuals.destroy();result.cleaned=scene.enemyVisuals.actors.size===0&&!sprite.active;
   return result;
  });
  check(lifecycle.sameBody&&lifecycle.oldDestroyed&&lifecycle.currentActive&&lifecycle.cleaned,`${locale}/${width}: death playback, pool reuse and cleanup are serial-safe`,lifecycle);
  await context.close();
 }
 check(errors.length===0,'no browser/HTTP errors',errors);check(warnings.length===0,'no missing still/handler/sound warnings',warnings);
 if(!candidate){const files=captures.filter(file=>file.endsWith('-actors.png')),layers=[];
  for(const [i,file]of files.entries())layers.push({input:await sharp(path.join(output,file)).resize(640,360,{fit:'contain',background:'#111111'}).png().toBuffer(),left:i%2*640,top:Math.floor(i/2)*360});
  await sharp({create:{width:1280,height:720,channels:4,background:'#111111'}}).composite(layers).png().toFile(path.join(output,'contact.png'));}
 console.log(`${checks.length} V9 ${candidate?'candidate preview':'runtime'} checks pass; ${captures.length} screenshots`);
}finally{
 await fs.writeFile(path.join(output,candidate?'candidate-report.json':'report.json'),JSON.stringify({createdAt:new Date().toISOString(),checks,errors,warnings,captures},null,2)+'\n');
 await browser.close();await server.close();
}
