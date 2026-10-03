import { PASSIVE_HANDLERS } from './index.js';
export class EventBus {
  constructor() { this.listeners = new Map(); }

  on(event, listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(listener);
    return () => {
      const listeners = this.listeners.get(event);
      listeners?.delete(listener);
      if (!listeners?.size) this.listeners.delete(event);
    };
  }

  emit(event, context) {
    for (const listener of [...(this.listeners.get(event) || [])]) listener(context);
  }

  clear() { this.listeners.clear(); }
}

export class PassiveSystem {
  constructor(scene) {
    this.scene = scene;
    this.bus = new EventBus();
    this.equipped = new Map();
  }

  equip(passive, level = 1, { innate = false } = {}) {
    const logic=PASSIVE_HANDLERS[passive.id];
    if(logic)passive={...logic,...passive,on:passive.on||logic.on,stat:passive.stat||logic.stat};
    this.unequip(passive.id);
    const entry = { id: passive.id, passive, level: Math.max(1, Math.min(5, level)), innate, state: {}, unsubscribe: [] };
    this.equipped.set(passive.id, entry);
    for (const [event, handler] of Object.entries(passive.on || {})) {
      entry.unsubscribe.push(this.bus.on(event, (context) => handler({ ...context, state: entry.state }, entry.level)));
    }
    passive.on?.tick?.({scene:this.scene,stats:this.scene.stats,player:this.scene.player,state:entry.state,dt:0},entry.level);
    return entry;
  }

  setLevel(id, level) {
    const entry = this.equipped.get(id);
    if (entry) {
      entry.level = Math.max(1, Math.min(5, level));
      entry.passive.on?.tick?.({scene:this.scene,stats:this.scene.stats,player:this.scene.player,state:entry.state,dt:0},entry.level);
    }
  }

  unequip(id) {
    const entry = this.equipped.get(id);
    entry?.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.equipped.delete(id);
  }

  emit(event, payload = {}) {
    this.bus.emit(event, { ...payload, scene: this.scene, stats: this.scene.stats, player: this.scene.player });
  }

  avoidDamage(payload = {}) {
    for(const entry of this.equipped.values()) if(entry.passive.avoidDamage?.({scene:this.scene,stats:this.scene.stats,player:this.scene.player,state:entry.state,...payload},entry.level))return true;
    return false;
  }

  modifiers(context = {}) {
    const result = { speedMult: 1, pickupRangeMult: 1 };
    for (const { passive, level, state } of this.equipped.values()) {
      for (const contribution of [passive.stat?.(level,{scene:this.scene,stats:this.scene.stats,player:this.scene.player,state,...context}), state.modifiers]) {
        for (const [key, value] of Object.entries(contribution || {})) {
          result[key] = key.endsWith('Mult') ? (result[key] ?? 1) * value : (result[key] ?? 0) + value;
        }
      }
    }
    return result;
  }

  redirectDamage(damage, context = {}) {
    let remaining = damage;
    for (const { passive, level, state } of this.equipped.values()) {
      const redirected = passive.redirectDamage?.({ scene: this.scene, stats: this.scene.stats, player: this.scene.player,
        state, damage: remaining, ...context }, level);
      if (Number.isFinite(redirected)) remaining = Math.max(0, redirected);
    }
    return remaining;
  }

  preventFatal(damage, context = {}) {
    let remaining = damage;
    for (const { passive, level, state } of this.equipped.values()) {
      const prevented = passive.preventFatal?.({ scene: this.scene, stats: this.scene.stats, player: this.scene.player,
        state, damage: remaining, ...context }, level);
      if (Number.isFinite(prevented)) remaining = Math.max(0, prevented);
    }
    return remaining;
  }

  destroy() {
    for (const id of this.equipped.keys()) this.unequip(id);
    this.bus.clear();
  }
}
