import { castFx, effectActive, setEffect } from '../common.js';
import { activeEnemies, distance } from '../common.js';

export const warCry = {
  canCast(_scene, support, skill) { return !effectActive(support, skill); },
  cast(scene, support, skill) {
    const tank = scene.companion.sprite;
    castFx(scene, skill, tank);
    for (const enemy of activeEnemies(scene)) {
      if (!enemy.getData('isBoss') && distance(enemy, tank) <= skill.params.radius) {
        enemy.setData({ tauntUntil: scene.elapsed + skill.params.duration, tauntTarget: tank });
      }
    }
    setEffect(support, skill, skill.params.duration);
    support.tankDamageTakenMult = 1 - skill.params.damageReductionPct / 100;
    support.tankDamageTakenUntil = scene.elapsed + skill.params.duration;
    scene.companion.damageTakenMult=support.tankDamageTakenMult;
    scene.fx?.play(skill.id, 'impact', { x: tank.x, y: tank.y, scale: skill.params.radius / 180 });
    return true;
  },
};
