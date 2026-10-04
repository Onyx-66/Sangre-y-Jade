import { t } from '../i18n/index.js';
import { escapeHtml } from '../systems/PassiveState.js';

// A switch owns its fixed-size track, knob and state word. Row direction never
// changes the track's physical left/right geometry.
export function settingsToggle(key, label, value) {
 const id=`setting-${key}`,on=Boolean(value);
 return `<div class="settings-row" data-setting-row="${escapeHtml(key)}"><label id="${id}-label" for="${id}">${escapeHtml(t(label))}</label><button type="button" class="settings-toggle" id="${id}" data-toggle="${escapeHtml(key)}" data-state="${on?'on':'off'}" role="switch" aria-checked="${on}" aria-labelledby="${id}-label ${id}-state"><span class="toggle-track" aria-hidden="true"><span class="toggle-symbol">${on?'✓':'×'}</span><span class="toggle-knob"></span></span><span class="toggle-word" dir="auto" id="${id}-state">${escapeHtml(t(on?'On':'Off'))}</span></button></div>`;
}

export function updateSettingsToggle(button,value) {
 const on=Boolean(value);
 button.dataset.state=on?'on':'off';
 button.setAttribute('aria-checked',String(on));
 button.querySelector('.toggle-symbol').textContent=on?'✓':'×';
 button.querySelector('.toggle-word').textContent=t(on?'On':'Off');
}

export function bindSettingsToggle(button,readValue,onChange) {
 button.addEventListener('click',()=>{
  const value=!Boolean(readValue());onChange(value);updateSettingsToggle(button,value);
 });
 // Phaser captures Space for Dash. Keep the switch's keyboard activation even
 // while those game bindings exist; cancelling default avoids a second click.
 button.addEventListener('keydown',event=>{
  if(event.key===' '){event.preventDefault();button.click();}
 });
}
