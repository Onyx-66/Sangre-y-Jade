// Enforce the single implemented mode and preserve the existing duration presets and localized labels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_MODES, DEFAULT_GAME_MODE_ID, getGameMode } from '../src/modes.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';
import { mainMenuMarkup, selectionMarkup } from '../src/ui/MenuScreens.js';
import { heroList } from '../src/data/heroes.js';
import { MAPS } from '../src/data/world.js';

test('only Training is registered and its 10/20-minute presets keep stable IDs and tuning', () => {
  assert.equal(DEFAULT_GAME_MODE_ID, 'training');
  assert.deepEqual(Object.keys(GAME_MODES), ['training']);
  assert.equal(getGameMode('future-mode'), GAME_MODES.training);
  assert.deepEqual(GAME_MODES.training.runModes.map(({ id, duration }) => [id, duration]), [
    ['quick', 600], ['full', 1200],
  ]);
});

test('Training is localized in menus, selection screens, run summary and pause context', () => {
  const keys = [
    'Training', 'Play · Training', 'Training · 10 min', 'Training · 20 min',
    '10-minute Training run. Bosses arrive every 2½ minutes.',
    '20-minute Training run. Bosses arrive every 5 minutes.',
    'Training · Heroes', 'Training · Maps',
    'Training · Start with 3 active skills and 1 passive. More slots unlock at levels 10 and 20.',
    'Training · Choose where you will fight.', 'Choose a Training duration.',
    'Choose your attack controls, then start your Training run.',
    'Training · The game is paused.',
    'Training: choose a 10- or 20-minute run, then choose auto-attack or manual attack in Settings. Move to avoid enemies, collect XP, and pick upgrades. At level 5, a permanent AI ally joins you and tougher enemies enter the waves. Melee heroes face ground enemies and ground-based bosses.',
  ];
  const expected = {
    en: { Training: 'Training', play: 'Play · Training', hero: 'Training · Heroes' },
    fr: { Training: 'Entrainement', play: 'Jouer · Entrainement', hero: 'Entrainement · Héros' },
    ar: { Training: 'تدريب', play: 'العب · تدريب', hero: 'تدريب · الأبطال' },
  };
  try {
    for (const locale of ['en', 'fr', 'ar']) {
      setLanguage(locale);
      for (const key of keys) {
        assert.equal(hasTranslation(key, locale), true, `${locale} dictionary is missing ${key}`);
        assert.ok(t(key).trim(), `${locale} translation is empty for ${key}`);
        if (locale !== 'en') assert.notEqual(t(key), key, `${locale} falls back to English for ${key}`);
      }
      assert.equal(t('Training'), expected[locale].Training);
      const menu = mainMenuMarkup();
      assert.equal((menu.match(/data-action="play"/g) || []).length, 1, `${locale} must expose only the implemented mode`);
      assert.ok(menu.includes(expected[locale].play), `${locale} Play label must name Training`);
      assert.ok(menu.includes('data-game-mode="training"'));
      const hero = selectionMarkup(0, { heroId: 'balam' }, heroList(), MAPS);
      const map = selectionMarkup(1, { heroId: 'balam', mapId: 'overgrown' }, heroList(), MAPS);
      assert.ok(hero.includes(expected[locale].hero), `${locale} hero title must name Training`);
      assert.ok(map.includes(t('Training · Maps')), `${locale} map title must name Training`);
      assert.ok(hero.includes(t(keys[8])), `${locale} hero subtitle must name Training`);
      assert.ok(map.includes(t(keys[9])), `${locale} map subtitle must name Training`);
      assert.equal(t('Training · The game is paused.'), locale === 'en'
        ? 'Training · The game is paused.'
        : locale === 'fr' ? 'Entrainement · La partie est en pause.' : 'تدريب · اللعبة متوقفة مؤقتًا.');
    }
  } finally {
    setLanguage('en');
  }
});
