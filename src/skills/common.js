import { configureProjectile } from './kukul/projectiles.js';
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const skillCooldown = (skill) => skill.cooldown * ((skill.level || 1) >= 5 ? .9 : 1);
export const manaCost = (stats, base = 0) => Math.max(0, base * (stats.manaCostMult ?? 1));

export function skillContext(scene, skill) {
  const level = clamp(skill.level || 1, 1, 6);
  const areaScale = level >= 3 ? 1.1 : 1;
  const counts = { projectile: 1, line: 1, burst: 7, orbit: 4, rain: 8 };
  const baseProjectiles = skill.projectiles ?? skill.params?.projectiles ?? counts[skill.type];
  const baseChains = skill.chains ?? skill.params?.chains ?? (skill.type === 'chain' ? 4 : undefined);
  const baseOrbiters = skill.params?.orbiters;
  const baseCharges = skill.params?.charges;
  const hasCount = [baseProjectiles, baseChains, baseOrbiters, baseCharges].some((count) => count !== undefined);
  const radiusScale=scene.stats.range*areaScale*(scene.hasGear('bone-bracers')?1.25:1);
  const range = (skill.range || 0) * radiusScale;
  const target = scene.closestEnemy(scene.player.x, scene.player.y, Math.max(range, 680));
  const aim = scene.getAimAngle(target);
  const count = (base) => base === undefined ? undefined : base + (level >= 6 ? 1 : 0);
  return {
    level, areaScale, radiusScale, durationScale: areaScale * (level >= 6 && !hasCount ? 1.2 : 1),
    projectiles: count(baseProjectiles), chains: count(baseChains), orbiters: count(baseOrbiters), charges: count(baseCharges),
    damage: (skill.damage || 0) * scene.stats.damage * (1 + .25 * (level - 1)) * scene.support.modifiers().damage,
    damageScale: scene.stats.damage * (1 + .25 * (level - 1)) * scene.support.modifiers().damage,
    range, target, aim, cooldown: skillCooldown(skill), mana: manaCost(scene.stats, skill.mana),
    tx: target?.x ?? scene.player.x + Math.cos(aim) * Math.max(120, range * .65),
    ty: target?.y ?? scene.player.y + Math.sin(aim) * Math.max(120, range * .65),
  };
}

function hit(scene, enemy, damage, origin, options) {
  scene.damageEnemy(enemy, damage, options.critBonus || 0, options.knockback || 0, origin, { byAlly: options.byAlly });
  if (enemy.active && options.status) applyStatus(scene, enemy, options.status.id, options.status.duration,
    { source: origin, byAlly: options.byAlly ?? Boolean(origin?.getData?.('byAlly')), ...options.status.params });
  options.onHit?.(enemy);
}

export function damageArea(scene, origin, radius, damage, options = {}) {
  const targets = scene.enemies.getChildren().filter((enemy) => enemy.active && Math.hypot(enemy.x - origin.x, enemy.y - origin.y) <= radius);
  for (const enemy of targets) if (enemy.active) hit(scene, enemy, damage, origin, options);
  return targets;
}

export function cone(scene, { origin = scene.player, angle = 0, range, damage, width = Math.PI * .72, ...options }) {
  const targets = scene.enemies.getChildren().filter((enemy) => {
    const difference = Math.atan2(Math.sin(Math.atan2(enemy.y - origin.y, enemy.x - origin.x) - angle), Math.cos(Math.atan2(enemy.y - origin.y, enemy.x - origin.x) - angle));
    return enemy.active && Math.hypot(enemy.x - origin.x, enemy.y - origin.y) <= range && Math.abs(difference) <= width / 2;
  });
  for (const enemy of targets) if (enemy.active) hit(scene, enemy, damage, origin, options);
  return targets;
}

export function lineStrike(scene, { origin = scene.player, angle = 0, range, width = 40, damage, ...options }) {
  const targets = scene.enemies.getChildren().filter((enemy) => {
    const dx = enemy.x - origin.x, dy = enemy.y - origin.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    const across = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return enemy.active && along >= 0 && along <= range && Math.abs(across) <= width / 2;
  });
  for (const enemy of targets) if (enemy.active) hit(scene, enemy, damage, origin, options);
  return targets;
}

