// B6/B7 finite-world art: camera-local terrain sprites, four-frame water, and
// assembler-aligned pieces. All surfaces stay below feet and combat warnings.
import {backgroundDepth} from '../../render/layers.js';
import {CELL,pointAt,indexAt} from './grid.js';
import overgrown from '../../data/mapKits/overgrown.json' with {type:'json'};
import bloodmoon from '../../data/mapKits/bloodmoon.json' with {type:'json'};
export const TERRAIN_SPRITE_CAP=320;
export function groundArtId(w,i,frame=0){
 const night=w.mapId==='bloodmoon';
 if(w.bridgeMask[i])return night?'charred-wood':'wet-planks';
 if(w.water.mask[i])return `water-${w.water.mask[i]===2?'deep':'shallow'}-${frame}`;
 if(w.sites.some(s=>s.kind==='settlement'&&Math.hypot(pointAt(w,i).x-s.x,pointAt(w,i).y-s.y)<160))return night?'ritual-floor':'cobble-plaza';
 if(w.roadMask[i])return night?'dark-dirt':'dirt-path';
 return (night?['ash-ground','blood-stained','cracked-stone']:['moss-grass','dry-grass','jungle-floor'])[w.biomes[i]];
}
export function stairArtId(stair){const dx=stair.to.x-stair.from.x,dy=stair.to.y-stair.from.y;return `stairs-stone-${Math.abs(dx)>Math.abs(dy)?dx>0?'e':'w':dy>0?'s':'n'}`;}
// A continuous staircase spans the assembler's consecutive tier strips.
export function stairRuns(stairs){
 const runs=new Map();for(const s of stairs){const key=s.id.replace(/-stairs-\d+-/,'-stairs-');const run=runs.get(key);if(!run)runs.set(key,{...s});else if(s.toLevel>run.toLevel){run.to=s.to;run.toLevel=s.toLevel;}}
 return [...runs.values()];
}
export class WorldArt{
 constructor(scene,w){this.scene=scene;this.w=w;this.kit=w.mapId==='bloodmoon'?bloodmoon:overgrown;this.pool=[];this.objects=[];this.last='';this.drawStructures();}
 key(id){return `map-${this.w.mapId||'overgrown'}-${id}`;}
 image(id,x,y,width,height,order=3){
  // Never ship a known ambiguous direction over authoritative stair geometry.
  if(this.kit.structureArt?.find(item=>item.id===id)?.approved===false)return null;
  const key=this.key(id);if(!this.scene.textures.exists(key))return null;
  const bounds=this.kit.structureArt?.find(item=>item.id===id)?.artBounds,texture=this.scene.textures.get?.(key);
  if(bounds&&texture&&!texture.has('base-bounds'))texture.add('base-bounds',0,bounds.x,bounds.y,bounds.width,bounds.height);
  const image=this.scene.add.image(x,y,key,bounds&&texture?'base-bounds':undefined).setDisplaySize(width,height).setDepth(backgroundDepth(order));this.objects.push(image);return image;
 }
 drawStructures(){
  const {w}=this;
  for(const site of w.sites.filter(s=>s.assembly)){
   const surfaces=w.surfaces.filter(s=>s.id.startsWith(site.id));
   for(const [i,s]of surfaces.entries())this.image(`pyramid-tier-${'abc'[i]}`,s.x,s.y,s.size.width*1.06,s.size.height*1.06,3+i*.1);
  }
  for(const s of stairRuns(w.stairs)){const vertical=s.from.x===s.to.x,len=Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y);
   if(!this.image(stairArtId(s),(s.from.x+s.to.x)/2,(s.from.y+s.to.y)/2,vertical?s.width:len,vertical?len:s.width,4))this.stairFallback(s);
  }
  // Rail colliders remain authoritative. Art decks occupy only real wet cells.
  for(let i=0;i<w.bridgeMask.length;i++)if(w.bridgeMask[i]){const p=pointAt(w,i),vertical=Boolean(w.bridgeMask[indexAt(w,p.x,p.y-CELL)]||w.bridgeMask[indexAt(w,p.x,p.y+CELL)]);
   this.image(vertical?'bridge-v':'bridge-h',p.x,p.y,CELL,CELL,3);
  }
  const g=this.scene.add.graphics().setDepth(backgroundDepth(2));this.objects.push(g);
  for(const p of w.doorPaths)for(let i=1;i<p.points.length;i++)g.lineStyle(32,0x78613b,.75).lineBetween(p.points[i-1].x,p.points[i-1].y,p.points[i].x,p.points[i].y);
 }
 stairFallback(s){
  const g=this.scene.add.graphics().setDepth(backgroundDepth(4)),vertical=s.from.x===s.to.x;this.objects.push(g);
  for(let n=0;n<=15;n++){const x=s.from.x+(s.to.x-s.from.x)*n/15,y=s.from.y+(s.to.y-s.from.y)*n/15;
   g.lineStyle(3,0xd0b980,1).lineBetween(x-(vertical?s.width/2:0),y-(vertical?0:s.width/2),x+(vertical?s.width/2:0),y+(vertical?0:s.width/2));}
 }
 update(now){
  const view=this.scene.mapWorld?.worldView?.()||this.scene.cameras.main.worldView;if(!view)return;
  const frame=this.scene.settings?.reducedMotion?0:Math.floor(now/180)%4;
  const left=Math.max(0,Math.floor((view.x+this.w.size.width/2)/CELL)-1),top=Math.max(0,Math.floor((view.y+this.w.size.height/2)/CELL)-1);
  const right=Math.min(this.w.columns-1,Math.ceil((view.x+view.width+this.w.size.width/2)/CELL)+1),bottom=Math.min(this.w.rows-1,Math.ceil((view.y+view.height+this.w.size.height/2)/CELL)+1);
  const signature=[left,top,right,bottom,frame].join(':');if(signature===this.last)return;this.last=signature;let n=0;
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   const i=y*this.w.columns+x;if(!this.w.interior[i]||this.w.bridgeMask[i]||n>=TERRAIN_SPRITE_CAP)continue;
   const key=this.key(groundArtId(this.w,i,frame));if(!this.scene.textures.exists(key))continue;
   const p=pointAt(this.w,i),image=this.pool[n]||(this.pool[n]=this.scene.add.image(p.x,p.y,key).setDepth(backgroundDepth(1)));
   const tint=this.w.mapId==='bloodmoon'?(this.w.water.mask[i]?0x887b8b:0x847680):(this.w.water.mask[i]?0xc0d4b0:0x889977);
   // Transparent night tiles must not overlap: double alpha makes grid seams.
   const extent=this.w.mapId==='bloodmoon'?CELL:CELL+.5;
   image.setTexture(key).setPosition(p.x,p.y).setDisplaySize(extent,extent).setAlpha(.72).setTint(tint).setVisible(true);n++;
  }
  for(let i=n;i<this.pool.length;i++)this.pool[i].setVisible(false);
 }
 destroy(){for(const image of [...this.pool,...this.objects])image.destroy();this.pool.length=0;this.objects.length=0;}
}
