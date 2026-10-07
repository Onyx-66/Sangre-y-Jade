import { MAP_KITS } from '../data/mapDefinitions.js';
import { SpatialHash } from './SpatialHash.js';
import { generateMapLayout, packWorldCells, PLAYABLE_BOUNDS, WORLD_HALF } from './layout.js';
import { createMapArt } from './MapArt.js';
import { backgroundDepth, footprintBaseY, objectBaseY, overheadDepth, worldDepth } from '../render/layers.js';
import { shapeBounds } from '../world/geometry.js';
import { WorldCollision } from '../world/WorldCollision.js';
import { Overhead } from '../world/Overhead.js';

const nextFrame = () => new Promise(resolve => setTimeout(resolve, 0));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function actorCanCollideWithMap(actor, prop) {
  return Boolean(prop?.blocksGround && !actor?.flier && (actor?.level??0)===(prop?.level??0));
}

export function stuckRecovery(seconds, moved) {
  if (moved >= 2) return 'none';
  if (seconds >= 2) return 'reposition';
  if (seconds >= 1) return 'nudge';
  return 'none';
}

export function waterSpeedMultiplier(mapWorld, point) {
  return mapWorld?.isWaterAt(point) ? 0.8 : 1;
}

function rectFor(item) {
  if(item.collider.type==='polygon')return shapeBounds(item);
  if (item.collider.type === 'circle') {
    const r = item.collider.radius * item.scale;
    const x = item.x + item.collider.offsetX * item.scale, y = item.y + item.collider.offsetY * item.scale;
    return { x: x - r, y: y - r, width: r * 2, height: r * 2 };
  }
  const width = item.collider.width * item.scale, height = item.collider.height * item.scale;
  const x = item.x + item.collider.offsetX * item.scale, y = item.y + item.collider.offsetY * item.scale;
  return { x: x - width / 2, y: y - height / 2, width, height };
}

function circlesOverlap(a, b, padding = 0) {
  const dx = a.x - b.x, dy = a.y - b.y, r = a.radius + b.radius + padding;
  return dx * dx + dy * dy < r * r;
}

export class MapWorld {
  constructor(scene, { map = scene.mapData, seed = 1, maxActive = 350, chunkBudget = 2 } = {}) {
    this.scene = scene;
    this.map = map;
    this.kit = map.kit || MAP_KITS[map.id];
    this.layout = generateMapLayout(map.id, this.kit, seed);
    this.seed = Number(seed) >>> 0;
    this.maxActive = maxActive;
    this.chunkBudget = chunkBudget;
    this.active = new Map();
    this.activeCells = new Set();
    this.pendingCells = [];
    this.pendingSet = new Set();
    this.destroyedItems = new Set();
    this.visualPool = [];
    this.colliderPool = [];
    this.spatialHash = new SpatialHash(256);
    this.stuck = new Map();
    this.lightSources = new Set(this.layout.lightSources.filter(item=>item.lightEnabled!==false).map(item => ({ id: item.worldId, x: item.x, y: item.y + (item.lightOffsetY || 0) * item.scale, kind: item.id, color: item.lightColor })));
    this.activeLightSources = new Set();
    this.waterZones = this.layout.waterZones;
    this.peakActive = 0;
    this.maxObservedCells = 0;
    this.destroyed = false;
    for (const item of this.layout.colliders) this.spatialHash.insert(item.worldId, item, rectFor(item));
    this.collision = new WorldCollision(this);
    this.overheads = new Overhead(scene);
    scene.mapSeed = this.seed;
    scene.mapLayout = this.layout;
    scene.waterZones = this.waterZones;
    scene.lightSources = this.lightSources;
    this.art = createMapArt(scene, this.kit, this.layout);
    this.drawBoundary();
    this.drawPathways();
    this.drawWater();
    this.requestVisible(scene.cameras?.main ? this.worldView() : null);
  }

