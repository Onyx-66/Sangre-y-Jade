// Modular raised structures: floors have solid perimeter rails; only stair
// strips connect levels. Assemblers return data, so placement remains seeded.
const rect=(id,x,y,width,height,level,kind='wall')=>({id,worldId:id,x,y,scale:1,level,kind,
  collider:{type:'rect',width,height,offsetX:0,offsetY:0},size:{width,height},anchor:{x:.5,y:.5}});
export function assemblePyramid({id='pyramid',x=0,y=0,width=480,tiers=3,faces=['south'],stairWidth=64}={}) {
  if(!Number.isInteger(tiers)||tiers<1||tiers>4)throw new Error('Pyramid needs 1–4 tiers');
  if(!faces.length||new Set(faces).size!==faces.length||faces.some(f=>!['north','east','south','west'].includes(f)))throw new Error('Invalid stair faces');
  const solids=[],surfaces=[],stairs=[],step=width/(tiers+1)/2;
  for(let tier=1;tier<=tiers;tier++) {
    const half=width/2-(tier-1)*step,inner=half-step;
    surfaces.push(rect(`${id}-floor-${tier}`,x,y,half*2,half*2,tier,'platform'));
    for(const [face,dx,dy] of [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]]) {
      const hasStairs=faces.includes(face),segments=hasStairs?[[-half,-stairWidth/2],[stairWidth/2,half]]:[[-half,half]];
      for(const [index,[a,b]] of segments.entries()) {
        const wall=rect(`${id}-${tier}-${face}-${index}`,x+dx*half+(dy?(a+b)/2:0),y+dy*half+(dx?(a+b)/2:0),dy?b-a:8,dx?b-a:8,tier);
        wall.levels=[tier-1,tier];solids.push(wall);
      }
      if(hasStairs)stairs.push({id:`${id}-stairs-${tier}-${face}`,kind:'stairs',width:stairWidth,
        from:{x:x+dx*(half+12),y:y+dy*(half+12)},to:{x:x+dx*(inner+12),y:y+dy*(inner+12)},fromLevel:tier-1,toLevel:tier});
    }
  }
  return {solids,surfaces,stairs};
}
export function assembleTemple(options={}) {
  const result=assemblePyramid(options),level=options.tiers||3,width=(options.width||480)/((options.tiers||3)+1);
  const shrine=rect(`${options.id||'temple'}-sanctum`,options.x||0,options.y||0,width*.65,width*.45,level,'house');
  shrine.door={x:0,y:width*.225,facing:'south',closed:true};
  result.solids.push(shrine);return result;
}
