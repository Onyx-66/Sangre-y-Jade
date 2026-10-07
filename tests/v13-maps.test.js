import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '../src/data/world.js';
import { MAP_KITS } from '../src/data/mapDefinitions.js';
import { SpatialHash } from '../src/maps/SpatialHash.js';
import { generateMapLayout, layoutsOverlap, isWalkableRoute, packWorldCells,
  PLAYABLE_BOUNDS, BOSS_ARENA_CLEAR_RADIUS, MAP_CELL_SIZE } from '../src/maps/layout.js';
import { MapWorld, actorCanCollideWithMap, stuckRecovery, waterSpeedMultiplier } from '../src/maps/MapWorld.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('V13 map definitions are loaded from the supplied map tables and have one kit schema per map', () => {
  assert.deepEqual(MAPS.map(map => map.id), ['overgrown', 'bloodmoon', 'cenote']);
  for (const map of MAPS) {
    assert.deepEqual(map.size, { width: 6400, height: 4800 });
    assert.ok(map.timeOfDay && map.palette && map.music && map.ambience);
    assert.ok(map.enemies.length > 0 && map.landmarks);
    const kit = MAP_KITS[map.id];
    assert.equal(kit.world.cellSize, 640);
    assert.equal(kit.world.wallThickness, 400);
    assert.ok(kit.items.length >= 45);
    for (const item of kit.items) {
      assert.ok(item.id && item.size.width > 0 && item.size.height > 0);
      assert.ok(item.anchor && ['circle', 'rect', 'none'].includes(item.collider.type));
      assert.ok(Number.isFinite(item.depthOffset));
      assert.equal(typeof item.fadeBehind, 'boolean');
      assert.equal(typeof item.breakable, 'boolean');
      assert.equal(typeof item.lightSource, 'boolean');
    }
  }
});

test('the fixed base layouts and seeded decorations satisfy safe areas, footprints and connected routes for 200 seeds per map', { timeout: 120000 }, () => {
  for (const [mapIndex, mapId] of Object.keys(MAP_KITS).entries()) {
    const first = generateMapLayout(mapId, MAP_KITS[mapId], 1);
    const fixed = first.placements.filter(item => item.fixed).map(({ worldId, x, y }) => [worldId, x, y]);
    assert.equal(fixed.length, MAP_KITS[mapId].items.filter(item => item.category === 'buildings').length);
    for (let seed = 1; seed <= 200; seed++) {
      const layout = generateMapLayout(mapId, MAP_KITS[mapId], seed + mapIndex * 1000);
      assert.equal(layout.seed, (seed + mapIndex * 1000) >>> 0);
      assert.equal(layout.landmarks.length, fixed.length);
      assert.deepEqual(layout.placements.filter(item => item.fixed).map(({ worldId, x, y }) => [worldId, x, y]), fixed);
      assert.equal(layoutsOverlap(layout), null, `${mapId}, seed ${seed}: overlapping footprints`);
      assert.ok(isWalkableRoute(layout, 'x'), `${mapId}, seed ${seed}: horizontal path blocked`);
      assert.ok(isWalkableRoute(layout, 'y'), `${mapId}, seed ${seed}: vertical path blocked`);
      for (const item of layout.placements) {
        const radius = Math.max(item.size.width, item.size.height) / 2;
        assert.ok(item.x - radius >= PLAYABLE_BOUNDS.left && item.x + radius <= PLAYABLE_BOUNDS.right);
        assert.ok(item.y - radius >= PLAYABLE_BOUNDS.top && item.y + radius <= PLAYABLE_BOUNDS.bottom);
        assert.ok(distance(item, { x: 0, y: 0 }) >= BOSS_ARENA_CLEAR_RADIUS + radius);
      }
      assert.equal(layout.clearAreas[0].radius, 400);
      assert.equal(layout.clearAreas[1].radius, 600);
      assert.equal(layout.clearPaths.length, 2);
    }
    const next = generateMapLayout(mapId, MAP_KITS[mapId], 99 + mapIndex * 1000);
    assert.notDeepEqual(first.placements.filter(item => !item.fixed).map(item => [item.id, item.x, item.y]),
      next.placements.filter(item => !item.fixed).map(item => [item.id, item.x, item.y]));
  }
});

