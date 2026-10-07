// Shared solid-world solver for physics actors, directly moved allies and shots.
// All collision uses feet circles and floor levels, independent of art streaming.
import { penetration, pushOut, sweepMove, firstWall } from './geometry.js';
import { advanceStairs, stairCoordinates, stairWaypoint, LEVEL_HEIGHT } from './elevation.js';
import { hudDepth } from '../render/layers.js';
import { applyElevation } from './ElevationVisual.js';

export class WorldCollision {
  constructor(map) {
    this.map=map;this.actors=new Map();this.stairs=map.layout.stairs||[];this.surfaces=map.layout.surfaces||[];
    this.query=(p,r)=>map.blockersAround(p.x,p.y,r);
    this.debug=typeof location!=='undefined'&&new URLSearchParams(location.search).get('debug')==='collision';
  }
  track(actor,{radius=11,footOffset=0,flier=false}={}) {
    let state=this.actors.get(actor);
    const serial=actor.getData?.('serial');
    if(!state||state.serial!==serial){state={x:actor.x,y:actor.y+footOffset,level:actor.getData?.('level')||0,heightLevel:actor.getData?.('level')||0,radius,footOffset,flier,serial};this.actors.set(actor,state);}
    return state;
  }
  allowed(point,state) {
    if(state.stairId)return true;
    // Stair rails are impassable from the sides on either connected floor.
    for(const stair of this.stairs){const c=stairCoordinates(point,stair);
      if(c.t>0&&c.t<1&&Math.abs(c.side)<stair.width/2+state.radius&&
        (state.level===stair.fromLevel||state.level===stair.toLevel))return false;}
    return state.level===0||this.surfaces.some(s=>s.level===state.level&&penetration(point,0,s));
  }
  resolve(actor,options) {
    if(!actor?.active)return;
    const state=this.track(actor,options),from={x:state.x,y:state.y},wanted={x:actor.x,y:actor.y+state.footOffset};
    if(state.flier){Object.assign(state,wanted);return;}
    const forced=Boolean(actor.getData?.('knockbackUntil')>this.map.scene.elapsed||actor.getData?.('knockback'));
    const transition=advanceStairs(state,from,wanted,this.stairs,{radius:state.radius,knockback:forced});
    const position=sweepMove(from,transition.position,state.radius,this.query,state.level,p=>this.allowed(p,transition));
    // Recompute against the actual accepted endpoint: a blocked stair never changes level.
    const result=advanceStairs(state,from,position,this.stairs,{radius:state.radius,knockback:forced});
    Object.assign(state,result,{x:result.position.x,y:result.position.y});
    actor.setData?.('level',state.level);actor.setData?.('elevation',state.heightLevel*LEVEL_HEIGHT);
    actor.setData?.('worldFootY',state.y);
    const x=state.x,y=state.y-state.footOffset;
    if(Math.abs(actor.x-x)+Math.abs(actor.y-y)>.0001){
      const vx=actor.body?.velocity?.x||0,vy=actor.body?.velocity?.y||0;
      if(actor.body?.reset){actor.body.reset(x,y);actor.body.setVelocity?.(vx,vy);}else actor.setPosition(x,y);
    }
  }
  steer(actor,target) {
    const state=this.actors.get(actor);if(!state||state.flier||!target)return target;
    return stairWaypoint({...state,x:actor.x,y:actor.y},{...target,level:target.getData?.('level')??target.level??0},this.stairs);
  }
  projectile(projectile,from) {
    const level=projectile.getData?.('level')??projectile.getData?.('source')?.getData?.('level')??0;
    return firstWall(from||projectile,projectile,3,this.query,level);
  }
  free(point,radius,level=0) { return pushOut(point,radius,this.query,level); }
  update() {
    const scene=this.map.scene;
    this.resolve(scene.player,{radius:11,footOffset:24});
    for(const enemy of scene.enemies?.getChildren?.()||[])this.resolve(enemy,{radius:enemy.getData('radius')||16,flier:enemy.getData('flier')});
    this.resolve(scene.companion?.sprite,{radius:11,footOffset:24});
    for(const actor of [scene.player,scene.companion?.sprite])if(actor)applyElevation(actor,actor.getData?.('elevation')||0);
    for(const actor of this.actors.keys())if(!actor.active)this.actors.delete(actor);
    if(this.debug)this.draw();
  }
  draw() {
    const g=this.graphics ||= this.map.scene.add.graphics().setDepth(hudDepth(-1));g.clear();
    for(const {item} of this.map.active.values()) {
      if(item.collider.type==='none')continue;
      const s=item.scale||1;
      for(const f of item.solidParts||[item.collider]){
        const x=item.x+(f.offsetX||0)*s,y=item.y+(f.offsetY||0)*s;
        g.lineStyle(2,item.level?0xff66ff:0xffcf4a,1);
        if(f.type==='circle')g.strokeCircle(x,y,f.radius*s);
        else if(f.type==='polygon'){g.beginPath();f.points.forEach((p,i)=>g[i?'lineTo':'moveTo'](x+(p.x??p[0])*s,y+(p.y??p[1])*s));g.closePath().strokePath();}
        else g.strokeRect(x-f.width*s/2,y-f.height*s/2,f.width*s,f.height*s);
      }
      if(item.occluder){const o=item.occluder;g.lineStyle(1,0x8ec5ff,.8).strokeRect(item.x+o.x*s,item.y+o.y*s,o.width*s,o.height*s);}
    }
    for(const state of this.actors.values())g.lineStyle(2,0x3de0b0,1).strokeCircle(state.x,state.y,state.radius);
    for(const stair of this.stairs)g.lineStyle(3,0xff66ff,1).lineBetween(stair.from.x,stair.from.y,stair.to.x,stair.to.y);
    if(this.map.scene.add.text){
      this.legend ||= this.map.scene.add.text(12,90,'',{fontFamily:'Atkinson Hyperlegible',fontSize:'14px',color:'#ffffff',backgroundColor:'#201c2c'})
        .setScrollFactor(0).setDepth(hudDepth());
      const hero=this.actors.get(this.map.scene.player);
      this.legend.setText(`Collision | floor ${hero?.level||0} | height ${(hero?.heightLevel||0).toFixed(2)}\nGold: solid floor 0 | cyan: occluder | green: feet | pink: stairs`);
    }
  }
  destroy(){this.graphics?.destroy();this.legend?.destroy();this.actors.clear();}
}
