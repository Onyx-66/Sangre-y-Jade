import { damageArea } from '../../common.js';
import { castFx, effectActive } from '../common.js';

export const groundSlam = {
  origin(_scene, support) { return support.scene.companion.sprite; },
  canCast(scene, support, skill, _target, { failsafe = false } = {}) {
    const count=scene.enemies.getChildren()
      .filter((enemy) => enemy.active && Math.hypot(enemy.x - scene.companion.sprite.x, enemy.y - scene.companion.sprite.y) <= skill.params.radius).length;
    return !effectActive(support, skill) && count >= (failsafe ? 1 : 2);
  },
  cast(scene, support, skill) {
    const tank = scene.companion.sprite;
    castFx(scene, skill, tank);
    damageArea(scene, tank, skill.params.radius, skill.params.damage * support.numberMultiplier(), {
      byAlly: true,
      status: { id: 'stun', duration: skill.params.stunDuration, params: { source: tank, byAlly: true } },
    });
    scene.fx?.play(skill.id, 'impact', { x: tank.x, y: tank.y, scale: skill.params.radius / 100 });
    return true;
  },
};
