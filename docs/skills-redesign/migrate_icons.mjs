#!/usr/bin/env node
// Copies existing icon-N.png files to their new unique names (skills/<id>.png).
// Usage: node migrate_icons.mjs skills_redesign.json public/assets/pixel
import fs from 'fs';
import path from 'path';
const [, , jsonFile = 'skills_redesign.json', dir = 'public/assets/pixel'] = process.argv;
const db = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const entries = [...Object.values(db.heroes).flat(), ...db.shared, ...Object.values(db.allies).flat(), ...db.stats];
fs.mkdirSync(path.join(dir, 'skills'), { recursive: true });
let copied = 0, missing = [];
for (const e of entries) {
  if (e.icon_source === 'NEW') continue;
  const from = path.join(dir, e.icon_source), to = path.join(dir, e.icon_file);
  if (!fs.existsSync(from)) { missing.push(from); continue; }
  fs.copyFileSync(from, to); copied++;
}
console.log(`copied ${copied} icons to ${path.join(dir, 'skills')}`);
if (missing.length) { console.log('MISSING source files:\n' + missing.join('\n')); process.exit(1); }
console.log('Original icon-N.png files were left untouched. Delete them only after every reference uses skills/<id>.png.');
