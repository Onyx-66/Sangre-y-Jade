import {ability,parameters,phaseAbilities,pursue,point,at,ringPoints,beam,channel,hitArea,place,TAU,distance} from './common.js';
import {entrance} from './entries.js';

export function sunbeamSweep(ctx){const p=parameters(ctx,'sunbeam-sweep');return ability(ctx,'sunbeam-sweep',(c,w)=>
 beam(c,{...p,origin:point(w),angle:c.angle-p.rotation/2}),null,{
  warnings:c=>[{shape:'cone',radius:p.length,arc:p.rotation,angle:c.angle},
   {shape:'line',length:p.length,width:p.width,angle:c.angle-p.rotation/2}]});}
export function featherBarrage(ctx){const p=parameters(ctx,'feather-barrage');return ability(ctx,'feather-barrage',c=>{
 for(let i=0;i<p.count;i++)c.projectile(c.angle+(i-(p.count-1)/2)*.13,p.speed,p.damage);
 },()=>({shape:'cone',radius:p.speed*2,arc:(p.count-1)*.13+.12}));}
export const inFlareGap=(angle,gaps,width)=>gaps.some(a=>Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<=width/2);
export function solarFlareRings(ctx){const p=parameters(ctx,'solar-flare-rings');return ability(ctx,'solar-flare-rings',(c,w)=>{
 const gapWidth=Math.PI/3,speed=170,spacing=.65,origin=point(w),gaps=Array.from({length:p.gaps},(_,i)=>c.angle+i*TAU/p.gaps);
 const hit=new Set();
 c.runtime.add({duration:c.state.arena.radius/speed+(p.count-1)*spacing,update:(_dt,task)=>{
  for(let i=0;i<p.count;i++){
   const radius=(task.age-i*spacing)*speed;if(radius<0||radius>c.state.arena.radius)continue;
   for(let k=0;k<p.gaps;k++){const from=gaps[k]+gapWidth/2,to=(gaps[(k+1)%p.gaps]+(k===p.gaps-1?TAU:0))-gapWidth/2;
    c.runtime.graphics?.lineStyle(20,0xffcf4a,.65).beginPath().arc(origin.x,origin.y,radius,from,to).strokePath();}
   const hero=c.scene.player,angle=Math.atan2(hero.y-origin.y,hero.x-origin.x);
   if(!hit.has(i)&&Math.abs(distance(hero,origin)-radius)<=28&&!inFlareGap(angle,gaps,gapWidth)&&c.damage(p.damage,origin.x,origin.y,{knockback:0}))hit.add(i);
  }
 }});
 },c=>({shape:'circle',radius:c.state.arena.radius,safeAngles:Array.from({length:p.gaps},(_,i)=>c.angle+i*TAU/p.gaps),gapWidth:Math.PI/3}));}
export function secondSun(ctx){const p=parameters(ctx,'second-sun');return ability(ctx,'second-sun',c=>{
 c.runtime.reserve(p.count);c.state.sunOrbs=[];
 for(const [i,position]of ringPoints(c.boss,p.count,115,c.angle).entries()){
  let age=0,heading=c.angle+i*TAU/p.count;
  const orb=c.runtime.target({kind:'second-sun',hp:p.hp,position,onDestroy:()=>{
   c.boss.setData('stunUntil',Math.max(c.boss.getData('stunUntil')||0,c.scene.elapsed+p.stun));
  },update:(dt,t)=>{
   age+=dt;const actor=t.actor;actor.setVelocity(0,0);
   if(age<1.5)place(actor,at(c.boss,115,c.angle+i*TAU/p.count+age));
   else{
    const desired=Math.atan2(c.scene.player.y-actor.y,c.scene.player.x-actor.x),difference=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
    heading+=Math.max(-dt,Math.min(dt,difference));place(actor,at(actor,100*dt,heading));
    if(distance(actor,c.scene.player)<=t.radius+18){c.damage(p.damage,actor.x,actor.y,{knockback:0});c.runtime.destroyTarget(actor,false);}
   }
   if(age>=10)c.runtime.destroyTarget(actor,false);
  }});if(orb)c.state.sunOrbs.push(orb);
 }
 },()=>({shape:'ring',radius:140,innerRadius:90}));}
export function zenith(ctx){const p=parameters(ctx,'zenith');
 const restore=c=>{if(c.boss.getData('serial')!==c.state.serial)return;
  c.boss.setAlpha(1);c.boss.setData('bossInvulnerableUntil',Math.min(c.boss.getData('bossInvulnerableUntil')||0,c.scene.elapsed));};
 return ability(ctx,'zenith',(c,w)=>{restore(c);place(c.boss,w);hitArea(c,w,p.damage,{knockback:0});},
 c=>({shape:'circle',...point(c.target),radius:p.radius}),{
  prepare:(c,begin,cancel)=>{
   c.boss.setData('bossInvulnerableUntil',c.scene.elapsed+p.trail+p.windup);c.boss.setAlpha(.3);let next=.5;const trail=[];
   channel(c,p.trail,(_dt,task)=>{
    if(task.age+1e-9>=next){trail.push(point(c.scene.player));next+=.5;}
    for(const q of trail)c.runtime.graphics?.lineStyle(2,0xffcf4a,.55).strokeCircle(q.x,q.y,24);
   },()=>begin(),()=>{restore(c);cancel();});
   c.scene.fx?.play('boss-vucub-zenith','aura',{...point(c.boss),state:c.state,boss:c.boss,duration:p.trail,sound:false,
    isAlive:()=>c.runtime.alive()&&!!c.state.channel});
  },cancel:restore});
}
const handlers={'sunbeam-sweep':sunbeamSweep,'feather-barrage':featherBarrage,'solar-flare-rings':solarFlareRings,'second-sun':secondSun,zenith};
export default {id:'vucub',entry:ctx=>entrance(ctx,'sun'),move:pursue,abilities:ctx=>phaseAbilities(ctx,handlers)};
