import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('obsidian-thorns');
export const obsidianThorns={...data,on:{
 damageTaken({scene,source,melee,amount},level){if(!melee||amount<=0||!source?.active)return;scene.damageEnemy(source,value(data,level)+amount*data.params.returnPct/100,0,0,scene.player,{canCrit:false});proc(scene,data,source);},
}};
