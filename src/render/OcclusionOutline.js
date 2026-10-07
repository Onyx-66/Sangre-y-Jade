// A two-source-pixel contour derived from the current actor alpha mask. It
// reveals the actor behind solid art without drawing a box or changing alpha.
export class OcclusionOutline {
  constructor(scene,depth){this.scene=scene;this.depth=depth;this.keys=new Set();}
  texture(actor){
    const frame=actor.frame,source=actor.texture?.getSourceImage?.();
    if(!frame||!source||!this.scene.textures?.createCanvas)return null;
    const key=`occlusion-outline-${actor.texture.key}-${frame.name}`;
    if(this.scene.textures.exists(key))return key;
    const width=frame.cutWidth,height=frame.cutHeight;
    const texture=this.scene.textures.createCanvas(key,width,height),ctx=texture.getContext();
    ctx.drawImage(source,frame.cutX,frame.cutY,width,height,0,0,width,height);
    const original=ctx.getImageData(0,0,width,height),outline=ctx.createImageData(width,height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;if(original.data[i+3]>32)continue;
      let edge=false;
      for(let dy=-2;dy<=2&&!edge;dy++)for(let dx=-2;dx<=2;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        if(original.data[(ny*width+nx)*4+3]>32){edge=true;break;}
      }
      if(edge){outline.data[i]=255;outline.data[i+1]=255;outline.data[i+2]=255;outline.data[i+3]=230;}
    }
    ctx.putImageData(outline,0,0);texture.refresh();this.keys.add(key);return key;
  }
  show(actor){
    const key=this.texture(actor);if(!key)return false;
    this.sprite ||= this.scene.add.image(actor.x,actor.y,key).setDepth(this.depth).setData('skipOcclusion',true);
    this.sprite.setTexture(key).setPosition(actor.x,actor.y).setOrigin(actor.originX,actor.originY)
      .setScale(actor.scaleX,actor.scaleY).setRotation(actor.rotation).setFlip(actor.flipX,actor.flipY)
      .setTint(actor.tintFill?actor.tintTopLeft:0x9be7ff).setVisible(true);
    return true;
  }
  hide(){this.sprite?.setVisible(false);}
  destroy(){this.sprite?.destroy();for(const key of this.keys)this.scene.textures.remove(key);this.keys.clear();}
}
