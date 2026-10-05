import { ALLY_CATALOG } from '../data/allyCatalog.js';
import { ENEMY_IDS,enemiesForArt } from './enemyVisuals.js';
import { mapArtManifest } from '../maps/MapArt.js';
import { weatherStillIds, WEATHER_STILL_PATHS } from '../weather/WeatherDirector.js';
export const CHARACTER_ROWS={hero:['balam','ixchel','kukul'],enemy:ENEMY_IDS,boss:['camazotz','zipacna','vucub','ahpuch'],support:['saintess','tank','assassin']};

export function textureManifest({hero,map,base='/',allyIds=CHARACTER_ROWS.support}={}){
  const root=`${base}assets/pixel/`,files=[];
  const image=(key,file,critical=true)=>files.push({key,url:`${root}${file}`,type:'image',critical});
  for(const asset of mapArtManifest(map))image(asset.key,asset.file);
  for(const id of weatherStillIds(map?.id))image(`weather-${id}`,WEATHER_STILL_PATHS[id],false);
  files.push({key:'pickup-bubble',url:`${base}assets/ui/pickup-bubble.svg`,type:'image',critical:true});
  image('support-bomb','support-bomb.png');
  for(const id of allyIds)for(const skill of ALLY_CATALOG[id]||[])image(`skill-icon-${skill.id}`,skill.iconFile,false);
  const heroes=hero?[hero.id]:CHARACTER_ROWS.hero,groundOnly=hero?.automatic?.type==='melee';
  const rows={hero:heroes,enemy:enemiesForArt(hero,map),
    boss:CHARACTER_ROWS.boss.filter(id=>!groundOnly||!['camazotz','vucub'].includes(id)),support:allyIds};
  const actors=[...Object.entries(rows).flatMap(([kind,names])=>names.map(name=>`${kind}-${name}`)),...heroes.flatMap(name=>['up','down'].map(dir=>`hero-${name}-${dir}`)),...Array.from({length:6},(_,i)=>`fx-${i}`)];
  for(const key of actors){image(key,`frames/${key}-0.png`);for(let i=0;i<(/^(enemy|boss)-/.test(key)?16:4);i++)image(`${key}-frame-${i}`,`frames/${key}-${i}.png`);}
  const terrain=['temple','palm','rocks','ruin','stela','foliage','roots',...(map?[map.id==='cenote'?'crystal':'tree']:['tree','crystal'])];
  for(const name of terrain)image(`top-${name}`,`top-${name}.png`);
  for(const name of ['stela','ruin','palm','foliage','roots','crystal','urn','basket','weapon-balam','weapon-ixchel','weapon-kukul','bracers','pendant','headdress','cacao','potion'])image(name,`${name}.png`);
  for(const [key,file]of Object.entries({'xp-gem':'crystal.png',summon:'weapon-ixchel.png',trap:'skills/stone-maw.png','player-dart':'weapon-kukul.png',ground:'ground.png'}))image(key,file);
  return files;
}
