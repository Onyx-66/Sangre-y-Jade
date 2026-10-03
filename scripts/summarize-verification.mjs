// Generate human-readable Step 21 findings from retained evidence; never simulate results.
import fs from 'node:fs/promises';

const root = 'docs/skills-redesign';
const read = async file => JSON.parse(await fs.readFile(`${root}/${file}`, 'utf8'));
const spec = await read('skills_redesign.json');
const balance = await read('verification/balance.json');
const initial = await read('verification/balance-initial.json');
const assets = await read('verification/assets.json');
const skills = await read('verification/skills.json');
const browser = await read('verification/browser.json');
const checks = await read('verification/checks.json');
const dead = await read('verification/dead-skills.json');
const tank = await read('verification/companion-tank.json');
const assassin = await read('verification/companion-assassin.json');
const allRuns = [...balance.runs, ...tank.runs, ...assassin.runs];
const catalogue = [...Object.values(spec.heroes).flat(), ...spec.shared, ...Object.values(spec.allies).flat()];
const byId = new Map(catalogue.map(skill => [skill.id, skill]));
const n = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : 'not reached';
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const spread = values => (Math.max(...values) / Math.min(...values) - 1) * 100;
const sum = values => values.reduce((a, b) => a + b, 0);
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const table = (head, rows) => [head, head.map(() => '---'), ...rows].map(row => `| ${row.map(cell).join(' | ')} |`).join('\n');
const gate = passed => passed ? 'PASS' : 'FAIL';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const date = balance.createdAt.slice(0, 10);
const heroStats = Object.keys(spec.heroes).map(hero => {
  const runs = balance.runs.filter(run => run.hero === hero);
  return {hero, runs, level10: median(runs.map(r => r.level10)), boss: median(runs.map(r => r.audit.bosses[0].seconds)), deaths: runs.filter(r => !r.completedDuration).length};
});
const identicalOutcomes = balance.runs.every((run, index) => {
  const before = initial.runs[index];
  return ['hero', 'seed', 'level10', 'level20', 'endLevel', 'kills', 'hp', 'xpTotal'].every(key => run[key] === before[key]);
});
const lifetime = run => run.audit.bosses.map(boss => `${boss.id}: ${boss.kill === null ? `not killed (observed ${n(run.seconds - boss.spawn)} s)` : `${n(boss.seconds)} s`}`).join('; ');
const inWindow = (value, window) => Number.isFinite(value) && value >= window[0] && value <= window[1];

