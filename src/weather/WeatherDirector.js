import { worldView } from '../systems/Viewport.js';

export const WEATHER_QUALITY_CAPS = Object.freeze({ low: 80, medium: 160, high: 300 });

// These IDs match the weather still convention used by the map-art step. A
// preloaded `weather-<id>` texture is preferred; procedural canvas textures are
// always available as a safe fallback.
export const WEATHER_STILL_PATHS = Object.freeze({
  'leaf-a': 'weather/leaf-a.png', 'leaf-b': 'weather/leaf-b.png',
  'rain-streak': 'weather/rain-streak.png', 'rain-splash': 'weather/rain-splash.png',
  'mist-wisp': 'weather/mist-wisp.png', 'god-ray': 'weather/god-ray.png',
  'ash-flake': 'weather/ash-flake.png', ember: 'weather/ember.png',
  'red-fog': 'weather/red-fog.png', 'lightning-flash': 'weather/lightning-flash.png',
  spore: 'weather/spore.png', drip: 'weather/drip.png',
  'cave-fog': 'weather/cave-fog.png', 'rock-small': 'weather/rock-small.png',
});

const WEATHER = Object.freeze({
  overgrown: {
    tint: 0xcfe9d0, tintAlpha: 0.035, vignette: 0x14251b,
    layers: [
      { id: 'mist-wisp', rate: 0.46, maxAlive: 26, life: [7, 12], alpha: 0.16, vx: [-3, 4], vy: [-2, 2], depth: -3 },
      { id: 'leaf-a', rate: 0.42, maxAlive: 10, life: [3, 5], alpha: 0.82, vx: [-21, 19], vy: [26, 54], depth: 2 },
      { id: 'leaf-b', rate: 0.43, maxAlive: 10, life: [3, 5], alpha: 0.82, vx: [-21, 19], vy: [26, 54], depth: 2 },
      { id: 'god-ray', overlay: true },
    ],
    ambientLoops: ['wind-soft'],
    event: { id: 'warm-rain-shower', first: [240, 300], interval: [240, 300], duration: 40, visibility: 0.10,
      particles: [
        { id: 'rain-streak', rate: 48, maxAlive: 90, life: [0.65, 1.2], alpha: 0.66, vx: [-34, -18], vy: [420, 520], depth: -2 },
        { id: 'rain-splash', rate: 12, maxAlive: 24, life: [0.2, 0.5], alpha: 0.42, vx: [-12, 12], vy: [-3, 3], depth: 2 },
      ], loops: ['rain-light'] },
  },
  bloodmoon: {
    tint: 0xd4484f, tintAlpha: 0.038, vignette: 0x160e1c,
    layers: [
      { id: 'red-fog', overlay: true },
      { id: 'ash-flake', rate: 0.26, maxAlive: 48, life: [5, 9], alpha: 0.48, vx: [-14, 12], vy: [-8, 9], depth: -2 },
      { id: 'ember', rate: 0.35, maxAlive: 24, life: [1.8, 3.6], alpha: 0.9, vx: [-9, 10], vy: [-28, -9], depth: 1 },
    ],
    ambientLoops: ['wind-soft', 'embers-crackle'],
    lightning: { interval: [20, 40], flashSeconds: 0.12 },
    event: { id: 'ash-storm', first: [285, 315], interval: [285, 315], duration: 30, visibility: 0.20,
      particles: [{ id: 'ash-flake', rate: 28, maxAlive: 105, life: [1.7, 3.2], alpha: 0.62, vx: [-82, -42], vy: [-7, 8], depth: -2 }], loops: ['wind-ashstorm'] },
  },
  cenote: {
    tint: 0x8ec5ff, tintAlpha: 0.035, vignette: 0x081725,
    layers: [
      { id: 'drip', rate: 0.42, maxAlive: 22, life: [2.2, 4], alpha: 0.48, vx: [-4, 4], vy: [32, 58], depth: 1 },
      { id: 'cave-fog', overlay: true },
      { id: 'spore', rate: 0.33, maxAlive: 35, life: [4, 8], alpha: 0.78, vx: [-8, 9], vy: [-8, 7], depth: 2 },
      { id: 'god-ray', overlay: true },
    ],
    ambientLoops: ['water-flow', 'drips'],
    event: { id: 'rockfall', first: [285, 315], interval: [285, 315], duration: 20, visibility: 0,
      particles: [{ id: 'rock-small', rate: 4, maxAlive: 42, life: [0.5, 0.9], alpha: 0.82, vx: [-14, 14], vy: [70, 140], depth: 2 }], loops: [] },
  },
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const between = (rng, [min, max]) => min + rng() * (max - min);
const eventParticles = event => event?.particles || (event?.particle ? [event.particle] : []);
const mulberry32 = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
};

function makeProceduralTexture(scene, id) {
  const key = `weather-particle-${id}`;
  if (scene.textures?.exists?.(key)) return key;
  const texture = scene.textures?.createCanvas?.(key, 24, 24);
  const context = texture?.getContext?.();
  if (!context) return scene.textures?.exists?.('ground') ? 'ground' : key;
  context.clearRect(0, 0, 24, 24);
  context.imageSmoothingEnabled = false;
  const colors = {
    'leaf-a': ['#9db95b', '#d7a848'], 'leaf-b': ['#d7a848', '#f0d27d'],
    'rain-streak': ['#c5e8e8', '#f6fff4'], 'rain-splash': ['#9fdddc', '#e9ffff'],
    'mist-wisp': ['#cfe9d0', '#819e8a'], 'god-ray': ['#f2d889', '#fff2bd'],
    'ash-flake': ['#a89a9a', '#756b78'], ember: ['#ff9a3c', '#ffd45a'],
    'red-fog': ['#d4484f', '#6e384b'], 'lightning-flash': ['#fff6d7', '#d4bbff'],
    spore: ['#55e5c0', '#d8fff0'], drip: ['#8ec5ff', '#e8f2ff'],
    'cave-fog': ['#91bdc4', '#5a8496'], 'rock-small': ['#aaa79d', '#ded5c4'],
  }[id] || ['#cfe9d0', '#ffffff'];
  if (id.includes('fog') || id.includes('mist') || id === 'ash-flake') {
    const gradient = context.createRadialGradient(12, 12, 1, 12, 12, 11);
    gradient.addColorStop(0, `${colors[0]}a8`); gradient.addColorStop(1, `${colors[0]}00`);
    context.fillStyle = gradient; context.fillRect(1, 1, 22, 22);
  } else if (id.includes('leaf')) {
    context.fillStyle = colors[1]; context.fillRect(5, 9, 13, 6); context.fillRect(8, 5, 8, 14);
    context.fillStyle = colors[0]; context.fillRect(7, 10, 11, 4); context.fillRect(11, 6, 3, 12);
  } else if (id.includes('rain') || id === 'drip') {
    context.fillStyle = colors[1]; context.fillRect(10, 2, 4, 17); context.fillRect(8, 17, 8, 4);
    context.fillStyle = colors[0]; context.fillRect(11, 3, 2, 15);
  } else if (id === 'lightning-flash') {
    context.fillStyle = colors[1];
    context.fillRect(11, 1, 7, 6); context.fillRect(8, 7, 8, 5); context.fillRect(5, 12, 8, 5); context.fillRect(3, 17, 6, 6);
    context.fillStyle = colors[0];
    context.fillRect(13, 2, 3, 5); context.fillRect(10, 8, 4, 4); context.fillRect(7, 13, 4, 4); context.fillRect(5, 18, 3, 4);
  } else if (id.includes('rock')) {
    context.fillStyle = colors[1]; context.fillRect(4, 5, 15, 13); context.fillRect(8, 2, 9, 4);
    context.fillStyle = colors[0]; context.fillRect(6, 7, 10, 8);
  } else {
    const gradient = context.createRadialGradient(12, 12, 1, 12, 12, 10);
    gradient.addColorStop(0, colors[1]); gradient.addColorStop(0.38, colors[0]); gradient.addColorStop(1, `${colors[0]}00`);
    context.fillStyle = gradient; context.fillRect(2, 2, 20, 20);
  }
  texture.refresh?.();
  return key;
}

export class WeatherDirector {
  constructor(scene, { mapId = scene.mapData?.id, seed = scene.mapSeed || 1, maxTorches = 32 } = {}) {
    this.scene = scene;
    this.mapId = mapId;
    this.config = WEATHER[mapId];
    if (!this.config) throw new Error(`No weather configuration for map: ${mapId}`);
    this.rng = mulberry32((seed ^ 0x57ea7e12) >>> 0);
    this.clock = 0;
    this.destroyed = false;
    this.particles = [];
    this.liveParticles = new Set();
    this.emitters = new Map();
    this.flashUntil = 0;
    this.flashAlpha = 0;
    this.lastRockfallMarker = -Infinity;
    this.torchTimer = 0;
    this.quality = 'medium';
    this.maxParticles = 0;
    this.maxTorches = maxTorches;
    this.torchGlows = [];
    this.staticGraphics = scene.add?.graphics?.().setScrollFactor?.(0).setDepth?.(3);
    this.ambientGraphics = scene.add?.graphics?.().setScrollFactor?.(0).setDepth?.(4);
    this.vignetteGraphics = scene.add?.graphics?.().setScrollFactor?.(0).setDepth?.(4);
    this.flashGraphics = scene.add?.graphics?.().setScrollFactor?.(0).setDepth?.(4);
    this.createStaticOverlays();
    this.setQuality(scene.settings?.particles || 'medium');
    for (const layer of this.config.layers) if (layer.rate) {
      this.emitters.set(layer.id, { ...layer, live: 0, timer: this.rng() * 0.8, event: false });
    }
    this.eventEmitterKeys = eventParticles(this.config.event).map((particle, index) => `event:${particle.id}:${index}`);
    eventParticles(this.config.event).forEach((particle, index) => {
      this.emitters.set(this.eventEmitterKeys[index], { ...particle, live: 0, timer: 0, event: true });
    });
    const event = this.config.event;
    this.event = event ? { id: event.id, activeUntil: 0, nextAt: between(this.rng, event.first), nextMarkerAt: 0 } : null;
    this.lightSources = [];
    this.ensureTorchPool();
    this.audio = scene.audio;
    this.audio?.ambience?.(`${mapId}-base`, 1500);
    for (const id of this.config.ambientLoops) this.audio?.weatherLoop?.(id, true, 1500);
    this.stillKeys = new Map();
    for (const layer of [...this.config.layers, ...eventParticles(this.config.event)]) {
      this.stillKeys.set(layer.id, `weather-${layer.id}`);
    }
    if (this.config.lightning) this.stillKeys.set('lightning-flash', 'weather-lightning-flash');
    this.overlaySprites = [];
    this.createOverlaySprites();
    this.refreshStills();
    this.loadOptionalStills();
  }

  get particleCount() { return this.liveParticles.size; }
  get allocatedParticleCount() { return this.particles.length; }
  get visibilityReduction() {
    return this.event && this.clock < this.event.activeUntil ? this.config.event.visibility : 0;
  }

  setQuality(value) {
    const quality = Object.hasOwn(WEATHER_QUALITY_CAPS, value) ? value : 'medium';
    this.quality = quality;
    this.maxParticles = WEATHER_QUALITY_CAPS[quality];
    const defaultTexture = makeProceduralTexture(this.scene, 'spore');
    while (this.particles.length < this.maxParticles) {
      const sprite = this.scene.add?.image?.(0, 0, defaultTexture);
      if (!sprite) break;
      sprite.setActive?.(false); sprite.setVisible?.(false); sprite.setDepth?.(-3);
      sprite.weatherEmitter = null; sprite.weatherLife = 0; sprite.weatherAge = 0;
      this.particles.push(sprite);
    }
    while (this.liveParticles.size > this.maxParticles) this.recycle(this.liveParticles.values().next().value);
  }

  createStaticOverlays() {
    const g = this.staticGraphics;
    if (!g) return;
    g.clear();
    const base = this.mapId === 'overgrown' ? 0xcfe9d0 : this.mapId === 'bloodmoon' ? 0xd4484f : 0x8ec5ff;
    if (this.mapId === 'overgrown') {
      for (let index = 0; index < 5; index++) {
        const x = -280 + index * 145;
        g.fillStyle(0xffedb1, 0.025).fillPoints([
          { x, y: -390 }, { x: x + 95, y: -390 }, { x: x + 360, y: 390 }, { x: x + 210, y: 390 },
        ], true);
      }
    } else if (this.mapId === 'cenote') {
      for (let index = 0; index < 4; index++) {
        const x = -230 + index * 160;
        g.fillStyle(0x9de7ff, 0.026).fillPoints([
          { x, y: -390 }, { x: x + 70, y: -390 }, { x: x + 270, y: 390 }, { x: x + 135, y: 390 },
        ], true);
      }
    }
    g.fillStyle(base, 0.008).fillRect(-1, -1, 2, 2);
  }

  refreshStills() {
    for (const [id, key] of this.stillKeys) {
      if (this.scene.textures?.exists?.(key)) {
        for (const sprite of this.particles) if (sprite.weatherEmitter?.id === id) sprite.setTexture?.(key);
        for (const overlay of this.overlaySprites || []) if (overlay.id === id) overlay.sprite.setTexture?.(key);
      }
    }
  }

  createOverlaySprites() {
    const overlays = this.config.layers.filter(layer => layer.overlay);
    if (this.config.lightning) overlays.push({ id: 'lightning-flash', flash: true });
    for (const layer of overlays) {
      const key = this.stillKeys.get(layer.id);
      if (!key || !this.scene.add?.image) continue;
      const texture = this.scene.textures?.exists?.(key) ? key : makeProceduralTexture(this.scene, layer.id);
      const sprite = this.scene.add.image(0, 0, texture);
      sprite.setOrigin?.(0.5); sprite.setScrollFactor?.(0);
      sprite.setDepth?.(layer.flash ? 4.5 : 3.5); sprite.setAlpha?.(0);
      sprite.setActive?.(true); sprite.setVisible?.(false);
      this.overlaySprites.push({ id: layer.id, sprite, flash: Boolean(layer.flash) });
    }
  }

  loadOptionalStills() {
    if (typeof fetch !== 'function' || typeof Image !== 'function' || typeof document === 'undefined') return;
    const base = `${import.meta.env?.BASE_URL || '/'}assets/pixel/`;
    for (const [id, key] of this.stillKeys) {
      if (this.scene.textures?.exists?.(key)) continue;
      const relative = WEATHER_STILL_PATHS[id];
      if (!relative) continue;
      // Same-origin optional art probe: an absent still is an expected case and
      // simply leaves the already-created procedural texture in use.
      fetch(new URL(relative, new URL(base, document.baseURI)), { cache: 'force-cache' })
        .then(response => response.ok ? response.blob() : null)
        .then(blob => {
          if (!blob || this.destroyed || this.scene.textures?.exists?.(key)) return;
          const image = new Image(), url = URL.createObjectURL(blob);
          image.onload = () => {
            if (!this.destroyed && !this.scene.textures?.exists?.(key)) {
              this.scene.textures?.addImage?.(key, image);
              for (const sprite of this.particles) if (sprite.weatherEmitter?.id === id) sprite.setTexture?.(key);
              for (const overlay of this.overlaySprites) if (overlay.id === id) overlay.sprite.setTexture?.(key);
            }
            URL.revokeObjectURL(url);
          };
          image.onerror = () => URL.revokeObjectURL(url);
          image.src = url;
        })
        .catch(() => {});
    }
  }

  ensureTorchPool() {
    if (this.torchGlows.length || !this.scene.add?.image) return;
    const key = makeTorchGlowTexture(this.scene);
    for (let i = 0; i < this.maxTorches; i++) {
      // Phaser's BlendModes.ADD enum is 1 (normal is 0); avoid importing the
      // browser-only Phaser bundle here so the deterministic system tests run in Node.
      const glow = this.scene.add.image(0, 0, key).setBlendMode?.(1);
      glow?.setOrigin?.(0.5); glow?.setDepth?.(-2); glow?.setAlpha?.(0.16);
      glow?.setActive?.(false); glow?.setVisible?.(false);
      if (glow) this.torchGlows.push(glow);
    }
  }

  syncTorchGlows(view) {
    const sources = [...(this.scene.lightSources || this.scene.mapWorld?.lightSources || this.scene.mapWorld?.activeLightSources || [])]
      .map(source => ({ x: Number(source.x), y: Number(source.y) }))
      .filter(source => Number.isFinite(source.x) && Number.isFinite(source.y) && source.x >= view.x - 100 && source.x <= view.right + 100 && source.y >= view.y - 100 && source.y <= view.bottom + 100)
      .sort((a, b) => Math.hypot(a.x - (this.scene.player?.x || 0), a.y - (this.scene.player?.y || 0)) - Math.hypot(b.x - (this.scene.player?.x || 0), b.y - (this.scene.player?.y || 0)))
      .slice(0, this.maxTorches);
    this.lightSources = sources;
    for (let i = 0; i < this.torchGlows.length; i++) {
      const glow = this.torchGlows[i], source = sources[i];
      if (!glow) continue;
      if (!source) { glow.setVisible?.(false); glow.setActive?.(false); continue; }
      glow.setPosition?.(source.x, source.y).setScale?.(this.mapId === 'cenote' ? 1.05 : 1).setAlpha?.(0.22);
      glow.setDepth?.(source.y - 4); glow.setActive?.(true); glow.setVisible?.(true);
    }
  }

  currentView() {
    const view = worldView(this.scene);
    const width = Math.max(640, view.width || 1280), height = Math.max(320, view.height || 720);
    return { ...view, width, height, right: view.x + width, bottom: view.y + height };
  }

  spawn(id, emitter) {
    if (this.destroyed || this.liveParticles.size >= this.maxParticles || emitter.live >= emitter.maxAlive) return false;
    const sprite = this.particles.find(item => !item.active);
    if (!sprite) return false;
    const view = this.currentView(), layerId = id;
    const spawnAtTop = emitter.vy?.[0] > 0;
    const x = view.x + this.rng() * view.width;
    const y = spawnAtTop ? view.y - 12 - this.rng() * 40 : view.y + this.rng() * view.height;
    const key = this.stillKeys.get(layerId);
    const texture = key && this.scene.textures?.exists?.(key) ? key : makeProceduralTexture(this.scene, layerId);
    sprite.setTexture?.(texture); sprite.setPosition?.(x, y); sprite.setDepth?.(emitter.depth ?? 0);
    sprite.setScale?.(layerId.startsWith('leaf-') ? 0.65 + this.rng() * 0.65 : 0.55 + this.rng() * 0.9);
    sprite.setRotation?.(this.rng() * Math.PI * 2); sprite.setTint?.(this.particleTint(layerId));
    sprite.setAlpha?.(emitter.alpha ?? 0.5); sprite.setActive?.(true); sprite.setVisible?.(true);
    sprite.weatherEmitter = emitter; sprite.weatherAge = 0; sprite.weatherLife = between(this.rng, emitter.life || [2, 4]);
    sprite.weatherVX = between(this.rng, emitter.vx || [-10, 10]); sprite.weatherVY = between(this.rng, emitter.vy || [-10, 10]);
    sprite.weatherAlpha = emitter.alpha ?? 0.5; emitter.live++; this.liveParticles.add(sprite);
    return true;
  }

  particleTint(id) {
    if (id.includes('rain') || id.includes('drip')) return 0xe5f1ce;
    if (id.includes('ash')) return 0xd1c0c5;
    if (id.includes('ember')) return 0xffa747;
    if (id.includes('leaf')) return 0x9cbd58;
    if (id === 'spore' || id.includes('fog') || id.includes('mist')) return this.mapId === 'cenote' ? 0x90e4e0 : 0xcbe7c3;
    if (id.includes('rock')) return 0xc0b9a9;
    return 0xe7f5d7;
  }

  recycle(sprite) {
    if (!sprite || !this.liveParticles.delete(sprite)) return;
    if (sprite.weatherEmitter) sprite.weatherEmitter.live = Math.max(0, sprite.weatherEmitter.live - 1);
    sprite.weatherEmitter = null; sprite.weatherAge = sprite.weatherLife = 0;
    sprite.setVisible?.(false); sprite.setActive?.(false);
  }

  updateEmitters(dt) {
    for (const emitter of this.emitters.values()) {
      const eventActive = !emitter.event || Boolean(this.event && this.clock < this.event.activeUntil);
      if (!eventActive) { emitter.timer = Math.max(0, emitter.timer - dt); continue; }
      emitter.timer -= dt;
      let guard = 0;
      while (emitter.timer <= 0 && emitter.live < emitter.maxAlive && guard++ < 3) {
        this.spawn(emitter.id, emitter);
        emitter.timer += Math.max(0.025, 1 / Math.max(0.001, emitter.rate));
      }
    }
    const view = this.currentView();
    for (const sprite of [...this.liveParticles]) {
      sprite.weatherAge += dt;
      sprite.x += sprite.weatherVX * dt; sprite.y += sprite.weatherVY * dt;
      const remain = clamp(1 - sprite.weatherAge / sprite.weatherLife, 0, 1);
      sprite.setAlpha?.(sprite.weatherAlpha * Math.min(1, remain * 3));
      if (sprite.weatherAge >= sprite.weatherLife || sprite.x < view.x - 90 || sprite.x > view.right + 90 || sprite.y < view.y - 90 || sprite.y > view.bottom + 90) this.recycle(sprite);
    }
  }

  activateEvent() {
    if (!this.event || this.clock < this.event.activeUntil) return false;
    const config = this.config.event;
    this.event.activeUntil = this.clock + config.duration;
    this.event.nextMarkerAt = this.clock + 0.6;
    for (const key of this.eventEmitterKeys) {
      const emitter = this.emitters.get(key);
      if (emitter) emitter.timer = 0;
    }
    for (const id of config.loops || []) this.audio?.weatherLoop?.(id, true, 1500);
    return true;
  }

  finishEvent() {
    const config = this.config.event;
    for (const id of config.loops || []) this.audio?.weatherLoop?.(id, false, 1500);
    for (const key of this.eventEmitterKeys) {
      const emitter = this.emitters.get(key);
      if (emitter) emitter.timer = Math.max(emitter.timer, 0.25);
    }
  }

  updateEvent(dt) {
    if (!this.event) return;
    const config = this.config.event;
    if (this.event.activeUntil && this.clock >= this.event.activeUntil) {
      this.event.activeUntil = 0; this.finishEvent();
    }
    if (!this.event.activeUntil && this.clock >= this.event.nextAt) {
      this.activateEvent(); this.event.nextAt = this.clock + between(this.rng, config.interval);
    }
    if (this.mapId === 'cenote' && this.clock < this.event.activeUntil && this.clock >= this.event.nextMarkerAt) {
      this.spawnRockfallMarker(); this.event.nextMarkerAt = this.clock + 3.4 + this.rng() * 1.2;
    }
  }

  spawnRockfallMarker() {
    const scene = this.scene, view = this.currentView(), player = scene.player;
    if (!player || !scene.telegraphs?.play) return false;
    let x = 0, y = 0;
    for (let i = 0; i < 8; i++) {
      x = view.x + this.rng() * view.width; y = view.y + this.rng() * view.height;
      if (Math.hypot(x - player.x, y - player.y) > 96) break;
    }
    const warning = scene.telegraphs.play({ shape: 'circle', x, y, radius: 30, windup: 0.72,
      color: 0xb9c7d0, outlineColor: 0xeaf5ff, sound: false, tag: 'weather-rockfall',
      onResolve: () => {
        this.emitBurst('rock-small', x, y, 4);
        scene.audio?.weatherOneShot?.('rockfall', 'hit');
        if (scene.player?.active && Math.hypot(scene.player.x - x, scene.player.y - y) <= 30) {
          scene.damagePlayer?.(6, x, y, { x, y, active: true }, false);
        }
      },
    });
    return Boolean(warning);
  }

  emitBurst(id, x, y, count = 4) {
    const emitter = this.emitters.get(id) || { id, live: 0, maxAlive: Math.min(count, 8), life: [0.4, 0.8], alpha: 0.8, vx: [-90, 90], vy: [-80, 60], depth: 2 };
    emitter.maxAlive = Math.max(emitter.maxAlive, Math.min(8, count));
    for (let i = 0; i < count; i++) {
      if (!this.spawn(id, emitter)) break;
      const sprite = [...this.liveParticles].at(-1);
      if (sprite) sprite.setPosition?.(x, y);
    }
  }

  triggerLightning() {
    if (this.scene.settings?.reduceFlashing) { this.flashAlpha = 0; return; }
    this.flashUntil = this.clock + (this.config.lightning?.flashSeconds || 0.12);
    this.flashAlpha = 0.13;
    const variant = 1 + Math.floor(this.rng() * 3);
    this.audio?.weatherOneShot?.(`thunder-${variant}`, 'boss');
  }

  updateLightning(dt) {
    if (!this.config.lightning) return;
    this.lightningTimer = Math.max(0, (this.lightningTimer ?? between(this.rng, this.config.lightning.interval)) - dt);
    if (this.lightningTimer <= 0) {
      this.triggerLightning();
      this.lightningTimer = between(this.rng, this.config.lightning.interval);
    }
    if (this.scene.settings?.reduceFlashing || this.clock >= this.flashUntil) this.flashAlpha = 0;
  }

  drawOverlays() {
    const scene = this.scene, camera = scene.cameras?.main;
    if (!camera || !this.ambientGraphics) return;
    const view = this.currentView();
    const zoom = Math.max(0.01, camera.zoom || 1);
    // These Graphics objects use scrollFactor 0 but still follow camera zoom,
    // so size and position them in the corresponding screen-world rectangle.
    const overlayWidth = camera.width / zoom, overlayHeight = camera.height / zoom;
    const cx = overlayWidth / 2, cy = overlayHeight / 2;
    const pulse = this.mapId === 'bloodmoon' && !scene.settings?.reduceFlashing ? 0.006 * (0.5 + Math.sin(this.clock * 1.1) * 0.5) : 0;
    for (const graphics of [this.staticGraphics, this.ambientGraphics, this.vignetteGraphics, this.flashGraphics]) graphics?.setPosition?.(cx, cy);
    for (const overlay of this.overlaySprites) {
      const { id, sprite, flash: isFlash } = overlay;
      sprite.setPosition?.(cx, cy);
      if (isFlash) {
        const visible = !scene.settings?.reduceFlashing && this.flashAlpha > 0 && this.clock < this.flashUntil;
        sprite.setDisplaySize?.(overlayWidth * 0.22, overlayHeight * 0.82);
        sprite.setAlpha?.(visible ? 0.72 : 0); sprite.setVisible?.(visible);
      } else {
        const alpha = id === 'red-fog' ? 0.12 + (scene.settings?.reduceFlashing ? 0 : pulse) : id === 'cave-fog' ? 0.1 : 0.055;
        sprite.setDisplaySize?.(overlayWidth, overlayHeight);
        sprite.setAlpha?.(alpha); sprite.setVisible?.(alpha > 0);
      }
    }
    const ambient = this.ambientGraphics; ambient.clear();
    ambient.fillStyle(this.config.tint, this.config.tintAlpha + pulse).fillRect(-overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
    const visibility = this.visibilityReduction;
    if (visibility > 0) ambient.fillStyle(this.mapId === 'overgrown' ? 0x9eaa74 : 0x5e3447, visibility)
      .fillRect(-overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
    const vignette = this.vignetteGraphics; vignette.clear();
    for (let i = 0; i < 7; i++) {
      const edge = (i + 1) * Math.min(overlayWidth, overlayHeight) * 0.018;
      const alpha = 0.009 + i * 0.002;
      vignette.fillStyle(this.config.vignette, alpha)
        .fillRect(-overlayWidth / 2, -overlayHeight / 2, overlayWidth, edge)
        .fillRect(-overlayWidth / 2, overlayHeight / 2 - edge, overlayWidth, edge)
        .fillRect(-overlayWidth / 2, -overlayHeight / 2, edge, overlayHeight)
        .fillRect(overlayWidth / 2 - edge, -overlayHeight / 2, edge, overlayHeight);
    }
    const flash = this.flashGraphics; flash.clear();
    if (!scene.settings?.reduceFlashing && this.flashAlpha > 0 && this.clock < this.flashUntil)
      flash.fillStyle(0xeaf1ff, this.flashAlpha).fillRect(-overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
  }

  update(dt) {
    if (this.destroyed || this.scene.ended || this.scene.loadingRun || this.scene.pausedForChoice) return;
    const delta = clamp(Number(dt) || 0, 0, 0.05);
    this.clock += delta;
    const nextQuality = this.scene.settings?.particles || 'medium';
    if (nextQuality !== this.quality) this.setQuality(nextQuality);
    this.updateEvent(delta); this.updateLightning(delta); this.updateEmitters(delta);
    this.torchTimer -= delta;
    if (this.torchTimer <= 0) { this.torchTimer = 0.45; this.syncTorchGlows(this.currentView()); }
    this.drawOverlays();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.event?.activeUntil) this.finishEvent();
    this.audio?.ambience?.(null, 1500);
    for (const id of this.config.ambientLoops) this.audio?.weatherLoop?.(id, false, 1500);
    for (const id of this.config.event?.loops || []) this.audio?.weatherLoop?.(id, false, 1500);
    for (const sprite of this.particles) sprite.destroy?.();
    for (const overlay of this.overlaySprites) overlay.sprite.destroy?.();
    for (const glow of this.torchGlows) glow.destroy?.();
    this.staticGraphics?.destroy?.(); this.ambientGraphics?.destroy?.();
    this.vignetteGraphics?.destroy?.(); this.flashGraphics?.destroy?.();
    this.liveParticles.clear(); this.particles.length = 0; this.torchGlows.length = 0;
    this.emitters.clear(); this.lightSources.length = 0; this.overlaySprites.length = 0;
  }

}

function makeTorchGlowTexture(scene) {
  const key = 'weather-torch-glow';
  if (scene.textures?.exists?.(key)) return key;
  const texture = scene.textures?.createCanvas?.(key, 96, 96), context = texture?.getContext?.();
  if (!context) return scene.textures?.exists?.('ground') ? 'ground' : key;
  const glow = context.createRadialGradient(48, 48, 2, 48, 48, 46);
  glow.addColorStop(0, 'rgba(255,211,126,0.42)'); glow.addColorStop(0.28, 'rgba(255,159,65,0.20)'); glow.addColorStop(1, 'rgba(255,120,35,0)');
  context.clearRect(0, 0, 96, 96); context.fillStyle = glow; context.fillRect(0, 0, 96, 96); texture.refresh?.();
  return key;
}

export const weatherMapIds = () => Object.keys(WEATHER);