test('streamed cell windows include exactly the visible region plus one clipped 640 px margin', () => {
  const layout = generateMapLayout('overgrown', MAP_KITS.overgrown, 7);
  const view = { x: -640, y: -360, width: 1280, height: 720, right: 640, bottom: 360 };
  const cells = packWorldCells(layout, view, 1);
  assert.ok(cells.length <= 20);
  assert.ok(cells.some(cell => cell.key === '4,3'));
  assert.ok(cells.every(cell => cell.x >= 0 && cell.x < 10 && cell.y >= 0 && cell.y < 8));
  const edge = packWorldCells(layout, { ...view, x: -4000, right: -2720 }, 1);
  assert.ok(edge.every(cell => cell.x >= 0 && cell.x <= 1));
  assert.equal(layout.world.cellSize, MAP_CELL_SIZE);
});

test('MapWorld recycles streamed sprites, respects the 350-object cap, and registers Cenote water and lights', () => {
  const scene = makeScene('cenote');
  const world = new MapWorld(scene, { map: scene.mapData, seed: 55, maxActive: 350, chunkBudget: 4 });
  for (let i = 0; i < 40 && world.pendingCells.length; i++) world.processPending(4);
  const firstIds = new Set(world.active.keys());
  assert.ok(world.active.size > 0 && world.active.size <= 350);
  assert.ok(world.lightSources.size > 0);
  assert.equal(waterSpeedMultiplier(world, { x: -1780, y: 320 }), 0.8);
  assert.equal(waterSpeedMultiplier(world, { x: 0, y: 0 }), 1);
  scene.cameras.main.scrollX = 1360;
  scene.cameras.main.scrollY = 900;
  world.update();
  for (let i = 0; i < 40 && world.pendingCells.length; i++) world.processPending(4);
  assert.ok([...firstIds].some(id => !world.active.has(id)), 'old cell entries should have recycled');
  assert.ok(world.visualPool.length + world.colliderPool.length > 0, 'recycled sprites should be pooled');
  assert.ok(world.active.size <= 350);
  assert.ok(world.active.size + world.visualPool.length + world.colliderPool.length <= 350);
  const breakable = world.layout.colliders.find(item => item.breakable);
  assert.ok(breakable, 'map kits contain breakable colliders');
  world.spatialHash.insert(breakable.worldId, breakable, { x: breakable.x - 12, y: breakable.y - 12, width: 24, height: 24 });
  assert.ok(world.blockersAround(breakable.x, breakable.y, 30).some(item => item.worldId === breakable.worldId));
  world.markDestroyed(breakable.worldId);
  assert.ok(!world.blockersAround(breakable.x, breakable.y, 30).some(item => item.worldId === breakable.worldId),
    'destroyed breakables stop obstructing ground-enemy steering');
  world.destroy();
  assert.equal(world.active.size, 0);
  assert.equal(world.spatialHash.entries.size, 0);
});

test('spatial hash returns intersecting collider cells and removes recycled entries', () => {
  const hash = new SpatialHash(100), tree = { id: 'tree' }, building = { id: 'building' };
  hash.insert('tree', tree, { x: 10, y: 10, width: 48, height: 48 });
  hash.insert('building', building, { x: 270, y: 270, width: 160, height: 130 });
  assert.deepEqual(hash.query({ x: 0, y: 0, width: 100, height: 100 }), [tree]);
  assert.deepEqual(new Set(hash.query({ x: 320, y: 300, width: 30, height: 30 })), new Set([building]));
  assert.equal(hash.remove('tree'), true);
  assert.deepEqual(hash.query({ x: 0, y: 0, width: 100, height: 100 }), []);
});

