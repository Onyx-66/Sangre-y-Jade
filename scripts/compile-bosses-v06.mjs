import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const number=(text,pattern,label)=>{const match=text.match(pattern);if(!match)throw Error(`Missing boss ${label}: ${text}`);return Number(match[1]);};
const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function compileBosses(design){
 return design.bosses.map(boss=>{
  const phases=boss.phases.map((phase,index)=>({
   ...phase,index,threshold:number(phase.name,/\((?:below )?([\d.]+)(?:-[\d.]+)?%\)/,'HP threshold')/100,
   speedMult:1+Number(phase.abilities.map(a=>a.effect).join(' ').match(/(?:boss )?speed \+([\d.]+)%/)?.[1]||0)/100,
   abilities:phase.abilities.map(ability=>({...ability,id:slug(ability.name),cooldown:ability.cd,
    ...(ability.name==='Final Rite'?{safeCircleCount:number(ability.telegraph,/([\d.]+) safe circles/,'safe circle count'),safeRadius:number(ability.telegraph,/r ([\d.]+)/,'safe radius')}:{})})),
  }));
  return {...boss,entryDuration:number(boss.entry,/([\d.]+) s[.,]?\s*(?:longest entrance\.)?$/,'entry duration'),
   arrival:{quick:number(boss.arrives,/^(\d+):/,'quick minutes')*60+number(boss.arrives,/^\d+:(\d+)/,'quick seconds'),
    full:number(boss.arrives,/\/ (\d+):/,'full minutes')*60+number(boss.arrives,/\/ \d+:(\d+)/,'full seconds')},phases};
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const input=process.argv[2]||'docs/v0.6/v06_design.json',output=process.argv[3]||'src/data/bosses-v06.json';
 writeFileSync(output,JSON.stringify(compileBosses(JSON.parse(readFileSync(input,'utf8'))),null,2)+'\n');
 console.log(`Generated ${output} from ${input}`);
}
