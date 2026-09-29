export const HERO_SKILL_CAPACITY=4;
export const SUPPORT_SKILL_CAPACITY=3;
export const HERO_SKILL_MAX_LEVEL=6;

/** Full loadout: two upgrade options and one explicit replacement offer. */
export function draftSkills(skills,owned,capacity,shuffle,modifiers=[],boss=false){
 const unowned=shuffle(skills.filter(s=>!owned.some(o=>o.id===s.id))).map(s=>({...s,choiceType:owned.length>=capacity?'replace-skill':'new-skill',meta:owned.length>=capacity?'Replace a skill':'New skill'}));
 const upgrades=shuffle(owned.filter(s=>s.level<HERO_SKILL_MAX_LEVEL)).map(s=>({...s,choiceType:'skill-upgrade',name:`${s.name} · Lv ${s.level+1}`,description:'Increase damage, reach, and effectiveness by roughly 32%.',meta:'Skill upgrade'}));
 const stats=shuffle(modifiers).map(s=>({...s,choiceType:'modifier',meta:'Stat upgrade'}));
 if(owned.length>=capacity){
  const picked=upgrades.slice(0,2);
  // Max-rank skills cannot be upgraded: fill those positions with stat upgrades.
  for(const s of stats){if(picked.length>=2)break;picked.push(s);}
  if(unowned[0])picked.push(unowned[0]);
  return picked;
 }
 const picked=unowned.length?[unowned[0]]:[];
 for(const s of shuffle([...upgrades,...unowned.slice(1),...(boss?[]:stats)])){
  if(picked.length>=3)break;
  if(!picked.some(o=>o.id===s.id))picked.push(s);
 }
 for(const s of stats){if(picked.length>=3)break;if(!picked.some(o=>o.id===s.id))picked.push(s);}
 return picked;
}
