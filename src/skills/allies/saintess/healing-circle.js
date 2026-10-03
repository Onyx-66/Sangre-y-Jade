import { activeEffect, castFx, healHero } from '../common.js';

export const healingCircle = {
  canCast(scene, support) {
    return scene.stats.hp / scene.stats.maxHp < .85 && !support.effectActive('healing-circle');
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    activeEffect(scene, support, skill, skill.params.duration, (dt) =>
      healHero(scene, support, skill.params.healingPerSecond * dt));
    scene.fx?.play(skill.id, 'ground', { x: scene.player.x, y: scene.player.y, duration: skill.params.duration, scale: skill.params.radius / 100 });
    return true;
  },
};
