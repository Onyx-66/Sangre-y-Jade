import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/data/heroes.js';
import { GEAR } from '../src/data/world.js';
import { draftSkills, draftMilestoneSkills, replacementKinds, draftReplacements } from '../src/systems/SkillDraft.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';
import { v06Messages } from '../src/i18n/v06.js';
import { makeScene } from './helpers/scene-fixture.js';

function selectionScene(level = 2) {
  const scene = makeScene(HEROES.balam);
  scene.stats.level = scene.loadoutLevel = level;
  scene.pendingLevelUps = 1;
  scene.pendingBossRewards = [];
  scene.completedSkillMilestones = new Set();
  scene.skillSlots = HEROES.balam.skills.slice(0, level >= 20 ? 4 : 3)
    .map(skill => ({ ...skill, kind: 'active', level: 2, remaining: 5 }));
  scene.passiveSlots = HEROES.balam.passives.slice(0, level >= 10 ? 2 : 1)
    .map(skill => ({ ...skill, kind: 'passive', level: 2 }));
  scene.passiveSlots.forEach(skill => scene.passives.equip(skill, skill.level));
  scene.gear = [...GEAR];
  scene.physics = { pause() {}, resume() {} };
  scene.tweens = { pauseAll() {}, resumeAll() {} };
  scene.releaseAttack = () => {};
  scene.audio.music = () => {};
  const screens = [];
  scene.hud = { move: { x: 0, y: 0 }, toast() {}, setSkills() {}, setCooldown() {},
    setPassives() {}, setInnates() {}, showUnlock() {},
    showChoice(title, cards, choose, subtitle, secondary, presentation) {
      screens.push({ title, cards, choose, subtitle, secondary, presentation });
    } };
  return { scene, screens };
}

test('a full 3-active/1-passive loadout always offers deterministic replacement even when the swap roll misses', () => {
  const { scene, screens } = selectionScene();
  const random = Math.random;
  try {
    Math.random = () => .99;
    const cards = draftSkills({ activeSkills: scene.heroData.skills, passiveSkills: scene.heroData.passives,
      activeSlots: scene.skillSlots, passiveSlots: scene.passiveSlots, activeCount: 3, passiveCount: 1,
      random: Math.random });
    assert.ok(!cards.some(card => card.choiceType === 'swap'));
    scene.showLevelChoice();
    assert.equal(screens.at(-1).secondary?.label, 'Replace a skill');
  } finally { Math.random = random; }
});

test('normal and milestone drafts never produce random swap cards', () => {
  const { scene } = selectionScene(20);
  const options={...scene.replacementOptions(),boss:true,random:()=>0};
  for(const cards of [draftSkills(options),draftMilestoneSkills('active',options),draftMilestoneSkills('passive',options)])
    assert.ok(cards.every(card=>card.choiceType!=='swap'));
});

test('cancelling replacement in a milestone returns to the original cards without spending it', () => {
  const { scene, screens } = selectionScene(20);
  scene.pendingLevelUps = 0;
  scene.pausedForChoice = true;
  scene.showSkillMilestone(20, () => scene.finishSelection());
  const milestone = screens.at(-1);
  milestone.secondary.action();
  screens.at(-1).secondary.action();
  assert.equal(screens.at(-1).title, milestone.title);
  assert.equal(screens.at(-1).cards, milestone.cards);
  assert.equal(scene.pausedForChoice, true);
});

function openConfirm(screens, kind) {
  screens.at(-1).secondary.action();
  const remove=screens.at(-1), old=remove.cards.find(skill=>skill.kind===kind);
  assert.ok(old);
  remove.choose(old);
  const draft=screens.at(-1);
  assert.equal(draft.cards.length,3);
  assert.equal(new Set(draft.cards.map(card=>card.id)).size,3);
  assert.ok(draft.cards.every(card=>card.kind===kind));
  const owned=new Set(remove.cards.map(card=>card.id));
  assert.ok(draft.cards.every(card=>!owned.has(card.id)),'replacement candidates are unowned');
  draft.choose(draft.cards[0]);
  return {old,newSkill:draft.cards[0],confirm:screens.at(-1)};
}

test('active replacement preserves slot order, starts at level 1 and clears its cooldown immediately',()=>{
  const {scene,screens}=selectionScene(), cooldowns=[];
  scene.hud.setCooldown=(...args)=>cooldowns.push(args);
  const other=scene.skillSlots.slice(1);
  scene.showLevelChoice();
  const {old,newSkill,confirm}=openConfirm(screens,'active');
  assert.equal(scene.skillSlots[0].id,old.id,'no mutation before confirmation');
  confirm.presentation.primary.action();
  assert.equal(scene.skillSlots[0].id,newSkill.id);
  assert.equal(scene.skillSlots[0].level,1);
  assert.equal(scene.skillSlots[0].remaining,0);
  assert.deepEqual(scene.skillSlots.slice(1),other);
  assert.deepEqual(cooldowns,[[0,0]]);
  assert.equal(scene.pausedForChoice,false);
  const future=draftReplacements('active',{...scene.replacementOptions(),shuffle:items=>[...items].sort((a,b)=>a.id===old.id?-1:b.id===old.id?1:0)});
  assert.ok(future.some(card=>card.id===old.id),'removed skills remain in the future pool');
});

