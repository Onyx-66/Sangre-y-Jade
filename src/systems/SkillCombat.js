export function restoreSkillMana(stats, restore) {
  if (restore) stats.mana = Math.min(stats.maxMana, stats.mana + restore);
}

export function applyProjectileTint(projectile, tint) {
  return projectile.setTint(tint);
}

export function ringEffect(scene, x, y, scale, tint) {
  return scene.playEffect(4, x, y, scale * 128, 0, tint);
}

export function applySlow(enemy, elapsed) {
  if (enemy.getData('slowUntil') <= elapsed) return false;
  const slowPct = enemy.getData('slowPct') ?? 0.5;
  enemy.setVelocity(enemy.body.velocity.x * (1 - slowPct), enemy.body.velocity.y * (1 - slowPct));
  return true;
}

export function chainAttack(scene, target, range, damage, count) {
  if (!target) return;
  const hit = new Set();
  let previous = target;
  for (let index = 0; index < count; index += 1) {
    const enemy = scene.enemies.getChildren()
      .filter((candidate) => candidate.active && !hit.has(candidate)
        && Math.hypot(previous.x - candidate.x, previous.y - candidate.y) < range)
      .sort((a, b) => Math.hypot(previous.x - a.x, previous.y - a.y)
        - Math.hypot(previous.x - b.x, previous.y - b.y))[0];
    if (!enemy) break;
    hit.add(enemy);
    const line = scene.add.line(0, 0, previous.x, previous.y, enemy.x, enemy.y, 0xa6ffe1, .78)
      .setOrigin(0).setDepth(17).setLineWidth(3, 1);
    scene.tweens.add({ targets: line, alpha: 0, duration: 180 + index * 25, onComplete: () => line.destroy() });
    scene.damageEnemy(enemy, damage * Math.pow(.88, index), 0, 90);
    previous = enemy;
  }
}
