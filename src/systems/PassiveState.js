import { SHARED_DEFINITIONS } from '../skills/generated/balam.js';
const clamp = (value, max = 1) => Math.max(0, Math.min(max, Number(value) || 0));
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Presentation data only. Future passives provide `hudState`; no trigger logic lives here.
export function passiveStateMarkup(state) {
  if (!state) return '';
  if (state.type === 'counter') {
    const max = Math.max(1, Number(state.max) || 1), value = clamp(state.value, max);
    return `<span class="passive-counter" role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span style="width:${value / max * 100}%"></span></span><b class="passive-counter-label" dir="ltr">${value}/${max}</b>`;
  }
  if (state.type === 'timer') {
    const remaining = Math.max(0, Number(state.remaining) || 0), duration = Math.max(1, Number(state.duration) || 1);
    const ready = state.ready ?? remaining === 0;
    return `<span class="passive-timer ${ready ? 'is-ready' : ''}" style="--remaining:${ready ? 0 : clamp(remaining / duration) * 360}deg" aria-label="${escapeHtml(state.label || (ready ? 'Ready' : `${Math.ceil(remaining)}s`))}"></span>`;
  }
  if (state.type === 'stacks') {
    const max = Math.max(1, Math.min(12, Math.floor(Number(state.max) || 5))), value = clamp(Math.floor(Number(state.value) || 0), max);
    return `<span class="passive-stacks" aria-label="${value}/${max}" dir="ltr">${Array.from({ length: max }, (_, i) => `<i class="${i < value ? 'filled' : ''}"></i>`).join('')}</span>`;
  }
  return '';
}

export function levelPips(level) {
  return `<span class="level-pips" dir="ltr" aria-label="${clamp(level, 5)}/5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < clamp(level, 5) ? 'filled' : ''}"></i>`).join('')}</span>`;
}

export function cardKind(card) {
  if (['active', 'passive', 'ally', 'stat'].includes(card.kind)) return card.kind;
  return card.supportPortrait || card.meta === 'New support skill' ? 'ally' : card.stat ? 'stat' : 'active';
}

// Existing icons until the later trait-art step supplies the dedicated skill icons.
export const INNATE_HUD = SHARED_DEFINITIONS.map(skill=>({...skill,art:skill.art??65,level:1}));
export function passiveStateText(state) {
  if(!state)return '';
  if(state.type==='counter'||state.type==='stacks')return `${state.value}/${state.max}`;
  if(state.type==='timer')return `${Math.ceil(state.remaining||0)}s`;
  if(state.type==='bonus')return `+${state.healPerGem} HP · +${state.pickupRangePct}%`;
  return '';
}
