import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { WeatherDirector, WEATHER_QUALITY_CAPS, WEATHER_STILL_PATHS, weatherMapIds } from '../src/weather/WeatherDirector.js';
import { RUN_AMBIENCE_KEYS, audioFileFor } from '../src/systems/AudioDirector.js';
import { effectDepth } from '../src/render/layers.js';

function makeImage(x, y, texture, counters) {
  const image = { x, y, texture, active: true, visible: true, alpha: 1, destroyed: false,
    setActive(value) { this.active = value; return this; }, setVisible(value) { this.visible = value; return this; },
    setDepth(value) { this.depth = value; return this; }, setPosition(a, b) { this.x = a; this.y = b; return this; },
    setTexture(value) { this.texture = value; return this; }, setScale(value) { this.scale = value; return this; },
    setRotation(value) { this.rotation = value; return this; }, setTint(value) { this.tint = value; return this; },
    setAlpha(value) { this.alpha = value; return this; }, setBlendMode(value) { this.blend = value; return this; },
    setOrigin() { return this; }, destroy() { this.destroyed = true; this.active = false; this.visible = false; counters.destroyed++; return this; },
  };
  counters.images++;
  return image;
}

function makeScene(mapId, quality = 'medium', seed = 90123) {
  const counters = { images: 0, graphics: 0, destroyed: 0, textureKeys: new Set(['ground']) };
  const gradient = { addColorStop() {} };
  const context = { clearRect() {}, fillRect() {}, createRadialGradient() { return gradient; }, imageSmoothingEnabled: true };
  const graphics = () => {
    counters.graphics++;
    return { depth: 0, setScrollFactor() { return this; }, setDepth(value) { this.depth = value; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; }, clear() { return this; }, fillStyle() { return this; },
      fillRect() { return this; }, fillPoints() { return this; }, destroy() { counters.destroyed++; return this; } };
  };
  const scene = {
    mapData: { id: mapId }, mapSeed: seed, settings: { particles: quality, reduceFlashing: false }, ended: false,
    elapsed: 0, player: { x: 0, y: 0, active: true },
    cameras: { main: { width: 1280, height: 720, zoom: 1, scrollX: -640, scrollY: -360 } },
    mapWorld: { activeLightSources: new Set() }, lightSources: new Set([{ id: 'torch', x: 30, y: 40 }, { id: 'brazier', x: 130, y: 80 }]) };
  scene.add = { graphics, image: (x, y, key) => makeImage(x, y, key, counters) };
  scene.textures = { exists(key) { return counters.textureKeys.has(key); },
    createCanvas(key) { counters.textureKeys.add(key); return { getContext: () => context, refresh() {} }; },
    addImage(key) { counters.textureKeys.add(key); } };
  scene.audio = { ambience: (...args) => audioEvents.push(['ambience', ...args]), weatherLoop: (...args) => audioEvents.push(['loop', ...args]),
    weatherOneShot: (...args) => audioEvents.push(['oneShot', ...args]) };
  scene.telegraphs = { rows: [], play(options) { this.rows.push(options); return options; } };
  scene.telegraphs.graphics = { depth: effectDepth(0,5) };
  scene.damageEvents = [];
  scene.damagePlayer = (...args) => scene.damageEvents.push(args);
  scene.audioEvents = audioEvents;
  scene.counters = counters;
  return scene;
}

const audioEvents = [];
function fresh(map, quality = 'medium', seed) {
  audioEvents.length = 0;
  return makeScene(map, quality, seed);
}

test('per-map permanent layers are created with the requested Low, Medium and High pool caps', () => {
  assert.deepEqual(weatherMapIds(), ['overgrown', 'bloodmoon', 'cenote']);
  for (const [quality, expected] of Object.entries(WEATHER_QUALITY_CAPS)) {
    for (const map of weatherMapIds()) {
      const scene = fresh(map, quality), weather = new WeatherDirector(scene);
      assert.equal(weather.allocatedParticleCount, expected, `${map}/${quality} allocation`);
      assert.equal(weather.maxParticles, expected, `${map}/${quality} cap`);
      assert.ok(weather.staticGraphics && weather.ambientGraphics && weather.vignetteGraphics, `${map} overlays`);
      assert.ok(weather.ambientGraphics.depth < scene.telegraphs.graphics.depth, 'ambient overlays stay behind telegraphs');
      assert.ok(weather.emitters.size >= 2, `${map} has pooled ambient emitters`);
      assert.ok(WEATHER_STILL_PATHS[weather.config.layers.find(layer => layer.rate)?.id]);
      assert.ok(scene.audioEvents.some(row => row[0] === 'ambience'), 'map ambience starts through AudioDirector');
      weather.syncTorchGlows(weather.currentView());
      assert.ok(weather.torchGlows.some(glow => glow.active && glow.visible), 'registered map lights receive pooled glows');
      weather.destroy();
    }
  }
});

