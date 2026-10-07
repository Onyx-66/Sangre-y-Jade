import test from 'node:test';
import assert from 'node:assert/strict';
import { HUD_IDS,HUD_ELEMENTS,HUD_LAYOUT_VERSION,emptyHudLayouts,migrateHudLayouts,sanitizeLayout,boxFor,atBox,layoutFromBoxes,constrainLayout,validateLayout,moveElement,presetLayout,PRESETS,exportLayout,importLayout,LayoutHistory,orientationFor,checksum } from '../src/systems/HudLayout.js';
import { SaveSystem,SAVE_KEY } from '../src/systems/SaveSystem.js';
import { hudEditorMessages } from '../src/i18n/hud-editor.js';
import { HudLayoutRuntime } from '../src/systems/HudLayoutRuntime.js';
import { t,setLanguage,hasTranslation } from '../src/i18n/index.js';

const safe={x:12,y:20,width:544,height:290};
test('visibility updates before first measurement and after shutdown are harmless',()=>{
 assert.doesNotThrow(()=>HudLayoutRuntime.prototype.syncVisibility.call({},'attack'));
 assert.doesNotThrow(()=>HudLayoutRuntime.prototype.syncVisibility.call({destroyed:true},'boss-bar'));
});
function fixture(){
 const metrics=Object.fromEntries(HUD_ELEMENTS.map((spec,i)=>[spec.id,{x:20+i%6*80,y:26+Math.floor(i/6)*85,width:64,height:64,touchWidth:64,touchHeight:64}]));
 return {metrics,layout:constrainLayout(layoutFromBoxes(metrics,safe),metrics,safe)};
}
test('registry includes the 17 original HUD ids and mandatory breath meter',()=>{
 assert.deepEqual(HUD_IDS,['vitals','xp-dock','clock','counters','pause','ally-panel','passive-slots','innate-traits','skill-q','skill-e','skill-r','skill-t','dash','attack','joystick','boss-bar','breath','auto-indicator']);assert.equal(new Set(HUD_IDS).size,18);
});
test('existing CSS boxes round-trip through percentage+anchor coordinates, including cutout origin',()=>{
 const {metrics}=fixture(),layout=layoutFromBoxes(metrics,safe);
 for(const id of HUD_IDS){const box=boxFor(layout.elements[id],metrics[id],safe);for(const key of ['x','y','width','height'])assert.ok(Math.abs(box[key]-metrics[id][key])<1e-8,`${id}: ${key}`);}
 const moved={...safe,width:1088,height:580},box=boxFor(layout.elements.pause,metrics.pause,moved);
 assert.ok(box.x>metrics.pause.x);assert.equal(orientationFor(568,320),'landscape');assert.equal(orientationFor(320,568),'portrait');
});
test('resize constraints clamp scaling/opacity/position and keep required controls visible',()=>{
 const {metrics,layout}=fixture();
 for(const id of HUD_IDS)Object.assign(layout.elements[id],{x:-50,y:1000,scale:.01,opacity:0,visible:false});
 const clamped=constrainLayout(layout,metrics,safe);
 for(const spec of HUD_ELEMENTS){const e=clamped.elements[spec.id],box=boxFor(e,metrics[spec.id],safe);
  assert.ok(box.x>=safe.x-.001&&box.y>=safe.y-.001&&box.right<=safe.x+safe.width+.001&&box.bottom<=safe.y+safe.height+.001);
  assert.ok(e.opacity>=(spec.id==='joystick'?.1:.2));if(spec.required)assert.equal(e.visible,true);
  if(spec.interactive){assert.ok(box.width>=44-.001);assert.ok(box.height>=44-.001);}
 }
});
test('group tooltip slots enforce 44dp child targets, not just 44dp for the whole group',()=>{
 const {metrics,layout}=fixture();metrics['passive-slots']={x:0,y:0,width:93,height:44,touchWidth:44,touchHeight:44};layout.elements['passive-slots'].scale=.5;
 assert.equal(constrainLayout(layout,metrics,safe).elements['passive-slots'].scale,1);
});
test('boss bar only accepts position/scale and cannot acquire opacity/visibility/locking options',()=>{
 const {layout,metrics}=fixture();Object.assign(layout.elements['boss-bar'],{x:25,y:35,scale:1.5,opacity:.2,visible:false,locked:true});
 const clean=constrainLayout(layout,metrics,safe).elements['boss-bar'];assert.equal(clean.opacity,1);assert.equal(clean.visible,true);assert.equal(clean.locked,false);assert.equal(clean.scale,1.5);
});
test('Save validation rejects hidden/off-screen required controls and too-small targets',()=>{
 const {layout,metrics}=fixture();layout.elements.pause.visible=false;assert.ok(validateLayout(layout,metrics,safe).issues.length);
 layout.elements.pause.visible=true;layout.elements.pause.x=1000;assert.ok(validateLayout(layout,metrics,safe).issues.some(issue=>issue.includes('outside safe area')));
 layout.elements.pause.x=20;layout.elements['skill-q'].scale=.5;assert.ok(validateLayout(layout,metrics,safe).issues.some(issue=>issue.includes('Touch target')));
});
test('overlap detector finds real intersecting interactive elements but ignores hidden ones and non-interactive bars',()=>{
 const {layout,metrics}=fixture();layout.elements['skill-e']=atBox(layout.elements['skill-e'],boxFor(layout.elements['skill-q'],metrics['skill-q'],safe),safe);
 assert.ok(validateLayout(layout,metrics,safe).overlaps.some(pair=>pair.includes('skill-q')&&pair.includes('skill-e')));
 layout.elements['skill-e'].visible=false;assert.ok(!validateLayout(layout,metrics,safe).overlaps.some(pair=>pair.includes('skill-e')));
});
test('drag/nudge obey locking, safe bounds and 8px grid, with unscaled viewport deltas',()=>{
 const {layout,metrics}=fixture(),before=boxFor(layout.elements.joystick,metrics.joystick,safe);
 let next=moveElement(layout,'joystick',16,-8,metrics,safe);
 assert.ok(Math.abs(boxFor(next.elements.joystick,metrics.joystick,safe).x-before.x-16)<1e-8);
 next=moveElement(layout,'joystick',19,7,metrics,safe,{snap:true});
 assert.ok(Math.abs((boxFor(next.elements.joystick,metrics.joystick,safe).x-safe.x)%8)<1e-8);
 layout.elements.joystick.locked=true;assert.deepEqual(moveElement(layout,'joystick',100,100,metrics,safe),layout);
});
test('active group movement preserves offsets at an edge and leaves locked slots alone',()=>{
 const {layout,metrics}=fixture();const ids=['skill-q','skill-e','skill-r','skill-t'];
 let x=150;for(const id of ids){layout.elements[id]=atBox(layout.elements[id],{x,y:220,width:64,height:64},safe);x+=70;}
 const moved=moveElement(layout,'skill-q',1000,0,metrics,safe,{group:true});
 const boxes=ids.map(id=>boxFor(moved.elements[id],metrics[id],safe));assert.equal(Math.round(boxes.at(-1).right),safe.x+safe.width);
 for(let i=1;i<boxes.length;i++)assert.ok(Math.abs(boxes[i].x-boxes[i-1].x-70)<1e-8);
 layout.elements['skill-e'].locked=true;assert.deepEqual(moveElement(layout,'skill-q',2,0,metrics,safe,{group:true}).elements['skill-e'],layout.elements['skill-e']);
 assert.deepEqual(moveElement(layout,'skill-e',2,0,metrics,safe,{group:true}),layout);
});
test('all five presets remain constrained and left-handed mirrors controls, not vitals',()=>{
 const {layout,metrics}=fixture();
 for(const name of PRESETS){const preset=presetLayout(name,layout,metrics,safe);assert.equal(validateLayout(preset,metrics,safe).issues.length,0,name);}
 const left=presetLayout('Left-handed',layout,metrics,safe);
 assert.deepEqual(left.elements.vitals,layout.elements.vitals);
 const a=boxFor(layout.elements.joystick,metrics.joystick,safe),b=boxFor(left.elements.joystick,metrics.joystick,safe);assert.ok(Math.abs(b.x-(safe.x+safe.width-(a.right-safe.x)))<1e-8);
 assert.equal(presetLayout('Minimal',layout,metrics,safe).elements.clock.visible,false);
 assert.throws(()=>presetLayout('Bad',layout,metrics,safe),/Unknown/);
});
test('undo/redo snapshots are isolated, branching discards redo, history bounded at 80',()=>{
 const {layout}=fixture(),history=new LayoutHistory(layout);layout.elements.joystick.x=30;history.push(layout);layout.elements.joystick.x=40;history.push(layout);
 assert.equal(history.undo().elements.joystick.x,30);assert.equal(history.redo().elements.joystick.x,40);history.undo();layout.elements.joystick.x=50;history.push(layout);assert.equal(history.redo().elements.joystick.x,50);
 for(let i=0;i<100;i++){layout.elements.joystick.x=i;history.push(layout);}assert.equal(history.entries.length,80);
});
test('export/import is deterministic, validates checksum/version/orientation, clamps and rejects missing/NaN fields',()=>{
 const {layout,metrics}=fixture();const code=exportLayout(layout,'landscape');assert.equal(code,exportLayout(layout,'landscape'));assert.deepEqual(importLayout(code,metrics,safe,'landscape'),constrainLayout(layout,metrics,safe));
 assert.throws(()=>importLayout(code+'x',metrics,safe,'landscape'),/checksum/);
 assert.throws(()=>importLayout(code,metrics,safe,'portrait'),/orientation/);
 const old=JSON.stringify({schemaVersion:0,orientation:'landscape',layout});assert.throws(()=>importLayout(`SYJHUD:${checksum(old)}:${old}`,metrics,safe,'landscape'),/version/);
 const broken=structuredClone(layout);delete broken.elements.pause;assert.throws(()=>importLayout(exportLayout(broken,'landscape'),metrics,safe,'landscape'),/Invalid/);
 layout.elements.joystick.scale=999;layout.elements.joystick.x=999;layout.elements.joystick.opacity=-1;
 const clean=importLayout(exportLayout(layout,'landscape'),metrics,safe,'landscape');assert.ok(clean.elements.joystick.scale<=2);assert.equal(clean.elements.joystick.opacity,.1);
 const invalid=fixture().layout;invalid.elements.pause.x=NaN;assert.equal(sanitizeLayout(invalid),null);
 for(const anchor of ['__proto__','constructor','toString']){const unsafe=fixture().layout;unsafe.elements.pause.anchor=anchor;assert.equal(sanitizeLayout(unsafe),null);assert.throws(()=>importLayout(exportLayout(unsafe,'landscape'),metrics,safe,'landscape'),/Invalid/);}
 const nil='null';assert.throws(()=>importLayout(`SYJHUD:${checksum(nil)}:${nil}`,metrics,safe,'landscape'),/Invalid/);
});
test('unknown/old layouts migrate to responsive defaults, invalid orientation does not erase the valid one',()=>{
 const {layout}=fixture();assert.deepEqual(migrateHudLayouts({schemaVersion:0,landscape:layout}),emptyHudLayouts());assert.deepEqual(migrateHudLayouts(null),emptyHudLayouts());
 const store=migrateHudLayouts({schemaVersion:HUD_LAYOUT_VERSION,landscape:layout,portrait:{bad:true}});assert.deepEqual(store.landscape,sanitizeLayout(layout));assert.equal(store.portrait,null);
});
test('save persistence keeps orientation layouts independent, preserves old progress and supports storage errors',()=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),storage=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,writable:true,value:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}});
 try{storage.set(SAVE_KEY,JSON.stringify({cacao:456,upgrades:{damage:3},settings:{language:'ar'}}));const save=new SaveSystem();assert.equal(save.data.cacao,456);assert.equal(save.data.upgrades.damage,3);assert.deepEqual(save.data.hudLayouts,emptyHudLayouts());
  const {layout}=fixture();save.setHudLayouts({schemaVersion:1,landscape:layout,portrait:null});assert.deepEqual(new SaveSystem().data.hudLayouts.landscape,sanitizeLayout(layout));assert.equal(new SaveSystem().data.hudLayouts.portrait,null);assert.equal(new SaveSystem().data.settings.language,'ar');
  globalThis.localStorage.setItem=()=>{throw new Error('quota');};assert.doesNotThrow(()=>save.setHudLayouts(emptyHudLayouts()));
 }finally{if(prior)Object.defineProperty(globalThis,'localStorage',prior);else delete globalThis.localStorage;}
});
test('all editor copy has explicit EN/FR/AR entries; common preset names and axis notation may match French',()=>{
 for(const locale of ['en','fr','ar'])for(const [key]of hudEditorMessages){setLanguage(locale);assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);assert.ok(t(key).length>0);}
 setLanguage('en');
});