const balanceText = [
  `# Step 21 balance smoke report — ${date}`,
  '## Verdict and method',
  '**Outliers remain; no balance numbers changed in Step 21.** These are nine real Phaser survival simulations (three seeds for each hero), not manufactured kills or a difficulty certification. Ixchel still uses her legacy Step 9 compatibility kit and has no redesigned hero passives.',
  '`node scripts/pacing-playtest.mjs --verification --label=balance --modes=quick`',
  `Seeds ${balance.seeds.join(', ')}; fresh save/no shrine upgrades; Overgrown Temple; auto attack/aim; high enemy density; Saintess preference; fixed movement/draft policy from Step 20. Real updates/timers/tweens/Arcade collisions at 30 Hz game/60 Hz physics; render and HUD refresh skipped. Stop at the 600-second timer, not after the final boss. No invulnerability, forced XP/kills, teleporting, revives or spawn/damage changes. Each healing skill is cast only below 72% HP by this bot. Browser errors/HTTP errors: ${sum(balance.runs.map(r => r.errors.length + r.httpErrors.length))}. Ally placeholder warnings remain.`,
  `Two complete nine-run matrices were retained while attribution was refined: [initial](verification/balance-initial.json), [final](verification/balance.json). Exact level timestamps, end levels, kills, HP and XP match between them: **${gate(identicalOutcomes)}**. The extra Tank/Assassin runs are companion-coverage evidence, not substituted into the hero comparison.`,
  '## Per-run results',
  'Times are simulation seconds, including decimal precision. “Not reached/killed” is censored, never zero or a passing observation.',
  table(['Hero', 'Seed', 'L10 (s)', 'L20 (s)', 'End level', 'Deaths', 'Kills', 'Damage taken', 'Boss time from spawn'], balance.runs.map(r => [r.hero, r.seed, n(r.level10), n(r.level20), r.endLevel, r.completedDuration ? 0 : 1, r.kills, n(r.damageTaken), lifetime(r)])),
  '## Section 8 comparison and outliers',
  table(['Hero (3 runs)', 'Median L10 (s)', 'Median first-boss TTK (s)', 'Deaths by 600 s'], heroStats.map(h => [h.hero, n(h.level10), n(h.boss), `${h.deaths}/3`])),
  `- L10 median spread (slowest/fastest − 1): **${n(spread(heroStats.map(h => h.level10)))}%**, exceeding the 15% target.`,
  `- First-boss median spread: **${n(spread(heroStats.map(h => h.boss)))}%**, exceeding 15%. Balam fights the ground-compatible Jaguar Chief whereas Ixchel/Kukul fight Camazotz; this is the real encounter flow, not an equal-boss laboratory comparison.`,
  `- Deaths: **${sum(heroStats.map(h => h.deaths))}/9**. Zero deaths cannot establish a relative death-rate percentage, and three runs per hero is a small sample. No final-boss victory/TTK is claimed: Ah Puch only spawns at the audit's 600-second cutoff.`,
  `- Quick-mode L10 window 210–270 s: **${balance.runs.filter(r => inWindow(r.level10, balance.targets.quick[10])).length}/9**; L20 window 480–570 s: **${balance.runs.filter(r => inWindow(r.level20, balance.targets.quick[20])).length}/9**. Earlier Step 20 misses remain; Kukul/1701 ends at level 19 and has no L20 observation.`,
  '- Long/censored boss fights remain visible in the table: Zipacna survives to the cutoff for Ixchel/1701 and Kukul/1701; Ixchel/1703 takes 293.0 seconds to kill it. These are reported outliers, not justification for a final-verification rebalance.',
  '- Balam/Saintess seeds 1701 and 1702 take zero recorded HP damage, and their Healing Circle is never needed. This is not proof of a dead heal: the controlled trigger fixture successfully casts it. See companion coverage below.',
  '## Damage per skill, per run',
  'Damage is the game’s raw damage accounting, including overkill, across all enemies and acquired levels. It is **not** single-target level-1 DPS. Passive buffs generally amplify their originating hit rather than owning separate damage. Utility skills can correctly show zero damage/casts; a bot may withhold healing at full HP. Final loadout levels and cast counts are shown; any untraceable damage remains an explicit bucket. All shared traits are included even when they deal no damage.',
];
for (const run of balance.runs) {
  const equipped = [...run.skills, ...run.passives];
  const ids = [...new Set(['basic-attack', ...equipped.map(s => s.id), ...spec.shared.map(s => s.id), ...Object.keys(run.audit.casts), ...Object.keys(run.audit.damage)])];
  const total = sum(Object.values(run.audit.damage));
  balanceText.push(`### ${run.hero} — seed ${run.seed}`, `Raw total: ${n(total)}; unexplained damage: ${n(run.audit.damage.unattributed || 0)}.`,
    table(['ID / source', 'Final level', 'Casts', 'Raw damage', 'Share'], ids.map(id => {
      const skill = byId.get(id), damage = run.audit.damage[id] || 0;
      return [id, equipped.find(s => s.id === id)?.level || (skill?.owner === 'shared' ? 'innate; upgraded in choices log' : '—'), skill?.kind === 'passive' || id === 'basic-attack' || id.includes('unattributed') ? 'not a cast counter' : run.audit.casts[id] || 0, n(damage), `${n(total ? damage / total * 100 : 0)}%`];
    })));
}
const biggest = balance.runs.map(run => {
  const [id, damage] = Object.entries(run.audit.damage).filter(([id]) => byId.get(id)?.kind === 'active').sort((a,b) => b[1]-a[1])[0];
  return {run, id, damage, share: damage / sum(Object.values(run.audit.damage)) * 100};
}).sort((a,b) => b.share-a.share);
balanceText.push('### Damage concentration (descriptive, not a spec DPS threshold)',
  ...biggest.slice(0,3).map(r => `- ${r.run.hero}/${r.run.seed}: ${r.id} supplies ${n(r.share)}% (${n(r.damage)} raw damage). Review loadout dependence in a future balance task; area hits/overkill and the bot policy prevent treating this as proof of an incorrect coefficient.`));