test('tree/building/rock collider filtering blocks ground actors but never fliers', () => {
  const prop = { blocksGround: true }, plant = { blocksGround: false };
  assert.equal(actorCanCollideWithMap({ flier: false }, prop), true);
  assert.equal(actorCanCollideWithMap({ flier: true }, prop), false);
  assert.equal(actorCanCollideWithMap({ flier: false }, plant), false);
});

test('kit categories map to circle/rectangle footprints and Phaser bodies receive matching geometry', () => {
  const overgrown = MAP_KITS.overgrown.items;
  assert.ok(overgrown.filter(item => item.category === 'trees').every(item => item.collider.type === 'circle'));
  assert.ok(overgrown.filter(item => item.category === 'rocks').every(item => item.collider.type === 'circle'));
  assert.ok(overgrown.filter(item => item.category === 'buildings').every(item => item.collider.type === 'rect'));
  const scene = makeScene('overgrown'), world = new MapWorld(scene, { map: scene.mapData, seed: 5 });
  const calls = [], body = {
    setCircle(...args) { calls.push(['circle', ...args]); return this; },
    setSize(...args) { calls.push(['rect', ...args]); return this; },
    setOffset(...args) { calls.push(['offset', ...args]); return this; },
    updateFromGameObject() {},
  };
  const object = { body, displayWidth: 160, displayHeight: 100 };
  world.configureBody(object, { scale: 1, anchor: { x: .5, y: .8 }, collider: { type: 'rect', width: 120, height: 48, offsetX: 2, offsetY: 3 } });
  assert.deepEqual(calls, [['rect', 120, 48, false], ['offset', 22, 59]]);
  world.destroy();
});

test('overhead art fades to 55 percent for an overlapping hero, ally or boss and restores without changing actor alpha', () => {
  const scene = makeScene('overgrown'), world = new MapWorld(scene, { map: scene.mapData, seed: 8 });
  let alpha = 1; const object = { setAlpha(value) { alpha = value; return this; } };
  const item={ fadeBehind:true, x:0, y:100, scale:1, anchor:{x:.5,y:.5}, size:{width:160,height:200} };
  world.active.set('canopy', { item, object });
  scene.player={x:0,y:0,displayWidth:32,displayHeight:48,active:true,alpha:.72};
  scene.companion={sprite:{x:500,y:500,active:true}};
  scene.bossController={activeBoss:{x:-500,y:-500,active:true}};
  world.updateFades(); assert.equal(alpha, .55); assert.equal(scene.player.alpha,.72);
  scene.player.y=220; world.updateFades(); assert.equal(alpha,1,'a south-side actor is in front of the unified tree/building sprite');
  scene.player.y=0;
  scene.player.x=500; scene.player.y=500; world.updateFades(); assert.equal(alpha, 1);
  scene.player.x=0; scene.player.y=0; scene.companion.sprite.x=0; scene.companion.sprite.y=0;
  world.updateFades(); assert.equal(alpha, .55);
  scene.companion.sprite.x=500; scene.bossController.activeBoss.x=0; scene.bossController.activeBoss.y=0;
  world.updateFades(); assert.equal(alpha, .55);
  scene.bossController.activeBoss.x=500; scene.bossController.activeBoss.y=500;
  scene.player.x=500; scene.player.y=500; world.updateFades(); assert.equal(alpha, 1);
  world.destroy();
});

test('stuck detector nudges at one second and repositions by two seconds', () => {
  assert.equal(stuckRecovery(0.99, 0), 'none');
  assert.equal(stuckRecovery(1, 0), 'nudge');
  assert.equal(stuckRecovery(1.99, 0), 'nudge');
  assert.equal(stuckRecovery(2, 0), 'reposition');
  assert.equal(stuckRecovery(3, 5), 'none');
  assert.equal(stuckRecovery(1, 0), 'nudge', 'stationary actors are nudged after one second');
  assert.equal(stuckRecovery(3, 0), 'reposition', 'zero velocity is still recoverable after two seconds');
});

