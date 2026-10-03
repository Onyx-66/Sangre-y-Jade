#!/usr/bin/env node
// Usage: node validate_skills.mjs skills_redesign.json [--assets public/assets/pixel] [--allow-new]
import fs from 'fs';
import path from 'path';
const [,, file = 'skills_redesign.json', ...rest] = process.argv;
const flag = (n) => rest.includes(n);
const arg = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : null; };
const db = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

const all = [];
for (const [h, list] of Object.entries(db.heroes)) list.forEach((s) => all.push({ ...s, owner: h }));
db.shared.forEach((s) => all.push({ ...s, owner: 'shared' }));
for (const [a, list] of Object.entries(db.allies)) list.forEach((s) => all.push({ ...s, owner: 'ally:' + a }));
db.stats.forEach((s) => all.push({ ...s, kind: 'stat', owner: 'stat' }));

const dup = (key, label, items = all) => {
  const seen = new Map();
  for (const s of items) {
    const v = typeof key === 'function' ? key(s) : s[key];
    if (!v) { err(`${s.id}: missing ${label}`); continue; }
    if (seen.has(v)) err(`duplicate ${label} "${v}": ${seen.get(v)} and ${s.id}`); else seen.set(v, s.id);
  }
};
dup('id', 'id'); dup('name', 'name'); dup('icon_file', 'icon file');
dup('vfx', 'vfx description', all.filter((s) => s.kind !== 'stat'));
dup('sfx', 'sfx description', all.filter((s) => s.kind !== 'stat' && s.sfx && !/^None/.test(s.sfx)));
dup('desc', 'in-game description', all.filter((s) => s.kind !== 'stat'));

for (const s of all) {
  if (!['active', 'passive', 'stat'].includes(s.kind)) err(`${s.id}: kind must be active|passive`);
  if (!/^skills\/[a-z0-9-]+\.png$/.test(s.icon_file)) err(`${s.id}: icon_file must be skills/<id>.png`);
  if (s.kind !== 'stat' && s.desc && s.desc.length > 110) warn(`${s.id}: description is long (${s.desc.length} chars)`);
  if (s.kind === 'passive' && !s.trigger) err(`${s.id}: passive needs a trigger`);
  if (s.kind === 'passive' && !s.vals) err(`${s.id}: passive needs per-level values`);
}
// ownership: only the 2 shared passives may be available to more than one hero
for (const [h, list] of Object.entries(db.heroes)) {
  const passives = list.filter((s) => s.kind === 'passive').length;
  const actives = list.filter((s) => s.kind === 'active').length;
  if (passives < 6) err(`${h}: needs at least 6 unique passives (has ${passives})`);
  if (actives < 1) err(`${h}: no active skills`);
}
if (db.shared.length !== 2 || db.shared.some((s) => s.kind !== 'passive')) err('exactly 2 shared passives are required');
const heroSets = Object.entries(db.heroes).map(([h, l]) => [h, new Set(l.map((s) => s.id))]);
for (const [h1, a] of heroSets) for (const [h2, b] of heroSets) if (h1 < h2) for (const id of a) if (b.has(id)) err(`skill ${id} is owned by both ${h1} and ${h2}`);

// slot rules and ally system
const R = db.rules;
if (!R || R.hero_slots.active.start !== 3 || R.hero_slots.active.unlock_level_4th !== 20 || R.hero_slots.passive.start !== 1 || R.hero_slots.passive.unlock_level_2nd !== 10) err('rules.hero_slots must be: 3 active (+1 at level 20), 1 passive (+1 at level 10)');
for (const [a, list] of Object.entries(db.allies)) {
  if (list.length !== 8) err(`ally ${a}: needs 8 skills (has ${list.length})`);
  const sig = list.filter((s) => s.signature);
  if (sig.length !== 1) err(`ally ${a}: exactly one signature skill required`);
  else if (R && R.ally.signatures[a] !== sig[0].id) err(`ally ${a}: rules.ally.signatures does not match signature skill`);
  for (const s of list) {
    if (s.kind === 'active' && !s.auto) err(`${s.id}: ally active skill needs an auto-cast condition`);
    if (s.kind === 'active' && ![1, 2, 3].includes(s.priority)) err(`${s.id}: ally active skill needs priority 1-3`);
  }
}
const allyIds = new Set(Object.values(db.allies).flat().map((s) => s.id));
for (const l of Object.values(db.heroes)) for (const s of l) if (allyIds.has(s.id)) err(`${s.id}: used by both a hero and an ally`);

if (arg('--assets')) {
  const dir = arg('--assets');
  for (const s of all) {
    const p = path.join(dir, s.icon_file);
    if (!fs.existsSync(p)) (flag('--allow-new') ? warn : err)(`missing icon file ${p}`);
  }
  const used = new Set(all.map((s) => s.icon_file));
  const folder = path.join(dir, 'skills');
  if (fs.existsSync(folder)) for (const f of fs.readdirSync(folder)) if (!used.has('skills/' + f)) warn(`orphan icon file skills/${f}`);
}
console.log(`${all.length} entries checked: ${all.filter((s) => s.kind === 'active').length} active, ${all.filter((s) => s.kind === 'passive').length} passive, ${db.stats.length} stat upgrades`);
warns.forEach((w) => console.log('WARN  ' + w));
errors.forEach((e) => console.log('ERROR ' + e));
if (errors.length) { console.log(`\n${errors.length} error(s)`); process.exit(1); }
console.log('OK: all uniqueness and ownership rules pass.');
