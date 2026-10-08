import { MAP_KITS } from '../data/mapDefinitions.js';
import { createCenoteArt } from './CenoteArt.js';
import { backgroundDepth } from '../render/layers.js';

export function mapArtManifest(map) {
  const kit = map?.kit || MAP_KITS[typeof map === 'string' ? map : map?.id];
  if (!kit?.artVersion) return [];
  return [...(kit.ground || []), ...(kit.glows || []), ...(kit.waterArt || []), ...(kit.structureArt || []), ...kit.items].filter(item => item.image)
    .map(item => ({ key: item.textureKey, file: item.image }));
}

/** A few tiled surfaces, independent of map area; props still use the cell pool. */
export function createMapArt(scene, kit, layout) {
  if(kit.id==='cenote')return createCenoteArt(scene,kit,layout);
  const objects = [], masks = [];
  const key = id => `map-${kit.id}-${id}`;
  if (!kit.artVersion || !scene.floor?.setTexture || !scene.add?.tileSprite || !scene.textures.exists(key('moss-grass'))) return null;
  // Ground must be below y-sorted props/actors even in the negative-y half of the finite world.
  scene.floor.setTexture(key('moss-grass')).setDepth(backgroundDepth()).setTint(0x829b83);
  const tile = (id,x,y,width,height,depth,alpha=1) => {
    const sprite=scene.add.tileSprite(x,y,width,height,key(id)).setDepth(backgroundDepth(depth + 10000)).setAlpha(alpha).setTint(0x9aaa90);
    objects.push(sprite); return sprite;
  };
  const softPatch = (id,x,y,w,h,alpha) => {
    // Low-alpha oval patches keep the ground subordinate to combat silhouettes.
    const sprite=tile(id,x,y,w,h,-9998,alpha), shape=scene.make.graphics({x,y,add:false});
    shape.fillStyle(0xffffff,1).fillEllipse(0,0,w,h);
    const mask=shape.createGeometryMask();sprite.setMask(mask);masks.push(mask,shape);
  };
  tile('dirt-path',0,0,5600,220,-9997,.60);
  tile('dirt-path',0,0,220,4000,-9997,.60);
  softPatch('cobble-plaza',0,0,1050,880,.52);
  softPatch('dry-grass',-1700,1050,900,600,.35);
  softPatch('mud',1700,-900,620,460,.44);
  softPatch('jungle-floor',-1600,-1400,960,640,.38);
  softPatch('jungle-floor',1900,1350,960,640,.38);

  // Bake a tileable canopy strip from the actual tree art. Four fixed sprites
  // frame the 400px impassable wall without populating hundreds of wall actors.
  const wallKey=`map-${kit.id}-canopy-wall`;
  if (!scene.textures.exists(wallKey)) {
    const texture=scene.textures.createCanvas(wallKey,512,400), context=texture.context;
    const trees=kit.boundaryTreeIds.map(id=>scene.textures.get(key(id)).getSourceImage());
    for(let row=0;row<3;row++)for(let col=-2;col<6;col++){
      const image=trees[((col+6)+row)%trees.length], size=220+(col+row+8)%3*18;
      context.drawImage(image,col*128+(row%2)*64,row*115-40,size,size);
    }
    texture.refresh();
  }
  for(const [x,y,w,h,rotation] of [[0,-2200,6400,400,0],[0,2200,6400,400,Math.PI],[-3000,0,4800,400,-Math.PI/2],[3000,0,4800,400,Math.PI/2]]){
    const wall=scene.add.tileSprite(x,y,w,h,wallKey).setRotation(rotation).setDepth(backgroundDepth(11)).setTint(0x749573);
    objects.push(wall);
  }
  return { objects, destroy(){for(const object of objects)object.destroy();for(const mask of masks)mask.destroy();} };
}
