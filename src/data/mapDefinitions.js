import design from './maps-v06.json' with { type: 'json' };
import overgrownKit from './mapKits/overgrown.json' with { type: 'json' };
import bloodmoonKit from './mapKits/bloodmoon.json' with { type: 'json' };
import cenoteKit from './mapKits/cenote.json' with { type: 'json' };
import { normalizeKit } from '../world/objects.js';

export const MAP_KITS = Object.fromEntries(Object.entries({ overgrown: overgrownKit, bloodmoon: bloodmoonKit, cenote: cenoteKit }).map(([id,kit])=>[id,normalizeKit(kit)]));
export const MAP_DESIGN = Object.fromEntries(design.maps.map(map => [map.id, map]));

function colorAt(palette, index, fallback) {
  const value = [...palette.matchAll(/#([\da-f]{6})/ig)][index]?.[1];
  return value ? Number.parseInt(value, 16) : fallback;
}

export function mapDefinition(id, legacy = {}) {
  const data = MAP_DESIGN[id], kit = MAP_KITS[id];
  if (!data || !kit) throw new Error(`Unknown map definition: ${id}`);
  const fog = id === 'overgrown' ? 0x244d3e : id === 'bloodmoon' ? 0x2d1825 : 0x12152c;
  return {
    ...legacy,
    id: data.id,
    name: data.name,
    timeOfDay: data.time,
    size: { width: 8192, height: 6144 },
    environment: data.environment,
    weather: data.weather,
    palette: data.palette,
    trees: data.trees,
    rocks: data.rocks,
    ground: data.ground,
    buildings: data.buildings,
    landmarks: data.landmarks,
    enemies: data.enemies,
    music: data.music,
    ambience: data.ambience,
    colors: { ...(legacy.colors || {}), ground: colorAt(data.palette, 0, legacy.colors?.ground ?? 0x173f31),
      tile: colorAt(data.palette, 1, legacy.colors?.tile ?? 0x2b6045),
      detail: colorAt(data.palette, 2, legacy.colors?.detail ?? 0x8a6a3f),
      glow: colorAt(data.palette, 3, legacy.colors?.glow ?? 0x5ed6a4), fog },
    kit,
  };
}
