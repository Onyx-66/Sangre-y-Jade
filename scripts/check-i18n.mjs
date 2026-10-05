import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { translationEntries, hasTranslation } from '../src/i18n/index.js';
import { MAPS, RUN_MODES, ENEMIES, BOSSES, STORE_ITEMS } from '../src/data/world.js';
import { SETTINGS_CONTROLS, CONTROLS_TEXT } from '../src/ui/SettingsPanel.js';
import { loadingTips } from '../src/i18n/loading-v06.js';
import { weatherNames } from '../src/i18n/world-v06.js';

// Audit editor metadata when that separately developed feature is present;
// the translation catalogue itself is always audited, including editor keys.
const hudModule = new URL('../src/systems/HudLayout.js', import.meta.url);
const { HUD_ELEMENTS = [], PRESETS = [] } = fs.existsSync(hudModule) ? await import(hudModule) : {};

// Genuine French cognates, proper names and notation only; never accept an
// arbitrary identical translation just because a dictionary row exists.
const sameFrench = new Set(['ACTIVE','PASSIVE','STAT','Tank','Assassin','Pause','Fortune','MANA','Cacao','cacao',
 'Camazotz','Zipacna','Vucub Caquix','Ah Puch','Phase {n}','Version {n}','Balam','Ixchel','Kukul','Mage','Auto',
 'Audio','Combat','Minimal','Compact','Visible','min','10 min','20 min','VERSION 0.3','VERSION 0.4','VERSION 0.5']);
const notation = new Set(['X (%)','Y (%)']);
const params = text => [...String(text).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
export function untranslatedRows(rows) {
 const failures=[];
 for(const [en,fr,ar] of rows)for(const [locale,text] of [['en',en],['fr',fr],['ar',ar]]){
  if(typeof text!=='string'||!text.trim())failures.push(`${locale}: ${en} (missing)`);
  else if(locale!=='en'&&text===en&&!notation.has(en)&&!(locale==='fr'&&sameFrench.has(en)))failures.push(`${locale}: ${en} (English fallback)`);
  else if(params(text)!==params(en))failures.push(`${locale}: ${en} (placeholders)`);
 }
 return failures;
}
export function auditTranslations() {
 const rows=translationEntries(),keys=new Set(loadingTips.concat(CONTROLS_TEXT,PRESETS,Object.values(weatherNames)));
 for(const item of [...MAPS,...RUN_MODES,...Object.values(ENEMIES),...BOSSES,...STORE_ITEMS,...HUD_ELEMENTS]){
  for(const key of ['name','epithet','subtitle','description'])if(item[key])keys.add(item[key]);
 }
 for(const control of SETTINGS_CONTROLS){keys.add(control.label);for(const [,label] of control.options||[])keys.add(label);}
 // Include literal runtime labels across all source modules, not just an
 // already-translated sample. Dynamic data labels above are checked separately.
 for(const file of fs.readdirSync('src',{recursive:true}).filter(f=>f.endsWith('.js')&&!f.startsWith('i18n'))){
  const source=fs.readFileSync(path.join('src',file),'utf8');
  for(const match of source.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g))keys.add(match[2].replace(/\\'/g,"'").replace(/\\"/g,'"'));
 }
 const untranslated=untranslatedRows(rows);
 for(const key of keys)for(const locale of ['en','fr','ar'])if(!hasTranslation(key,locale))untranslated.push(`${locale}: ${key} (unregistered runtime key)`);
 return {dictionaryKeys:rows.length,runtimeKeys:keys.size,untranslated:[...new Set(untranslated)].sort()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const report=auditTranslations();console.log(JSON.stringify(report,null,2));if(report.untranslated.length)process.exitCode=1;
}
