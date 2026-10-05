import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { HEROES, MODIFIERS, skillDescription } from '../src/data/heroes.js';
import { SUPPORTS } from '../src/data/supports.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';
import { skillMessages } from '../src/i18n/skills.js';
import { skillsHudMessages } from '../src/i18n/skills-hud.js';
import { skillDescriptions, compatibilityMessages } from '../src/i18n/skill-descriptions.js';
import { passiveStateMarkup, passiveStateText } from '../src/systems/PassiveState.js';

const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const source=JSON.parse(read('docs/skills-redesign/skills_redesign.json'));
const skills=[...Object.values(source.heroes).flat(),...source.shared,...Object.values(source.allies).flat()];
// These are genuinely shared French words/abbreviations, not English fallback.
const sameFrench=new Set(['ACTIVE','PASSIVE','STAT','Tank','Assassin','Pause','Fortune','MANA','Cacao']);
const dynamicKeys=['Level {n}','LEVEL {n}','Empty skill slot {n}','{name} · Lv {n}','{name}, level {n}',
 'Choose an upgrade.','New active skill','New passive skill','Active skill upgrade','Passive skill upgrade',
 'Swap active skill','Swap passive skill','Stat upgrade','Restore health','Restore 30 health.','Cacao Remedy',
 'Choose one active skill.','Choose one passive skill.','The new active skill starts at level 1.',
 'The new passive skill starts at level 1.','Passive Slot Unlocked','Fourth Active Slot Unlocked',
 'Skill slot unlocked.','Passive slot 2 unlocked; passive skills arrive in a later update.',
 'Boss reward: choose a skill upgrade.','Support Loadout','Support skills level up automatically with your hero.',
 'Choose one companion skill.','Choose one companion to join your run.','Not enough mana','WARD',
 'HP','MANA','STAMINA','XP','Kills','Cacao','Pause','Dash','Attack','Movement joystick',
 'Auto-attack','Manual attack','Ally unlocks at level 5','Resume','Cancel'];

test('overhaul untranslated keys: none in EN/FR/AR (including runtime legacy Ixchel text)',()=>{
 const keys=new Set([...skillMessages,...skillsHudMessages,...compatibilityMessages].map(row=>row[0]));
 for(const hero of Object.values(HEROES))for(const skill of [...hero.skills,...hero.passives||[]]){keys.add(skill.name);keys.add(skill.description);}
 for(const item of [...MODIFIERS,...Object.values(SUPPORTS)]){keys.add(item.name);keys.add(item.description);if(item.role)keys.add(item.role);}
 for(const key of dynamicKeys)keys.add(key);
 // Literal t/toast/showChoice calls and HTML/accessibility labels in the overhaul UI.
 for(const file of ['src/systems/Hud.js','src/systems/PassiveState.js','src/systems/SupportSystem.js','src/scenes/GameScene.js']){
  const text=read(file);
  for(const match of text.matchAll(/(?:\bt|\.toast|\.showChoice)\('([^']+)'/g))keys.add(match[1]);
  for(const match of text.matchAll(/(?:aria-label|title)="([A-Za-z][A-Za-z ]+)"/g))keys.add(match[1]);
 }
 const untranslated=[];
 for(const locale of ['en','fr','ar']){setLanguage(locale);for(const key of keys){
  if(!hasTranslation(key,locale)||!t(key).trim()||(locale!=='en'&&t(key)===key&&!(locale==='fr'&&sameFrench.has(key))))untranslated.push(`${locale}: ${key}`);
 }}
 setLanguage('en');
 console.log(`Untranslated overhaul keys (${keys.size} keys x 3 locales): ${JSON.stringify(untranslated)}`);
 assert.deepEqual(untranslated,[]);
});

test('all 98 skill names and English descriptions match JSON; translations fit short cards',()=>{
 assert.equal(skills.length,98);assert.equal(skillDescriptions.length,98);
 for(const skill of [...skills,...source.stats]){
  assert.deepEqual(skillMessages.find(row=>row[0]===skill.name),[skill.name,skill.fr,skill.ar],skill.id);
  for(const locale of ['en','fr','ar']){setLanguage(locale);assert.equal(t(skill.name),locale==='en'?skill.name:skill[locale],`${locale}: ${skill.id}`);}
 }
 for(const skill of skills){
  const row=skillMessages.find(row=>row[0]===skill.desc);assert.ok(row,skill.id);
  assert.equal(row[0],skill.desc);
  for(const translated of row.slice(1))assert.ok(translated.length<=110,`${skill.id}: ${translated.length} characters`);
  assert.match(row[2],/[\u0600-\u06ff]/);assert.doesNotMatch(row[2],/[A-Za-z٠-٩۰-۹]/);
 }
 setLanguage('en');
});

test('translation rows keep interpolation variables and native-review comments',()=>{
 const params=s=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
 for(const row of [...skillMessages,...skillsHudMessages])for(const text of row.slice(1))assert.deepEqual(params(text),params(row[0]),row[0]);
 for(const file of ['src/i18n/skills.js','src/i18n/skill-descriptions.js','src/i18n/skills-hud.js']){
  for(const line of read(file).split('\n').filter(line=>/^\s*\[/.test(line)))assert.match(line,/\/\/ TODO native review/,`${file}: ${line}`);
 }
 execFileSync(process.execPath,['scripts/generate-skill-i18n.mjs','--check'],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
});

test('dynamic HUD copy, passive state and accessibility labels are localized with Western digits',()=>{
 for(const locale of ['fr','ar']){
  setLanguage(locale);
  for(const key of ['Lv {n}','Companion rank {n}']){assert.ok(t(key,{n:20}).includes('20'));assert.doesNotMatch(t(key,{n:20}),/[٠-٩۰-۹{}]/);}
  assert.equal(t('Level 10'),t('Level {n}',{n:10}));
  assert.equal(t("Jaguar's Roar · Lv 6"),t('{name} · Lv {n}',{name:t("Jaguar's Roar"),n:6}));
  assert.ok(passiveStateMarkup({type:'timer',ready:true}).includes(`aria-label="${t('Ready')}"`));
  assert.equal(passiveStateText({type:'timer',remaining:6}),t('{n}s',{n:6}));
  assert.equal(passiveStateText({type:'timer',remaining:0}),t('Ready'));
  assert.equal(passiveStateText({type:'counter',value:7,max:12}),'7/12');
  const bonus=passiveStateText({type:'bonus',healPerGem:.4,pickupRangePct:25});assert.doesNotMatch(bonus,/HP|pickup range/);assert.ok(bonus.includes('25'));
 }
 setLanguage('en');
});

test('descriptions cannot fall back to a generic skill type',()=>{
 for(const type of ['projectile','burst','nova','cone','line','orbit','trap','heal','shield','chain','summon','dash','rain'])assert.equal(skillDescription({type}),'');
 assert.equal(skillDescription({type:'nova',description:'Authored'}),'Authored');
 assert.doesNotMatch(read('src/data/heroes.js'),/SKILL_DESCRIPTIONS/);
});
