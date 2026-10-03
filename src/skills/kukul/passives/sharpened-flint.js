import { definition, value } from '../data.js';
const data=definition('sharpened-flint');
export const sharpenedFlint={...data,on:{},stat:level=>({pierce:value(data,level)})};
