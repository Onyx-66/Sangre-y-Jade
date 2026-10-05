export const BOSS_FAIRNESS=Object.freeze({minimumTelegraph:.5,minimumRecovery:1.2,maximumDamage:80,arenaRadius:600,warningLead:8,skipAfter:1,nameDuration:2});
export const bossDamage=amount=>Math.max(0,Math.min(BOSS_FAIRNESS.maximumDamage,Number(amount)||0));
export function phaseForHp(phases,ratio){
 let index=0;for(let i=1;i<phases.length;i++)if(ratio<=phases[i].threshold)index=i;return index;
}
export function fairAbility(ability){
 return {...ability,windup:Math.max(ability.damaging===false?.001:BOSS_FAIRNESS.minimumTelegraph,ability.windup??.5),
  recovery:Math.max(ability.big===false?0:BOSS_FAIRNESS.minimumRecovery,ability.recovery||0)};
}
export const insideSafeCircle=(point,circles)=>circles.some(c=>Math.hypot(point.x-c.x,point.y-c.y)<=c.radius);
export function arenaSafeCircles(center,radius=130){
 return Array.from({length:3},(_,i)=>({x:center.x+Math.cos(-Math.PI/2+i*Math.PI*2/3)*300,
  y:center.y+Math.sin(-Math.PI/2+i*Math.PI*2/3)*300,radius}));
}
export function segmentDistance(a,b,p){
 const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;
 return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
export function warningEdgePoint(view,target,safe,margin=24){
 const dx=(target.x-view.x-view.width/2)/view.width*safe.width,dy=(target.y-view.y-view.height/2)/view.height*safe.height;
 const halfX=Math.max(1,safe.width/2-margin),halfY=Math.max(1,safe.height/2-margin);
 const divisor=Math.max(Math.abs(dx)/halfX,Math.abs(dy)/halfY,.0001);
 return {x:safe.x+safe.width/2+dx/divisor,y:safe.y+safe.height/2+dy/divisor,angle:Math.atan2(dy,dx)};
}
