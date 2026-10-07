// Like the enemy renderer, boss poses are non-physics sprites. The original
// body keeps its radius, world centre and combat scale through every pose.
import { backgroundDepth, objectBaseY, setWorldDepth } from '../render/layers.js';
export class BossVisualSystem {
 constructor(scene){this.scene=scene;this.actors=new Map();this.shadows=scene.add.graphics().setDepth(backgroundDepth(8999));}
 init(boss){
  this.remove(boss);const key=boss.getData('artKey');
  if(!key?.startsWith('boss-')||!this.scene.textures.exists(`${key}-frame-15`))return;
  const sprite=this.scene.add.sprite(boss.x,boss.y,key).setOrigin(.5,.985);
  setWorldDepth(sprite, objectBaseY(sprite));
  const entry={sprite,serial:boss.getData('serial'),scale:boss.scaleX,alpha:1,state:'idle',until:0,flashUntil:0};
  this.actors.set(boss,entry);this.sync(boss,entry);boss.setAlpha(0);
 }
 render(boss){return this.actors.get(boss)?.sprite;}
 pose(boss,state,seconds=0){const e=this.actors.get(boss);if(!e)return;
  e.state=state;e.until=this.scene.elapsed+(seconds||.2);if(state==='hurt')e.flashUntil=this.scene.elapsed+.065;
 }
 entryProgress(boss,p){const e=this.actors.get(boss);if(!e||boss.getData('serial')!==e.serial)return;
  // Cinematics freeze scene timers/tweens: use their own normalized clock.
  const n=p<.45?(p<.25?6:7):p<.8?(p<.65?8:9):0;
  e.sprite.anims?.stop();e.sprite.setTexture(`${boss.getData('artKey')}-frame-${n}`);
  e.sprite.setPosition(boss.x,boss.y+24*e.scale);boss.setAlpha(0);
 }
 sync(boss,e){
  const scene=this.scene,now=scene.elapsed,state=boss.getData('bossState'),key=boss.getData('artKey');
  const frame=boss.anims.currentAnim?.key?.startsWith(`${key}-`)?boss.anims.currentFrame.textureKey:boss.texture.key,
   heading=state?.busy||state?.channel?Math.cos(scene.bossController?.context(state).angle||0)<0:boss.flipX;
  if(boss.alpha>0)e.alpha=boss.alpha;
  const pose=e.until>now?e.state:state?.busy?'windup':state?.channel?'attack':state?.recoveryUntil>now?'recover':'idle';
  const squash=!scene.settings.reducedMotion&&pose==='windup'?[1.07,.94]:!scene.settings.reducedMotion&&pose==='attack'?[1.09,.96]:[1,1];
  const sprite=e.sprite.setTexture(frame).setFlipX(heading).setVisible(boss.visible);
  sprite.setPosition(boss.x,boss.y+24*e.scale-(boss.getData('elevation')||0)).setScale(e.scale*squash[0],e.scale*squash[1]).setAlpha(e.alpha);
  setWorldDepth(sprite, boss.getData('worldFootY')??objectBaseY(sprite));
  if(e.flashUntil>now)sprite.setTintFill(0xffffff);else if(boss.isTinted)sprite.setTint(boss.tintTopLeft);else sprite.clearTint();
  boss.setAlpha(0);
  if(sprite.visible){this.shadows.fillStyle(0x15121c,.4).fillEllipse(boss.x,boss.y+24*e.scale,80*e.scale,22*e.scale);
   if(state?.phase>0)this.shadows.lineStyle(2,state.definition.color||0xffcf4a,.3).strokeEllipse(boss.x,boss.y+24*e.scale,94*e.scale,30*e.scale);}
  // The physics actor advances the canonical animation, the clone only copies.
 }
 update(){this.shadows.clear();for(const [boss,e]of this.actors){
  if(!boss.active||boss.getData('serial')!==e.serial){this.remove(boss);continue;}
  if(!this.scene.bossCinematic)this.sync(boss,e);
 }}
 die(boss){
  const e=this.actors.get(boss);if(!e)return null;this.actors.delete(boss);
  const sprite=e.sprite;sprite.clearTint().setVisible(true).setAlpha(e.alpha).setScale(e.scale);
  sprite.play(`${boss.getData('artKey')}-death`);this.scene.fx.track(sprite);return sprite;
 }
 remove(boss){this.actors.get(boss)?.sprite.destroy();this.actors.delete(boss);}
 destroy(){for(const boss of this.actors.keys())this.remove(boss);this.shadows.destroy();}
}
