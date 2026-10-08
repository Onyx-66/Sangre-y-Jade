// Split existing tall art without new assets. Only roof/canopy pixels fade;
// solid bases keep their opacity and sort by footprint, not image centre.
import { overheadDepth, worldDepth, footprintBaseY, objectBaseY } from '../render/layers.js';
export class Overhead {
  constructor(scene){this.scene=scene;this.parts=new Map();this.pool=[];this.doors=new Map();this.doorPool=[];}
  attach(item,base){
    this.detach(base);base.setCrop?.();
    if(item.door?.closed&&this.scene.add.graphics){
      const door=this.doorPool.pop()||this.scene.add.graphics(),s=item.scale||1;
      const w=(item.door.width||34)*s,h=(item.door.height||62)*s;
      // 62px door / 48px visible hero ~= 1.3; walls remain authored art.
      door.clear().setPosition(item.x+item.door.x*s,item.y+item.door.y*s)
        .setDepth(worldDepth(footprintBaseY(item),.002)).setActive(true).setVisible(true);
      door.fillStyle(0x241e1c,1).fillRect(-w/2,-h,w,h).lineStyle(2,0x8b7450,1).strokeRect(-w/2,-h,w,h);
      for(let x=-w/2+8;x<w/2;x+=8)door.lineBetween(x,-h,x,0);
      this.doors.set(base,door);
    }
    if(!item.overhead||!base.setCrop||!base.frame)return;
    const width=base.frame.realWidth,height=base.frame.realHeight,split=Math.round(height*item.overhead.cropRatio);
    const image=this.pool.pop()||this.scene.add.image(item.x,item.y,base.texture.key);
    image.setTexture(base.texture.key).setPosition(item.x,item.y).setOrigin(item.anchor.x,item.anchor.y)
      .setDisplaySize(item.size.width,item.size.height).setFlipX(item.flipX||false).setActive(true).setVisible(true);
    image.setTint?.(item.tint??0xffffff);
    base.setCrop(0,split,width,height-split);image.setCrop(0,0,width,split);
    image.setData('worldOverhead',true);
    this.parts.set(base,{item,image});
  }
  update(actors){
    for(const [base,{item,image}]of this.parts){
      const y=footprintBaseY(item),o=item.occluder,s=item.scale||1;
      const behind=actors.some(actor=>{
        if(objectBaseY(actor)>=y)return false;
        const w=actor.displayWidth||32,h=actor.displayHeight||48;
        const x=actor.x-w*(actor.originX??.5),ay=actor.y-h*(actor.originY??.5);
        return o&&x<item.x+(o.x+o.width)*s&&x+w>item.x+o.x*s&&ay<item.y+(o.y+o.height)*s&&ay+h>item.y+o.y*s;
      });
      base.setAlpha(1);image.setAlpha(behind?.55:1).setDepth(behind?overheadDepth(y):worldDepth(y,.001));
    }
  }
  detach(base){const door=this.doors.get(base);if(door){door.setActive(false).setVisible(false);this.doorPool.push(door);this.doors.delete(base);}const entry=this.parts.get(base);if(!entry)return;entry.image.setActive(false).setVisible(false);this.pool.push(entry.image);this.parts.delete(base);}
  destroy(){for(const door of [...this.doors.values(),...this.doorPool])door.destroy();this.doors.clear();this.doorPool.length=0;for(const {image} of this.parts.values())image.destroy();for(const image of this.pool)image.destroy();this.parts.clear();this.pool.length=0;}
}
