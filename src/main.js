import Phaser from 'phaser';
import './style.css';
import { heroList } from './data/heroes.js';
import { MAPS, RUN_MODES, STORE_ITEMS } from './data/world.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { AudioDirector } from './systems/AudioDirector.js';
import { GameScene } from './scenes/GameScene.js';
import { runPrologue } from './systems/Prologue.js';
import { renderRunSetup } from './systems/RunSetup.js';
import { interfaceIcon } from './art/interfaceIcons.js';
import { portraitMarkup, artUrl, iconMarkup } from './art/uiArt.js';
import './pixel.css';
import './v04.css';
import './v05.css';
import './skills-hud.css';
import './v06.css';
import './ui/settings.css';
import { renderSettingsPanel } from './ui/SettingsPanel.js';
import { applySettingChange } from './systems/RuntimeSettings.js';
import { t, setLanguage, translateDOM, languageMarkup } from './i18n/index.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const base = import.meta.env.BASE_URL;

class SangreYJadeApp {
  constructor() {
    this.gameRoot = document.querySelector('#game-root');
    this.uiRoot = document.querySelector('#ui-root');
    this.save = new SaveSystem();
    setLanguage(this.save.data.settings.language);
    this.audio = new AudioDirector(this.save);
    this.game = null;
    this.lastSelection = { heroId: 'balam', mapId: 'overgrown', modeId: 'quick' };
    this.boundUnlock = () => this.audio.unlock();
    document.addEventListener('pointerdown', this.boundUnlock, { once: true });
    document.addEventListener('keydown', this.boundUnlock, { once: true });
    window.addEventListener('error', (event) => this.showFatal(event.error || event.message));
    window.addEventListener('unhandledrejection', (event) => this.showFatal(event.reason));
    document.documentElement.classList.toggle('reduce-motion',this.save.data.settings.reducedMotion);
    if(this.save.data.prologueRevision!==2) this.playPrologue(()=>this.showTitle());
    else this.showTitle();
    this.registerServiceWorker();
  }

  asset(path) {
    return `${base}${path}`;
  }

  clearGame() {
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.gameRoot.replaceChildren();
  }

  setScreen(html, className = '') {
    const menuArt=new URL(artUrl('title.webp'),document.baseURI).href;
    this.uiRoot.innerHTML = `<section class="screen ${className}" style="--menu-art:url('${menuArt}')">${html}</section>`;
    translateDOM(this.uiRoot.firstElementChild);
    this.addLanguageSelector(this.uiRoot.firstElementChild);
    return this.uiRoot.firstElementChild;
  }

  addLanguageSelector(screen){
    screen.querySelector('.language-switch')?.remove();
    screen.insertAdjacentHTML('beforeend',languageMarkup());
    screen.querySelector('[data-language]').addEventListener('change',event=>{
      this.save.setSetting('language',event.target.value);setLanguage(event.target.value);
      if(this.currentPage==='prologue')this.playPrologue(this.prologueNext);
      else this[this.currentPage||'showTitle']();
    });
  }

  clickSound() {
    this.audio.unlock();
    this.audio.sfx('click', .04);
  }