  worldView() {
    const camera = this.scene.cameras?.main;
    if (!camera) return { x: this.scene.player?.x - 640 || -640, y: this.scene.player?.y - 360 || -360,
      width: 1280, height: 720, right: (this.scene.player?.x || 0) + 640, bottom: (this.scene.player?.y || 0) + 360 };
    const zoomX = camera.zoomX || camera.zoom || 1, zoomY = camera.zoomY || camera.zoom || 1;
    const width = camera.width / zoomX, height = camera.height / zoomY;
    const x = (camera.scrollX || 0) + camera.width / 2 - width / 2;
    const y = (camera.scrollY || 0) + camera.height / 2 - height / 2;
    return { x, y, width, height, right: x + width, bottom: y + height };
  }

  drawBoundary() {
    const scene = this.scene;
    this.wallGraphics = scene.add?.graphics?.().setDepth?.(backgroundDepth(10));
    if (!this.wallGraphics) return;
    const g = this.wallGraphics;
    const color = this.map.id === 'overgrown' ? 0x15271e : this.map.id === 'bloodmoon' ? 0x17121c : 0x0a1119;
    g.fillStyle(color, 0.96);
    g.fillRect(-WORLD_HALF.x, -WORLD_HALF.y, this.kit.world.width, 400);
    g.fillRect(-WORLD_HALF.x, WORLD_HALF.y - 400, this.kit.world.width, 400);
    g.fillRect(-WORLD_HALF.x, -WORLD_HALF.y + 400, 400, this.kit.world.height - 800);
    g.fillRect(WORLD_HALF.x - 400, -WORLD_HALF.y + 400, 400, this.kit.world.height - 800);
    for (let i = 0; i < 8; i++) {
      const alpha = (8 - i) / 80;
      const inset = 400 + i * 12;
      g.lineStyle(12, color, alpha);
      g.strokeRect(-WORLD_HALF.x + inset, -WORLD_HALF.y + inset,
        this.kit.world.width - inset * 2, this.kit.world.height - inset * 2);
    }
  }

  drawWater() {
    if(this.art?.handlesWater)return;
    const scene = this.scene;
    this.waterGraphics = scene.add?.graphics?.().setDepth?.(backgroundDepth(20));
    if (!this.waterGraphics) return;
    for (const zone of this.waterZones) {
      this.waterGraphics.fillStyle(0x258fa0, 0.27).fillCircle(zone.x, zone.y, zone.radius);
      this.waterGraphics.lineStyle(5, 0x5bd7d0, 0.28).strokeCircle(zone.x, zone.y, zone.radius);
      this.waterGraphics.lineStyle(2, 0xb9f2e9, 0.2).strokeCircle(zone.x, zone.y, zone.radius * 0.72);
    }
  }

  drawPathways() {
    if (this.art) return;
    const graphics = this.scene.add?.graphics?.().setDepth?.(backgroundDepth(30));
    this.pathGraphics = graphics;
    if (!graphics) return;
    const color = this.map.id === 'overgrown' ? 0x806e49 : this.map.id === 'bloodmoon' ? 0x673640 : 0x9daea5;
    const { left, right, top, bottom } = PLAYABLE_BOUNDS, halfWidth = 360;
    graphics.fillStyle(color, 0.24)
      .fillRect(left, -halfWidth, right - left, halfWidth * 2)
      .fillRect(-halfWidth, top, halfWidth * 2, bottom - top);
  }

  async prepare(onProgress = () => {}, signal) {
    if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
    onProgress(0.7);
    const view = this.worldView();
    this.requestVisible(view);
    const cells = this.pendingCells.length;
    let done = 0;
    while (this.pendingCells.length) {
      if (signal?.aborted) throw signal.reason || new DOMException('Aborted', 'AbortError');
      this.processPending(this.chunkBudget);
      done = cells - this.pendingCells.length;
      onProgress(0.7 + 0.3 * (cells ? done / cells : 1));
      if (this.pendingCells.length) await nextFrame();
    }
    onProgress(1);
    return this.layout;
  }

