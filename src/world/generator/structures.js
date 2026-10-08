// Seeded Poisson sites, catalog footprints and separated class streams. Reserved
// roads, arena and structure pads prohibit later vegetation from closing routes.
import {randomStream} from '../seed.js';
import {assemblePyramid,assembleTemple} from '../assemblies.js';
import {shapeBounds} from '../geometry.js';
import {CELL,pointAt,indexAt,inside,route,neighbors,flood} from './grid.js';
export const rectOverlap=(a,b,pad=0)=>a.x<b.x+b.width+pad&&a.x+a.width+pad>b.x&&a.y<b.y+b.height+pad&&a.y+a.height+pad>b.y;
const boundsCache=new WeakMap();
export function boundsOf(item){if(!boundsCache.has(item))boundsCache.set(item,item.collider.type==='none'?{x:item.x-16,y:item.y-16,width:32,height:32}:shapeBounds(item));return boundsCache.get(item);}
export function candidate(item,x,y,scale=1){return {...item,x:Math.round(x),y:Math.round(y),scale,worldId:`${item.id}@${Math.round(x)}:${Math.round(y)}`,size:{width:Math.round(item.size.width*scale),height:Math.round(item.size.height*scale)}};}
function boxCells(w,b){const result=[];for(let y=Math.floor((b.y+w.size.height/2)/CELL);y<=Math.floor((b.y+b.height+w.size.height/2)/CELL);y++)for(let x=Math.floor((b.x+w.size.width/2)/CELL);x<=Math.floor((b.x+b.width+w.size.width/2)/CELL);x++)if(x>=0&&y>=0&&x<w.columns&&y<w.rows)result.push(y*w.columns+x);return result;}
export function canPlace(w,item,{site=false}={}){
  const b=boundsOf(item),radius=Math.hypot(b.width,b.height)/2,c={x:b.x+b.width/2,y:b.y+b.height/2};
  if(!inside(w,{x:b.x,y:b.y},24)||!inside(w,{x:b.x+b.width,y:b.y+b.height},24)||Math.hypot(c.x,c.y)<620+radius)return false;
  const cells=boxCells(w,{x:b.x-24,y:b.y-24,width:b.width+48,height:b.height+48});
  if(cells.some(i=>w.water.mask[i]||w.roadMask?.[i]))return false;
  if(!site&&w.sites.some(s=>Math.hypot(item.x-s.x,item.y-s.y)<s.radius))return false;
  return !w.objects.some(other=>rectOverlap(b,boundsOf(other),24));
}
export function sites(w){
  const random=randomStream(w.derivedSeed,'sites');w.sites=[];
  const kinds=['landmark','settlement','settlement','settlement','settlement','ruins','stela-field','camp'];
  for(const kind of kinds){let placed=false;for(let n=0;n<1500;n++){
    const x=Math.round((random()-.5)*(w.size.width-1400)),y=Math.round((random()-.5)*(w.size.height-1400)),radius=kind==='settlement'?450:kind==='landmark'?400:200;
    if(Math.hypot(x,y)<700+radius||w.sites.some(s=>Math.hypot(x-s.x,y-s.y)<radius+s.radius+80))continue;
    const cells=boxCells(w,{x:x-radius,y:y-radius,width:radius*2,height:radius*2});if(cells.some(i=>w.water.mask[i]||!w.interior[i]))continue;
    const p=pointAt(w,indexAt(w,x,y));w.sites.push({id:`${kind}-${w.sites.length}`,kind,...p,radius});placed=true;break;
  }if(!placed)throw Error(`Site placement: ${kind}`);}
}
export function roads(w){
  w.paths=[];w.bridges=[];w.roadMask=Array(w.interior.length).fill(0);
  const start=indexAt(w,0,0);
  const landmark=w.sites.find(s=>s.kind==='landmark');
  const cost=i=>{const p=pointAt(w,i);return !w.interior[i]||Math.abs(p.x-landmark.x)<240&&p.y<landmark.y-32&&p.y>landmark.y-420?Infinity:(w.water.mask[i]?30:1)+w.fields.elevation[i]/65535;};
  for(const site of w.sites){const end=indexAt(w,site.x,site.y),cells=route(w,start,end,cost);if(!cells.length)throw Error('No road');
    let crossing=[];const finish=()=>{if(!crossing.length)return;if(crossing.length>6)throw Error('Water crossing too long');w.bridges.push({cells:[...crossing],width:CELL*3});crossing=[];};
    for(const i of cells){if(w.water.mask[i])crossing.push(i);else finish();for(const k of [i,...neighbors(w,i)])w.roadMask[k]=1;}finish();
    w.paths.push({from:{x:0,y:0},to:{x:site.x,y:site.y},width:CELL*3,cells,points:cells.map(i=>pointAt(w,i))});
  }
  // Bridge decks are traversable level-zero water exclusions, not filled lakes.
  w.bridgeMask=Array(w.interior.length).fill(0);for(let i=0;i<w.roadMask.length;i++)if(w.roadMask[i]&&w.water.mask[i])w.bridgeMask[i]=1;
  // Join disconnected islands by short crossings before any props are placed.
  // This is topology repair, not a pass flag that conceals inaccessible cells.
  for(let repair=0;repair<32;repair++){
    const blocked=w.interior.map((v,i)=>!v||w.water.mask[i]===2&&!w.bridgeMask[i]?1:0),seen=flood(w,blocked);
    const end=blocked.findIndex((v,i)=>!v&&!seen[i]);if(end<0)break;
    const cells=route(w,start,end,cost);if(!cells.length)break;let length=0;
    for(const i of cells){length=w.water.mask[i]===2?length+1:0;if(length>6)throw Error('Island crossing too long');}
    for(const i of cells)for(const k of [i,...neighbors(w,i)]){w.roadMask[k]=1;if(w.water.mask[k])w.bridgeMask[k]=1;}
    w.paths.push({from:{x:0,y:0},to:pointAt(w,end),width:CELL*3,cells,points:cells.map(i=>pointAt(w,i)),repair:true});
  }
}
export function structures(w,kit){
  const random=randomStream(w.derivedSeed,'buildings');w.objects=[];w.stairs=[];w.surfaces=[];w.assemblySolids=[];
  const buildings=kit.items.filter(i=>i.category==='buildings'&&/hut|house|stall|ossuary|shrine/.test(i.id));
  const small=kit.items.filter(i=>/stela|altar|totem|pot|crate|barrel|lamp|torch/.test(i.id));
  for(const site of w.sites){
    if(site.kind==='landmark'){
      const options={id:site.id,x:site.x,y:site.y-220,width:320,tiers:3,faces:['south'],stairWidth:96};
      const a=(w.mapId==='overgrown'?assembleTemple:assemblePyramid)(options);site.assembly=options;
      w.stairs.push(...a.stairs);w.surfaces.push(...a.surfaces);w.assemblySolids.push(...a.solids);continue;
    }
    const count=site.kind==='settlement'?3+Math.floor(random()*5):3,items=site.kind==='settlement'?buildings:small;site.buildingCount=0;
    for(let n=0;n<count;n++){
      let placed=false;for(let attempt=0;attempt<120;attempt++){
        const item=items[Math.floor(random()*items.length)],angle=random()*Math.PI*2,d=site.kind==='settlement'?260+random()*120:90+random()*100;
        const c=candidate(item,site.x+Math.cos(angle)*d,site.y+Math.sin(angle)*d,site.kind==='settlement'?.55:.6);
        if(!canPlace(w,c,{site:true}))continue;w.objects.push(c);site.buildingCount++;placed=true;break;
      }if(!placed&&site.kind==='settlement'&&site.buildingCount<3)throw Error('Settlement too small');
    }
  }
}
export function vegetation(w,kit){
  for(const category of ['trees','rocks','plants','debris','props']){
    const random=randomStream(w.derivedSeed,category),items=kit.items.filter(i=>i.category===category),minimum={trees:180,rocks:130,plants:80,debris:70,props:100}[category];
    const density=category==='trees'?w.profile.trees:category==='rocks'?w.profile.rocks:.25,target=Math.floor(170*density+18);
    for(let n=0,placed=0;n<2000&&placed<target;n++){
      const x=Math.round((random()-.5)*(w.size.width-1000)),y=Math.round((random()-.5)*(w.size.height-1000)),i=indexAt(w,x,y);
      if(random()> .3+w.fields.fertility[i]/65535*.7)continue;
      const item=items[Math.floor(random()*items.length)],c=candidate(item,x,y,.75+random()*.25);
      if(!canPlace(w,c)||w.objects.some(o=>o.category===category&&Math.hypot(o.x-x,o.y-y)<minimum))continue;
      w.objects.push(c);placed++;
    }
  }
}
