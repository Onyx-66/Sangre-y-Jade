// Fields -> water -> noise-perturbed Voronoi biomes. River geometry owns its RNG
// stream; lakes use low elevation away from the reserved 600px boss clearing.
import {hashSeed,randomStream,valueNoise} from '../seed.js';
import {CELL,pointAt,inside,neighbors} from './grid.js';
import {WORLD_CONFIGS} from '../configs/index.js';
export function fields(w){
  const elevationSeed=hashSeed(w.derivedSeed,'elevation'),fertilitySeed=hashSeed(w.derivedSeed,'fertility');
  w.fields={elevation:[],fertility:[]};w.interior=[];
  for(let i=0;i<w.columns*w.rows;i++){const x=i%w.columns,y=Math.floor(i/w.columns);w.fields.elevation.push(valueNoise(elevationSeed,x,y));w.fields.fertility.push(valueNoise(fertilitySeed,x,y,5));w.interior.push(inside(w,pointAt(w,i),CELL/2)?1:0);}
}
export function water(w){
  const random=randomStream(w.derivedSeed,'water'),n=w.interior.length;w.water={cellSize:CELL,mask:Array(n).fill(0),flowX:Array(n).fill(0),flowY:Array(n).fill(0)};
  const riverSide=random()<.5?-1:1,offset=1250+Math.floor(random()*900),noiseSeed=hashSeed(w.derivedSeed,'river');
  const scores=[];
  for(let i=0;i<n;i++){
    const p=pointAt(w,i);if(!w.interior[i]||Math.hypot(p.x,p.y)<780)continue;
    const centre=riverSide*(offset+(valueNoise(noiseSeed,0,Math.floor(i/w.columns),6)/65535-.5)*800);
    const river=w.mapId==='overgrown'&&Math.abs(p.x-centre)<180;
    scores.push({i,score:river?-100000:w.fields.elevation[i]});
    if(river){w.water.flowY[i]=1;w.water.flowX[i]=(valueNoise(noiseSeed,0,Math.floor(i/w.columns)+1,6)-valueNoise(noiseSeed,0,Math.floor(i/w.columns)-1,6))/65535;}
  }
  scores.sort((a,b)=>a.score-b.score||a.i-b.i);
  const target=Math.floor(w.interior.reduce((a,b)=>a+b,0)*.22);
  for(const {i}of scores.slice(0,target))w.water.mask[i]=1;
  if(w.mapId==='cenote'){
    // Keep the lake away from the dry boss ring; island and shores are seeded.
    w.lake={x:riverSide*1792,y:-256,rx:896,ry:1536,islandRadius:256};
    for(let i=0;i<n;i++){const p=pointAt(w,i),d=((p.x-w.lake.x)/w.lake.rx)**2+((p.y-w.lake.y)/w.lake.ry)**2;
      if(d<=1)w.water.mask[i]=1;
      if(Math.hypot(p.x-w.lake.x,p.y-w.lake.y)<w.lake.islandRadius)w.water.mask[i]=0;
      // Reserved north shore gate and southern dock-village approach.
      if(Math.abs(p.x-w.lake.x)<512&&(p.y<-1792||p.y>1280))w.water.mask[i]=0;
    }
    // Outside-lake ponds are retained only until 25% total coverage.
    const budget=Math.floor(w.interior.filter(Boolean).length*.25);let total=w.water.mask.filter(Boolean).length;
    for(const {i}of [...scores].reverse()){const p=pointAt(w,i);if(total<=budget)break;if(w.water.mask[i]&&((p.x-w.lake.x)/w.lake.rx)**2+((p.y-w.lake.y)/w.lake.ry)**2>1){w.water.mask[i]=0;total--;}}
  }
  const raw=[...w.water.mask];
  for(let i=0;i<n;i++)if(raw[i]&&neighbors(w,i).every(k=>raw[k]))w.water.mask[i]=2;
  // Dock huts sit on a shallow bank, never above drowning-depth water.
  if(w.lake)for(let i=0;i<n;i++){const p=pointAt(w,i);if(w.water.mask[i]&&Math.abs(p.x-w.lake.x)<512&&p.y>=896&&p.y<=1280)w.water.mask[i]=1;}
}
export function biomes(w,definition){
  const random=randomStream(w.derivedSeed,'regions'),seeds=Array.from({length:9},(_,i)=>({x:Math.floor((random()-.5)*(w.size.width-800)),y:Math.floor((random()-.5)*(w.size.height-800)),kind:i%3}));
  w.biomes=[];w.regions=seeds;const noiseSeeds=seeds.map((_,j)=>hashSeed(w.derivedSeed,`region-${j}`));
  // V06 tables are qualitative: jungle dense, burned district sparse, cavern rocky.
  w.profile={...WORLD_CONFIGS[w.mapId].densities,description:definition.trees+'; '+definition.rocks};
  for(let i=0;i<w.interior.length;i++){const p=pointAt(w,i);let score=Infinity,kind=0;for(let j=0;j<seeds.length;j++){const s=seeds[j],d=(p.x-s.x)**2+(p.y-s.y)**2+(valueNoise(noiseSeeds[j],i%w.columns,Math.floor(i/w.columns),4)-32768)*12;if(d<score){score=d;kind=s.kind;}}w.biomes.push(kind);}
}