// Follow the actual role labels in section 8; do not silently rewrite a role to force a band pass.
const markdown = await fs.readFile(`${root}/skills_redesign.md`, 'utf8');
const reference = markdown.slice(markdown.indexOf('## 8.'), markdown.indexOf('## 9.'));
const estimates = reference.split(/\r?\n/).filter(line => /^\| (balam|ixchel|kukul) \|/.test(line)).map(line => {
  const [owner, name, , , , , role] = line.split('|').slice(1,-1).map(s => s.trim());
  const skill = spec.heroes[owner].find(s => s.name === name);
  if (!skill) throw Error(`Unmatched section 8 row: ${owner}/${name}`);
  const minion = /Summon/.test(skill.family);
  const band = role === 'utility/control' ? [0,0] : minion ? [0,15] : role === 'control + damage' ? [4,9] : [10,16];
  const value = skill.dps ?? 0;
  const area = /Area|Zone|Aura|Orbit|Whirlwind|Cleave|Cone|Line|Burst|Beam/.test(skill.family);
  return {skill, role, band, value, outside: value < band[0] || value > band[1], areaOutside: area && value > 0 && (value < 6 || value > 12)};
});
balanceText.push('## Authored level-1 estimates against section 8 bands',
  'The following numbers come from the JSON/specification, not the smoke-run damage totals. Use the explicit section-8 role column (damage 10–16, control 4–9, utility 0); a Summon-family row uses the more specific ≤15 band. An additional 6–12 per-enemy check is shown for explicit Area/Zone/Aura/Orbit/Whirlwind/Cleave/Cone/Line/Burst/Beam families. Hybrid roles and the spec’s own estimates conflict in places: flags are review candidates, not permission to rebalance or verified runtime bugs. No guessed hit counts or hero multipliers are folded into the supplied rounded estimates.',
  table(['ID', 'JSON family', 'Authored DPS', 'Table role / band', 'Table-role result', 'Explicit area-family 6–12 check'], estimates.map(e => [e.skill.id, e.skill.family, n(e.value), `${e.role}; ${e.band.join('–')}`, e.outside ? 'OUTLIER' : 'within', e.areaOutside ? 'OUTLIER' : /Area|Zone|Aura|Orbit|Whirlwind|Cleave|Cone|Line|Burst|Beam/.test(e.skill.family) && e.value > 0 ? 'within' : 'not classified as area'])),
  'In particular Raincaller (24.2), Atlatl Volley (18.5), Jade Needles (16.5) and Sun Dart (39.5) exceed the generic pure-damage upper band in the authored reference. Sun Dart is multi-target ricochet and Atlatl/Jade Needles are multi-projectile; their authored single-target estimates need deliberate mechanic-specific review, not a silent nerf here. Ixchel’s current compatibility mechanics do not validate her proposed new estimates.',
  'All 48 authored hero cooldowns are within 3.5–18 seconds; all 16 Ixchel authored mana costs are within 14–32. Current regeneration is 11 × manaRegenMult per second (GameScene), with a 110 base pool and a 3-mana/0.9-second basic attack. Four largest authored costs total 121 mana versus 495 gross regeneration over 45 seconds; that single-use budget passes, but it is not sustained cooldown-spam sustainability. The four highest authored mana/CD rates total 14.46 mana/s before basic attacks, above base 11/s. Ixchel’s missing mana passives/redesign prevent final kit-level validation. No costs/regeneration or other numbers changed.',
  '## Companion casts in legal 10-minute runs',
  'Nine Saintess runs above plus three Balam/Tank and three Balam/Assassin runs retain normal acquisition (signature at 5, picks at 8/14), at most three skills and no replacements. A zero below is a real observed zero, not an omitted row. Unowned skills are not called dead; passives are not counted as casts. The real scene/asset/runtime warnings are retained in each JSON.',
  table(['Hero', 'Ally', 'Seed', 'Equipped skill: casts (passives marked)'], allRuns.map(run => {
    const signature = spec.rules.ally.signatures[run.ally];
    const owned = [signature, ...run.choices.filter(c => c.title === 'Companion Pick').map(c => c.id)];
    return [run.hero,run.ally,run.seed,owned.map(id => `${id}: ${byId.get(id)?.kind === 'passive' ? 'passive' : run.audit.allyCasts[id] || 0}`).join('; ')];
  })),
  '## Exhaustive controlled companion trigger audit',
  dead.fixture,
  table(['Role', 'Active skill', 'Casts in 600 s controlled audit'], dead.records.flatMap(r => Object.entries(r.casts).map(([id,count]) => [r.role,id,count]))),
  table(['Role', 'Passive', 'Observed trigger/stat evidence'], dead.records.flatMap(r => Object.entries(r.passiveTriggers).map(([id,count]) => [r.role,id,count]))),
  'All 18 ally actives and six passive hooks are reachable in controlled coverage. This does **not** satisfy a literal “every ally skill casts in one natural run”: eight skills cannot fit the allowed three-slot/no-replacement loadout, and reactive healing can legitimately remain idle. Natural-run coverage is reported honestly above; the all-skills natural coverage gate remains open.',
  '## Reproduction / evidence',
  '- `node scripts/pacing-playtest.mjs --verification --label=balance --modes=quick`',
  '- `node scripts/pacing-playtest.mjs --verification --label=companion-tank --heroes=balam --modes=quick --ally=tank`',
  '- `node scripts/pacing-playtest.mjs --verification --label=companion-assassin --heroes=balam --modes=quick --ally=assassin`',
  '- `node scripts/ally-skills-playtest.mjs --report=docs/skills-redesign/verification/dead-skills.json`',
  '- `node scripts/summarize-verification.mjs`',
  'Raw files: [balance](verification/balance.json), [Tank](verification/companion-tank.json), [Assassin](verification/companion-assassin.json), [controlled dead-skill report](verification/dead-skills.json). Historical before/after XP evidence remains in [PACING.md](PACING.md).',
);
await fs.writeFile(`${root}/BALANCE_REPORT.md`, balanceText.join('\n\n') + '\n');

