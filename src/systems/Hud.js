import { iconMarkup, artUrl } from '../art/uiArt.js';
import { t, translateDOM, getLanguage } from '../i18n/index.js';
import { interfaceIcon } from '../art/interfaceIcons.js';
import { SUPPORTS } from '../data/supports.js';
import { skillDescription } from '../data/heroes.js';
import { SLOT_RULES } from './SkillDraft.js';
import { passiveStateMarkup, passiveStateText, levelPips, cardKind, escapeHtml, INNATE_HUD } from './PassiveState.js';
import { renderSettingsPanel, controlsMarkup } from '../ui/SettingsPanel.js';
import { BossBar } from '../ui/BossPresentation.js';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class Hud {
  constructor(root, settings, callbacks) {
    this.root = root;
    this.settings = settings;
    this.callbacks = callbacks;
    this.move = { x: 0, y: 0 };
    this.cooldowns = Array(SLOT_RULES.active.keys.length).fill(0);
    this.attackHeld=false;
    this.mount();
  }

  mount() {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML = `
      <div class="hud-top">
        <div class="bars">
          <div class="vital-row vital-hp">${interfaceIcon('heart')}<div class="bar hp"><span></span><label>HP</label></div></div>
          <div class="vital-row vital-stamina">${interfaceIcon('stamina')}<div class="bar stamina"><span></span><label>STAMINA</label></div></div>
          <div class="vital-row vital-mana">${interfaceIcon('magic')}<div class="bar mana"><span></span><label>MANA</label></div></div>
        </div>
        <div class="hud-clock">00:00</div>
        <div class="hud-currency"><span class="hud-counter" data-hud-tip data-tooltip="${t('Cacao')}" tabindex="0" title="Cacao">${interfaceIcon('cacao')}<span><small>Cacao</small><b data-cacao>0</b></span></span><span class="hud-counter" data-hud-tip data-tooltip="${t('Kills')}" tabindex="0" title="Kills">${interfaceIcon('kills')}<span><small>Kills</small><b data-kills>0</b></span></span><button class="pause-btn" aria-label="Pause">${interfaceIcon('pause')}</button></div>
      </div>
      <div class="boss-wrap" hidden><div class="boss-name"></div><div class="boss-bar"><span></span></div></div>
      <div class="joystick" aria-label="Movement joystick"><div class="joystick-knob"></div></div>
      <div class="xp-dock"><div class="xp-heading">${interfaceIcon('xp')}<b data-level>Level 1</b></div><div class="bar xp"><span></span><label>0 / 20 XP</label></div></div>
      <button id="auto-indicator" type="button" data-hud-tip></button>
      <div class="ally-panel" aria-label="${t('Ally')}"><div class="ally-lock" data-ally-lock>${interfaceIcon('lock')}<b data-ally-level></b></div><button class="ally-portrait" data-support disabled aria-label="Support Loadout"></button><div class="ally-skills">${Array.from({length:3},(_,i)=>`<span class="ally-skill empty" data-ally-skill="${i}"><span class="skill-icon"></span><span class="ally-cooldown"></span></span>`).join('')}</div><img class="ally-rank-badge" data-ally-rank hidden alt=""><small class="ally-name"></small></div>
      <div class="skill-dock">
      <div class="passive-row"><div class="innate-traits">${SLOT_RULES.innate.map(id=>`<span class="innate-slot" data-innate="${id}" tabindex="0"></span>`).join('')}</div><div class="passive-slots">${Array.from({length:2},(_,i)=>`<div class="passive-slot" data-passive="${i}" tabindex="0"><span class="passive-content"></span></div>`).join('')}</div></div>
      <div class="skills">
        <button class="attack-btn" data-attack aria-label="Attack" ${this.settings.attackMode==='manual'?'':'hidden'}><span class="key">F</span>${iconMarkup({id:'ui-hud-attack'})}</button>
        ${Array.from({length:SLOT_RULES.active.keys.length},(_,i) => `<button class="skill-btn active-slot empty" data-skill="${i}" aria-label="Empty skill slot ${i + 1}"><span class="key" dir="ltr">${SLOT_RULES.active.keys[i]}</span><span class="skill-icon">＋</span><span class="cooldown"></span><span class="slot-level"></span></button>`).join('')}
        <button class="dash-btn" data-dash aria-label="Dash"><span class="key" dir="ltr" data-no-translate>Space</span><span class="skill-icon">${iconMarkup({id:'ui-hud-dash'})}</span><span class="cooldown"></span></button>
      </div></div><div class="skill-tooltip" id="hud-tooltip" role="tooltip" hidden></div>`;
    this.root.replaceChildren(this.el);
    this.hpFill = this.el.querySelector('.hp span');
    this.hpLabel = this.el.querySelector('.hp label');
    this.manaBar = this.el.querySelector('.mana');
    this.manaFill = this.el.querySelector('.mana span');
    this.manaLabel = this.el.querySelector('.mana label');
    this.staminaFill=this.el.querySelector('.stamina span');this.staminaLabel=this.el.querySelector('.stamina label');this.levelLabel=this.el.querySelector('[data-level]');
    this.xpFill = this.el.querySelector('.xp span');
    this.xpLabel = this.el.querySelector('.xp label');
    this.clock = this.el.querySelector('.hud-clock');
    this.cacao = this.el.querySelector('[data-cacao]');
    this.kills = this.el.querySelector('[data-kills]');
    this.boss = this.el.querySelector('.boss-wrap');
    this.bossBar = new BossBar(this.boss);
    this.bossName = this.bossBar.name;
    this.bossFill = this.bossBar.fill;
    this.skillEls = [...this.el.querySelectorAll('[data-skill]')];
    this.passiveEls = [...this.el.querySelectorAll('[data-passive]')];
    this.tooltip = this.el.querySelector('.skill-tooltip');
    this.dashEl = this.el.querySelector('[data-dash]');
    const attackButton=this.el.querySelector('[data-attack]');
    attackButton.addEventListener('pointerdown',event=>{event.preventDefault();attackButton.setPointerCapture(event.pointerId);this.attackHeld=true;this.callbacks.attack();});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])attackButton.addEventListener(name,()=>{this.attackHeld=false;});
    this.skillEls.forEach((button, index) => button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (button.disabled) return;
      this.callbacks.skill(index);
    }));
    this.dashEl.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.callbacks.dash();
    });
    this.el.querySelector('.pause-btn').addEventListener('click', () => this.callbacks.pause());
    this.el.querySelector('.ally-panel').addEventListener('click',event=>{
      if(event.target.closest('[data-ally-skill]')||this.el.querySelector('[data-support]').disabled)return;
      this.callbacks.support?.();
    });
    for (const slot of this.el.querySelectorAll('[data-passive],[data-innate],[data-ally-skill],[data-hud-tip]')) {
      const show = (event) => { event.stopPropagation(); this.showTooltip(slot); };
      slot.addEventListener('pointerdown', show);
      slot.addEventListener('pointerenter', show);
      slot.addEventListener('focus', show);
      slot.addEventListener('pointerleave', () => this.hideTooltip());
      slot.addEventListener('blur', () => this.hideTooltip());
      slot.addEventListener('keydown', event => { if (event.key === 'Escape') this.hideTooltip(); });
    }
    this.el.addEventListener('pointerdown', event => { if (!event.target.closest('[data-passive],[data-innate],[data-ally-skill],[data-hud-tip]')) this.hideTooltip(); });
    this.setAttackMode(this.settings.attackMode);
    this.setPassives([], SLOT_RULES.passive.start);
    this.setInnates(INNATE_HUD);
    this.setAlly(null);
    this.bindJoystick();
    translateDOM(this.el);
  }

  bindJoystick() {
    this.joy = this.el.querySelector('.joystick');
    this.knob = this.el.querySelector('.joystick-knob');
    let activeId = null;
    const move = (event) => {
      if (activeId !== event.pointerId) return;
      const rect = this.joy.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const radius = rect.width * .34;
      const length = Math.hypot(dx, dy) || 1;
      const scale = Math.min(1, radius / length);
      const x = dx * scale;
      const y = dy * scale;
      this.move.x = clamp(dx / radius, -1, 1);
      this.move.y = clamp(dy / radius, -1, 1);
      if (Math.hypot(this.move.x, this.move.y) > 1) {
        const norm = Math.hypot(this.move.x, this.move.y);
        this.move.x /= norm; this.move.y /= norm;
      }
      this.knob.style.transform = `translate(${x}px, ${y}px)`;
    };
    const release = (event) => {
      if (activeId !== event.pointerId) return;
      activeId = null;
      this.move.x = 0; this.move.y = 0;
      this.knob.style.transform = '';
      try { this.joy.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    };
    this.joy.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      activeId = event.pointerId;
      this.joy.setPointerCapture(event.pointerId);
      move(event);
    });
    this.joy.addEventListener('pointermove', move);
    this.joy.addEventListener('pointerup', release);
    this.joy.addEventListener('pointercancel', release);
  }

  setHero(hero) {
    this.manaBar.closest('.vital-row').hidden = !hero.base.mana;
  }

  setAlly(ally){
    const panel=this.el.querySelector('.ally-panel');
    panel.classList.toggle('locked',!ally);
    this.el.querySelector('[data-ally-lock]').hidden=!!ally;
    this.el.querySelector('[data-ally-level]').textContent=t('Lv {n}',{n:5});
    const button=this.el.querySelector('[data-support]');
    button.disabled=!ally;
    const name=ally?t(ally.name || SUPPORTS[ally.id]?.name || ally.id):'';
    const portrait=ally?iconMarkup({supportPortrait:ally.id}):'';
    if(button.innerHTML!==portrait)button.innerHTML=portrait;
    this.el.querySelector('.ally-name').textContent=ally?t('{name} · Lv {n}',{name,n:ally.level}):name;
    const badge=this.el.querySelector('[data-ally-rank]');
    badge.hidden=!ally;
    if(ally){badge.src=artUrl(`ui/rank-badge-${clamp(ally.rank||1,1,5)}.png`);badge.alt=t('Companion rank {n}',{n:ally.rank||1});badge.title=badge.alt;}
    this.el.querySelectorAll('[data-ally-skill]').forEach((slot,index)=>{
      const skill=ally?.skills[index];
      slot.classList.toggle('empty',!skill);
      slot.classList.toggle('passive',skill?.skillKind==='passive');
      const icon=skill?iconMarkup(skill):'';
      const image=slot.querySelector('.skill-icon');if(image.innerHTML!==icon)image.innerHTML=icon;
      slot.style.setProperty('--remaining',`${skill?.skillKind!=='passive'&&skill?.cooldown?clamp(skill.remaining/skill.cooldown,0,1)*360:0}deg`);
      slot.dataset.tooltip=skill?`${t(skill.name)} · ${t('ALLY')}\n${t(skillDescription(skill))}`:t('Empty ally slot');
      slot.setAttribute('aria-label',slot.dataset.tooltip);
      slot.tabIndex=skill?0:-1;
    });
  }

  setAttackMode(mode) {
    const indicator=this.el.querySelector('#auto-indicator');
    const manual=mode==='manual';
    if(indicator.dataset.mode!==(manual?'manual':'auto'))indicator.innerHTML=interfaceIcon(manual?'manual':'auto');
    indicator.dataset.mode=manual?'manual':'auto';
    indicator.dataset.tooltip=t(manual?'Manual attack is on. Hold F or Attack to fire.':'Auto-attack is on. Basic attacks fire automatically.');
    indicator.setAttribute('aria-label',indicator.dataset.tooltip);
    indicator.title=indicator.dataset.tooltip;
    this.el.querySelector('[data-attack]').hidden=!manual;
  }

  setPassives(slots, count = SLOT_RULES.passive.start) {
    this.passiveEls.forEach((slot,index)=>{
      const skill=slots[index],locked=index>=count;
      slot.classList.toggle('locked',locked);slot.classList.toggle('empty',!skill);
      const content=locked?`<span class="slot-level">${t('Lv {n}',{n:10})}</span>`:skill?`<span class="passive-icon">${iconMarkup(skill)}</span>${levelPips(skill.level)}${passiveStateMarkup(skill.hudState)}`:'<span class="slot-empty">＋</span>';
      const body=slot.querySelector('.passive-content');if(body.innerHTML!==content)body.innerHTML=content;
      slot.dataset.tooltip=locked?t('Unlocks at level {n}',{n:10}):skill?`${t(skill.name)} · ${t('PASSIVE')} · ${t('Lv {n}',{n:skill.level})}\n${t(skillDescription(skill))}\n${passiveStateText(skill.hudState)}`:t('Choose a passive when you level up');
      slot.setAttribute('aria-label',slot.dataset.tooltip);
    });
  }

  setInnates(traits) {
    this.el.querySelectorAll('[data-innate]').forEach(slot=>{
      const skill=traits.find(trait=>trait.id===slot.dataset.innate);
      if(!skill)return;
      const content=`<span class="passive-icon">${iconMarkup({...skill,art:skill.art??65})}</span>${passiveStateMarkup(skill.hudState)}`;
      if(slot.innerHTML!==content)slot.innerHTML=content;
      slot.dataset.tooltip=`${t(skill.name)} · ${t('Basic trait')} · ${t('Lv {n}',{n:skill.level})}\n${t(skill.description)}\n${passiveStateText(skill.hudState)}`;
      slot.setAttribute('aria-label',slot.dataset.tooltip);
    });
  }

  showTooltip(slot) {
    if(!slot.dataset.tooltip)return;
    this.tooltip.dir=getLanguage()==='ar'?'rtl':'ltr';
    slot.setAttribute('aria-describedby','hud-tooltip');
    this.tooltip.textContent=slot.dataset.tooltip;this.tooltip.hidden=false;
    const bounds=slot.getBoundingClientRect(),rect=this.tooltip.getBoundingClientRect();
    const safe=this.el.getBoundingClientRect();
    this.tooltip.style.left=`${clamp(bounds.left+bounds.width/2-rect.width/2,safe.left+6,safe.right-rect.width-6)}px`;
    this.tooltip.style.top=`${clamp(bounds.top-rect.height-8,safe.top+6,safe.bottom-rect.height-6)}px`;
    clearTimeout(this.tooltipTimer);this.tooltipTimer=setTimeout(()=>this.hideTooltip(),3500);
  }

  hideTooltip() { this.tooltip.hidden=true;clearTimeout(this.tooltipTimer); }

  showUnlock(kind) {
    this.callbacks.uiSound?.('slot-unlock');
    const slot=kind==='passive'?this.passiveEls[1]:this.skillEls[3];
    const burst=document.createElement('img');burst.className='slot-unlock-burst';burst.src=artUrl('ui/unlock-burst.png');burst.alt='';
    slot.append(burst);
    const banner=document.createElement('div');banner.className='milestone-banner';banner.setAttribute('role','status');
    banner.textContent=t(kind==='passive'?'Passive slot 2 unlocked!':'Active slot 4 unlocked!');
    this.el.append(banner);
    this.unlockTimers??=new Set();
    const timer=setTimeout(()=>{burst.remove();banner.remove();this.unlockTimers.delete(timer);},1500);
    this.unlockTimers.add(timer);
  }

  setStats(state) {
    this.setAttackMode(this.settings.attackMode);
    const hp = clamp(state.hp / state.maxHp, 0, 1);
    const mana = state.maxMana ? clamp(state.mana / state.maxMana, 0, 1) : 0;
    const xp = clamp(state.xp / state.nextXp, 0, 1);
    this.hpFill.style.width = `${hp * 100}%`;
    this.hpLabel.textContent = `${Math.ceil(state.hp)} / ${Math.ceil(state.maxHp)} ${t('HP')}`;
    this.manaFill.style.width = `${mana * 100}%`;
    this.manaLabel.textContent = `${Math.floor(state.mana)} / ${state.maxMana} ${t('MANA')}`;
    this.xpFill.style.width = `${xp * 100}%`;
    this.levelLabel.textContent = t('LEVEL {n}',{n:state.level});
    this.xpLabel.textContent = `${Math.floor(state.xp)} / ${state.nextXp} XP`;
    this.staminaFill.style.width=`${clamp(state.stamina??1,0,1)*100}%`;
    this.staminaLabel.textContent=`${t('STAMINA')} ${Math.round((state.stamina??1)*100)}%`;
    const left = Math.max(0, Math.ceil(state.duration - state.elapsed));
    this.clock.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    this.cacao.textContent = state.cacao;
    this.kills.textContent = state.kills;
    this.cacao.style.setProperty('--digit-count',String(state.cacao).length);
    this.kills.style.setProperty('--digit-count',String(state.kills).length);
  }

  setSkills(slots, activeSlotCount = SLOT_RULES.active.keys.length) {
    this.skillEls.forEach((button, index) => {
      const skill = slots[index];
      button.disabled = index >= activeSlotCount;
      button.classList.toggle('locked',button.disabled);
      button.classList.toggle('empty', !skill);
      button.classList.toggle('is-ready',!!skill&&!button.disabled&&!skill.remaining);
      button.querySelector('.skill-icon').innerHTML = skill ? iconMarkup(skill) : '＋';
      button.querySelector('.slot-level').textContent=button.disabled?t('Lv {n}',{n:20}):'';
      button.setAttribute('aria-label', button.disabled?t('Unlocks at level {n}',{n:20}):t(skill ? `${skill.name}, level ${skill.level}` : `Empty skill slot ${index + 1}`));
      button.title = t(skill ? `${skill.name} · Lv ${skill.level}\n${skillDescription(skill)}` : 'Choose a skill when you level up');
    });
  }

  setCooldown(index, ratio, dash = false) {
    const button = dash ? this.dashEl : this.skillEls[index];
    if (!button) return;
    const veil = button.querySelector('.cooldown');
    const previous = dash ? this.dashCooldown || 0 : this.cooldowns[index];
    const remaining=clamp(ratio,0,1);
    veil.style.transform='none';
    veil.style.setProperty('--remaining',`${remaining*360}deg`);
    veil.hidden=remaining===0;
    button.classList.toggle('is-ready',remaining===0&&!button.disabled&&!button.classList.contains('empty'));
    if (previous > 0 && ratio <= 0) {
      button.classList.remove('ready');
      void button.offsetWidth;
      button.classList.add('ready');
    }
    if (dash) this.dashCooldown = ratio;
    else this.cooldowns[index] = ratio;
  }

  setBoss(name, ratio, model) {
    this.bossBar.update(name, ratio, model);
    this.layoutRuntime?.syncVisibility('boss-bar');
  }

  clearBoss() {
    this.boss.hidden = true;
  }

  toast(message) {
    this.el.querySelectorAll('.toast').forEach((old) => old.remove());
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = t(message);
    this.el.append(node);
    setTimeout(() => node.remove(), 2450);
  }

  showChoice(title, cards, onChoose, subtitle = 'Choose an upgrade.', secondary=null, presentation={}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    if(presentation.className)overlay.classList.add(presentation.className);
    if(presentation.stage)overlay.dataset.stage=presentation.stage;
    overlay.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="choice-title">
        <h2 id="choice-title">${escapeHtml(title)}</h2>
        <p class="panel-subtitle">${escapeHtml(subtitle)}</p>
        <div class="card-grid"></div>
      </section>`;
    const grid = overlay.querySelector('.card-grid');
    cards.forEach((card, index) => {
      const button = document.createElement(presentation.readOnly?'article':'button');
      button.className = 'choice-card';
      const kind=cardKind(card);
      button.dataset.kind=kind;
      button.dataset.choice=card.id || String(index);
      if(card.innate)button.dataset.innateTrait='';
      const allyDetails=card.signature?`<div class="ally-card-details"><span>${escapeHtml(t('Role: {role}',{role:t(card.role)}))}</span><span>${escapeHtml(t('Signature: {name}',{name:t(card.signature.name)}))}</span><span>${escapeHtml(t('Passives: {passives}',{passives:card.passives.map(skill=>t(skill.name)).join(', ')}))}</span></div>`:'';
      button.innerHTML = `<span class="skill-ribbon" style="background-image:url('${artUrl(`ui/ribbon-${kind}.png`)}')">${t(card.innate?'Basic trait':kind.toUpperCase())}</span><span class="card-icon">${iconMarkup(card)}</span><h3>${escapeHtml(t(card.name))}</h3><p>${escapeHtml(t(skillDescription(card)))}</p>${allyDetails}${card.meta ? `<div class="card-tags"><span class="tag">${escapeHtml(t(card.meta))}</span></div>` : ''}`;
      button.title=t(skillDescription(card));
      if(!presentation.readOnly)button.addEventListener('click', () => {
        overlay.remove();
        onChoose(card, index);
      }, { once: true });
      grid.append(button);
    });
    const actions=document.createElement('div');actions.className='panel-actions choice-actions';
    for(const [action,primary] of [[secondary,false],[presentation.primary,true]]){
      if(!action)continue;
      const button=document.createElement('button');button.className=`btn ${primary?'primary':'ghost'} choice-secondary`;
      if(!primary)button.dataset.choiceCancel='';
      if(action.id)button.dataset.action=action.id;
      button.textContent=t(action.label);button.onclick=()=>{overlay.remove();action.action();};actions.append(button);
    }
    if(actions.childElementCount)overlay.querySelector('.modal').append(actions);
    this.el.append(overlay);
    requestAnimationFrame(() => (grid.querySelector('button')||actions.querySelector('button'))?.focus());
    translateDOM(overlay);
    return overlay;
  }

  showSkills(loadout,onBack) {
    const cards=['active','passive','innate'].flatMap(kind=>(loadout[kind]||[])
      .map(skill=>({...skill,kind:kind==='innate'?'passive':kind,innate:kind==='innate',
        name:`${skill.name} · Lv ${skill.level}`})));
    return this.showChoice('Skills',cards,()=>{},'Equipped skills and innate traits.',
      {label:'Back',id:'skills-back',action:onBack},{className:'skills-readonly',readOnly:true});
  }

  showPause(onResume, onExit, onSkills, onSettings, onHelp) {
    if (this.el.querySelector('.modal-backdrop')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop pause-menu';
    overlay.dir=getLanguage()==='ar'?'rtl':'ltr';
    overlay.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true">
        <h2>Paused</h2>
        <p class="panel-subtitle">The game is paused.</p>
        <div class="pause-actions"><div class="pause-first-row"><button class="btn primary" data-resume>Resume</button><button class="btn ghost" data-settings>Settings</button></div>${onSkills?'<button class="btn ghost" data-skills>Skills</button>':''}<button class="btn ghost" data-help>How to Play</button><button class="btn danger" data-exit>Quit to Menu</button></div>
      </section>`;
    overlay.querySelector('[data-resume]').addEventListener('click', () => { overlay.remove(); onResume(); });
    overlay.querySelector('[data-exit]').addEventListener('click', () => { overlay.remove(); onExit(); });
    overlay.querySelector('[data-skills]')?.addEventListener('click',()=>{overlay.remove();onSkills();});
    overlay.querySelector('[data-settings]').addEventListener('click',()=>{overlay.remove();onSettings?.();});
    overlay.querySelector('[data-help]').addEventListener('click',()=>{overlay.remove();onHelp?.();});
    this.el.append(overlay);
    overlay.querySelector('[data-resume]').focus();
    translateDOM(overlay);
    return overlay;
  }

  showSettings(onChange,onBack) {
    const overlay=document.createElement('div');overlay.className='modal-backdrop pause-settings';
    overlay.innerHTML='<section class="modal settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title"></section>';
    renderSettingsPanel(overlay.querySelector('.settings-panel'),this.settings,{
      onChange,onClose:()=>{overlay.remove();onBack();},closeLabel:'Back',onSound:id=>this.callbacks.settingsSound?.(id),
    });
    this.el.append(overlay);overlay.querySelector('[data-back]').focus();
    return overlay;
  }

  showHelp(onBack) {
    const overlay=document.createElement('div');overlay.className='modal-backdrop pause-help';
    overlay.dir=getLanguage()==='ar'?'rtl':'ltr';
    overlay.innerHTML=`<section class="modal" role="dialog" aria-modal="true"><h2>${t('How to Play')}</h2><div class="help-content">${controlsMarkup()}</div><div class="panel-actions"><button class="btn primary" data-back>${t('Back')}</button></div></section>`;
    overlay.querySelector('[data-back]').addEventListener('click',()=>{overlay.remove();onBack();});
    this.el.append(overlay);overlay.querySelector('[data-back]').focus();
    return overlay;
  }

  destroy() {
    clearTimeout(this.tooltipTimer);
    this.unlockTimers?.forEach(clearTimeout);
    // Remove only this HUD. Phaser may finish scene shutdown one frame after the
    // application has already rendered a new menu into the shared UI root.
    this.el?.remove();
  }
}

