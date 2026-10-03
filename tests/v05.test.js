import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { SUPPORTS,allyRank,allyNumberMultiplier,allyCooldownMultiplier,dangerousEnemy } from '../src/data/supports.js';
import { slotCount } from '../src/systems/SkillDraft.js';
import {setLanguage,t,westernDigits,hasTranslation} from '../src/i18n/index.js';
test('three distinct support classes each have ten unique translated skills',()=>{
 assert.deepEqual(Object.keys(SUPPORTS),['saintess','tank','assassin']);
 const ids=[];for(const s of Object.values(SUPPORTS)){assert.equal(s.skills.length,10);for(const k of s.skills){ids.push(k.id);for(const lang of ['fr','ar']){assert.ok(hasTranslation(k.name,lang));assert.ok(hasTranslation(k.description,lang));}}}assert.equal(new Set(ids).size,30);
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
test('Tank bombs and snares have dedicated transparent ground sprites',async()=>{
 for(const id of ['bomb','snare']){const m=await sharp(`public/assets/pixel/support-${id}.png`).metadata();assert.equal(m.width,128);assert.equal(m.height,128);assert.ok(m.hasAlpha);}
});
