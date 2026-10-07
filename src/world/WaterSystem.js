// Applies water without enemy-hit callbacks: air uses simulation seconds and
// direct HP loss; floor-zero water never affects fliers, bridges or stair height.
import { WATER, WaterGrid, lakeWaterZones, debugWaterZones, waterSpeed, waterTraits, newBreath, stepBreath } from './water.js';
import { WaterEffects } from './WaterEffects.js';
import { WaterAudio } from '../audio/WaterAudio.js';
import { BreathHud } from '../ui/BreathHud.js';
import { worldDepth } from '../render/layers.js';
export class WaterSystem {
  constructor(scene){
    this.scene=scene;const debug=typeof location!=='undefined'?new URLSearchParams(location.search).get('debug'):'';
    this.grid=new WaterGrid(debug==='water'?debugWaterZones():lakeWaterZones(scene.mapWorld?.waterZones||[]));
    this.breath=newBreath();this.enemies=new Map();this.audio=new WaterAudio(scene.audio);this.fx=new WaterEffects(scene);
    this.fx.drawZones(this.grid,debug==='collision'||debug==='water');this.hud=new BreathHud(scene.hud);this.previous='dry';this.ripple=0;this.step=0;
    this.zone=this.at(scene.player);this.elapsed=0;
    this.onPause=()=>this.audio.pause();scene.events?.on('pause',this.onPause);
  }
  at(actor){return this.grid.waterAt(actor.x,actor.y+(actor===this.scene.player?24:0),(actor.getData?.('elevation')||0)>0?1:actor.getData?.('level')||0);}
  waterAt(x,y,level=0){return this.grid.waterAt(x,y,level);}
  addZone(zone){const added=this.grid.addZone(zone);this.fx.drawZones(this.grid,this.scene.mapWorld?.collision.debug);return added;}
  get range(){return this.at(this.scene.player).deep?.8:1;}
  get speed(){return waterSpeed(this.at(this.scene.player));}
  get paused(){const s=this.scene;return s.pausedForChoice||s.loadingRun||s.ended||s.bossCinematic||s.cutscenes?.active||s.scene?.isPaused?.();}
  beforeMovement(){this.zone=this.at(this.scene.player);if(this.zone.deep)this.scene.dash.remaining=0;}
  heroCurrent(dt){const p=this.scene.player,z=this.at(p);p.x+=z.flow.x*WATER.current*dt;p.y+=z.flow.y*WATER.current*dt;}
  enemyMotion(enemy,dt){
    const traits=waterTraits(enemy);if(traits.flier||enemy.getData('bossObject'))return;
    const z=this.at(enemy),v=enemy.body?.velocity;if(!v)return;
    const factor=waterSpeed(z,{...traits,enemy:true});v.x*=factor;v.y*=factor;
    // A voluntary path never enters deep water. Fear/pull/knockback is allowed;
    // collision also checks the swept path so a fast dash cannot skip the shore.
    if(!traits.swimmer&&!traits.boss&&!z.deep&&!(enemy.getData('elevation')>0)&&!this.forced(enemy)){
      const speed=Math.hypot(v.x,v.y),look=Math.max(28,speed*dt+16);
      if(speed&&this.grid.waterAt(enemy.x+v.x/speed*look,enemy.y+v.y/speed*look,enemy.getData('level')||0).deep){
        const angle=Math.atan2(v.y,v.x),choices=[1,-1,2,-2].map(k=>angle+k*Math.PI/4);
        const safe=choices.find(a=>!this.grid.waterAt(enemy.x+Math.cos(a)*look,enemy.y+Math.sin(a)*look).deep);
        v.x=safe===undefined?0:Math.cos(safe)*speed;v.y=safe===undefined?0:Math.sin(safe)*speed;
      }
    }
    enemy.x+=z.flow.x*WATER.current*dt;enemy.y+=z.flow.y*WATER.current*dt;
  }
  forced(e){return e.getData('knockbackUntil')>this.scene.elapsed||e.getData('fearUntil')>this.scene.elapsed||e.getData('pullTo')?.until>this.scene.elapsed||!!e.getData('knockback');}
  mayEnter(e,point){const t=waterTraits(e);return t.flier||t.swimmer||t.boss||this.forced(e)||this.at(e).deep||!this.grid.waterAt(point.x,point.y,e.getData('level')||0).deep;}
  update(dt){
    if(this.paused){this.audio.pause();return;}
    const s=this.scene,p=s.player,z=this.at(p);this.zone=z;this.elapsed+=dt;
    if(z.kind!==this.previous){
      if(this.previous!=='dry')this.audio.play(`exit-${this.previous}`,p);
      if(z.kind!=='dry'){this.audio.play(`enter-${z.kind}`,p);this.fx.emit(p.x,p.y+24,z.deep?'large':'ripple');}
      this.previous=z.kind;
    }
    const result=stepBreath(this.breath,dt,z.deep);
    if(result.warning)this.audio.play('breath-warning',p);if(result.gasp)this.audio.play('gasp',p);
    for(const percent of result.damage){s.stats.hp=Math.max(0,s.stats.hp-s.stats.maxHp*percent);this.audio.play('drown-tick',p);this.fx.emit(p.x,p.y+24,'tick');if(!s.stats.hp){s.finishRun(false);break;}}
    const moving=Math.hypot(p.body?.velocity?.x||0,p.body?.velocity?.y||0)>5;
    for(const name of ['wade-loop','swim-loop','bubbles-loop','river-loop'])this.audio.loop(name,
      name==='wade-loop'?z.kind==='shallow'&&moving:name==='swim-loop'?z.deep&&moving:name==='bubbles-loop'?z.deep:!!(z.flow.x||z.flow.y));
    this.audio.submerged(z.deep);
    this.ripple+=dt;this.step+=dt;
    if(this.ripple>=WATER.ripple){this.ripple%=WATER.ripple;if(moving&&z.kind!=='dry'){this.fx.emit(p.x,p.y+24,'ripple');this.fx.emit(p.x-8,p.y+24,'foam');this.audio.play('splash-ring',p);}if(z.deep)this.fx.emit(p.x+5,p.y,'bubble');}
    if(moving&&this.step>=.45){this.step%=.45;this.audio.play(z.deep?'swim':z.kind==='shallow'?'wade':'stone',p,'steps');}
    for(const e of s.enemies?.getChildren?.()||[])if(e.active)this.enemyBreath(e,dt);
    for(const e of this.enemies.keys())if(!e.active)this.enemies.delete(e);
    this.fx.update(dt);this.drawWet();this.hud.update(this.breath,p,s.cameras?.main);
  }
  enemyBreath(e,dt){
    const t=waterTraits(e);if(t.flier||e.getData('bossObject'))return;
    const serial=e.getData('serial');let state=this.enemies.get(e);
    if(!state||state.serial!==serial){state={serial,seconds:0,tick:0,kind:'dry'};this.enemies.set(e,state);}
    const z=this.at(e);
    if(z.kind!==state.kind&&z.kind!=='dry'){this.audio.play(t.boss?'enemy-splash-large':'enemy-splash-small',e);this.fx.emit(e.x,e.y,t.boss?'large':'ripple');}state.kind=z.kind;
    if(!z.deep||t.swimmer||t.boss){state.seconds=state.tick=0;return;}
    state.seconds+=dt;state.tick+=dt;
    while(state.tick>=1-1e-8){state.tick-=1;e.setData('hp',e.getData('hp')-e.getData('maxHp')*WATER.enemyDamage);}
    if(e.getData('hp')<=0||!t.elite&&state.seconds>=WATER.drownAfter-1e-8){
      this.audio.play('enemy-drown',e);this.fx.emit(e.x,e.y,'large');this.scene.killEnemy(e,false,{drowned:true});
    }
  }
  drawWet(){
    const s=this.scene,p=s.player,wet=this.zone.kind!=='dry';if(!wet){this.wet?.setVisible(false);return;}
    this.wet ||= s.add.image(p.x,p.y,p.texture.key,p.frame.name);
    const proxy=this.wet,frame=p.frame;
    proxy.setTexture(p.texture.key,frame.name).setPosition(p.x,p.y).setOrigin(p.originX,p.originY).setScale(p.scaleX,p.scaleY)
      .setFlipX(p.flipX).setDepth(worldDepth(p.getData('worldFootY')??p.y+24,.1)).setTint(0x55bbdd).setAlpha(this.zone.deep?.25:.18).setVisible(p.visible);
    const y=frame.height*(this.zone.deep?.35:.65);proxy.setCrop(0,y,frame.width,frame.height-y);
    if(this.zone.deep&&!s.settings.reducedMotion&&!s.settings.reduceEffects)proxy.y+=Math.sin(this.elapsed*5)*1.5;
  }
  rainRipple(x,y){if(this.grid.waterAt(x,y).kind!=='dry')this.fx.emit(x,y,'ripple');}
  projectileHit(p){if(this.grid.waterAt(p.x,p.y,p.getData?.('level')||0).kind!=='dry')this.audio.play('projectile-water-hit',p);}
  destroy(){this.scene.events?.off('pause',this.onPause);this.audio.destroy();this.fx.destroy();this.hud.destroy();this.wet?.destroy();this.enemies.clear();}
}
