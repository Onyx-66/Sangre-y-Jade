import Phaser from 'phaser';
import { t, getLanguage } from '../i18n/index.js';
import { buildTextures, preloadTextures } from '../art/TextureFactory.js';
import { ENEMIES, BOSSES, GEAR } from '../data/world.js';
import { MODIFIERS } from '../data/heroes.js';
import { Hud } from '../systems/Hud.js';
import { ALLY_LEVEL, enemyPool, canSpawnEnemy, bossForHero, spawnOutsideView, facingFor } from '../systems/CombatRules.js';
import { HERO_SKILL_CAPACITY, draftSkills } from '../systems/SkillDraft.js';
import { SupportSystem } from '../systems/SupportSystem.js';
import { applyProjectileTint, chainAttack as performChainAttack, restoreSkillMana, ringEffect as performRingEffect } from '../systems/SkillCombat.js';
import { ACTIVE_HANDLERS, INNATE_PASSIVES } from '../skills/index.js';
import { PassiveSystem } from '../skills/PassiveSystem.js';
import { skillContext, skillCooldown, manaCost, updateSkillEffects, applyStatus } from '../skills/common.js';
import { HERO_EFFECT_DEFAULTS, enemyStatusDefaults, updateEnemy, canEnemyAttack, enemyDamageMult, enemyShotAngle } from '../skills/StatusEffects.js';

