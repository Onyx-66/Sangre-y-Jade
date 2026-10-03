// Compatibility placeholder runtime: final stills/recipes are supplied in later steps.
export function placeholderStyle(id) {
  let hash=2166136261;
  for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return { sides:3+hash%6, rotation:(hash%360)*Math.PI/180, color:0x404040|(hash&0xbfbfbf) };
}
export class FxDirector {
  constructor(scene) { this.scene=scene;this.live=[];this.missing=new Set(); }
  play(id,stage,{x=0,y=0,angle=0,scale=1,tint,duration=.4,target}={}) {
    const scene=this.scene,key=`skill-placeholder-${id}`,style=placeholderStyle(id);
    if(!scene.textures.exists(key)){
      const g=scene.add.graphics(),points=[];
      for(let i=0;i<style.sides;i++){const a=style.rotation+i/style.sides*Math.PI*2;points.push({x:48+Math.cos(a)*36,y:48+Math.sin(a)*36});}
      g.lineStyle(4,style.color,1).strokePoints(points,true).fillStyle(style.color,.2).fillCircle(48,48,22);
      g.generateTexture(key,96,96);g.destroy();
    }
    const missing=`fx/${id}/${stage==='proc'?'proc':'main'}.png`;
    if(!this.missing.has(missing)){this.missing.add(missing);console.warn(`[skills] Placeholder: ${missing}`);}
    this.live=this.live.filter(sprite=>sprite.active);
    while(this.live.length>=24)this.live.shift().destroy();
    const sprite=scene.add.image(target?.x??x,target?.y??y,key).setDepth(stage==='ground'?8:23).setRotation(angle).setScale(scale).setAlpha(.8);
    if(tint!==undefined)sprite.setTint(tint);
    this.live.push(sprite);
    scene.tweens.add({targets:sprite,scale:scale*1.6,alpha:0,duration:duration*1000,onComplete:()=>sprite.destroy()});
    return sprite;
  }
  destroy() { this.live.forEach(sprite=>sprite.destroy());this.live=[]; }
}
