import { t, getLanguage } from '../i18n/index.js';
import { escapeHtml } from '../systems/PassiveState.js';
import { settingsToggle, bindSettingsToggle } from './SettingsToggle.js';
import { audioText } from '../i18n/audio-v06.js';
const audioLabel=key=>audioText(key,getLanguage(),t);

export const CONTROLS_TEXT='Move with WASD/arrow keys or the left joystick. Cast with Q/E/R/T. Dash with Space. In manual mode, hold F, click the arena, or hold Attack. Esc pauses.';
export const SETTINGS_CONTROLS=[
 {key:'attackMode',id:'attack-mode',label:'Attack mode',options:[['auto','Auto-attack'],['manual','Manual attack']]},
 {key:'master',id:'master',label:'Master volume',type:'range'},
 {key:'music',id:'music',label:'Music volume',type:'range'},
 {key:'sfx',id:'sfx',label:'Sound effects',type:'range'},
 {key:'ambience',id:'ambience',label:'Ambience volume',type:'range'},
 {key:'voice',id:'voice',label:'Voice volume',type:'range'},
 {key:'ui',id:'ui-volume',label:'UI volume',type:'range'},
 {key:'voiceEnabled',label:'Enable voice',type:'toggle'},
 {key:'fps',id:'fps',label:'Frame-rate cap',options:[[60,'60 FPS'],[30,'30 FPS · Battery saver']]},
 {key:'particles',id:'particles',label:'Effect density',options:[['high','High'],['medium','Medium'],['low','Low']]},
 {key:'autoAim',id:'aim',label:'Aim mode',options:[['auto','Auto-aim nearest target'],['direction','Aim in movement direction']]},
 {key:'screenShake',label:'Screen shake',type:'toggle'},
 {key:'damageNumbers',label:'Damage numbers',type:'toggle'},
 {key:'reducedMotion',label:'Reduced motion',type:'toggle'},
 {key:'reduceEffects',label:'Reduce effects',type:'toggle'},
 {key:'enemyHealthBars',id:'enemy-health-bars',label:'Enemy health bars',options:[['always','Always'],['damaged','When damaged'],['off','Off']]},
 {key:'telegraphHighContrast',label:'High-contrast telegraphs',type:'toggle'},
];

export const controlsMarkup=()=>`<div class="premium-note"><b>${escapeHtml(t('Controls:'))}</b> ${escapeHtml(t(CONTROLS_TEXT))}</div>`;

export function settingsPanelMarkup(settings,closeLabel='Done') {
 const rows=SETTINGS_CONTROLS.map(control=>{
  const {key,id,label,type,options}=control;
  if(type==='toggle')return settingsToggle(key,audioLabel(label),settings[key]??true);
  const value=key==='autoAim'?(settings[key]?'auto':'direction'):(settings[key]??({ambience:.65,voice:.85,ui:.78}[key]));
  const input=type==='range'?`<input id="${id}" type="range" min="0" max="1" step=".01" value="${value}">`
   :`<select id="${id}">${options.map(([v,text])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${escapeHtml(t(text))}</option>`).join('')}</select>`;
  return `<div class="settings-row" data-setting-row="${key}"><label for="${id}">${escapeHtml(audioLabel(label))}</label>${input}</div>`;
 }).join('');
 return `<h2 id="settings-title">${escapeHtml(t('Settings'))}</h2><p class="panel-subtitle">${escapeHtml(t('Optimized for both touch and keyboard. Changes save immediately.'))}</p><div class="settings-content"><nav class="settings-hud-tabs" aria-label="${escapeHtml(t('Settings'))}"><button type="button" class="btn small" data-settings-tab="general" aria-pressed="true">${escapeHtml(t('Settings'))}</button><button type="button" class="btn ghost small" data-settings-tab="hud" aria-pressed="false">${escapeHtml(t('HUD'))}</button></nav><div data-settings-page="general"><div class="settings-grid">${rows}</div>${controlsMarkup()}</div><div data-settings-page="hud" hidden><button type="button" class="btn primary hud-settings-entry" data-edit-hud>${escapeHtml(t('Edit HUD layout'))}</button></div></div><div class="panel-actions"><button type="button" class="btn primary" data-back>${escapeHtml(t(closeLabel))}</button></div>`;
}

// Both entry points use this renderer and these bindings, including persistence
// and live updates supplied by the same settings-change callback.
export function renderSettingsPanel(panel,settings,{onChange,onClose,onSound=()=>{},onHudEdit,closeLabel='Done',tab='general'}) {
 panel.classList.add('settings-panel');
 panel.dir=getLanguage()==='ar'?'rtl':'ltr';
 panel.innerHTML=settingsPanelMarkup(settings,closeLabel);
 const content=panel.querySelector('.settings-content');let tabs=panel.querySelector('.settings-hud-tabs');
 // Older save/menu integrations may not provide the HUD tab yet.
 if(!tabs){const general=document.createElement('div');general.dataset.settingsPage='general';while(content.firstChild)general.append(content.firstChild);content.append(general);tabs=document.createElement('nav');tabs.className='settings-hud-tabs';tabs.innerHTML=`<button type="button" class="btn small" data-settings-tab="general" aria-pressed="true">${escapeHtml(t('Settings'))}</button>`;content.prepend(tabs);tabs.addEventListener('click',event=>{const tab=event.target.closest('[data-settings-tab]');if(tab){for(const page of content.querySelectorAll('[data-settings-page]'))page.hidden=page.dataset.settingsPage!==tab.dataset.settingsTab;for(const button of tabs.children)button.setAttribute('aria-pressed',String(button===tab));}});}
 tabs.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost small" data-settings-tab="audio" aria-pressed="false">${escapeHtml(audioLabel('Audio'))}</button>`);
 const audioPage=document.createElement('div');audioPage.dataset.settingsPage='audio';audioPage.hidden=true;audioPage.className='settings-grid';content.append(audioPage);
 for(const key of ['master','music','sfx','ambience','voice','ui','voiceEnabled']){const row=panel.querySelector(`[data-setting-row="${key}"]`)||panel.querySelector(`[data-toggle="${key}"]`)?.closest('.settings-row');if(row)audioPage.append(row);}
 const selectTab=value=>{
  panel.querySelectorAll('[data-settings-page]').forEach(el=>el.hidden=el.dataset.settingsPage!==value);
  panel.querySelectorAll('[data-settings-tab]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.settingsTab===value));el.classList.toggle('ghost',el.dataset.settingsTab!==value);});
 };
 panel.querySelectorAll('[data-settings-tab]').forEach(el=>el.onclick=()=>{onSound();selectTab(el.dataset.settingsTab);});
 const editor=panel.querySelector('[data-edit-hud]');editor.disabled=!onHudEdit;editor.onclick=()=>{onSound();onHudEdit?.();};
 selectTab(tab);
 for(const control of SETTINGS_CONTROLS){
  const {key,id,type}=control;
  if(type==='toggle'){
   const button=panel.querySelector(`[data-toggle="${key}"]`);
   bindSettingsToggle(button,()=>settings[key]??true,value=>{onChange(key,value);onSound(value?'toggle-on':'toggle-off');});
  }else{
   panel.querySelector(`#${id}`).addEventListener(type==='range'?'input':'change',event=>{
    const value=key==='autoAim'?event.target.value==='auto':type==='range'||key==='fps'?Number(event.target.value):event.target.value;
    onChange(key,value);
    onSound(type==='range'?'slider-tick':'button-secondary');
   });
  }
 }
 panel.querySelector('[data-back]').addEventListener('click',()=>{onSound('panel-close');onClose();});
 return panel;
}
