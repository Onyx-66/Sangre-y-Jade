// Compatibility entry point for finite seeded worlds; fixed V13 slots and
// position-hash decor are gone. Runtime generation is performed in a worker.
import {generateWorld,hydrateWorld} from '../world/generator/index.js';
import {validateWorld} from '../world/generator/validate.js';
import {WIDTH,HEIGHT,WALL} from '../world/generator/grid.js';
import {randomStream} from '../world/seed.js';
export const WORLD_WIDTH=WIDTH,WORLD_HEIGHT=HEIGHT,WORLD_HALF={x:WIDTH/2,y:HEIGHT/2};
export const WALL_THICKNESS=WALL,MAP_CELL_SIZE=640,START_CLEAR_RADIUS=400,BOSS_ARENA_CLEAR_RADIUS=600;
export const PLAYABLE_BOUNDS={left:-WIDTH/2+WALL,right:WIDTH/2-WALL,top:-HEIGHT/2+WALL,bottom:HEIGHT/2-WALL};
export const seededRandom=seed=>randomStream(seed,'legacy');
export function generateMapLayout(id,kit,seed=1,{onProgress=()=>{}}={}){return hydrateWorld(generateWorld(id,seed,kit,onProgress));}
export const layoutsOverlap=layout=>validateWorld(layout.worldData).errors.find(e=>e.startsWith('overlap'))||null;
export const isWalkableRoute=layout=>validateWorld(layout.worldData).connectivity>=.9;
export const positionInSafeArea=(p,radius=400)=>Math.hypot(p.x,p.y)<radius;
export function packWorldCells(layout,view,margin=1){
  const size=layout.world.cellSize,cols=Math.ceil(layout.world.width/size),rows=Math.ceil(layout.world.height/size),cx=x=>Math.floor((x+layout.world.width/2)/size),cy=y=>Math.floor((y+layout.world.height/2)/size),out=[];
  for(let y=Math.max(0,cy(view.y)-margin);y<=Math.min(rows-1,cy(view.bottom)+margin);y++)for(let x=Math.max(0,cx(view.x)-margin);x<=Math.min(cols-1,cx(view.right)+margin);x++)out.push({key:`${x},${y}`,x,y});return out;
}
