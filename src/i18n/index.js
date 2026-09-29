import { messages } from './messages.js';
import { interfaceIcon } from '../art/interfaceIcons.js';
import { skillMessages } from './skills.js';
import { extraMessages } from './extra.js';
import { v05Messages } from './v05.js';
export const LOCALES=['en','fr','ar'];
const dictionaries={en:new Map(),fr:new Map(),ar:new Map()};
for(const [en,fr,ar] of [...messages,...skillMessages,...extraMessages,...v05Messages]){dictionaries.en.set(en,en);dictionaries.fr.set(en,fr);dictionaries.ar.set(en,ar);}
export const westernDigits=value=>String(value).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/٫/g,'.').replace(/٪/g,'%');
let language='en';
export const getLanguage=()=>language;
export function setLanguage(value){
 language=LOCALES.includes(value)?value:'en';
 if(typeof document!=='undefined'){document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';}
}
export function t(key,values={}){
 const source=String(key);let translated=dictionaries[language].get(source);
 if(translated===undefined){
  let match;
  if((match=source.match(/^(LEVEL|Level) (\d+)$/)))return t(`${match[1]} {n}`,{n:match[2]});
  if((match=source.match(/^Empty skill slot (\d+)$/)))return t('Empty skill slot {n}',{n:match[1]});
  if((match=source.match(/^(.+) · Lv (\d+)$/)))return t('{name} · Lv {n}',{name:t(match[1]),n:match[2]});
  if((match=source.match(/^(.+), level (\d+)$/)))return t('{name}, level {n}',{name:t(match[1]),n:match[2]});
  if((match=source.match(/^Ally: (.+)$/)))return t('Ally: {name}',{name:t(match[1])});
  if((match=source.match(/^(.*?)([\p{L}].+) equipped$/u)))return match[1]+t('{name} equipped',{name:t(match[2])});
  if((match=source.match(/^● (\d+) cacao$/)))return `● ${match[1]} ${t('cacao')}`;
  if((match=source.match(/^(.+) sealed the breach—for now\.$/)))return t('{name} defeated the final boss!',{name:t(match[1])});
  if((match=source.match(/^(.+) carried (\d+) cacao back to the shrine\.$/)))return t('{name} earned {n} cacao.',{name:t(match[1]),n:match[2]});
  if(source.startsWith('Relics carried: '))return t('Equipment:')+' '+source.slice(15).split(' · ').map(part=>t(part.replace(/^[^\p{L}]+/u,''))).join(' · ');
  if(source.includes('\n'))return source.split('\n').map(line=>t(line)).join('\n');
  if(source.includes(' · '))return source.split(' · ').map(part=>t(part)).join(' · ');
  translated=source;
 }
 return westernDigits(translated.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??`{${name}}`)));
}
export function translateDOM(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  if(node.parentElement?.closest('[data-no-translate],script,style,pre'))continue;
  const raw=node.nodeValue,trimmed=raw.trim();if(!trimmed)continue;
  const translated=t(trimmed);if(translated!==trimmed)node.nodeValue=raw.replace(trimmed,translated);
 }
 for(const el of root.querySelectorAll('[aria-label],[title],[alt]'))for(const attr of ['aria-label','title','alt'])if(el.hasAttribute(attr))el.setAttribute(attr,t(el.getAttribute(attr)));
}
export const languageMarkup=()=>`<label class="language-switch" title="${t('Language')}">${interfaceIcon('globe')}<select data-language aria-label="${t('Language')}" data-no-translate><option value="en" ${language==='en'?'selected':''}>English</option><option value="fr" ${language==='fr'?'selected':''}>Français</option><option value="ar" ${language==='ar'?'selected':''}>العربية</option></select></label>`;
export const hasTranslation=(key,locale)=>dictionaries[locale]?.has(key)??false;
