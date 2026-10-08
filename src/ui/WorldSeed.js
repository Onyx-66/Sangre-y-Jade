// Seed UI only: entropy is collected outside generation. Inputs are escaped,
// validated and kept across setup pages, locale switches and retries.
import {normalizeSeed,validSeed} from '../world/seed.js';
import {t} from '../i18n/index.js';
import {escapeHtml} from '../systems/PassiveState.js';
export const randomSeed=()=>String(crypto.getRandomValues(new Uint32Array(1))[0]);
export function initialSeed(selection){if(!selection.seed){const query=new URLSearchParams(location.search).get('seed');selection.seed=query&&validSeed(query.trim())?query.trim():randomSeed();}return selection.seed;}
export function seedMarkup(seed,readOnly=false){return `<div class="world-seed"><label for="world-seed">${t('World seed')}</label><input id="world-seed" dir="ltr" data-no-translate maxlength="64" value="${escapeHtml(seed)}" ${readOnly?'readonly':''}>${readOnly?'':`<button type="button" class="btn ghost small" data-seed-dice>${t('Random seed')}</button>`}<button type="button" class="btn ghost small" data-seed-copy>${t('Copy seed')}</button><small role="status" data-seed-status></small></div>`;}
export function bindSeed(root,selection,audio){const input=root.querySelector('#world-seed');if(!input)return;
  const status=root.querySelector('[data-seed-status]'),check=()=>{const ok=validSeed(input.value.trim());input.setCustomValidity(ok?'':t('Seed: 1–64 letters, numbers, spaces, dots, hyphens or underscores.'));status.textContent=ok?'':input.validationMessage;root.querySelector('[data-next]')?.toggleAttribute('disabled',!ok);if(ok)selection.seed=normalizeSeed(input.value);return ok;};
  input.addEventListener('input',check);root.querySelector('[data-seed-dice]')?.addEventListener('click',()=>{input.value=randomSeed();check();audio?.ui?.('seed-dice');});
  root.querySelector('[data-seed-copy]')?.addEventListener('click',async()=>{if(!check())return;try{await navigator.clipboard.writeText(selection.seed);status.textContent=t('Seed copied');audio?.ui?.('seed-copy');}catch{input.focus();input.select();status.textContent=t('Select and copy the seed.');}});
}
