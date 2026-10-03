import { castFx, effectActive, setEffect } from '../common.js';

export const sanctuaryDome = {
  canCast(_scene, support, skill) { return !effectActive(support, skill); },
  cast(scene, support, skill) {
    castFx(scene, skill);
    setEffect(support, skill, skill.params.duration, scene.player);
    scene.fx?.play(skill.id, 'aura', { x: scene.player.x, y: scene.player.y, duration: skill.params.duration, scale: skill.params.radius / 100 });
    return true;
  },
};
