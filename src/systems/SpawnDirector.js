import { canSpawnEnemy, spawnOutsideView } from './CombatRules.js';
import { worldView } from './Viewport.js';
import roster from '../data/enemies-v06.json' with { type:'json' };

// The design lists map rosters, but no pack-table field. Preserve section 6.2's
// examples and the roster's exact group sizes; see V8 in DECISIONS.md.
const basePacks=[
  {id:'shades',members:['shade','shade','shade','shade'],from:0,weight:4},
  {id:'bats',members:['bat','bat'],from:0,weight:2},
  {id:'jaguar-escort',members:['jaguar','shade','shade'],from:90,weight:2},
  {id:'priest-guard',members:['priest','serpent'],from:90,weight:2},
];
export const PACK_TABLES={
  overgrown:[...basePacks,{id:'vine-ambush',members:['vine_lurker','serpent'],from:45,weight:2},
    {id:'stone-guard',members:['stone_guardian','shade','shade'],from:150,weight:1},
    {id:'wasps',members:['jungle_wasp','jungle_wasp','jungle_wasp'],from:45,weight:2}],
  bloodmoon:[...basePacks,{id:'wraith-hunt',members:['blood_wraith','shade','shade'],from:60,weight:2},
    {id:'archer-guard',members:['bone_archer','serpent'],from:45,weight:2},
    {id:'cultist-guard',members:['moon_cultist','shade'],from:90,weight:2}],
  cenote:[...basePacks,{id:'drowned-trail',members:['drowned_spirit','serpent'],from:45,weight:2},
    {id:'eel-charge',members:['abyssal_eel','shade'],from:60,weight:2},
    {id:'prism-guard',members:['crystal_golem','shade'],from:150,weight:1},
    {id:'wisps',members:['glow_wisp','glow_wisp','glow_wisp','glow_wisp'],from:45,weight:2}],
};
export const aliveCap=(seconds,duration=600)=>Math.floor(12+(duration>600?34:26)*Math.min(1,Math.max(0,seconds/duration)));
export function eligiblePacks(map,hero,seconds,space=Infinity,alive=[]) {
  return (PACK_TABLES[map]||basePacks).filter(pack=>pack.from<=seconds&&pack.members.length<=space&&pack.members.every(type=>{
    const data=roster[type],count=alive.filter(e=>e.active&&!e.getData('isBoss')&&e.getData('type')===type).length;
    return canSpawnEnemy(hero,type)&&(data.maps.includes('all')||data.maps.includes(map))&&(!data.aliveLimit||count+pack.members.filter(id=>id===type).length<=data.aliveLimit);
  }));
}
export function pickPack(packs,random=Math.random) {
  if(!packs.length)return null;
  let roll=random()*packs.reduce((sum,pack)=>sum+pack.weight,0);
  return packs.find(pack=>(roll-=pack.weight)<0)||packs.at(-1);
}
export function packPositions(view,count,random=Math.random,mapWorld=null) {
  // Reserve 40 units for sprite extent, and place the entire pack along an edge
  // (never radially toward the screen). All visible pixels stay >=120 outside.
  const origin=mapWorld?.spawnOutsideView(view,random,160)||spawnOutsideView(view,random,160),vertical=origin.x<view.x||origin.x>view.right;
  return Array.from({length:count},(_,i)=>({x:origin.x+(vertical?0:(i-(count-1)/2)*44),y:origin.y+(vertical?(i-(count-1)/2)*44:0)}));
}

export class SpawnDirector {
  constructor(scene,{random=Math.random,graphics=scene.add?.graphics?.(),choosePack}={}) {
    this.scene=scene;this.random=random;this.graphics=graphics?.setDepth?.(8)||graphics;
    this.nextPack=0;this.history=[];this.peakAlive=0;
    this.choosePack=choosePack||(packs=>pickPack(packs,this.random));
  }
  cap() {return aliveCap(this.scene.elapsed,this.scene.modeData.duration);}
  hasSpace(count=1) {return this.scene.enemies.countActive()+count<=this.cap();}
  update(dt) {
    const scene=this.scene;if(scene.ended||scene.pausedForChoice||scene.loadingRun)return;
    this.peakAlive=Math.max(this.peakAlive,scene.enemies.countActive());
    this.nextPack-=dt;
    if(this.nextPack<=0){
      const packs=eligiblePacks(scene.mapData.id,scene.heroData,scene.elapsed,this.cap()-scene.enemies.countActive(),scene.enemies.getChildren());
      const pack=this.choosePack(packs);
      if(pack){
        const positions=packPositions(worldView(scene),pack.members.length,this.random,scene.mapWorld);
        const spawned=pack.members.map((type,i)=>scene.spawnEnemy(type,null,{position:positions[i],emerge:true})).filter(Boolean);
        this.history.push({seconds:scene.elapsed,id:pack.id,count:spawned.length});
        // Bounded diagnostic history, not an ever-growing run log.
        if(this.history.length>128)this.history.shift();
      }
      this.nextPack=this.interval();
    }
    this.drawSpawns();
  }
  interval() {
    const progress=Math.min(1,this.scene.elapsed/this.scene.modeData.duration);
    return 7.6-progress*3.1;
  }
  drawSpawns() {
    const g=this.graphics;if(!g)return;g.clear();
    for(const enemy of this.scene.enemies.getChildren())if(enemy.active&&enemy.getData('spawningUntil')>this.scene.elapsed){
      const p=1-(enemy.getData('spawningUntil')-this.scene.elapsed)/.55,r=enemy.getData('radius')||16;
      enemy.setAlpha(Math.max(0,Math.min(1,p)));
      if(roster[enemy.getData('type')]?.flier){
        g.fillStyle(0x8ec5ff,(1-p)*.35).fillCircle(enemy.x,enemy.y,r*(1+p));
      }else{
        g.lineStyle(2,0xffcf4a,(1-p)*.8);
        for(let i=0;i<5;i++){const a=i*Math.PI*2/5;g.lineBetween(enemy.x,enemy.y,enemy.x+Math.cos(a)*r*(1+p),enemy.y+Math.sin(a)*r*(1+p));}
      }
    }else if(enemy.active&&enemy.getData('spawningUntil')){enemy.setAlpha(1);enemy.setData('spawningUntil',0);}
  }
  destroy() {this.graphics?.destroy();this.history.length=0;}
}
