// B6 local Chrome evidence: real generated-world views, collision galleries,
// rendered frame intervals and fixed-cap streaming. No downloads or debug hooks.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {generateWorld} from '../src/world/generator/index.js';
let seed='b6-art';for(let n=0;n<50;n++){seed=`b6-art-${n}`;if(generateWorld('overgrown',seed).sites[0].assembly.faces.length===4)break;}
const output='docs/v0.6/previews/b6/runtime';await mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={errors:[],views:[],galleries:[]};
try{
 report.seed=seed;const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?debug=collision&seed=${seed}`);await page.waitForFunction(()=>window.__SANGRE_Y_JADE__);
 await page.evaluate(async seed=>{const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.save.setSetting('master',0);app.lastSelection={heroId:'balam',mapId:'overgrown',modeId:'quick',seed};await app.startRun();const s=app.game.scene.getScene('Ritual');s.invulnerable=1e9;s.nextBossIndex=99;s.finalSpawned=true;s.cameras.main.stopFollow();},seed);
 for(const kind of ['centre','corner','settlement','pyramid']){
  const result=await page.evaluate(kind=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),w=s.mapWorld;
   const point=kind==='centre'?{x:0,y:0}:kind==='corner'?{x:w.layout.bounds.left+400,y:w.layout.bounds.top+300}:kind==='settlement'?w.layout.sites.find(x=>x.kind==='settlement'):w.layout.sites.find(x=>x.kind==='landmark').assembly;
   s.player.setData('level',0);s.player.body.reset(point.x,point.y+120);w.collision.actors.delete(s.player);s.cameras.main.centerOn(point.x,point.y);s.cameras.main.preRender();w.update(w.worldView());for(let i=0;i<20;i++)w.processPending(2);w.art.update(s.time.now);w.collision.update();
   return {kind,active:w.active.size,pool:w.visualPool.length+w.colliderPool.length,overhead:w.overheads.parts.size+w.overheads.pool.length,terrain:w.art.authored.pool.length,hash:w.layout.hash};},kind);
  assert.ok(result.terrain>0&&result.terrain<=320);assert.ok(result.active+result.pool+result.overhead<=350);report.views.push(result);await page.waitForTimeout(150);await page.screenshot({path:`${output}/${kind}.png`});
 }
 await page.evaluate(()=>{const c=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').mapWorld.collision;c.debug=false;c.graphics?.clear();c.legend?.setVisible(false);});
 report.renderer=await page.evaluate(()=>{const game=window.__SANGRE_Y_JADE__.game,gl=game.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');return {type:game.renderer.type,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',stairs:game.scene.getScene('Ritual').mapWorld.layout.sites[0].assembly.faces};});
 assert.equal(report.renderer.stairs.length,4,'all four stair directions exercised');
 report.directionReview='South-ascending art rejected as ambiguous; existing procedural stair marks remain visible for this direction.';
 report.frameTime=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function frame(now){if(last)samples.push(now-last);last=now;if(samples.length<360)requestAnimationFrame(frame);else{samples.sort((a,b)=>a-b);resolve({frames:samples.length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1),note:'Desktop headless Chrome rAF, collision overlay off, unthrottled; not phone FPS'});}}requestAnimationFrame(frame);}));
 await page.evaluate(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.scene.pause();s.physics.world.pause();s.cameras.main.centerOn(0,0);s.cameras.main.preRender();s.mapWorld.collision.graphics?.clear();s.mapWorld.collision.legend?.setVisible(false);s.player.setVisible(false);for(const o of s.children.list)if(o.type!=='Camera')o.setVisible?.(false);document.querySelectorAll('.hud,.touch-controls').forEach(x=>x.style.visibility='hidden');});
 const groups=await page.evaluate(()=>{const k=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').mapWorld.kit;return [...new Set(k.items.map(x=>x.category)),'structures'];});
 for(const category of groups){const count=await page.evaluate(c=>{const k=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').mapWorld.kit;return c==='structures'?k.structureArt.length:k.items.filter(x=>x.category===c).length;},category),pageSize=category==='buildings'?1:4;
  for(let offset=0;offset<count;offset+=pageSize){await page.evaluate(({category,offset,pageSize})=>{
   const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),w=s.mapWorld;for(const o of s.qaObjects||[])o.destroy();s.qaObjects=[];const g=s.add.graphics().setDepth(40000);s.qaObjects.push(g);g.fillStyle(0x223b2e,1).fillRect(-640,-360,1280,720);
   const entries=(category==='structures'?w.kit.structureArt:w.kit.items.filter(x=>x.category===category)).slice(offset,offset+pageSize);for(const [i,entry]of entries.entries()){
    const scale=category==='buildings'?Math.min(.9,620/entry.size.height):Math.min(.55,285/entry.size.height),x=pageSize===1?0:(i%2)*600-300,y=pageSize===1?300:Math.floor(i/2)*330-40,shape=entry.collider||{type:'none'};
    const img=s.add.image(x,y,entry.textureKey).setOrigin(.5,1).setDisplaySize(entry.size.width*scale,entry.size.height*scale).setDepth(40001);s.qaObjects.push(img);
    const hero=s.add.image(x+entry.size.width*scale/2+32,y-3,s.player.texture.key,s.player.frame.name).setOrigin(.5,1).setScale(.64).setDepth(40001);s.qaObjects.push(hero);
    const lines=s.add.graphics().setDepth(40002);s.qaObjects.push(lines);lines.lineStyle(2,0xffcf4a,1);const cx=x+(shape.offsetX||0)*scale,cy=y+(shape.offsetY||0)*scale;if(shape.type==='circle')lines.strokeCircle(cx,cy,shape.radius*scale);if(shape.type==='rect')lines.strokeRect(cx-shape.width*scale/2,cy-shape.height*scale/2,shape.width*scale,shape.height*scale);
    if(entry.occluder){const q=entry.occluder;lines.lineStyle(1,0x8ec5ff,.65).strokeRect(x+q.x*scale,y+q.y*scale,q.width*scale,q.height*scale);}
    if(entry.axis){lines.lineStyle(2,0xff80df,1);const d=entry.axis==='x'?1:0;lines.lineBetween(x-d*55,y-55-(1-d)*50,x+d*55,y-55+(1-d)*50);}
   }
  },{category,offset,pageSize});await page.waitForTimeout(50);const file=`collision-${category}-${offset/pageSize}.png`;await page.screenshot({path:`${output}/${file}`});report.galleries.push(file);}
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