test('slow ground enemies making progress are not teleported by the stuck detector', () => {
  let resets=0;
  const enemy={active:true,x:0,y:0,getData:key=>({serial:1,radius:16}[key]),
    body:{velocity:{x:48,y:0},reset(){resets++;}},setPosition(x,y){this.x=x;this.y=y;}};
  const world={scene:{enemies:{getChildren:()=>[enemy]}},stuck:new Map(),blockersAround:()=>[],clampInside:p=>p};
  for(let i=0;i<300;i++){enemy.x+=48/60;MapWorld.prototype.updateActors.call(world,1/60);}
  assert.equal(resets,0,'0.8px each frame is progress, not five seconds stuck');
  assert.equal(enemy.body.velocity.x,48,'no false nudge');
  for(let i=0;i<125;i++)MapWorld.prototype.updateActors.call(world,1/60);
  assert.ok(resets>=1,'actually blocked enemies still recover');
});

test('a ground enemy stopped by collision still reaches stuck recovery', () => {
  let resets=0;
  const enemy={active:true,x:0,y:0,getData:key=>({serial:2,radius:16}[key]),
    body:{velocity:{x:0,y:0},reset(){resets++;}},setPosition(x,y){this.x=x;this.y=y;}};
  const world={scene:{enemies:{getChildren:()=>[enemy]}},stuck:new Map(),blockersAround:()=>[],clampInside:p=>p};
  for(let i=0;i<125;i++)MapWorld.prototype.updateActors.call(world,1/60);
  assert.ok(resets>=1,'zero-velocity actors must be nudged/repositioned rather than skipped');
});

test('small collision jitter cannot indefinitely reset the stuck detector',()=>{
  let resets=0;
  const enemy={active:true,x:0,y:0,getData:k=>({serial:3,radius:16}[k]),body:{velocity:{x:40,y:0},reset(){resets++;}},setPosition(x,y){this.x=x;this.y=y;}};
  const world={scene:{enemies:{getChildren:()=>[enemy]}},stuck:new Map(),blockersAround:()=>[],clampInside:p=>p};
  for(let i=0;i<180;i++){enemy.x=(i%4<2?3:-3);MapWorld.prototype.updateActors.call(world,1/60);}
  assert.ok(resets>0,'six-pixel oscillations are not progress around an obstacle');
});

function makeScene(mapId) {
  let madeVisuals = 0, madeProps = 0;
  const graphics = () => new Proxy({}, { get(_target, key) { return key === 'destroy' ? () => {} : () => graphicsResult; } });
  const graphicsResult = new Proxy({}, { get(_target, key) { return key === 'destroy' ? () => {} : () => graphicsResult; } });
  const createObject = () => {
    const data = {};
    const object = {
      active: true, visible: true, x: 0, y: 0, displayWidth: 128, displayHeight: 128,
      body: null,
      setTexture() { return this; }, setPosition(x, y) { this.x = x; this.y = y; return this; },
      setOrigin() { return this; }, setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; return this; },
      setDepth() { return this; }, setAlpha() { return this; }, setActive(value) { this.active = value; return this; },
      setVisible(value) { this.visible = value; return this; }, setFlipX() { return this; },
      setData(key, value) { if (typeof key === 'object') Object.assign(data, key); else data[key] = value; return this; },
      getData(key) { return data[key]; },
    };
    return object;
  };
  const world = { add(body) { body.enable = true; }, disableBody(body) { body.enable = false; } };
  const camera = { width: 1280, height: 720, zoom: 1, zoomX: 1, zoomY: 1, scrollX: -640, scrollY: -360 };
  const mapData = MAPS.find(map => map.id === mapId);
  return {
    mapData, player: { x: 0, y: 0 }, cameras: { main: camera }, textures: { exists: () => true },
    add: {
      graphics,
      image() { madeVisuals++; return createObject(); },
    },
    decorGroup: { add() {} },
    props: { create() { madeProps++; const object = createObject(); object.body = {
      enable: true, setCircle() { return this; }, setSize() { return this; }, setOffset() { return this; },
      updateFromGameObject() {}, reset() {},
    }; return object; } },
    physics: { world },
    objectCounts: () => ({ visuals: madeVisuals, props: madeProps }),
  };
}
