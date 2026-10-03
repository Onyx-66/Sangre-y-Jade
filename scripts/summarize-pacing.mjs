import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { TARGETS, milestoneStatus, formatTime, median, validateMatrix } from './pacing-metrics.mjs';
const root=new URL('../docs/skills-redesign/',import.meta.url);
const read=name=>fs.readFile(new URL(`pacing/${name}.json`,root),'utf8').then(JSON.parse);
const before=await read('before'),after=await read('after');
for(const report of [before,after])assert.deepEqual(validateMatrix(report),[]);
for(const key of ['policy','map','viewport','stepHz','seeds','seconds','meta','settings'])assert.deepEqual(before[key],after[key],`Changed audit policy: ${key}`);
const id=run=>`${run.hero}/${run.mode}/${run.seed}`;
assert.deepEqual(before.runs.map(id).sort(),after.runs.map(id).sort());
const statuses=report=>report.runs.flatMap(run=>[10,20].map(level=>milestoneStatus(run.mode,level,run[`level${level}`])));
const count=report=>statuses(report).filter(s=>s==='IN').length;
const fmt=(run,level)=>`${formatTime(run[`level${level}`])} ${milestoneStatus(run.mode,level,run[`level${level}`])}`;
const mid=(runs,level)=>runs.some(run=>run[`level${level}`]===null)?'—':formatTime(median(runs.map(run=>run[`level${level}`])));
const rows=after.runs.map(run=>{
 const old=before.runs.find(item=>id(item)===id(run));
 return `| ${run.hero} | ${run.mode==='quick'?'10 min':'20 min'} | ${run.seed} | ${fmt(old,10)} | ${fmt(run,10)} | ${fmt(old,20)} | ${fmt(run,20)} | ${old.endLevel} → ${run.endLevel} | ${formatTime(run.seconds)} |`;
});
const summary=[];
for(const hero of ['balam','ixchel','kukul'])for(const mode of ['quick','full']){
 const old=before.runs.filter(run=>run.hero===hero&&run.mode===mode),runs=after.runs.filter(run=>run.hero===hero&&run.mode===mode);
 const range=level=>{const values=runs.map(r=>r[`level${level}`]).filter(Number.isFinite);return `${formatTime(Math.min(...values))}–${formatTime(Math.max(...values))}${values.length<runs.length?' (some not reached)':''}`;};
 summary.push(`| ${hero} | ${mode==='quick'?'10 min':'20 min'} | ${mid(old,10)} → ${mid(runs,10)} (${range(10)}) | ${mid(old,20)} → ${mid(runs,20)} (${range(20)}) | ${runs.filter(r=>milestoneStatus(mode,10,r.level10)==='IN').length}/3; ${runs.filter(r=>milestoneStatus(mode,20,r.level20)==='IN').length}/3 |`);
}
const misses=after.runs.flatMap(run=>[10,20].filter(level=>milestoneStatus(run.mode,level,run[`level${level}`])!=='IN').map(level=>`${id(run)} level ${level}: ${fmt(run,level)}`));
const game=await fs.readFile(new URL('../src/scenes/GameScene.js',import.meta.url),'utf8');
const formula=game.match(/      const baseXp[^]*?this\.stats\.nextXp = [^;]+;/)?.[0].replace(/^      /gm,'')||'See GameScene.js';
const doc=`# XP pacing — Step 20

Measured on 2026-10-03. ${before.runs.length} baseline and ${after.runs.length} final full-duration attempts, three seeds per hero/mode. All timings are **simulation/game clock**, not wall time or time spent choosing cards. End level is at the survival timer (600/1200 seconds), before the final boss fight.

## Results

Milestone observations inside the specified windows: **${count(before)}/36 before → ${count(after)}/36 after**. ${after.runs.filter(r=>r.completedDuration).length}/18 final runs survived to their mode timer; ${after.errors.length} browser runtime errors. ${misses.length?`**${misses.length} target-window misses remain**, listed individually below. These are not a claim that all pacing targets pass.`:'All measured target windows pass.'}

| Mode | Level 10 target | Level 20 target |
|---|---|---|
${Object.entries(TARGETS).map(([mode,targets])=>`| ${mode==='quick'?'10 min':'20 min'} | ${targets[10].map(formatTime).join('–')} | ${targets[20].map(formatTime).join('–')} |`).join('\n')}

### Medians (after range in parentheses)

Medians are withheld (—) if any run did not reach that milestone, rather than silently dropping the censored observation. Ranges show reached observations only; the pass counts include every run.

| Hero | Mode | Level 10 before → after | Level 20 before → after | After in-window L10; L20 |
|---|---|---|---|---|
${summary.join('\n')}

### Every run

Status uses unrounded seconds; displayed times are rounded to the nearest second. IN = inside the inclusive target window; EARLY/LATE/NOT REACHED are failures to meet that window. A dash is not treated as zero or excluded from the pass count.

| Hero | Mode | Seed | Before L10 | After L10 | Before L20 | After L20 | End level before → after | After elapsed |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## The XP-only change

Previously: first pick 18 XP, then \`round(18 + level * 11 + level^1.25 * 2.5)\`, requiring 819 total XP for level 10 and 3,306 for level 20. Initial cost and milestone levels are unchanged. Only the formula assigning \`stats.nextXp\` changes:

\`\`\`js
${formula}
\`\`\`

The uniform ×1.6 trial still rushed Balam/Kukul, but one Ixchel run failed to reach 20. An affine trial with a flat +60 mage cost delayed Ixchel's early upgrades too severely; that candidate was rejected. A full candidate matrix then exposed late level-20 picks, so the retained formula eases the Balam/Kukul slope continuously after the cost of level 9 (no jump or time gate), with their full-mode factor lowered from 1.10 to 1.09. A second matrix tested a small Ixchel early-cost change (×1.2 +10); that produced worse results, including one unreached level 20, and was reverted to ×1.25 with the original full-mode ×1.10. Costs remain increasing, calibrated for the slower **currently shipped** Ixchel kit and the two stronger heroes. No enemy XP, damage, cooldowns, mana, drops, spawning, draft rules, companion rules, milestone levels or save data changed. This calibration needs remeasurement after the missing Ixchel Step 9 conversion; it does not implement that conversion.

| Hero | Mode | Total XP to level 10 | Total XP to level 20 |
|---|---|---|---|
| Balam / Kukul | 10 min | 1,901 | 7,320 |
| Balam / Kukul | 20 min | 2,072 | 7,978 |
| Ixchel | 10 min | 1,019 | 4,128 |
| Ixchel | 20 min | 1,120 | 4,539 |

## Reproduction and audit limits

- Run \`node scripts/pacing-playtest.mjs --label=after\` and \`node scripts/summarize-pacing.mjs\` with installed local Chrome/Node/dependencies. The baseline uses the old formula and the same bot. Scripts make no internet requests or downloads; the browser serves assets from local Vite. Add \`--require-targets\` to the summarizer for a nonzero exit when any individual milestone misses its window.
- Seeds 1701, 1702, 1703; both Math.random and Phaser's RNG seeded at scene creation. Normal Overgrown Temple, fresh isolated browser context/save, no shrine upgrades, default high enemy density, auto attack/aim. Identical bot policy before/after. Starting presentation-only Step 19 edits remain uncommitted; they do not affect combat/XP.
- Real Phaser update, enemy AI/spawns, bosses, collision damage, skill cooldowns, timers/tweens, loot attraction/collection, drafts, passives and companions. 30 Hz game frames with the normal 60 Hz Arcade physics, and camera pre-render for correct offscreen spawning. Headless rendering/HUD refreshes and deliberation time are omitted. No forced kills, spawned test enemies, XP grants, revives, teleporting, invulnerability or inflated stats.
- Fixed bot seeks drops and avoids nearby enemies/projectiles, casts owned skills and chooses offered cards by priority (recorded in the script). Saintess is preferred; the bot does not reroll builds or swap skills. Random offers can produce low-damage builds, especially for current Ixchel. This is a repeatable bot benchmark, not proof of novice/phone player pacing or all possible builds/maps.
- Raw [before](pacing/before.json) and [after](pacing/after.json) include every level timestamp, cumulative collected XP, 30-second samples, kills/damage, loadouts and every draft decision. [Uniform trial](pacing/trial-160.json), [affine trial](pacing/trial-calibrated.json), [first full calibration](pacing/trial-matrix.json) and [second full calibration](pacing/trial-matrix-2.json) preserve rejected results. Baseline pilot seed 1701 reproduced its exact three-hero quick-mode timings in the main baseline.

## Remaining target misses

${misses.length?misses.map(miss=>`- ${miss}`).join('\n'):'None in this 18-run sample.'}

These trials do not establish a curve that places every random loadout in the target windows; the remaining acceptance misses stay open. Do not change milestones or hide misses with time-gated levels. Keep the raw evidence for further XP calibration and remeasure when the intended Ixchel kit is available.
`;
await fs.writeFile(new URL('PACING.md',root),doc);
console.log(`PACING.md: ${count(before)}/36 → ${count(after)}/36 in-window observations; ${misses.length} misses.`);
if(process.argv.includes('--require-targets')&&misses.length)process.exitCode=1;
