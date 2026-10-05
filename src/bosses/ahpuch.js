import {ability,parameters,phaseAbilities,pursue,point,ringPoints,beam,channel,hitArea,warning,spawnAdds,drawSafe,insideSafeCircle,distance} from './common.js';
import {entrance} from './entries.js';

export function deathGaze(ctx){const p=parameters(ctx,'death-gaze');return ability(ctx,'death-gaze',(c,w)=>
 beam(c,{...p,origin:point(w),angle:w.angle,width:40}),()=>({shape:'line',length:p.length,width:40}),{
  track:(c,w)=>{if(w.age<=w.windup-.5){w.x=c.boss.x;w.y=c.boss.y;w.angle=Math.atan2(c.target.y-w.y,c.target.x-w.x);}}});}
export function boneSpearRing(ctx){const p=parameters(ctx,'bone-spear-ring');return ability(ctx,'bone-spear-ring',c=>{
 const fire=markers=>{for(const [i,marker]of markers.entries())c.projectile(Math.atan2(marker.y-c.boneOrigin.y,marker.x-c.boneOrigin.x),200,p.damage,marker);};
 fire(c.markers);
 const second=ringPoints(c.boneOrigin,p.count,p.radius,c.angle+Math.PI/p.count);
 for(const marker of second)warning(c,{shape:'circle',...marker,radius:24},.5,w=>c.projectile(Math.atan2(w.y-c.boneOrigin.y,w.x-c.boneOrigin.x),200,p.damage,w));
 },null,{warnings:c=>{c.boneOrigin=point(c.boss);c.markers=ringPoints(c.boneOrigin,p.count,p.radius,c.angle).map(q=>({shape:'circle',...q,radius:24}));return c.markers;}});}
export function soulDrain(ctx){const p=parameters(ctx,'soul-drain');return ability(ctx,'soul-drain',(c,w)=>{
 const player=c.scene.player;c.state.soulDrain={origin:point(w),until:c.scene.elapsed+p.duration};
 if(distance(player,w)<=p.radius)player.setData('bossPull',{...point(w),until:c.scene.elapsed+p.duration,speed:100,owner:c.boss,serial:c.state.serial});
 const before=c.scene.stats.hp;
 if(hitArea(c,w,p.damage,{knockback:0}))c.boss.setData('hp',Math.min(c.boss.getData('maxHp'),c.boss.getData('hp')+Math.max(0,before-c.scene.stats.hp)));
 channel(c,p.duration,()=>{
  c.runtime.graphics?.lineStyle(3,0x9a8cff,.6).strokeCircle(w.x,w.y,p.radius);
  if(distance(player,w)>p.radius)player.setData('bossPull',null);
 },()=>player.setData('bossPull',null),()=>player.setData('bossPull',null));
 },()=>({shape:'circle',radius:p.radius}));}
export function summonLords(ctx){const p=parameters(ctx,'summon-lords');return ability(ctx,'summon-lords',c=>
 spawnAdds(c,'priest',c.markers,{elite:true}),null,{
  warnings:c=>{c.markers=ringPoints(c.boss,p.count,200,c.angle+Math.PI/2).map(q=>({shape:'circle',...q,radius:40}));return c.markers;}});}
export function xibalbaShift(ctx){const p=parameters(ctx,'xibalba-shift');return ability(ctx,'xibalba-shift',c=>{
 const fog={age:0,circles:ringPoints(c.state.arena,p.count,280,-Math.PI/2).map(q=>({...q,radius:p.radius})),moves:0};c.state.fog=fog;
 c.runtime.add({update:(dt,task)=>{
  fog.age=task.age;const move=Math.floor((task.age+1e-9)/p.moveEvery);if(move!==fog.moves){fog.moves=move;
   // Move over2s (rather than teleport) so a player can stay in the light.
   fog.from=fog.circles.map(point);fog.to=ringPoints(c.state.arena,p.count,280,-Math.PI/2+move*Math.PI/4);fog.moveStart=task.age;}
  if(fog.from){const t=Math.min(1,(task.age-fog.moveStart)/2);fog.circles=fog.to.map((q,i)=>({x:fog.from[i].x+(q.x-fog.from[i].x)*t,y:fog.from[i].y+(q.y-fog.from[i].y)*t,radius:p.radius}));}
  const rite=[...c.scene.telegraphs.live].find(w=>w.owner===c.boss&&w.tag==='boss:final-rite');
  const safe=rite?.safeCircles||fog.circles;
  c.runtime.graphics?.fillStyle(0x1a6f58,.2).fillCircle(c.state.arena.x,c.state.arena.y,c.state.arena.radius);drawSafe(c.runtime.graphics,safe);
  if(distance(c.scene.player,c.state.arena)<=c.state.arena.radius&&!insideSafeCircle(c.scene.player,safe))c.damage(p.dps*dt,c.state.arena.x,c.state.arena.y,{dot:true});
 }});
 },c=>({shape:'circle',...c.state.arena,radius:c.state.arena.radius}),{damaging:true});}
export function finalRite(ctx){const p=parameters(ctx,'final-rite');return ability(ctx,'final-rite',c=>{
 c.state.finalRiteCircles=c.safeCircles;
 c.damage(p.damage,c.state.arena.x,c.state.arena.y,{knockback:0});
 },c=>({shape:'circle',...c.state.arena,radius:Math.max(c.state.arena.radius,distance(c.scene.player,c.state.arena)+c.scene.stats.speed*p.windup+100)}),{
  condition:c=>c.scene.elapsed+1e-9>=((c.state.cooldowns['final-rite']??(c.state.phaseStartedAt+p.first-p.windup))),
  priority:1,chargeDuringRecovery:true});}
const handlers={'death-gaze':deathGaze,'bone-spear-ring':boneSpearRing,'soul-drain':soulDrain,'summon-lords':summonLords,'xibalba-shift':xibalbaShift,'final-rite':finalRite};
export default {id:'ahpuch',entry:ctx=>entrance(ctx,'gate'),move:pursue,abilities:ctx=>{
 const all=phaseAbilities(ctx,handlers);if(ctx.state.phase<2)return all;
 const p=parameters(ctx,'final-rite'),due=ctx.state.cooldowns['final-rite']??(ctx.state.phaseStartedAt+p.first-p.windup);
 return all.sort((a,b)=>(a.id==='final-rite'?-1:b.id==='final-rite'?1:0)).map(a=>a.id==='final-rite'?a:{...a,
  condition:c=>c.scene.elapsed+(a.windup+(a.parameters.duration||0)+a.recovery)<due&&a.condition?.(c)!==false});
}};
