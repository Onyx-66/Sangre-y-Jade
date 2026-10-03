// Step 1 diagnostics only. Existing scripts run unchanged; screenshots go to a temporary cwd.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = dirname(fileURLToPath(import.meta.url));
const root = resolve(folder, '../..');
const scratch = mkdtempSync(resolve(tmpdir(), 'syj-skills-baseline-'));
for (const dir of ['artifacts', 'artifacts/v0.3', 'artifacts/v0.4', 'artifacts/v0.5']) mkdirSync(resolve(scratch, dir), { recursive: true });
const results = [];
const startedAt = new Date().toISOString();
async function run(label, executable, args, cwd, timeout = 180000) {
  console.log(`START ${label}`);
  const started = performance.now();
  const child = spawn(executable, args, { cwd, env: { ...process.env, SYJ_URL: 'http://127.0.0.1:4173/' }, windowsHide: true });
  let output = '', timedOut = false;
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeout);
  const result = await new Promise(resolveResult => {
    child.once('error', error => resolveResult({ exitCode: null, error: error.message }));
    child.once('close', code => resolveResult({ exitCode: code }));
  });
  clearTimeout(timer);
  const seconds = Number(((performance.now() - started) / 1000).toFixed(3));
  results.push({ command: label, ...result, seconds, timedOut, output });
  writeFileSync(resolve(folder, 'baseline-results.json'), JSON.stringify({ startedAt, scratch, results }, null, 2));
  console.log(`END ${label}: exit ${result.exitCode}; ${seconds}s${timedOut ? '; timed out' : ''}`);
  console.log(output.slice(-1700));
}

await run('npm run test', process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run test'], root);
await run('npm run build', process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run build'], root);
let server;
try {
  try { await fetch('http://127.0.0.1:4173/', { signal: AbortSignal.timeout(3000) }); }
  catch {
    server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { await fetch('http://127.0.0.1:4173/', { signal: AbortSignal.timeout(1000) }); ready = true; break; }
      catch { await new Promise(resolveWait => setTimeout(resolveWait, 200)); }
    }
    if (!ready) throw new Error('Local Vite preview failed to start');
  }
  for (const script of ['playtest.mjs', 'extended-playtest.mjs', 'v03-playtest.mjs', 'v04-playtest.mjs', 'v05-playtest.mjs', 'v05-combat-test.mjs']) {
    await run(`node scripts/${script}`, process.execPath, [resolve(root, 'scripts', script)], scratch);
  }
  await run('node docs/skills-redesign/validate_skills.mjs docs/skills-redesign/skills_redesign.json --assets public/assets/pixel --allow-new', process.execPath, [resolve(folder, 'validate_skills.mjs'), resolve(folder, 'skills_redesign.json'), '--assets', resolve(root, 'public/assets/pixel'), '--allow-new'], root);
} finally {
  if (server) server.kill();
}
console.log(`Baseline records: ${folder}; generated screenshots: ${scratch}`);