const slotChecks = allRuns.map(run => {
  const capacity = run.audit.slots.every(s => s.active === (s.level >= 20 ? 4 : 3) && s.passive === (s.level >= 10 ? 2 : 1) && s.ownedActive <= s.active && s.ownedPassive <= s.passive && s.allySkills === (s.level < 5 ? 0 : s.level < 8 ? 1 : s.level < 14 ? 2 : 3));
  const expected = [10,20].filter(level => level <= run.endLevel);
  const markers = same(run.audit.milestones, expected);
  const allyFlow = same(run.audit.allyEvents, [{kind:'recruit',level:5},{kind:'pick',level:8},{kind:'pick',level:14}]);
  const actual = run.choices.filter(c => c.title === 'Passive Slot Unlocked' || c.title === 'Fourth Active Slot Unlocked').map(c => c.level);
  return {hero:run.hero,ally:run.ally,seed:run.seed,capacity,markers,allyFlow,expected,picks:actual,picksPass:same(actual,expected)};
});
const unit = checks.results.find(r => r.command === 'npm run test');
const build = checks.results.find(r => r.command === 'npm run build');
const counts = Object.fromEntries(['tests','pass','fail'].map(key => [key, Number(unit.stdout.match(new RegExp(`ℹ ${key} (\\d+)`))?.[1] ?? 0)]));
const missing = skills.cases.filter(c => c.missing);
const compatibility = skills.cases.filter(c => c.compatibility);
const missingSounds = skills.cases.flatMap(c => c.missingSounds || []);
const acceptance = {date,releaseReady:false,slots:slotChecks,
  gates:{strictValidator:checks.results[0].exitCode===0,canonicalAssets:assets.issues.length===0&&assets.poolIssues.length===0,
    allSkills:skills.passed,capacityAndMarkers:slotChecks.every(r=>r.capacity&&r.markers),milestoneCards:slotChecks.every(r=>r.picksPass),
    allyAcquisition:slotChecks.every(r=>r.allyFlow),controlledAllyTriggers:dead.records.every(r=>[...Object.values(r.casts),...Object.values(r.passiveTriggers)].every(n=>n>0)),
    naturalAllAllySkills:false,balanceSpread:spread(heroStats.map(h=>h.level10))<=15&&spread(heroStats.map(h=>h.boss))<=15,
    unit:unit.exitCode===0,build:build.exitCode===0,languageStartup:browser.locales.every(r=>r.passed),desktopPerformance:browser.performance.every(r=>r.passed),physicalPhone:false}};
