import { castFx, effectActive, setEffect } from '../common.js';

export const vanish = {
  canCast(_scene, support, skill) { return !effectActive(support, skill); },
  cast(scene, support, skill) {
    castFx(scene, skill);
    scene.player.hiddenUntil = scene.elapsed + skill.params.duration;
    support.stealthDamageUntil = scene.elapsed + skill.params.duration;
    support.lastStealthAt = scene.elapsed;
    setEffect(support, skill, skill.params.duration);
    scene.fx?.play(skill.id, 'aura', { x: scene.player.x, y: scene.player.y, duration: skill.params.duration });
    return true;
  },
};