test('passive replacement unsubscribes old triggers and immediately resets counters and modifiers',()=>{
  const {scene}=selectionScene(), updates=[];
  scene.passives.emit('kill');
  const oldEntry=scene.passives.equipped.get('bloodlust');
  assert.equal(oldEntry.state.stacks,1);
  scene.hud.setPassives=slots=>updates.push(slots);
  assert.equal(scene.replaceSkill('passive','bloodlust','feast-of-the-fallen'),true);
  const entry=scene.passives.equipped.get('feast-of-the-fallen');
  assert.equal(entry.level,1);
  assert.equal(entry.state.hudState.value,0);
  assert.equal(scene.passives.modifiers().attackSpeedMult,undefined);
  assert.equal(updates.at(-1)[0].hudState.value,0);
  scene.passives.emit('kill');
  assert.equal(oldEntry.state.stacks,1,'the removed kill listener is unsubscribed');
  assert.equal(entry.state.hudState.value,1);
  for(const id of ['survivors-will','jade-bounty'])assert.ok(scene.passives.equipped.get(id).innate);
  assert.equal(scene.replaceSkill('passive','feast-of-the-fallen','bloodlust'),true);
  assert.equal(scene.replaceSkill('passive','bloodlust','feast-of-the-fallen'),true);
  assert.equal(scene.passives.equipped.get('feast-of-the-fallen').state.hudState.value,0,'reacquiring a removed passive starts fresh');
});

for(const stage of ['remove','new','confirm'])test(`Back from ${stage} restores the exact draft without spending or rerolling`,()=>{
  const {scene,screens}=selectionScene();
  scene.showLevelChoice();
  const original=screens.at(-1),before=JSON.stringify(scene.getSkillLoadout());
  original.secondary.action();
  if(stage!=='remove')screens.at(-1).choose(screens.at(-1).cards[0]);
  const candidates=stage==='remove'?null:screens.at(-1).cards.map(card=>card.id);
  if(stage==='confirm')screens.at(-1).choose(screens.at(-1).cards[0]);
  screens.at(-1).secondary.action();
  assert.equal(screens.at(-1).cards,original.cards);
  assert.equal(scene.pausedForChoice,true);
  assert.equal(JSON.stringify(scene.getSkillLoadout()),before);
  if(candidates){screens.at(-1).secondary.action();screens.at(-1).choose(screens.at(-1).cards[0]);assert.deepEqual(screens.at(-1).cards.map(card=>card.id),candidates);screens.at(-1).secondary.action();}
  screens.at(-1).choose(original.cards[0]);
  assert.equal(scene.pausedForChoice,false);
});

test('a multi-level jump spends exactly one pick per confirmation and rejects stale callbacks',()=>{
  const {scene,screens}=selectionScene(4);scene.pendingLevelUps=3;
  scene.showLevelChoice();assert.equal(screens.at(-1).title,'Level 2');
  const first=openConfirm(screens,'active');first.confirm.presentation.primary.action();
  assert.equal(screens.at(-1).title,'Level 3');
  const current=screens.at(-1),snapshot=JSON.stringify(scene.getSkillLoadout());
  first.confirm.presentation.primary.action();
  assert.equal(JSON.stringify(scene.getSkillLoadout()),snapshot);
  assert.equal(screens.at(-1),current);
  current.secondary.action();screens.at(-1).choose(screens.at(-1).cards[0]);screens.at(-1).secondary.action();
  screens.at(-1).choose(current.cards[0]);
  assert.equal(screens.at(-1).title,'Level 4');
  openConfirm(screens,'passive').confirm.presentation.primary.action();
  assert.equal(scene.pendingLevelUps,0);assert.equal(scene.pausedForChoice,false);
  assert.equal(screens.filter(screen=>screen.title==='Level 2').length,1);
  assert.equal(screens.filter(screen=>screen.title==='Level 3').length,2);
  assert.equal(screens.filter(screen=>screen.title==='Level 4').length,1);
});

for(const [level,kind] of [[10,'passive'],[20,'active']])test(`level-${level} milestone replacement consumes its bonus exactly once`,()=>{
  const {scene,screens}=selectionScene(level);scene.pendingLevelUps=0;scene.pausedForChoice=true;
  let done=0;scene.showSkillMilestone(level,()=>done++);
  openConfirm(screens,kind).confirm.presentation.primary.action();
  assert.equal(done,1);assert.equal(scene.completedSkillMilestones.has(level),true);
  assert.equal((kind==='active'?scene.skillSlots:scene.passiveSlots)[0].level,1);
});

