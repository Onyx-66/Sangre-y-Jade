import Phaser from 'phaser';
import { attachRunAudio } from '../audio/runAudio.js';
import { t } from '../i18n/index.js';
import { gameTextStyle } from '../ui/Typography.js';
import { buildTextures, preloadTextures } from '../art/TextureFactory.js';
import { ENEMIES, BOSSES, GEAR } from '../data/world.js';
import { MODIFIERS } from '../data/heroes.js';
import { Hud } from '../systems/Hud.js';
import { ALLY_LEVEL, enemyPool, canSpawnEnemy, bossForHero, spawnOutsideView, facingFor } from '../systems/CombatRules.js';
import { SLOT_RULES, slotCount, draftSkills, draftMilestoneSkills, replacementKinds, draftReplacements } from '../systems/SkillDraft.js';
import { SupportSystem } from '../systems/SupportSystem.js';
import { allyLevelEvent, dangerousEnemy } from '../data/supports.js';
import { applyProjectileTint, chainAttack as performChainAttack, restoreSkillMana, ringEffect as performRingEffect } from '../systems/SkillCombat.js';
import { ACTIVE_HANDLERS, INNATE_PASSIVES } from '../skills/index.js';
import { PassiveSystem } from '../skills/PassiveSystem.js';
import { skillContext, skillCooldown, manaCost, updateSkillEffects, applyStatus } from '../skills/common.js';
import { HERO_EFFECT_DEFAULTS, enemyStatusDefaults, updateEnemy, canEnemyAttack, enemyDamageMult, enemyShotAngle } from '../skills/StatusEffects.js';
import { FxDirector } from '../fx/FxDirector.js';
import '../fx/recipes/balam.js';
import { IXCHEL_FX_IDS } from '../fx/recipes/ixchel.js';
import '../fx/recipes/kukul.js';
import { decorateEnemyProjectile } from '../fx/recipes/enemies.js';
import { ENEMY_EFFECT_IDS } from '../art/enemyVisuals.js';
import { BOSS_FX_IDS,bossBodyCircle } from '../art/bossVisuals.js';
import { BossVisualSystem } from '../systems/BossVisualSystem.js';
import '../fx/recipes/bosses.js';
import { EnemyVisualSystem } from '../systems/EnemyVisualSystem.js';
import { decorateIxchelProjectile } from '../fx/ixchelStages.js';
import { SkillAudio } from '../systems/SkillAudio.js';
import { skillModifiers, inMirrorArc } from '../skills/balam/runtime.js';
import { configureProjectile } from '../skills/kukul/projectiles.js';
import { wantsToMove, cancelFocus, consumePlume, fullQuiverCount } from '../skills/kukul/runtime.js';
import { worldView,resizeCamera,retentionRadius,shakePixels,resizeScreenOverlay,PICKUP_MAGNET_RANGE,GROUND_OVERSCAN } from '../systems/Viewport.js';
import { EnemyHealthBars } from '../systems/EnemyHealthBars.js';
import { Telegraph } from '../systems/Telegraph.js';
import { SpawnDirector } from '../systems/SpawnDirector.js';
import { enemyAffixDefaults, rollAffix, applyAffix, frontalDamageMult, absorbEnemyShield, updateEnemyShield, healVampiric } from '../systems/EnemyAffixes.js';
import { EnemyBehaviorSystem, ENEMY_ART_FALLBACK, rosterDamageMult, PRIORITY_ENEMIES, enemyBehaviorDefaults } from '../systems/EnemyBehaviorSystem.js';
import { BossController, bossStateDefaults } from '../systems/BossController.js';
import { CutsceneDirector } from '../systems/CutsceneDirector.js';
import { BossPresentation } from '../ui/BossPresentation.js';
import { BOSS_FAIRNESS, bossDamage } from '../bosses/rules.js';
import { MapWorld, waterSpeedMultiplier } from '../maps/MapWorld.js';
import { WeatherDirector } from '../weather/WeatherDirector.js';
import { depthBandName, effectDepth, objectBaseY, setWorldDepth, weatherBackdropDepth, backgroundDepth } from '../render/layers.js';
import { PlayerOcclusion } from '../render/PlayerOcclusion.js';
import { WaterSystem } from '../world/WaterSystem.js';

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

  preload() {
    if(this.options.loading)return;
    preloadTextures(this,{hero:this.options.hero,map:this.options.map});
    const hero=this.options.hero;
    const ids=[...(hero.skills||[]),...(hero.passives||[]),{id:'survivors-will'},{id:'jade-bounty'}].map(skill=>skill.id);
    if(hero.id==='ixchel')ids.push(...IXCHEL_FX_IDS);
    FxDirector.preload(this,[...ids,...ENEMY_EFFECT_IDS,...BOSS_FX_IDS]);
  }

  create() {
    const { hero, map, mode, meta, settings, audio, uiRoot } = this.options;
    this.heroData = hero;
    this.mapData = map;
    this.modeData = mode;
    this.settings = settings;
    this.audio = audio;
    attachRunAudio(this);
    this.meta = meta;
    this.ended = false;
    this.pausedForChoice = false;
    this.loadingRun = Boolean(this.options.loading);
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
    this.passiveSlots = [];
    this.completedSkillMilestones = new Set();
    this.loadoutLevel = 1;
    this.summons = [];
    this.skillEffects = [];
    this.cleaned=false;
    this.skillBuffs=new Map();
    this.eagleFocus=this.plumeGuard=null;
    this.skillMotion=this.jaguarEcho=this.balamWard=this.blackMirror=null;
    this.knockbackImmuneUntil=0;
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
    this.fx=new FxDirector(this);
    this.skillAudio=this.options.loading?.skillAudio||new SkillAudio(audio);
    this.options.loading?.progress.set('world',.1);
    const worldWidth=map.size?.width||6400,worldHeight=map.size?.height||4800,wall=map.kit?.world.wallThickness||400;
    this.physics.world.setBounds(-worldWidth/2+wall,-worldHeight/2+wall,worldWidth-wall*2,worldHeight-wall*2);
    this.cameras.main.setBounds(-worldWidth/2,-worldHeight/2,worldWidth,worldHeight);
    this.cameras.main.setBackgroundColor(map.colors.ground);
    this.cameras.main.roundPixels = true;
    this.createWorld();
    this.createGroups();
    this.mapWorld=new MapWorld(this,{map,seed:this.options.loading?.mapData?.seed||this.options.seed||83492791});
    this.telegraphs=new Telegraph(this);
    this.enemyBars=new EnemyHealthBars(this);
    this.spawnDirector=new SpawnDirector(this);
    this.enemySystem=new EnemyBehaviorSystem(this);
    this.enemyVisuals=new EnemyVisualSystem(this);
    this.bossVisuals=new BossVisualSystem(this);
    this.options.loading?.progress.set('world',.35);
    this.createPlayer();
    this.playerOcclusion = new PlayerOcclusion(this);
    this.debugDepth = new URLSearchParams(window.location.search).get('debug') === 'depth';
    this.options.loading?.progress.set('world',.7);
    this.resizeViewport(this.scale.gameSize);
    this.weather=new WeatherDirector(this,{mapId:map.id,seed:this.mapWorld.seed});
    this.onViewportResize=size=>this.resizeViewport(size);
    this.scale.on('resize',this.onViewportResize);
    this.createInput();
    this.createCollisions();
    this.hud = new Hud(uiRoot, settings, {
      skill: (index) => this.castSkill(index),
      dash: () => this.tryDash(),
      pause: () => this.togglePause(),
      support:()=>this.showSupportLoadout(),
      uiSound:name=>this.skillAudio.ui(name),
      settingsSound:id=>{this.audio.unlock?.();if(this.audio.ui)this.audio.ui(id||'button-primary');else this.audio.sfx('click',.04);},
      hudLayouts: this.options.hudLayouts,
      attack:()=>{if(this.settings.attackMode==='manual' && this.autoTimer<=0 && !this.pausedForChoice)this.autoAttack();},
    });
    this.hud.setHero(hero);
    this.water = new WaterSystem(this);
    this.bossPresentation = new BossPresentation(this);
    this.bossController = new BossController(this);
    this.cutscenes = new CutsceneDirector(this);
    this.hud.setSkills(this.skillSlots, slotCount('active', this.loadoutLevel));
    this.refreshPassiveHud();
    this.hud.toast(`${map.name} · ${mode.name}`);
    if(this.loadingRun){this.time.paused=true;this.physics.pause();this.updateHud();this.options.loading.progress.set('world',.8);this.options.loading.onSceneReady(this);}
    else this.audio.music(map.music);
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
  }

  createWorld() {
    const width=this.mapData.size?.width||6400,height=this.mapData.size?.height||4800;
    this.floor = this.add.tileSprite(0, 0, width, height, 'ground')
      .setOrigin(.5).setDepth(backgroundDepth());
    if(this.mapData.id === 'bloodmoon') this.floor.setTint(0x956789);
    if(this.mapData.id === 'cenote') this.floor.setTint(0x568eaf);
    // Keep the persistent map haze below the Telegraph layer (depth 5) so weather
    // and map tint can never wash out a fairness warning.
    this.fog = this.add.graphics().setScrollFactor(0).setDepth(weatherBackdropDepth(1));
    this.decorGroup = this.add.group();
  }

  resizeViewport(size) {
    if(this.ended)return;
    const camera=this.cameras.main;
    this.viewport=resizeCamera(camera,size.width,size.height,this.viewport);
    const view=worldView(this);
    this.fog.clear().setPosition(camera.width/2,camera.height/2);
    if(this.mapData.id!=='overgrown')this.fog.fillStyle(this.mapData.colors.fog,this.mapData.id==='bloodmoon'?.14:.18)
      .fillRect(-view.width/2-GROUND_OVERSCAN,-view.height/2-GROUND_OVERSCAN,view.width+2*GROUND_OVERSCAN,view.height+2*GROUND_OVERSCAN);
    for(const {object}of this.fx?.live||[])if(object.active&&object.getData?.('viewportOverlay'))resizeScreenOverlay(this,object);
    this.decorTimer=0;
    const worldWidth=this.mapData.size?.width||6400,worldHeight=this.mapData.size?.height||4800;
    camera.setBounds?.(-worldWidth/2,-worldHeight/2,worldWidth,worldHeight);
    if(this.player&&this.mapWorld)this.mapWorld.update(view);
    this.hud?.hideTooltip();
    this.cutscenes?.resize(this.viewport);
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
    this.player = this.physics.add.sprite(0, 0, `hero-${this.heroData.id}`);
    this.player.setCollideWorldBounds(true);
    this.player.setScale(.64);
    // The hero collides at the feet: 11 world pixels, never the full sprite.
    this.player.body.setCircle(11/.64, 64-11/.64, 64+(24-11)/.64);
    this.player.play(`hero-${this.heroData.id}-idle`);
    this.player.setData('animLock',0);
    this.player.hiddenUntil = 0;
    this.mapWorld?.collision.track(this.player,{radius:11,footOffset:24});
    this.cameras.main.startFollow(this.player, true, .09, .09);
    this.invulnerable = 0;
    this.mapWorld?.update(worldView(this));
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
    // WorldCollision sweeps shots against exact same-level footprints. Arcade
    // sprite rectangles would block canopies and tunnel through thin walls.
    this.physics.add.overlap(this.player, this.enemies, (_, enemy) => this.touchEnemy(enemy));
    this.physics.add.overlap(this.player, this.enemyProjectiles, (_, projectile) => {
      this.onEnemyProjectileHit(projectile);
    });
    this.physics.add.overlap(this.player, this.pickups, (_, pickup) => this.collectPickup(pickup));
    // Ground collision includes directly moved allies and does not depend on
    // whether the prop's art is currently streamed into Arcade's static group.
  }

  update(_time, deltaRaw) {
    if(this.cutscenes?.active){this.water?.audio.pause();this.cutscenes.update(Math.min(deltaRaw,50)/1000);return;}
    if (this.ended || this.loadingRun || this.pausedForChoice || !this.player?.active) {this.water?.audio.pause();return;}
    const delta = Math.min(deltaRaw, 50);
    const dt = delta / 1000;
    this.elapsed += dt;
    this.weather?.update(dt);
    this.skillAudio?.update?.(dt);
    this.passives.emit('tick', { dt });
    this.autoTimer -= dt * this.stats.cooldownRecoveryMult * (this.passives.modifiers().attackSpeedMult??1) * skillModifiers(this).attackSpeedMult;
    this.spawnTimer -= dt;
    this.decorTimer -= dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dash.cooldown = Math.max(0, this.dash.cooldown - dt);
    this.bossController?.updateWorld(dt);
    this.enemySystem?.updateWorld(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateMovement(dt);
    this.updateCooldowns(dt);
    this.updateEnemies(dt);
    this.mapWorld?.updateActors(dt);
    if(this.pausedForChoice||this.ended)return;
    this.telegraphs?.update(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateSummons(dt);
    updateSkillEffects(this, dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateCompanion(dt);
    this.water?.heroCurrent(dt);
    this.mapWorld?.collision.update();
    this.water?.update(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateVitals(dt);
    this.updateDirector(dt);
    if(this.pausedForChoice||this.ended)return;
    this.updateWorld();
    this.updateHud();
    this.enemyBars?.draw();
    this.enemyVisuals?.update();
    this.bossVisuals?.update();
    this.mapWorld?.updateFades();
    this.playerOcclusion?.update();
    if(this.companion?.sprite?.active)setWorldDepth(this.companion.sprite,objectBaseY(this.companion.sprite));
    if(this.debugDepth)this.renderDepthDebug();
  }

  renderDepthDebug() {
    const colors={background:0x616161,world:0x34d058,overhead:0xffa12b,effects:0xe542e5,weather:0x31c6ed,occlusion:0x9be7ff,hud:0xffffff};
    for(const object of this.children.list){
      if(!object?.active||!object.visible||object===this.player||!object.setTint)continue;
      object.setTint(colors[depthBandName(object.depth)]||0xffffff);
    }
    // Unique marker color lets the regression sweep count rendered player pixels.
    this.player.setTintFill(0xff00ff);
  }

  updateMovement(dt) {
    this.water?.beforeMovement();
    if(this.player.getData('rootUntil')>this.elapsed||this.player.getData('knockupUntil')>this.elapsed){this.player.setVelocity(0,0);return;}
    if(this.eagleFocus&&wantsToMove(this))cancelFocus(this);
    if(this.skillMotion?.effect.active){this.player.setVelocity(0,0);return;}
    const slowUntil=this.player.getData('slowUntil')||0;
    const slowPct=this.player.getData('slowPct')??.5;
    const moveSlow=slowUntil>this.elapsed&&(this.stats.slowImmunityUntil||0)<=this.elapsed?1-clamp(slowPct,0,1):1;
    const terrainSpeed=this.water?.speed??waterSpeedMultiplier(this.mapWorld,this.player);
    const keyboardX = (this.cursors.left.isDown || this.keys.left.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.right.isDown ? 1 : 0);
    const keyboardY = (this.cursors.up.isDown || this.keys.up.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.down.isDown ? 1 : 0);
    let x = keyboardX || this.hud.move.x;
    let y = keyboardY || this.hud.move.y;
    if(this.player.getData('confuseUntil')>this.elapsed){x=-x;y=-y;}
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    if (length > .1) this.lastMove.set(x, y).normalize();

    if (this.dash.remaining > 0) {
      this.dash.remaining -= dt;
      const speed = this.stats.speed * moveSlow * terrainSpeed * this.passives.modifiers().speedMult * skillModifiers(this).speedMult;
      this.player.setVelocity(this.dash.x * speed * 3.65, this.dash.y * speed * 3.65);
      this.player.setAlpha(.72 + Math.sin(this.elapsed * 50) * .16);
    } else {
      this.player.setAlpha(1);
      const speed=this.stats.speed*moveSlow*terrainSpeed*this.support.modifiers().speed*this.passives.modifiers().speedMult*skillModifiers(this).speedMult;
      this.player.setVelocity(x * speed, y * speed);
    }
    const pull=this.player.getData('bossPull');
    if(pull?.until>this.elapsed&&pull.owner?.active&&pull.owner.getData('serial')===pull.serial&&this.dash.remaining<=0){
      const d=Math.hypot(pull.x-this.player.x,pull.y-this.player.y),speed=Math.min(pull.speed,d/Math.max(.001,dt));
      if(d)this.player.setVelocity(this.player.body.velocity.x+(pull.x-this.player.x)/d*speed,this.player.body.velocity.y+(pull.y-this.player.y)/d*speed);
    }
    this.facing=facingFor(this.player.body.velocity.x,this.player.body.velocity.y,this.facing);
    if(this.facing==='side'&&Math.abs(this.player.body.velocity.x)>4)this.player.setFlipX(this.player.body.velocity.x<0);
    if(this.facing!=='side')this.player.setFlipX(false);
    setWorldDepth(this.player, objectBaseY(this.player));
    const moving = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) > 5;
    this.animateCharacter(this.player,this.playerArtKey(),moving?'walk':'idle');
  }

  updateCooldowns(dt) {
    const moving = this.player.body.speed > 5;
    const movingHaste = moving && this.hasGear('feathered-headdress') ? .12 : 0;
    const recovery = (1 + this.stats.haste + movingHaste + this.support.modifiers().haste) * this.stats.cooldownRecoveryMult;
    const activeCount=slotCount('active',this.stats.level);
    for(let i=0;i<Math.min(activeCount,this.skillSlots.length);i++){
      const skill=this.skillSlots[i];
      skill.remaining=Math.max(0,skill.remaining-dt*recovery);
    }
    for(let i=0;i<activeCount;i++)this.hud.setCooldown(i,this.skillSlots[i]?this.skillSlots[i].remaining/skillCooldown(this.skillSlots[i]):0);
    this.hud.setCooldown(0, this.dash.cooldown / 3.1, true);
  }

  updateVitals(dt) {
    const regen=this.stats.regen+this.support.modifiers().regen;
    if (regen) this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + regen * dt);
    if (this.stats.maxMana) this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 11 * dt * this.stats.manaRegenMult);
    const attacking=this.settings.attackMode!=='manual'||this.keys.attack.isDown||this.hud.attackHeld||this.manualPointer;
    if (this.autoTimer <= 0 && attacking) this.autoAttack();
  }

  updateDirector(dt) {
    this.bossController?.updateArrival();
    if(this.pausedForChoice||this.ended)return;
    this.spawnDirector?.update(dt);
  }

  updateEnemies(dt) {
    this.enemies.children.each((enemy) => {
      if (!enemy?.active||this.pausedForChoice||this.ended) return;
      if(enemy.getData('bossObject')){this.bossController?.updateObject(enemy,dt);setWorldDepth(enemy,objectBaseY(enemy));return;}
      updateEnemyShield(enemy,this.elapsed);
      updateEnemy(this, enemy, dt);
      this.water?.enemyMotion(enemy,dt);
      setWorldDepth(enemy,objectBaseY(enemy));
    });
  }

  updateBoss(boss, dt) {
    this.bossController?.update(boss,dt);
  }

  updateProjectiles(dt) {
    this.projectiles.children.each((projectile) => {
      if (!projectile?.active) return;
      if(this.blockWorldProjectile(projectile))return;
      const wave=projectile.getData('wave');
      if(wave){
        wave.age+=Math.min(dt,Math.max(0,projectile.getData('life')));
        const along=Math.min(wave.range,wave.speed*wave.age),across=Math.sin(along/wave.range*TAU+wave.phase)*wave.amplitude;
        const x=wave.x+Math.cos(wave.angle)*along-Math.sin(wave.angle)*across,y=wave.y+Math.sin(wave.angle)*along+Math.cos(wave.angle)*across;
        if(projectile.body.reset)projectile.body.reset(x,y);else projectile.setPosition(x,y);
        projectile.setVelocity(0,0);
        projectile.setRotation(wave.angle+Math.atan(Math.cos(along/wave.range*TAU+wave.phase)*wave.amplitude*TAU/wave.range));
        projectile.body.updateFromGameObject?.();
      }
      const target=projectile.getData('homingTarget');
      if(!wave&&target?.active&&target.getData('serial')===projectile.getData('homingSerial')){
        const velocity=projectile.body.velocity,angle=Math.atan2(velocity.y,velocity.x);
        const desired=Math.atan2(target.y-projectile.y,target.x-projectile.x);
        const difference=Phaser.Math.Angle.Wrap(desired-angle),limit=projectile.getData('homingTurn')*dt;
        const heading=angle+clamp(difference,-limit,limit),speed=projectile.getData('homingSpeed');
        projectile.setVelocity(Math.cos(heading)*speed,Math.sin(heading)*speed).setRotation(heading);
      }
      const life = (projectile.getData('life') || 0) - dt;
      projectile.setData('life', life);
      projectile.setDepth(effectDepth(projectile.y,16));
      if (life <= 0 || Phaser.Math.Distance.Between(projectile.x, projectile.y, this.player.x, this.player.y) > retentionRadius(this,700)) {this.water?.projectileHit(projectile);projectile.destroy();}
    });
    this.enemyProjectiles.children.each((projectile) => {
      if (!projectile?.active) return;
      if(this.blockWorldProjectile(projectile))return;
      const previous={x:projectile.getData('previousX')??projectile.x,y:projectile.getData('previousY')??projectile.y};
      if(this.support.blocksProjectile?.(projectile,previous))return;
      projectile.setData({previousX:projectile.x,previousY:projectile.y});
      projectile.setDepth(effectDepth(projectile.y,15));
      const life = (projectile.getData('life') || 0) - dt;
      projectile.setData('life', life);
      if (life <= 0) {this.water?.projectileHit(projectile);projectile.destroy();}
    });
  }

  blockWorldProjectile(projectile) {
    const previous=projectile.getData('worldPrevious')||{x:projectile.x,y:projectile.y};
    const hit=this.mapWorld?.collision.projectile(projectile,previous);
    projectile.setData('worldPrevious',{x:projectile.x,y:projectile.y});
    if(!hit)return false;
    const prop=this.mapWorld.active.get(hit.ownerId||hit.worldId)?.object;
    if(prop?.active&&hit.breakable)this.damageProp(prop,projectile.getData('damage')||10);
    projectile.destroy();return true;
  }

  updatePickups() {
    const xpPickupRange = PICKUP_MAGNET_RANGE * this.passives.modifiers().pickupRangeMult;
    // Breakables stay solid until an attack destroys them; proximity only
    // collects the loot already released by a destroyed container.
    this.pickups.children.each((pickup) => {
      if (!pickup?.active||this.pausedForChoice||this.ended) return;
      const distance = Phaser.Math.Distance.Between(pickup.x, pickup.y, this.player.x, this.player.y);
      const pickupRange = pickup.getData('kind') === 'xp' ? xpPickupRange : PICKUP_MAGNET_RANGE;
      if(distance<30){this.collectPickup(pickup);return;}
      if (distance < pickupRange) this.physics.moveToObject(pickup, this.player, 190 + (pickupRange - distance) * 2.2);
      else pickup.setVelocity(0, 0);
      setWorldDepth(pickup,objectBaseY(pickup));
      const bubble=pickup.getData('bubble');if(bubble?.active){const pulse=1+Math.sin(this.elapsed*3+pickup.getData('phase'))*.07;bubble.setPosition(pickup.x,pickup.y).setDisplaySize(pickup.getData('bubbleSize')*pulse,pickup.getData('bubbleSize')*pulse).setDepth(effectDepth(pickup.y,9));}
      if (distance > retentionRadius(this,1150)) pickup.destroy();
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
          if(summon.fxId)decorateIxchelProjectile(this,projectile,summon.fxId);
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
    const view=worldView(this);
    if (this.decorTimer <= 0) {
      this.mapWorld?.update(view);
      this.decorTimer = .15;
    }
  }

  updateHud() {
    this.hud.setStats({ ...this.stats, elapsed: this.elapsed,stamina:1-this.dash.cooldown/3.1 });
    this.refreshPassiveHud();
    this.hud.setAlly?.(this.companion);
    if (this.activeBoss?.active) this.bossController?.refreshBar();
  }

  refreshPassiveHud() {
    const slots=(this.passiveSlots||[]).map(skill=>({...skill,hudState:this.passives?.equipped.get(skill.id)?.state.hudState||skill.hudState}));
    this.hud.setPassives?.(slots,slotCount('passive',this.loadoutLevel||1));
    this.hud.setInnates?.([...this.passives.equipped.values()].filter(entry=>entry.innate).map(entry=>({...entry.passive,level:entry.level,hudState:entry.state.hudState})));
  }

  autoAttack() {
    if(this.ended||this.pausedForChoice)return;
    const weapon = this.heroData.automatic;
    const attackRange = weapon.range * this.stats.range * (this.water?.range??1);
    const cost = manaCost(this.stats, weapon.mana);
    const target = this.closestEnemy(this.player.x, this.player.y, attackRange);
    if(target)target.setData('targetedUntil',this.elapsed+.3);
    if (!target && this.settings.attackMode!=='manual') { this.autoTimer = .12; return; }
    if (this.stats.mana < cost) { this.autoTimer = .18; return; }
    this.stats.mana -= cost;
    const damage = weapon.damage * this.stats.damage * this.support.modifiers().damage * (this.passives.modifiers().basicDamageMult??1);
    this.animateCharacter(this.player,this.playerArtKey(),'attack',.24);
    const angle = this.getAimAngle(target);
    if (weapon.type === 'melee') {
      this.attackCone(angle, attackRange, damage, Math.PI * .72, 210);
      this.playEffect(0,this.player.x+Math.cos(angle)*42,this.player.y+Math.sin(angle)*42,150,angle);
      this.damagePropsInArea(this.player.x + Math.cos(angle) * 45, this.player.y + Math.sin(angle) * 45, attackRange);
      this.audio.sfx('slash', .08);
    } else {
      const count=fullQuiverCount(this,this.basicAttackCount+1);
      for(let i=0;i<count;i++)configureProjectile(this,this.fireProjectile(this.player.x,this.player.y,angle+(i-(count-1)/2)*.13,damage,650,weapon.pierce||1,1.2*(this.water?.range??1),weapon.color),{basicAttack:true});
      this.audio.sfx(this.heroData.id === 'kukul' ? 'dart' : 'spell', .07);
    }
    this.autoTimer = weapon.cooldown / (1 + this.stats.haste + this.support.modifiers().haste);
    this.passives.emit('basicAttack', { count: ++this.basicAttackCount, weapon, target });
  }

  castSkill(index) {
    if (this.ended || this.pausedForChoice || this.scene.isPaused()) return;
    if (index < 0 || index >= slotCount('active', this.stats.level)) return;
    const skill = this.skillSlots[index];
    if (!skill || skill.remaining > 0) return;
    const handler = ACTIVE_HANDLERS[skill.id];
    if(!handler){console.warn(`[skills] No active handler: ${skill.id}`);return;}
    const ctx = skillContext(this, skill);
    const mana = ctx.mana;
    if (mana && this.stats.mana < mana) { this.hud.toast('Not enough mana'); return; }
    this.stats.mana -= mana;
    this.animateCharacter(this.player,this.playerArtKey(),'attack',.28);
    handler(this, skill, ctx);
    restoreSkillMana(this.stats, skill.restore);
    skill.remaining = ctx.cooldown;
    this.passives.emit('skillCast', { skill, ctx });
  }

  getAimAngle(target) {
    if(this.settings.attackMode==='manual'&&this.manualPointer){
      const p=this.input.activePointer;
      if(this.cameras?.main)p.updateWorldPoint?.(this.cameras.main);
      return Phaser.Math.Angle.Between(this.player.x,this.player.y,p.worldX,p.worldY);
    }
    if (this.settings.autoAim !== false && target) return Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    if (this.lastMove.lengthSq() > .1) return Math.atan2(this.lastMove.y, this.lastMove.x);
    return target ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y) : 0;
  }

  tryDash() {
    if(this.water?.at(this.player).deep)return;
    if (this.ended || this.pausedForChoice || this.dash.cooldown > 0) return;
    if(this.player.getData('rootUntil')>this.elapsed||this.player.getData('knockupUntil')>this.elapsed)return;
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
    this.passives.emit('dash');
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
    projectile.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(effectDepth(y,16));
    projectile.anims.stop();
    projectile.setTexture(isDart?'player-dart':'fx-1');
    applyProjectileTint(projectile, tint);
    projectile.setRotation(angle+(isDart?Math.PI/4:0)).setDisplaySize((isDart?44:54)*scale,(isDart?44:54)*scale);
    if(!isDart) projectile.play('bolt-1');
    projectile.body.setCircle(18,46,46);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.setData({worldPrevious:{x,y},level:this.player.getData('level')||0});
    projectile.setData({ damage, pierce, life, critBonus, hit: new Set(), source: this.player, byAlly: false, status: null, onHit: null, homingTarget:null, homingSerial:null, homingTurn:0, homingSpeed:0, basicAttack:false, skillId:null, wave:null, pendingSplit:false, splitOwner:null, ixchelFx:null, fxGeneration:null });
    return projectile;
  }

  spawnEnemyProjectile(x, y, angle, speed, damage, source = null) {
    const bossAttack=!!source?.getData?.('isBoss');
    if(bossAttack){if(this.bossCinematic)return null;damage=bossDamage(damage);}
    const projectile = this.enemyProjectiles.get(x, y, 'fx-5');
    if (!projectile) return;
    projectile.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setDepth(effectDepth(y,15));
    projectile.clearTint().setAlpha(1).setDisplaySize(42,42).setRotation(angle).play('bolt-5');
    projectile.body.setCircle(21,43,43);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projectile.setData({ damage, life: 4, source,sourceSerial:source?.getData?.('serial'), previousX:x, previousY:y,
      worldPrevious:{x,y},level:source?.getData?.('level')||0,
      poison:null,bleed:null,piercing:false,hitHero:false,reflected:false,enemyId:null,bossAttack });
    projectile.setData('enemyFx',null);
    decorateEnemyProjectile(this,projectile,source);
    return projectile;
  }

  onEnemyProjectileHit(projectile) {
    if(projectile.active&&this.blockWorldProjectile(projectile))return;
    if (this.ended || this.bossCinematic || !projectile.active || projectile.getData('hitHero') || this.stats.intangibleUntil > this.elapsed) return;
    if (this.stats.reflectUntil > this.elapsed && inMirrorArc(this,projectile)) {
      const velocity = projectile.body.velocity;
      const reflected = this.fireProjectile(projectile.x, projectile.y, Math.atan2(-velocity.y, -velocity.x),
        (projectile.getData('damage') || 8) * (this.blackMirror?.reflectPct/100||1.5), Math.hypot(velocity.x, velocity.y), 1, projectile.getData('life'), 0xb58cff);
      // Retain the enemy shot if the player projectile pool cannot accept the reflection.
      if (!reflected) return;
      this.fx?.play('black-mirror','impact',{x:projectile.x,y:projectile.y,angle:Math.atan2(-velocity.y,-velocity.x)});
    } else {
      if(this.support.blocksProjectile?.(projectile,{x:projectile.getData('previousX')??projectile.x,y:projectile.getData('previousY')??projectile.y}))return;
      const source=projectile.getData('source'),valid=source?.active&&source.getData?.('serial')===projectile.getData('sourceSerial');
      this.damagePlayer(projectile.getData('damage') || 8, projectile.x, projectile.y, valid?source:projectile,false,
        {poison:projectile.getData('poison'),bleed:projectile.getData('bleed')});
      if(projectile.getData('piercing')){projectile.setData('hitHero',true);return;}
    }
    if(projectile.getData('enemyFx'))this.fx.play(projectile.getData('enemyFx'),'impact',{x:projectile.x,y:projectile.y,size:35,duration:.2,sound:false});
    projectile.destroy();
  }

  onProjectileHit(projectile, enemy) {
    if(projectile.active&&this.blockWorldProjectile(projectile))return;
    if (this.ended || !projectile.active || !enemy.active || projectile.getData('pendingSplit')) return;
    if(enemy.getData('buried')||enemy.getData('invulnerableEnemy'))return;
    if(this.enemySystem?.reflectProjectile(projectile,enemy))return;
    const hit = projectile.getData('hit');
    if (hit?.has(enemy.getData('serial'))) return;
    hit?.add(enemy.getData('serial'));
    this.damageEnemy(enemy, projectile.getData('damage'), projectile.getData('critBonus') || 0, 75,
      projectile.getData('source') || this.player, { byAlly: projectile.getData('byAlly'),basicAttack:projectile.getData('basicAttack'),skillId:projectile.getData('skillId') });
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

  chainAttack(target, range, damage, count, options = {}) {
    performChainAttack(this, target, range, damage, count, options);
  }

  placeTrap(x, y, range, damage, durationScale = 1, {fxId} = {}) {
    const trap = this.add.image(x, y, 'trap').setDepth(effectDepth(y,7)).setAlpha(.82).setScale(.7);
    if(fxId)this.fx?.play(fxId,'ground',{x,y,radius:range,duration:1.24*durationScale,target:trap,replace:true});
    this.tweens.add({ targets: trap, scale: range / 64, alpha: .35, duration: 620 * durationScale, yoyo: true, onComplete: () => {
      this.damageArea({ x, y }, range, damage, 230);
      this.damagePropsInArea(x, y, range);
      this.ringEffect(x, y, range / 64, 0xefc27a);
      if(fxId)this.fx?.play(fxId,'impact',{x,y,radius:range});
      trap.destroy();
    }});
  }

  rainAttack(x, y, range, damage, count, fxId = null) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const radius = Math.sqrt(Math.random()) * range;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      const marker = this.add.circle(px, py, 11, 0x67dfb2, .3).setDepth(effectDepth(py,6));
      if(fxId)this.fx?.play(fxId,'ground',{x:px,y:py,duration:(180+i*35)/1000,width:64});
      this.tweens.add({ targets: marker, scale: 1.8, alpha: .75, duration: 180 + i * 35, onComplete: () => {
        this.playEffect(2,px,py,100);
        if(fxId)this.fx?.play(fxId,'impact',{x:px,y:py,radius:46});
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
    const sx=origin.x+Math.cos(angle)*65,sy=origin.y+Math.sin(angle)*65;
    const sprite = this.add.image(sx,sy,options.texture||'summon').setDisplaySize(70,70).setDepth(effectDepth(sy,14));
    sprite.setData('byAlly', true);
    if (options.tint !== undefined) sprite.setTint(options.tint);
    this.playEffect(4,sprite.x,sprite.y,100);
    const summoned = { ...options, sprite, damage, life: options.duration ?? 12, shot: .15 };
    this.summons.push(summoned);
    if(options.fxId)this.fx?.play(options.fxId,'aura',{x:sprite.x,y:sprite.y,target:sprite,duration:summoned.life,replace:true});
    return summoned;
  }

  damageEnemy(enemy, rawDamage, critBonus = 0, knockback = 0, origin = this.player, options = {}) {
    if (this.ended || !enemy?.active || rawDamage <= 0) return;
    const bossMult=enemy.getData('isBoss')?(this.bossController?.damageMultiplier(enemy)??1):1;
    if(!bossMult)return;
    const rosterMult=rosterDamageMult(enemy,origin,this.elapsed,options.dot);if(!rosterMult)return;
    const byAlly = options.byAlly ?? Boolean(origin?.getData?.('byAlly'));
    const heroOwned=!byAlly||options.heroSkill;
    const modifiers=heroOwned?this.passives.modifiers({enemy,dot:options.dot,byAlly}):{};
    const crit = !options.dot && options.canCrit!==false && Math.random() < this.stats.crit + critBonus + (modifiers.crit??0) + (heroOwned?(skillModifiers(this).crit??0):0);
    const stealthMult=heroOwned&&!options.dot&&origin===this.player?(this.support.consumeStealthStrike?.()??1):1;
    const damage = rawDamage * stealthMult * (modifiers.damageMult??1) * (crit ? this.stats.critDamage : 1) * (enemy.getData('markUntil')>this.elapsed?1+enemy.getData('markBonus'):1) * frontalDamageMult(enemy,origin,options.dot) * rosterMult * bossMult;
    const beforeHp=enemy.getData('hp'),hpDamage=absorbEnemyShield(enemy,damage,this.elapsed);
    const hp = beforeHp - hpDamage;
    enemy.setData('hp', hp);
    if(!options.dot){const type=enemy.getData('type')||'';this.audio.play?.(`sfx/core/enemy-hit-${/stone|golem/.test(type)?'stone':/bone|serpent/.test(type)?'bone':'flesh'}`,{x:enemy.x,y:enemy.y});}
    if(enemy.getData('isBoss'))this.bossController?.phaseChanged();
    this.enemyBars?.damage(enemy,beforeHp);
    this.stats.damageDone += damage;
    const lifesteal=this.stats.lifestealPct+(modifiers.lifestealPct??0)+(this.support.modifiers().lifestealPct??0);
    if (heroOwned && lifesteal > 0) this.stats.hp = Math.min(this.stats.maxHp,
      this.stats.hp + Math.min(hpDamage, Math.max(0, beforeHp)) * lifesteal * this.stats.healing);
    const event = { enemy, damage, source: origin, byAlly, dot: Boolean(options.dot),basicAttack:Boolean(options.basicAttack),skillId:options.skillId||null };
    this.passives.emit('hit', event);
    if (crit) this.passives.emit('crit', event);
    if (options.visuals !== false) {
      this.animateCharacter(enemy,enemy.getData('artKey'),'hurt',.16);
      if(this.settings.particles!=='low'||crit) this.playEffect(2,enemy.x,enemy.y,crit?62:38);
      if(this.enemyVisuals?.actors.has(enemy))this.enemyVisuals.pose(enemy,'hurt',.16);
      else enemy.setTint(crit ? 0xffe294 : 0xd5fff1);
      this.time.delayedCall(65, () => enemy?.active && (enemy.getData('burnUntil') > this.elapsed ? enemy.setTint(0xff8a36) : enemy.clearTint()));
      if (knockback && enemy.body) {
        enemy.setData('knockbackUntil',this.elapsed+.25);
        const angle = Phaser.Math.Angle.Between(origin.x, origin.y, enemy.x, enemy.y);
        enemy.body.velocity.x += Math.cos(angle) * knockback;
        enemy.body.velocity.y += Math.sin(angle) * knockback;
      }
      if (this.settings.damageNumbers && (crit || damage >= 45)) this.floatText(enemy.x, enemy.y - 18, `${crit ? '✦ ' : ''}${Math.round(damage)}`, crit ? '#ffd77b' : '#d2fff0');
    }
    if (enemy.getData('hp') <= 0) this.killEnemy(enemy, byAlly);
  }

  killEnemy(enemy, byAlly = false, {drowned=false} = {}) {
    if (!enemy.active) return;
    if(enemy.getData('bossObject')){this.bossController?.destroyObject(enemy);return;}
    const x = enemy.x; const y = enemy.y;
    const isBoss = enemy.getData('isBoss');
    const wasTopThreat=dangerousEnemy(this.enemies.getChildren(),this.player)===enemy;
    this.playEffect(2,x,y,isBoss?190:68);
    const bossId = enemy.getData('bossId');
    const xp = (enemy.getData('xp') || 5) * (drowned?.5:1);
    this.enemyVisuals?.die(enemy);
    if(!enemy.getData('isBoss'))this.audio.play?.(`enemy-${enemy.getData('type')}-death`,{x:enemy.x,y:enemy.y});
    this.enemySystem?.interrupt(enemy);this.enemySystem?.removeOwned(enemy);
    this.telegraphs?.cancelOwner(enemy);
    if(!drowned&&enemy.getData('affix')==='explosive')this.telegraphs?.play({shape:'circle',x,y,radius:90,windup:.6,tag:'death-burst',
      // Intentionally detached: this affix warns AFTER death, unlike live attacks.
      onResolve:()=>{if(Math.hypot(this.player.x-x,this.player.y-y)<=90)this.damagePlayer(18,x,y,{x,y});}});
    if(enemy.getData('markUntil')>this.elapsed&&enemy.getData('markSource')===this.player){
      this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+enemy.getData('markHeal')*this.stats.healing);
      this.fx?.play('hunters-mark','impact',{x,y,target:{x,y}});
    }
    enemy.disableBody(true, true);
    this.stats.kills += 1;
    this.passives.emit('kill', { enemy, byAlly, wasTopThreat });
    if (isBoss) {
      this.activeBoss = null;
      this.hud.clearBoss();
      const complete=()=>this.finishBossDeath(bossId,x,y);
      if(!this.bossController?.die(enemy,complete))complete();
    } else {
      this.spawnPickup('xp', x, y, xp);
      const cacaoChance = .055 * (1 + this.stats.fortune);
      if (Math.random() < cacaoChance) this.spawnPickup('cacao', x + 5, y - 3, this.support.cacaoValue?.(1)??1);
      if (Math.random() < .007) this.spawnPickup('potion', x - 4, y + 4, 16);
    }
  }

  damagePlayer(rawDamage, sourceX, sourceY, source = null, melee = false, options = {}) {
    if (rawDamage<=0||this.bossCinematic||(!options.dot&&this.invulnerable > 0) || this.stats.intangibleUntil > this.elapsed || this.ended || this.pausedForChoice) return false;
    const bossHit=source?.getData?.('isBoss')||source?.getData?.('bossAttack');
    if(bossHit)rawDamage=bossDamage(rawDamage);
    if (!options.dot&&this.stats.dodgeCharges > 0) {
      if(!consumePlume(this))this.stats.dodgeCharges -= 1;
      this.invulnerable = .58;
      this.playEffect(4, this.player.x, this.player.y, 60);
      return;
    }
    if(!options.dot&&this.passives.avoidDamage({source:source||{x:sourceX,y:sourceY},melee,amount:rawDamage})){
      this.invulnerable=.58;return;
    }
    options.beforeHit?.();
    if (melee && source?.active && this.stats.reflectUntil > this.elapsed) this.damageEnemy(source, this.blackMirror?.thorns??15,0,0,this.player,{canCrit:false});
    if(!options.dot)this.hitCount += 1;
    const buffs=this.support.modifiers();
    let damage = (options.dot?rawDamage:Math.max(1, rawDamage - (this.stats.armor+buffs.armor+(this.passives.modifiers().armor??0)) * .72))*(1-buffs.reduction);
    if (!options.dot&&this.hasGear('jaguar-vest') && this.hitCount % 7 === 0) damage = 1;
    damage *= this.stats.damageTakenMult;
    if(bossHit)damage=bossDamage(damage);
    if (this.stats.shield > 0) {
      const blocked = Math.min(this.stats.shield, damage);
      this.stats.shield -= blocked;
      if(blocked>0)this.audio.play?.(this.stats.shield>0?'shield-hit':'shield-break');
      if(this.balamWard){this.balamWard.remaining=Math.max(0,this.balamWard.remaining-blocked);if(this.balamWard.remaining<=0)this.balamWard.effect.destroy();}
      damage -= blocked;
      if (damage <= 0) this.floatText(this.player.x, this.player.y - 28, 'WARD', '#78e4c0');
    }
    if (damage > 0) {
      damage=this.support.preventFatal(damage);
      healVampiric(source,Math.min(damage,Math.max(0,this.stats.hp)));
      this.stats.hp -= damage;
      this.stats.damageTaken += damage;
      if (damage > 0) this.passives.emit('damageTaken', { amount: damage, source: source || { x: sourceX, y: sourceY }, melee });
      if(!options.dot)this.floatText(this.player.x, this.player.y - 25, `-${Math.ceil(damage)}`, '#ff7077');
    }
    for(const kind of ['root','knockup','confuse','poison','bleed'])if(options[kind])this.enemySystem?.applyPlayerStatus(kind,options[kind],source);
    if(options.dot){if(this.stats.hp<=0)this.finishRun(false);return true;}
    this.invulnerable = .58;
    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.player.x, this.player.y);
    if(!(this.knockbackImmuneUntil>this.elapsed)){
      this.player.setData('knockbackUntil',this.elapsed+.25);
      if(options.knockback!==undefined){const x=this.player.x+Math.cos(angle)*options.knockback,y=this.player.y+Math.sin(angle)*options.knockback;
        if(this.player.body.reset)this.player.body.reset(x,y);else this.player.setPosition(x,y);
      }else{this.player.body.velocity.x += Math.cos(angle) * 260;this.player.body.velocity.y += Math.sin(angle) * 260;}
    }
    this.animateCharacter(this.player,this.playerArtKey(),'hurt',.22);
    this.playEffect(3,this.player.x,this.player.y,94);
    this.player.setTint(0xff7b7d);
    this.time.delayedCall(110, () => this.player?.active && this.player.clearTint());
    shakePixels(this,90,5);
    this.audio.sfx('hurt', .08);
    if (this.stats.hp <= 0) this.finishRun(false);
    return true;
  }

  touchEnemy(enemy) {
    if(enemy?.getData('bossObject'))return;
    if (!enemy?.active || !canEnemyAttack(this, enemy, true)) return;
    if(enemy.getData('isBoss')&&this.bossController?.touch(enemy))return;
    if(this.enemySystem?.touch(enemy))return;
    if(this.telegraphs&&!(enemy.getData('contactReadyUntil')>this.elapsed)){
      if(!(enemy.getData('nextContact')>this.elapsed)&&!this.telegraphs.has(enemy,'contact')){
        const radius=(enemy.getData('radius')||20)+24;
        this.telegraphs.play({shape:'circle',x:enemy.x,y:enemy.y,radius,windup:enemy.getData('isBoss')?BOSS_FAIRNESS.minimumTelegraph:.35,owner:enemy,tag:'contact',sound:'click',
          bornAt:enemy.getData('isBoss')?this.elapsed:null,
          onResolve:()=>{enemy.setData({contactReadyUntil:this.elapsed+.25,nextContact:this.elapsed+1});},
          onCancel:()=>enemy.setData('contactReadyUntil',0)});
      }return;
    }
    this.damagePlayer((enemy.getData('damage') || 8) * enemyDamageMult(this, enemy), enemy.x, enemy.y, enemy, true);
  }

  spawnEnemy(forcedType, forcedRadius, spawnOptions={}) {
    if(this.spawnDirector&&!forcedRadius&&!this.spawnDirector.hasSpace())return null;
    const progress = this.elapsed / this.modeData.duration;
    if(forcedType&&!canSpawnEnemy(this.heroData,forcedType))return null;
    const available = enemyPool(this.heroData,this.stats.level,progress);
    const weighted = available.flatMap((id) => Array(ENEMIES[id].weight).fill(id));
    const type = forcedType || Phaser.Utils.Array.GetRandom(weighted);
    const data = ENEMIES[type];
    if(!data||(!data.maps.includes('all')&&this.mapData.id&&!data.maps.includes(this.mapData.id)))return null;
    if(data.aliveLimit&&this.enemies.getChildren().filter(e=>e.active&&!e.getData('isBoss')&&e.getData('type')===type).length>=data.aliveLimit)return null;
    const view=worldView(this);
    let position=spawnOptions.position||this.mapWorld?.spawnOutsideView(view,Math.random,160)||spawnOutsideView(view,Math.random,160);
    // Explicit radii are reserved for summons/boss abilities and automated QA.
    if(forcedRadius){const angle=Math.random()*TAU;position=this.mapWorld?.clampInside({x:this.player.x+Math.cos(angle)*forcedRadius,y:this.player.y+Math.sin(angle)*forcedRadius},data.radius)||{x:this.player.x+Math.cos(angle)*forcedRadius,y:this.player.y+Math.sin(angle)*forcedRadius};}
    else if(this.mapWorld&&(!(position.x<view.x||position.x>view.right||position.y<view.y||position.y>view.bottom)||position.x < -2800||position.x>2800||position.y < -2000||position.y>2000))position=this.mapWorld.spawnOutsideView(view,Math.random,160);
    const {x,y}=position;
    // Non-swimmers never spawn into a drowning trap; a later pack retries.
    if(this.water&&!data.flier&&!['abyssal_eel','drowned_spirit'].includes(type)&&this.water.waterAt(x,y,spawnOptions.summoner?.getData('level')||0).deep)return null;
    const artKey=this.textures?.exists(`enemy-${type}`)?`enemy-${type}`:`enemy-${ENEMY_ART_FALLBACK[type]||type}`;
    const enemy = this.enemies.get(x, y, artKey);
    if (!enemy) return;
    enemy.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setAlpha(1).setScale(data.flier?.48:.56).setCollideWorldBounds(true);
    setWorldDepth(enemy,objectBaseY(enemy));
    enemy.anims.stop();
    enemy.setTexture(artKey).clearTint();
    const radius=data.radius/(enemy.scaleX||(data.flier?.48:.56));
    enemy.body.setCircle(radius,64-radius,72-radius);
    enemy.setData({
      type, artKey,animLock:0, serial: ++this.enemySerial, seed: Math.random() * 20, level:spawnOptions.summoner?.getData('level')||0, elevation:0, worldFootY:undefined, knockbackUntil:0,
      hp: data.hp, maxHp: data.hp, radius:data.radius,
      speed: data.speed, damage: data.damage, xp: data.xp,
      ranged: data.ranged || false, flier: data.flier || false, nextShot: 1 + Math.random(), isBoss: false,
      tough:data.tough,priorityTarget:PRIORITY_ENEMIES.has(type),summoner:spawnOptions.summoner||null,summonerSerial:spawnOptions.summoner?.getData('serial'),
      ...enemyStatusDefaults(),...enemyAffixDefaults(),...enemyBehaviorDefaults(),...bossStateDefaults(),heading:0,
    });
    applyAffix(enemy,spawnOptions.affix===undefined?rollAffix(this.elapsed):spawnOptions.affix);
    this.enemySystem?.init(enemy);
    this.enemyVisuals?.init(enemy);
    if(spawnOptions.emerge){enemy.setData('spawningUntil',this.elapsed+.55);enemy.setAlpha(0);this.enemyVisuals?.emerge(enemy);}
    return enemy;
  }

  spawnBoss(data,{position}={}) {
    if (this.activeBoss || this.ended || this.bossController?.state?.dead) return;
    data={...BOSSES.find(row=>row.definitionId===(data.definitionId||data.id)),...data,definitionId:data.definitionId||data.id};
    if(this.spawnDirector&&!this.spawnDirector.hasSpace()){
      // A scheduled boss owns one slot in the same cap, never a cap+1 exception.
      const distant=this.enemies.getChildren().filter(e=>e.active&&!e.getData('isBoss')).sort((a,b)=>
        Math.hypot(b.x-this.player.x,b.y-this.player.y)-Math.hypot(a.x-this.player.x,a.y-this.player.y))[0];
      if(distant){this.enemySystem?.removeOwned(distant);this.telegraphs?.cancelOwner(distant);distant.disableBody(true,true);}
    }
    data=bossForHero(this.heroData,data);
    const view=worldView(this);let bossPosition=position||this.mapWorld?.spawnOutsideView(view,Math.random,120+96*(data.id==='ahpuch'?1.65:1.35))||spawnOutsideView(view,Math.random,120+96*(data.id==='ahpuch'?1.65:1.35));
    if(this.mapWorld&&(bossPosition.x < -2800||bossPosition.x>2800||bossPosition.y < -2000||bossPosition.y>2000))bossPosition=this.mapWorld.spawnOutsideView(view,Math.random,120+96*(data.id==='ahpuch'?1.65:1.35));
    const {x,y}=bossPosition;
    const artKey=data.artKey||`boss-${data.id}`;
    const boss = this.enemies.get(x, y, artKey);
    if (!boss) return;
    boss.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setScale(data.id==='ahpuch'?1.65:1.35).setCollideWorldBounds(true);
    setWorldDepth(boss,objectBaseY(boss));
    boss.anims.stop();
    boss.setTexture(artKey).clearTint();
    boss.setAlpha(1);this.enemyVisuals?.remove(boss);
    boss.body.setCircle(...bossBodyCircle(boss,artKey));
    boss.setData({
      artKey,animLock:0,serial: ++this.enemySerial, isBoss: true, bossId: data.id, displayName: data.name,
      hp: data.hp, maxHp: data.hp, speed: data.speed, damage: data.damage,
      xp: 100, seed: Math.random() * 20,displayEpithet:data.id===data.definitionId?data.epithet:'',
      ...enemyStatusDefaults(),...enemyAffixDefaults(),...enemyBehaviorDefaults(),...bossStateDefaults(),heading:0,
      type:null,tough:true,priorityTarget:false,summoner:null,summonerSerial:null,
    });
    this.activeBoss = boss;
    const state=this.bossController?.init(boss,data);
    this.bossVisuals?.init(boss);
    if(state){const definition={...state.definition,name:data.id===data.definitionId?state.definition.name:data.name,epithet:boss.getData('displayEpithet')};
      const entry=state.behavior.entry?.(this.bossController.context());
      this.cutscenes?.start(boss,definition,{entry,onComplete:()=>this.bossController.refreshBar()});
    }else {this.hud.setBoss(data.name,1);this.audio.music?.('boss');this.audio.sfx('boss');}
    return boss;
  }

  finishBossDeath(bossId,x,y){
    if(this.ended)return;
    for(let i=0;i<8;i++)this.spawnPickup('cacao',x+Phaser.Math.Between(-55,55),y+Phaser.Math.Between(-55,55),this.support.cacaoValue?.(3)??3);
    if(bossId==='ahpuch'){this.audio.sfx('victory');this.finishRun(true);}
    else this.grantBossReward(bossId);
  }

  grantBossReward(bossId) {
    if(this.ended)return;
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
    if(!cards.length&&!this.getReplaceableSkills().length){this.audio.music(this.mapData.music);this.finishSelection();return;}
    this.showSkillPick('Boss Defeated',cards,()=>{this.audio.music(this.mapData.music);this.finishSelection();},'Boss reward: choose a skill upgrade.');
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
      if(!this.passives.equipped.has('jade-bounty')){if(this.audio.play)this.audio.play('xp-gem');else this.audio.sfx('pickup', .09);}
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
    if (['xp', 'cacao', 'potion'].includes(kind)) this.passives.emit('pickup', { kind, value, pickup: { x: pickup.x, y: pickup.y } });
    if (kind === 'xp') this.checkLevelUp();
  }

  spawnPickup(kind, x, y, value) {
    const texture = kind === 'xp' ? 'xp-gem' : kind;
    const pickup = this.pickups.get(x, y, texture);
    if (!pickup) return;
    pickup.enableBody(true, x, y, true, true).setActive(true).setVisible(true).setTexture(texture).setDisplaySize(kind === 'xp' ? 20 : 30,kind === 'xp' ? 20 : 30);
    setWorldDepth(pickup,objectBaseY(pickup));
    pickup.body.setCircle(42,6,6);
    pickup.setData({ kind, value });
    const size=kind==='xp'?34:48;
    const bubble=this.add.image(x,y,'pickup-bubble').setDisplaySize(size,size).setDepth(effectDepth(y,9)).setTint(kind==='potion'?0xffaca0:kind==='cacao'?0xffdc79:0x89ffdb);
    pickup.setData({bubble,bubbleSize:size,phase:Math.random()*TAU});
    pickup.once('destroy',()=>bubble.destroy());
  }

  checkLevelUp() {
    while (this.stats.xp >= this.stats.nextXp) {
      this.stats.xp -= this.stats.nextXp;
      this.stats.level += 1;
      // XP-only pacing calibration; preserve the 18-XP first pick and milestone levels.
      // Ixchel's current mana-limited kit earns XP more slowly (see PACING.md).
      const baseXp = 18 + this.stats.level * 11 + Math.pow(this.stats.level, 1.25) * 2.5;
      const earlyXp = 18 + 9 * 11 + Math.pow(9, 1.25) * 2.5;
      const mage = this.heroData.id === 'ixchel';
      const heroXp = mage
        ? baseXp * 1.25
        : baseXp * 2.5 - 15 - Math.max(0, baseXp - earlyXp) * .7;
      this.stats.nextXp = Math.round(heroXp * (this.modeData.id === 'full' ? (mage ? 1.1 : 1.09) : 1));
      this.pendingLevelUps += 1;
    }
    if (this.pendingLevelUps > 0 && !this.pausedForChoice) this.showLevelChoice();
  }

  showLevelChoice() {
    if(this.ended)return;
    const earnedLevel=this.stats.level-this.pendingLevelUps+1;
    this.pendingLevelUps -= 1;
    this.loadoutLevel=earnedLevel;
    this.hud.setSkills(this.skillSlots,slotCount('active',earnedLevel));
    this.refreshPassiveHud();
    this.pauseForSelection();
    this.audio.sfx('level');
    const cards = this.getSkillChoices(false,earnedLevel);
    const afterPick=()=>{
      const afterSupport=()=>this.showSkillMilestone(earnedLevel,()=>this.finishSelection());
      const event=allyLevelEvent(earnedLevel,Boolean(this.companion));
      if(event==='recruit')this.support.chooseClass(()=>{this.support.syncLevel(earnedLevel);afterSupport();});
      else if(this.companion){
        this.support.syncLevel(earnedLevel);
        if(event==='pick')this.support.chooseSkill(afterSupport);
        else afterSupport();
      }else afterSupport();
    };
    this.showSkillPick(`Level ${earnedLevel}`,cards,afterPick);
  }

  showSkillMilestone(earnedLevel,onDone) {
    if(this.ended)return;
    const kind=earnedLevel===10?'passive':earnedLevel===20?'active':null;
    if(!kind||this.completedSkillMilestones.has(earnedLevel)){onDone();return;}
    this.completedSkillMilestones.add(earnedLevel);
    this.hud.showUnlock?.(kind);
    const cards=this.getMilestoneChoices(kind,earnedLevel);
    if(!cards.length&&!this.getReplaceableSkills().length){
      // Hero-only passives arrive in later conversion steps; do not invent placeholder skills.
      this.hud.toast(kind==='passive'?'Passive slot 2 unlocked; passive skills arrive in a later update.':'Skill slot unlocked.');
      onDone();
      return;
    }
    const title=kind==='passive'?'Passive Slot Unlocked':'Fourth Active Slot Unlocked';
    this.showSkillPick(title,cards,()=>{this.skillAudio?.ui?.('milestone-pick');onDone();},`Choose one ${kind} skill.`);
  }

  pauseForSelection(){this.pausedForChoice=true;this.skillAudio?.pause?.();this.physics.pause();this.tweens.pauseAll();this.time.paused=true;this.releaseAttack();this.hud.move={x:0,y:0};}
  finishSelection(){
    if(this.ended)return;
    if(this.pendingLevelUps>0){this.showLevelChoice();return;}
    if(this.pendingBossRewards.length){this.pausedForChoice=false;this.grantBossReward(this.pendingBossRewards.shift());return;}
    this.pausedForChoice=false;this.physics.resume();this.tweens.resumeAll();this.time.paused=false;
    this.skillAudio?.resume?.();
  }
  showSupportLoadout(){
    if(!this.companion||this.pausedForChoice||this.ended)return;
    this.pauseForSelection();
    // Review the active loadout; changes are earned at level-up, not free rerolls.
    this.hud.showChoice('Support Loadout',this.companion.skills.map(k=>({...k,kind:'ally',name:t('{name} · Lv {n}',{name:t(k.name),n:k.level})})),()=>this.finishSelection(),'Support skills level up automatically with your hero.',{label:'Resume',action:()=>this.finishSelection()});
  }

  getSkillChoices(bossReward,heroLevel=this.stats.level) {
    const activeCount=slotCount('active',heroLevel);
    const passiveCount=slotCount('passive',heroLevel);
    return draftSkills({activeSkills:this.heroData.skills,passiveSkills:this.heroData.passives||[],activeSlots:this.skillSlots,passiveSlots:this.passiveSlots,
      innateSkills:[...this.passives.equipped.values()].filter(entry=>entry.innate).map(entry=>({...entry.passive,level:entry.level})),
      activeCount,passiveCount,modifiers:MODIFIERS,boss:bossReward,shuffle,
      guaranteePassive:heroLevel%2===0});
  }

  getMilestoneChoices(kind,heroLevel=this.stats.level) {
    return draftMilestoneSkills(kind,{activeSkills:this.heroData.skills,passiveSkills:this.heroData.passives||[],activeSlots:this.skillSlots,passiveSlots:this.passiveSlots,
      activeCount:slotCount('active',heroLevel),passiveCount:slotCount('passive',heroLevel),shuffle});
  }

  replacementOptions() {
    const level=this.loadoutLevel||this.stats.level;
    return {activeSkills:this.heroData.skills,passiveSkills:this.heroData.passives||[],
      activeSlots:this.skillSlots,passiveSlots:this.passiveSlots,
      activeCount:slotCount('active',level),passiveCount:slotCount('passive',level),shuffle};
  }

  getReplaceableSkills() {
    const kinds=replacementKinds(this.replacementOptions());
    return kinds.flatMap(kind=>(kind==='passive'?this.passiveSlots:this.skillSlots)
      .filter(skill=>!SLOT_RULES.innate.includes(skill.id))
      .map(skill=>({...skill,kind,name:`${skill.name} · Lv ${skill.level}`})));
  }

  showSkillPick(title,cards,onDone,subtitle='Choose an upgrade.') {
    let completed=false;
    const current=()=>!completed&&!this.ended;
    // Keep each kind's draw stable when Back returns to the same reward.
    const draws=new Map();
    const show=()=>{
      if(!current())return;
      const secondary=this.getReplaceableSkills().length?{label:'Replace a skill',id:'replace-skill',action:()=>{
        if(!current())return;
        this.showReplacement((kind,oldId,newId)=>{
          if(!current())return;
          if(!this.replaceSkill(kind,oldId,newId)){show();return;}
          completed=true;onDone();
        },show,current,draws);
      }}:null;
      this.hud.showChoice(title,cards,card=>{
        if(!current())return;
        completed=true;this.applyChoice(card,onDone);
      },cards.length?subtitle:'No upgrades available. Replace a skill to use this pick.',secondary,{className:'skill-pick'});
    };
    show();
  }

  showReplacement(onConfirm,onBack,current=()=>!this.ended,draws=new Map()) {
    if(!current())return;
    const back={label:'Back',id:'replacement-back',action:()=>{if(current())onBack();}};
    const equipped=this.getReplaceableSkills();
    if(!equipped.length){onBack();return;}
    this.hud.showChoice('Choose a skill to remove',equipped,removed=>{
      if(!current())return;
      const kind=removed.kind;
      if(!draws.has(kind))draws.set(kind,draftReplacements(kind,this.replacementOptions()));
      const candidates=draws.get(kind);
      if(!candidates.length){onBack();return;}
      this.hud.showChoice('Choose a replacement',candidates,selected=>{
        if(!current())return;
        const added={...selected,level:1,name:`${selected.name} · Lv 1`,meta:'New skill'};
        this.hud.showChoice('Confirm replacement',[{...removed,meta:'Remove'},added],()=>{},
          'The new skill starts at level 1. This uses your current pick.',back,
          {className:'replacement-choice',stage:'confirm',readOnly:true,primary:{label:'Confirm replacement',id:'replacement-confirm',
            action:()=>{if(current())onConfirm(kind,removed.id,selected.id);}}});
      },'Choose one unowned skill of the same kind.',back,{className:'replacement-choice',stage:'new'});
    },'Only full slot kinds can be replaced. Innate traits stay equipped.',back,{className:'replacement-choice',stage:'remove'});
  }

  replaceSkill(kind,oldId,newId) {
    if(this.ended||!this.getReplaceableSkills().some(skill=>skill.kind===kind&&skill.id===oldId))return false;
    const slots=kind==='passive'?this.passiveSlots:this.skillSlots;
    const pool=kind==='passive'?this.heroData.passives||[]:this.heroData.skills;
    const definition=pool.find(skill=>skill.id===newId);
    if(!definition||SLOT_RULES.innate.includes(newId)||[...this.skillSlots,...this.passiveSlots].some(skill=>skill.id===newId))return false;
    const index=slots.findIndex(skill=>skill.id===oldId);
    if(kind==='passive')this.passives.unequip(oldId);
    slots[index]={...definition,kind,level:1,remaining:0};
    if(kind==='passive')this.passives.equip(slots[index],1);
    this.hud.setSkills(this.skillSlots,slotCount('active',this.loadoutLevel||this.stats.level));
    if(kind==='active')this.hud.setCooldown(index,0);
    this.refreshPassiveHud();
    this.skillAudio?.ui?.(kind==='passive'?'pick-passive':'pick-active');
    return true;
  }

  getSkillLoadout() {
    return {active:this.skillSlots,passive:this.passiveSlots,
      innate:[...this.passives.equipped.values()].filter(entry=>entry.innate)
        .map(entry=>({...entry.passive,level:entry.level,kind:'passive',innate:true}))};
  }

  applyChoice(card,onDone=()=>{}) {
    if(this.ended)return;
    const kind=card.kind||'active';
    const slots=kind==='passive'?this.passiveSlots:this.skillSlots;
    const pool=kind==='passive'?(this.heroData.passives||[]):this.heroData.skills;
    if(card.choiceType==='upgrade-passive'&&card.innate){
      const entry=this.passives.equipped.get(card.id);
      if(entry?.innate)this.passives.setLevel(card.id,entry.level+1);
    } else if (card.choiceType === 'new-active'||card.choiceType==='new-passive') {
      if(!slots.some(skill=>skill.id===card.id)){
        const skill={...pool.find(entry=>entry.id===card.id)||card,kind,level:1,remaining:0};
        slots.push(skill);
        if(kind==='passive')this.passives.equip(skill,1);
      }
    } else if (card.choiceType === 'upgrade-active'||card.choiceType==='upgrade-passive') {
      const existing = slots.find((entry) => entry.id === card.id);
      const maxLevel=kind==='passive'?SLOT_RULES.passive.maxLevel:SLOT_RULES.active.maxLevel;
      if (existing){existing.level=Math.min(maxLevel,existing.level+1);if(kind==='passive')this.passives.setLevel(existing.id,existing.level);}
    } else if(kind==='stat'||card.stat) {
      this.applyModifier(card);
    } else return;
    this.hud.setSkills(this.skillSlots,slotCount('active',this.loadoutLevel));
    this.refreshPassiveHud();
    if(kind==='active'||kind==='passive')this.skillAudio?.ui?.(`pick-${kind}`);
    onDone();
  }

  applyModifier(card) {
    const { stat, amount } = card;
    if (stat === 'heal') this.stats.hp=Math.min(this.stats.maxHp,this.stats.hp+amount);
    else if (stat === 'damage') this.stats.damage += amount;
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

  prepareMapWorld(progress,signal) { return this.mapWorld?.prepare(progress,signal); }

  damagePropsInArea(x, y, range) {
    this.props.children.each((prop) => {
      if (prop?.active&&prop.getData('breakable')&&Phaser.Math.Distance.Between(x, y, prop.x, prop.y) <= range) this.damageProp(prop, 30);
    });
  }

  damageProp(prop, amount) {
    if (!prop?.active||!prop.getData('breakable')) return;
    const hp = (prop.getData('hp') || 20) - amount;
    prop.setData('hp', hp);
    prop.setTintFill(0xffd89a);
    this.time.delayedCall(80, () => prop?.active && prop.clearTint());
    if (hp > 0) return;
    const x = prop.x; const y = prop.y;
    this.mapWorld?.markDestroyed(prop.getData('mapPlacementId'));
    prop.destroy();
    const rolls = 1 + (Math.random() < .28 ? 1 : 0);
    for (let i = 0; i < rolls; i += 1) this.spawnPickup('cacao', x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12), 1);
    if (Math.random() < .2) this.spawnPickup('potion', x + 8, y, 18);
    this.audio.sfx('hit', .12);
  }

  closestEnemy(x, y, range) {
    let best = null; let bestDistance = range;
    this.enemies.children.each((enemy) => {
      if (!enemy?.active||enemy.getData('buried')||enemy.getData('invulnerableEnemy')) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance < bestDistance) { best = enemy; bestDistance = distance; }
    });
    return best;
  }

  floatText(x, y, text, color) {
    const label = this.add.text(x, y, t(text), { ...gameTextStyle(t(text)), color, stroke: '#201019', strokeThickness: 4 }).setOrigin(.5).setDepth(effectDepth(y,50));
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
    this.audio?.play?.('heal');
    this.playEffect(2,this.player.x,this.player.y,100);
  }

  playEffect(row,x,y,size=100,angle=0,tint) {
    if(this.effects.countActive()> (this.settings.particles==='low'?20:65)) return;
    const effect=this.add.sprite(x,y,`fx-${row}`).setDepth(effectDepth(y,24)).setDisplaySize(size,size).setRotation(angle);
    if(tint!==undefined&&tint!==null)effect.setTint(tint);
    this.effects.add(effect);
    effect.play(`effect-${row}`);
    effect.once('animationcomplete',()=>effect.destroy());
    return effect;
  }

  animateCharacter(sprite,key,state,lock=0) {
    if(!sprite?.active||!key)return;
    if(!lock && (sprite.getData('animLock')||0)>this.elapsed)return;
    const action=sprite.getData('behaviorState');
    if(!lock&&action&&(state==='walk'||state==='idle'))state=action.busy?'windup':action.motion||action.after?'attack':action.recoveryUntil>this.elapsed?'recover':state;
    if(lock)sprite.setData('animLock',this.elapsed+lock);
    const animation=this.anims.exists(`${key}-${state}`)?`${key}-${state}`:`${key}-${state==='windup'?'attack':state==='recover'?'idle':state}`;
    sprite.play(animation,true);
    this.enemyVisuals?.pose(sprite,state,lock);
    this.bossVisuals?.pose(sprite,state,lock);
  }

  togglePause() {
    if(this.ended)return;
    if(this.cutscenes?.active){this.cutscenes.skip();return;}
    // Escape and the native Android Back hook route to the current pause panel.
    if(this.pauseSession){this.pauseSession.back();return;}
    if(this.pausedForChoice)return;
    this.pauseForSelection();
    const session={overlay:null,back:null};this.pauseSession=session;
    this.audio.ui?.('pause-open');
    const current=()=>!this.ended&&this.pauseSession===session;
    const close=()=>{session.overlay?.remove();session.overlay=null;};
    const resume=() => {
      if(!current())return;
      close();this.pauseSession=null;
      this.audio.ui?.('pause-close');
      this.pausedForChoice = false;
      this.physics.resume();
      this.tweens.resumeAll();
      this.time.paused=false;
      this.skillAudio?.resume?.();
    };
    const navigate=(render,back)=>{
      if(!current())return;
      close();session.back=back;session.overlay=render();
    };
    const showEditor=back=>navigate(()=>this.hud.showHudEditor(layouts=>{if(current())this.options.onHudLayoutChange?.(layouts);},back),back);
    const showSettings=()=>navigate(()=>this.hud.showSettings((key,value)=>{if(current())this.options.onSettingsChange?.(key,value);},showPause,()=>showEditor(showSettings)),showPause);
    const showPause=()=>navigate(()=>this.hud.showPause(resume,()=>{if(current()){close();this.pauseSession=null;this.finishRun(false,true);}},
      ()=>navigate(()=>this.hud.showSkills(this.getSkillLoadout(),showPause),showPause),
      showSettings,
      ()=>navigate(()=>this.hud.showHelp(showPause),showPause),()=>showEditor(showPause)),resume);
    showPause();
  }

  finishRun(victory, abandoned = false) {
    if (this.ended) return;
    this.ended = true;
    if(!victory&&!abandoned)this.audio.play?.('hero-death');
    this.cutscenes?.destroy();this.bossController?.destroy();this.bossPresentation?.destroy();
    this.telegraphs?.cancelAll();
    this.skillAudio?.stopAll?.();
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
    this.ended = true; // Destroying a ward/movement effect must not deal shutdown damage.
    this.cutscenes?.destroy();this.bossController?.destroy();this.bossPresentation?.destroy();
    this.pauseSession?.overlay?.remove();this.pauseSession=null;
    if(this.onViewportResize)this.scale.off('resize',this.onViewportResize);
    window.removeEventListener('pointerup',this.releaseAttack);
    window.removeEventListener('blur',this.releaseAttack);
    this.passives?.destroy();
    this.weather?.destroy();
    this.skillEffects?.forEach((effect) => effect.destroy());
    this.fx?.destroy();this.skillAudio?.destroy();this.skillBuffs?.clear();
    this.telegraphs?.destroy();this.enemyBars?.destroy();this.spawnDirector?.destroy();
    this.enemySystem?.destroy();
    this.enemyVisuals?.destroy();
    this.bossVisuals?.destroy();
    this.playerOcclusion?.destroy();
    this.water?.destroy();
    this.mapWorld?.destroy();
    this.hud?.destroy();
  }
}

