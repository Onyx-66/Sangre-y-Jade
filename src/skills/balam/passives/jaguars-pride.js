import { definition, value } from '../data.js';
import { within } from '../runtime.js';
const data=definition('jaguars-pride');
const count=scene=>Math.min(data.params.maxEnemies,within(scene,data.params.range).length);
export const jaguarsPride={...data,stat:(level,{scene})=>({damageMult:1+count(scene)*value(data,level)/100}),on:{
 tick({scene,state}){state.hudState={type:'stacks',value:count(scene),max:data.params.maxEnemies};},
}};
