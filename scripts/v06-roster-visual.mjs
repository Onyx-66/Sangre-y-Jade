import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
const output=path.resolve(process.env.SYJ_ROSTER_VISUAL_OUTPUT||'docs/v0.6/previews/v8/readability');await fs.mkdir(output,{recursive:true});
const report={checks:[],errors:[],screenshots:[]},start=performance.now();
const check=(condition,label)=>{report.checks.push({label,passed:!!condition});assert.ok(condition,label);};
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const map of ['overgrown','bloodmoon','cenote'])for(const locale of ['en','ar'])for(const [width,height]of [[568,320],[1280,720]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.stack));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  const result=await page.evaluate(async({map,locale})=>{
   const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
   const {GameScene}=await import('/src/scenes/GameScene.js'),original=GameScene.prototype.create;
   GameScene.prototype.create=function(){original.call(this);this.update=()=>{};};
   const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.save.setSetting('language',locale);
   app.lastSelection={heroId:'ixchel',mapId:map,modeId:'quick'};await app.startRun();app.game.loop.stop();
   const scene=app.game.scene.getScene('Ritual');scene.elapsed=180;scene.physics.pause();scene.hud.toast('');
   const {ENEMIES}=await import('/src/data/world.js'),{worldView}=await import('/src/systems/Viewport.js');
   const ids=Object.keys(ENEMIES).filter(id=>ENEMIES[id].maps.includes('all')||ENEMIES[id].maps.includes(map));
   const view=worldView(scene),actors=[],outside=[];
   ids.forEach((id,i)=>{const e=scene.spawnEnemy(id,null,{affix:i===0?'armored':null});if(!e)throw Error(`Spawn failed: ${id}`);
    outside.push(e.x+e.displayWidth/2<=view.x-120||e.x-e.displayWidth/2>=view.right+120||e.y+e.displayHeight/2<=view.y-120||e.y-e.displayHeight/2>=view.bottom+120);
    const x=scene.player.x-300+(i%5)*150,y=scene.player.y-140+Math.floor(i/5)*145;e.body.reset(x,y);
    e.setData({buried:false,wardShield:id==='priest'?40:0,wardUntil:scene.elapsed+6,prismUntil:id==='crystal_golem'?scene.elapsed+3:0});e.setVisible(true);
    e.setData('hp',e.getData('maxHp')*.65);scene.enemyBars.damage(e,e.getData('maxHp'));
    actors.push({id,key:e.texture.key,hp:e.getData('maxHp'),radius:e.body.radius*e.scaleX});
   });
   scene.settings.enemyHealthBars='always';const models=scene.enemyBars.draw();scene.enemySystem.draw();
   scene.telegraphs.play({shape:'cone',x:scene.player.x-200,y:scene.player.y+150,radius:120,arc:110*Math.PI/180,angle:0,windup:1});
   scene.telegraphs.play({shape:'line',x:scene.player.x,y:scene.player.y+150,length:260,width:68,windup:1});scene.telegraphs.update(.5);
   app.game.step(scene.time.now+16,16);
   return {ids,actors,outside,models:models.map(({x,y,width,height,hp,shield})=>({x,y,width,height,hp,shield})),pools:{warnings:scene.telegraphs.live.size,effects:scene.fx.liveUnits}};
  },{map,locale});
  const label=`${map}/${locale}/${width}`;check(result.outside.every(Boolean),`${label}: all spawn footprints >=120 outside view`);
  check(result.actors.length===result.ids.length&&result.models.length===result.ids.length,`${label}: every map enemy rendered with a bar`);
  const rows=JSON.parse(await fs.readFile('src/data/enemies-v06.json','utf8'));
  check(result.actors.every(e=>Math.abs(e.radius-rows[e.id].radius)<1e-6),`${label}: collision radius exact`);
  check(result.pools.warnings<=64&&result.pools.effects<=24,`${label}: visual pool budgets`);
  report.checks.push({label:`${map}/${locale}/${width}: geometry`,passed:true,models:result.models,actors:result.actors});
  const file=`${map}-${locale}-${width}x${height}.png`;await page.screenshot({path:path.join(output,file)});report.screenshots.push(file);await context.close();
 }
 for(const map of ['overgrown','bloodmoon','cenote'])for(const width of [568,1280]){
  const find=locale=>report.checks.find(c=>c.label===`${map}/${locale}/${width}: geometry`).models;
  check(JSON.stringify(find('en'))===JSON.stringify(find('ar')),`${map}/${width}: identical EN/AR enemy bar geometry`);
 }
 check(report.errors.length===0,'no exceptions or HTTP asset failures');
 const tiles=await Promise.all(report.screenshots.map(async(file,i)=>({input:await sharp(path.join(output,file)).resize(480,270).png().toBuffer(),left:i%3*480,top:Math.floor(i/3)*270})));
 await sharp({create:{width:1440,height:Math.ceil(tiles.length/3)*270,channels:4,background:'#17121d'}}).composite(tiles).png().toFile(path.join(output,'contact.png'));
 console.log(`${report.checks.length} roster visual checks; ${report.screenshots.length} screenshots`);
}finally{report.wallSeconds=(performance.now()-start)/1000;await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
