// Level transitions are authorized only by stair end gates. Side entry and
// knockback cannot change floors; interpolation is visual, collision level discrete.
export const LEVEL_HEIGHT = 48;
const clamp=v=>Math.max(0,Math.min(1,v));
export function stairCoordinates(point, stair) {
  const dx=stair.to.x-stair.from.x,dy=stair.to.y-stair.from.y,length=Math.hypot(dx,dy);
  return {t:((point.x-stair.from.x)*dx+(point.y-stair.from.y)*dy)/(length*length),
    side:((point.x-stair.from.x)*-dy+(point.y-stair.from.y)*dx)/length,length};
}
export function advanceStairs(state,from,to,stairs,{radius=11,knockback=false}={}) {
  let stair=stairs.find(s=>s.id===state.stairId);
  if(!stair&&!knockback)stair=stairs.find(s=>{
    const a=stairCoordinates(from,s),b=stairCoordinates(to,s);
    return Math.abs(a.side)<=s.width/2-radius&&Math.abs(b.side)<=s.width/2-radius&&
      ((state.level===s.fromLevel&&a.t<=0&&b.t>0&&b.t<=1)||(state.level===s.toLevel&&a.t>=1&&b.t<1&&b.t>=0));
  });
  if(!stair)return {...state,position:to};
  const b=stairCoordinates(to,stair);
  if(knockback||Math.abs(b.side)>stair.width/2-radius)return {...state,position:from};
  const t=clamp(b.t),heightLevel=stair.fromLevel+(stair.toLevel-stair.fromLevel)*t;
  return {position:to,level:b.t>=1?stair.toLevel:b.t<=0?stair.fromLevel:state.level,
    stairId:b.t>0&&b.t<1?stair.id:null,heightLevel};
}
export function stairWaypoint(actor,target,stairs) {
  if((actor.level??0)===(target.level??0))return target;
  const current=stairs.find(s=>s.id===actor.stairId);
  if(current)return actor.level===current.fromLevel?current.to:current.from;
  const options=stairs.filter(s=>s.fromLevel===actor.level||s.toLevel===actor.level);
  options.sort((a,b)=>Math.abs((a.fromLevel===actor.level?a.toLevel:a.fromLevel)-target.level)-Math.abs((b.fromLevel===actor.level?b.toLevel:b.fromLevel)-target.level));
  const s=options[0];if(!s)return actor;
  const entry=s.fromLevel===actor.level?s.from:s.to,exit=entry===s.from?s.to:s.from;
  const dx=exit.x-entry.x,dy=exit.y-entry.y,d=Math.hypot(dx,dy);
  // Approach outside the gate first, then walk through it along its axis.
  if(Math.hypot(actor.x-entry.x,actor.y-entry.y)<24)return {x:entry.x+dx/d*24,y:entry.y+dy/d*24};
  return {x:entry.x-dx/d*16,y:entry.y-dy/d*16};
}
