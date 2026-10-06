import { heroList } from '../data/heroes.js';
import { MAPS,RUN_MODES } from '../data/world.js';
import { portraitMarkup } from '../art/uiArt.js';
import { t } from '../i18n/index.js';
import { selectionMarkup, selectionBackground } from '../ui/MenuScreens.js';
export function renderRunSetup(app){
 app.currentPage='showRunSetup';const step=Math.max(0,Math.min(3,app.setupStep||0));app.setupStep=step;
 const titles=['Choose Your Hero','Choose a Map','Game Mode','Ready to Play'];
 const subtitles=['Start with 3 active skills and 1 passive. More slots unlock at levels 10 and 20.','Choose where you will fight.','Choose how long you want to survive.','Choose your attack controls, then start your run.'];
 let content='';
 if(step===2)content=`<div class="card-grid wizard-modes">${RUN_MODES.map(mode=>`<button class="choice-card ${mode.id===app.lastSelection.modeId?'selected':''}" data-mode="${mode.id}"><span class="mode-time">${mode.duration/60}<small>min</small></span><h3>${mode.name}</h3><p>${mode.description}</p></button>`).join('')}</div>`;
 if(step===3){const hero=heroList().find(h=>h.id===app.lastSelection.heroId),map=MAPS.find(m=>m.id===app.lastSelection.mapId),mode=RUN_MODES.find(m=>m.id===app.lastSelection.modeId);content=`<div class="run-summary">${portraitMarkup(hero.id)}<h3>${hero.name}</h3><p>${t(map.name)}<br>${t(mode.name)}</p></div><div class="run-controls"><label for="run-attack">Attack mode</label><select id="run-attack"><option value="auto" ${app.save.data.settings.attackMode!=='manual'?'selected':''}>Auto-attack</option><option value="manual" ${app.save.data.settings.attackMode==='manual'?'selected':''}>Manual attack</option></select></div><p class="wizard-hint">Hold F, left mouse button, or Attack to fire.</p><p class="wizard-hint">Ally unlocks at level 5</p>`;}
 const screen=step<2
  ? app.setScreen(selectionMarkup(step,app.lastSelection,heroList(),MAPS),'kit-screen selection-screen')
  : app.setScreen(`<section class="panel setup-panel wizard-panel" data-setup-step="${step}"><h2>${titles[step]}</h2><p class="panel-subtitle">${subtitles[step]}</p><div class="wizard-content">${content}</div><div class="panel-actions"><button class="btn ghost" data-back>Back</button>${step<3?'<button class="btn primary" data-next>Continue →</button>':'<button class="btn primary" data-start>Start Run</button>'}</div></section>`,'setup-screen');
 if(step<2)screen.style.setProperty('--kit-backdrop',`url('${selectionBackground(step)}')`);
 for(const [attribute,key]of [['hero','heroId'],['map','mapId'],['mode','modeId']])screen.querySelectorAll(`[data-${attribute}]`).forEach(button=>button.onclick=()=>{
  const fromFocus=document.activeElement===button,fromGamepad=screen.dataset.gamepadFocus;
  app.clickSound();app.lastSelection[key]=button.dataset[attribute];renderRunSetup(app);
  if(attribute==='hero')app.audio?.voice?.(`${button.dataset[attribute]}-select`);
  app.audio?.ui?.(attribute==='hero'?'hero-select':attribute==='map'?'map-select':'card-confirm');
  if(fromFocus){const nextScreen=app.uiRoot.firstElementChild;if(fromGamepad)nextScreen.dataset.gamepadFocus=fromGamepad;nextScreen.querySelector(`[data-${attribute}="${button.dataset[attribute]}"]`)?.focus();}
 });
 screen.querySelector('[data-back]').onclick=()=>{app.clickSound();if(step===0)app.showTitle();else{app.setupStep--;renderRunSetup(app);}};
 const next=screen.querySelector('[data-next]');if(next)next.onclick=()=>{app.clickSound();app.setupStep++;renderRunSetup(app);};
 const start=screen.querySelector('[data-start]');if(start)start.onclick=()=>{app.clickSound();app.startRun();};
 const attack=screen.querySelector('#run-attack');if(attack)attack.onchange=e=>app.save.setSetting('attackMode',e.target.value);
}
