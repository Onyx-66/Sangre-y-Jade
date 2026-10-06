import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output = path.resolve('docs/v0.6/previews/menu-update');
await fs.mkdir(output,{recursive:true});
const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context = await browser.newContext({deviceScaleFactor:1,serviceWorkers:'block',hasTouch:true});
await context.addInitScript(()=>{if(!localStorage.getItem('sangre-y-jade-v0.1'))localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2,cacao:1234,settings:{reducedMotion:true}}));});
const page = await context.newPage(), checks = [], errors = [], layouts = [];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const check = (ok,label)=>{checks.push({label,passed:!!ok});assert.ok(ok,label);};

function audit() {
  const root=document.querySelector('.screen'),failures=[];
  const box=e=>e.getBoundingClientRect(), inside=(a,b)=>a.left>=b.left-1&&a.top>=b.top-1&&a.right<=b.right+1&&a.bottom<=b.bottom+1;
  const viewport={left:0,top:0,right:innerWidth,bottom:innerHeight};
  const scrollParent=e=>{
    for(let p=e.parentElement;p&&p!==root;p=p.parentElement)
      if(/auto|scroll/.test(getComputedStyle(p).overflowY)&&p.scrollHeight>p.clientHeight+1)return p;
    return null;
  };
  const horizontal=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1;
  const controls=[...root.querySelectorAll('button,select')].filter(e=>e.getClientRects().length);
  for(const e of controls) {
    const r=box(e),scroller=scrollParent(e);
    if(r.width<44||r.height<44)failures.push(`small target ${e.className}`);
    if(!horizontal(r,viewport)||(!scroller&&!inside(r,viewport)))failures.push(`offscreen ${e.className}`);
    if(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)failures.push(`control overflow ${e.className}`);
  }
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++) {
    const a=box(controls[i]),b=box(controls[j]);
    // List items may be clipped beneath fixed headers, but their controls may not overlap each other.
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1&&!scrollParent(controls[i])&&!scrollParent(controls[j]))failures.push('overlapping controls');
  }
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())) {
    const e=node.parentElement,text=node.textContent.trim();
    if(!text||e.closest('option,style,script,[hidden]'))continue;
    const style=getComputedStyle(e),r=document.createRange();r.selectNodeContents(node);
    const owner=e.closest('button,article,.selection-details,.upgrade-wallet,.kit-title,.panel,.screen'),scroller=scrollParent(e);
    for(const rect of r.getClientRects())
      if(!horizontal(rect,box(owner))||(!scroller&&(!inside(rect,box(owner))||!inside(rect,viewport))))failures.push(`clipped text ${text}`);
    if(parseFloat(style.fontSize)<14)failures.push(`small text ${text}`);
    if(parseFloat(style.lineHeight)<parseFloat(style.fontSize)*1.35-.1)failures.push(`line height ${text}`);
  }
  for(const e of root.querySelectorAll('.selection-details,.permanent-upgrade-list,.selection-cards')) {
    if(e.scrollWidth>e.clientWidth+2)failures.push(`horizontal scroll ${e.className}`);
    if(e.scrollHeight>e.clientHeight+1&&/auto|scroll/.test(getComputedStyle(e).overflowY)) {
      const old=e.scrollTop;e.scrollTop=e.scrollHeight;
      const last=e.lastElementChild;
      if(last&&box(last).bottom>box(e).bottom+1)failures.push(`unreachable last item ${e.className}`);
      e.scrollTop=old;
    }
  }
  if(root.scrollHeight>root.clientHeight+1||root.scrollWidth>root.clientWidth+1)failures.push('root overflow');
  return {failures:[...new Set(failures)]};
}

async function show(locale,screen) {
  await page.evaluate(async({locale,screen})=>{
    const {setLanguage}=await import('/src/i18n/index.js');setLanguage(locale);
    const app=window.__SANGRE_Y_JADE__;
    if(screen==='menu')app.showTitle();
    else if(screen==='upgrades')app.showShrine();
    else {app.setupStep={hero:0,map:1,mode:2,ready:3}[screen];app.showRunSetup();}
  },{locale,screen});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.querySelectorAll('.screen img')].every(i=>i.complete&&i.naturalWidth));
}