  showTitle() {
    this.currentPage='showTitle';
    this.clearGame();
    this.audio.music('menu');
    const screen = this.setScreen(`
      <div class="brand-lockup">
        <img class="brand-logo" src="${this.asset('assets/branding/logo-menu.png')}" alt="Sangre y Jade">
        <div class="eyebrow">Survive the night</div>
        <h1>Sangre <span>y Jade</span></h1>
        <p class="tagline">Fight the hordes. Upgrade your skills. Defeat the bosses.</p>
        <div class="menu-stack">
          <button class="btn primary" data-action="play">Play</button>
          <div class="menu-row">
            <button class="btn ghost" data-action="shrine">Upgrades <span class="currency">● ${this.save.data.cacao}</span></button>
            <button class="btn ghost" data-action="codex">How to Play</button>
          </div>
          <div class="menu-row">
            <button class="btn ghost small" data-action="prologue">Watch Intro</button>
            <button class="btn ghost small" data-action="store">Shop</button>
            <button class="btn ghost small icon-button" data-action="settings" aria-label="Settings" title="Settings">${interfaceIcon('settings')}</button>
          </div>
        </div>
      </div>
      <div class="version">VERSION 0.5</div>
    `, 'cinematic-bg');
    screen.style.backgroundImage = `url("${artUrl('title.webp')}")`;
    screen.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      this.clickSound();
      if (action === 'play') {
        this.setupStep=0;
        this.showRunSetup();
      } else if (action === 'prologue') this.playPrologue(() => this.showTitle());
      else if (action === 'shrine') this.showShrine();
      else if (action === 'codex') this.showCodex();
      else if (action === 'store') this.showStore();
      else if (action === 'settings') this.showSettings();
    });
  }

  playPrologue(onDone) {
    this.currentPage='prologue';this.prologueNext=onDone;
    return runPrologue(this,onDone);
  }

  showRunSetup() { renderRunSetup(this); }

  async startRun() {
    this.clearGame();
    await document.fonts.ready;
    this.uiRoot.replaceChildren();
    const hero = heroList().find((entry) => entry.id === this.lastSelection.heroId) || heroList()[0];
    const map = MAPS.find((entry) => entry.id === this.lastSelection.mapId) || MAPS[0];
    const mode = RUN_MODES.find((entry) => entry.id === this.lastSelection.modeId) || RUN_MODES[0];
    const scene = new GameScene({
      hero, map, mode,
      meta: this.save.metaBonuses(),
      settings: { ...this.save.data.settings },
      audio: this.audio,
      uiRoot: this.uiRoot,
      onSettingsChange: (key,value) => applySettingChange({save:this.save,audio:this.audio,scene},key,value),
      onEnd: (summary) => {
        if(summary.abandoned){this.save.recordRun(summary);this.showTitle();}
        else this.showSummary(summary);
      },
    });
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.gameRoot,
      width: 1280,
      height: 720,
      backgroundColor: map.colors.ground,
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      render: { powerPreference: 'high-performance', antialias: false, pixelArt: true },
      fps: { target: this.save.data.settings.fps, limit: this.save.data.settings.fps, forceSetTimeOut: this.save.data.settings.fps === 30 },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [scene],
      audio: { noAudio: true },
    });
  }

  showSummary(summary) {
    this.save.recordRun(summary);
    const title = summary.victory ? 'Victory!' : summary.abandoned ? 'Run Ended' : 'Game Over';
    const minutes = Math.floor(summary.survived / 60);
    const seconds = Math.floor(summary.survived % 60);
    this.uiRoot.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal">
          <h2>${title}</h2>
          <p class="panel-subtitle">${summary.victory ? t('{name} defeated the final boss!',{name:t(summary.heroName)}) : t('{name} earned {n} cacao.',{name:t(summary.heroName),n:summary.cacao})}</p>
          <div class="summary-stats">
            <div class="summary-stat"><strong>${minutes}:${String(seconds).padStart(2, '0')}</strong>survived</div>
            <div class="summary-stat"><strong>${summary.kills}</strong>Enemies defeated</div>
            <div class="summary-stat"><strong>${summary.level}</strong>level</div>
            <div class="summary-stat"><strong>● ${summary.cacao}</strong>cacao</div>
          </div>
          ${summary.gear.length ? `<p class="panel-subtitle">${t('Equipment:')} ${summary.gear.map((item) => `${item.icon} ${t(item.name)}`).join(' · ')}</p>` : ''}
          <div class="panel-actions"><button class="btn ghost" data-menu>Main Menu</button><button class="btn ghost" data-shrine>Upgrades</button><button class="btn primary" data-retry>Try Again</button></div>
        </section>
      </div>`;
    $('[data-menu]', this.uiRoot).addEventListener('click', () => { this.clickSound(); this.showTitle(); });
    $('[data-shrine]', this.uiRoot).addEventListener('click', () => { this.clickSound(); this.clearGame(); this.showShrine(); });
    $('[data-retry]', this.uiRoot).addEventListener('click', () => { this.clickSound(); this.startRun(); });
    translateDOM(this.uiRoot);
  }

  showShrine() {
    this.currentPage='showShrine';
    const upgrades = [
      { id: 'damage', name: 'Obsidian Edge', effect: '+3.5% starting damage per rank' },
      { id: 'vitality', name: 'Cacao & Herbs', effect: '+7 starting HP per rank' },
      { id: 'speed', name: 'Quetzal Step', effect: '+1.8% movement speed per rank' },
      { id: 'fortune', name: 'Merchant’s Favor', effect: '+4% cacao fortune per rank' },
    ];
    const render = () => {
      const screen = this.setScreen(`
        <section class="panel">
          <h2>Upgrades</h2><p class="panel-subtitle">Spend earned cacao on permanent upgrades.</p>
          <p class="currency" style="text-align:center;font-size:1.25rem">● ${this.save.data.cacao} cacao</p>
          <div class="shrine-grid">${upgrades.map((upgrade) => {
            const level = this.save.data.upgrades[upgrade.id];
            const cost = this.save.upgradeCost(upgrade.id);
            return `<article class="upgrade">${iconMarkup({id:`ui-shrine-${upgrade.id}`})}<div><b>${upgrade.name}</b><div>${upgrade.effect}</div><div class="level-pips">${'◆'.repeat(level)}${'◇'.repeat(8-level)}</div></div><button class="btn small" data-buy="${upgrade.id}" ${level >= 8 || this.save.data.cacao < cost ? 'disabled' : ''}>${level >= 8 ? 'Max' : `● ${cost}`}</button></article>`;
          }).join('')}</div>
          <div class="panel-actions"><button class="btn ghost" data-back>Return</button></div>
        </section>`);
      $$('[data-buy]', screen).forEach((button) => button.addEventListener('click', () => {
        if (this.save.buyUpgrade(button.dataset.buy)) { this.clickSound(); render(); }
      }));
      $('[data-back]', screen).addEventListener('click', () => { this.clickSound(); this.showTitle(); });
    };
    render();
  }

  showSettings() {
    this.currentPage='showSettings';
    const screen=this.setScreen('<section class="panel settings-panel"></section>');
    renderSettingsPanel($('.settings-panel',screen),this.save.data.settings,{
      onChange:(key,value)=>applySettingChange({save:this.save,audio:this.audio},key,value),
      onClose:()=>this.showTitle(),onSound:()=>this.clickSound(),
    });
  }

  showStore() {
    this.currentPage='showStore';
    const screen = this.setScreen(`
      <section class="panel"><h2>Shop</h2><p class="panel-subtitle">Cosmetics and downloadable extras. No paid stat boosts.</p>
        <div class="store-grid">${STORE_ITEMS.map((item) => `<article class="store-item"><span class="card-icon">${item.icon}</span><div><h3>${item.name}</h3><p>${item.description}</p><span class="tag">${item.price}</span></div><button class="btn small" data-preview="${item.id}">${item.price === 'Planned' ? 'Roadmap item' : 'Preview offering'}</button></article>`).join('')}</div>
        <div class="premium-note">Preview build: purchases are not enabled. Cosmetic items below are planned, not usable unlocks.</div>
        <div class="panel-actions"><button class="btn primary" data-back>Return</button></div>
      </section>`);
    $$('[data-preview]', screen).forEach((button) => button.addEventListener('click', () => {
      this.clickSound();
      button.textContent = 'Included in launch plan';
      translateDOM(screen);
      button.disabled = true;
    }));
    $('[data-back]', screen).addEventListener('click', () => { this.clickSound(); this.showTitle(); });
  }

  showCodex() {
    this.currentPage='showCodex';
    const entries = {
      world: ['The World','A fantasy adventure inspired by Maya cities, astronomy, trade, and mythology. The heroes and invasion are fictional.'],
      heroes: ['Heroes','Balam fights in melee. Ixchel uses mana-based magic. Kukul fires piercing darts. Each hero has 20 skills; equip up to three per run.'],
      ritual: ['Combat','Choose auto-attack or manual attack in Settings. Move to avoid enemies, collect XP, and pick upgrades. At level 5, a permanent AI ally joins you and tougher enemies enter the waves. Melee heroes face ground enemies and ground-based bosses.'],
      economy: ['Currency & Upgrades','Cacao is earned during runs and kept after defeat. Spend it on permanent upgrades. Break pots and baskets to find extra supplies.'],
      equipment: ['Equipment','Mini-bosses drop equipment and offer skill upgrades. Equipment lasts for the current run; permanent upgrades are bought in the main menu.'],
      accessibility: ['Accessibility','Touch and keyboard controls are supported. Aim assist, manual attacks, reduced effects, a 30 FPS mode, and separate audio sliders are available in Settings.'],
    };
    const tabs = Object.keys(entries);
    const screen = this.setScreen(`
      <section class="panel"><h2>How to Play</h2><p class="panel-subtitle">Controls, progression, and world background.</p>
        <div class="codex-layout"><nav class="codex-tabs">${tabs.map((id, i) => `<button class="btn small ${i ? 'ghost' : ''}" data-tab="${id}">${entries[id][0]}</button>`).join('')}</nav><article class="codex-content"><h3></h3><p></p></article></div>
        <div class="panel-actions"><button class="btn ghost" data-prologue>Watch Intro</button><button class="btn primary" data-back>Return</button></div>
      </section>`);
    const select = (id) => {
      $('.codex-content h3', screen).textContent = entries[id][0];
      $('.codex-content p', screen).textContent = entries[id][1];
      translateDOM($('.codex-content',screen));
      $$('[data-tab]', screen).forEach((button) => button.classList.toggle('ghost', button.dataset.tab !== id));
    };
    $$('[data-tab]', screen).forEach((button) => button.addEventListener('click', () => { this.clickSound(); select(button.dataset.tab); }));
    $('[data-prologue]', screen).addEventListener('click', () => { this.clickSound(); this.playPrologue(() => this.showCodex()); });
    $('[data-back]', screen).addEventListener('click', () => { this.clickSound(); this.showTitle(); });
    select('world');
  }

  showFatal(error) {
    if (!error || this.uiRoot.querySelector('[data-fatal]')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.dataset.fatal = 'true';
    overlay.innerHTML = `<section class="modal"><h2>Something went wrong</h2><p class="panel-subtitle">A technical error interrupted the game. Your cacao and shrine progress are safe.</p><pre style="white-space:pre-wrap;color:#ffb1b1;background:#160d0f;padding:12px;border-radius:7px">${String(error?.message || error).slice(0, 600)}</pre><div class="panel-actions"><button class="btn primary">Main Menu</button></div></section>`;
    overlay.querySelector('button').addEventListener('click', () => this.showTitle());
    this.uiRoot.append(overlay);
    translateDOM(overlay);
  }

  registerServiceWorker() {
    if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname !== 'appassets.androidplatform.net') {
      window.addEventListener('load', () => navigator.serviceWorker.register(`${base}sw.js`).catch(() => {}));
    }
  }
}

const app = new SangreYJadeApp();
// The existing native Android Back/audio bridge also needs this in packaged builds.
// Ordinary web releases still expose it only in the explicit FX diagnostic mode.
if (import.meta.env.DEV || location.hostname === 'appassets.androidplatform.net' || new URLSearchParams(location.search).get('fxdebug') === '1') window.__SANGRE_Y_JADE__ = app;

