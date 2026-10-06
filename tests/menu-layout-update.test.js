import test from 'node:test';
import assert from 'node:assert/strict';
import { upgradesMarkup, PERMANENT_UPGRADES } from '../src/ui/UpgradeScreen.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { mainMenuMarkup, selectionMarkup } from '../src/ui/MenuScreens.js';
import { setLanguage, t, languageMarkup, hasTranslation } from '../src/i18n/index.js';

test('all four permanent upgrades have unique images, details, ranks, progress and the original prices', () => {
  setLanguage('en');
  const save = new SaveSystem(); save.data.cacao = 1234; save.data.upgrades.damage = 3;
  const html = upgradesMarkup(save);
  assert.equal((html.match(/role="listitem"/g) || []).length, 4);
  assert.equal((html.match(/class="upgrade-image"/g) || []).length, 4);
  assert.equal((html.match(/<progress /g) || []).length, 4);
  for (const upgrade of PERMANENT_UPGRADES) {
    assert.ok(html.includes(`ui-shrine-${upgrade.id}.png`));
    assert.ok(html.includes(t(upgrade.effect)));
    assert.equal(save.upgradeCost(upgrade.id), Math.round(45 * 1.72 ** save.data.upgrades[upgrade.id]));
  }
  assert.ok(html.includes('3 / 8'));
  assert.match(html, /data-cacao-balance>1234/);
  assert.doesNotMatch(html, /<h2|panel-subtitle|Spend earned cacao/);
});

test('card purchases retain the existing cap, affordability, wallet and immediate rank updates', () => {
  const save = new SaveSystem(); save.data.cacao = 100;
  assert.equal(save.buyUpgrade('damage'), true);
  assert.equal(save.data.cacao, 55); assert.equal(save.data.upgrades.damage, 1);
  let html = upgradesMarkup(save);
  assert.match(html, /data-cacao-balance>55/); assert.ok(html.includes('1 / 8'));
  assert.match(html, /disabled data-buy="damage"/);
  assert.equal(save.buyUpgrade('damage'), false);
  save.data.upgrades.speed = 8; save.data.cacao = 10000;
  html = upgradesMarkup(save);
  assert.match(html, /disabled data-buy="speed"/); assert.equal(save.buyUpgrade('speed'), false);
  assert.equal(save.metaBonuses().speed, 1 + 8 * .018);
});

test('menu language is inline and upgrades have no menu wallet; ordinary selectors remain unchanged', () => {
  const html = mainMenuMarkup(1234);
  assert.equal((html.match(/data-language/g) || []).length, 1);
  assert.match(html, /menu-settings[\s\S]*menu-language-cell/);
  assert.doesNotMatch(html, /menu-cacao|data-cacao-balance|1234/);
  assert.doesNotMatch(languageMarkup(), /menu-language/);
});

test('cards keep top art and details in distinct regions without changing hero/map identities', () => {
  const selected = {heroId:'balam', mapId:'overgrown'};
  const heroes = [{id:'balam',name:'Balam',epithet:'Warrior'}];
  const maps = [{id:'overgrown',name:'The Overgrown Temple',subtitle:'Day · Normal'}];
  for (const step of [0,1]) {
    const html = selectionMarkup(step, selected, heroes, maps);
    assert.match(html, /selection-art-frame[\s\S]*selection-details/);
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /data-back/); assert.match(html, /data-next/);
  }
});

test('upgrade and language-button copy is localized in all three languages; numerals stay LTR', () => {
  for (const locale of ['en','fr','ar']) {
    setLanguage(locale); const html = upgradesMarkup(new SaveSystem());
    for (const key of ['Level','Cacao','Max','Language',...PERMANENT_UPGRADES.flatMap(u=>[u.name,u.effect])]) {
      assert.ok(hasTranslation(key, locale), `${locale}: ${key}`);
      if (locale !== 'en' && !(locale === 'fr' && key === 'Cacao')) assert.notEqual(t(key), key, `${locale}: ${key}`);
    }
    assert.match(html, /dir="ltr" data-no-translate data-upgrade-level/);
    assert.ok(mainMenuMarkup().includes(t('Language')));
  }
  setLanguage('en');
});
