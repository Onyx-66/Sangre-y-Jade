import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeScene, GameScene } from './helpers/scene-fixture.js';
import { HEROES } from '../src/data/heroes.js';
import { SLOT_RULES, slotCount } from '../src/systems/SkillDraft.js';
import { milestoneStatus, formatTime, median, validateMatrix } from '../scripts/pacing-metrics.mjs';

function sceneFor(hero,mode){
 const scene=makeScene(HEROES[hero]);scene.modeData={id:mode,duration:mode==='quick'?600:1200};
 scene.checkLevelUp=GameScene.prototype.checkLevelUp;
 scene.pausedForChoice=true;scene.pendingLevelUps=0;scene.stats.nextXp=18;return scene;
}
function nextCost(scene,level){
 scene.stats.level=level-1;scene.stats.xp=scene.stats.nextXp;scene.checkLevelUp();
 assert.equal(scene.stats.level,level);assert.equal(scene.stats.xp,0);return scene.stats.nextXp;
}

test('XP cost calibration preserves a quick first pick and increasing positive integer costs',()=>{
 for(const hero of Object.keys(HEROES))for(const mode of ['quick','full']){
  const scene=sceneFor(hero,mode);assert.equal(scene.stats.nextXp,18);
  scene.stats.xp=17;scene.checkLevelUp();assert.equal(scene.stats.level,1);
  let previous=18;
  for(let level=2;level<=100;level++){
   const cost=nextCost(scene,level);assert.ok(Number.isSafeInteger(cost)&&cost>previous,`${hero}/${mode}/Lv${level}: ${cost}`);previous=cost;
  }
  assert.equal(scene.pendingLevelUps,99);
 }
 const source=readFileSync(new URL('../src/scenes/GameScene.js',import.meta.url),'utf8');
 assert.match(source,/nextXp:\s*18/,'fresh real scene retains the original starting XP cost');
});

test('XP tuning changes costs only; level 10 and 20 slot thresholds stay fixed',()=>{
 assert.deepEqual(SLOT_RULES.passive.unlocks,[{level:10,total:2}]);
 assert.deepEqual(SLOT_RULES.active.unlocks,[{level:20,total:4}]);
 for(const hero of Object.keys(HEROES)){
  const scene=sceneFor(hero,'quick');
  for(let level=2;level<=21;level++){
   nextCost(scene,level);
   assert.equal(slotCount('active',level),level<20?3:4);
   assert.equal(slotCount('passive',level),level<10?1:2);
  }
 }
});

test('multi-level XP bursts keep the remainder and queue every earned level once',()=>{
 for(const hero of Object.keys(HEROES))for(const mode of ['quick','full'])for(const start of [9,19]){
  const costs=sceneFor(hero,mode);for(let level=2;level<=start;level++)nextCost(costs,level);
  const first=costs.stats.nextXp,second=nextCost(costs,start+1);
  const scene=sceneFor(hero,mode);scene.stats.level=start;scene.stats.nextXp=first;
  scene.stats.xp=first+second+3;scene.checkLevelUp();
  assert.equal(scene.stats.level,start+2);assert.equal(scene.stats.xp,3);assert.equal(scene.pendingLevelUps,2);
  scene.checkLevelUp();assert.equal(scene.pendingLevelUps,2);
 }
});

test('pacing status uses inclusive unrounded boundaries and never counts unreached milestones as a pass',()=>{
 assert.equal(milestoneStatus('quick',10,210),'IN');assert.equal(milestoneStatus('quick',10,270),'IN');
 assert.equal(milestoneStatus('quick',10,209.99),'EARLY');assert.equal(milestoneStatus('quick',20,570.01),'LATE');
 assert.equal(milestoneStatus('full',20,720),'IN');assert.equal(milestoneStatus('full',10,null),'NOT REACHED');
 assert.equal(formatTime(239.9),'4:00');assert.equal(formatTime(null),'—');
 assert.equal(median([3,1,2]),2);assert.equal(median([1,3,5,7]),4);assert.equal(median([]),null);
});

test('pacing evidence includes at least three distinct runs per hero/mode and accurate milestone traces',()=>{
 const read=label=>JSON.parse(readFileSync(new URL(`../docs/skills-redesign/pacing/${label}.json`,import.meta.url)));
 const before=read('before'),after=read('after');
 for(const report of [before,after]){
  assert.deepEqual(validateMatrix(report),[]);assert.equal(report.runs.length,18);assert.equal(report.errors.length,0);
  assert.ok(report.runs.every(run=>run.completedDuration&&Math.abs(run.seconds-(run.mode==='quick'?600:1200))<.001));
 }
 for(const key of ['policy','map','viewport','stepHz','seeds','seconds','meta','settings'])assert.deepEqual(before[key],after[key]);
 const duplicate={...after,runs:[...after.runs,after.runs[0]]};assert.ok(validateMatrix(duplicate).some(error=>error.startsWith('Duplicate')));
 const missing={...after,runs:after.runs.slice(1)};assert.ok(validateMatrix(missing).some(error=>error.startsWith('Fewer than')));
 const absentTime={...after,runs:after.runs.map((run,index)=>index?run:{...run,level10:null})};assert.ok(validateMatrix(absentTime).some(error=>error.startsWith('Milestone trace mismatch')));
 // Baseline pilots repeated exactly: guards against unnoticed wall-clock dependence.
 for(const pilot of read('pilot-full').runs){const baseline=before.runs.find(r=>r.hero===pilot.hero&&r.mode===pilot.mode&&r.seed===pilot.seed);assert.equal(baseline.level10,pilot.level10);assert.equal(baseline.level20,pilot.level20);}
});
