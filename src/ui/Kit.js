import catalog from '../data/uiKit.json' with { type: 'json' };
import { assetUrl } from './assetUrl.js';
export { assetUrl } from './assetUrl.js';

const items = new Map(catalog.items.map(item => [item.id, item]));
export const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export function kitUrl(id) {
  const item = items.get(id);
  if (!item) throw new Error(`Unknown UI kit item: ${id}`);
  return assetUrl(item.path);
}
export function sliceStyle(id) {
  const item = items.get(id);
  if (!item?.sliceInsets) throw new Error(`Not a nine-slice source: ${id}`);
  const { top, right, bottom, left } = item.sliceInsets;
  return `--kit-image:url('${kitUrl(id)}');--kit-slices:${top} ${right} ${bottom} ${left};--kit-top:${top}px;--kit-right:${right}px;--kit-bottom:${bottom}px;--kit-left:${left}px`;
}
const attributes = attrs => Object.entries(attrs).filter(([, value]) => value !== false && value != null)
  .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`).join('');

// Content is trusted component markup; labels/attribute values are escaped by callers.
export function kitPanel(content, { small = false, modal = false, className = '', attrs = {} } = {}) {
  const id = modal ? 'modal-frame' : small ? 'panel-small' : 'panel-large';
  return `<section class="kit-slice kit-panel ${className}" data-kit="${id}" style="${sliceStyle(id)}"${attributes(attrs)}>${content}</section>`;
}
export function kitCard(content, { selected = false, locked = false, className = '', attrs = {} } = {}) {
  const state = locked ? 'locked' : selected ? 'selected' : 'normal';
  return `<button type="button" class="kit-slice kit-card ${className}" data-ui-focus data-kit="card-${state}" style="${sliceStyle('card-normal')};--kit-selected:url('${kitUrl('card-selected')}');--kit-locked:url('${kitUrl('card-locked')}')" aria-pressed="${selected}"${locked ? ' disabled aria-disabled="true"' : ''}${attributes(attrs)}>${content}</button>`;
}
export function kitButton(label, { variant = 'secondary', className = '', disabled = false, attrs = {}, content = '' } = {}) {
  if (!['primary', 'secondary', 'danger', 'small', 'round'].includes(variant)) throw new Error(`Unknown button variant: ${variant}`);
  const id = `button-${variant}`, imageStyle = variant === 'round' ? `--kit-image:url('${kitUrl(id)}')` : sliceStyle(id);
  const stateStyle = ['primary', 'secondary'].includes(variant)
    ? `;--kit-pressed:url('${kitUrl(`${id}-pressed`)}');--kit-disabled:url('${kitUrl(`${id}-disabled`)}')` : '';
  return `<button type="button" class="kit-button ${variant === 'round' ? 'kit-round' : 'kit-slice'} kit-button-${variant} ${className}" data-kit="${id}" data-ui-focus style="${imageStyle}${stateStyle}"${disabled ? ' disabled' : ''}${attributes(attrs)}>${content || `<span>${escapeHtml(label)}</span>`}</button>`;
}
export function kitTitle(label, attrs = {}) {
  return `<h2 class="kit-slice kit-title" data-kit="banner-title" style="${sliceStyle('banner-title')}"${attributes(attrs)}>${escapeHtml(label)}</h2>`;
}
export function kitChip(label, value, icon = '') {
  return `<span class="kit-slice kit-chip" style="${sliceStyle('chip-frame')}">${icon}<span>${escapeHtml(label)}<b class="font-numbers" dir="ltr" data-no-translate>${escapeHtml(value)}</b></span></span>`;
}
export function kitSelect(control, value, translate = value => value) {
  return `<select class="kit-select kit-slice" style="${sliceStyle('select-frame')}" id="${escapeHtml(control.id)}" data-ui-focus>${control.options.map(([key,label])=>`<option value="${escapeHtml(key)}"${String(key)===String(value)?' selected':''}>${escapeHtml(translate(label))}</option>`).join('')}</select>`;
}
export function kitSlider(id, value) {
  return `<span class="kit-slider" style="--slider-track:url('${kitUrl('slider-track')}');--slider-fill:url('${kitUrl('slider-fill')}');--slider-knob:url('${kitUrl('slider-knob')}');--fill:${Math.round(value*100)}%"><input type="range" id="${escapeHtml(id)}" min="0" max="1" step=".01" value="${value}" data-ui-focus></span>`;
}
export function kitTab(label, id, selected, prefix = 'tab') {
  return `<button type="button" class="kit-slice kit-tab" data-ui-focus data-${prefix}="${escapeHtml(id)}" role="tab" aria-selected="${selected}" style="${sliceStyle(selected?'tab-active':'tab-inactive')}">${escapeHtml(label)}</button>`;
}
export const kitDivider = () => `<img class="kit-divider" src="${kitUrl('divider-ornament')}" alt="" aria-hidden="true">`;
export function kitTorch(className = '') {
  return `<span class="kit-torch ${className}" aria-hidden="true">${[0, 1, 2, 3].map(i => `<img src="${kitUrl(`torch-${i}`)}" alt="" style="--frame:${i}">`).join('')}</span>`;
}
export function kitVines() {
  return ['tl', 'tr', 'bl', 'br'].map(corner => `<img class="kit-vine kit-vine-${corner}" src="${kitUrl('vine-corner-tl')}" alt="" aria-hidden="true">`).join('');
}
export const kitDecor = () => `<div class="kit-decor" aria-hidden="true">${kitVines()}${kitTorch('kit-torch-left')}${kitTorch('kit-torch-right')}</div>`;
