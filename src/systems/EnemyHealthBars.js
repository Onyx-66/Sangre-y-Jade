import { worldView } from './Viewport.js';
import { AFFIX_NAMES } from './EnemyAffixes.js';
import { t, getLanguage } from '../i18n/index.js';
import { gameTextStyle } from '../ui/Typography.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function healthBarModel(enemy,{mode='damaged',seconds=0,view,zoom=1,chip}={}) {
  if(!enemy?.active||enemy.getData('buried')||enemy.getData('burrowing')||enemy.getData('isBoss')||mode==='off')return null;
  if(mode!=='always'&&!(enemy.getData('damagedUntil')>seconds||enemy.getData('targetedUntil')>seconds))return null;
  const radius=enemy.getData('radius')||16;
  if(view&&(enemy.x+radius<view.x||enemy.x-radius>view.right||enemy.y+radius<view.y||enemy.y-radius>view.bottom))return null;
  const maxHp=enemy.getData('maxHp'),hp=clamp(enemy.getData('hp')/maxHp,0,1),width=clamp(radius*2.2,28,64)/zoom;
  return {x:enemy.x-width/2,y:enemy.y-(enemy.displayHeight||radius*2)/2-9/zoom,width,height:4/zoom,hp,
    chip:Math.max(hp,chip??hp),shield:clamp(((enemy.getData('shield')||0)+(enemy.getData('wardUntil')>seconds?(enemy.getData('wardShield')||0):0))/(enemy.getData('maxShield')||40),0,1),
    affix:enemy.getData('affix')||null,border:enemy.getData('affix')?0xffcf4a:0x17121d,fill:0xd4484f};
}

export class EnemyHealthBars {
  constructor(scene,{graphics=scene.add?.graphics?.()}={}) {
    this.scene=scene;this.graphics=graphics?.setDepth?.(25)||graphics;
    this.chips=new Map();this.labels=[];this.models=[];
  }
  damage(enemy,beforeHp) {
    const serial=enemy.getData('serial'),now=this.scene.elapsed,max=enemy.getData('maxHp');
    const old=this.chips.get(serial),previous=old?this.chipAt(old,now):beforeHp/max;
    this.chips.set(serial,{from:Math.max(previous,beforeHp/max),to:clamp(enemy.getData('hp')/max,0,1),time:now});
    enemy.setData('damagedUntil',now+3);
  }
  chipAt(chip,now) {return chip.from+(chip.to-chip.from)*clamp((now-chip.time)/.4,0,1);}
  draw() {
    const {scene,graphics:g}=this,seconds=scene.elapsed,view=worldView(scene),zoom=scene.cameras?.main?.zoom||1;
    const activeSerials=new Set(),models=[];g?.clear();let labelCount=0;
    for(const enemy of scene.enemies.getChildren()){
      if(!enemy?.active)continue;
      const serial=enemy.getData('serial');activeSerials.add(serial);
      const chip=this.chips.get(serial);
      const bar=healthBarModel(enemy,{seconds,view,zoom,mode:scene.settings.enemyHealthBars||'damaged',chip:chip?this.chipAt(chip,seconds):undefined});
      if(!bar)continue;models.push(bar);
      if(g){
        const {x,y,width:w,height:h}=bar;
        g.fillStyle(0x251d29,1).fillRect(x,y,w,h);
        g.fillStyle(0xffffff,.9).fillRect(x,y,w*bar.chip,h);
        g.fillStyle(bar.fill,1).fillRect(x,y,w*bar.hp,h);
        if(bar.shield)g.fillStyle(0x8ec5ff,1).fillRect(x,y-h/2,w*bar.shield,h/2);
        g.lineStyle(1/zoom,bar.border,1).strokeRect(x,y,w,h);
        if(bar.affix)this.drawAffix(g,bar,x+w+5/zoom,y+h/2,3/zoom);
      }
      if(bar.affix&&scene.add?.text){
        let label=this.labels[labelCount++];
        const name=t(AFFIX_NAMES[bar.affix]);
        if(!label){label=scene.add.text(0,0,'',{...gameTextStyle(name,12),color:'#ffcf4a'}).setOrigin(.5,1).setDepth(25);this.labels.push(label);}
        label.setText(name).setPosition(enemy.x,bar.y-2/zoom).setVisible(true);
        label.setFontFamily(gameTextStyle(name,12).fontFamily).setFontSize(12/zoom);
        // Phaser uses RTL text only inside the label; health/shield fills are physical LTR.
        label.setRTL?.(getLanguage()==='ar');
      }
    }
    for(let i=labelCount;i<this.labels.length;i++)this.labels[i].setVisible(false);
    for(const serial of this.chips.keys())if(!activeSerials.has(serial))this.chips.delete(serial);
    this.models=models;return models;
  }
  drawAffix(g,bar,x,y,r) {
    g.lineStyle(r/2,0xffcf4a,1);g.fillStyle(0xffcf4a,1);
    if(bar.affix==='armored')g.strokeRect(x-r,y-r,r*2,r*2);
    else if(bar.affix==='swift'){g.lineBetween(x-r,y+r,x+r,y-r);g.lineBetween(x,y+r,x+2*r,y-r);}
    else if(bar.affix==='vampiric')g.fillTriangle(x-r,y-r,x+r,y-r,x,y+r);
    else if(bar.affix==='explosive'){for(let i=0;i<4;i++){const a=i*Math.PI/4;g.lineBetween(x-Math.cos(a)*r,y-Math.sin(a)*r,x+Math.cos(a)*r,y+Math.sin(a)*r);}}
    else g.strokeCircle(x,y,r);
  }
  destroy() {this.graphics?.destroy();this.labels.forEach(label=>label.destroy());this.labels.length=0;this.chips.clear();this.models=[];}
}
