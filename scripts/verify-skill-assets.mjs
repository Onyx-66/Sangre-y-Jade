import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
import {FxDirector} from '../src/fx/FxDirector.js';
import '../src/fx/recipes/balam.js';
import '../src/fx/recipes/ixchel.js';
import '../src/fx/recipes/kukul.js';
import {ACTIVE_HANDLERS,PASSIVE_HANDLERS} from '../src/skills/index.js';
import {ALLY_ACTIVE_HANDLERS,ALLY_PASSIVE_HANDLERS} from '../src/skills/allies/index.js';
import {HEROES} from '../src/data/heroes.js';
const spec=JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json','utf8'));
const manifest=JSON.parse(await fs.readFile('src/audio/sfx-manifest.json','utf8'));
const skills=[...Object.values(spec.heroes).flat(),...spec.shared,...Object.values(spec.allies).flat()];
const rows=[],issues=[],refs=new Map(),hashes=new Map();
const tracked=new Set(execFileSync('git',['ls-files','--','public/assets/pixel/skills','public/assets/pixel/fx','public/assets/audio/sfx'],{encoding:'utf8'}).trim().split(/\r?\n/));
async function asset(owner,file,size,referenced=true){
 const row={owner,file,referenced,tracked:tracked.has(`public/assets/${file}`)};rows.push(row);
 refs.set(file,(refs.get(file)||0)+1);
 try{
  const bytes=await fs.readFile(`public/assets/${file}`);row.bytes=bytes.length;row.sha256=createHash('sha256').update(bytes).digest('hex');
  if(hashes.has(row.sha256))issues.push(`Identical files: ${file} / ${hashes.get(row.sha256)}`);hashes.set(row.sha256,file);
  if(size){const meta=await sharp(bytes).metadata();row.width=meta.width;row.height=meta.height;row.alpha=meta.hasAlpha;if(meta.width!==size||meta.height!==size||!meta.hasAlpha)issues.push(`Invalid size/alpha: ${file}`);}
 }catch(error){row.error=error.message;issues.push(`Missing/unreadable: ${file}`);}
 if(!referenced)issues.push(`No runtime recipe reference: ${file}`);
}
for(const skill of [...skills,...spec.stats,...spec.optional_ui_icons])await asset(skill.id,`pixel/${skill.icon_file}`,128);
for(const skill of skills){
 const stills=skill.kind==='active'?['main','accent']:['proc'],recipe=FxDirector.recipes.get(skill.id);
 for(const still of stills)await asset(skill.id,`pixel/fx/${skill.id}/${still}.png`,skill.kind==='active'?256:128,recipe?.stills.filter(name=>name===still).length===1);
 const sound=manifest.skills[skill.id];
 if(!sound)issues.push(`Missing sound manifest entry: ${skill.id}`);
 else for(const kind of sound.kinds)await asset(skill.id,`audio/sfx/skills/sfx-${skill.id}-${kind}.wav`);
 if(skill.kind==='passive'&&!/^None \(passive\)/i.test(skill.sfx)&&!sound?.kinds.includes('proc'))issues.push(`Missing proc cue: ${skill.id}`);
 if(skill.kind==='active'&&!sound?.kinds.includes('cast'))issues.push(`Missing cast cue: ${skill.id}`);
 const handlers=skill.owner.startsWith('ally:')?(skill.kind==='active'?ALLY_ACTIVE_HANDLERS:ALLY_PASSIVE_HANDLERS):(skill.kind==='active'?ACTIVE_HANDLERS:PASSIVE_HANDLERS);
 if(!handlers[skill.id])issues.push(`Missing gameplay handler: ${skill.id}`);
}
for(const id of Object.keys(manifest.ui))await asset(`ui:${id}`,`audio/sfx/ui/sfx-ui-${id}.wav`);
for(const [file,count]of refs)if(count!==1)issues.push(`Canonical reference count ${count}: ${file}`);
async function list(dir){const found=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=`${dir}/${entry.name}`;if(entry.isDirectory())found.push(...await list(file));else found.push(file);}return found;}
const extra=[];for(const dir of ['public/assets/pixel/skills','public/assets/pixel/fx','public/assets/audio/sfx'])for(const file of await list(dir))if(!refs.has(file.replace('public/assets/','')))extra.push(file);
const oldIcons=(await fs.readdir('public/assets/pixel')).filter(name=>/^icon-\d+\.png$/.test(name));
const poolIssues=[];for(const [owner,expected]of Object.entries(spec.heroes)){
 const actual=[...HEROES[owner].skills,...HEROES[owner].passives||[]].map(s=>s.id);
 for(const skill of expected)if(!actual.includes(skill.id))poolIssues.push(`${owner}: missing ${skill.id}`);
 for(const id of actual)if(!expected.some(s=>s.id===id))poolIssues.push(`${owner}: legacy ${id}`);
}
const report={date:new Date().toISOString(),semantics:'Exactly one canonical skill/variant owner per file, not one call site. Shared traits and UI can render repeatedly.',
 skillCount:skills.length,counts:{icons:rows.filter(r=>r.file.startsWith('pixel/skills')).length,stills:rows.filter(r=>r.file.startsWith('pixel/fx')).length,sounds:rows.filter(r=>r.file.startsWith('audio')).length},rows,issues,extra,oldIcons,poolIssues,
 untracked:rows.filter(r=>!r.tracked).map(r=>r.file),
 pendingRecipes:skills.filter(s=>!FxDirector.recipes.has(s.id)).map(s=>s.id)};
await fs.mkdir('docs/skills-redesign/verification',{recursive:true});await fs.writeFile('docs/skills-redesign/verification/assets.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,issues:issues.length,poolIssues,pendingRecipes:report.pendingRecipes,extra,oldIcons},null,2));
if(issues.length||poolIssues.length||extra.length||oldIcons.length)process.exitCode=1;