  requestVisible(view = this.worldView()) {
    if (!view) return;
    const desired = packWorldCells(this.layout, view, 1);
    this.desiredCells = new Set(desired.map(cell => cell.key));
    for (const key of [...this.activeCells]) if (!this.desiredCells.has(key)) this.recycleCell(key);
    const ordered = desired.sort((a, b) => {
      const center = { x: this.scene.player?.x || 0, y: this.scene.player?.y || 0 };
      const point = cell => ({ x: -WORLD_HALF.x + (cell.x + 0.5) * this.layout.world.cellSize,
        y: -WORLD_HALF.y + (cell.y + 0.5) * this.layout.world.cellSize });
      return distance(point(a), center) - distance(point(b), center);
    });
    for (const cell of ordered) if (!this.activeCells.has(cell.key) && !this.pendingSet.has(cell.key)) {
      this.pendingSet.add(cell.key); this.pendingCells.push(cell.key);
    }
  }

  processPending(budget = this.chunkBudget) {
    let count = 0;
    while (count < budget && this.pendingCells.length) {
      const key = this.pendingCells.shift(); this.pendingSet.delete(key);
      if (!this.desiredCells?.has(key) || this.activeCells.has(key)) continue;
      this.activateCell(key); count++;
    }
  }

  update(view = this.worldView()) {
    if (this.destroyed) return;
    this.art?.update?.(this.scene.time?.now || 0);
    this.requestVisible(view);
    this.processPending(this.chunkBudget);
    this.updateFades();
  }

  texture(item) {
    if(item.textureKey && this.scene.textures?.exists?.(item.textureKey))return item.textureKey;
    const requested = item.placeholderTexture;
    if (this.scene.textures?.exists?.(requested)) return requested;
    const fallbacks = ['top-foliage', 'top-rocks', 'top-ruin', 'top-tree'];
    return fallbacks.find(key => this.scene.textures?.exists?.(key)) || requested;
  }

  obtain(item, collidable) {
    const scene = this.scene, pool = collidable ? this.colliderPool : this.visualPool;
    const overheads=this.overheads.parts.size+this.overheads.pool.length;
    const required=(pool.length?0:1)+(item.overhead&&!this.overheads.pool.length?1:0);
    if(this.active.size+this.visualPool.length+this.colliderPool.length+overheads+required>this.maxActive)return null;
    let object = pool.pop();
    if (!object && this.active.size + this.visualPool.length + this.colliderPool.length >= this.maxActive) return null;
    if (object) {
      object.setTexture(this.texture(item)).setPosition(item.x, item.y).setOrigin(item.anchor.x, item.anchor.y)
        .setDisplaySize(item.size.width, item.size.height).setDepth(this.depthForItem(item)).setAlpha(1)
        .setActive(true).setVisible(true);
      if (object.body) {
        scene.physics.world.add(object.body);
        this.configureBody(object, item);
      }
    } else if (collidable) {
      object = scene.props.create(item.x, item.y, this.texture(item));
      object.setOrigin(item.anchor.x, item.anchor.y).setDisplaySize(item.size.width, item.size.height)
        .setDepth(this.depthForItem(item)).setActive(true).setVisible(true);
      object.setData('mapPool', true);
      this.configureBody(object, item);
    } else {
      object = scene.add.image(item.x, item.y, this.texture(item)).setOrigin(item.anchor.x, item.anchor.y)
        .setDisplaySize(item.size.width, item.size.height).setDepth(this.depthForItem(item));
      scene.decorGroup?.add?.(object);
    }
    object.setFlipX(item.flipX || false);
    object.setData({ mapPlacementId: item.worldId, mapItemId: item.id, mapCategory: item.category,
      breakable: item.breakable, lightSource: item.lightSource, blocksGround: item.collider.type !== 'none',
      hp: item.breakable ? 24 : 0, kind: item.breakable ? item.id : item.category, level: item.level || 0 });
    if (item.lightSource && item.lightEnabled!==false) this.activeLightSources.add(object);
    this.overheads.attach(item,object);
    return object;
  }