test('boss rewards offer replacement even when all skills are maxed and the card draft is empty',()=>{
  const {scene,screens}=selectionScene(25);scene.pendingLevelUps=0;
  scene.skillSlots.forEach(skill=>skill.level=6);scene.passiveSlots.forEach(skill=>skill.level=5);
  for(const id of ['survivors-will','jade-bounty'])scene.passives.setLevel(id,5);
  scene.grantBossReward('review-boss');
  assert.equal(screens.at(-1).title,'Boss Defeated');assert.equal(screens.at(-1).cards.length,0);
  openConfirm(screens,'active').confirm.presentation.primary.action();
  assert.equal(scene.pausedForChoice,false);
});

test('boss replacement Back preserves its three cards and confirmation continues queued rewards once',()=>{
  const {scene,screens}=selectionScene(25);scene.pendingLevelUps=0;
  scene.grantBossReward('first-boss');
  const original=screens.at(-1);assert.equal(original.cards.length,3);
  const {confirm}=openConfirm(screens,'passive');
  confirm.secondary.action();assert.equal(screens.at(-1).cards,original.cards);
  scene.grantBossReward('queued-boss');assert.deepEqual(scene.pendingBossRewards,['queued-boss']);
  const next=openConfirm(screens,'active');next.confirm.presentation.primary.action();
  assert.equal(screens.at(-1).title,'Boss Defeated');assert.equal(scene.pendingBossRewards.length,0);
  const second=screens.at(-1);next.confirm.presentation.primary.action();assert.equal(screens.at(-1),second);
  second.choose(second.cards[0]);assert.equal(scene.pausedForChoice,false);
});

test('replacement is unavailable for free kinds, exhausted pools and innate traits',()=>{
  const {scene,screens}=selectionScene();
  scene.skillSlots.pop();scene.passiveSlots=[];
  assert.deepEqual(replacementKinds(scene.replacementOptions()),[]);
  assert.deepEqual(draftReplacements('active',scene.replacementOptions()),[]);
  scene.showLevelChoice();assert.equal(screens.at(-1).secondary,null);
  const full=selectionScene().scene;
  full.heroData={...full.heroData,skills:full.skillSlots,passives:full.passiveSlots};
  assert.deepEqual(full.getReplaceableSkills(),[]);
  assert.equal(full.replaceSkill('passive','survivors-will','bloodlust'),false);
  assert.equal(full.replaceSkill('active',full.skillSlots[0].id,full.passiveSlots[0].id),false);
});

test('a nearly exhausted replacement pool offers every remaining skill once without inventing duplicates',()=>{
  const {scene}=selectionScene();
  scene.heroData={...scene.heroData,skills:[...scene.skillSlots,scene.heroData.skills[3]]};
  const cards=draftReplacements('active',scene.replacementOptions());
  assert.equal(cards.length,1);assert.equal(cards[0].id,scene.heroData.skills[3].id);
});

test('a death during confirmation cannot replace a skill or advance the queue',()=>{
  const {scene,screens}=selectionScene();scene.showLevelChoice();
  const {confirm}=openConfirm(screens,'active'),before=JSON.stringify(scene.getSkillLoadout());
  scene.ended=true;confirm.presentation.primary.action();confirm.secondary.action();
  assert.equal(JSON.stringify(scene.getSkillLoadout()),before);
  assert.equal(screens.at(-1),confirm);
});

test('pause Skills entry reads equipped levels/descriptions and both innates without resuming',()=>{
  const {scene}=selectionScene();let pause,loadout,back;
  scene.hud.showPause=(resume,_exit,skills)=>{pause={resume,skills};};
  scene.hud.showSkills=(data,onBack)=>{loadout=data;back=onBack;};
  const before=JSON.stringify(scene.getSkillLoadout());
  scene.togglePause();pause.skills();
  assert.equal(scene.pausedForChoice,true);
  assert.equal(loadout.active.length,3);assert.equal(loadout.passive.length,1);assert.equal(loadout.innate.length,2);
  assert.ok([...loadout.active,...loadout.passive,...loadout.innate].every(skill=>skill.level>=1&&skill.description));
  back();pause.resume();
  assert.equal(scene.pausedForChoice,false);assert.equal(JSON.stringify(scene.getSkillLoadout()),before);
});

test('new screens and the corrected hero subtitle have EN/FR/AR copy with Western digits',()=>{
  const subtitle='Start with 3 active skills and 1 passive. More slots unlock at levels 10 and 20.';
  for(const locale of ['en','fr','ar']){
    setLanguage(locale);
    for(const key of [...v06Messages.map(row=>row[0]),subtitle]){
      assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
      if(locale!=='en')assert.notEqual(t(key),key);
      assert.doesNotMatch(t(key),/[٠-٩۰-۹]/);
    }
    for(const n of ['3','1','10','20'])assert.ok(t(subtitle).includes(n));
  }
  setLanguage('en');
});
