import { HEROES } from '../data/heroes.js';
const maps={balam:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21],ixchel:[22,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,29],kukul:[42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61]};
for(const [id,hero] of Object.entries(HEROES)) if(id!=='balam')hero.skills.forEach((skill,i)=>{skill.art=maps[id][i];});
// Dedicated skill icons arrive in step 13. Prefer them only when actually present.
let skillIcons={};
try{skillIcons=import.meta.glob('/public/assets/pixel/skills/*.png');}catch{/* Node fixtures have no Vite glob transform. */}
const modifiers={might:2,vigor:62,haste:45,reach:24,swiftness:65,critical:16,armor:4,renewal:17,wisdom:63,fortune:64};
export const artUrl=file=>`${import.meta.env.BASE_URL}assets/pixel/${file}`;
export function iconMarkup(item){const file=item.iconFile&&skillIcons[`/public/assets/pixel/${item.iconFile}`]?item.iconFile:`icon-${item.art??modifiers[item.id]??63}.png`;return `<img class="pixel-icon" src="${artUrl(item.supportPortrait?`frames/support-${item.supportPortrait}-0.png`:file)}" alt="">`;}
export function portraitMarkup(id){return `<img class="hero-portrait" src="${artUrl(`frames/hero-${id}-0.png`)}" alt="" aria-hidden="true">`;}
