import { castFx, effectActive, setEffect } from '../common.js';

export const lifebond = {
  canCast(scene, support, skill) {
    return scene.stats.hp / scene.stats.maxHp < .7 && !effectActive(support, skill);
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    setEffect(support, skill, skill.params.duration);
    scene.fx?.play(skill.id, 'aura', { x: scene.player.x, y: scene.player.y, duration: skill.params.duration });
    return true;
  },
};
