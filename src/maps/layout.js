import { MAP_KITS } from '../data/mapDefinitions.js';
import { cenoteGroundRegions } from './CenoteArt.js';

export const WORLD_WIDTH = 6400;
export const WORLD_HEIGHT = 4800;
export const WORLD_HALF = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
export const WALL_THICKNESS = 400;
export const PLAYABLE_BOUNDS = { left: -2800, right: 2800, top: -2000, bottom: 2000 };
export const MAP_CELL_SIZE = 640;
export const START_CLEAR_RADIUS = 400;
export const BOSS_ARENA_CLEAR_RADIUS = 600;
export const CLEAR_ROUTE_HALF_WIDTH = 360;

export function seededRandom(seed) {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function placementRadius(size) { return Math.max(size.width, size.height) / 2; }
function overlaps(a, b, pad = 16) { return distance(a, b) < placementRadius(a.size) + placementRadius(b.size) + pad; }
function inWorld(item) {
  const r = placementRadius(item.size);
  return item.x - r >= PLAYABLE_BOUNDS.left && item.x + r <= PLAYABLE_BOUNDS.right &&
    item.y - r >= PLAYABLE_BOUNDS.top && item.y + r <= PLAYABLE_BOUNDS.bottom;
}
function reserveSafeRings(item) {
  const r = placementRadius(item.size);
  return distance(item, { x: 0, y: 0 }) >= BOSS_ARENA_CLEAR_RADIUS + r;
}
function preservesRoute(item) {
  if (item.collider.type === 'none') return true;
  const r = placementRadius(item.size);
  return Math.abs(item.x) >= CLEAR_ROUTE_HALF_WIDTH + r && Math.abs(item.y) >= CLEAR_ROUTE_HALF_WIDTH + r;
}
function canPlace(item, placed, { safe = true, route = true } = {}) {
  if (!inWorld(item) || safe && !reserveSafeRings(item) || route && !preservesRoute(item)) return false;
  return !placed.some(other => overlaps(item, other));
}

const FIXED_SLOTS = [
  [-2400, -1500], [-1800, -1500], [-1200, -1500], [1200, -1500], [1800, -1500], [2400, -1500],
  [-2400, -900], [-1800, -900], [-1200, -900], [1200, -900], [1800, -900], [2400, -900],
  [-2400, 900], [-1800, 900], [-1200, 900], [1200, 900], [1800, 900], [2400, 900],
  [-2400, 1500], [-1800, 1500], [-1200, 1500], [1200, 1500], [1800, 1500], [2400, 1500],
].map(([x, y]) => ({ x, y }));

function entryFor(item, x, y, scale, fixed = false) {
  return { ...item, x, y, scale, fixed, worldId: `${item.id}@${Math.round(x)}:${Math.round(y)}`,
    size: { width: item.size.width * scale, height: item.size.height * scale } };
}

export function generateMapLayout(mapId, kit = MAP_KITS[mapId], seed = 1, { onProgress = () => {} } = {}) {
  if (!kit || !['overgrown', 'bloodmoon', 'cenote'].includes(mapId)) throw new Error(`No map kit for ${mapId}`);
  const random = seededRandom(seed), placed = [], buildings = kit.items.filter(item => item.category === 'buildings');
  let slot = 0;
  for (const item of buildings) {
    let accepted = null;
    for (let n = 0; n < FIXED_SLOTS.length; n++, slot++) {
      const point = FIXED_SLOTS[(slot + n) % FIXED_SLOTS.length];
      const sizeScale = 1;
      const candidate = entryFor(item, point.x, point.y, sizeScale, true);
      if (canPlace(candidate, placed)) { accepted = candidate; slot = (slot + n) % FIXED_SLOTS.length + 1; break; }
    }
    if (!accepted) throw new Error(`Unable to place fixed ${mapId} landmark ${item.id}`);
    placed.push(accepted);
  }

  const decorations = kit.items.filter(item => item.category !== 'buildings');
  const columns = Math.ceil(kit.world.width / MAP_CELL_SIZE), rows = Math.ceil(kit.world.height / MAP_CELL_SIZE);
  const cells = [];
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < columns; cx++) {
    const cellKey = `${cx},${cy}`;
    const targetCount = 2 + Math.floor(random() * 3);
    let count = 0;
    for (let attempt = 0; attempt < targetCount * 18 && count < targetCount; attempt++) {
      const x = -WORLD_HALF.x + cx * MAP_CELL_SIZE + 44 + random() * (MAP_CELL_SIZE - 88);
      const y = -WORLD_HALF.y + cy * MAP_CELL_SIZE + 44 + random() * (MAP_CELL_SIZE - 88);
      const item = decorations[Math.floor(random() * decorations.length)];
      const scale = item.size.minScale + random() * (item.size.maxScale - item.size.minScale);
      const candidate = entryFor(item, x, y, scale);
      candidate.cellKey = cellKey;
      if (!canPlace(candidate, placed)) continue;
      placed.push(candidate); count++;
    }
    cells.push({ key: cellKey, x: cx, y: cy });
    onProgress(((cy * columns + cx + 1) / (columns * rows)) * 0.7);
  }

  const byCell = new Map(cells.map(cell => [cell.key, []]));
  for (const item of placed) {
    const x = Math.max(0, Math.min(columns - 1, Math.floor((item.x + WORLD_HALF.x) / MAP_CELL_SIZE)));
    const y = Math.max(0, Math.min(rows - 1, Math.floor((item.y + WORLD_HALF.y) / MAP_CELL_SIZE)));
    item.cellKey = `${x},${y}`;
    byCell.get(item.cellKey).push(item);
  }
  onProgress(1);
  return {
    mapId, seed: Number(seed) >>> 0,
    world: { width: kit.world.width, height: kit.world.height, cellSize: kit.world.cellSize },
    bounds: { ...PLAYABLE_BOUNDS },
    wallStyle: kit.wallStyle,
    waterZones: kit.waterZones.map(zone => ({ ...zone })),
    groundRegions: mapId === 'cenote' ? cenoteGroundRegions(kit.waterZones) : [],
    cells, byCell, placements: placed,
    lightSources: placed.filter(item => item.lightSource),
    colliders: placed.filter(item => item.collider.type !== 'none'),
    landmarks: placed.filter(item => item.category === 'buildings'),
    clearAreas: [{ x: 0, y: 0, radius: START_CLEAR_RADIUS, kind: 'start' }, { x: 0, y: 0, radius: BOSS_ARENA_CLEAR_RADIUS, kind: 'boss-arena' }],
    clearPaths: [
      { from: { x: PLAYABLE_BOUNDS.left, y: 0 }, to: { x: PLAYABLE_BOUNDS.right, y: 0 }, width: CLEAR_ROUTE_HALF_WIDTH * 2 },
      { from: { x: 0, y: PLAYABLE_BOUNDS.top }, to: { x: 0, y: PLAYABLE_BOUNDS.bottom }, width: CLEAR_ROUTE_HALF_WIDTH * 2 },
    ],
  };
}

