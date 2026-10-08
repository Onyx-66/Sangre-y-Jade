// Bounded procedural ripples, foam and bubbles. Ground marks remain in the
// world band; no water overlay or mask can obscure actors or warning telegraphs.
import { backgroundDepth } from '../render/layers.js';
export class WaterEffects {
  constructor(scene){this.scene=scene;this.pool=[];this.g=scene.add?.graphics?.().setDepth(backgroundDepth(40));this.zones=scene.add?.graphics?.().setDepth(backgroundDepth(25));}
  get cap(){return this.scene.settings?.reduceEffects||this.scene.settings?.reducedMotion?8:({low:20,medium:40,high:64}[this.scene.settings?.particles]||40);}
  emit(x,y,kind='ripple'){
    if(this.scene.settings?.reduceEffects&&kind==='foam')return;
    let p=this.pool.find(p=>p.life<=0);if(!p&&this.pool.length<this.cap){p={};this.pool.push(p);}if(!p)return;
    Object.assign(p,{x,y,kind,life:kind==='bubble'?.8:.55,total:kind==='bubble'?.8:.55});
  }
  update(dt){
    const g=this.g;if(!g)return;g.clear();for(const p of this.pool.splice(this.cap))p.image?.destroy();
    for(const p of this.pool){if(p.life<=0){p.image?.setVisible(false);continue;}p.life-=dt;const t=1-p.life/p.total;
      const r=p.kind==='large'?8+26*t:p.kind==='bubble'?2+2*t:3+15*t;
      const id=p.kind==='bubble'?'bubbles':p.kind==='large'?'splash-burst':p.kind==='foam'?'foam-edge':'ripple-ring',map=this.scene.mapData?.id,key=`map-${map}-${id}`;
      if(['overgrown','bloodmoon','cenote'].includes(map)&&this.scene.textures?.exists?.(key)){
        p.image ||= this.scene.add.image(p.x,p.y,key).setDepth(backgroundDepth(40));
        p.image.setTexture(key).setPosition(p.x,p.y-(p.kind==='bubble'?t*30:0)).setDisplaySize(r*3,r*2).setAlpha(Math.max(0,1-t)*.65).setVisible(true);continue;
      }
      g.lineStyle(p.kind==='tick'?3:1,p.kind==='tick'?0xff7676:0x9be7ff,Math.max(0,1-t)*.65).strokeEllipse(p.x,p.y-(p.kind==='bubble'?t*30:0),r*2,r);
    }
  }
  drawZones(grid,debug=false){const g=this.zones;if(!g)return;g.clear();
    for(const z of grid.zones){const deep=z.kind==='deep';
      // Four inset washes soften the visible shoreline without extending the
      // physical mask into a dry cell or changing where breath begins.
      for(let edge=0;edge<4;edge++){const inset=edge*4;g.fillStyle(deep?0x102c49:0x358d9c,deep?.07:.03);
        if(z.radius!==undefined)g.fillCircle(z.x,z.y,Math.max(1,z.radius-inset));else g.fillRect(z.x-z.width/2+inset,z.y-z.height/2+inset,Math.max(1,z.width-inset*2),Math.max(1,z.height-inset*2));}
      if(debug){g.lineStyle(2,deep?0x5555ff:0x55ffff,.8);if(z.radius!==undefined)g.strokeCircle(z.x,z.y,z.radius);else g.strokeRect(z.x-z.width/2,z.y-z.height/2,z.width,z.height);
        g.lineBetween(z.x,z.y,z.x+z.flow.x*60,z.y+z.flow.y*60);g.strokeCircle(z.x+z.flow.x*60,z.y+z.flow.y*60,4);}}
  }
  destroy(){for(const p of this.pool)p.image?.destroy();this.g?.destroy();this.zones?.destroy();this.pool.length=0;}
}
