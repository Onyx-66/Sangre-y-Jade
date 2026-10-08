// Validate before rendering: actual footprint bounds, cardinal land reachability,
// reserved rings, water coverage and explicit stair-chain access to every tier.
import {CELL,pointAt,indexAt,flood,inside,route} from './grid.js';
import {boundsOf,rectOverlap} from './structures.js';
export function navigation(w){
  const blocked=w.interior.map((v,i)=>!v||w.water.mask[i]===2&&!w.bridgeMask[i]?1:0);
  for(const o of w.objects){if(o.collider.type==='none')continue;const b=boundsOf(o);
    for(let row=Math.max(0,Math.floor((b.y-24+w.size.height/2)/CELL));row<=Math.min(w.rows-1,Math.floor((b.y+b.height+24+w.size.height/2)/CELL));row++)
      for(let col=Math.max(0,Math.floor((b.x-24+w.size.width/2)/CELL));col<=Math.min(w.columns-1,Math.floor((b.x+b.width+24+w.size.width/2)/CELL));col++)blocked[row*w.columns+col]=1;
  }return blocked;
}
export function validateWorld(w){
  const errors=[],blocked=navigation(w),seen=flood(w,blocked),free=blocked.filter(v=>!v).length;
  const connectivity=seen.reduce((a,b)=>a+b,0)/free,waterCoverage=w.water.mask.filter(Boolean).length/w.interior.filter(Boolean).length;
  if(connectivity<.9)errors.push(`connectivity ${connectivity}`);
  if(waterCoverage<.1||waterCoverage>.3)errors.push(`water ${waterCoverage}`);
  for(let i=0;i<w.objects.length;i++){
    const o=w.objects[i],b=boundsOf(o),c={x:b.x+b.width/2,y:b.y+b.height/2};
    if(Math.hypot(c.x,c.y)<600+Math.hypot(b.width,b.height)/2)errors.push(`arena ${o.worldId}`);
    if(!inside(w,{x:b.x,y:b.y})||!inside(w,{x:b.x+b.width,y:b.y+b.height}))errors.push(`bounds ${o.worldId}`);
    for(let j=i+1;j<w.objects.length;j++)if(rectOverlap(b,boundsOf(w.objects[j])))errors.push(`overlap ${o.worldId}`);
    if(w.water.mask[indexAt(w,o.x,o.y)]===2&&!['bridge','dock'].includes(o.kind))errors.push(`submerged ${o.worldId}`);
  }
  for(const site of w.sites){if(!seen[indexAt(w,site.x,site.y)])errors.push(`site ${site.id}`);if(site.kind==='settlement'&&(site.buildingCount<3||site.buildingCount>7))errors.push(`buildings ${site.id}`);}
  for(const stair of w.stairs){
    if(stair.fromLevel===0&&!seen[indexAt(w,stair.from.x,stair.from.y)])errors.push(`stairs ${stair.id}`);
    if(stair.fromLevel>0&&!w.stairs.some(s=>s.toLevel===stair.fromLevel&&Math.hypot(s.to.x-stair.from.x,s.to.y-stair.from.y)<2))errors.push(`tier ${stair.id}`);
  }
  if(w.water.mask.some((v,i)=>v&&Math.hypot(pointAt(w,i).x,pointAt(w,i).y)<600))errors.push('wet arena');
  return {valid:!errors.length,errors,connectivity,waterCoverage,blocked,seen};
}
export function pathToSite(w,site){const blocked=navigation(w);return route(w,indexAt(w,0,0),indexAt(w,site.x,site.y),i=>blocked[i]?Infinity:1);}