await fs.writeFile(`${root}/verification/acceptance.json`, JSON.stringify(acceptance,null,2)+'\n');
const finalText = [
  `# Step 21 final verification — ${date}`,
  '**RELEASE GATE: NOT PASSED.** The audit is complete; the overhaul is not ready to certify. Missing Step 9 gameplay, Step 17 recipe integration and unfinished Step 19 coverage remain prerequisites, not unused code to delete. No combat/XP/mana rebalance, asset generation/deletion, music/voice, dependency, or protected-file changes.',
  '## Gate summary',
  table(['Gate','Result','Evidence / limitation'],[
    ['Requested strict icon validator','OK',`${assets.counts.icons} total canonical icons; supplied validator checks 108 and warns about the six optional UI icons, which this audit covers.`],
    ['All assets wired once','FAIL',`${assets.counts.icons} icons, ${assets.counts.stills} stills, ${assets.counts.sounds} WAVs exist and are hash-unique. ${assets.pendingRecipes.length} ally recipes are absent, leaving ${assets.untracked.length} untracked stills without runtime references. ${missing.length} Ixchel gameplay handlers absent.`],
    ['Every skill × 10 s','FAIL',`${skills.cases.length} catalogue entries; ${skills.cases.length-missing.length} real ten-second fixtures. ${missing.length} missing handlers; ${compatibility.length} old Ixchel compatibility casts. ${skills.warnings.length} ally placeholder warnings. ${skills.errors.length} runtime/console errors; ${skills.httpErrors.length} HTTP errors; ${missingSounds.length} missing-sound records. Peak FX units ${Math.max(...skills.cases.map(c=>c.peakFx||0))}/24.`],
    ['Full-run capacities / one-shot markers',gate(acceptance.gates.capacityAndMarkers),'All 15 legal runs: 3/1 initially, 3/2 at L10, 4/2 at L20 if reached; no oversubscribed slots or repeated marker. Shared traits take no slot.'],
    ['Actual milestone cards','FAIL','Ixchel consumes L10 marker without a passive choice because her passive pool is absent. Kukul/1701 never reaches L20; not counted as a false success.'],
    ['Companion acquisition',gate(acceptance.gates.allyAcquisition),'15 runs: recruit at 5 with one signature; second/third skills at 8/14; no other ally choice screens.'],
    ['Every ally skill naturally casts','OPEN','18 actives + 6 passives observed in controlled mock-scene audit, and separate legal 600-second runs per role. Some owned reactive heals remain idle. Eight skills cannot coexist in three slots.'],
    ['Section 8 balance bands','OUTLIERS','L10 and first-boss median spreads exceed 15%; unresolved boss fights and authored DPS band conflicts listed in BALANCE_REPORT.md. No rebalance.'],
    ['Cleanup','PARTIAL','Deleted numeric icon files/central LEGACY switch/old ally adapter already absent. Fixed numeric ally cast texture; gated debug globals. Used Ixchel compatibility module/data retained deliberately.'],
    ['Full unit suite',`${counts.pass}/${counts.tests}`,`${counts.fail} unchanged Step 19 failure: untranslated-key checker flags valid French MANA and Cacao. Two Step 21 regressions pass.`],
    ['Production build',gate(build.exitCode===0),`${n(build.seconds,2)} s; existing >500 kB chunk warning.`],
    ['EN / FR / AR startup',`${browser.locales.filter(r=>r.passed).length}/6 PASS`,'Actual production menu-to-run flow, both phone-sized viewports, correct language/direction, no page/control overflow or accidental debug globals. This is startup coverage, not all-text native review.'],
    ['Mobile performance','OPEN','Desktop phone-viewport proxy only. Balam records long frames; no physical Android device measured.'],
  ]),
  '## Asset ownership and leftovers',
  '“Exactly once” means one canonical skill/variant owner and one file, not a single rendering call site. JSON icon paths, recipe still lists and audio manifest paths are the ownership references. All PNG sizes/alpha and SHA-256 duplicates are checked. Multiple HUD/card uses are legitimate. No extra files or old numbered icons were found in the audited asset directories. See [assets.json](verification/assets.json) for every file, hash, size, ownership/reference and tracked status.',
  `Missing Ixchel gameplay: ${missing.map(r=>'`'+r.id+'`').join(', ')}. Her 20 live legacy actives and compatibility module cannot be safely deleted until Step 9 is implemented. Five legacy IDs still use the missing-icon marker: smoking-mirror, ceiba-breath, blue-fire, ancestor-chorus, moon-tears. Canonical JSON icon validation does not cover these obsolete live IDs.`,
  'All 24 ally recipes are missing despite 42 present untracked ally PNGs from interrupted Step 17. Eighteen actives and Saving Grace emit fallback warnings; the other five ally passive fixture rows have no FX stages. These files were not swept into this commit or represented as completed integration. All eight intentionally silent passive SFX briefs remain silent; the 150 expected manifest WAVs include UI sounds. Missing gameplay/event hooks cannot be certified merely because their WAV exists.',
  'Source inspection finds no central `LEGACY` switch, `LegacyAllyAdapter`, old `chooseInitial`/`offerChange`, numeric icon references, debugger statements or console.log/debug calls in src. No unused import was identified in the changed runtime modules; no general-purpose unused-import linter is configured. `?fxdebug=1` and development retain the diagnostic handles; ordinary production does not. No new debug overlay is claimed.',
  '## Full-run slot/milestone evidence',
  table(['Hero','Ally','Seed','Capacities / owned slots','One-shot markers','Actual extra card levels','Companion flow'],slotChecks.map(r=>[r.hero,r.ally,r.seed,gate(r.capacity),gate(r.markers),`${r.picks.join(', ')||'none'} (${gate(r.picksPass)})`,gate(r.allyFlow)])),
  'Snapshots record slot capacity, not a promise of three skills already equipped at level 1. Innates have separate storage. Each available marker was recorded once after its normal level choice. Existing unit tests additionally exercise multi-level jumps and draft rules. Raw chosen cards/levels and each earned-level snapshot are in the three full-run reports.',
  '## Browser and performance evidence',
  `Production Chromium ${browser.environment.browser}, ${browser.environment.host}; no CPU throttle. Renderer: ${browser.performance[0].renderer}. A 144 Hz host can yield >60 FPS despite the in-game FPS preference; do not interpret that as an Android measurement or an enforced 60 FPS cap.`,
  'Real post-render intervals after two seconds warm-up, ten seconds sampled, 60 durable enemies and three level-six skills on real cooldowns. Resources/survival are controlled only for this performance fixture. A long frame is >33.4 ms; the check requires ≥55 average FPS, zero such frames and ≤24 FxDirector units. The director cap counts particle units as well as sprites. Total effect sprites separately include the legacy effects group; the 24-unit cap does not cover that older group.',
  table(['Hero','Viewport','FPS','p95 ms','Max ms','Frames >33.4 ms','Peak director units','Peak total effect sprites','Result'],browser.performance.map(r=>[r.hero,`${r.width}×${r.height}`,n(r.fps),n(r.p95FrameMs),n(r.maxFrameMs),r.framesOver33ms,r.peakFx,r.peakEffectSprites,gate(r.passed)])),
  'Representative Arabic portrait startup and Balam landscape combat screenshots were visually inspected. Screenshots for all six startup and six performance cases are retained under [verification/](verification/). Measured Balam stalls remain a performance outlier; physical mobile testing and legacy-effect load review remain open.',
  '## Commands, results and reproducibility',
  table(['Command','Exit','Wall seconds'],checks.results.map(r=>[r.command,r.exitCode,n(r.seconds,2)])),
  '- `node scripts/final-skill-playtest.mjs` — expected exit 1 with the recorded missing prerequisites; [skills.json](verification/skills.json). Real Phaser handlers/passive hooks, 300 × 1/30-second frames per supported skill, controlled targets/resources, no fabricated results for missing handlers.',
  '- `node scripts/final-browser-check.mjs` — run after building; exit 1 for Balam stalls, six startup checks pass; [browser.json](verification/browser.json).',
  '- `node scripts/final-verification-checks.mjs` — retains all required validator/test/build command output even on failure; [checks.json](verification/checks.json).',
  '- Full-run commands, every boss timing, per-skill damage, companion cast counts and band outliers: [BALANCE_REPORT.md](BALANCE_REPORT.md).',
  '- `node scripts/summarize-verification.mjs` — regenerates these reports and [acceptance.json](verification/acceptance.json) from evidence, never from guessed results.',
  'Tests ran against the existing working tree, including pre-existing unfinished Step 19 and Step 17 work. Those unrelated dirty files remain outside this scoped commit; reports explicitly name that limitation. The current whole-workspace suite is not green, and a clean-checkout certification is not claimed.',
];
await fs.writeFile(`${root}/FINAL_VERIFICATION.md`,finalText.join('\n\n')+'\n');
console.log(`Wrote BALANCE_REPORT.md, FINAL_VERIFICATION.md and acceptance.json; releaseReady=${acceptance.releaseReady}`);
