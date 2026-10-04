import test from 'node:test';
import assert from 'node:assert/strict';
import { passiveStateMarkup, levelPips, cardKind } from '../src/systems/PassiveState.js';
import { PASSIVE_FIXTURES } from './fixtures/skill-hud.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';

test('generic passive state renders the specified counter, timer and stack fixtures',()=>{
 const counter=passiveStateMarkup(PASSIVE_FIXTURES.counter.hudState);
 assert.match(counter,/7\/12/);assert.match(counter,/aria-valuenow="7"/);assert.match(counter,/width:58\.333/);
 assert.match(passiveStateMarkup(PASSIVE_FIXTURES.timer.hudState),/is-ready/);
 assert.match(passiveStateMarkup({type:'timer',remaining:6,duration:12}),/--remaining:180deg/);
 const stacks=passiveStateMarkup(PASSIVE_FIXTURES.stacks.hudState);
 assert.equal((stacks.match(/class="filled"/g)||[]).length,3);assert.equal((stacks.match(/<i /g)||[]).length,5);
 assert.equal(passiveStateMarkup(null),'');
 assert.equal((levelPips(99).match(/class="filled"/g)||[]).length,5);
 assert.match(passiveStateMarkup({type:'counter',value:-1,max:0}),/0\/1/);
});

test('card kind keeps upgrades in their skill colour and legacy ally cards are classified',()=>{
 for(const kind of ['active','passive','ally','stat'])assert.equal(cardKind({kind,choiceType:'upgrade-active'}),kind);
 assert.equal(cardKind({supportPortrait:'saintess'}),'ally');
 assert.equal(cardKind({meta:'New support skill'}),'ally');
 assert.equal(cardKind({stat:'maxHp'}),'stat');
});

test('slot labels and both milestone banners are translated with Western digits',()=>{
 for(const locale of ['en','fr','ar']){
  setLanguage(locale);
  for(const key of ['Lv {n}','Unlocks at level {n}','Passive slot 2 unlocked!','Active slot 4 unlocked!','ACTIVE','PASSIVE','ALLY','STAT'])assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
  assert.match(t('Lv {n}',{n:10}),/10/);assert.doesNotMatch(t('Active slot 4 unlocked!'),/[٠-٩۰-۹]/);
 }
 setLanguage('en');
});