try {
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.locator('[data-action=play]').waitFor();
  for(const size of [{width:568,height:320},{width:800,height:360},{width:1280,height:720},{width:320,height:568}]) {
    await page.setViewportSize(size);
    for(const locale of ['en','fr','ar'])for(const screen of ['menu','upgrades','hero','map','mode','ready']) {
      console.log(`${size.width}x${size.height} ${locale} ${screen}`);
      await show(locale,screen);
      const result=await page.evaluate(audit);layouts.push({size,locale,screen,...result});
      await page.screenshot({path:path.join(output,`${locale}-${screen}-${size.width}x${size.height}.png`),animations:'disabled'});
      check(!result.failures.length,`${locale} ${screen} ${size.width}: ${result.failures.join('; ')}`);
      if(screen==='menu') {
        const geometry=await page.evaluate(()=>{
          const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return{width:b.width,height:b.height,y:b.y};};
          return {intro:r('[data-action=prologue]'),shop:r('[data-action=store]'),settings:r('[data-action=settings]'),language:r('.menu-language'),selector:r('[data-language]')};
        });
        for(const key of ['shop','settings','language','selector'])check(Math.abs(geometry[key].width-geometry.intro.width)<.1&&Math.abs(geometry[key].height-geometry.intro.height)<.1,`${key} matches Watch Intro geometry: ${JSON.stringify(geometry)}`);
        check(Math.abs(geometry.settings.y-geometry.language.y)<.1,'Language and Settings on the same row');
        check(await page.locator('[data-language]').count()===1,'exactly one menu language selector');
        check(await page.locator('[data-action=shrine] .interface-icon').count()===0,'no wallet on menu upgrade button');
      }
      if(screen==='upgrades') {
        check(await page.locator('.upgrade-card').count()===4,'four image/detail/level cards');
        check(await page.locator('.upgrade-header [data-cacao-balance]').textContent()==='1234','wallet inside upgrades');
        check(await page.locator('.upgrade-panel h2,.upgrade-panel .panel-subtitle').count()===0,'old heading/subtitle removed');
      }
      if(screen==='hero'||screen==='map') {
        const cards=await page.locator('.kit-card').evaluateAll(cards=>cards.map(c=>{
          const art=c.querySelector('.selection-art-frame'),r=c.getBoundingClientRect(),a=art.getBoundingClientRect();
          return{selected:c.getAttribute('aria-pressed')==='true',border:getComputedStyle(art).borderTopColor,height:a.height,centred:Math.abs(a.x+a.width/2-r.x-r.width/2)<1,above:a.bottom<=c.querySelector('.selection-details').getBoundingClientRect().top+1};
        }));
        check(cards.every(c=>c.centred&&c.above&&c.height>=(screen==='hero'?76:88)),'large top-centred art before card details');
        check(cards.every(c=>c.border===(c.selected?'rgb(61, 224, 176)':'rgb(212, 72, 79)')),'red unselected / green selected art borders');
      }
    }
  }
  await page.setViewportSize({width:568,height:320});await show('en','menu');
  const broken=await page.addStyleTag({content:'.menu-actions{width:900px!important}'});
  const negative=await page.evaluate(audit);
  const negativeGeometry=await page.locator('.menu-actions').boundingBox();
  check(negative.failures.length>0,`audit rejects actual overflow: ${JSON.stringify(negativeGeometry)}`);await broken.evaluate(e=>e.remove());
  await page.selectOption('[data-language]','ar');
  check(await page.evaluate(()=>document.documentElement.lang==='ar'&&window.__SANGRE_Y_JADE__.save.data.settings.language==='ar'),'inline language applies and persists');
  await page.locator('[data-action=shrine]').click();
  const cdp=await context.newCDPSession(page),list=await page.locator('.permanent-upgrade-list').boundingBox();
  const x=list.x+list.width/2,startY=list.y+list.height-12,endY=list.y+12;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:startY}]});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:startY+(endY-startY)*i/6}]});await page.waitForTimeout(35);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>document.querySelector('.permanent-upgrade-list').scrollTop>0);
  check(await page.locator('.permanent-upgrade-list').evaluate(e=>e.scrollTop>0),'real touch swipe scrolls upgrade cards');
  await cdp.detach();
  await page.locator('[data-buy=damage]').scrollIntoViewIfNeeded();
  await page.locator('[data-buy=damage]').click();
  check(await page.locator('[data-cacao-balance]').textContent()==='1189','purchase updates wallet immediately');
  check(await page.locator('[data-upgrade=damage] [data-upgrade-level]').textContent()==='1 / 8','purchase updates current/max level immediately');
  await page.reload();await page.locator('[data-action=shrine]').click();
  check(await page.locator('[data-cacao-balance]').textContent()==='1189','wallet persists after reload');
  check(await page.locator('[data-upgrade=damage] [data-upgrade-level]').textContent()==='1 / 8','rank persists after reload');
  await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.save.data.cacao=0;app.showShrine();});
  check(await page.locator('[data-buy]:disabled').count()===4,'unaffordable purchases disabled');
  await page.evaluate(()=>{const app=window.__SANGRE_Y_JADE__;app.save.data.cacao=10000;app.save.data.upgrades.speed=8;app.showShrine();});
  check(await page.locator('[data-buy=speed]').isDisabled(),'rank-eight cap retained');
  await page.locator('[data-back]').click();await page.locator('[data-action=play]').click();
  await page.locator('[data-hero=ixchel]').click();
  await page.locator('[data-hero=ixchel]').focus();await page.keyboard.press('End');
  check(await page.locator('[data-hero=ixchel] .selection-details').evaluate(e=>e.scrollTop>0),'keyboard reaches selected-card traits');
  await page.keyboard.press('Home');
  check(await page.locator('[data-hero=ixchel] .selection-details').evaluate(e=>e.scrollTop===0),'keyboard returns to description');
  await page.locator('[data-next]').click();await page.locator('[data-map=cenote]').click();
  await page.locator('[data-back]').click();
  check(await page.locator('[data-hero=ixchel]').getAttribute('aria-pressed')==='true','Back preserves hero choice');
  await page.locator('[data-next]').click();await page.locator('[data-next]').click();await page.locator('[data-next]').click();
  check(await page.locator('[data-start]').count()===1,'unchanged four-step setup reaches Start Run');
  check(!errors.length,`no console, page or HTTP errors: ${errors.join('; ')}`);
  console.log(`Menu update: ${checks.length} checks passed, ${layouts.length} layouts.`);
} finally {
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({checks,layouts,errors},null,2));
  await browser.close();await server.close();
}
