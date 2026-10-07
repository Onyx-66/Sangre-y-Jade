/** Ground regions share the gameplay water geometry; banks never change speed. */
export function cenoteGroundRegions(zones) {
  return zones.flatMap((zone,index)=>[
    {...zone,id:`bank-${index}`,kind:'bank',tile:'sand-bank',radius:zone.radius+90},
    {...zone,id:`shore-${index}`,kind:'shore',tile:'wet-stone',radius:zone.radius+34},
    {...zone,id:`lake-${index}`,kind:'water',tile:'shallow-water'},
  ]);
}

export function createCenoteArt(scene,kit,layout) {
  const key=id=>`map-cenote-${id}`;
  if(!kit.artVersion||!scene.floor?.setTexture||!scene.add?.tileSprite||!scene.textures.exists(key('cave-floor')))return null;
  const objects=[],masks=[],shimmers=[];
  scene.floor.setTexture(key('cave-floor')).setDepth(backgroundDepth()).setTint(0x778a9b);
  const patch=(id,x,y,radius,depth,alpha,tint=0xffffff)=>{
    const sprite=scene.add.tileSprite(x,y,radius*2,radius*2,key(id)).setDepth(backgroundDepth(depth + 10000)).setAlpha(alpha).setTint(tint);
    const shape=scene.make.graphics({x,y,add:false});shape.fillStyle(0xffffff,1).fillCircle(0,0,radius);
    const mask=shape.createGeometryMask();sprite.setMask(mask);objects.push(sprite);masks.push(mask,shape);return sprite;
  };
  for(const region of layout.groundRegions){
    const depth=region.kind==='bank'?-9998:region.kind==='shore'?-9997:-9996;
    patch(region.tile,region.x,region.y,region.radius,depth,region.kind==='bank'?.42:.85,region.kind==='water'?0x628d94:0x7a8b95);
    if(region.kind==='water'){
      const shimmer=patch(region.tile,region.x,region.y,region.radius,-9995,.08,0x55e5c0).setBlendMode(1);
      shimmers.push(shimmer);
    }
  }
  patch('glow-moss',-1200,-1200,460,-9999,.25);
  patch('wet-stone',0,0,600,-9999,.32,0x708795);
  const dock=scene.add.tileSprite(1780,-320,640,112,key('wet-planks')).setDepth(backgroundDepth(6)).setTint(0x6e8091);objects.push(dock);
  // Four cached strips, not hundreds of additional colliding props.
  const wallKey='map-cenote-cave-wall';
  if(!scene.textures.exists(wallKey)){
    const texture=scene.textures.createCanvas(wallKey,512,400),context=texture.context;
    const sources=kit.boundaryTreeIds.map(id=>scene.textures.get(key(id)).getSourceImage());
    for(let row=0;row<3;row++)for(let col=-2;col<6;col++)context.drawImage(sources[(col+6+row)%sources.length],col*128+(row%2)*64,row*115-40,256,300);
    texture.refresh();
  }
  for(const [x,y,w,h,rotation]of [[0,-2200,6400,400,0],[0,2200,6400,400,Math.PI],[-3000,0,4800,400,-Math.PI/2],[3000,0,4800,400,Math.PI/2]])objects.push(scene.add.tileSprite(x,y,w,h,wallKey).setRotation(rotation).setDepth(backgroundDepth(11)).setTint(0x66758d));
  let destroyed=false;
  return {objects,handlesWater:true,update(time=0){
    if(destroyed)return;
    const reduced=scene.settings?.reducedMotion;
    for(let i=0;i<shimmers.length;i++){
      const sprite=shimmers[i];sprite.tilePositionX=reduced?0:Math.sin(time/4200+i)*5;sprite.tilePositionY=reduced?0:Math.cos(time/5100+i)*3;
      sprite.setAlpha(reduced ? .06 : .07+Math.sin(time/1600+i)*.025);
    }
  },destroy(){if(destroyed)return;destroyed=true;for(const object of objects)object.destroy();for(const mask of masks)mask.destroy();}};
}
import { backgroundDepth } from '../render/layers.js';
