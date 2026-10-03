import { activeEffect, castFx, healHero } from '../common.js';

export const healingCircle = {
  canCast(scene, support) {
    return scene.stats.hp / scene.stats.maxHp < .85 && !support.effectActive('healing-circle');
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    const origin = { x: scene.player.x, y: scene.player.y };
    activeEffect(scene, support, skill, skill.params.duration, (dt) => {
      if (Math.hypot(scene.player.x - origin.x, scene.player.y - origin.y) <= skill.params.radius)
        healHero(scene, support, skill.params.healingPerSecond * dt);
    });
    scene.fx?.play(skill.id, 'ground', { ...origin, duration: skill.params.duration, scale: skill.params.radius / 100 });
    return true;
  },
};
