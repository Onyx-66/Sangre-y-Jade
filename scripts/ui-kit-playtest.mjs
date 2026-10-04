import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const started=performance.now(),output=path.resolve('docs/v0.6/previews/ui-kit/demo');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const checks=[],errors=[],screens=[];
page.on('pageerror',error=>errors.push(error.stack));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
const check=(condition,label)=>{checks.push({label,passed:!!condition});assert.ok(condition,label);};
try {
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/ui-kit-demo.html`);
  await page.waitForFunction(()=>window.__UI_KIT_DEMO__?.ready);
  await page.locator('#animate-torch').uncheck();
  const audit=await page.evaluate(()=>{
    const problems=[],samples=[];
    for(const item of window.__UI_KIT_DEMO__.kit.items){
      const elements=[...document.querySelectorAll(`[data-preview="${item.id}"]`)];
      if(elements.length!==3)problems.push(`${item.id}: ${elements.length} samples`);
      for(const [i,element]of elements.entries()){
        const r=element.getBoundingClientRect(),style=getComputedStyle(element);
        if(Math.abs(r.width-Number(element.dataset.expectedWidth))>.1)problems.push(`${item.id}: width changed`);
        if(element.tagName==='IMG'&&(!element.complete||!element.naturalWidth))problems.push(`${item.id}: broken image`);
        if(item.sliceInsets){
          const widths=[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth].map(parseFloat);
          if(JSON.stringify(widths)!==JSON.stringify(Object.values(item.sliceInsets)))problems.push(`${item.id}: incorrect cap geometry`);
          if(!style.borderImageSource.includes(item.path)||!style.borderImageSlice.endsWith('fill'))problems.push(`${item.id}: missing nine-slice`);
          if(element.clientWidth<1||element.clientHeight<1)problems.push(`${item.id}: collapsed center`);
        }
        samples.push({id:item.id,index:i,width:r.width,height:r.height});
      }
    }
    return {problems,samples};
  });
  check(audit.samples.length===123,'41 components × three real rendered sizes');
  check(audit.problems.length===0,`render geometry: ${audit.problems.join('; ')}`);
  // Actual screenshot pixels: nine-slice corners must be identical at all
  // three widths, not merely declared in CSS. Test every resizable component.
  const kit=JSON.parse(await fs.readFile('src/data/uiKit.json','utf8'));
  for(const item of kit.items.filter(item=>item.sliceInsets)){
    const textures=[];
    for(let n=0;n<3;n++)textures.push(await page.locator(`[data-asset="${item.id}"] .sample`).nth(n).locator('.nine-slice').screenshot());
    for(const corner of ['tl','tr','bl','br']){
      const hashes=[];
      for(const buffer of textures){
        const meta=await sharp(buffer).metadata(),s=item.sliceInsets;
        const width=corner.endsWith('l')?s.left:s.right,height=corner.startsWith('t')?s.top:s.bottom;
        const left=corner.endsWith('l')?0:meta.width-width,top=corner.startsWith('t')?0:meta.height-height;
        // Background checkerboard can have a different phase; compare only
        // visibly opaque source texels rather than pretending alpha is in screenshots.
        const crop=await sharp(buffer).extract({left,top,width,height}).removeAlpha().raw().toBuffer();
        hashes.push({crop,width,height});
      }
      const reference=hashes[0];
      let compared=0,differing=0;
      const source=await sharp(`public/${item.path}`).ensureAlpha().raw().toBuffer();
      const s=item.sliceInsets,sourceLeft=corner.endsWith('l')?0:item.size.width-reference.width,sourceTop=corner.startsWith('t')?0:item.size.height-reference.height;
      for(let y=0;y<reference.height;y++)for(let x=0;x<reference.width;x++){
        const alpha=source[((sourceTop+y)*item.size.width+sourceLeft+x)*4+3];if(alpha<250)continue;
        compared++;
        for(const candidate of hashes.slice(1))for(let channel=0;channel<3;channel++)if(Math.abs(reference.crop[(y*reference.width+x)*3+channel]-candidate.crop[(y*reference.width+x)*3+channel])>2)differing++;
      }
      check(compared>0&&differing===0,`${item.id} ${corner}: unchanged visible corner pixels across three widths (${compared} pixels, ${differing} differences)`);
    }
    const file=`${item.id}.png`;await page.locator(`[data-asset="${item.id}"]`).screenshot({path:path.join(output,file)});screens.push(file);
  }
  for(const item of kit.items.filter(item=>!item.sliceInsets)){
    const file=`${item.id}.png`;await page.locator(`[data-asset="${item.id}"]`).screenshot({path:path.join(output,file)});screens.push(file);
  }
  const primary=page.locator('#primary-preview');await primary.scrollIntoViewIfNeeded();
  const before=await primary.boundingBox();await primary.dispatchEvent('pointerdown');
  check(await primary.evaluate(el=>getComputedStyle(el).borderImageSource.includes('button-primary-pressed')),'pressed image is shown on press');
  check(JSON.stringify(await primary.boundingBox())===JSON.stringify(before),'button geometry unchanged on press');
  await page.mouse.up();
  check(await primary.evaluate(el=>getComputedStyle(el).borderImageSource.includes('button-primary.png')),'released image returns to normal');
  await page.locator('#toggle-preview').uncheck();
  check(await page.locator('#toggle-track').getAttribute('src')==='/assets/ui/kit/toggle-track-off.png','toggle shows its off asset');
  await page.locator('#toggle-preview').check();
  check(await page.locator('#toggle-track').getAttribute('src')==='/assets/ui/kit/toggle-track-on.png','toggle shows its on asset');
  check(await page.evaluate(()=>!window.__SANGRE_Y_JADE__&&!document.querySelector('canvas')),'dev preview does not start or change a game screen');
  await page.screenshot({path:path.join(output,'assembly.png')});screens.push('assembly.png');
  for(let start=0;start<kit.items.length;start+=8){
    const group=kit.items.slice(start,start+8),layers=[];
    for(const [i,item]of group.entries()){
      const input=await sharp(path.join(output,`${item.id}.png`)).resize(700,480,{fit:'inside',kernel:'nearest'}).png().toBuffer();
      const meta=await sharp(input).metadata();
      layers.push({input,left:(i%2)*720+10,top:Math.floor(i/2)*500+10});
    }
    const file=`review-${Math.floor(start/8)+1}.png`;
    await sharp({create:{width:1440,height:Math.ceil(group.length/2)*500,channels:3,background:'#141719'}}).composite(layers).png().toFile(path.join(output,file));
    screens.push(file);
  }
  check(errors.length===0,`no browser errors or missing files: ${errors.join('; ')}`);
  console.log(`UI kit: ${checks.length} checks pass; ${screens.length} screenshots; ${((performance.now()-started)/1000).toFixed(2)} s`);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,samples:audit.samples,errors,screens,seconds:(performance.now()-started)/1000},null,2)+'\n');
} finally {await browser.close();await server.close();}
