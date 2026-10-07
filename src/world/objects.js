// World-object catalog and legacy kit adapter. Footprints are local to the art
// anchor, never the canopy rectangle; closed Training doors remain solid.
export const OBJECT_KINDS = Object.freeze({
  tree: { solid: true, overhead: true }, rock: { solid: true }, statue: { solid: true },
  house: { solid: true, overhead: true, door: true }, wall: { solid: true },
  platform: { surface: true }, stairs: { transition: true }, bridge: { surface: true },
  arch: { overhead: true }, breakable: { solid: true, breakable: true }, decoration: {},
});

// Native 192px top-* art (128px containers), bottom-centre coordinates.
// Circle/rect dimensions describe the visible base,
// not leaves or roof. New authored kit colliders take precedence.
export const LEGACY_FOOTPRINTS = Object.freeze({
  'top-stela': { type: 'rect', width: 126, height: 60, offsetY: -92 },
  'top-ruin': { type: 'rect', width: 126, height: 106, offsetY: -88 },
  'top-palm': { type: 'circle', radius: 12, offsetY: -86 },
  'top-foliage': { type: 'none' }, 'top-roots': { type: 'circle',radius:25,offsetX:10,offsetY:-102 },
  'top-tree': { type: 'circle', radius: 15, offsetY: -47 },
  'top-rocks': { type: 'circle', radius: 57, offsetY: -82 },
  'top-temple': { type: 'rect', width: 112, height: 100, offsetY: -80 },
  'top-crystal': { type: 'circle', radius: 43, offsetY: -79 },
  urn: { type: 'circle', radius: 25, offsetY: -28 },
  basket: { type: 'circle', radius: 25, offsetY: -28 },
});

export function legacyFootprint(texture,size,anchor={x:.5,y:1}) {
  const source=LEGACY_FOOTPRINTS[texture]||{type:'none'},native=texture.startsWith('top-')?192:128;
  const sx=size.width/native,sy=size.height/native,f={...source};
  if(f.type==='none')return f;
  f.offsetX=(source.offsetX||0)*sx+(.5-anchor.x)*size.width;
  f.offsetY=(source.offsetY||0)*sy+(1-anchor.y)*size.height;
  if(f.radius)f.radius*=Math.min(sx,sy);
  if(f.width)f.width*=sx;if(f.height)f.height*=sy;
  return f;
}

export function inferKind(item) {
  if (item.kind && OBJECT_KINDS[item.kind]) return item.kind;
  if (item.breakable) return 'breakable';
  if (item.category === 'trees') return 'tree';
  if (item.category === 'rocks') return /stela|idol|totem/.test(item.id) ? 'statue' : 'rock';
  if (item.category === 'buildings') {
    if(/wall|fence/.test(item.id))return 'wall';
    if(/gate|arch/.test(item.id))return 'arch';
    if(/bridge|dock-planks/.test(item.id))return 'bridge';
    if(/hut|house|ossuary|shrine|temple-central|market-stall/.test(item.id))return 'house';
    return 'statue';
  }
  return item.collider?.type !== 'none' && item.collider ? 'statue' : 'decoration';
}

export function normalizeObject(item) {
  const kind = inferKind(item), rules = OBJECT_KINDS[kind];
  const footprint = { offsetX: 0, offsetY: 0, ...(!item.image&&LEGACY_FOOTPRINTS[item.placeholderTexture]?
    legacyFootprint(item.placeholderTexture,item.size,item.anchor):item.footprint || item.collider ||
    LEGACY_FOOTPRINTS[item.placeholderTexture] || { type: 'none' }) };
  const width = item.size?.width || 128, height = item.size?.height || 128;
  const anchor = item.anchor || { x: .5, y: 1 };
  const tall = rules.overhead && item.fadeBehind !== false;
  const parts=(kind==='arch'||kind==='bridge')&&footprint.type==='rect' ? [-1,1].map(side=>({type:'rect',
    width:Math.max(8,footprint.width*.16),height:footprint.height,offsetX:footprint.offsetX+side*footprint.width*.42,offsetY:footprint.offsetY})) : item.solidParts;
  return { ...item, kind, anchor, level: item.level ?? 0, footprint, collider: footprint, solidParts:parts,
    occluder: item.occluder || (tall ? { x: -width * anchor.x, y: -height * anchor.y,
      width, height: height * .65 } : null),
    overhead: item.overhead || (tall ? { cropRatio: .65 } : null),
    door: item.door || (rules.door ? { x: 0, y: footprint.offsetY + (footprint.height || 0) / 2,
      facing: 'south', closed: true, width: 34, height: 62 } : null),
    breakable: Boolean(item.breakable || rules.breakable), light: Boolean(item.light || item.lightSource),
  };
}

export function normalizeKit(kit) {
  return { ...kit, objectSchemaVersion: 1, items: kit.items.map(normalizeObject) };
}
