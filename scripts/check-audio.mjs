import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileAudio } from './audio-catalog.mjs';
import { resolveAudio,musicAliases } from '../src/audio/ManifestAudio.js';

export function checkAudio({root=process.cwd(),audioRoot=path.join(root,'public/assets/audio-v06'),references}={}) {
  const {catalog}=compileAudio(root),missing={},invalid=[],unlisted=[];let bytes=0,present=0;
  for(const [id,item]of Object.entries(catalog)) {
    const file=path.join(audioRoot,item.file);
    if(fs.existsSync(file)){present++;}
    else (missing[item.priority]??=[]).push(id);
  }
  const known=new Set(Object.values(catalog).map(item=>item.file));
  const inspect=dir=>{if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())inspect(file);else if(entry.isFile()&&/\.(mp3|wav|ogg|m4a)$/i.test(entry.name)){bytes+=fs.statSync(file).size;const relative=path.relative(audioRoot,file).replaceAll('\\','/');if(!known.has(relative))unlisted.push(relative);}}};inspect(audioRoot);
  const refs=references||sourceReferences(root,catalog);
  for(const ref of refs)if(!resolveAudio(ref.id,catalog,ref.language||'en'))invalid.push(ref);
  return {entries:Object.keys(catalog).length,present,bytes,budgetBytes:45_000_000,overBudget:bytes>45_000_000,missing,unlisted,invalid,checkedReferences:refs.length};
}
export function sourceReferences(root,catalog) {
  const files=[],refs=[];
  const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.js'))files.push(file);}};walk(path.join(root,'src'));
  for(const file of files){const code=fs.readFileSync(file,'utf8');
    for(const match of code.matchAll(/(?:audio|skillAudio)\??\.(sfx|voice|play|ui|music)\??\.?\(\s*['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/g)){
      let id=match[2];if(match[0].startsWith('skillAudio')&&match[1]==='play')id=`sfx/skills/${id}-${match[3]||'cast'}`;if(match[1]==='ui')id=`sfx/ui/${id}`;
      if(match[1]==='music')id=`music/${musicAliases[id]||id}`;
      refs.push({id,file:path.relative(root,file)});
    }
  }
  // Enumerate generated event families too: checking only string literals would
  // miss almost all enemy, boss, localized voice and skill calls.
  const roster=JSON.parse(fs.readFileSync(path.join(root,'src/data/enemies-v06.json'),'utf8'));
  for(const id of Object.keys(roster))for(const kind of ['spawn','windup','attack','death'])refs.push({id:`enemy-${id}-${kind}`,file:'enemy lifecycle'});
  const bosses=JSON.parse(fs.readFileSync(path.join(root,'src/data/bosses-v06.json'),'utf8'));
  for(const boss of bosses){for(const kind of ['entry','phase','death'])refs.push({id:`boss-${boss.id}-${kind}`,file:'boss lifecycle'});
    for(const ability of new Set(boss.phases.flatMap(p=>p.abilities.map(a=>a.id))))for(const kind of ['warn','cast'])refs.push({id:`boss-${boss.id}-${ability}-${kind}`,file:'boss scheduler'});
    for(const language of ['en','fr','ar'])for(const kind of ['entry','phase','taunt','death'])refs.push({id:`voice/${language}/boss-${boss.id}-${kind}`,file:'boss dialogue'});
  }
  for(const id of Object.keys(catalog).filter(id=>id.startsWith('sfx/skills/')||id.startsWith('voice/')))refs.push({id,file:'manifest-dispatched event'});
  return refs;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const report=checkAudio();
  const reportIndex=process.argv.indexOf('--report');if(reportIndex>=0){const file=process.argv[reportIndex+1];if(!file)throw Error('--report needs a filename');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else {console.log(`Audio: ${report.present}/${report.entries} files, ${(report.bytes/1e6).toFixed(2)} / 45 MB; ${report.checkedReferences} code references checked.`);
    for(const [priority,ids]of Object.entries(report.missing))console.log(`${priority}: ${ids.length} missing\n${ids.join('\n')}`);
    for(const ref of report.invalid)console.error(`Unknown audio id: ${ref.id} (${ref.file})`);
    for(const file of report.unlisted)console.log(`Unlisted audio (included in budget): ${file}`);
    if(!report.invalid.length&&!report.overBudget)console.log('OK (missing optional audio uses fallback/silence)');}
  if(report.invalid.length||report.overBudget)process.exitCode=1;
}