export function layoutsOverlap(layout) {
  for (let i = 0; i < layout.placements.length; i++) for (let j = i + 1; j < layout.placements.length; j++)
    if (overlaps(layout.placements[i], layout.placements[j], 0)) return [layout.placements[i].worldId, layout.placements[j].worldId];
  return null;
}

export function isWalkableRoute(layout, axis = 'x', actorRadius = 24) {
  const start = axis === 'x' ? PLAYABLE_BOUNDS.left : PLAYABLE_BOUNDS.top;
  const end = axis === 'x' ? PLAYABLE_BOUNDS.right : PLAYABLE_BOUNDS.bottom;
  for (let pos = start + actorRadius; pos <= end - actorRadius; pos += 48) {
    const point = axis === 'x' ? { x: pos, y: 0 } : { x: 0, y: pos };
    for (const item of layout.colliders) {
      const r = placementRadius(item.size) + actorRadius;
      if (distance(item, point) < r) return false;
    }
  }
  return true;
}

export function positionInSafeArea(point, radius = START_CLEAR_RADIUS) { return Math.hypot(point.x, point.y) < radius; }

export function packWorldCells(layout, view, marginCells = 1) {
  const cellSize = layout.world.cellSize, columns = Math.ceil(layout.world.width / cellSize), rows = Math.ceil(layout.world.height / cellSize);
  const cellX = value => Math.floor((value + WORLD_HALF.x) / cellSize);
  const cellY = value => Math.floor((value + WORLD_HALF.y) / cellSize);
  const left = Math.max(0, cellX(view.x) - marginCells), right = Math.min(columns - 1, cellX(view.right) + marginCells);
  const top = Math.max(0, cellY(view.y) - marginCells), bottom = Math.min(rows - 1, cellY(view.bottom) + marginCells);
  const result = [];
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) result.push({ key: `${x},${y}`, x, y });
  return result;
}
