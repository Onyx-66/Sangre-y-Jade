import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { kitPanel, kitCard, kitButton, kitTitle, kitDecor, kitTorch, kitUrl, sliceStyle, escapeHtml } from '../src/ui/Kit.js';
import { bindKitNavigation, moveKitFocus } from '../src/ui/KitNavigation.js';
import { mainMenuMarkup, selectionMarkup, selectionBackground, STARTING_RULE } from '../src/ui/MenuScreens.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';
import { menuV06Messages } from '../src/i18n/menu-v06.js';

const heroes = [{id:'balam',name:'Balam',epithet:'Warrior'},{id:'ixchel',name:'Ixchel',epithet:'Mage'},{id:'kukul',name:'Kukul',epithet:'Hunter'}];
const maps = [{id:'overgrown',name:'The Overgrown Temple',subtitle:'Day · Normal'},{id:'bloodmoon',name:'Temple Under a Blood Moon',subtitle:'Night · Hard'},{id:'cenote',name:'The Sunken Cenote',subtitle:'Cavern · Expert'}];
const selection = { heroId: 'ixchel', mapId: 'cenote' };

test('nine-slice sources consume V2 insets, reject invalid ids, and escape code-rendered labels', () => {
  assert.match(sliceStyle('panel-large'), /--kit-slices:64 64 64 64/);
  assert.match(sliceStyle('button-primary'), /--kit-slices:22 56 22 56/);
  assert.throws(()=>sliceStyle('torch-0'),/Not a nine-slice/);
  assert.throws(()=>kitUrl('unknown'),/Unknown UI kit/);
  assert.equal(escapeHtml('<a "b">&'), '&lt;a &quot;b&quot;&gt;&amp;');
  assert.match(kitTitle('<Banner>'),/&lt;Banner&gt;/);
  assert.match(kitPanel('body'),/data-kit="panel-large"/);
  assert.match(kitPanel('body',{small:true}),/data-kit="panel-small"/);
  assert.match(kitPanel('body',{modal:true}),/data-kit="modal-frame"/);
});
test('card and button states have their own kit images, no geometry-changing DOM states', () => {
  for(const variant of ['primary','secondary','danger','small','round']) {
    const normal=kitButton('Test',{variant}),disabled=kitButton('Test',{variant,disabled:true});
    assert.match(normal,new RegExp(`button-${variant}\\.png`)); assert.match(disabled,/ disabled/);
    if(['primary','secondary'].includes(variant))for(const state of ['pressed','disabled'])assert.ok(normal.includes(`button-${variant}-${state}.png`));
  }
  assert.throws(()=>kitButton('Test',{variant:'unknown'}),/Unknown button variant/);
  assert.match(kitCard('normal'),/aria-pressed="false"/);
  assert.match(kitCard('selected',{selected:true}),/data-kit="card-selected".*aria-pressed="true"/);
  assert.match(kitCard('locked',{locked:true}),/data-kit="card-locked".*disabled aria-disabled="true"/);
});
test('torch has exactly the four aligned V2 frames and decor is non-interactive', () => {
  const torch=kitTorch();
  assert.equal((torch.match(/<img /g)||[]).length,4);
  for(let i=0;i<4;i++)assert.ok(torch.includes(`torch-${i}.png`));
  assert.equal((kitDecor().match(/kit-vine kit-vine-/g)||[]).length,4);
  assert.ok(!kitDecor().includes('<button'));
});
test('main menu keeps its actions but moves language into the grid and removes button cacao', () => {
  setLanguage('en');const html=mainMenuMarkup(1234);
  assert.match(html,/branding\/logo-title\.png/);assert.doesNotMatch(html,/brand-lockup|brand-logo|tagline|<h1|Survive the night/);
  for(const action of ['play','shrine','codex','prologue','store','settings'])assert.equal((html.match(new RegExp(`data-action="${action}"`,'g'))||[]).length,1);
  assert.match(html,/menu-language-cell/);assert.match(html,/data-language/);
  assert.doesNotMatch(html,/menu-cacao|data-icon="cacao"|1234/);
  assert.match(html,/VERSION 0.5/);
});
test('hero selection has three cards, one selected, correct starting rule and exactly two innate traits on it', () => {
  setLanguage('en');const html=selectionMarkup(0,selection,heroes,maps);
  assert.equal((html.match(/data-hero="/g)||[]).length,3);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  assert.equal((html.match(/data-hero-trait="/g)||[]).length,2);
  assert.ok(html.includes(STARTING_RULE));
  for(const id of ['survivors-will','jade-bounty'])assert.ok(html.includes(`skills/${id}.png`));
  assert.ok(!html.includes('data-map='));
});
test('map selection preserves art and difficulty, and uses the dedicated V2 background', () => {
  const html=selectionMarkup(1,selection,heroes,maps);
  assert.equal((html.match(/data-map="/g)||[]).length,3);
  for(const n of [0,3,2])assert.ok(html.includes(`story-${n}.webp`));
  for(const map of maps)assert.ok(html.includes(t(map.subtitle)));
  assert.match(selectionBackground(0),/bg-hero-select.webp$/);assert.match(selectionBackground(1),/bg-map-select.webp$/);
});
test('new menu copy and existing starting/innate labels translate to FR and AR without English fallback', () => {
  for(const locale of ['fr','ar']) {
    setLanguage(locale);
    for(const key of [...menuV06Messages.map(row=>row[0]),STARTING_RULE,"Survivor's Will",'Jade Bounty']) {
      assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);assert.notEqual(t(key),key);
    }
    const html=selectionMarkup(0,selection,heroes,maps);
    assert.ok(html.includes(t(STARTING_RULE)));assert.ok(!html.includes('Armored melee fighter.'));
  }
  setLanguage('en');
});

function fixture() {
  const doc={activeElement:null,listeners:new Map(),addEventListener(k,fn){this.listeners.set(k,fn);},removeEventListener(k){this.listeners.delete(k);}};
  const all=[{x:0,y:0},{x:100,y:0},{x:0,y:100}].map((position,i)=>({
    tagName:'BUTTON',clicks:0,getClientRects:()=>[1],closest:()=>null,
    getBoundingClientRect:()=>({...position,width:44,height:44}),focus(){doc.activeElement=this;},click(){this.clicks++;},i,
  }));
  const root={ownerDocument:doc,isConnected:true,dataset:{},listeners:new Map(),querySelectorAll:()=>all,
    querySelector:()=>all[2],addEventListener(k,fn){this.listeners.set(k,fn);},removeEventListener(k){this.listeners.delete(k);}};
  let callback,id=0,cancelled;
  const host={requestAnimationFrame(fn){callback=fn;return ++id;},cancelAnimationFrame(n){cancelled=n;}};
  return {root,doc,all,host,frame:now=>callback(now),get cancelled(){return cancelled;}};
}
test('spatial focus works in physical directions, including an RTL visual order', () => {
  const {root,doc,all}=fixture();
  moveKitFocus(root,1,0);assert.equal(doc.activeElement,all[0]);
  moveKitFocus(root,1,0);assert.equal(doc.activeElement,all[1]);
  moveKitFocus(root,-1,0);assert.equal(doc.activeElement,all[0]);
  moveKitFocus(root,0,1);assert.equal(doc.activeElement,all[2]);
});
test('gamepad confirm is edge triggered, directional repeats are throttled, and cleanup cancels listeners/RAF', () => {
  const f=fixture(),pad={buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]};
  const dispose=bindKitNavigation(f.root,{host:f.host,gamepads:()=>[pad]});
  f.all[0].focus();pad.buttons[0].pressed=true;f.frame(0);f.frame(16);assert.equal(f.all[0].clicks,1);
  pad.buttons[0].pressed=false;pad.buttons[15].pressed=true;f.frame(100);assert.equal(f.doc.activeElement,f.all[1]);
  pad.buttons[15].pressed=false;pad.buttons[14].pressed=true;f.frame(150);assert.equal(f.doc.activeElement,f.all[1]);
  f.frame(301);assert.equal(f.doc.activeElement,f.all[0]);
  pad.buttons[1].pressed=true;f.frame(317);f.frame(333);assert.equal(f.all[2].clicks,1);
  dispose();assert.ok(f.cancelled);assert.equal(f.doc.listeners.size,0);assert.equal(f.root.listeners.size,0);
});
test('menu styling is scoped and respects reduced motion and native Arabic typography', async () => {
  const css=await fs.readFile(new URL('../src/ui/kit.css',import.meta.url),'utf8');
  assert.match(css,/\.screen\.kit-screen/);assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.reduce-motion \.menu-title-logo/);assert.match(css,/var\(--font-arabic\)/);
  assert.match(css,/min-height: 44px/);assert.match(css,/focus-visible/);
});
