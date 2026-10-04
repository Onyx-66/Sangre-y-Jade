import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const output=path.resolve('docs/v0.6/previews/prompt01');
await fs.mkdir(output,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:568,height:320},hasTouch:true,serviceWorkers:'block'});
const report={date:'2026-10-04',checks:[],errors:[],screenshots:[]};
page.on('pageerror',error=>report.errors.push(error.stack));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
const check=(condition,label)=>{report.checks.push({label,passed:!!condition});assert.ok(condition,label);};
const screen=()=>page.locator('.modal-backdrop');
const sceneValue=fn=>page.evaluate(fn);
async function layout(label,screenshot=false){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.evaluate(()=>{
    const modal=document.querySelector('.modal');
    const readOnly=!!modal.closest('.skills-readonly');
    const nodes=[...modal.querySelectorAll(readOnly?'button,h2,.panel-subtitle,.choice-actions,.card-grid':'button,.choice-card,h2,.panel-subtitle,.choice-actions')];
    const footer=modal.querySelector('.choice-actions').getBoundingClientRect();
    const content=readOnly?[modal.querySelector('.card-grid')]:[...modal.querySelectorAll('.choice-card')];
    return {direction:document.documentElement.dir,
      outside:nodes.filter(node=>{const r=node.getBoundingClientRect();return r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5;}).map(node=>node.className),
      wide:nodes.filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>node.className),
      footerOverlap:content.filter(node=>node.getBoundingClientRect().bottom>footer.top-2).map(node=>node.className),
      cardContentOverflow:[...modal.querySelectorAll('.choice-card')].filter(card=>{
        const r=card.getBoundingClientRect();
        return [...card.children].some(child=>{const c=child.getBoundingClientRect();return c.width&&c.height&&(c.top<r.top||c.bottom>r.bottom||c.left<r.left||c.right>r.right);});
      }).map(card=>card.dataset.choice),
      clipped:modal.scrollHeight>modal.clientHeight+1,
      pageOverflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight};
  });
  check(result.direction==='rtl',`${label}: Arabic RTL`);
  check(!result.outside.length&&!result.wide.length&&!result.pageOverflow,`${label}: viewport/width fit ${JSON.stringify(result)}`);
  check(!result.footerOverlap.length,`${label}: footer never overlaps cards ${JSON.stringify(result)}`);
  check(!result.cardContentOverflow.length,`${label}: card contents stay within their borders ${JSON.stringify(result)}`);
  if(!label.includes('skills'))check(!result.clipped,`${label}: all controls and cards visible without scrolling`);
  if(screenshot){const file=`${label}.png`;await page.screenshot({path:path.join(output,file),animations:'disabled'});report.screenshots.push(file);}
}
async function openRemove(){await page.locator('[data-action="replace-skill"]').click();await page.locator('[data-stage="remove"]').waitFor();}
async function openNew(kind='active'){await screen().locator(`button.choice-card[data-kind="${kind}"]`).first().click();await page.locator('[data-stage="new"]').waitFor();}
async function openConfirm(){await screen().locator('button.choice-card').first().click();await page.locator('[data-stage="confirm"]').waitFor();}
try{
  await page.addInitScript(()=>localStorage.setItem('sangre-y-jade-v0.1',JSON.stringify({prologueRevision:2})));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForFunction(()=>!!window.__SANGRE_Y_JADE__);
  await page.evaluate(async()=>{
    const {setLanguage}=await import('/src/i18n/index.js');setLanguage('ar');
    const app=window.__SANGRE_Y_JADE__;app.cancelPrologue?.();app.lastSelection.heroId='balam';app.save.setSetting('attackMode','manual');await app.startRun();
  });
  await page.locator('.hud').waitFor();
  await page.evaluate(()=>{
    const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');
    s.invulnerable=1e6;s.updateDirector=()=>{};s.collectPickup=()=>{};
    s.stats.level=s.loadoutLevel=25;s.pendingLevelUps=1;
    s.skillSlots=s.heroData.skills.slice(0,4).map(skill=>({...skill,kind:'active',level:3,remaining:5}));
    s.passiveSlots=s.heroData.passives.slice(0,2).map(skill=>({...skill,kind:'passive',level:2}));
    s.passiveSlots.forEach(skill=>s.passives.equip(skill,2));
    s.showLevelChoice();
  });
  const original=await screen().locator('.choice-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.choice));
  const before=await sceneValue(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return JSON.stringify(s.getSkillLoadout());});
  await layout('ar-reward-568x320',true);
  for(const stage of ['remove','new','confirm']){
    await openRemove();check(await screen().locator('button.choice-card').count()===6,'all six full-kind slots are replaceable, without innates');
    if(stage!=='remove')await openNew();
    if(stage==='confirm')await openConfirm();
    await layout(`ar-${stage}-568x320`,true);
    await page.locator('[data-action="replacement-back"]').click();
    check(JSON.stringify(await screen().locator('.choice-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.choice)))===JSON.stringify(original),`Back from ${stage} restores the same three reward cards`);
    check(await sceneValue(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return s.pausedForChoice&&JSON.stringify(s.getSkillLoadout());})===before,`Back from ${stage} preserves the pick/loadout`);
  }
  await page.setViewportSize({width:320,height:568});
  for(const stage of ['remove','new','confirm']){
    await openRemove();if(stage!=='remove')await openNew();if(stage==='confirm')await openConfirm();
    await layout(`ar-${stage}-320x568`,true);
    await page.locator('[data-action="replacement-back"]').click();
  }
  await page.setViewportSize({width:568,height:320});
  await openRemove();const oldId=await screen().locator('button.choice-card[data-kind="active"]').first().getAttribute('data-choice');
  await openNew();const newId=await screen().locator('button.choice-card').first().getAttribute('data-choice');
  await openConfirm();check(await screen().locator('button.choice-card').count()===0,'confirmation preview is read-only');
  await page.locator('[data-action="replacement-confirm"]').click();
  const active=await sceneValue(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');return {...s.skillSlots[0],paused:s.pausedForChoice};});
  check(active.id===newId&&active.id!==oldId&&active.level===1&&active.remaining===0&&!active.paused,'active confirmation updates the slot and ready cooldown then spends one pick');
  check(await page.locator('[data-skill="0"] .cooldown').isHidden(),'new active cooldown sweep resets immediately');
  await page.evaluate(()=>{
    const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=s.loadoutLevel=10;s.pendingLevelUps=0;
    s.skillSlots=s.skillSlots.slice(0,3);
    s.completedSkillMilestones.delete(10);s.pauseForSelection();s.showSkillMilestone(10,()=>s.finishSelection());
  });
  await openRemove();await openNew('passive');
  const passiveId=await screen().locator('button.choice-card').first().getAttribute('data-choice');
  await openConfirm();await page.locator('[data-action="replacement-confirm"]').click();
  const passive=await sceneValue(()=>{const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual'),p=s.passiveSlots[0];return {id:p.id,level:p.level,registered:s.passives.equipped.has(p.id),old:s.passives.equipped.has('bloodlust'),paused:s.pausedForChoice};});
  check(passive.id===passiveId&&passive.level===1&&passive.registered&&!passive.old&&!passive.paused,'passive milestone replacement updates PassiveSystem and spends its bonus pick');
  await page.evaluate(()=>{
    const s=window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual');s.stats.level=s.loadoutLevel=25;
    s.skillSlots.push({...s.heroData.skills[3],kind:'active',level:3,remaining:0});
    s.hud.setSkills(s.skillSlots,4);s.refreshPassiveHud();
  });
  await page.locator('.pause-btn').click();await page.locator('[data-skills]').click();
  check(await page.locator('.skills-readonly article.choice-card').count()===8,'Skills shows all actives/passives plus two innate traits');
  check(await page.locator('.skills-readonly button.choice-card').count()===0,'Skills has no selectable card');
  check(await page.locator('[data-innate-trait]').count()===2,'two innate traits listed');
  await layout('ar-skills-568x320',true);
  await page.locator('.skills-readonly .card-grid').evaluate(grid=>{grid.scrollTop=grid.scrollHeight;});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  const innateVisibility=await page.locator('[data-innate-trait]').evaluateAll(cards=>cards.map(card=>{
    const r=card.getBoundingClientRect(),g=card.parentElement.getBoundingClientRect();
    return {id:card.dataset.choice,top:r.top,bottom:r.bottom,clipTop:g.top,clipBottom:g.bottom};
  }));
  check(innateVisibility.every(r=>r.top>=r.clipTop-.5&&r.bottom<=r.clipBottom+.5),`the read-only list scrolls to reveal both innate traits ${JSON.stringify(innateVisibility)}`);
  await layout('ar-skills-innates-568x320',true);
  await page.locator('[data-action="skills-back"]').click();
  check(await sceneValue(()=>window.__SANGRE_Y_JADE__.game.scene.getScene('Ritual').pausedForChoice),'Skills Back returns to pause without resuming');
  await page.locator('[data-resume]').click();
  check(report.errors.length===0,`no runtime/HTTP errors: ${report.errors.join('\n')}`);
  console.log(`v0.6 replacement UI: ${report.checks.length} checks passed, ${report.screenshots.length} screenshots.`);
}finally{
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await server.close();
}
