import { chromium } from 'playwright-core';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts()[0].pages()[0];
console.log(await page.evaluate(()=>{
const a=window.__SANGRE_Y_JADE__,c=document.querySelector('canvas'),r=c?.getBoundingClientRect();
return {viewport:[innerWidth,innerHeight,devicePixelRatio],canvas:r?.toJSON(),style:c?.style.cssText,renderer:a.game?.renderer.type,contextlost:a.game?.renderer.contextLost,visible:document.visibilityState,root:getComputedStyle(document.querySelector('#game-root')).cssText,html:document.querySelector('#game-root').innerHTML.slice(0,500),body:document.body.innerText.slice(0,300)};
}));
await browser.close();