test('weather still lookup keys exactly match the supplied map-art weather ids', async () => {
  const design = JSON.parse(await readFile(new URL('../docs/v0.6/v06_design.json', import.meta.url), 'utf8'));
  const ids = design.assets.weather.map(item => item.id).sort();
  assert.deepEqual(Object.keys(WEATHER_STILL_PATHS).sort(), ids);
  for (const id of ids) assert.equal(WEATHER_STILL_PATHS[id], `weather/${id}.png`);
  for (const map of weatherMapIds()) {
    const weather = new WeatherDirector(fresh(map));
    assert.ok(weather.overlaySprites.length >= 1, `${map} has a procedural/optional overlay sprite`);
    weather.destroy();
  }
});

test('seeded event schedules are repeatable and rain/ash visibility limits are exact', () => {
  for (const [map, min, max, reduction] of [['overgrown', 240, 300, 0.1], ['bloodmoon', 285, 315, 0.2]]) {
    const first = new WeatherDirector(fresh(map, 'low', 711)), second = new WeatherDirector(fresh(map, 'low', 711));
    assert.equal(first.event.nextAt, second.event.nextAt);
    assert.ok(first.event.nextAt >= min && first.event.nextAt <= max);
    first.clock = first.event.nextAt - 0.1;
    first.update(0.05); assert.equal(first.visibilityReduction, 0, 'event does not start before its seeded deadline');
    first.update(0.05);
    assert.equal(first.visibilityReduction, reduction);
    assert.ok(Math.abs((first.event.activeUntil - first.clock) - first.config.event.duration) < 1e-8);
    assert.ok(first.particleCount <= 80);
    first.destroy(); second.destroy();
  }
});

test('bloodmoon lightning respects Reduce flashing while ash-storm loop follows its event', () => {
  const scene = fresh('bloodmoon', 'low'), weather = new WeatherDirector(scene);
  scene.settings.reduceFlashing = true; weather.triggerLightning();
  assert.equal(weather.flashAlpha, 0);
  assert.equal(scene.audioEvents.filter(row => row[0] === 'oneShot').length, 0, 'reduced flashes suppress the lightning effect');
  scene.settings.reduceFlashing = false; weather.triggerLightning();
  assert.ok(weather.flashAlpha > 0);
  assert.equal(scene.audioEvents.filter(row => row[0] === 'oneShot').length, 1, 'lightning uses the ambience one-shot hook');
  weather.clock = weather.event.nextAt - 0.05; weather.update(0.05);
  assert.ok(scene.audioEvents.some(row => row[0] === 'loop' && row[1] === 'wind-ashstorm' && row[2] === true));
  weather.clock = weather.event.activeUntil; weather.update(0.01);
  assert.ok(scene.audioEvents.some(row => row[0] === 'loop' && row[1] === 'wind-ashstorm' && row[2] === false));
  weather.destroy();
});

test('cenote rockfall marker warns first, then deals only small damage on resolution', () => {
  const scene = fresh('cenote', 'medium', 11), weather = new WeatherDirector(scene);
  weather.clock = weather.event.nextAt - 0.05; weather.update(0.05);
  assert.ok(weather.event.activeUntil > weather.clock, 'seeded rockfall event entered its active interval');
  assert.ok(weather.spawnRockfallMarker());
  const marker = scene.telegraphs.rows[0];
  assert.equal(marker.windup, 0.72);
  assert.equal(marker.sound, false);
  assert.equal(scene.damageEvents.length, 0, 'no damage at telegraph creation');
  assert.ok(Math.hypot(marker.x - scene.player.x, marker.y - scene.player.y) > 96, 'shadow marker avoids the player start point');
  marker.onResolve();
  assert.equal(scene.damageEvents.length, 0, 'a distant impact cannot hit the player');
  assert.ok(scene.audioEvents.some(row => row[0] === 'oneShot' && row[1] === 'rockfall'));
  weather.destroy();
});

test('ten simulated minutes do not grow particle/light pools and the live count stays bounded', () => {
  const scene = fresh('overgrown', 'medium', 381), weather = new WeatherDirector(scene);
  const allocated = weather.allocatedParticleCount, torchCount = weather.torchGlows.length, imageCount = scene.counters.images;
  for (let frame = 0; frame < 600 * 20; frame++) {
    weather.update(0.05);
    if (frame % 1200 === 0) assert.ok(weather.particleCount <= 160);
  }
  assert.equal(weather.particleCount <= 160, true);
  assert.equal(weather.allocatedParticleCount, allocated);
  assert.equal(weather.torchGlows.length, torchCount);
  assert.equal(scene.counters.images, imageCount, 'no post-warmup GameObjects allocated');
  weather.destroy();
});

test('ambient ids and file paths follow the developer ambience manifest', async () => {
  const manifest = JSON.parse(await readFile(new URL('../docs/v0.6/audio/audio_manifest.json', import.meta.url), 'utf8'));
  const files = new Set(manifest.items.filter(item => item.group === 'ambience').map(item => item.file));
  for (const key of RUN_AMBIENCE_KEYS) assert.ok(files.has(audioFileFor(key)), `${key} is in audio manifest`);
});
