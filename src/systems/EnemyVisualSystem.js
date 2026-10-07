import { deathEffect } from '../art/enemyVisuals.js';
import { backgroundDepth, objectBaseY, setWorldDepth } from '../render/layers.js';

// Presentation lives on non-physics sprites: squash/stretch never changes a hitbox.
export class EnemyVisualSystem{
 constructor(scene){this.scene=scene;this.actors=new Map();this.shadows=scene.add.graphics().setDepth(backgroundDepth(8999));}
 init(enemy){
  this.remove(enemy);if(enemy.getData('isBoss'))return;
  const key=enemy.getData('artKey');if(!this.scene.textures.exists(`${key}-frame-15`))return;
  const sprite=this.scene.add.sprite(enemy.x,enemy.y,key).setOrigin(.5,.94);
  setWorldDepth(sprite, objectBaseY(sprite));
  const entry={sprite,serial:enemy.getData('serial'),scale:enemy.scaleX,alpha:enemy.alpha,state:'idle',until:0,flashUntil:0};
  this.actors.set(enemy,entry);this.sync(enemy,entry);enemy.setAlpha(0);
 }
 pose(enemy,state,seconds=0){const entry=this.actors.get(enemy);if(!entry)return;
  entry.state=state;entry.until=this.scene.elapsed+(seconds||.2);
  if(state==='hurt')entry.flashUntil=this.scene.elapsed+.065;
 }
 emerge(enemy){if(enemy.getData('buried'))return;
  const entry=this.actors.get(enemy);if(entry)entry.emergeUntil=this.scene.elapsed+.55;
  const mist=['bat','jungle_wasp','glow_wisp'].includes(enemy.getData('type'));
  this.scene.fx?.play(mist?'death-puff-cyan':'spawn-crack','ground',{x:enemy.x,y:enemy.y,size:enemy.getData('radius')*3,duration:.55,sound:false});
 }
 sync(enemy,entry){
  const now=this.scene.elapsed,r=enemy.getData('radius')||16,motion=enemy.getData('behaviorState')?.motion;
  const leap=motion?.leap?Math.sin(Math.PI*Math.min(1,motion.age/Math.max(.001,motion.duration))):0;
  const diving=enemy.getData('type')==='bat'&&Boolean(motion),hover=['bat','jungle_wasp','glow_wisp'].includes(enemy.getData('type'));
  const emerge=Math.max(0,Math.min(1,1-((entry.emergeUntil||0)-now)/.55));
  if(enemy.alpha>0)entry.alpha=enemy.alpha;
  const frame=enemy.anims.currentFrame?.textureKey||enemy.texture.key;
  const action=enemy.getData('behaviorState'),heading=action?.motion?enemy.getData('heading')||0:enemy.getData('visualHeading')||0;
  const facing=action?.motion||action?.busy||action?.after?Math.cos(heading)<0:enemy.flipX;
  const sprite=entry.sprite.setTexture(frame).setFlipX(facing).setVisible(enemy.visible&&!enemy.getData('buried')&&!enemy.getData('burrowing'));
  const activePose=entry.until>now?entry.state:null;
  const squash=!this.scene.settings.reducedMotion&&activePose==='windup'?[1.1,.9]:!this.scene.settings.reducedMotion&&activePose==='attack'?[1.12,.94]:[1,1];
  sprite.setPosition(enemy.x,enemy.y+r-(enemy.getData('elevation')||0)-(leap*28)-(hover&&!diving?8:0)+(1-emerge)*12).setScale(entry.scale*squash[0],entry.scale*squash[1]*(.45+.55*emerge));
  setWorldDepth(sprite, enemy.getData('worldFootY')??objectBaseY(sprite));
  sprite.setAlpha(entry.alpha*emerge);
  if(entry.flashUntil>now)sprite.setTintFill(0xffffff);else if(enemy.isTinted)sprite.setTint(enemy.tintTopLeft);else sprite.clearTint();
  enemy.setAlpha(0);
  if(!sprite.visible)return;
  const shadowScale=(1-leap*.4)*(hover&&!diving?.75:1);
  this.shadows.fillStyle(0x15121c,.3*emerge).fillEllipse(enemy.x,enemy.y+r,r*2.1*shadowScale,r*.62*shadowScale);
  if(enemy.getData('affix')){
   const tint={armored:0xffcf4a,swift:0x3de0b0,vampiric:0xd9413a,explosive:0xff8a1f,shielded:0x8ec5ff}[enemy.getData('affix')];
   const pulse=this.scene.settings.reducedMotion?1:.75+.25*Math.sin(now*4);
   if(sprite.preFX?.addGlow){if(!entry.glow)entry.glow=sprite.preFX.addGlow(tint,2,0,false,.06,8);entry.glow.outerStrength=1+1.4*pulse;}
   else this.shadows.lineStyle(2,tint,.55*pulse).strokeEllipse(enemy.x,enemy.y+r,r*2.6,r*.95);
  }else if(entry.glow){sprite.preFX.remove(entry.glow);entry.glow=null;}
 }
 update(){this.shadows.clear();for(const [enemy,entry]of this.actors){
  if(!enemy.active||enemy.getData('serial')!==entry.serial){this.remove(enemy);continue;}this.sync(enemy,entry);
 }}
 die(enemy){
  const entry=this.actors.get(enemy);if(!entry)return;
  this.actors.delete(enemy);const {sprite}=entry;const key=enemy.getData('artKey');
  sprite.preFX?.clear();sprite.clearTint().setVisible(true).setAlpha(entry.alpha).setScale(entry.scale);
  this.scene.fx.track(sprite);sprite.play(`${key}-death`);
  const id=deathEffect(enemy.getData('type')),x=enemy.x,y=enemy.y;
  this.scene.time.delayedCall(500,()=>{if(sprite.active)sprite.destroy();if(!this.scene.ended)this.scene.fx.play(id,'impact',{x,y,size:70,duration:.45,sound:false});});
 }
 remove(enemy){const entry=this.actors.get(enemy);entry?.sprite.destroy();this.actors.delete(enemy);}
 destroy(){for(const enemy of this.actors.keys())this.remove(enemy);this.shadows.destroy();}
}
