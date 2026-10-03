import { activeEnemies, castFx, damage, distance, effectActive } from '../common.js';

export const shieldThrow = {
  origin(_scene, support) { return support.scene.companion.sprite; },
  canCast(scene, support, skill) {
    return !effectActive(support, skill) && activeEnemies(scene)
      .filter((enemy) => distance(enemy, scene.companion.sprite) <= skill.params.range).length >= 2;
  },
  cast(scene, support, skill) {
    const tank = scene.companion.sprite;
    castFx(scene, skill, tank);
    const remaining = activeEnemies(scene);
    const victims = [];
    let point = tank;
    for (let index = 0; index < skill.params.maxTargets; index += 1) {
      const next = remaining.filter((enemy) => distance(enemy, point) <= skill.params.range)
        .sort((a, b) => distance(a, point) - distance(b, point))[0];
      if (!next) break;
      victims.push(next);
      remaining.splice(remaining.indexOf(next), 1);
      point = next;
    }
    for (const enemy of victims) damage(scene, support, skill, enemy, skill.params.damage);
    const end=victims.at(-1)||tank;
    scene.fx?.play(skill.id, 'travel', { x: tank.x, y: tank.y, duration: .5, target: end });
    if(victims.length)scene.fx?.play(skill.id, 'travel', { x: end.x, y: end.y, duration: .5, target: tank });
    return victims.length > 0;
  },
};
