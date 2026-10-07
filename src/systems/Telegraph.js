const TAU=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));
import { effectDepth } from '../render/layers.js';

export function telegraphContains(warning,point) {
  const dx=point.x-warning.x,dy=point.y-warning.y,r=Math.hypot(dx,dy);
  if(warning.shape==='circle')return r<=warning.radius;
  if(warning.shape==='ring')return r<=warning.radius&&r>=warning.innerRadius;
  const c=Math.cos(warning.angle),s=Math.sin(warning.angle),along=dx*c+dy*s,across=-dx*s+dy*c;
  if(warning.shape==='line')return along>=0&&along<=warning.length&&Math.abs(across)<=warning.width/2;
  return r<=warning.radius&&Math.cos(Math.atan2(dy,dx)-warning.angle)>=Math.cos(warning.arc/2);
}

function polygon(w,p=1) {
  if(w.shape==='line'){
    const c=Math.cos(w.angle),s=Math.sin(w.angle),length=w.length*p,h=w.width/2;
    return [[0,-h],[length,-h],[length,h],[0,h]].map(([x,y])=>({x:w.x+x*c-y*s,y:w.y+x*s+y*c}));
  }
  const cone=w.shape==='cone',arc=cone?w.arc:TAU,start=cone?w.angle-arc/2:0;
  const points=Array.from({length:33},(_,i)=>({x:w.x+Math.cos(start+arc*i/32)*w.radius*p,y:w.y+Math.sin(start+arc*i/32)*w.radius*p}));
  return cone?[{x:w.x,y:w.y},...points]:points;
}
function dashed(g,points,unit) {
  let offset=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b.x-a.x,b.y-a.y);
    if(!length)continue;
    for(let d=0;d<length;){const phase=(offset+d)%(unit*2),end=Math.min(length,d+unit-(phase%unit));
      if(phase<unit)g.lineBetween(a.x+(b.x-a.x)*d/length,a.y+(b.y-a.y)*d/length,a.x+(b.x-a.x)*end/length,a.y+(b.y-a.y)*end/length);
      d=end+1e-8;
    }offset+=length;
  }
}

// All warnings share one Graphics batch. Records, not GameObjects, are pooled.
export class Telegraph {
  constructor(scene,{graphics=scene.add?.graphics?.(),sound=(warning)=>warning.sound!==false&&scene.audio?.sfx(warning.sound||'boss',.04),capacity=64}={}) {
    this.scene=scene;this.graphics=graphics?.setDepth?.(effectDepth(0,5))||graphics;this.sound=sound;
    this.capacity=capacity;this.live=new Set();this.free=[];this.destroyed=false;this.serial=0;
  }
  play(options) {
    if(this.destroyed||this.scene.ended||this.scene.pausedForChoice||this.live.size>=this.capacity)return null;
    const shape=options.shape||'circle';
    if(!['circle','ring','line','cone'].includes(shape))throw Error(`Unknown telegraph shape: ${shape}`);
    const record=this.free.pop()||{};
    Object.assign(record,{x:0,y:0,angle:0,radius:60,innerRadius:40,length:170,width:32,arc:Math.PI/2,
      windup:.5,age:0,progress:0,bornAt:null,owner:null,follow:null,color:0xd4484f,outlineColor:0xff5963,tag:null,sound:'boss',onResolve:null,onCancel:null,onUpdate:null,safeCircles:null,safeAngles:null,gapWidth:0},options,{shape,serial:++this.serial});
    record.windup=Math.max(.001,record.windup);record.ownerSerial=record.owner?.getData?.('serial');
    record.followSerial=record.follow?.getData?.('serial');
    this.live.add(record);this.sound?.(record);return record;
  }
  has(owner,tag) {return [...this.live].some(w=>w.owner===owner&&w.ownerSerial===owner.getData?.('serial')&&(!tag||w.tag===tag));}
  release(record,cancelled=false) {
    if(!this.live.delete(record))return;
    const callback=cancelled?record.onCancel:record.onResolve;
    // No pooled entry may retain a sprite/closure beyond its warning lifetime.
    const snapshot={...record};record.owner=record.follow=record.onResolve=record.onCancel=record.onUpdate=record.safeCircles=record.safeAngles=null;
    this.free.push(record);callback?.(snapshot);
  }
  cancelOwner(owner) {for(const w of [...this.live])if(w.owner===owner)this.release(w,true);this.draw();}
  cancelAll() {for(const w of [...this.live])this.release(w,true);this.graphics?.clear();}
  update(dt) {
    if(this.destroyed)return;
    if(this.scene.ended){this.cancelAll();return;}
    if(this.scene.pausedForChoice||this.scene.loadingRun)return;
    for(const w of [...this.live]){
      if(w.owner&&(!w.owner.active||w.owner.getData?.('serial')!==w.ownerSerial||(w.owner.getData?.('stunUntil')||0)>this.scene.elapsed)) {this.release(w,true);continue;}
      if(w.follow){if(!w.follow.active||w.follow.getData?.('serial')!==w.followSerial){this.release(w,true);continue;}w.x=w.follow.x;w.y=w.follow.y;}
      const seconds=w.bornAt===null?dt:Math.min(dt,Math.max(0,this.scene.elapsed-w.bornAt));
      w.age+=Math.max(0,seconds);w.progress=w.bornAt!==null&&w.age+1e-9>=w.windup?1:clamp(w.age/w.windup);
      w.onUpdate?.(w);
      if(w.progress>=1){this.release(w);if(this.scene.ended||this.scene.pausedForChoice)break;}
    }
    this.draw();
  }
  draw() {
    const g=this.graphics;if(!g||this.destroyed)return;g.clear();
    const zoom=this.scene.cameras?.main?.zoom||1;
    for(const w of this.live){
      const outline=polygon(w),fill=polygon(w,w.progress);
      if(w.shape==='ring'){
        g.lineStyle(Math.max(1,w.radius-w.innerRadius),w.color,.25);
        const r=(w.radius+w.innerRadius)/2;g.beginPath();g.arc(w.x,w.y,r,-Math.PI/2,-Math.PI/2+TAU*w.progress);g.strokePath();
      }else {g.fillStyle(w.color,.25);g.fillPoints(fill,true);}
      g.lineStyle((this.scene.settings?.telegraphHighContrast?4:2)/zoom,w.outlineColor,1);dashed(g,outline,6/zoom);
      if(w.shape==='ring')dashed(g,polygon({...w,radius:w.innerRadius}),6/zoom);
      for(const circle of w.safeCircles||[]){g.fillStyle(0x3de0b0,.18).fillCircle(circle.x,circle.y,circle.radius);g.lineStyle(3/zoom,0xe8fff6,1);dashed(g,polygon({...circle,shape:'circle'}),8/zoom);}
      for(const angle of w.safeAngles||[]){const wedge=polygon({...w,shape:'cone',angle,arc:w.gapWidth});g.fillStyle(0x3de0b0,.32).fillPoints(wedge,true);g.lineStyle(2/zoom,0xe8fff6,1);dashed(g,wedge,8/zoom);}
    }
  }
  destroy() {if(this.destroyed)return;this.cancelAll();this.destroyed=true;this.graphics?.destroy();this.free.length=0;}
}
