import { emptyHudLayouts, migrateHudLayouts } from './HudLayout.js';
const SAVE_KEY = 'sangre-y-jade-v0.1';

const DEFAULT_SAVE = {
  version: 1,
  cacao: 0,
  totalRuns: 0,
  victories: 0,
  introSeen: false,
  selectedSkin: 'classic',
  unlockedMaps: ['overgrown', 'bloodmoon', 'cenote'],
  upgrades: { damage: 0, vitality: 0, speed: 0, fortune: 0 },
  records: {},
  hudLayouts: emptyHudLayouts(),
  settings: {
    language: 'en',
    attackMode: 'auto',
    master: 0.82,
    music: 0.58,
    sfx: 0.78,
    ui: 0.78,
    voiceEnabled: true,
    ambience: 0.65,
    voice: 0.85,
    fps: 60,
    particles: 'high',
    screenShake: true,
    damageNumbers: true,
    autoAim: true,
    joystick: 'fixed',
    reducedMotion: false,
    reduceEffects: false,
    enemyHealthBars: 'damaged',
    telegraphHighContrast: false,
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function mergeDefaults(stored) {
  const base = clone(DEFAULT_SAVE);
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    ...stored,
    upgrades: { ...base.upgrades, ...(stored.upgrades || {}) },
    records: { ...base.records, ...(stored.records || {}) },
    hudLayouts: migrateHudLayouts(stored.hudLayouts),
    settings: { ...base.settings, ...(stored.settings || {}) },
  };
}

export class SaveSystem {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      return mergeDefaults(JSON.parse(localStorage.getItem(SAVE_KEY)));
    } catch {
      return clone(DEFAULT_SAVE);
    }
  }

  commit() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // The game remains playable when storage is unavailable (private iframe, quota, etc.).
    }
    return this.data;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.commit();
  }

  setHudLayouts(layouts) {
    this.data.hudLayouts = migrateHudLayouts(layouts);
    this.commit();
    return this.data.hudLayouts;
  }

  markIntroSeen() {
    this.data.introSeen = true;
    this.commit();
  }

  upgradeCost(key) {
    const level = this.data.upgrades[key] || 0;
    return Math.round(45 * Math.pow(1.72, level));
  }

  buyUpgrade(key) {
    const current = this.data.upgrades[key] || 0;
    if (current >= 8) return false;
    const cost = this.upgradeCost(key);
    if (this.data.cacao < cost) return false;
    this.data.cacao -= cost;
    this.data.upgrades[key] = current + 1;
    this.commit();
    return true;
  }

  metaBonuses() {
    const u = this.data.upgrades;
    return {
      damage: 1 + u.damage * 0.035,
      hp: u.vitality * 7,
      speed: 1 + u.speed * 0.018,
      fortune: u.fortune * 0.04,
    };
  }

  recordRun(summary) {
    this.data.totalRuns += 1;
    this.data.cacao += Math.max(0, Math.floor(summary.cacao || 0));
    if (summary.victory) this.data.victories += 1;
    const key = `${summary.heroId}:${summary.mapId}:${summary.modeId}`;
    const old = this.data.records[key];
    if (!old || summary.survived > old.survived || summary.victory) {
      this.data.records[key] = {
        survived: Math.floor(summary.survived),
        victory: Boolean(summary.victory || old?.victory),
        kills: Math.max(summary.kills || 0, old?.kills || 0),
      };
    }
    this.commit();
  }

  reset() {
    this.data = clone(DEFAULT_SAVE);
    this.commit();
  }
}

export { DEFAULT_SAVE, SAVE_KEY };

