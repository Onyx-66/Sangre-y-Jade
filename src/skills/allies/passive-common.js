export function equipped(scene, role, id) {
  return scene.companion?.id === role && scene.companion.skills.some((skill) => skill.id === id);
}

export function valueAt(level, values = []) {
  return values[Math.min(values.length - 1, Math.max(0, level - 1))] || 0;
}

export function allyPassive(scene, id) {
  return scene.companion?.skills.find((skill) => skill.id === id) || null;
}
