import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const number=(text,pattern,label)=>{const match=text.match(pattern);if(!match)throw Error(`Missing boss ${label}: ${text}`);return Number(match[1]);};
const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
// The prose fields remain authoritative. Derive their numbers rather than
// maintaining a second handwritten balance table in the behaviours.
export function abilityParameters(a){
 const n=(field,re,label)=>number(a[field],re,`${a.name} ${label}`),t=(re,label)=>n('telegraph',re,label),e=(re,label)=>n('effect',re,label);
 const p={windup:Number(a.telegraph.match(/([\d.]+) s\b/)?.[1]||.5)};
 switch(a.name){
  case 'Sonic Screech':return {...p,arc:t(/cone ([\d.]+)/,'arc')*Math.PI/180,radius:t(/r ([\d.]+)/,'radius'),damage:e(/([\d.]+) dmg/,'damage'),knockback:e(/knockback ([\d.]+)/,'knockback'),confuse:e(/confuses ([\d.]+) s/,'confuse')};
  case 'Bat Swarm':return {...p,count:e(/summons ([\d.]+)/,'count')};
  case 'Blood Dive':return {...p,length:t(/line ([\d.]+)/,'length'),speed:e(/speed ([\d.]+)/,'speed'),damage:e(/([\d.]+) dmg/,'damage'),duration:e(/trail for ([\d.]+) s/,'trail duration'),dps:e(/([\d.]+) dps/,'bleed')};
  case 'Eclipse':return {...p,duration:e(/^([\d.]+) s/,'duration'),radius:e(/radius of ([\d.]+)/,'visibility')};
  case 'Twin Dive':return {...p,count:2}; // The source says "two simultaneous".
  case 'Stone Slam':return {...p,radius:t(/r ([\d.]+)/,'radius'),damage:e(/([\d.]+) dmg/,'damage'),knockback:e(/knockback ([\d.]+)/,'knockback')};
  case 'Rock Rain':return {...p,count:t(/^([\d.]+) shadow/,'count'),radius:t(/r ([\d.]+)/,'radius'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Fissure Line':return {...p,length:t(/line ([\d.]+)/,'length'),width:t(/x ([\d.]+)/,'width'),duration:e(/over ([\d.]+) s/,'duration'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Stone Armor':return {...p,count:t(/^([\d.]+) glowing/,'count'),hp:t(/\(([\d.]+) HP/,'stone HP'),reduction:e(/([\d.]+)% less/,'reduction')/100};
  case 'Avalanche':return {...p,damage:e(/([\d.]+) dmg/,'damage')};
  case 'Sunbeam Sweep':return {...p,length:t(/beam ([\d.]+)/,'length'),width:t(/x ([\d.]+)/,'width'),rotation:e(/rotates ([\d.]+)/,'rotation')*Math.PI/180,duration:e(/over ([\d.]+) s/,'duration'),damage:e(/([\d.]+) dmg/,'damage'),tick:e(/per ([\d.]+) s/,'tick')};
  case 'Feather Barrage':return {...p,count:e(/fan of ([\d.]+)/,'count'),speed:e(/speed ([\d.]+)/,'speed'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Solar Flare Rings':return {...p,count:e(/^([\d.]+) expanding/,'rings'),gaps:e(/with ([\d.]+) safe/,'gaps'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Second Sun':return {...p,count:t(/^([\d.]+) orbs/,'count'),hp:e(/orbs \(([\d.]+) HP/,'orb HP'),damage:e(/homing, ([\d.]+) dmg/,'damage'),stun:e(/stuns the boss ([\d.]+) s/,'stun')};
  case 'Zenith':return {...p,windup:t(/then a ([\d.]+) s/,'landing warning'),trail:t(/trail ([\d.]+) s/,'flight duration'),radius:t(/r ([\d.]+)/,'radius'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Death Gaze':return {...p,length:e(/laser ([\d.]+)/,'length'),damage:e(/([\d.]+) dmg/,'damage'),tick:e(/per ([\d.]+) s/,'tick'),duration:e(/for ([\d.]+) s/,'duration')};
  case 'Bone Spear Ring':return {...p,radius:t(/r ([\d.]+)/,'radius'),count:e(/^([\d.]+) spears/,'count'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Soul Drain':return {...p,radius:t(/r ([\d.]+)/,'radius'),duration:e(/player ([\d.]+) s/,'duration'),damage:e(/([\d.]+) dmg/,'damage')};
  case 'Summon Lords':return {...p,count:e(/summons ([\d.]+)/,'count')};
  case 'Xibalba Shift':return {...p,dps:e(/\(([\d.]+) dps/,'fog DPS'),count:e(/([\d.]+) safe/,'safe circles'),radius:e(/r ([\d.]+)/,'safe radius'),moveEvery:e(/every ([\d.]+) s/,'move interval')};
  case 'Final Rite':return {...p,count:t(/([\d.]+) safe circles/,'safe circle count'),radius:t(/r ([\d.]+)/,'safe radius'),damage:e(/blast ([\d.]+) dmg/,'damage'),first:e(/first one ([\d.]+) s/,'first blast')};
  default:throw Error(`Uncompiled boss ability: ${a.name}`);
 }
}
export function compileBosses(design){
 return design.bosses.map(boss=>{
  const phases=boss.phases.map((phase,index)=>({
   ...phase,index,threshold:number(phase.name,/\((?:below )?([\d.]+)(?:-[\d.]+)?%\)/,'HP threshold')/100,
   speedMult:1+Number(phase.abilities.map(a=>a.effect).join(' ').match(/(?:boss )?speed \+([\d.]+)%/)?.[1]||0)/100,
   abilities:phase.abilities.map(ability=>({...ability,id:slug(ability.name),cooldown:ability.cd,parameters:abilityParameters(ability),
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
