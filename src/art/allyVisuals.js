export const ALLY_IDS = Object.freeze(['saintess', 'tank', 'assassin']);
export const ALLY_EFFECT_IDS = Object.freeze(['saintess-heal-pulse', 'saintess-cast-glow', 'tank-bash-arc', 'tank-slam-ring',
  'assassin-slash-x', 'assassin-afterimage', 'assassin-blink-puff', 'ally-skill-pop']);
export const ALLY_WINDUP = .25;
export const ALLY_STRIKE = .2;
export const ALLY_RECOVER = .25;

// Presentation clock advances with gameplay, never with wall-clock timers.
// The hit callback is invoked only after the attack frame is selected.
export class AllyVisuals {
  constructor(scene) {
    this.scene = scene; this.action = null; this.shadow = null;
    scene.events?.once?.('shutdown', () => this.destroy());
  }
  get enabled() { return !!this.scene.textures?.exists?.(`support-${this.scene.companion?.id}-frame-15`); }
  get busy() { return !!this.action; }
  pose(state) {
    const a = this.scene.companion;
    if (!a?.sprite.active) return;
    this.scene.animateCharacter?.(a.sprite, `support-${a.id}`, state, .01);
  }
  begin(kind, strike, target) {
    if (this.busy) return false;
    if (!this.enabled) { strike(); return true; }
    this.action = { kind, strike, target, age: 0, struck: false, recovering: false };
    this.pose('windup');
    const a = this.scene.companion;
    if (a.id === 'saintess') this.effect('saintess-cast-glow', a.sprite, { duration: ALLY_WINDUP });
    if (a.id === 'assassin') this.effect('assassin-afterimage', a.sprite);
    return true;
  }
  effect(id, point, extra = {}) { this.scene.fx?.play(id, 'cast', { x: point.x, y: point.y, sound: false, ...extra }); }
  update(dt) {
    const s = this.scene, a = s.companion;
    if (!a || s.ended) { this.destroy(); return; }
    if (s.pausedForChoice || s.scene?.isPaused?.()) return;
    if (this.enabled && s.add?.ellipse) {
      this.shadow ||= s.add.ellipse(a.sprite.x, a.sprite.y + 33, 40, 12, 0x10151c, .35).setDepth(9);
      this.shadow.setPosition(a.sprite.x, a.sprite.y + 33).setVisible(a.sprite.visible !== false);
    }
    const action = this.action;
    if (!action) return;
    action.age += dt;
    if (!a.sprite.active) { this.action = null; return; }
    if (!action.struck && action.age + 1e-9 >= ALLY_WINDUP) {
      action.struck = true; this.pose('attack');
      // A vanished/dead target must never receive a delayed basic hit.
      if (action.kind !== 'attack' || action.target?.active) {
        const result = action.strike();
        if (result !== false) {
          const hook = `ally-${a.id}-${action.kind}`;
          if (typeof s.audio?.play === 'function') s.audio.play(hook, { x: a.sprite.x, y: a.sprite.y });
          else s.audio?.sfx?.(a.id === 'saintess' ? 'spell' : 'slash', .12);
          const point = a.id === 'saintess' ? s.player : action.target?.active ? action.target : a.sprite;
          this.effect(a.id === 'saintess' ? 'saintess-heal-pulse' : a.id === 'tank' ? 'tank-bash-arc' : 'assassin-slash-x', point);
        }
      }
    }
    if (!action.recovering && action.age + 1e-9 >= ALLY_WINDUP + ALLY_STRIKE) {
      action.recovering = true; this.pose('recover');
    }
    if (action.age + 1e-9 >= ALLY_WINDUP + ALLY_STRIKE + ALLY_RECOVER) { this.action = null; this.pose('idle'); }
  }
  destroy() { this.action = null; this.shadow?.destroy(); this.shadow = null; }
}
