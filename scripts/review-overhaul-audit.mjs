import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { HEROES } from '../src/data/heroes.js';
import { ALLY_CATALOG, ALLY_RULES } from '../src/data/allyCatalog.js';
import { BALAM_DEFINITIONS, SHARED_DEFINITIONS } from '../src/skills/generated/balam.js';
import { KUKUL_DEFINITIONS } from '../src/skills/generated/kukul.js';
import { FxDirector } from '../src/fx/FxDirector.js';
import { fxRecipeSignature } from '../src/fx/recipes/balam.js';
import '../src/fx/recipes/ixchel.js';
import '../src/fx/recipes/kukul.js';
const output = 'docs/skills-redesign/review';
const spec = JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json', 'utf8'));
const prior = JSON.parse(await fs.readFile('docs/skills-redesign/verification/assets.json', 'utf8'));
const report = { date: '2026-10-03', base: '02a8063', head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
  branchFiles: execFileSync('git', ['diff', '--name-only', '02a8063...HEAD'], { encoding: 'utf8' }).trim().split(/\r?\n/),
  assetCounts: prior.counts, assetHashChecks: 0, assetChangesSinceStep21: [], catalogue: {}, mismatches: [],
  missingRecipes: [], duplicateRecipeMetadata: [] };
for (const row of prior.rows) {
  try {
    const bytes = await fs.readFile(`public/assets/${row.file}`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== row.sha256) report.assetChangesSinceStep21.push(row.file);
    report.assetHashChecks++;
  } catch (error) { report.assetChangesSinceStep21.push(`${row.file}: ${error.code}`); }
}
for (const [owner, expected] of Object.entries(spec.heroes)) {
  const hero = HEROES[owner], actual = [...hero.skills, ...hero.passives || []];
  report.catalogue[owner] = { active: hero.skills.length, passive: hero.passives?.length || 0,
    missing: expected.filter(skill => !actual.some(entry => entry.id === skill.id)).map(skill => skill.id),
    obsolete: actual.filter(skill => !expected.some(entry => entry.id === skill.id)).map(skill => skill.id) };
}
const definitions = [...BALAM_DEFINITIONS, ...SHARED_DEFINITIONS, ...KUKUL_DEFINITIONS, ...Object.values(ALLY_CATALOG).flat()];
const sourceSkills = [...Object.values(spec.heroes).flat(), ...spec.shared, ...Object.values(spec.allies).flat()];
for (const definition of definitions) {
  const source = sourceSkills.find(skill => skill.id === definition.id);
  for (const [actual, key] of [['name', 'name'], ['description', 'desc'], ['owner', 'owner'], ['iconFile', 'icon_file'], ['kind', 'kind']])
    if (definition[actual] !== source[key]) report.mismatches.push(`${definition.id}: ${actual}`);
  if (source.kind === 'active' && definition.cooldown !== source.cd) report.mismatches.push(`${definition.id}: cooldown`);
}
const signatures = new Map();
for (const skill of sourceSkills) {
  const recipe = FxDirector.recipes.get(skill.id);
  if (!recipe) { report.missingRecipes.push(skill.id); continue; }
  const signature = fxRecipeSignature(recipe);
  if (signatures.has(signature)) report.duplicateRecipeMetadata.push([skill.id, signatures.get(signature)]);
  signatures.set(signature, skill.id);
}
report.definitionChecks = definitions.length;
report.recipeCount = signatures.size;
report.allyRulesMatch = JSON.stringify(ALLY_RULES) === JSON.stringify(spec.rules.ally);
report.allyCounts = Object.fromEntries(Object.entries(ALLY_CATALOG).map(([id, skills]) => [id, {
  active: skills.filter(skill => skill.kind === 'active').length, passive: skills.filter(skill => skill.kind === 'passive').length,
  signature: skills.filter(skill => skill.signature).map(skill => skill.id),
}]));
await fs.mkdir(output, { recursive: true });
await fs.writeFile(`${output}/audit.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ branchFiles: report.branchFiles.length, assetHashChecks: report.assetHashChecks,
  changedAssets: report.assetChangesSinceStep21, catalogue: report.catalogue, definitionChecks: report.definitionChecks,
  mismatches: report.mismatches, recipes: report.recipeCount, missingRecipes: report.missingRecipes.length,
  duplicateRecipeMetadata: report.duplicateRecipeMetadata, allyRulesMatch: report.allyRulesMatch }, null, 2));
if (report.assetChangesSinceStep21.length || report.mismatches.length || report.missingRecipes.length || !report.allyRulesMatch) process.exitCode = 1;