  configureBody(object, item) {
    const body = object.body;
    if (!body) return;
    const displayW = object.displayWidth, displayH = object.displayHeight;
    const bounds=item.collider.type==='polygon'?shapeBounds(item):null;
    const shape = bounds?{type:'rect',width:bounds.width/item.scale,height:bounds.height/item.scale,
      offsetX:(bounds.x+bounds.width/2-item.x)/item.scale,offsetY:(bounds.y+bounds.height/2-item.y)/item.scale}:item.collider;
    // Phaser's StaticBody refresh resets its dimensions to the full image.
    // Refresh FIRST, then set the measured footprint and offset (also on reuse).
    body.offset?.set?.(0,0);
    body.updateFromGameObject?.();
    if (shape.type === 'circle') {
      const radius = Math.max(4, shape.radius * item.scale);
      const ox = displayW * item.anchor.x + shape.offsetX * item.scale - radius;
      const oy = displayH * item.anchor.y + shape.offsetY * item.scale - radius;
      body.setCircle(radius, 0, 0).setOffset(ox, oy);
    } else {
      const width = Math.max(8, shape.width * item.scale), height = Math.max(8, shape.height * item.scale);
      const ox = displayW * item.anchor.x + shape.offsetX * item.scale - width / 2;
      const oy = displayH * item.anchor.y + shape.offsetY * item.scale - height / 2;
      body.setSize(width, height, false).setOffset(ox, oy);
    }
  }

  depthForItem(item) {
    // Hard rule: unified tree/building sprites sort at their physical base. Only
    // separately-authored overhead-only pieces belong in the overhead band.
    const baseY = footprintBaseY(item);
    return item.overheadOnly ? overheadDepth(baseY, item.depthOffset) : worldDepth(baseY, item.depthOffset);
  }

  activateCell(key) {
    const rows = this.layout.byCell.get(key) || [];
    this.activeCells.add(key);
    for (const item of rows) {
      if (this.destroyedItems.has(item.worldId) || this.active.size >= this.maxActive) continue;
      const collidable = item.collider.type !== 'none' || item.breakable;
      const object = this.obtain(item, collidable);
      if (!object) continue;
      this.active.set(item.worldId, { item, object, collidable, cellKey: key });
    }
    this.peakActive = Math.max(this.peakActive, this.active.size);
    this.maxObservedCells = Math.max(this.maxObservedCells, this.activeCells.size);
  }

  recycleCell(key) {
    for (const [id, entry] of [...this.active]) {
      if (entry.cellKey !== key) continue;
      this.active.delete(id);
      this.overheads.detach(entry.object);
      if (entry.item.lightSource) this.activeLightSources.delete(entry.object);
      if (entry.collidable && entry.object.body?.enable) this.scene.physics.world.disableBody(entry.object.body);
      entry.object.setActive(false).setVisible(false);
      (entry.collidable ? this.colliderPool : this.visualPool).push(entry.object);
    }
    this.activeCells.delete(key);
  }

  markDestroyed(id) {
    if (!id) return;
    this.destroyedItems.add(id);
    this.spatialHash.remove(id);
    for(const key of this.spatialHash.entries.keys())if(key.startsWith(`${id}:part`))this.spatialHash.remove(key);
    const entry = this.active.get(id);
    if (entry) { this.overheads.detach(entry.object); this.activeLightSources.delete(entry.object); this.active.delete(id); }
  }

