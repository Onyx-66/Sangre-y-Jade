import { definition, value } from '../data.js';
import { proc } from '../runtime.js';
const data=definition('jungle-instinct');
export const jungleInstinct={...data,on:{},avoidDamage({scene},level){if(Math.random()>=value(data,level)/100)return false;proc(scene,data);return true;}};
