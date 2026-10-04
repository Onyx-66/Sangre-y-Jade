import { applySlow } from '../systems/SkillCombat.js';
import { retentionRadius } from '../systems/Viewport.js';

const active = (enemy, key, elapsed) => (enemy.getData(key) || 0) > elapsed;

export const HERO_EFFECT_DEFAULTS = {
  damageTakenMult: 1, reflectUntil: 0, dodgeCharges: 0, intangibleUntil: 0,
  manaCostMult: 1, manaRegenMult: 1, lifestealPct: 0, cooldownRecoveryMult: 1,
};

// Reset every status when an Arcade sprite is reused, including sources and magnitudes.
export const enemyStatusDefaults = () => ({
  stunUntil: 0, slowUntil: 0, slowPct: .5, rootUntil: 0,
  fearUntil: 0, fearSource: null, confuseUntil: 0, confuseHeading: 0, confuseNextTurn: 0,
  wanderHeading: 0, wanderNextTurn: 0, pullTo: null, blindUntil: 0,
  tauntUntil: 0, tauntTarget: null, markUntil: 0, markBonus: 0, markHeal: 0, markSource: null,
  silenceUntil: 0, disarmUntil: 0,
  poisonUntil: 0, poisonDps: 0, poisonSource: null, poisonByAlly: false, basicPoisonStacks: [],
  bleedUntil: 0, bleedDps: 0, bleedSource: null, bleedByAlly: false,
  burnUntil: 0, burnDps: 0, burnSource: null, burnByAlly: false, burnTinted: false,
});

export function canEnemyAttack(scene, enemy, againstHero = false) {
  if (['stunUntil', 'fearUntil', 'confuseUntil'].some((key) => active(enemy, key, scene.elapsed))) return false;
  if (againstHero && !enemy.getData('isBoss') && scene.player.hiddenUntil > scene.elapsed) return false;
  return true;
}

export const enemyDamageMult = (scene, enemy) => active(enemy, 'disarmUntil', scene.elapsed) ? .55 : 1;
export const enemyShotAngle = (scene, enemy, angle, targetsHero = true, random = Math.random) =>
  targetsHero && active(enemy, 'blindUntil', scene.elapsed) ? angle + Math.PI + (random() - .5) * .34 : angle;

export function updateDamageOverTime(scene, enemy, dt) {
  const stacks=enemy.getData('basicPoisonStacks')||[];
  for(const stack of stacks){
    if(!enemy.active||scene.ended)break;
    const seconds=Math.min(dt,Math.max(0,stack.until-(scene.elapsed-dt)));
    if(seconds>0)scene.damageEnemy(enemy,stack.dps*seconds,0,0,stack.source,{dot:true,byAlly:false,visuals:false});
  }
  enemy.setData('basicPoisonStacks',stacks.filter(stack=>stack.until>scene.elapsed));
  for (const status of ['poison', 'bleed', 'burn']) {
    if (!enemy.active || scene.ended) break;
    const seconds = Math.min(dt, Math.max(0, (enemy.getData(`${status}Until`) || 0) - (scene.elapsed - dt)));
    const damage = (enemy.getData(`${status}Dps`) || 0) * seconds;
    if (damage > 0) scene.damageEnemy(enemy, damage, 0, 0, enemy.getData(`${status}Source`) || scene.player,
      { dot: true, byAlly: Boolean(enemy.getData(`${status}ByAlly`)), visuals: false });
  }
  if (!enemy.active) return;
  if (active(enemy, 'burnUntil', scene.elapsed)) {
    enemy.setTint(0xff8a36);
    enemy.setData('burnTinted', true);
  } else if (enemy.getData('burnTinted')) {
    enemy.clearTint();
    enemy.setData('burnTinted', false);
  }
}

function wander(enemy, elapsed, prefix, random) {
  if ((enemy.getData(`${prefix}NextTurn`) || 0) <= elapsed) {
    enemy.setData({ [`${prefix}Heading`]: random() * Math.PI * 2, [`${prefix}NextTurn`]: elapsed + .4 });
  }
  const heading = enemy.getData(`${prefix}Heading`);
  return { x: Math.cos(heading), y: Math.sin(heading) };
}

export function updateEnemy(scene, enemy, dt, random = Math.random) {
  if (!enemy.active || scene.pausedForChoice || scene.ended) return;
  updateDamageOverTime(scene, enemy, dt);
  if (!enemy.active || scene.pausedForChoice || scene.ended) return;
  if (active(enemy, 'stunUntil', scene.elapsed)) { enemy.setVelocity(0, 0); return; }

  const tauntTarget = enemy.getData('tauntTarget') || scene.companion?.sprite;
  const taunted = active(enemy, 'tauntUntil', scene.elapsed) && tauntTarget?.active;
  const target = taunted ? tauntTarget : scene.player;
  const dx = target.x - enemy.x, dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = enemy.getData('speed');
  const hidden = !taunted && !enemy.getData('isBoss') && scene.player.hiddenUntil > scene.elapsed;
  if (active(enemy, 'fearUntil', scene.elapsed)) {
    const source = enemy.getData('fearSource') || scene.player;
    const fx = enemy.x - source.x, fy = enemy.y - source.y;
    const length = Math.hypot(fx, fy) || 1;
    enemy.setVelocity((fx || (!fy ? 1 : 0)) / length * speed, fy / length * speed);
  } else if (active(enemy, 'confuseUntil', scene.elapsed) || hidden) {
    const heading = wander(enemy, scene.elapsed, hidden ? 'wander' : 'confuse', random);
    enemy.setVelocity(heading.x * speed, heading.y * speed);
  } else if (enemy.getData('isBoss')) {
    scene.updateBoss(enemy, dt, dx, dy, distance);
  } else if (enemy.getData('ranged') && distance < 410) {
    enemy.setVelocity(-dy / distance * 16, dx / distance * 16);
    const nextShot = (enemy.getData('nextShot') || 0) - dt;
    enemy.setData('nextShot', nextShot);
    if (nextShot <= 0 && !active(enemy, 'silenceUntil', scene.elapsed)) {
      scene.spawnEnemyProjectile(enemy.x, enemy.y, enemyShotAngle(scene, enemy, Math.atan2(dy, dx), !taunted, random),
        210, (8 + scene.elapsed / 150) * enemyDamageMult(scene, enemy), enemy);
      enemy.setData('nextShot', 2.2 + random() * .8);
    }
  } else {
    enemy.setVelocity(dx / distance * speed, dy / distance * speed);
  }

  const pull = enemy.getData('pullTo');
  if (pull?.until > scene.elapsed) {
    const length = Math.hypot(pull.x - enemy.x, pull.y - enemy.y);
    // Stop at the point instead of oscillating across it on short frames.
    const pullSpeed = Math.min(speed * 2, length / dt);
    enemy.setVelocity(length ? (pull.x - enemy.x) / length * pullSpeed : 0, length ? (pull.y - enemy.y) / length * pullSpeed : 0);
  }
  if (active(enemy, 'rootUntil', scene.elapsed)) enemy.setVelocity(0, 0);
  applySlow(enemy, scene.elapsed);
  if (Math.hypot(scene.player.x - enemy.x, scene.player.y - enemy.y) > retentionRadius(scene,1150) && !enemy.getData('isBoss')) enemy.destroy();
  if (!enemy.active) return;
  enemy.setFlipX(enemy.body.velocity.x < 0);
  scene.animateCharacter(enemy, enemy.getData('artKey'), Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y) > 0 ? 'walk' : 'idle');
}
