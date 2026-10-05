import { t, getLanguage } from '../i18n/index.js';
import { escapeHtml } from '../systems/PassiveState.js';
import { settingsToggle, bindSettingsToggle } from './SettingsToggle.js';

export const CONTROLS_TEXT='Move with WASD/arrow keys or the left joystick. Cast with Q/E/R/T. Dash with Space. In manual mode, hold F, click the arena, or hold Attack. Esc pauses.';
export const SETTINGS_CONTROLS=[
 {key:'attackMode',id:'attack-mode',label:'Attack mode',options:[['auto','Auto-attack'],['manual','Manual attack']]},
 {key:'master',id:'master',label:'Master volume',type:'range'},
 {key:'music',id:'music',label:'Music volume',type:'range'},
 {key:'sfx',id:'sfx',label:'Sound effects',type:'range'},
 {key:'fps',id:'fps',label:'Frame-rate cap',options:[[60,'60 FPS'],[30,'30 FPS · Battery saver']]},
 {key:'particles',id:'particles',label:'Effect density',options:[['high','High'],['low','Low']]},
 {key:'autoAim',id:'aim',label:'Aim mode',options:[['auto','Auto-aim nearest target'],['direction','Aim in movement direction']]},
 {key:'screenShake',label:'Screen shake',type:'toggle'},
 {key:'damageNumbers',label:'Damage numbers',type:'toggle'},
 {key:'reducedMotion',label:'Reduced motion',type:'toggle'},
 {key:'enemyHealthBars',id:'enemy-health-bars',label:'Enemy health bars',options:[['always','Always'],['damaged','When damaged'],['off','Off']]},
 {key:'telegraphHighContrast',label:'High-contrast telegraphs',type:'toggle'},
];

export const controlsMarkup=()=>`<div class="premium-note"><b>${escapeHtml(t('Controls:'))}</b> ${escapeHtml(t(CONTROLS_TEXT))}</div>`;

export function settingsPanelMarkup(settings,closeLabel='Done') {
 const rows=SETTINGS_CONTROLS.map(control=>{
  const {key,id,label,type,options}=control;
  if(type==='toggle')return settingsToggle(key,label,settings[key]);
  const value=key==='autoAim'?(settings[key]?'auto':'direction'):settings[key];
  const input=type==='range'?`<input id="${id}" type="range" min="0" max="1" step=".01" value="${value}">`
   :`<select id="${id}">${options.map(([v,text])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${escapeHtml(t(text))}</option>`).join('')}</select>`;
  return `<div class="settings-row" data-setting-row="${key}"><label for="${id}">${escapeHtml(t(label))}</label>${input}</div>`;
 }).join('');
 return `<h2 id="settings-title">${escapeHtml(t('Settings'))}</h2><p class="panel-subtitle">${escapeHtml(t('Optimized for both touch and keyboard. Changes save immediately.'))}</p><div class="settings-content"><div class="settings-grid">${rows}</div>${controlsMarkup()}</div><div class="panel-actions"><button type="button" class="btn primary" data-back>${escapeHtml(t(closeLabel))}</button></div>`;
}

// Both entry points use this renderer and these bindings, including persistence
// and live updates supplied by the same settings-change callback.
export function renderSettingsPanel(panel,settings,{onChange,onClose,onSound=()=>{},closeLabel='Done'}) {
 panel.classList.add('settings-panel');
 panel.dir=getLanguage()==='ar'?'rtl':'ltr';
 panel.innerHTML=settingsPanelMarkup(settings,closeLabel);
 for(const control of SETTINGS_CONTROLS){
  const {key,id,type}=control;
  if(type==='toggle'){
   const button=panel.querySelector(`[data-toggle="${key}"]`);
   bindSettingsToggle(button,()=>settings[key],value=>{onChange(key,value);onSound();});
  }else{
   panel.querySelector(`#${id}`).addEventListener(type==='range'?'input':'change',event=>{
    const value=key==='autoAim'?event.target.value==='auto':type==='range'||key==='fps'?Number(event.target.value):event.target.value;
    onChange(key,value);
   });
  }
 }
 panel.querySelector('[data-back]').addEventListener('click',()=>{onSound();onClose();});
 return panel;
}
