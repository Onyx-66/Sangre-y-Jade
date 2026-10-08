// Structural acceptance uses actual collision geometry, not a self-reported flag.
// Doors remain closed in Training, but their exterior approaches must be usable.
import {SpatialHash} from '../../maps/SpatialHash.js';
import {shapeBounds,sweepMove,penetration} from '../geometry.js';
import {indexAt} from './grid.js';
export function contentSolids(w){return [...w.objects.flatMap(o=>o.solidParts?.map(collider=>({...o,collider}))||[o]).filter(o=>o.collider.type!=='none'),...w.assemblySolids];}
export function contentQuery(w){const hash=new SpatialHash(256);for(const [i,o]of contentSolids(w).entries())hash.insert(String(i),o,shapeBounds(o));return (p,r)=>hash.query({x:p.x-r,y:p.y-r,width:r*2,height:r*2});}
export function walkRoute(points,query,level=0){
 for(let i=1;i<points.length;i++){const p=sweepMove(points[i-1],points[i],11,query,level);if(Math.hypot(p.x-points[i].x,p.y-points[i].y)>.01)return false;}return true;
}
export function validateStructures(w){
 const errors=[],query=contentQuery(w);
 for(const site of w.sites){const path=w.paths.find(p=>p.to.x===site.x&&p.to.y===site.y);if(!path||!walkRoute([{x:0,y:0},...path.points,site],query))errors.push(`physical site ${site.id}`);}
 for(const o of w.objects.filter(o=>o.door)){
  const path=w.doorPaths.find(p=>p.owner===o.worldId);
  if(!path||!walkRoute(path.points,query)||path.points.some(p=>w.water.mask[indexAt(w,p.x,p.y)]&&!w.bridgeMask[indexAt(w,p.x,p.y)]))errors.push(`door ${o.worldId}`);
 }
 for(const site of w.sites.filter(s=>s.assembly)){
  const a=site.assembly,focus=w.objects.find(o=>o.worldId===site.topObject),surface=w.surfaces.find(s=>s.level===a.tiers);
  if(!focus||focus.level!==a.tiers||!surface||!penetration(focus,0,surface))errors.push(`empty top ${site.id}`);
  for(const stair of w.stairs){
   // Finish on the landing, not inside its focus prop or a terrace wall.
   if(query(stair.to,20).some(o=>(o.levels||[o.level||0]).includes(stair.toLevel)&&penetration(stair.to,11,o)))errors.push(`blocked landing ${stair.id}`);
  }
 }
 if(w.mapId==='bloodmoon'&&w.sites[0].assembly.faces.length!==2)errors.push('ritual stair faces');
 if(w.mapId==='cenote'){
  if(!w.sites.some(s=>s.kind==='island')||!w.bridgeMask.some(Boolean))errors.push('island bridge missing');
  for(const o of w.objects.filter(o=>o.role==='dock-house'))if(o.solidParts?.length!==4||!w.water.mask[indexAt(w,o.x,o.y)])errors.push(`stilts ${o.worldId}`);
 }
 return errors;
}
