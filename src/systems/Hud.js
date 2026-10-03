import { iconMarkup, artUrl } from '../art/uiArt.js';
import { t, translateDOM } from '../i18n/index.js';
import { interfaceIcon } from '../art/interfaceIcons.js';
import { SUPPORTS } from '../data/supports.js';
import { skillDescription } from '../data/heroes.js';
import { SLOT_RULES } from './SkillDraft.js';
import { passiveStateMarkup, passiveStateText, levelPips, cardKind, escapeHtml, INNATE_HUD } from './PassiveState.js';
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
        <div class="hud-currency"><span class="hud-counter" title="Cacao">${interfaceIcon('cacao')}<span><small>Cacao</small><b data-cacao>0</b></span></span><span class="hud-counter" title="Kills">${interfaceIcon('kills')}<span><small>Kills</small><b data-kills>0</b></span></span><button class="pause-btn" aria-label="Pause">${interfaceIcon('pause')}</button></div>
      </div>
      <div class="boss-wrap" hidden><div class="boss-name"></div><div class="boss-bar"><span></span></div></div>
      <div class="joystick" aria-label="Movement joystick"><div class="joystick-knob"></div></div>
      <div class="xp-dock"><div class="xp-heading">${interfaceIcon('xp')}<b data-level>Level 1</b></div><div class="bar xp"><span></span><label>0 / 20 XP</label></div></div>
      <div class="combat-status"><span data-attack-mode>${this.settings.attackMode==='manual'?'Manual attack':'Auto-attack'}</span><span data-ally>Ally unlocks at level 5</span></div>
      <div class="ally-panel" aria-label="${t('Ally')}"><button class="ally-portrait" data-support disabled aria-label="Support Loadout"></button><div class="ally-skills">${Array.from({length:3},(_,i)=>`<span class="ally-skill empty" data-ally-skill="${i}"><span class="skill-icon"></span><span class="ally-cooldown"></span></span>`).join('')}</div><small class="ally-name">${t('Ally unlocks at level 5')}</small></div>
      <div class="skill-dock">
      <div class="passive-row"><div class="innate-traits">${SLOT_RULES.innate.map(id=>`<span class="innate-slot" data-innate="${id}" tabindex="0"></span>`).join('')}</div><div class="passive-slots">${Array.from({length:2},(_,i)=>`<div class="passive-slot" data-passive="${i}" tabindex="0"><span class="passive-content"></span></div>`).join('')}</div></div>
      <div class="skills">
        <button class="attack-btn" data-attack aria-label="Attack" ${this.settings.attackMode==='manual'?'':'hidden'}><span class="key">F</span>${iconMarkup({art:1})}</button>
        ${Array.from({length:SLOT_RULES.active.keys.length},(_,i) => `<button class="skill-btn active-slot empty" data-skill="${i}" aria-label="Empty skill slot ${i + 1}"><span class="key" dir="ltr">${SLOT_RULES.active.keys[i]}</span><span class="skill-icon">＋</span><span class="cooldown"></span><span class="slot-level"></span></button>`).join('')}
        <button class="dash-btn" data-dash aria-label="Dash"><span class="key">SPACE</span><span class="skill-icon">${iconMarkup({art:45})}</span><span class="cooldown"></span></button>
      </div></div><div class="skill-tooltip" role="tooltip" hidden></div>`;
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
    this.bossName = this.el.querySelector('.boss-name');
    this.bossFill = this.el.querySelector('.boss-bar span');
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
    this.el.querySelector('[data-support]').addEventListener('click',()=>this.callbacks.support?.());
    for (const slot of this.el.querySelectorAll('[data-passive],[data-innate],[data-ally-skill]')) {
      const show = (event) => { event.stopPropagation(); this.showTooltip(slot); };
      slot.addEventListener('pointerdown', show);
      slot.addEventListener('pointerenter', show);
      slot.addEventListener('focus', show);
      slot.addEventListener('pointerleave', () => this.hideTooltip());
      slot.addEventListener('blur', () => this.hideTooltip());
      slot.addEventListener('keydown', event => { if (event.key === 'Escape') this.hideTooltip(); });
    }
    this.el.addEventListener('pointerdown', event => { if (!event.target.closest('[data-passive],[data-innate],[data-ally-skill]')) this.hideTooltip(); });
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
    const button=this.el.querySelector('[data-support]');
    button.disabled=!ally;
    const name=ally?t(ally.name || SUPPORTS[ally.id]?.name || ally.id):t('Ally unlocks at level 5');
    const portrait=ally?iconMarkup({supportPortrait:ally.id}):'<span aria-hidden="true">?</span>';
    if(button.innerHTML!==portrait)button.innerHTML=portrait;
    this.el.querySelector('.ally-name').textContent=ally?t('{name} · Lv {n}',{name,n:ally.level}):name;
    if(ally)this.el.querySelector('[data-ally]').textContent=t('Support: {name} · Lv {n}',{name,n:ally.level});
    this.el.querySelectorAll('[data-ally-skill]').forEach((slot,index)=>{
      const skill=ally?.skills[index];
      slot.classList.toggle('empty',!skill);
      const icon=skill?iconMarkup(skill):'';
      const image=slot.querySelector('.skill-icon');if(image.innerHTML!==icon)image.innerHTML=icon;
      slot.style.setProperty('--remaining',`${skill?.cooldown?clamp(skill.remaining/skill.cooldown,0,1)*360:0}deg`);
      slot.dataset.tooltip=skill?`${t(skill.name)} · ${t('ALLY')}\n${t(skillDescription(skill))}`:t('Empty ally slot');
      slot.setAttribute('aria-label',slot.dataset.tooltip);
      slot.tabIndex=skill?0:-1;
    });
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
    this.tooltip.textContent=slot.dataset.tooltip;this.tooltip.hidden=false;
    const bounds=slot.getBoundingClientRect(),rect=this.tooltip.getBoundingClientRect();
    this.tooltip.style.left=`${clamp(bounds.left+bounds.width/2-rect.width/2,6,innerWidth-rect.width-6)}px`;
    this.tooltip.style.top=`${Math.max(6,bounds.top-rect.height-8)}px`;
    clearTimeout(this.tooltipTimer);this.tooltipTimer=setTimeout(()=>this.hideTooltip(),3500);
  }

  hideTooltip() { this.tooltip.hidden=true;clearTimeout(this.tooltipTimer); }

  showUnlock(kind) {
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

  setBoss(name, ratio) {
    this.boss.hidden = false;
    this.bossName.textContent = t(name);
    this.bossFill.style.width = `${clamp(ratio, 0, 1) * 100}%`;
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

  showChoice(title, cards, onChoose, subtitle = 'Choose an upgrade.', secondary=null) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="choice-title">
        <h2 id="choice-title">${title}</h2>
        <p class="panel-subtitle">${subtitle}</p>
        <div class="card-grid"></div>
      </section>`;
    const grid = overlay.querySelector('.card-grid');
    cards.forEach((card, index) => {
      const button = document.createElement('button');
      button.className = 'choice-card';
      const kind=cardKind(card);
      button.dataset.kind=kind;
      button.dataset.choice=card.id || String(index);
      button.innerHTML = `<span class="skill-ribbon" style="background-image:url('${artUrl(`ui/ribbon-${kind}.png`)}')">${t(kind.toUpperCase())}</span><span class="card-icon">${iconMarkup(card)}</span><h3>${escapeHtml(card.name)}</h3><p>${escapeHtml(skillDescription(card))}</p>${card.meta ? `<div class="card-tags"><span class="tag">${escapeHtml(card.meta)}</span></div>` : ''}`;
      button.addEventListener('click', () => {
        overlay.remove();
        onChoose(card, index);
      }, { once: true });
      grid.append(button);
    });
    if(secondary){const button=document.createElement('button');button.className='btn ghost choice-secondary';button.dataset.choiceCancel='';button.textContent=t(secondary.label);button.onclick=()=>{overlay.remove();secondary.action();};overlay.querySelector('.modal').append(button);}
    this.el.append(overlay);
    requestAnimationFrame(() => grid.querySelector('button')?.focus());
    translateDOM(overlay);
    return overlay;
  }

  showPause(onResume, onExit) {
    if (this.el.querySelector('.modal-backdrop')) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true">
        <h2>Paused</h2>
        <p class="panel-subtitle">The game is paused.</p>
        <div class="panel-actions"><button class="btn primary" data-resume>Resume</button><button class="btn danger" data-exit>End Run</button></div>
      </section>`;
    overlay.querySelector('[data-resume]').addEventListener('click', () => { overlay.remove(); onResume(); });
    overlay.querySelector('[data-exit]').addEventListener('click', () => { overlay.remove(); onExit(); });
    this.el.append(overlay);
    overlay.querySelector('[data-resume]').focus();
    translateDOM(overlay);
  }

  destroy() {
    clearTimeout(this.tooltipTimer);
    this.unlockTimers?.forEach(clearTimeout);
    // Remove only this HUD. Phaser may finish scene shutdown one frame after the
    // application has already rendered a new menu into the shared UI root.
    this.el?.remove();
  }
}