  updateFades() {
    const actors = [this.scene.player, this.scene.companion?.sprite, this.scene.bossController?.activeBoss]
      .filter(actor => actor && actor.active !== false && actor.visible !== false);
    for (const { item, object } of this.active.values()) {
      const anchor = item.anchor || { x: 0.5, y: 0.5 };
      const width = item.size.width, height = item.size.height || width;
      const bounds = { x: item.x - width * anchor.x, y: item.y - height * anchor.y, width, height };
      const itemBaseY = footprintBaseY(item);
      const behind = item.fadeBehind && actors.some(actor => {
        const width = actor.displayWidth || actor.width || 32, height = actor.displayHeight || actor.height || 48;
        const ax = actor.x - width * (actor.originX ?? 0.5), ay = actor.y - height * (actor.originY ?? 0.5);
        // With y-sorted unified art, only actors north of the footprint are
        // behind its canopy/roof; actors south of the base render in front.
        return objectBaseY(actor) < itemBaseY && ax < bounds.x + bounds.width && ax + width > bounds.x && ay < bounds.y + bounds.height && ay + height > bounds.y;
      });
      object.setAlpha(behind ? 0.55 : 1);
    }
    this.overheads.update(actors);
  }

  isWaterAt(point, margin = 0) {
    return this.waterZones.some(zone => Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.radius + margin);
  }

  clampInside(point, radius = 20) {
    const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    return { x: clamp(point.x, PLAYABLE_BOUNDS.left + radius, PLAYABLE_BOUNDS.right - radius),
      y: clamp(point.y, PLAYABLE_BOUNDS.top + radius, PLAYABLE_BOUNDS.bottom - radius) };
  }

