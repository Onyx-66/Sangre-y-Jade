// Support skills are autonomous; role cards and current data come from the redesign catalogue.
import { ALLY_CATALOG, ALLY_RULES } from './allyCatalog.js';
export const SUPPORTS = {
 saintess:{id:'saintess',name:'Saintess',description:'Heals, shields, and buffs your hero.',supportPortrait:'saintess',color:0xa3ffe1},
 tank:{id:'tank',name:'Tank',description:'Guards you, blocks shots, and controls the frontline.',supportPortrait:'tank',color:0xffce80},
 assassin:{id:'assassin',name:'Assassin',description:'Hunts the enemy with the highest threat.',supportPortrait:'assassin',color:0xd4a5ff},
};
export const allyRank=heroLevel=>Math.min(5,1+Math.floor((Math.max(ALLY_RULES.join_level,heroLevel)-ALLY_RULES.join_level)/5));
export const allyNumberMultiplier=rank=>1+ALLY_RULES.rank_number_bonus*(Math.min(5,Math.max(1,rank))-1);
export const allyCooldownMultiplier=rank=>1-ALLY_RULES.rank_cooldown_reduction*(Math.min(5,Math.max(1,rank))-1);
export function allyLevelEvent(level,hasCompanion){
 if(!hasCompanion&&level===ALLY_RULES.join_level)return 'recruit';
 if(hasCompanion&&ALLY_RULES.pick_levels.includes(level))return 'pick';
 return null;
}
const roles={saintess:'Healer / Support',tank:'Frontline Protector',assassin:'Single-Target Hunter'};
for(const [id,support]of Object.entries(SUPPORTS)){
 const skills=ALLY_CATALOG[id];
 support.role=roles[id];
 support.signature=skills.find(skill=>skill.id===ALLY_RULES.signatures[id]);
 support.passives=skills.filter(skill=>skill.kind==='passive');
}
export function threatScore(enemy,player){
 const d=enemy.getData.bind(enemy),distance=Math.hypot(enemy.x-player.x,enemy.y-player.y);
 // Potential damage is primary, then boss/ranged pressure and proximity.
 return (d('damage')||0)*(d('ranged')?1.5:1)+(d('isBoss')?25:0)+Math.max(0,1-distance/750)*10;
}
export function dangerousEnemy(enemies,player,range=750){
 return enemies.filter(e=>e?.active&&Math.hypot(e.x-player.x,e.y-player.y)<=range).sort((a,b)=>threatScore(b,player)-threatScore(a,player))[0]||null;
}
