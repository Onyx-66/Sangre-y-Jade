import { heroList } from '../data/heroes.js';
import { MAPS } from '../data/world.js';
import { getGameMode } from '../modes.js';
import { portraitMarkup } from '../art/uiArt.js';
import { t } from '../i18n/index.js';
import { selectionMarkup, selectionBackground } from '../ui/MenuScreens.js';
export function renderRunSetup(app){
 app.currentPage='showRunSetup';const step=Math.max(0,Math.min(3,app.setupStep||0));app.setupStep=step;
 const gameMode=getGameMode(app.lastSelection.gameModeId);
 app.lastSelection.gameModeId=gameMode.id;
 const runModes=gameMode.runModes;
 if(!runModes.some(mode=>mode.id===app.lastSelection.modeId))app.lastSelection.modeId=runModes[0].id;
 const titles=['','',gameMode.name,'Ready to Play'];
 const subtitles=['Training · Start with 3 active skills and 1 passive. More slots unlock at levels 10 and 20.','Training · Choose where you will fight.','Choose a Training duration.','Choose your attack controls, then start your Training run.'];
 let content='';
 if(step===2)content=`<div class="card-grid wizard-modes">${runModes.map(mode=>`<button class="choice-card ${mode.id===app.lastSelection.modeId?'selected':''}" data-mode="${mode.id}" title="${t(gameMode.name)}"><span class="mode-time">${mode.duration/60}<small>${t('min')}</small></span><h3>${t(mode.name)}</h3><p>${t(mode.description)}</p></button>`).join('')}</div>`;
 if(step===3){const hero=heroList().find(h=>h.id===app.lastSelection.heroId),map=MAPS.find(m=>m.id===app.lastSelection.mapId),mode=runModes.find(m=>m.id===app.lastSelection.modeId);content=`<div class="run-summary"><span class="run-mode-label">${t(gameMode.name)}</span>${portraitMarkup(hero.id)}<h3>${t(hero.name)}</h3><p>${t(map.name)}<br>${t(mode.name)}</p></div><div class="run-controls"><label for="run-attack">${t('Attack mode')}</label><select id="run-attack"><option value="auto" ${app.save.data.settings.attackMode!=='manual'?'selected':''}>${t('Auto-attack')}</option><option value="manual" ${app.save.data.settings.attackMode==='manual'?'selected':''}>${t('Manual attack')}</option></select></div><p class="wizard-hint">${t('Hold F, left mouse button, or Attack to fire.')}</p><p class="wizard-hint">${t('Ally unlocks at level 5')}</p>`;}
 const screen=step<2
  ? app.setScreen(selectionMarkup(step,app.lastSelection,heroList(),MAPS),'kit-screen selection-screen')
  : app.setScreen(`<section class="panel setup-panel wizard-panel" data-setup-step="${step}"><h2>${t(titles[step])}</h2><p class="panel-subtitle">${t(subtitles[step])}</p><div class="wizard-content">${content}</div><div class="panel-actions"><button class="btn ghost" data-back>${t('Back')}</button>${step<3?`<button class="btn primary" data-next>${t('Continue')} →</button>`:`<button class="btn primary" data-start>${t('Start Run')}</button>`}</div></section>`,'setup-screen');
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
