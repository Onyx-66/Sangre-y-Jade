// Indexed water masks shared by movement, navigation and rendering. Water is
// physical only on floor zero; shore smoothing never changes the gameplay edge.
export const WATER = Object.freeze({shallowSpeed:.82,deepSpeed:.55,current:60,air:8,refill:4,warning:.25,
  enemySpeed:.45,swimmerSpeed:1.25,bossSpeed:.8,enemyDamage:.1,drownAfter:4,ripple:.35});
const DRY=Object.freeze({kind:'dry',deep:false,flow:{x:0,y:0},edge:0});
export const SWIMMERS=new Set(['abyssal_eel','drowned_spirit']);
export function waterTraits(actor){return {flier:!!actor?.getData?.('flier'),boss:!!actor?.getData?.('isBoss'),
  swimmer:SWIMMERS.has(actor?.getData?.('type')),elite:!!(actor?.getData?.('affix')||actor?.getData?.('elite')||actor?.getData?.('tough'))};}
export function waterSpeed(zone,traits={}){
  if(traits.flier||zone.kind==='dry')return 1;
  if(traits.swimmer)return WATER.swimmerSpeed;
  if(traits.boss)return zone.deep?WATER.bossSpeed:1;
  return traits.enemy?(zone.deep?WATER.enemySpeed:1):(zone.deep?WATER.deepSpeed:WATER.shallowSpeed);
}
export class WaterGrid {
  constructor(zones=[],cellSize=160){this.cellSize=cellSize;this.cells=new Map();this.zones=[];zones.forEach(z=>this.addZone(z));}
  addZone(zone){
    const z={...zone,kind:zone.kind==='deep'?'deep':'shallow'};
    const f=zone.flow||{},length=Math.hypot(f.x||0,f.y||0);z.flow=length?{x:f.x/length,y:f.y/length}:{x:0,y:0};
    const rx=z.radius??z.width/2,ry=z.radius??z.height/2;
    if(![z.x,z.y,rx,ry].every(Number.isFinite)||rx<=0||ry<=0)throw Error('Invalid water zone');
    this.zones.push(z);
    for(let y=Math.floor((z.y-ry)/this.cellSize);y<=Math.floor((z.y+ry)/this.cellSize);y++)for(let x=Math.floor((z.x-rx)/this.cellSize);x<=Math.floor((z.x+rx)/this.cellSize);x++){
      const key=`${x},${y}`;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(z);
    }return z;
  }
  waterAt(x,y,level=0){
    if(level!==0)return DRY;
    let result=DRY;
    for(const z of this.cells.get(`${Math.floor(x/this.cellSize)},${Math.floor(y/this.cellSize)}`)||[]){
      const edge=z.radius!==undefined?z.radius-Math.hypot(x-z.x,y-z.y):Math.min(z.width/2-Math.abs(x-z.x),z.height/2-Math.abs(y-z.y));
      if(edge<0||result.deep&&z.kind!=='deep')continue;
      result={kind:z.kind,deep:z.kind==='deep',flow:z.flow,edge:Math.min(1,edge/16),zone:z};
    }return result;
  }
}
export function debugWaterZones(){return [{x:0,y:0,width:600,height:300,kind:'shallow'},
  {x:120,y:0,width:240,height:240,kind:'deep',flow:{x:1,y:0}}];}
export function lakeWaterZones(zones){return zones.flatMap(z=>z.kind?[z]:[{...z,kind:'shallow'},{...z,kind:'deep',radius:z.radius*.6}]);}

// Empty at t=8; t=9 is the grace tick; damage starts at t=10 (2%,3%...8%).
export function stepBreath(state,dt,deep,paused=false){
  const result={damage:[],warning:false,gasp:false};if(paused||dt<=0)return result;
  if(!deep){result.gasp=state.deep&&state.air<WATER.air;state.air=Math.min(WATER.air,state.air+WATER.refill*dt);state.emptyTime=0;state.ticks=0;state.warned=false;state.deep=false;return result;}
  state.deep=true;const drained=Math.min(state.air,dt);state.air=Math.max(0,state.air-dt);
  if(state.air<=WATER.air*WATER.warning&&!state.warned){state.warned=true;result.warning=true;}
  if(!state.air){state.emptyTime+=dt-drained;const ticks=Math.floor(state.emptyTime+1e-8);
    while(state.ticks<ticks){state.ticks++;if(state.ticks>1)result.damage.push(Math.min(.08,state.ticks*.01));}}
  return result;
}
export const newBreath=()=>({air:WATER.air,emptyTime:0,ticks:0,deep:false,warned:false});
