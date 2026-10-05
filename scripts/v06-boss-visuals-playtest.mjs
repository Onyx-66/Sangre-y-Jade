// Production FxDirector/state gallery, without audio or combat instrumentation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright-core';

const candidate=process.argv.includes('--candidate'),output=path.resolve(process.env.SYJ_BOSS_VISUAL_OUTPUT||'docs/v0.6/previews/v12/gallery');
await fs.mkdir(output,{recursive:true});
const report={candidate,errors:[],warnings:[],effects:[],checks:[],captures:[]};
const check=(condition,label)=>{report.checks.push({label,passed:!!condition});assert.ok(condition,label);};
const server=await createServer({server:{host:'127.0.0.1',port:0,watch:{ignored:['**/docs/**','**/.tools/**']}},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/boss-preview.html${candidate?'?candidate=1':''}`);
 await page.waitForFunction(()=>window.__bossPreview?.ready);
 check(await page.evaluate(()=>window.__bossPreview.frames===64&&window.__bossPreview.states.length===7),'all 64 frames decode and all seven states render');
 await page.screenshot({path:path.join(output,'states.png'),fullPage:true});report.captures.push('states.png');
 report.effects=await page.evaluate(async()=>{
  const {scene:s,effects}=window.__bossPreview;s.game.loop.stop();s.pending?.remove();s.entry?.finish();s.fx.destroy();
  const rows=[],defs=(await import('/src/data/bosses-v06.json')).default;
  for(const id of effects){
   s.fx.destroy();s.elapsed=0;const row=defs.find(b=>id.startsWith(`boss-${b.id}-`))?.phases.flatMap(p=>p.abilities).find(a=>id.endsWith(`-${a.id}`));
   const ctx={x:0,y:0,angle:0,arena:{x:0,y:0,radius:600},sound:false},draw=s.fx.play(id,'cast',ctx);let peak=s.fx.liveUnits;
   if(!row){for(let n=0;n<120;n++)draw.update(n/120);draw.finish();s.fx.prune();}
   else{
    s.elapsed=row.parameters.windup;s.events.emit('update',0,0);s.fx.play(id,'impact',ctx);
    for(let n=0;n<300;n++){s.elapsed+=1/30;s.events.emit('update',n*1000/30,1000/30);s.fx.prune();peak=Math.max(peak,s.fx.liveUnits);}
   }
   s.fx.prune();rows.push({id,peak,remaining:s.fx.liveUnits,missing:[...s.fx.missing]});
   s.fx.destroy();
  }return rows;
 });
 for(const row of report.effects){check(row.peak>0&&row.peak<=24,`${row.id}: real stills within cap`);check(row.remaining===0&&row.missing.length===0,`${row.id}: all effects expire without missing art`);}
 // Capture one contrasting ability from each boss using the real recipe.
 for(const id of ['boss-camazotz-sonic-screech','boss-zipacna-rock-rain','boss-vucub-sunbeam-sweep','boss-ahpuch-soul-drain']){
  await page.evaluate(id=>{const s=window.__bossPreview.scene;s.fx.destroy();s.elapsed=0;s.fx.play(id,'impact',{x:-180,y:0,angle:0,arena:{x:0,y:0,radius:600},markers:id.includes('rock-rain')?Array.from({length:8},(_,i)=>({x:(i%4-1.5)*110,y:(Math.floor(i/4)-.5)*140,radius:55})):undefined,sound:false});s.elapsed=.2;s.events.emit('update',0,0);s.game.step(16,0);},id);
  await page.locator('#effect').scrollIntoViewIfNeeded();const file=`${id}.png`;await page.locator('#effect').screenshot({path:path.join(output,file)});report.captures.push(file);
 }
 check(report.errors.length===0,'zero browser exceptions, errors and HTTP failures');check(report.warnings.length===0,'zero console or missing-asset warnings');
}finally{
 report.passed=report.effects.length===25&&report.checks.every(c=>c.passed)&&report.errors.length===0&&report.warnings.length===0;
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,effects:report.effects.length,errors:report.errors,warnings:report.warnings,output}));
}
