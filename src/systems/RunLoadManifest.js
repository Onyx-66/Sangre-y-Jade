import manifest from '../audio/sfx-manifest.json' with {type:'json'};
import {normalizeSeed} from '../world/seed.js';
import { audioFileFor } from './AudioDirector.js';

export function runSkillIds(hero,{extraIds=[],allies=[]}={}){
  return [...new Set([...(hero.skills||[]),...(hero.passives||[])].map(skill=>skill.id).concat(['survivors-will','jade-bounty'],extraIds,allies.flatMap(ally=>[...(ally.skills||[]),...(ally.passives||[])].map(skill=>skill.id))))];
}
export function fxManifest(ids,recipes,base='/'){
  return [...new Set(ids)].flatMap(id=>(recipes.get(id)?.stills||[]).map(still=>({key:`fx-still-${id}-${still}`,url:`${base}assets/pixel/fx/${recipes.get(id).files?.[still]||`${id}/${still}.png`}`,type:'image',critical:false})));
}
export function runAudioManifest(ids,map,{base='/',audioKeys=[]}={}){
  const core=[...new Set([`music:${map.music}`,...audioKeys])].map(key=>({key,file:audioFileFor(key),url:audioFileFor(key)?`${base}assets/audio/${audioFileFor(key)}`:key,type:'audio',critical:false}));
  const files=[...new Set(ids)].flatMap(id=>(manifest.skills[id]?.kinds||[]).map(kind=>({key:`${id}:${kind}`,file:`skills/sfx-${id}-${kind}.wav`,url:`${base}assets/audio/sfx/skills/sfx-${id}-${kind}.wav`,type:'skill-audio',critical:false})));
  return [...core,...files];
}

export function prepareMapData(map,hero,seed=83492791){
  if(!map?.id||!map.colors||!Number.isFinite(map.colors.ground)||!hero?.id)throw new Error('Invalid map or hero data');
  return {mapId:map.id,heroId:hero.id,seed:normalizeSeed(seed)};
}
