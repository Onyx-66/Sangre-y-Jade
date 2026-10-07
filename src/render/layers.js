// Central render-depth policy. World actors sort by their visible foot/base;
// independent bands keep overhead art, combat effects, weather and HUD ordered.
export const DEPTH_BANDS = Object.freeze({
  background: -10000,
  world: 1000,
  overhead: 10000,
  effects: 20000,
  weather: 30000,
  occlusion: 39000,
  hud: 40000,
});

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function objectBaseY(object) {
  if (!object) return 0;
  const foot=object.getData?.('worldFootY');if(Number.isFinite(foot))return foot;
  const originY = finite(object.originY ?? object.origin?.y, 0.5);
  const height = finite(object.displayHeight, finite(object.height) * Math.abs(finite(object.scaleY, 1)));
  return finite(object.y) + height * (1 - originY);
}

export function footprintBaseY(item) {
  if (!item) return 0;
  const scale = Math.abs(finite(item.scale, 1));
  const collider = item.collider || {};
  const offsetY = finite(collider.offsetY) * scale;
  if(collider.type==='polygon')return finite(item.y)+offsetY+Math.max(...collider.points.map(p=>p.y??p[1]))*scale;
  if (collider.type === 'circle') return finite(item.y) + offsetY + finite(collider.radius) * scale;
  if (collider.type === 'rect') return finite(item.y) + offsetY + finite(collider.height) * scale / 2;
  const size = item.size || {};
  const anchorY = finite(item.anchor?.y, 1);
  return finite(item.y) + finite(size.height) * (1 - anchorY);
}

const inBand = (band, baseY, order) => band + finite(baseY) + finite(order);

export const worldDepth = (baseY, order = 0) => inBand(DEPTH_BANDS.world, baseY, order);
export const overheadDepth = (baseY, order = 0) => inBand(DEPTH_BANDS.overhead, baseY, order);
export const effectDepth = (baseY = 0, order = 0) => inBand(DEPTH_BANDS.effects, baseY, order);
export const weatherDepth = (baseY = 0, order = 0) => inBand(DEPTH_BANDS.weather, baseY, order);
// Low-opacity fullscreen tint/visibility overlays are backdrop passes: keep them below warnings.
export const weatherBackdropDepth = (order = 0) => effectDepth(0, -100 + finite(order));
export const hudDepth = (order = 0) => DEPTH_BANDS.hud + finite(order);
export const backgroundDepth = (order = 0) => DEPTH_BANDS.background + finite(order);

export function setDepth(object, depth) {
  object?.setDepth?.(depth);
  return object;
}

export function setWorldDepth(object, baseY = objectBaseY(object), order = 0) {
  const displayOrder = order || (object?.displayList?.getIndex?.(object) ?? 0) * 0.000001;
  return setDepth(object, worldDepth(baseY, displayOrder));
}

export function setOverheadDepth(object, baseY = objectBaseY(object), order = 0) {
  return setDepth(object, overheadDepth(baseY, order));
}

export function setEffectDepth(object, baseY = finite(object?.y), order = 0) {
  return setDepth(object, effectDepth(baseY, order));
}

export function setWeatherDepth(object, baseY = finite(object?.y), order = 0) {
  return setDepth(object, weatherDepth(baseY, order));
}

export function depthBandName(depth) {
  const value = finite(depth);
  // Depths include world Y, so classify by the disjoint reachable band
  // intervals rather than comparing only the band origins.
  if (value >= DEPTH_BANDS.hud) return 'hud';
  if (value >= DEPTH_BANDS.occlusion) return 'occlusion';
  if (value >= DEPTH_BANDS.weather - 2000) return 'weather';
  if (value >= DEPTH_BANDS.effects - 2000) return 'effects';
  if (value >= DEPTH_BANDS.overhead - 2000) return 'overhead';
  if (value >= DEPTH_BANDS.world - 2000) return 'world';
  return 'background';
}
