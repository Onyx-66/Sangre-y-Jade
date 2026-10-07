// Marks the player when a higher world-space render object intersects them;
// this outline never changes actor alpha and therefore cannot leave stale fades.
import { DEPTH_BANDS } from './layers.js';
import { OcclusionOutline } from './OcclusionOutline.js';

function boundsFor(object) {
  if (object?.getBounds) return object.getBounds();
  const width = Number(object?.displayWidth || object?.width || 0);
  const height = Number(object?.displayHeight || object?.height || 0);
  const ox = Number(object?.originX ?? object?.origin?.x ?? 0.5);
  const oy = Number(object?.originY ?? object?.origin?.y ?? 0.5);
  return { x: object.x - width * ox, y: object.y - height * oy, width, height };
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function hasHigherWorldOverlap(scene, actor) {
  if (!scene?.children?.list || !actor) return false;
  const actorBounds = boundsFor(actor);
  return scene.children.list.some(object => {
    if (!object || object === actor || object.getData?.('skipOcclusion') || !object.active || !object.visible || object.alpha <= 0 ||
        Number(object.depth) <= Number(actor.depth) || object.depth >= DEPTH_BANDS.effects-2400 || object.scrollFactorX === 0 || object.getData?.('viewportOverlay')) return false;
    return intersects(actorBounds, boundsFor(object));
  });
}

export class PlayerOcclusion {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(DEPTH_BANDS.occlusion);
    this.graphics.setData?.('skipOcclusion', true);
    this.outline = new OcclusionOutline(scene,DEPTH_BANDS.occlusion);
  }

  update(actor = this.scene.player) {
    const g = this.graphics;
    if (!actor?.active || !actor.visible || !hasHigherWorldOverlap(this.scene, actor)) {
      g.clear().setVisible(false);
      this.outline.hide();
      return false;
    }
    if(this.outline.show(actor)){g.clear().setVisible(false);return true;}
    const bounds = boundsFor(actor);
    // A thin cyan perimeter keeps the sprite legible without mutating its fade/alpha state.
    g.clear().lineStyle(1.5, 0x9be7ff, 0.92).strokeRoundedRect(
      bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, 5,
    ).setVisible(true);
    return true;
  }

  destroy() { this.outline.destroy();this.graphics?.destroy(); }
}
