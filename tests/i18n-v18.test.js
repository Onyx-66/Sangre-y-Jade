import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditTranslations, untranslatedRows } from '../scripts/check-i18n.mjs';
import { loadingTips } from '../src/i18n/loading-v06.js';
import { setLanguage,t } from '../src/i18n/index.js';

test('V18 lists every untranslated dictionary/runtime key and fails on any',()=>{
 const report=auditTranslations();console.log('V18 untranslated keys:',JSON.stringify(report));
 assert.ok(report.dictionaryKeys>500);assert.ok(report.runtimeKeys>100);assert.deepEqual(report.untranslated,[]);
});
test('translation audit rejects missing, English copies, and broken interpolation',()=>{
 assert.deepEqual(untranslatedRows([['A new warning',undefined,'A new warning']]),[
  'fr: A new warning (missing)','ar: A new warning (English fallback)']);
 assert.deepEqual(untranslatedRows([['Level {n}','Niveau {wrong}','المستوى {n}']]),['fr: Level {n} (placeholders)']);
 assert.deepEqual(untranslatedRows([['Cacao','Cacao','الكاكاو'],['X (%)','X (%)','X (%)']]),[]);
});
test('at least twelve distinct, localized loading tips; native review is marked',()=>{
 assert.ok(loadingTips.length>=12);assert.equal(new Set(loadingTips).size,loadingTips.length);
 for(const locale of ['fr','ar']){setLanguage(locale);for(const key of loadingTips){assert.notEqual(t(key),key);assert.ok(t(key).length<=105,key);}}
 setLanguage('en');
 for(const file of fs.readdirSync('src/i18n').filter(f=>f.endsWith('.js')&&f!=='index.js'))
  assert.match(fs.readFileSync(`src/i18n/${file}`,'utf8'),/\/\/ TODO native review/,file);
});
