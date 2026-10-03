let skillIcons={};
try{skillIcons=import.meta.glob('/public/assets/pixel/skills/*.png');}catch{/* Node fixtures have no Vite glob transform. */}
export const artUrl=file=>`${import.meta.env.BASE_URL}assets/pixel/${file}`;
export function iconFileFor(item={}){
  if(item.supportPortrait)return `frames/support-${item.supportPortrait}-0.png`;
  const id=String(item.id||'').trim();
  if(!id)return null;
  const filename=item.kind==='stat'?`stat-${id}.png`:`${id}.png`;
  const file=`skills/${filename}`;
  return skillIcons[`/public/assets/pixel/${file}`]?file:null;
}
export function iconMarkup(item){
  const file=iconFileFor(item);
  return file?`<img class="pixel-icon" src="${artUrl(file)}" alt="" aria-hidden="true">`:'<span class="pixel-icon missing" aria-hidden="true">✦</span>';
}
export function portraitMarkup(id){return `<img class="hero-portrait" src="${artUrl(`frames/hero-${id}-0.png`)}" alt="" aria-hidden="true">`;}
