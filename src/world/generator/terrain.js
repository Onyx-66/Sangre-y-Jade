// Fields -> water -> noise-perturbed Voronoi biomes. River geometry owns its RNG
// stream; lakes use low elevation away from the reserved 600px boss clearing.
import {hashSeed,randomStream,valueNoise} from '../seed.js';
import {CELL,pointAt,inside,neighbors} from './grid.js';
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
    const river=Math.abs(p.x-centre)<180;
    scores.push({i,score:river?-100000:w.fields.elevation[i]});
    if(river){w.water.flowY[i]=1;w.water.flowX[i]=(valueNoise(noiseSeed,0,Math.floor(i/w.columns)+1,6)-valueNoise(noiseSeed,0,Math.floor(i/w.columns)-1,6))/65535;}
  }
  scores.sort((a,b)=>a.score-b.score||a.i-b.i);
  const target=Math.floor(w.interior.reduce((a,b)=>a+b,0)*.22);
  for(const {i}of scores.slice(0,target))w.water.mask[i]=1;
  const raw=[...w.water.mask];
  for(let i=0;i<n;i++)if(raw[i]&&neighbors(w,i).every(k=>raw[k]))w.water.mask[i]=2;
}
export function biomes(w,definition){
  const random=randomStream(w.derivedSeed,'regions'),seeds=Array.from({length:9},(_,i)=>({x:Math.floor((random()-.5)*(w.size.width-800)),y:Math.floor((random()-.5)*(w.size.height-800)),kind:i%3}));
  w.biomes=[];w.regions=seeds;const noiseSeeds=seeds.map((_,j)=>hashSeed(w.derivedSeed,`region-${j}`));
  // V06 tables are qualitative: jungle dense, burned district sparse, cavern rocky.
  w.profile={trees:w.mapId==='overgrown'?.55:w.mapId==='bloodmoon'?.22:.12,rocks:w.mapId==='cenote'?.55:.25,description:definition.trees+'; '+definition.rocks};
  for(let i=0;i<w.interior.length;i++){const p=pointAt(w,i);let score=Infinity,kind=0;for(let j=0;j<seeds.length;j++){const s=seeds[j],d=(p.x-s.x)**2+(p.y-s.y)**2+(valueNoise(noiseSeeds[j],i%w.columns,Math.floor(i/w.columns),4)-32768)*12;if(d<score){score=d;kind=s.kind;}}w.biomes.push(kind);}
}
