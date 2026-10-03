import { iconMarkup } from '../art/uiArt.js';
import { t, translateDOM } from '../i18n/index.js';
import { interfaceIcon } from '../art/interfaceIcons.js';
import { SUPPORTS } from '../data/supports.js';
import { skillDescription } from '../data/heroes.js';
import { HERO_SKILL_CAPACITY } from './SkillDraft.js';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class Hud {
  constructor(root, settings, callbacks) {
    this.root = root;
    this.settings = settings;
    this.callbacks = callbacks;
    this.move = { x: 0, y: 0 };
    this.cooldowns = Array(HERO_SKILL_CAPACITY).fill(0);
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
      <button class="support-loadout" data-support hidden aria-label="Support Loadout"></button>
      <div class="skills">
        <button class="attack-btn" data-attack aria-label="Attack" ${this.settings.attackMode==='manual'?'':'hidden'}><span class="key">F</span>${iconMarkup({art:1})}</button>
        ${Array.from({length:HERO_SKILL_CAPACITY},(_,i) => `<button class="skill-btn empty" data-skill="${i}" aria-label="Empty skill slot ${i + 1}"><span class="key">${['Q','E','R','T'][i]}</span><span class="skill-icon">＋</span><span class="cooldown"></span></button>`).join('')}
        <button class="dash-btn" data-dash aria-label="Dash"><span class="key">SPACE</span><span class="skill-icon">${iconMarkup({art:45})}</span><span class="cooldown"></span></button>
      </div>`;
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
    this.skillEls = [...this.el.querySelectorAll('.skill-btn')];
    this.dashEl = this.el.querySelector('[data-dash]');
    const attackButton=this.el.querySelector('[data-attack]');
    attackButton.addEventListener('pointerdown',event=>{event.preventDefault();attackButton.setPointerCapture(event.pointerId);this.attackHeld=true;this.callbacks.attack();});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])attackButton.addEventListener(name,()=>{this.attackHeld=false;});
    this.skillEls.forEach((button, index) => button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.callbacks.skill(index);
    }));
    this.dashEl.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.callbacks.dash();
    });
    this.el.querySelector('.pause-btn').addEventListener('click', () => this.callbacks.pause());
    this.el.querySelector('[data-support]').addEventListener('click',()=>this.callbacks.support?.());
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
    const name=t(SUPPORTS[ally.id].name);
    this.el.querySelector('[data-ally]').textContent=t('Support: {name} · Lv {n}',{name,n:ally.level});
    const button=this.el.querySelector('[data-support]');button.hidden=false;
    button.innerHTML=`${iconMarkup({supportPortrait:ally.id})}<span class="support-icons">${ally.skills.map(skill=>`<span title="${t(skill.name)} · ${skill.level}">${iconMarkup(skill)}</span>`).join('')}</span><small>${t('Support Loadout')}</small>`;
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

  setSkills(slots) {
    this.skillEls.forEach((button, index) => {
      const skill = slots[index];
      button.classList.toggle('empty', !skill);
      button.querySelector('.skill-icon').innerHTML = skill ? iconMarkup(skill) : '＋';
      button.setAttribute('aria-label', t(skill ? `${skill.name}, level ${skill.level}` : `Empty skill slot ${index + 1}`));
      button.title = t(skill ? `${skill.name} · Lv ${skill.level}\n${skillDescription(skill)}` : 'Choose a skill when you level up');
      button.style.borderColor = skill ? '#efc27a' : '';
    });
  }

  setCooldown(index, ratio, dash = false) {
    const button = dash ? this.dashEl : this.skillEls[index];
    if (!button) return;
    const veil = button.querySelector('.cooldown');
    const previous = dash ? this.dashCooldown || 0 : this.cooldowns[index];
    veil.style.transform = `scaleY(${clamp(ratio, 0, 1)})`;
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
      button.dataset.choice=card.id || String(index);
      button.innerHTML = `<span class="card-icon">${iconMarkup(card)}</span><h3>${card.name}</h3><p>${skillDescription(card)}</p>${card.meta ? `<div class="card-tags"><span class="tag">${card.meta}</span></div>` : ''}`;
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
    // Remove only this HUD. Phaser may finish scene shutdown one frame after the
    // application has already rendered a new menu into the shared UI root.
    this.el?.remove();
  }
}