  spawnOutsideView(view, random = Math.random, padding = 100) {
    const { left, right, top, bottom } = PLAYABLE_BOUNDS, choices = [];
    const along = random(), side = Math.floor(random() * 4);
    const { x, y, width, height } = view;
    const candidate = which => which === 0 ? { x: x - padding, y: y + along * height }
      : which === 1 ? { x: x + width + padding, y: y + along * height }
        : which === 2 ? { x: x + along * width, y: y - padding }
          : { x: x + along * width, y: y + height + padding };
    for (let i = 0; i < 4; i++) {
      const p = candidate((side + i) % 4);
      if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) choices.push(p);
    }
    if (choices.length) return choices[0];
    const fallback = this.clampInside({ x: x + width / 2, y: y + height / 2 });
    return { x: fallback.x < (left + right) / 2 ? right - padding : left + padding,
      y: fallback.y < (top + bottom) / 2 ? bottom - padding : top + padding };
  }

  blockersAround(x, y, radius) {
    return this.spatialHash.query({ x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 });
  }

  updateActors(dt) {
    const scene = this.scene, enemies = scene.enemies?.getChildren?.() || [];
    for (const enemy of enemies) {
      if (!enemy.active || enemy.getData('isBoss') || enemy.getData('flier')) continue;
      const actorRadius = enemy.getData('radius') || 16, velocity = enemy.body?.velocity;
      // A blocked Arcade body often reports near-zero velocity. Keep it in the
      // detector so stationary ground enemies can reach the 1s/2s recovery.
      if (!velocity) continue;
      const nearby = this.blockersAround(enemy.x, enemy.y, actorRadius + 180).filter(item=>(item.level||0)===(enemy.getData('level')||0));
      const waypoint=this.collision?.steer(enemy,scene.player);
      if(waypoint&&waypoint!==scene.player){const dx=waypoint.x-enemy.x,dy=waypoint.y-enemy.y,d=Math.hypot(dx,dy)||1,speed=Math.hypot(velocity.x,velocity.y)||48;velocity.x=dx/d*speed;velocity.y=dy/d*speed;}
      let avoidX = 0, avoidY = 0, nearest = null, nearestDistance = Infinity;
      for (const item of nearby) {
        const bounds = rectFor(item), cx = Math.max(bounds.x,Math.min(bounds.x+bounds.width,enemy.x));
        const cy = Math.max(bounds.y,Math.min(bounds.y+bounds.height,enemy.y));
        const dx = enemy.x - cx, dy = enemy.y - cy, d = Math.hypot(dx, dy);
        const clearance = actorRadius + 28;
        if (d < nearestDistance) { nearestDistance = d; nearest = { item, cx, cy, d }; }
        if (d > 0 && d < clearance + 100) {
          const strength = (clearance + 100 - d) / 100;
          avoidX += dx / d * strength; avoidY += dy / d * strength;
        }
      }
      if (avoidX || avoidY) {
        const length = Math.hypot(avoidX, avoidY) || 1;
        velocity.x += avoidX / length * Math.hypot(velocity.x, velocity.y) * Math.min(0.75, dt * 4);
        velocity.y += avoidY / length * Math.hypot(velocity.x, velocity.y) * Math.min(0.75, dt * 4);
      }
      const key = enemy.getData('serial') ?? enemy;
      let state = this.stuck.get(key);
      if (!state) state = { x: enemy.x, y: enemy.y, seconds: 0, observation: 0 };
      const moved = Math.hypot(enemy.x - state.x, enemy.y - state.y);
      // Check net progress over a full second: collision jitter must not reset
      // the stuck clock, and a 48px/s guardian is genuine progress at 60 Hz.
      state.observation=(state.observation||0)+dt;
      if(state.observation>=1-1e-9){
        state.seconds=moved<12?state.seconds+state.observation:0;
        state.observation=0;state.x=enemy.x;state.y=enemy.y;
      }
      const recovery=stuckRecovery(state.seconds,0);
      if (recovery === 'nudge') {
        const angle = nearest ? Math.atan2(enemy.y - nearest.cy, enemy.x - nearest.cx) + 0.9 : Math.atan2(velocity.y, velocity.x) + 0.7;
        velocity.x += Math.cos(angle) * 90 * dt; velocity.y += Math.sin(angle) * 90 * dt;
      }
      if (recovery === 'reposition') {
        const options = Array.from({ length: 8 }, (_, i) => {
          const angle = i * Math.PI / 4, distance = actorRadius + (nearest?.item.collider.radius || actorRadius) + 64;
          return this.clampInside({ x: (nearest?.cx ?? enemy.x) + Math.cos(angle) * distance,
            y: (nearest?.cy ?? enemy.y) + Math.sin(angle) * distance }, actorRadius);
        }).filter(point => this.blockersAround(point.x, point.y, actorRadius + 40).every(item => {
          const bounds = rectFor(item); return point.x < bounds.x - actorRadius || point.x > bounds.x + bounds.width + actorRadius ||
            point.y < bounds.y - actorRadius || point.y > bounds.y + bounds.height + actorRadius;
        }));
        const navigation=this.collision?.actors.get(enemy);
        const safe=options.find(point=>!navigation||this.collision.allowed(point,navigation));
        if (safe) { enemy.setPosition(safe.x, safe.y); enemy.body.reset(safe.x, safe.y);
          if(navigation){navigation.x=safe.x;navigation.y=safe.y;}}
        state.seconds = 0;
        state.x = enemy.x; state.y = enemy.y;
      }
      this.stuck.set(key, state);
    }
    for (const key of this.stuck.keys()) if (!enemies.some(enemy => enemy.active && (enemy.getData('serial') ?? enemy) === key)) this.stuck.delete(key);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.art?.destroy();
    this.collision?.destroy();
    this.overheads?.destroy();
    this.wallGraphics?.destroy(); this.pathGraphics?.destroy(); this.waterGraphics?.destroy();
    for (const key of [...this.activeCells]) this.recycleCell(key);
    this.active.clear(); this.stuck.clear(); this.lightSources.clear(); this.activeLightSources.clear(); this.spatialHash.clear();
    this.pendingCells.length = 0; this.pendingSet.clear();
  }
}
