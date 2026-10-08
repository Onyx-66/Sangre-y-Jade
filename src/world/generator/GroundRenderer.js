// Finite masked ground: one batched graphic, no scrolling tileSprite loop.
// Palette regions and bridge decks mirror physics. Raised structures expose
// their stair strips with procedural catalog-piece placeholders.
import {backgroundDepth} from '../../render/layers.js';
import {CELL,pointAt} from './grid.js';
export class GroundRenderer{
  constructor(scene,layout){
    this.handlesWater=true;this.objects=[];const g=scene.add?.graphics?.().setDepth(backgroundDepth());if(!g)return;this.objects.push(g);
    const w=layout.worldData,palette={overgrown:[0x173f31,0x204936,0x294739],bloodmoon:[0x201c2c,0x302432,0x382a32],cenote:[0x101d2b,0x183044,0x26364b]}[w.mapId];
    for(let i=0;i<w.interior.length;i++){
      const p=pointAt(w,i),wet=w.water.mask[i],bridge=w.bridgeMask[i];
      const color=!w.interior[i]?0x0b151a:bridge?0x756750:wet===2?0x183c51:wet?0x275966:w.roadMask[i]?0x4b4940:palette[w.biomes[i]];
      g.fillStyle(color,1).fillRect(p.x-CELL/2,p.y-CELL/2,CELL,CELL);
      if(!w.interior[i]){
        // Natural wall silhouettes occupy only the impassable boundary band.
        if(w.mapId==='overgrown')g.fillStyle(0x142f24,.9).fillCircle(p.x,p.y,58);
        else g.lineStyle(5,w.mapId==='cenote'?0x273748:0x392b36,.8).lineBetween(p.x-50,p.y+30,p.x-18,p.y-40).lineBetween(p.x-18,p.y-40,p.x+48,p.y+20);
      }
      if(bridge)for(let n=0;n<8;n++)g.lineStyle(2,0x29251e,.5).lineBetween(p.x-CELL/2,p.y-CELL/2+n*16,p.x+CELL/2,p.y-CELL/2+n*16);
      // Small disconnected pockets are scenery, never sites or spawn land.
      if(w.interior[i]&&!wet&&!w.blocked[i]&&!w.reachable[i])g.fillStyle(palette[2],.8).fillCircle(p.x,p.y,46);
    }
    // Settlements keep an open plaza inside their ring of 3–7 buildings.
    for(const site of w.sites.filter(s=>s.kind==='settlement'))g.fillStyle(0x625b4a,.65).fillCircle(site.x,site.y,96);
    // Surface art stays below actors; edge wall colliders and stairs are real.
    for(const site of w.sites.filter(s=>s.assembly)){
      const a=site.assembly;g.fillStyle(0x656252,1).fillRect(a.x-a.width/2,a.y-a.width/2,a.width,a.width);
      for(const surface of w.surfaces)g.lineStyle(4,0xb29b64,1).strokeRect(surface.x-surface.size.width/2,surface.y-surface.size.height/2,surface.size.width,surface.size.height);
      for(const stair of w.stairs)for(let n=0;n<5;n++){const y=stair.from.y+(stair.to.y-stair.from.y)*n/5;g.lineStyle(3,0xd0b980,1).lineBetween(stair.from.x-stair.width/2,y,stair.from.x+stair.width/2,y);}
    }
  }
  update(){}
  destroy(){for(const o of this.objects)o.destroy();this.objects=[];}
}
