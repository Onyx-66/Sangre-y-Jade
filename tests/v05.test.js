import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import sharp from 'sharp';
import { SUPPORTS,allyRank,allyNumberMultiplier,allyCooldownMultiplier,dangerousEnemy } from '../src/data/supports.js';
import { ALLY_CATALOG } from '../src/data/allyCatalog.js';
import { slotCount } from '../src/systems/SkillDraft.js';
import {setLanguage,t,westernDigits,hasTranslation} from '../src/i18n/index.js';
test('three companion roles expose only the new JSON-owned eight-skill catalogs and translations',()=>{
 assert.deepEqual(Object.keys(SUPPORTS),['saintess','tank','assassin']);
 const ids=[];for(const [role,s] of Object.entries(SUPPORTS)){assert.equal(s.skills,undefined);assert.equal(ALLY_CATALOG[role].length,8);assert.equal(s.signature.id,ALLY_CATALOG[role].find(k=>k.signature).id);assert.equal(s.passives.length,2);for(const k of ALLY_CATALOG[role]){ids.push(k.id);assert.equal(k.legacyId,undefined);assert.equal(k.old,undefined);for(const lang of ['fr','ar']){assert.ok(hasTranslation(k.name,lang));assert.ok(hasTranslation(k.description,lang));setLanguage(lang);assert.equal(t(k.name),k[lang]);assert.notEqual(t(k.description),k.description);}assert.ok(hasTranslation(k.description,'en'));}setLanguage('en');}
 assert.equal(new Set(ids).size,24);assert.ok(!ids.some(id=>['renew','blessing','valor','focus','renewal-song','well','sanctuary','wind','purify','rescue','guard','bomb','intercept','snare','taunt','bash','barrier','shockwave','fortify','bulwark','mark','venom','silence','disarm','rupture','pursuit','volley','smoke'].includes(id)));
});
test('temporary ally compatibility adapter is deleted rather than retained as a runtime path',async()=>{
 await assert.rejects(access(new URL('../src/systems/LegacyAllyAdapter.js',import.meta.url)),{code:'ENOENT'});
});
test('hero active slots follow the level 20 unlock',()=>{
 for(const level of [1,9,10,19])assert.equal(slotCount('active',level),3);
 assert.equal(slotCount('active',20),4);
});
test('companion rank advances on the specified cadence and caps at five',()=>{
 assert.deepEqual([5,9,10,14,15,20,25,80].map(allyRank),[1,1,2,2,3,4,5,5]);
 assert.equal(allyNumberMultiplier(5),1.6);assert.equal(allyCooldownMultiplier(5),.84);
});
test('Assassin prefers threat over nearest low-damage enemy',()=>{
 const enemy=(x,damage,boss=false)=>({x,y:0,active:true,getData:k=>({damage,isBoss:boss})[k]});
 const weak=enemy(10,2),danger=enemy(300,35),distant=enemy(1000,200);assert.equal(dangerousEnemy([weak,danger,distant],{x:0,y:0}),danger);
});
test('all locales use Western digits including Arabic dictionary literals',()=>{
 assert.equal(westernDigits('١٢٣ ۴۵۶ ٣٫٥٪'),'123 456 3.5%');setLanguage('ar');
 for(const key of ['Ally unlocks at level 5','Survival · 20 min','+12% damage','60 FPS','VERSION 0.5'])assert.doesNotMatch(t(key),/[٠-٩۰-۹]/);
 assert.match(t('Ally unlocks at level 5'),/5/);setLanguage('en');
});
test('support artwork uses separate alpha frames rather than hero skins',async()=>{
 for(const id of Object.keys(SUPPORTS))for(let i=0;i<4;i++){const m=await sharp(`public/assets/pixel/frames/support-${id}-${i}.png`).metadata();assert.equal(m.width,128);assert.equal(m.height,128);assert.ok(m.hasAlpha);}
});
