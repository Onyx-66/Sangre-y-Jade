import { t, languageMarkup } from '../i18n/index.js';
import { interfaceIcon } from '../art/interfaceIcons.js';
import { assetUrl, escapeHtml, kitButton, kitCard, kitDecor, kitDivider, kitTitle, kitUrl, sliceStyle } from './Kit.js';

export const STARTING_RULE = 'Start with 3 active skills and 1 passive. More slots unlock at levels 10 and 20.';
const descriptions = {
  balam: 'Armored melee fighter. Ground targets only.',
  ixchel: 'Ranged spells. Mana regenerates over time.',
  kukul: 'Fast hunter. Darts pierce multiple targets.',
};
const traits = [{ id: 'survivors-will', name: "Survivor's Will" }, { id: 'jade-bounty', name: 'Jade Bounty' }];
const text = value => escapeHtml(t(value));
export function mainMenuMarkup() {
  return `<div class="menu-layout">
    <img class="menu-title-logo" src="${assetUrl('assets/branding/logo-title.png')}" alt="Sangre y Jade" draggable="false">
    <nav class="menu-actions" aria-label="${text('Main Menu')}">
      ${kitButton(t('Play'), { variant: 'primary', className: 'menu-play', attrs: { 'data-action': 'play' } })}
      <div class="menu-secondary-grid">
        ${kitButton(t('Upgrades'), { attrs: { 'data-action': 'shrine' } })}
        ${kitButton(t('How to Play'), { attrs: { 'data-action': 'codex' } })}
        ${kitButton(t('Watch Intro'), { attrs: { 'data-action': 'prologue' } })}
        ${kitButton(t('Shop'), { attrs: { 'data-action': 'store' } })}
        ${kitButton('', { className: 'menu-settings', attrs: { 'data-action': 'settings' }, content: `${interfaceIcon('settings')}<span>${text('Settings')}</span>` })}
        <div class="menu-language-cell" style="${sliceStyle('button-secondary')};--kit-pressed:url('${kitUrl('button-secondary-pressed')}')">${languageMarkup({button:true})}</div>
      </div>
    </nav>
  </div><div class="version" data-no-translate>VERSION 0.5</div>`;
}
export function selectionMarkup(step, selection, heroes, maps) {
  const heroScreen = step === 0;
  const title = heroScreen ? 'Choose Your Hero' : 'Choose a Map';
  const subtitle = heroScreen ? STARTING_RULE : 'Choose where you will fight.';
  const cards = heroScreen ? heroes.map(hero => {
    const selected = hero.id === selection.heroId;
    const details = selected ? `<div class="hero-starting" aria-label="${text('Starting skills')}">
      <span class="hero-slot-rule" title="${text(STARTING_RULE)}">${text('3 active + 1 passive')}</span>
      <div class="hero-innates" aria-label="${text('Innate traits')}">${traits.map(trait => `<span data-hero-trait="${trait.id}"><img src="${assetUrl(`assets/pixel/skills/${trait.id}.png`)}" alt="">${text(trait.name)}</span>`).join('')}</div>
    </div>` : '';
    return kitCard(`<div class="hero-card-heading"><div class="hero-stage selection-art-frame"><img class="selection-portrait" src="${assetUrl(`assets/pixel/frames/hero-${hero.id}-0.png`)}" alt="" draggable="false"><span class="hero-pedestal" style="${sliceStyle('panel-small')}" aria-hidden="true"></span></div>
      <div class="hero-identity"><h3 class="kit-slice hero-nameplate" style="${sliceStyle('chip-frame')}">${text(hero.name)}</h3><span class="hero-class">${text(hero.epithet)}</span></div></div>
      <div class="selection-details"><p class="hero-description">${text(descriptions[hero.id] || hero.description)}</p>${details}</div>`, {
      selected, className: 'hero-selection-card', attrs: { 'data-hero': hero.id, 'aria-label': `${t(hero.name)}: ${t(hero.epithet)}` },
    });
  }).join('') : maps.map((map, i) => kitCard(`<img class="selection-map-art selection-art-frame" src="${assetUrl(`assets/pixel/story-${[0, 3, 2][i]}.webp`)}" alt="" draggable="false"><div class="selection-details"><h3 class="map-name">${text(map.name)}</h3>${kitDivider()}<p class="map-difficulty">${text(map.subtitle)}</p></div>`, {
    selected: map.id === selection.mapId, className: 'map-selection-card', attrs: { 'data-map': map.id, 'aria-label': `${t(map.name)}: ${t(map.subtitle)}` },
  })).join('');
  return `${kitDecor()}<section class="selection-page" data-setup-step="${step}">
    <header class="selection-header">${kitTitle(t(title))}<p class="selection-subtitle">${text(subtitle)}</p></header>
    <div class="selection-cards ${heroScreen ? 'hero-selection-grid' : 'map-selection-grid'}">${cards}</div>
    <footer class="selection-actions">${kitButton(t('Back'), { attrs: { 'data-back': '' } })}${kitButton(t('Continue →'), { variant: 'primary', attrs: { 'data-next': '' } })}</footer>
  </section>`;
}
export const selectionBackground = step => kitUrl(step === 0 ? 'bg-hero-select' : 'bg-map-select');
