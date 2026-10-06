import { t } from '../i18n/index.js';
import { interfaceIcon } from '../art/interfaceIcons.js';
import { assetUrl, escapeHtml, kitButton, kitPanel, sliceStyle } from './Kit.js';

// Presentation only: effects, prices and the eight-rank cap remain in SaveSystem.
export const PERMANENT_UPGRADES = [
  { id: 'damage', name: 'Obsidian Edge', effect: '+3.5% starting damage per rank' },
  { id: 'vitality', name: 'Cacao & Herbs', effect: '+7 starting HP per rank' },
  { id: 'speed', name: 'Quetzal Step', effect: '+1.8% movement speed per rank' },
  { id: 'fortune', name: 'Merchant’s Favor', effect: '+4% cacao fortune per rank' },
];
const text = value => escapeHtml(t(value));

export function upgradesMarkup(save) {
  const wallet = `<div class="kit-slice upgrade-wallet" style="${sliceStyle('chip-frame')}" aria-label="${escapeHtml(`${t('Cacao')}: ${save.data.cacao}`)}">${interfaceIcon('cacao')}<span>${text('Cacao')}</span><b class="font-numbers" dir="ltr" data-no-translate data-cacao-balance>${escapeHtml(save.data.cacao)}</b></div>`;
  const cards = PERMANENT_UPGRADES.map(upgrade => {
    const level = save.data.upgrades[upgrade.id] || 0, max = 8;
    const cost = save.upgradeCost(upgrade.id), complete = level >= max;
    return `<article class="kit-slice upgrade-card" role="listitem" data-upgrade="${upgrade.id}" style="${sliceStyle('card-normal')}">
      <img class="upgrade-image" src="${assetUrl(`assets/pixel/skills/ui-shrine-${upgrade.id}.png`)}" alt="" draggable="false">
      <div class="upgrade-details"><h3>${text(upgrade.name)}</h3><p>${text(upgrade.effect)}</p>
        <div class="upgrade-rank"><span>${text('Level')}</span><b class="font-numbers" dir="ltr" data-no-translate data-upgrade-level>${level} / ${max}</b></div>
        <progress class="upgrade-progress" value="${level}" max="${max}" aria-label="${escapeHtml(`${t(upgrade.name)}: ${t('Level')} ${level} / ${max}`)}"></progress>
      </div>
      ${kitButton('', {variant:'primary',className:'upgrade-buy',disabled:complete || save.data.cacao < cost,
        attrs:{'data-buy':upgrade.id,'aria-label':`${t(upgrade.name)}: ${complete?t('Max'):`${cost} ${t('Cacao')}`}`},
        content:complete?`<span>${text('Max')}</span>`:`${interfaceIcon('cacao')}<span class="font-numbers" dir="ltr" data-no-translate>${cost}</span>`})}
    </article>`;
  }).join('');
  return kitPanel(`<header class="upgrade-header">${wallet}</header><div class="permanent-upgrade-list" role="list" aria-label="${text('Upgrades')}">${cards}</div><footer class="upgrade-actions">${kitButton(t('Return'),{attrs:{'data-back':''}})}</footer>`,{className:'upgrade-panel','attrs':{'aria-label':t('Upgrades')}});
}
