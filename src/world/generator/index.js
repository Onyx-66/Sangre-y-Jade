// Serializable seeded WorldData pipeline. Eight derived retries maximum; only
// validated worlds leave this module. Workers and tests use the exact same code.
import {hashSeed,normalizeSeed} from '../seed.js';
import {WIDTH,HEIGHT,WALL,CELL,pointAt} from './grid.js';
import {fields,water,biomes} from './terrain.js';
import {sites,roads,structures,vegetation} from './structures.js';
import {validateWorld} from './validate.js';
import {MAP_KITS,MAP_DESIGN} from '../../data/mapDefinitions.js';
export function* worldPipeline(mapId,seed,kit=MAP_KITS[mapId]){
  const text=normalizeSeed(seed);let failures=[];
  for(let attempt=0;attempt<8;attempt++){
    const w={version:1,mapId,seed:text,seedHash:hashSeed(text),derivedSeed:hashSeed(text,`${mapId}:retry:${attempt}`),attempt,
      size:{width:WIDTH,height:HEIGHT},columns:WIDTH/CELL,rows:HEIGHT/CELL,bounds:{left:-WIDTH/2+WALL,right:WIDTH/2-WALL,top:-HEIGHT/2+WALL,bottom:HEIGHT/2-WALL},bossArenas:[{x:0,y:0,radius:600}],start:{x:0,y:0}};
    try{
      fields(w);yield {phase:'fields',progress:.1};water(w);yield {phase:'water',progress:.2};biomes(w,MAP_DESIGN[mapId]);yield {phase:'biomes',progress:.3};
      sites(w);yield {phase:'sites',progress:.4};roads(w);yield {phase:'roads',progress:.5};structures(w,kit);yield {phase:'structures',progress:.6};
      const structuralCount=w.objects.length;vegetation(w,kit);yield {phase:'vegetation',progress:.75};
      w.boundary={thickness:WALL,style:kit.wallStyle};w.levelMap=w.surfaces.map(s=>({...s}));yield {phase:'boundary',progress:.8};
      let result=validateWorld(w);w.removedBlockers=0;
      // Remove only generated vegetation/debris when it seals land pockets.
      // Structures are retained; the repaired physical world is revalidated.
      while(result.connectivity<.95&&w.objects.length>structuralCount){const n=Math.min(8,w.objects.length-structuralCount);w.objects.splice(-n);w.removedBlockers+=n;result=validateWorld(w);}
      if(!result.valid)throw Error(result.errors.join(';'));
      // Unreachable land pockets cannot accept entities or streaming props.
      w.blocked=result.blocked;w.reachable=Array.from(result.seen);w.validation={connectivity:result.connectivity,waterCoverage:result.waterCoverage};
      w.objects=w.objects.filter(o=>result.seen[Math.floor((o.y+HEIGHT/2)/CELL)*w.columns+Math.floor((o.x+WIDTH/2)/CELL)]||o.collider.type!=='none');
      w.spawnPoints=[];for(let i=0;i<w.reachable.length;i++)if(w.reachable[i]&&!w.water.mask[i]&&!w.roadMask[i])w.spawnPoints.push(pointAt(w,i));
      w.lightSources=w.objects.filter(o=>o.lightSource);w.hash=hashSeed(JSON.stringify(w)).toString(16).padStart(8,'0');yield {phase:'validated',progress:1};return JSON.parse(JSON.stringify(w));
    }catch(error){failures.push(`${attempt}: ${error.message}`);yield {phase:'retry',progress:0};}
  }throw Error(`World generation failed for ${mapId}/${text}: ${failures.join(' | ')}`);
}
export function generateWorld(mapId,seed,kit,onProgress=()=>{}){const run=worldPipeline(mapId,seed,kit);let step;while(!(step=run.next()).done)onProgress(step.value.progress);return step.value;}
export function hydrateWorld(w){
  const world={width:w.size.width,height:w.size.height,cellSize:640},cells=[],byCell=new Map();
  for(let y=0;y<Math.ceil(world.height/640);y++)for(let x=0;x<Math.ceil(world.width/640);x++){const key=`${x},${y}`;cells.push({key,x,y});byCell.set(key,[]);}
  const placements=w.objects.map(o=>({...o,cellKey:`${Math.floor((o.x+world.width/2)/640)},${Math.floor((o.y+world.height/2)/640)}`}));for(const o of placements)byCell.get(o.cellKey)?.push(o);
  const waterZones=[];for(let i=0;i<w.water.mask.length;i++)if(w.water.mask[i]&&!w.bridgeMask[i])waterZones.push({...pointAt(w,i),width:CELL,height:CELL,kind:w.water.mask[i]===2?'deep':'shallow',flow:{x:w.water.flowX[i],y:w.water.flowY[i]}});
  return {...w,worldData:w,world,cells,byCell,placements,waterZones,groundRegions:[],clearPaths:w.paths,clearAreas:[{x:0,y:0,radius:400,kind:'start'},...w.bossArenas.map(a=>({...a,kind:'boss-arena'}))],landmarks:w.sites.filter(s=>s.kind==='landmark'),
    colliders:[...placements.filter(o=>o.collider.type!=='none').flatMap(o=>o.solidParts?.length?o.solidParts.map((collider,i)=>({...o,ownerId:o.worldId,worldId:`${o.worldId}:part${i}`,collider,footprint:collider})):[o]),...w.assemblySolids]};
}