const TAU = Math.PI * 2;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export class GameScene extends Phaser.Scene {
  constructor(options) {
    super({ key: 'Ritual' });
    this.options = options;
  }

  preload() { preloadTextures(this); }

  create() {
    const { hero, map, mode, meta, settings, audio, uiRoot } = this.options;
    this.heroData = hero;
    this.mapData = map;
    this.modeData = mode;
    this.settings = settings;
    this.audio = audio;
    this.meta = meta;
    this.ended = false;
    this.pausedForChoice = false;
    this.elapsed = 0;
    this.autoTimer = 0;
    this.basicAttackCount = 0;
    this.spawnTimer = 0;
    this.decorTimer = 0;
    this.nextBossIndex = 0;
    this.finalSpawned = false;
    this.lastMove = new Phaser.Math.Vector2(1, 0);
    this.dash = { cooldown: 0, remaining: 0, x: 1, y: 0 };
    this.hitCount = 0;
    this.enemySerial = 0;
    this.chunks = new Set();
    this.gear = [];
    this.skillSlots = [];
    this.summons = [];
    this.skillEffects = [];
    this.companion=null;
    this.support=new SupportSystem(this);
    this.pendingBossRewards=[];
    this.facing='side';
    this.manualPointer=false;
    this.pendingLevelUps = 0;

    this.stats = {
      level: 1,
      xp: 0,
      nextXp: 18,
      hp: hero.base.hp + meta.hp,
      maxHp: hero.base.hp + meta.hp,
      mana: hero.base.mana,
      maxMana: hero.base.mana,
      damage: hero.base.damage * meta.damage,
      armor: hero.base.armor,
      speed: hero.base.speed * meta.speed,
      crit: hero.base.crit,
      critDamage: 1.65,
      haste: 0,
      range: 1,
      regen: 0,
      xpGain: 1,
      fortune: meta.fortune,
      healing: 1,
      shield: 0,
      cacao: 0,
      kills: 0,
      damageDone: 0,
      damageTaken: 0,
      duration: mode.duration,
      ...HERO_EFFECT_DEFAULTS,
    };

    this.passives = new PassiveSystem(this);
    for (const passive of INNATE_PASSIVES) this.passives.equip(passive, 1, { innate: true });

    buildTextures(this);
    this.physics.world.setBounds(-50000, -50000, 100000, 100000);
    this.cameras.main.setBackgroundColor(map.colors.ground);
    this.cameras.main.roundPixels = true;
    this.createWorld();
    this.createGroups();
    this.createPlayer();
    this.createInput();
    this.createCollisions();
    this.hud = new Hud(uiRoot, settings, {
      skill: (index) => this.castSkill(index),
      dash: () => this.tryDash(),
      pause: () => this.togglePause(),
      support:()=>this.showSupportLoadout(),
      attack:()=>{if(this.settings.attackMode==='manual' && this.autoTimer<=0 && !this.pausedForChoice)this.autoAttack();},
    });
    this.hud.setHero(hero);
    this.hud.setSkills(this.skillSlots);
    this.hud.toast(`${map.name} · ${mode.name}`);
    this.audio.music(map.music);
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
  }

  createWorld() {
    this.floor = this.add.tileSprite(0, 0, 1280, 720, 'ground')
      .setOrigin(0).setScrollFactor(0).setDepth(-100);
    if(this.mapData.id === 'bloodmoon') this.floor.setTint(0x956789);
    if(this.mapData.id === 'cenote') this.floor.setTint(0x568eaf);
    this.fog = this.add.graphics().setScrollFactor(0).setDepth(80);
    if (this.mapData.id !== 'overgrown') {
      const alpha = this.mapData.id === 'bloodmoon' ? .14 : .18;
      this.fog.fillStyle(this.mapData.colors.fog, alpha).fillRect(0, 0, 1280, 720);
    }
    this.decorGroup = this.add.group();
  }

  createGroups() {
    this.enemies = this.physics.add.group({ maxSize: this.settings.particles === 'low' ? 90 : 155 });
    this.projectiles = this.physics.add.group({ maxSize: this.settings.particles === 'low' ? 100 : 210 });
    this.enemyProjectiles = this.physics.add.group({ maxSize: 90 });
    this.pickups = this.physics.add.group({ maxSize: 180 });
    this.props = this.physics.add.staticGroup();
    this.effects = this.add.group({ maxSize: 100 });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(0, 0, `hero-${this.heroData.id}`).setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(.64);
    this.player.body.setCircle(23, 41, 54);
    this.player.play(`hero-${this.heroData.id}-idle`);
    this.player.setData('animLock',0);
    this.player.hiddenUntil = 0;
    this.cameras.main.startFollow(this.player, true, .09, .09);
    this.cameras.main.setZoom(1);
    this.invulnerable = 0;
    this.generateChunks();
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      skill1: 'Q', skill2: 'E', skill3: 'R', skill4:'T', dash: 'SPACE', pause: 'ESC', attack:'F',
    });
    this.keys.skill1.on('down', () => this.castSkill(0));
    this.keys.skill2.on('down', () => this.castSkill(1));
    this.keys.skill3.on('down', () => this.castSkill(2));
    this.keys.skill4.on('down', () => this.castSkill(3));
    this.keys.dash.on('down', () => this.tryDash());
    this.keys.pause.on('down', () => this.togglePause());
    this.input.on('pointerdown',pointer=>{if(pointer.leftButtonDown())this.manualPointer=true;});
    this.input.on('pointerup',()=>{this.manualPointer=false;});
    this.releaseAttack=()=>{this.manualPointer=false;if(this.hud)this.hud.attackHeld=false;};
    window.addEventListener('pointerup',this.releaseAttack);
    window.addEventListener('blur',this.releaseAttack);
  }

  createCollisions() {
    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => this.onProjectileHit(projectile, enemy));
    this.physics.add.overlap(this.projectiles, this.props, (projectile, prop) => {
      if (!projectile.active || !prop.active) return;
      this.damageProp(prop, projectile.getData('damage') || 10);
      this.consumeProjectile(projectile);
    });
    this.physics.add.overlap(this.player, this.enemies, (_, enemy) => this.touchEnemy(enemy));
    this.physics.add.overlap(this.player, this.enemyProjectiles, (_, projectile) => {
      this.onEnemyProjectileHit(projectile);
    });
    this.physics.add.overlap(this.player, this.pickups, (_, pickup) => this.collectPickup(pickup));
    this.physics.add.overlap(this.player,this.props,(_,prop)=>this.damageProp(prop,Infinity));
  }

  update(_time, deltaRaw) {
    if (this.ended || this.pausedForChoice || !this.player?.active) return;
    const delta = Math.min(deltaRaw, 50);
    const dt = delta / 1000;
    this.elapsed += dt;
    this.passives.emit('tick', { dt });
    this.autoTimer -= dt * this.stats.cooldownRecoveryMult;
    this.spawnTimer -= dt;
    this.decorTimer -= dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dash.cooldown = Math.max(0, this.dash.cooldown - dt);
    this.updateMovement(dt);
    this.updateCooldowns(dt);
    this.updateEnemies(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateSummons(dt);
    updateSkillEffects(this, dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateCompanion(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateVitals(dt);
    this.updateDirector(dt);
    this.updateWorld();
    this.updateHud();
  }

  updateMovement(dt) {
    const keyboardX = (this.cursors.left.isDown || this.keys.left.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.right.isDown ? 1 : 0);
    const keyboardY = (this.cursors.up.isDown || this.keys.up.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.down.isDown ? 1 : 0);
    let x = keyboardX || this.hud.move.x;
    let y = keyboardY || this.hud.move.y;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    if (length > .1) this.lastMove.set(x, y).normalize();

    if (this.dash.remaining > 0) {
      this.dash.remaining -= dt;
      const speed = this.stats.speed * this.passives.modifiers().speedMult;
      this.player.setVelocity(this.dash.x * speed * 3.65, this.dash.y * speed * 3.65);
      this.player.setAlpha(.72 + Math.sin(this.elapsed * 50) * .16);
    } else {
      this.player.setAlpha(1);
      const speed=this.stats.speed*this.support.modifiers().speed*this.passives.modifiers().speedMult;
      this.player.setVelocity(x * speed, y * speed);
    }
    this.facing=facingFor(this.player.body.velocity.x,this.player.body.velocity.y,this.facing);
    if(this.facing==='side'&&Math.abs(this.player.body.velocity.x)>4)this.player.setFlipX(this.player.body.velocity.x<0);
    if(this.facing!=='side')this.player.setFlipX(false);
    const moving = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) > 5;
    this.animateCharacter(this.player,this.playerArtKey(),moving?'walk':'idle');
  }

  updateCooldowns(dt) {
    const moving = this.player.body.speed > 5;
    const movingHaste = moving && this.hasGear('feathered-headdress') ? .12 : 0;
    const recovery = (1 + this.stats.haste + movingHaste + this.support.modifiers().haste) * this.stats.cooldownRecoveryMult;
    this.skillSlots.forEach((skill) => { skill.remaining = Math.max(0, skill.remaining - dt * recovery); });
    for(let i=0;i<HERO_SKILL_CAPACITY;i++)this.hud.setCooldown(i,this.skillSlots[i]?this.skillSlots[i].remaining/skillCooldown(this.skillSlots[i]):0);
    this.hud.setCooldown(0, this.dash.cooldown / 3.1, true);
  }

  updateVitals(dt) {
    const regen=this.stats.regen+this.support.modifiers().regen;
    if (regen) this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + regen * dt);
    if (this.stats.maxMana) this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 11 * dt * this.stats.manaRegenMult);
    const attacking=this.settings.attackMode!=='manual'||this.keys.attack.isDown||this.hud.attackHeld||this.manualPointer;
    if (this.autoTimer <= 0 && attacking) this.autoAttack();
  }

  updateDirector() {
    if (!this.finalSpawned && this.elapsed >= this.modeData.duration && !this.activeBoss) {
      this.finalSpawned = true;
      this.spawnBoss(BOSSES[3]);
    }
    const thresholds = [.25, .5, .75].map((f) => this.modeData.duration * f);
    if (this.nextBossIndex < 3 && this.elapsed >= thresholds[this.nextBossIndex] && !this.activeBoss) {
      this.spawnBoss(BOSSES[this.nextBossIndex]);
      this.nextBossIndex += 1;
    }
    if (this.spawnTimer <= 0 && !this.ended) {
      const progress = Math.min(1.4, this.elapsed / this.modeData.duration);
      const levelPressure=Math.min(12,Math.max(0,this.stats.level-ALLY_LEVEL)*1.2);
      const targetCount = Math.floor(16 + progress * (this.settings.particles === 'low' ? 45 : 85) + levelPressure);
      if (this.enemies.countActive() < targetCount) {
        const batch = Math.min(5, 1 + Math.floor(progress * 4));
        for (let i = 0; i < batch; i += 1) this.spawnEnemy();
      }
      this.spawnTimer = Math.max(.22, .8 - progress * .36 - Math.min(.12,this.stats.level*.008));
    }
  }

  updateEnemies(dt) {
    this.enemies.children.each((enemy) => {
      if (!enemy?.active||this.pausedForChoice||this.ended) return;
      updateEnemy(this, enemy, dt);
    });
  }

  updateBoss(boss, dt, dx, dy, distance) {
    if (!canEnemyAttack(this, boss)) { boss.setVelocity(0, 0); return; }
    const pattern = boss.getData('pattern');
    let timer = (boss.getData('patternTimer') || 1) - dt;
    boss.setData('patternTimer', timer);
    const speed = boss.getData('speed');
    if (boss.getData('dashing') > 0) {
      boss.setData('dashing', boss.getData('dashing') - dt);
    } else {
      boss.setVelocity(dx / distance * speed, dy / distance * speed);
    }
    if (timer > 0 || boss.getData('silenceUntil')>this.elapsed) return;
    this.animateCharacter(boss,boss.getData('artKey'),'attack',.4);
    if (pattern === 'dash') {
      boss.setData('dashing', .6);
      boss.setVelocity(dx / distance * 390, dy / distance * 390);
      this.bossTelegraph(boss.x, boss.y, 90, 0x9c70b7);
      boss.setData('patternTimer', 3.2);
      this.audio.sfx('boss');
    } else if (pattern === 'quake') {
      this.bossTelegraph(this.player.x, this.player.y, 150, 0xe39c59, () => {
        if (!boss.active || !canEnemyAttack(this, boss)) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.quakeX, this.quakeY) < 155) this.damagePlayer(22 * enemyDamageMult(this, boss), this.quakeX, this.quakeY, boss);
        this.damageArea({ x: this.quakeX, y: this.quakeY }, 155, 0, 0, false);
      });
      this.quakeX = this.player.x; this.quakeY = this.player.y;
      boss.setData('patternTimer', 4.1);
    } else if (pattern === 'sun') {
      const base = enemyShotAngle(this, boss, Math.atan2(dy, dx));
      for (let i = -2; i <= 2; i += 1) this.spawnEnemyProjectile(boss.x, boss.y, base + i * .18, 235, 13 * enemyDamageMult(this, boss), boss);
      boss.setData('patternTimer', 2.05);
      this.audio.sfx('spell');
    } else {
      const hpRatio = boss.getData('hp') / boss.getData('maxHp');
      const count = hpRatio > .6 ? 7 : hpRatio > .3 ? 10 : 14;
      for (let i = 0; i < count; i += 1) this.spawnEnemyProjectile(boss.x, boss.y, (i / count) * TAU + this.elapsed, 185 + (i % 2) * 55, 14 * enemyDamageMult(this, boss), boss);
      if (hpRatio < .65) for (let i = 0; i < (hpRatio < .3 ? 3 : 1); i += 1) this.spawnEnemy('shade', 260 + i * 35);
      boss.setData('patternTimer', hpRatio < .3 ? 1.35 : 2.15);
      this.audio.sfx('boss');
    }
    this.hud.setBoss(boss.getData('displayName'), boss.getData('hp') / boss.getData('maxHp'));
  }

  updateProjectiles(dt) {
    this.projectiles.children.each((projectile) => {
      if (!projectile?.active) return;
      const life = (projectile.getData('life') || 0) - dt;
      projectile.setData('life', life);
      if (life <= 0 || Phaser.Math.Distance.Between(projectile.x, projectile.y, this.player.x, this.player.y) > 1450) projectile.destroy();
    });
    this.enemyProjectiles.children.each((projectile) => {
      if (!projectile?.active) return;
      const life = (projectile.getData('life') || 0) - dt;
      projectile.setData('life', life);
      if (life <= 0) projectile.destroy();
    });
  }

  updatePickups() {
    const xpPickupRange = 170 * this.passives.modifiers().pickupRangeMult;
    // Containers open on contact too; collecting loot never requires an attack.
    for(const prop of [...this.props.getChildren()])if(prop.active&&Phaser.Math.Distance.Between(prop.x,prop.y,this.player.x,this.player.y)<50)this.damageProp(prop,Infinity);
    this.pickups.children.each((pickup) => {
      if (!pickup?.active||this.pausedForChoice||this.ended) return;
      const distance = Phaser.Math.Distance.Between(pickup.x, pickup.y, this.player.x, this.player.y);
      const pickupRange = pickup.getData('kind') === 'xp' ? xpPickupRange : 170;
      if(distance<30){this.collectPickup(pickup);return;}
      if (distance < pickupRange) this.physics.moveToObject(pickup, this.player, 190 + (pickupRange - distance) * 2.2);
      else pickup.setVelocity(0, 0);
      const bubble=pickup.getData('bubble');if(bubble?.active){const pulse=1+Math.sin(this.elapsed*3+pickup.getData('phase'))*.07;bubble.setPosition(pickup.x,pickup.y).setDisplaySize(pickup.getData('bubbleSize')*pulse,pickup.getData('bubbleSize')*pulse);}
      if (distance > 1900) pickup.destroy();
    });
  }

  updateSummons(dt) {
    this.summons = this.summons.filter((summon) => {
      summon.life -= dt;
      summon.shot -= dt;
      if (summon.life <= 0 || !summon.sprite.active) { summon.sprite.destroy(); return false; }
      if (summon.shot <= 0) {
        const target = this.closestEnemy(summon.sprite.x, summon.sprite.y, summon.range || 500);
        if (target) {
          const projectile = this.fireProjectile(summon.sprite.x, summon.sprite.y, Phaser.Math.Angle.Between(summon.sprite.x, summon.sprite.y, target.x, target.y), summon.damage, summon.speed || 520, summon.pierce || 1, 1.1, summon.tint ?? 0x69e7c0);
          projectile?.setData({ source: summon.sprite, byAlly: true, status: summon.status || null });
        }
        summon.shot = summon.interval || .65;
      }
      summon.sprite.setAngle(Math.sin(this.elapsed * 5) * 5);
      return true;
    });
  }

  playerArtKey(){return `hero-${this.heroData.id}${this.facing==='side'?'':`-${this.facing}`}`;}

  spawnCompanion(id){return this.support.summon(id);}
  updateCompanion(dt){this.support.update(dt);}

  updateWorld() {
    this.floor.tilePositionX = this.cameras.main.scrollX;
    this.floor.tilePositionY = this.cameras.main.scrollY;
    if (this.decorTimer <= 0) {
      this.generateChunks();
      this.decorGroup.children.each((item) => {
        if (item?.active && Phaser.Math.Distance.Between(item.x, item.y, this.player.x, this.player.y) > 1800) item.destroy();
      });
      this.decorTimer = 2;
    }
  }

  updateHud() {
    this.hud.setStats({ ...this.stats, elapsed: this.elapsed,stamina:1-this.dash.cooldown/3.1 });
    if (this.activeBoss?.active) this.hud.setBoss(this.activeBoss.getData('displayName'), this.activeBoss.getData('hp') / this.activeBoss.getData('maxHp'));
  }

  autoAttack() {
    if(this.ended||this.pausedForChoice)return;
    const weapon = this.heroData.automatic;
    const cost = manaCost(this.stats, weapon.mana);
    const target = this.closestEnemy(this.player.x, this.player.y, weapon.range * this.stats.range);
    if (!target && this.settings.attackMode!=='manual') { this.autoTimer = .12; return; }
    if (this.stats.mana < cost) { this.autoTimer = .18; return; }
    this.stats.mana -= cost;
    const damage = weapon.damage * this.stats.damage * this.support.modifiers().damage;
    this.animateCharacter(this.player,this.playerArtKey(),'attack',.24);
    const angle = this.getAimAngle(target);
    if (weapon.type === 'melee') {
      this.attackCone(angle, weapon.range * this.stats.range, damage, Math.PI * .72, 210);
      this.playEffect(0,this.player.x+Math.cos(angle)*42,this.player.y+Math.sin(angle)*42,150,angle);
      this.damagePropsInArea(this.player.x + Math.cos(angle) * 45, this.player.y + Math.sin(angle) * 45, weapon.range);
      this.audio.sfx('slash', .08);
    } else {
      this.fireProjectile(this.player.x, this.player.y, angle, damage, 650, weapon.pierce || 1, 1.2, weapon.color);
      this.audio.sfx(this.heroData.id === 'kukul' ? 'dart' : 'spell', .07);
    }
    this.autoTimer = weapon.cooldown / (1 + this.stats.haste + this.support.modifiers().haste);
    this.passives.emit('basicAttack', { count: ++this.basicAttackCount, weapon, target });
  }

  castSkill(index) {
    if (this.ended || this.pausedForChoice || this.scene.isPaused()) return;
    const skill = this.skillSlots[index];
    if (!skill || skill.remaining > 0) return;
    const ctx = skillContext(this, skill);
    const mana = ctx.mana;
    if (mana && this.stats.mana < mana) { this.hud.toast('Not enough mana'); return; }
    this.stats.mana -= mana;
    this.animateCharacter(this.player,this.playerArtKey(),'attack',.28);
    const { damage, range, target, aim, tx, ty } = ctx;
    const handler = ACTIVE_HANDLERS[skill.id];
    if (handler) {
      handler(this, skill, ctx);
    } else {
      // LEGACY FALLBACK — TODO: remove in step 10, when the last hero is converted.
      switch (skill.type) {
        case 'projectile':
          for (let i = 0; i < ctx.projectiles; i += 1) this.fireProjectile(this.player.x, this.player.y, aim + (i - (ctx.projectiles - 1) / 2) * .13, damage, 720, skill.pierce || 1, 1.35 * ctx.durationScale, 0x69eec1, skill.critBonus || 0);
          break;
        case 'burst': {
          const count = ctx.projectiles;
          const radial = count >= 8;
          for (let i = 0; i < count; i += 1) {
            const angle = radial ? (i / count) * TAU : aim + (i - (count - 1) / 2) * .13;
            this.fireProjectile(this.player.x, this.player.y, angle, damage, 610, skill.pierce || 1, 1.25 * ctx.durationScale, 0x75e0b6);
          }
          break;
        }
        case 'nova':
          this.damageArea(this.player, range, damage, skill.knockback || 180);
          this.ringEffect(this.player.x, this.player.y, range / 64, 0x62e7b9);
          this.damagePropsInArea(this.player.x, this.player.y, range);
          break;
        case 'cone':
          this.attackCone(aim, range, damage, Math.PI * .72, skill.knockback || 170);
          this.coneEffect(aim, range);
          this.damagePropsInArea(this.player.x + Math.cos(aim) * range * .45, this.player.y + Math.sin(aim) * range * .45, range * .55);
          break;
        case 'line':
          for (let i = 0; i < ctx.projectiles; i += 1) this.fireProjectile(this.player.x, this.player.y, aim + (i - (ctx.projectiles - 1) / 2) * .13, damage, 770, skill.pierce || 12, 1.25 * ctx.durationScale, 0x8affd1, 0, 1.45);
          break;
        case 'orbit': {
          const count = ctx.projectiles;
          for (let i = 0; i < count; i += 1) this.fireProjectile(this.player.x, this.player.y, (i / count) * TAU + this.elapsed, damage, 330, 3, 1.4 * ctx.durationScale, 0xefc27a);
          this.stats.shield += 7 + skill.level * 3;
          break;
        }
        case 'trap':
          this.placeTrap(tx, ty, range, damage, ctx.durationScale);
          break;
        case 'heal': {
          const heal = (skill.heal || 24) * (1 + (skill.level - 1) * .2) * this.stats.healing;
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + heal);
          if (skill.shield) this.stats.shield += skill.shield;
          this.healEffect();
          break;
        }
        case 'shield':
          this.stats.shield += (skill.shield || 45) * (1 + (skill.level - 1) * .25);
          this.shieldEffect();
          break;
        case 'chain':
          this.chainAttack(target, range, damage, ctx.chains);
          break;
        case 'summon':
          this.createSummon(damage, { duration: 12 * ctx.durationScale });
          break;
        case 'dash':
          this.attackCone(aim, range, damage, Math.PI * .52, 260);
          this.forceDash(aim, .24 * ctx.durationScale);
          break;
        case 'rain':
          this.rainAttack(tx, ty, range, damage, ctx.projectiles);
          break;
        default: break;
      }
    }
    restoreSkillMana(this.stats, skill.restore);
    skill.remaining = ctx.cooldown;
    this.audio.sfx(this.heroData.id === 'kukul' ? 'dart' : 'spell', .06);
    this.passives.emit('skillCast', { skill, ctx });
  }

  getAimAngle(target) {
    if(this.settings.attackMode==='manual'&&this.manualPointer){const p=this.input.activePointer;return Phaser.Math.Angle.Between(this.player.x,this.player.y,p.worldX,p.worldY);}
    if (this.settings.autoAim !== false && target) return Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    if (this.lastMove.lengthSq() > .1) return Math.atan2(this.lastMove.y, this.lastMove.x);
    return target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y) : 0;
  }

  tryDash() {
    if (this.ended || this.pausedForChoice || this.dash.cooldown > 0) return;
    let vector = this.lastMove.clone();
    if (vector.lengthSq() < .1) {
      const target = this.closestEnemy(this.player.x, this.player.y, 500);
      vector = target ? new Phaser.Math.Vector2(target.x - this.player.x, target.y - this.player.y).normalize() : new Phaser.Math.Vector2(1, 0);
    }
    this.dash.x = vector.x; this.dash.y = vector.y;
    this.dash.remaining = .19;
    this.dash.cooldown = 3.1;
    this.invulnerable = Math.max(this.invulnerable, .28);
    if (this.hasGear('woven-sandals')) {
      this.playEffect(4,this.player.x,this.player.y,140);
      this.damageArea(this.player, 92, 32 * this.stats.damage, 120);
    }
    this.audio.sfx('dash', .05);
    this.playEffect(4,this.player.x,this.player.y,110);
  }

  forceDash(angle, duration) {
    this.dash.x = Math.cos(angle); this.dash.y = Math.sin(angle);
    this.dash.remaining = duration;
    this.invulnerable = Math.max(this.invulnerable, duration + .06);
  }

  fireProjectile(x, y, angle, damage, speed = 620, pierce = 1, life = 1.2, tint = 0x69eec1, critBonus = 0, scale = 1, visual='default') {
    const isDart=visual==='dart'||(visual==='default'&&this.heroData.id==='kukul');
    const projectile = this.projectiles.get(x, y, isDart?'player-dart':'fx-1');
    if (!projectile) return null;
    projectile.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(16);
    projectile.anims.stop();
    projectile.setTexture(isDart?'player-dart':'fx-1');
    applyProjectileTint(projectile, tint);
    projectile.setRotation(angle+(isDart?Math.PI/4:0)).setDisplaySize((isDart?44:54)*scale,(isDart?44:54)*scale);
    if(!isDart) projectile.play('bolt-1');
    projectile.body.setCircle(18,46,46);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.setData({ damage, pierce, life, critBonus, hit: new Set(), source: this.player, byAlly: false, status: null, onHit: null });
    return projectile;
  }

  spawnEnemyProjectile(x, y, angle, speed, damage, source = null) {
    const projectile = this.enemyProjectiles.get(x, y, 'fx-5');
    if (!projectile) return;
    projectile.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(15);
    projectile.setDisplaySize(42,42).setRotation(angle).play('bolt-5');
    projectile.body.setCircle(21,43,43);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.setData({ damage, life: 4, source });
    return projectile;
  }

  onEnemyProjectileHit(projectile) {
    if (!projectile.active || this.stats.intangibleUntil > this.elapsed) return;
    if (this.stats.reflectUntil > this.elapsed) {
      const velocity = projectile.body.velocity;
      const reflected = this.fireProjectile(projectile.x, projectile.y, Math.atan2(-velocity.y, -velocity.x),
        (projectile.getData('damage') || 8) * 1.5, Math.hypot(velocity.x, velocity.y), 1, projectile.getData('life'), 0xb58cff);
      // Retain the enemy shot if the player projectile pool cannot accept the reflection.
      if (!reflected) return;
    } else {
      this.damagePlayer(projectile.getData('damage') || 8, projectile.x, projectile.y, projectile.getData('source') || projectile);
    }
    projectile.destroy();
  }

  onProjectileHit(projectile, enemy) {
    if (!projectile.active || !enemy.active) return;
    const hit = projectile.getData('hit');
    if (hit?.has(enemy.getData('serial'))) return;
    hit?.add(enemy.getData('serial'));
    this.damageEnemy(enemy, projectile.getData('damage'), projectile.getData('critBonus') || 0, 75,
      projectile.getData('source') || this.player, { byAlly: projectile.getData('byAlly') });
    if (enemy.active && projectile.getData('status')) {
      const status = projectile.getData('status');
      applyStatus(this, enemy, status.id, status.duration, { source: projectile.getData('source') || this.player,
        byAlly: projectile.getData('byAlly') ?? false, ...status.params });
    }
    projectile.getData('onHit')?.(enemy);
    this.consumeProjectile(projectile);
  }

  consumeProjectile(projectile) {
    const left = (projectile.getData('pierce') || 1) - 1;
    projectile.setData('pierce', left);
    if (left <= 0) projectile.destroy();
  }

  attackCone(angle, range, damage, width, knockback = 0) {
    this.enemies.children.each((enemy) => {
      if (!enemy?.active) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > range) return;
      const targetAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (Math.abs(Phaser.Math.Angle.Wrap(targetAngle - angle)) <= width / 2) this.damageEnemy(enemy, damage, 0, knockback);
    });
  }

  damageArea(origin, range, damage, knockback = 0, affectEnemies = true) {
    if (!affectEnemies) return;
    this.enemies.children.each((enemy) => {
      if (enemy?.active && Phaser.Math.Distance.Between(origin.x, origin.y, enemy.x, enemy.y) <= range) this.damageEnemy(enemy, damage, 0, knockback, origin);
    });
  }

  chainAttack(target, range, damage, count) {
    performChainAttack(this, target, range, damage, count);
  }

  placeTrap(x, y, range, damage, durationScale = 1) {
    const trap = this.add.image(x, y, 'trap').setDepth(7).setAlpha(.82).setScale(.7);
    this.tweens.add({ targets: trap, scale: range / 64, alpha: .35, duration: 620 * durationScale, yoyo: true, onComplete: () => {
      this.damageArea({ x, y }, range, damage, 230);
      this.damagePropsInArea(x, y, range);
      this.ringEffect(x, y, range / 64, 0xefc27a);
      trap.destroy();
    }});
  }

  rainAttack(x, y, range, damage, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const radius = Math.sqrt(Math.random()) * range;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      const marker = this.add.circle(px, py, 11, 0x67dfb2, .3).setDepth(6);
      this.tweens.add({ targets: marker, scale: 1.8, alpha: .75, duration: 180 + i * 35, onComplete: () => {
        this.playEffect(2,px,py,100);
        this.enemies.children.each((enemy) => {
          if (enemy?.active && Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y) < 46) this.damageEnemy(enemy, damage, 0, 70, { x: px, y: py });
        });
        marker.destroy();
      }});
    }
  }

  createSummon(damage, options = {}) {
    const angle = Math.random() * TAU;
    const origin = options.origin || this.player;
    const sprite = this.add.image(origin.x + Math.cos(angle) * 65, origin.y + Math.sin(angle) * 65, options.texture || 'summon').setDisplaySize(70,70).setDepth(14);
    sprite.setData('byAlly', true);
    if (options.tint !== undefined) sprite.setTint(options.tint);
    this.playEffect(4,sprite.x,sprite.y,100);
    const summoned = { ...options, sprite, damage, life: options.duration ?? 12, shot: .15 };
    this.summons.push(summoned);
    return summoned;
  }

  damageEnemy(enemy, rawDamage, critBonus = 0, knockback = 0, origin = this.player, options = {}) {
    if (!enemy?.active || rawDamage <= 0) return;
    const byAlly = options.byAlly ?? Boolean(origin?.getData?.('byAlly'));
    const crit = !options.dot && Math.random() < this.stats.crit + critBonus;
    const damage = rawDamage * (crit ? this.stats.critDamage : 1) * (enemy.getData('markUntil')>this.elapsed?1+enemy.getData('markBonus'):1);
    const hp = enemy.getData('hp') - damage;
    enemy.setData('hp', hp);
    this.stats.damageDone += damage;
    if (!byAlly && this.stats.lifestealPct > 0) this.stats.hp = Math.min(this.stats.maxHp,
      this.stats.hp + Math.min(damage, Math.max(0, hp + damage)) * this.stats.lifestealPct * this.stats.healing);
    const event = { enemy, damage, source: origin, byAlly, dot: Boolean(options.dot) };
    this.passives.emit('hit', event);
    if (crit) this.passives.emit('crit', event);
    if (options.visuals !== false) {
      this.animateCharacter(enemy,enemy.getData('artKey'),'hurt',.16);
      if(this.settings.particles!=='low'||crit) this.playEffect(2,enemy.x,enemy.y,crit?62:38);
      enemy.setTint(crit ? 0xffe294 : 0xd5fff1);
      this.time.delayedCall(65, () => enemy?.active && (enemy.getData('burnUntil') > this.elapsed ? enemy.setTint(0xff8a36) : enemy.clearTint()));
      if (knockback && enemy.body) {
        const angle = Phaser.Math.Angle.Between(origin.x, origin.y, enemy.x, enemy.y);
        enemy.body.velocity.x += Math.cos(angle) * knockback;
        enemy.body.velocity.y += Math.sin(angle) * knockback;
      }
      if (this.settings.damageNumbers && (crit || damage >= 45)) this.floatText(enemy.x, enemy.y - 18, `${crit ? '✦ ' : ''}${Math.round(damage)}`, crit ? '#ffd77b' : '#d2fff0');
    }
    if (enemy.getData('hp') <= 0) this.killEnemy(enemy, byAlly);
  }

  killEnemy(enemy, byAlly = false) {
    if (!enemy.active) return;
    const x = enemy.x; const y = enemy.y;
    const isBoss = enemy.getData('isBoss');
    this.playEffect(2,x,y,isBoss?190:68);
    const bossId = enemy.getData('bossId');
    const xp = enemy.getData('xp') || 5;
    enemy.disableBody(true, true);
    this.stats.kills += 1;
    this.passives.emit('kill', { enemy, byAlly });
    if (isBoss) {
      this.activeBoss = null;
      this.hud.clearBoss();
      for (let i = 0; i < 8; i += 1) this.spawnPickup('cacao', x + Phaser.Math.Between(-55, 55), y + Phaser.Math.Between(-55, 55), 3);
      if (bossId === 'ahpuch') {
        this.audio.sfx('victory');
        this.time.delayedCall(900, () => this.finishRun(true));
      } else {
        this.grantBossReward(bossId);
      }
    } else {
      this.spawnPickup('xp', x, y, xp);
      const cacaoChance = .055 * (1 + this.stats.fortune);
      if (Math.random() < cacaoChance) this.spawnPickup('cacao', x + 5, y - 3, 1);
      if (Math.random() < .007) this.spawnPickup('potion', x - 4, y + 4, 16);
    }
  }

  damagePlayer(rawDamage, sourceX, sourceY, source = null, melee = false) {
    if (this.invulnerable > 0 || this.stats.intangibleUntil > this.elapsed || this.ended || this.pausedForChoice) return;
    if (this.stats.dodgeCharges > 0) {
      this.stats.dodgeCharges -= 1;
      this.invulnerable = .58;
      this.playEffect(4, this.player.x, this.player.y, 60);
      return;
    }
    if (melee && source?.active && this.stats.reflectUntil > this.elapsed) this.damageEnemy(source, 15);
    this.hitCount += 1;
    const buffs=this.support.modifiers();
    let damage = Math.max(1, rawDamage - (this.stats.armor+buffs.armor) * .72)*(1-buffs.reduction);
    if (this.hasGear('jaguar-vest') && this.hitCount % 7 === 0) damage = 1;
    damage *= this.stats.damageTakenMult;
    if (this.stats.shield > 0) {
      const blocked = Math.min(this.stats.shield, damage);
      this.stats.shield -= blocked;
      damage -= blocked;
      if (damage <= 0) this.floatText(this.player.x, this.player.y - 28, 'WARD', '#78e4c0');
    }
    if (damage > 0) {
      damage=this.support.preventFatal(damage);
      this.stats.hp -= damage;
      this.stats.damageTaken += damage;
      if (damage > 0) this.passives.emit('damageTaken', { amount: damage, source: source || { x: sourceX, y: sourceY }, melee });
      this.floatText(this.player.x, this.player.y - 25, `-${Math.ceil(damage)}`, '#ff7077');
    }
    this.invulnerable = .58;
    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.player.x, this.player.y);
    this.player.body.velocity.x += Math.cos(angle) * 260;
    this.player.body.velocity.y += Math.sin(angle) * 260;
    this.animateCharacter(this.player,this.playerArtKey(),'hurt',.22);
    this.playEffect(3,this.player.x,this.player.y,94);
    this.player.setTint(0xff7b7d);
    this.time.delayedCall(110, () => this.player?.active && this.player.clearTint());
    if (this.settings.screenShake) this.cameras.main.shake(90, .004);
    this.audio.sfx('hurt', .08);
    if (this.stats.hp <= 0) this.finishRun(false);
  }

  touchEnemy(enemy) {
    if (!enemy?.active || !canEnemyAttack(this, enemy, true)) return;
    this.damagePlayer((enemy.getData('damage') || 8) * enemyDamageMult(this, enemy), enemy.x, enemy.y, enemy, true);
  }

  spawnEnemy(forcedType, forcedRadius) {
    const progress = this.elapsed / this.modeData.duration;
    if(forcedType&&!canSpawnEnemy(this.heroData,forcedType))return null;
    const available = enemyPool(this.heroData,this.stats.level,progress);
    const weighted = available.flatMap((id) => Array(ENEMIES[id].weight).fill(id));
    const type = forcedType || Phaser.Utils.Array.GetRandom(weighted);
    const data = ENEMIES[type];
    const position=spawnOutsideView(this.cameras.main.worldView);
    // Explicit radii are reserved for summons/boss abilities and automated QA.
    if(forcedRadius){const angle=Math.random()*TAU;position.x=this.player.x+Math.cos(angle)*forcedRadius;position.y=this.player.y+Math.sin(angle)*forcedRadius;}
    const {x,y}=position;
    const enemy = this.enemies.get(x, y, `enemy-${type}`);
    if (!enemy) return;
    const scale = this.mapData.difficulty * (1 + progress * .95);
    enemy.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(12).setScale(type==='bat'?.48:.56);
    enemy.anims.stop();
    enemy.setTexture(`enemy-${type}`).clearTint();
    enemy.body.setCircle(25,39,48);
    enemy.setData({
      type, artKey:`enemy-${type}`,animLock:0, serial: ++this.enemySerial, seed: Math.random() * 20,
      hp: data.hp * scale, maxHp: data.hp * scale,
      speed: data.speed * (1 + progress * .16), damage: data.damage * this.mapData.difficulty * (1 + progress * .38), xp: data.xp,
      ranged: data.ranged || false, nextShot: 1 + Math.random(), isBoss: false,
      ...enemyStatusDefaults(),
    });
  }

  spawnBoss(data) {
    if (this.activeBoss || this.ended) return;
    data=bossForHero(this.heroData,data);
    const {x,y}=spawnOutsideView(this.cameras.main.worldView,Math.random,120);
    const artKey=data.artKey||`boss-${data.id}`;
    const boss = this.enemies.get(x, y, artKey);
    if (!boss) return;
    const hpScale = this.mapData.difficulty * (this.modeData.id === 'full' ? 1.18 : 1);
    boss.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(13).setScale(data.id==='ahpuch'?1.65:1.35);
    boss.anims.stop();
    boss.setTexture(artKey).clearTint();
    boss.body.setCircle(24,40,44);
    boss.setData({
      artKey,animLock:0,serial: ++this.enemySerial, isBoss: true, bossId: data.id, displayName: data.name,
      hp: data.hp * hpScale, maxHp: data.hp * hpScale, speed: data.speed, damage: data.damage * this.mapData.difficulty,
      xp: 100, pattern: data.pattern, patternTimer: 1.5, seed: Math.random() * 20,
      ...enemyStatusDefaults(), dashing: 0,
    });
    this.activeBoss = boss;
    this.hud.setBoss(data.name, 1);
    this.hud.toast(data.name);
    this.audio.music('boss');
    this.audio.sfx('boss');
  }

  grantBossReward(bossId) {
    if(this.pausedForChoice){this.pendingBossRewards.push(bossId);return;}
    const availableGear = GEAR.filter((item) => !this.gear.some((owned) => owned.id === item.id));
    if (availableGear.length) {
      const gear = Phaser.Utils.Array.GetRandom(availableGear);
      this.gear.push(gear);
      this.applyGear(gear);
      this.hud.toast(`${gear.icon} ${gear.name} equipped`);
    }
    this.pauseForSelection();
    const cards = this.getSkillChoices(true);
    const show=()=>this.hud.showChoice('Boss Defeated',cards,card=>this.applyChoice(card,()=>{this.audio.music(this.mapData.music);this.finishSelection();},show),'Boss reward: choose a skill upgrade.');
    show();
  }

  applyGear(gear) {
    const a = gear.apply;
    if (a.healing) this.stats.healing += a.healing;
    if (a.critDamage) this.stats.critDamage += a.critDamage;
    if (a.area) this.stats.range += a.area;
  }

  hasGear(id) {
    return this.gear.some((item) => item.id === id);
  }

  collectPickup(pickup) {
    if (!pickup.active||this.pausedForChoice||this.ended) return;
    this.playEffect(4,pickup.x,pickup.y,pickup.getData('kind')==='xp'?42:78);
    const kind = pickup.getData('kind');
    const value = pickup.getData('value') || 1;
    if (kind === 'xp') {
      this.stats.xp += value * this.stats.xpGain;
      this.audio.sfx('pickup', .09);
      pickup.destroy();
    } else if (kind === 'cacao') {
      this.stats.cacao += Math.max(1, Math.round(value * (1 + this.stats.fortune)));
      this.audio.sfx('cacao', .08);
      pickup.destroy();
    } else if (kind === 'potion') {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + value * this.stats.healing);
      this.audio.sfx('pickup');
      this.healEffect();
      pickup.destroy();
    }
    if (['xp', 'cacao', 'potion'].includes(kind)) this.passives.emit('pickup', { kind, value });
    if (kind === 'xp') this.checkLevelUp();
  }

  spawnPickup(kind, x, y, value) {
    const texture = kind === 'xp' ? 'xp-gem' : kind;
    const pickup = this.pickups.get(x, y, texture);
    if (!pickup) return;
    pickup.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(10).setTexture(texture).setDisplaySize(kind === 'xp' ? 20 : 30,kind === 'xp' ? 20 : 30);
    pickup.body.setCircle(42,6,6);
    pickup.setData({ kind, value });
    const size=kind==='xp'?34:48;
    const bubble=this.add.image(x,y,'pickup-bubble').setDisplaySize(size,size).setDepth(9).setTint(kind==='potion'?0xffaca0:kind==='cacao'?0xffdc79:0x89ffdb);
    pickup.setData({bubble,bubbleSize:size,phase:Math.random()*TAU});
    pickup.once('destroy',()=>bubble.destroy());
  }

  checkLevelUp() {
    while (this.stats.xp >= this.stats.nextXp) {
      this.stats.xp -= this.stats.nextXp;
      this.stats.level += 1;
      this.stats.nextXp = Math.round(18 + this.stats.level * 11 + Math.pow(this.stats.level, 1.25) * 2.5);
      this.pendingLevelUps += 1;
    }
    if (this.pendingLevelUps > 0 && !this.pausedForChoice) this.showLevelChoice();
  }

  showLevelChoice() {
    const earnedLevel=this.stats.level-this.pendingLevelUps+1;
    this.pendingLevelUps -= 1;
    this.pauseForSelection();
    this.audio.sfx('level');
    const cards = this.getSkillChoices(false);
    const supportStep=()=>{
      if(earnedLevel>=ALLY_LEVEL&&!this.companion)this.support.chooseClass(()=>{this.support.syncLevel(earnedLevel);this.finishSelection();});
      else if(this.companion){this.support.syncLevel(earnedLevel);this.support.offerChange(()=>this.finishSelection());}
      else this.finishSelection();
    };
    const show=()=>this.hud.showChoice(`Level ${earnedLevel}`,cards,card=>this.applyChoice(card,supportStep,show));
    show();
  }

  pauseForSelection(){this.pausedForChoice=true;this.physics.pause();this.tweens.pauseAll();this.time.paused=true;this.releaseAttack();this.hud.move={x:0,y:0};}
  finishSelection(){
    if(this.ended)return;
    if(this.pendingLevelUps>0){this.showLevelChoice();return;}
    if(this.pendingBossRewards.length){this.pausedForChoice=false;this.grantBossReward(this.pendingBossRewards.shift());return;}
    this.pausedForChoice=false;this.physics.resume();this.tweens.resumeAll();this.time.paused=false;
  }
  showSupportLoadout(){
    if(!this.companion||this.pausedForChoice||this.ended)return;
    this.pauseForSelection();
    // Review the active loadout; changes are earned at level-up, not free rerolls.
    this.hud.showChoice('Support Loadout',this.companion.skills.map(k=>({...k,name:t('{name} · Lv {n}',{name:t(k.name),n:k.level})})),()=>this.finishSelection(),'Support skills level up automatically with your hero.',{label:'Resume',action:()=>this.finishSelection()});
  }

  getSkillChoices(bossReward) {
    return draftSkills(this.heroData.skills,this.skillSlots,HERO_SKILL_CAPACITY,shuffle,MODIFIERS,bossReward);
  }

  applyChoice(card,onDone=()=>{},onCancel=()=>this.finishSelection()) {
    if(card.choiceType==='replace-skill'||(card.choiceType==='new-skill'&&this.skillSlots.length>=HERO_SKILL_CAPACITY)){
      this.hud.showChoice('Choose a skill to replace',this.skillSlots,(_,index)=>{
        this.skillSlots[index]={...this.heroData.skills.find(s=>s.id===card.id),level:1,remaining:0};
        this.hud.setSkills(this.skillSlots);onDone();
      },'The new hero skill starts at level 1.',{label:'Cancel',action:onCancel});return;
    }
    if (card.choiceType === 'new-skill') {
      if(!this.skillSlots.some(s=>s.id===card.id))this.skillSlots.push({ ...card, level: 1, remaining: 0 });
    } else if (card.choiceType === 'skill-upgrade') {
      const existing = this.skillSlots.find((entry) => entry.id === card.id);
      if (existing) existing.level = Math.min(6, existing.level + 1);
    } else {
      this.applyModifier(card);
    }
    this.hud.setSkills(this.skillSlots);
    onDone();
  }

  applyModifier(card) {
    const { stat, amount } = card;
    if (stat === 'damage') this.stats.damage += amount;
    else if (stat === 'maxHp') { this.stats.maxHp += amount; this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount); }
    else if (stat === 'speed') this.stats.speed *= 1 + amount;
    else if (stat === 'haste') this.stats.haste += amount;
    else if (stat === 'range') this.stats.range += amount;
    else if (stat === 'crit') this.stats.crit += amount;
    else if (stat === 'armor') this.stats.armor += amount;
    else if (stat === 'regen') this.stats.regen += amount;
    else if (stat === 'xpGain') this.stats.xpGain += amount;
    else if (stat === 'fortune') this.stats.fortune += amount;
  }

  generateChunks() {
    const size = 620;
    const cx = Math.floor(this.player.x / size);
    const cy = Math.floor(this.player.y / size);
    for (let oy = -2; oy <= 2; oy += 1) for (let ox = -2; ox <= 2; ox += 1) {
      const x = cx + ox; const y = cy + oy; const key = `${x},${y}`;
      if (this.chunks.has(key)) continue;
      this.chunks.add(key);
      const seed = Math.abs((x * 73856093) ^ (y * 19349663) ^ 83492791);
      let rng=seed>>>0;
      const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
      const count = 7 + (seed % 5);
      for (let i = 0; i < count; i += 1) {
        const px = x * size + random() * (size - 80) + 40;
        const py = y * size + random() * (size - 80) + 40;
        const texture = ['top-stela','top-ruin','top-palm','top-foliage','top-roots',this.mapData.id==='cenote'?'top-crystal':'top-tree','top-rocks','top-temple'][(seed+i)%8];
        const sizeRanges={'top-temple':[.9,1.6],'top-tree':[.65,1.25],'top-palm':[.65,1.3],'top-rocks':[.3,.95],'top-foliage':[.25,.7],'top-roots':[.4,.9],'top-stela':[.45,.9],'top-ruin':[.55,1.15],'top-crystal':[.4,.85]};
        const [min,max]=sizeRanges[texture];const scale=min+random()*(max-min);
        const item = this.add.image(px, py, texture).setDepth(3).setScale(scale).setFlipX(random()>.5);
        this.decorGroup.add(item);
      }
      if (seed % 3 === 0) {
        const type = seed % 2 ? 'urn' : 'basket';
        const prop = this.props.create(x * size + (seed % 440) + 90, y * size + ((seed >> 3) % 430) + 95, type).setDepth(9).setScale(.36);
        prop.setData({ hp: 24, kind: type });
        prop.refreshBody();
      }
    }
  }

  damagePropsInArea(x, y, range) {
    this.props.children.each((prop) => {
      if (prop?.active && Phaser.Math.Distance.Between(x, y, prop.x, prop.y) <= range) this.damageProp(prop, 30);
    });
  }

  damageProp(prop, amount) {
    if (!prop?.active) return;
    const hp = (prop.getData('hp') || 20) - amount;
    prop.setData('hp', hp);
    prop.setTintFill(0xffd89a);
    this.time.delayedCall(80, () => prop?.active && prop.clearTint());
    if (hp > 0) return;
    const x = prop.x; const y = prop.y;
    prop.destroy();
    const rolls = 1 + (Math.random() < .28 ? 1 : 0);
    for (let i = 0; i < rolls; i += 1) this.spawnPickup('cacao', x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), 1);
    if (Math.random() < .2) this.spawnPickup('potion', x + 8, y, 18);
    this.audio.sfx('hit', .12);
  }

  closestEnemy(x, y, range) {
    let best = null; let bestDistance = range;
    this.enemies.children.each((enemy) => {
      if (!enemy?.active) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance < bestDistance) { best = enemy; bestDistance = distance; }
    });
    return best;
  }

  floatText(x, y, text, color) {
    const label = this.add.text(x, y, t(text), { fontFamily: getLanguage()==='ar'?'LatinDigits, Unixel':'Pixelify', fontSize: '20px', fontStyle: 'bold', color, stroke: '#201019', strokeThickness: 4 }).setOrigin(.5).setDepth(50);
    this.tweens.add({ targets: label, y: y - 34, alpha: 0, duration: 680, onComplete: () => label.destroy() });
  }

  ringEffect(x, y, scale, tint) {
    performRingEffect(this, x, y, scale, tint);
  }

  coneEffect(angle, range) {
    this.playEffect(0,this.player.x+Math.cos(angle)*range*.3,this.player.y+Math.sin(angle)*range*.3,range*1.5,angle);
  }

  shieldEffect() {
    this.playEffect(4,this.player.x,this.player.y,120);
  }

  healEffect() {
    this.playEffect(2,this.player.x,this.player.y,100);
  }

  playEffect(row,x,y,size=100,angle=0,tint) {
    if(this.effects.countActive()> (this.settings.particles==='low'?20:65)) return;
    const effect=this.add.sprite(x,y,`fx-${row}`).setDepth(24).setDisplaySize(size,size).setRotation(angle);
    if(tint!==undefined&&tint!==null)effect.setTint(tint);
    this.effects.add(effect);
    effect.play(`effect-${row}`);
    effect.once('animationcomplete',()=>effect.destroy());
    return effect;
  }

  animateCharacter(sprite,key,state,lock=0) {
    if(!sprite?.active||!key)return;
    if(!lock && (sprite.getData('animLock')||0)>this.elapsed)return;
    if(lock)sprite.setData('animLock',this.elapsed+lock);
    sprite.play(`${key}-${state}`,true);
  }

  bossTelegraph(x, y, radius, color, callback) {
    const marker = this.add.circle(x, y, radius, color, .1).setStrokeStyle(4, color, .8).setDepth(5).setScale(.25);
    this.tweens.add({ targets: marker, scale: 1, alpha: .58, duration: 620, onComplete: () => {
      callback?.();
      this.tweens.add({ targets: marker, scale: 1.15, alpha: 0, duration: 180, onComplete: () => marker.destroy() });
    }});
  }

  togglePause() {
    if (this.ended || this.pausedForChoice) return;
    this.pausedForChoice = true;
    this.physics.pause();
    this.tweens.pauseAll();
    this.time.paused=true;
    this.hud.showPause(() => {
      this.pausedForChoice = false;
      this.physics.resume();
      this.tweens.resumeAll();
      this.time.paused=false;
    }, () => this.finishRun(false, true));
  }

  finishRun(victory, abandoned = false) {
    if (this.ended) return;
    this.ended = true;
    this.tweens.pauseAll();
    this.time.paused=false;
    this.physics.pause();
    if (!victory) this.audio.sfx('defeat');
    const summary = {
      victory,
      abandoned,
      survived: Math.min(this.elapsed, this.modeData.duration),
      cacao: this.stats.cacao,
      kills: this.stats.kills,
      level: this.stats.level,
      damage: Math.round(this.stats.damageDone),
      damageTaken: Math.round(this.stats.damageTaken),
      heroId: this.heroData.id,
      heroName: this.heroData.name,
      mapId: this.mapData.id,
      mapName: this.mapData.name,
      modeId: this.modeData.id,
      gear: this.gear,
    };
    this.time.delayedCall(250, () => this.options.onEnd(summary));
  }

  cleanup() {
    if (this.cleaned) return;
    this.cleaned = true;
    window.removeEventListener('pointerup',this.releaseAttack);
    window.removeEventListener('blur',this.releaseAttack);
    this.passives?.destroy();
    this.skillEffects?.forEach((effect) => effect.destroy());
    this.hud?.destroy();
  }
}

