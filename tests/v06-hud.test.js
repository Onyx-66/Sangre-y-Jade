import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Hud } from '../src/systems/Hud.js';
import { interfaceIcon } from '../src/art/interfaceIcons.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';

function hudFixture() {
  const node=()=>({innerHTML:'',textContent:'',hidden:false,disabled:false,dataset:{},
    attributes:{},classList:{values:new Set(),toggle(name,on){if(on)this.values.add(name);else this.values.delete(name);},contains(name){return this.values.has(name);}},
    setAttribute(name,value){this.attributes[name]=value;}});
  const nodes=new Map(['.ally-panel','[data-support]','[data-ally-lock]','[data-ally-level]',
    '.ally-name','[data-ally-rank]','#auto-indicator','[data-attack]'].map(selector=>[selector,node()]));
  const hud=Object.create(Hud.prototype);hud.settings={attackMode:'auto'};
  hud.el={querySelector:selector=>nodes.get(selector),querySelectorAll:()=>[]};
  return {hud,nodes};
}

test('unrecruited ally is a locked panel containing a localized level, not a question-mark tile',()=>{
  const {hud,nodes}=hudFixture();
  for(const locale of ['en','fr','ar']){
    setLanguage(locale);hud.setAlly(null);
    assert.ok(nodes.get('.ally-panel').classList.contains('locked'));
    assert.equal(nodes.get('[data-ally-lock]').hidden,false);
    assert.equal(nodes.get('[data-ally-level]').textContent,t('Lv {n}',{n:5}));
    assert.equal(nodes.get('[data-support]').innerHTML,'');
    assert.equal(nodes.get('[data-support]').disabled,true);
    assert.equal(nodes.get('.ally-name').textContent,'');
    assert.equal(nodes.get('[data-ally-rank]').hidden,true);
  }
  setLanguage('en');
});

test('auto indicator reports the mode, updates its tooltip and never toggles the setting itself',()=>{
  const {hud,nodes}=hudFixture();
  const indicator=nodes.get('#auto-indicator');let markup='',writes=0;
  Object.defineProperty(indicator,'innerHTML',{get:()=>markup,set:value=>{markup=value;writes++;}});
  hud.setAttackMode('auto');
  assert.equal(nodes.get('#auto-indicator').dataset.mode,'auto');
  assert.equal(nodes.get('[data-attack]').hidden,true);
  assert.match(nodes.get('#auto-indicator').dataset.tooltip,/Auto/);
  hud.setAttackMode('auto');assert.equal(writes,1,'stats updates must not rebuild the mode SVG every frame');
  hud.setAttackMode('manual');
  assert.equal(nodes.get('#auto-indicator').dataset.mode,'manual');
  assert.equal(nodes.get('[data-attack]').hidden,false);
  assert.match(nodes.get('#auto-indicator').dataset.tooltip,/Manual/);
  assert.equal(writes,2,'a mode change replaces the icon once');
  assert.equal(hud.settings.attackMode,'auto','the display is not a controls-setting toggle');
});

test('HUD lock and attack-mode tooltip keys exist in EN, FR and AR with Western digits',()=>{
  for(const locale of ['en','fr','ar'])for(const key of ['Auto-attack is on. Basic attacks fire automatically.',
    'Manual attack is on. Hold F or Attack to fire.','Lv {n}','Unlocks at level {n}']){
    setLanguage(locale);assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
    assert.doesNotMatch(t(key,{n:5}),/[٠-٩۰-۹]/);
    if(locale!=='en')assert.notEqual(t(key,{n:5}),key);
  }
  setLanguage('en');
});

test('HUD placement CSS contains no Arabic mirroring or logical inline positioning',async()=>{
  const css=await fs.readFile(new URL('../src/skills-hud.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/inset-inline/);
  assert.doesNotMatch(css,/html\[lang=ar\]\s*\.hud\s*\{[^}]*direction:rtl/);
});

test('explicit cacao pouch, skull, lock and mode icons do not fall back to the globe glyph',()=>{
  const icons=['cacao','kills','lock','auto','manual'].map(name=>interfaceIcon(name));
  const subject=svg=>svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  assert.equal(new Set(icons.map(subject)).size,5,'the subjects, not just their data names, must be distinct');
  for(const icon of icons)assert.notEqual(subject(icon),subject(interfaceIcon('globe')));
  for(const [index,name] of ['cacao','kills','lock','auto','manual'].entries())
    assert.ok(icons[index].includes(`data-icon="${name}"`));
});
