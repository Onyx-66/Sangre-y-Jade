import skills from '../../docs/skills-redesign/skills_redesign.json' with {type:'json'};
import enemies from '../data/enemies-v06.json' with {type:'json'};

function skillIds(owner) {
  const group=skills.heroes?.[owner] || skills.allies?.[owner];
  const found=[];
  const visit=value=>{if(!value||typeof value!=='object')return;if(value.id)found.push(value.id);for(const child of Object.values(value))if(typeof child==='object')visit(child);};
  visit(group);visit(skills.shared);return found;
}
export function bossAudioIds(engine,id){return [...engine.group('bosses',key=>key.startsWith(`sfx/bosses/${id}-`)),...engine.group('voice',key=>key.startsWith(`voice/${engine.language()}/boss-${id}-`)),`music/boss-${id}`];}
export function runAudioIds(engine,hero,map,ally){
  const ids=new Set([...skillIds(hero),...skillIds(ally)]);
  const waterIds=[...engine.group('water'),...engine.group('steps')];
  const roster=Object.values(enemies).filter(e=>e.maps.includes('all')||e.maps.includes(map));
  return [...engine.group('core'),...engine.group('ui'),...engine.group('skills',key=>[...ids].some(id=>key.startsWith(`sfx/skills/${id}-`))),...engine.group('enemies',key=>roster.some(e=>key.startsWith(`sfx/enemies/${e.id}-`))),...engine.group('ambience',key=>key.endsWith(`${map}-base`)||({overgrown:/rain|leaves|wind-soft/,bloodmoon:/ashstorm|embers|thunder/,cenote:/water|drips|rockfall/}[map]?.test(key))),
    ...waterIds,...engine.group('voice',key=>key.startsWith(`voice/${engine.language()}/`) && (key.includes('/announcer-')||key.includes(`/${hero}-`)||(ally&&key.includes(`/${ally}-`)))),`music/map-${map}`,...bossAudioIds(engine,'camazotz')];
}
export function attachRunAudio(scene) {
  const audio=scene.audio,engine=audio?.v2;if(!engine)return;
  engine.listener=()=>scene.player||{x:0,y:0};engine.runHero=scene.options.hero.id;
  scene.events?.once('shutdown',()=>{engine.stopOwner('run');engine.listener=()=>({x:0,y:0});engine.duck('cinematic',false);});
}
