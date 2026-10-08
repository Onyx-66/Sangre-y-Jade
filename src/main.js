import Phaser from 'phaser';
import './style.css';
import { heroList } from './data/heroes.js';
import { MAPS, STORE_ITEMS } from './data/world.js';
import { DEFAULT_GAME_MODE_ID, getGameMode } from './modes.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { nativeStartupOptions } from './systems/NativeStartup.js';
import { AudioDirector } from './systems/AudioDirector.js';
import { GameScene } from './scenes/GameScene.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { RunLoadProgress } from './systems/RunLoadProgress.js';
import { SkillAudio } from './systems/SkillAudio.js';
import './ui/loading.css';
import { runPrologue } from './systems/Prologue.js';
import { renderRunSetup } from './systems/RunSetup.js';
import { interfaceIcon } from './art/interfaceIcons.js';
import { portraitMarkup, artUrl } from './art/uiArt.js';
import './pixel.css';
import './v04.css';
import './v05.css';
import './skills-hud.css';
import './v06.css';
import './ui/settings.css';
import './viewport.css';
import './ui/tokens.css';
import './fonts-v06.css';
import './ui/typography.css';
import { version as APP_VERSION } from '../package.json';
import './ui/kit.css';
import { mainMenuMarkup } from './ui/MenuScreens.js';
import { upgradesMarkup } from './ui/UpgradeScreen.js';
import { kitUrl } from './ui/Kit.js';
import './ui/menu-update.css';
import { bindKitNavigation } from './ui/KitNavigation.js';
import './hud-layout.css';
import './ui/world-seed.css';
import { initialSeed,seedMarkup,bindSeed } from './ui/WorldSeed.js';
import { Hud } from './systems/Hud.js';
import { waitForGameFonts } from './ui/Typography.js';
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
    this.nativeStartup = nativeStartupOptions(window.location);
    setLanguage(this.save.data.settings.language);
    this.audio = new AudioDirector(this.save);
    this.game = null;
    this.lastSelection = { heroId: 'balam', mapId: 'overgrown', modeId: 'quick', gameModeId: DEFAULT_GAME_MODE_ID };
    this.boundUnlock = () => this.audio.unlock();
    document.addEventListener('pointerdown', this.boundUnlock, { once: true });
    document.addEventListener('keydown', this.boundUnlock, { once: true });
    window.addEventListener('error', (event) => this.showFatal(event.error || event.message));
    window.addEventListener('unhandledrejection', (event) => this.showFatal(event.reason));
    document.documentElement.classList.toggle('reduce-motion',this.save.data.settings.reducedMotion);
    if(this.save.data.prologueRevision!==2&&!this.nativeStartup.recovering) this.playPrologue(()=>this.showTitle());
    else this.showTitle();
    this.registerServiceWorker();
  }

  asset(path) {
    return `${base}${path}`;
  }

  clearGame() {
    if(this.loadingSession){const session=this.loadingSession;this.loadingSession=null;this.cancelLoading=null;session.controller.abort();session.screen.destroy();session.skillAudio.destroy();session.resolve(false);}
    this.screenCleanup?.();
    this.screenCleanup = null;
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    this.gameRoot.replaceChildren();
  }

  setScreen(html, className = '') {
    this.audio.ui?.('panel-open');
    this.screenCleanup?.();
    this.screenCleanup = null;
    const menuArt=new URL(artUrl('title.webp'),document.baseURI).href;
    this.uiRoot.innerHTML = `<section class="screen ${className}" style="--menu-art:url('${menuArt}')">${html}</section>`;
    const versionLabel=this.uiRoot.querySelector('.version');
    if(versionLabel){versionLabel.textContent=`VERSION ${APP_VERSION}`;versionLabel.dataset.noTranslate='';}
    translateDOM(this.uiRoot.firstElementChild);
    this.addLanguageSelector(this.uiRoot.firstElementChild);
    if(this.uiRoot.firstElementChild.classList.contains('kit-screen'))this.screenCleanup=bindKitNavigation(this.uiRoot.firstElementChild);
    return this.uiRoot.firstElementChild;
  }

  addLanguageSelector(screen){
    if(!screen.querySelector('.language-switch'))screen.insertAdjacentHTML('beforeend',languageMarkup());
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
    const screen = this.setScreen(mainMenuMarkup(), 'kit-screen menu-screen');
    screen.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      this.clickSound();
      if (action === 'play') {
        this.lastSelection.gameModeId = getGameMode(event.target.closest('[data-game-mode]')?.dataset.gameMode || DEFAULT_GAME_MODE_ID).id;
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
    this.screenCleanup?.();
    this.screenCleanup = null;
    this.currentPage='prologue';this.prologueNext=onDone;
    return runPrologue(this,onDone);
  }

  showRunSetup() { renderRunSetup(this); }

  async startRun() {
    this.clearGame();
    const hero = heroList().find((entry) => entry.id === this.lastSelection.heroId) || heroList()[0];
    const map = MAPS.find((entry) => entry.id === this.lastSelection.mapId) || MAPS[0];
    const gameMode = getGameMode(this.lastSelection.gameModeId);
    const mode = gameMode.runModes.find((entry) => entry.id === this.lastSelection.modeId) || gameMode.runModes[0];
    const controller=new AbortController(),screen=new LoadingScreen({hero,map,reduceMotion:this.save.data.settings.reducedMotion,signal:controller.signal});
    let resolve;const ready=new Promise(done=>resolve=done);
    const seed=initialSeed(this.lastSelection);
    const session={controller,screen,resolve,started:performance.now(),hero,map,seed,audio:this.audio,audioKeys:map.audioKeys,skillAudio:new SkillAudio(this.audio),signal:controller.signal,
      prepareWorld:(scene,progress,signal)=>scene.prepareMapWorld(progress,signal)};
    session.progress=new RunLoadProgress(state=>screen.update(state));
    session.complete=scene=>{
      if(this.loadingSession!==session||controller.signal.aborted)return;
      this.loadingSession=null;this.cancelLoading=null;scene.loadingRun=false;scene.options.loading=null;
      if(!scene.pausedForChoice){scene.time.paused=false;scene.physics.resume();}
      this.audio.music(map.music);this.audio.ui?.('world-ready');screen.destroy();resolve(this.game);
    };
    session.failed=error=>{if(error.name!=='AbortError'&&this.loadingSession===session){this.clearGame();this.showFatal(error);}};
    this.loadingSession=session;this.cancelLoading=()=>{this.clearGame();this.showTitle();};
    try{await waitForGameFonts();}catch(error){session.failed(error);return false;}
    if(controller.signal.aborted)return false;
    this.uiRoot.replaceChildren();
    const scene = new GameScene({
      hero, map, mode, gameMode,
      meta: this.save.metaBonuses(),
      settings: { ...this.save.data.settings },
      hudLayouts: this.save.data.hudLayouts,
      audio: this.audio,
      loading: session,
      uiRoot: this.uiRoot,
      onSettingsChange: (key,value) => applySettingChange({save:this.save,audio:this.audio,scene},key,value),
      onHudLayoutChange: layouts=>this.save.setHudLayouts(layouts),
      onEnd: (summary) => {
        if(summary.abandoned){this.save.recordRun(summary);this.showTitle();}
        else this.showSummary(summary);
      },
    });
    this.game = new Phaser.Game({
      type: this.nativeStartup.canvas ? Phaser.CANVAS : Phaser.AUTO,
      parent: this.gameRoot,
      width: this.gameRoot.clientWidth,
      height: this.gameRoot.clientHeight,
      backgroundColor: map.colors.ground,
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      render: { powerPreference: 'high-performance', antialias: false, pixelArt: true },
      fps: { target: this.save.data.settings.fps, limit: this.save.data.settings.fps, forceSetTimeOut: this.save.data.settings.fps === 30 },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [new LoadingScene(session),scene],
      audio: { noAudio: true },
    });
    return ready;
  }

  showSummary(summary) {
    this.save.recordRun(summary);
    const gameMode = getGameMode(this.lastSelection.gameModeId);
    const title = summary.victory ? 'Victory!' : summary.abandoned ? 'Run Ended' : 'Game Over';
    const minutes = Math.floor(summary.survived / 60);
    const seconds = Math.floor(summary.survived % 60);
    this.uiRoot.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal">
          <h2>${title}</h2>
          <p class="panel-subtitle"><strong class="run-mode-label">${t(gameMode.name)}</strong> · ${summary.victory ? t('{name} defeated the final boss!',{name:t(summary.heroName)}) : t('{name} earned {n} cacao.',{name:t(summary.heroName),n:summary.cacao})}</p>
          <div class="summary-stats">
            <div class="summary-stat"><strong>${minutes}:${String(seconds).padStart(2, '0')}</strong>survived</div>
            <div class="summary-stat"><strong>${summary.kills}</strong>Enemies defeated</div>
            <div class="summary-stat"><strong>${summary.level}</strong>level</div>
            <div class="summary-stat"><strong>● ${summary.cacao}</strong>cacao</div>
          </div>
          ${summary.seed!==undefined?seedMarkup(String(summary.seed),true):''}
          ${summary.gear.length ? `<p class="panel-subtitle">${t('Equipment:')} ${summary.gear.map((item) => `${item.icon} ${t(item.name)}`).join(' · ')}</p>` : ''}
          <div class="panel-actions"><button class="btn ghost" data-menu>Main Menu</button><button class="btn ghost" data-shrine>Upgrades</button><button class="btn primary" data-retry>Try Again</button></div>
        </section>
      </div>`;
    $('[data-menu]', this.uiRoot).addEventListener('click', () => { this.clickSound(); this.showTitle(); });
    $('[data-shrine]', this.uiRoot).addEventListener('click', () => { this.clickSound(); this.clearGame(); this.showShrine(); });
    $('[data-retry]', this.uiRoot).addEventListener('click', () => { this.clickSound(); this.startRun(); });
    translateDOM(this.uiRoot);
    bindSeed(this.uiRoot,{seed:String(summary.seed??'')},this.audio);
  }

  showShrine() {
    this.audio.music('shop-upgrades');
    this.currentPage='showShrine';
    const render = () => {
      const screen = this.setScreen(upgradesMarkup(this.save), 'kit-screen upgrades-screen');
      screen.style.setProperty('--kit-backdrop', `url('${kitUrl('bg-subpage')}')`);
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
      onClose:()=>this.showTitle(),onSound:id=>this.audio.ui?this.audio.ui(id||'button-primary'):this.clickSound(),
      onHudEdit:()=>this.openHudEditor(),
    });
  }

  openHudEditor() {
    const root=document.createElement('div');root.className='hud-layout-preview';document.body.append(root);
    const hud=new Hud(root,{...this.save.data.settings,attackMode:'manual'},{skill:()=>{},dash:()=>{},pause:()=>{},attack:()=>{},hudLayouts:this.save.data.hudLayouts});
    hud.setHero(heroList()[1]);hud.setSkills(heroList()[1].skills.slice(0,4).map(skill=>({...skill,level:1,remaining:0})),4);
    hud.setStats({hp:100,maxHp:100,mana:80,maxMana:100,xp:30,nextXp:50,level:20,elapsed:0,duration:600,cacao:123,kills:12});
    const close=()=>{hud.destroy();root.remove();this.cancelHudEditor=null;this.showSettings();this.uiRoot.querySelector('[data-settings-tab=hud]')?.click();};
    const editor=hud.showHudEditor(layouts=>this.save.setHudLayouts(layouts),close);
    this.cancelHudEditor=()=>{editor.remove();close();};
  }

  showStore() {
    this.audio.music('shop-upgrades');
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
      heroes: ['Heroes','Each hero has 16 active skills and 8 passives. Start with 3 active slots, 1 passive slot, and 2 innate traits. More slots unlock at levels 10 and 20.'],
      ritual: ['Combat','Training: choose a 10- or 20-minute run, then choose auto-attack or manual attack in Settings. Move to avoid enemies, collect XP, and pick upgrades. At level 5, a permanent AI ally joins you and tougher enemies enter the waves. Melee heroes face ground enemies and ground-based bosses.'],
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
      const register = () => navigator.serviceWorker.register(`${base}sw.js`).catch(() => {});
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }
  }
}

// Only include real local files: no font download, guessed URL or 404 request.
const fontAssets = import.meta.glob([
  '../public/assets/fonts/Jersey15-*.woff2',
  '../public/assets/fonts/AtkinsonHyperlegible-*.woff2',
  '../public/assets/fonts/NotoSansArabic.ttf',
], { eager: true, query: '?url', import: 'default' });
const fontUrls = Object.fromEntries(Object.entries(fontAssets).map(([path, url]) => [path.split('/').at(-1), url]));
async function boot() {
  const typography = await waitForGameFonts(fontUrls);
  const app = new SangreYJadeApp();
  app.typography = typography;
// The existing native Android Back/audio bridge also needs this in packaged builds.
// Ordinary web releases still expose it only in the explicit FX diagnostic mode.
  if (import.meta.env.DEV || location.hostname === 'appassets.androidplatform.net' || new URLSearchParams(location.search).get('fxdebug') === '1') window.__SANGRE_Y_JADE__ = app;
}
boot();

