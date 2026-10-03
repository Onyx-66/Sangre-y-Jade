import { castFx, clearHeroDebuffs, clearShots, hasHeroDebuff } from '../common.js';

export const cleansingLight = {
  canCast(scene, support, skill) {
    return !support.effectActive(skill.id) && (hasHeroDebuff(scene) || clearableShots(scene, skill) >= 3);
  },
  cast(scene, support, skill) {
    castFx(scene, skill);
    clearShots(scene, scene.player, skill.params.radius);
    clearHeroDebuffs(scene);
    scene.stats.slowImmunityUntil = scene.elapsed + skill.params.slowImmunityDuration;
    scene.player.setData?.('slowImmunityUntil', scene.stats.slowImmunityUntil);
    support.effects[skill.id] = scene.elapsed + skill.cooldown;
    scene.fx?.play(skill.id, 'impact', { x: scene.player.x, y: scene.player.y, scale: skill.params.radius / 100 });
    return true;
  },
};

function clearableShots(scene, skill) {
  return (scene.enemyProjectiles?.getChildren() || []).filter((shot) => shot.active
    && Math.hypot(shot.x - scene.player.x, shot.y - scene.player.y) <= skill.params.radius).length;
}
