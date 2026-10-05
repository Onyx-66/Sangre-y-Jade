import roster from '../data/enemies-v06.json' with { type:'json' };
import { ENEMY_BEHAVIORS } from '../enemies/index.js';
import { stepAction,restore,cue,distance } from '../enemies/common.js';
import { worldView } from './Viewport.js';

// Art and sound content is delivered by later prompts. These are deliberate
// existing-actor fallbacks, not nonexistent texture requests or new image assets.
export const ENEMY_ART_FALLBACK={vine_lurker:'serpent',stone_guardian:'jaguar',jungle_wasp:'bat',blood_wraith:'shade',bone_archer:'priest',moon_cultist:'priest',drowned_spirit:'shade',abyssal_eel:'serpent',crystal_golem:'jaguar',glow_wisp:'bat'};
export const PRIORITY_ENEMIES=new Set(['priest','moon_cultist']);
export const enemyBehaviorDefaults=()=>({behaviorState:null,buried:false,burrowing:false,invulnerableEnemy:false,
  wardShield:0,wardUntil:0,prismUntil:0,prismReflect:0,roarUntil:0,roarSpeedMult:1,recoveryUntil:0,recoveryVulnerability:0});
export function rosterDamageMult(enemy,origin,seconds,dot=false) {
  if(enemy.getData('buried')||enemy.getData('invulnerableEnemy'))return 0;
  let mult=enemy.getData('recoveryUntil')>seconds?1+(enemy.getData('recoveryVulnerability')||0):1;
  const guard=roster[enemy.getData('type')]?.attacks['Stone Guard'];
  if(guard&&!dot&&origin){const angle=Math.atan2(origin.y-enemy.y,origin.x-enemy.x)-(enemy.getData('heading')||0);
    if(Math.cos(angle)>=Math.cos(guard.arc/2))mult*=1-guard.reduction;}
  return mult;
}
export class EnemyBehaviorSystem {
  constructor(scene,{random=Math.random,graphics=scene.add?.graphics?.()}={}) {
    this.scene=scene;this.random=random;this.graphics=graphics?.setDepth?.(10)||graphics;
    this.puddles=[];this.puddlePool=[];this.casts={};this.destroyed=false;
  }
  context(enemy,dt=0,target=this.scene.player) {
    const data=roster[enemy.getData('type')],state=enemy.getData('behaviorState');
    const dx=target.x-enemy.x,dy=target.y-enemy.y;
    return {scene:this.scene,enemy,data,state,dt,target,distance:Math.hypot(dx,dy),angle:Math.atan2(dy,dx),
      speed:enemy.getData('speed')*(enemy.getData('roarUntil')>this.scene.elapsed?enemy.getData('roarSpeedMult'):1)};
  }
  init(enemy) {
    const type=enemy.getData('type'),behavior=ENEMY_BEHAVIORS[type];if(!behavior)return;
    enemy.setData({...enemyBehaviorDefaults(),behaviorState:{serial:enemy.getData('serial'),cooldowns:{},busy:null,motion:null,after:null}});
    behavior.init?.(this.context(enemy));
  }
  update(enemy,dt,target) {
    const behavior=ENEMY_BEHAVIORS[enemy.getData('type')];if(!behavior||enemy.getData('isBoss')||this.destroyed)return false;
    if(enemy.getData('behaviorState')?.serial!==enemy.getData('serial'))this.init(enemy);
    const ctx=this.context(enemy,dt,target);
    if(!stepAction(ctx))behavior.update(ctx);return true;
  }
  interrupt(enemy) {
    const state=enemy.getData('behaviorState');if(!state||state.serial!==enemy.getData('serial'))return;
    if(!state.busy&&!state.motion&&!state.after&&!enemy.getData('burrowing'))return;
    this.scene.telegraphs?.cancelOwner(enemy);state.busy=null;state.motion=null;state.after=null;restore(this.context(enemy));
  }
  countCast(id,name) {const key=`${id}:${name}`;this.casts[key]=(this.casts[key]||0)+1;}
  removeOwned(enemy) {
    for(const summon of this.scene.enemies.getChildren())if(summon.active&&summon.getData('summoner')===enemy&&summon.getData('summonerSerial')===enemy.getData('serial'))this.despawn(summon);
  }
  despawn(enemy) {if(!enemy.active)return;this.interrupt(enemy);this.removeOwned(enemy);enemy.disableBody(true,true);}
  // A finite-map generator can supply the query later. Until then explicit test
  // water zones and the Spirit's blue puddles are the only water on the map.
  isWaterAt(point,margin=0) {
    if(this.scene.isWaterAt?.(point,margin))return true;
    return [...(this.scene.waterZones||[]),...this.puddles].some(zone=>(zone.until===undefined||zone.until>this.scene.elapsed)&&distance(point,zone)<=(zone.radius||0)+margin);
  }
  addPuddle(enemy,p) {
    if(this.puddles.length>=128)this.puddlePool.push(this.puddles.shift());
    const pool=this.puddlePool.pop()||{};Object.assign(pool,{x:enemy.x,y:enemy.y,radius:p.radius,until:this.scene.elapsed+p.duration,slowPct:p.slowPct});this.puddles.push(pool);
    cue(this.context(enemy),'attack',enemy,{radius:p.radius,duration:p.duration});
  }
  applyPlayerStatus(kind,params,source) {
    if(!params||this.scene.ended)return;
    const player=this.scene.player,now=this.scene.elapsed;
    if(kind==='root'||kind==='knockup'||kind==='confuse'){player.setData(`${kind}Until`,Math.max(player.getData(`${kind}Until`)||0,now+params));return;}
    player.setData(`enemy${kind}`,{dps:params.dps,until:now+params.duration,source,serial:source?.getData?.('serial')});
  }
  updateWorld(dt) {
    const scene=this.scene;if(this.destroyed||scene.ended||scene.pausedForChoice||scene.loadingRun)return;
    for(const kind of ['poison','bleed']){const dot=scene.player.getData(`enemy${kind}`);if(!dot)continue;
      const seconds=Math.min(dt,Math.max(0,dot.until-(scene.elapsed-dt)));
      const source=dot.source?.active&&dot.source.getData('serial')===dot.serial?dot.source:null;
      if(seconds>0)scene.damagePlayer(dot.dps*seconds,source?.x??scene.player.x,source?.y??scene.player.y,source,false,{dot:true});
      if(dot.until<=scene.elapsed)scene.player.setData(`enemy${kind}`,null);if(scene.ended)return;
    }
    this.puddles=this.puddles.filter(p=>{if(p.until<=scene.elapsed){this.puddlePool.push(p);return false;}return true;});
    for(const puddle of this.puddles)if(distance(scene.player,puddle)<=puddle.radius){
      const until=scene.player.getData('slowUntil')||0,pct=scene.player.getData('slowPct')||0;
      // An existing stronger slow is not weakened by crossing a puddle.
      scene.player.setData({slowUntil:Math.max(until,scene.elapsed+.08),slowPct:until>scene.elapsed?Math.max(pct,puddle.slowPct):puddle.slowPct});
    }
    this.draw();
  }
  draw() {
    const g=this.graphics;if(!g)return;g.clear();const scene=this.scene,view=worldView(scene);
    for(const p of this.puddles)if(p.x+p.radius>view.x&&p.x-p.radius<view.right&&p.y+p.radius>view.y&&p.y-p.radius<view.bottom){
      g.fillStyle(0x8ec5ff,.2*Math.min(1,p.until-scene.elapsed)).fillCircle(p.x,p.y,p.radius);g.lineStyle(1,0x8ec5ff,.5).strokeCircle(p.x,p.y,p.radius);}
    for(const e of scene.enemies.getChildren())if(e.active&&!e.getData('buried')){
      const data=roster[e.getData('type')],r=data?.radius||16,guard=data?.attacks['Stone Guard'];
      if(guard){const a=e.getData('heading')||0;g.lineStyle(3,0xc9c3d6,.55).beginPath().arc(e.x,e.y,r+6,a-guard.arc/2,a+guard.arc/2).strokePath();}
      if(e.getData('prismUntil')>scene.elapsed)g.lineStyle(3,0x8ec5ff,.8).strokeCircle(e.x,e.y,r+7);
      if(e.getData('wardUntil')>scene.elapsed&&e.getData('wardShield')>0)g.lineStyle(2,0x3de0b0,.65).strokeCircle(e.x,e.y,r+5);
    }
  }
  reflectProjectile(projectile,enemy) {
    if(!(enemy.getData('prismUntil')>this.scene.elapsed)||!projectile.active)return false;
    const v=projectile.body.velocity,shot=this.scene.spawnEnemyProjectile(projectile.x,projectile.y,Math.atan2(-v.y,-v.x),Math.hypot(v.x,v.y),projectile.getData('damage')*(enemy.getData('prismReflect')||1),enemy);
    shot?.setData({sourceSerial:enemy.getData('serial'),reflected:true});projectile.destroy();return true;
  }
  touch(enemy) {
    // Contact belongs to a telegraphed dash/dive, tested with swept segments;
    // idle body overlap never adds a second, unannounced attack.
    return !enemy.getData('isBoss')&&Boolean(ENEMY_BEHAVIORS[enemy.getData('type')]);
  }
  destroy() {this.destroyed=true;this.graphics?.destroy();this.puddles.length=this.puddlePool.length=0;}
}
