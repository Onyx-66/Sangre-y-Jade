// Step 22: preserve failures as well as passes; never generate or alter assets.
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
const output = 'docs/skills-redesign/review';
await fs.mkdir(output, { recursive: true });
const checks = [
  ['node docs/skills-redesign/validate_skills.mjs docs/skills-redesign/skills_redesign.json --assets public/assets/pixel',
    process.execPath, ['docs/skills-redesign/validate_skills.mjs', 'docs/skills-redesign/skills_redesign.json', '--assets', 'public/assets/pixel']],
  ...['test', 'build'].map(name => [`npm run ${name}`, process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', name]]),
];
const results = [];
for (const [command, binary, args] of checks) {
  const start = performance.now();
  const result = await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: process.platform === 'win32' && binary === 'npm.cmd',
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (exitCode, signal) => resolve({ exitCode, signal, stdout, stderr }));
  });
  results.push({ command, seconds: (performance.now() - start) / 1000, ...result });
  console.log(`${command}: exit ${result.exitCode}, ${results.at(-1).seconds.toFixed(2)} s`);
  await fs.writeFile(`${output}/checks.json`, JSON.stringify({ date: '2026-10-03', results }, null, 2) + '\n');
}
if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
