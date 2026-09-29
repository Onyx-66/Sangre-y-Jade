import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dist = resolve('dist');
const release = resolve('release');
const output = resolve(release, 'Sangre-y-Jade-v0.5.0-itchio.zip');
const supporterOutput = resolve(release, 'Sangre-y-Jade-Supporter-Pack-v0.5.0.zip');
if (!existsSync(dist)) throw new Error('dist/ is missing. Run npm run build first.');
mkdirSync(release, { recursive: true });
if (existsSync(output)) rmSync(output);

const escapedDist = dist.replaceAll("'", "''");
const escapedOutput = output.replaceAll("'", "''");
const command = `Compress-Archive -Path '${escapedDist}\\*' -DestinationPath '${escapedOutput}' -CompressionLevel Optimal`;
const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('Could not package the itch.io ZIP.');

const stage = resolve(release, '.supporter-staging');
if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
mkdirSync(resolve(stage, 'soundtrack'), { recursive: true });
mkdirSync(resolve(stage, 'art'), { recursive: true });
mkdirSync(resolve(stage, 'codex'), { recursive: true });
cpSync(resolve('public/assets/audio'), resolve(stage, 'soundtrack'), { recursive: true });
for(const name of ['title', 'story']) cpSync(resolve(`art-source/${name}.png`),resolve(stage,`art/${name}.png`));
cpSync(resolve('art-source/v0.4'),resolve(stage,'art/prologue-v0.4'),{recursive:true});
cpSync(resolve('art-source/v0.5'),resolve(stage,'art/supports-v0.5'),{recursive:true});
cpSync(resolve('supporter-pack/THANK-YOU.md'), resolve(stage, 'THANK-YOU.md'));
cpSync(resolve('supporter-pack/ART-CODEX.md'), resolve(stage, 'codex/ART-CODEX.md'));
cpSync(resolve('docs/DESIGN-AND-BALANCE.md'), resolve(stage, 'codex/DESIGN-AND-BALANCE.md'));
cpSync(resolve('licenses/ASSET-PROVENANCE.md'), resolve(stage, 'codex/ASSET-PROVENANCE.md'));
if (existsSync(supporterOutput)) rmSync(supporterOutput);
const escapedStage = stage.replaceAll("'", "''");
const escapedSupporter = supporterOutput.replaceAll("'", "''");
const supporterCommand = `Compress-Archive -Path '${escapedStage}\\*' -DestinationPath '${escapedSupporter}' -CompressionLevel Optimal`;
const supporterResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', supporterCommand], { stdio: 'inherit' });
rmSync(stage, { recursive: true, force: true });
if (supporterResult.status !== 0) throw new Error('Could not package the supporter ZIP.');
console.log(`Created ${output}`);
console.log(`Created ${supporterOutput}`);


