import { BALAM_DEFINITIONS, SHARED_DEFINITIONS } from '../generated/balam.js';
const definitions=new Map([...BALAM_DEFINITIONS,...SHARED_DEFINITIONS].map(skill=>[skill.id,skill]));
export const definition=id=>definitions.get(id);
export const value=(skill,level)=>skill.values[Math.max(0,Math.min(skill.values.length-1,level-1))];