export function spawnProjectile(scene, { origin = scene.player, angle = 0, damage, speed = 620, pierce = 1, life = 1.2, tint = 0x69eec1, critBonus = 0, scale = 1, visual = 'default', byAlly = Boolean(origin?.getData?.('byAlly')), status = null, onHit = null, skillId = null, basicAttack = false }) {
  const projectile = scene.fireProjectile(origin.x, origin.y, angle, damage, speed, pierce, life, tint, critBonus, scale, visual);
  projectile?.setData({ source: origin, byAlly, status, onHit });
  configureProjectile(scene,projectile,{skillId,basicAttack,byAlly});
  return projectile;
}

export function timedEffect(scene, duration, sprites, update, onEnd = () => {}) {
  const effect = { remaining: duration, sprites, update, active: true, destroy() {
    if (!this.active) return;
    this.active = false;
    this.sprites.forEach((sprite) => sprite.destroy());
    onEnd();
  } };
  (scene.skillEffects ||= []).push(effect);
  return effect;
}

export function orbitBlades(scene, { count = 3, radius = 115, duration = 4, damage, hitRadius = 30, interval = .25, angularSpeed = TAU, texture = 'player-dart', tint = 0x69eec1, ...options }) {
  const sprites = Array.from({ length: clamp(Math.floor(count), 1, 24) }, () =>
    scene.add.image(scene.player.x, scene.player.y, texture).setDepth(16).setDisplaySize(42, 42).setTint(tint));
  let angle = 0, remaining = 0;
  return timedEffect(scene, duration, sprites, (dt) => {
    angle += angularSpeed * dt;
    remaining -= dt;
    const attack = remaining <= 0;
    if (attack) remaining = interval;
    sprites.forEach((sprite, index) => {
      const heading = angle + index / sprites.length * TAU;
      sprite.setPosition(scene.player.x + Math.cos(heading) * radius, scene.player.y + Math.sin(heading) * radius).setRotation(heading);
      if (attack) damageArea(scene, sprite, hitRadius, damage, options);
    });
  });
}

export function zone(scene, { origin = scene.player, radius, duration, damage, interval = .5, texture = 'trap', tint = 0x69eec1, ...options }) {
  const point = { x: origin.x, y: origin.y };
  const sprite = scene.add.image(point.x, point.y, texture).setDepth(7).setDisplaySize(radius * 2, radius * 2).setTint(tint).setAlpha(.6);
  let remaining = 0;
  return timedEffect(scene, duration, [sprite], (dt) => {
    remaining -= dt;
    if (remaining <= 0) { remaining = interval; damageArea(scene, point, radius, damage, options); }
  });
}

export const summon = (scene, options) => scene.createSummon(options.damage, options);

export function updateSkillEffects(scene, dt) {
  if (scene.pausedForChoice || scene.ended) return;
  const effects=scene.skillEffects||[];
  scene.skillEffects=[];
  const survivors=effects.filter((effect) => {
    if (!effect.active) return false;
    if (scene.pausedForChoice || scene.ended) return true;
    effect.update(Math.min(dt, effect.remaining));
    effect.remaining -= dt;
    if (effect.remaining <= 1e-9) effect.destroy();
    return effect.active;
  });
  // Effects may create trails or split shots; do not discard newly scheduled work.
  scene.skillEffects=[...survivors,...scene.skillEffects];
}

export function applyStatus(scene, target, status, seconds, params = {}) {
  if (!target?.active) return false;
  const until = scene.elapsed + Math.max(0, seconds);
  if (status === 'hidden' || status === 'aggro-drop') { target.hiddenUntil = until; return true; }
  const data = { [`${status}Until`]: until };
  switch (status) {
    case 'fear': data.fearSource = params.source || scene.player; break;
    case 'confuse': data.confuseNextTurn = 0; break;
    case 'pull': target.setData('pullTo', { x: params.x ?? scene.player.x, y: params.y ?? scene.player.y, until }); return true;
    case 'slow': data.slowPct = clamp(params.pct ?? .5, 0, 1); break;
    case 'mark': data.markBonus = params.bonus ?? .2; break;
    case 'taunt': data.tauntTarget = params.source || scene.companion?.sprite || null; break;
    case 'burn': case 'poison': case 'bleed':
      data[`${status}Dps`] = params.dps || 0;
      data[`${status}Source`] = params.source || scene.player;
      data[`${status}ByAlly`] = params.byAlly ?? false;
      break;
    case 'stun': case 'root': case 'blind': case 'silence': case 'disarm': break;
    default: return false;
  }
  target.setData(data);
  return true;
}
