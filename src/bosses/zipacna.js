import {ability,parameters,phaseAbilities,pursue,hitArea,point,at,ringPoints,channel,warning} from './common.js';
import {entrance} from './entries.js';

export function stoneSlam(ctx){const p=parameters(ctx,'stone-slam');return ability(ctx,'stone-slam',(c,w)=>
 hitArea(c,w,p.damage,{knockback:p.knockback}),()=>({shape:'circle',radius:p.radius}));}
export function rockRain(ctx){const p=parameters(ctx,'rock-rain');return ability(ctx,'rock-rain',c=>{
 for(const marker of c.markers)hitArea(c,marker,p.damage,{knockback:0});
 },null,{warnings:c=>{const aim=point(c.target);c.markers=[{shape:'circle',...aim,radius:p.radius},
  ...ringPoints(aim,p.count-1,p.radius*2.8,c.angle).map(q=>({shape:'circle',...q,radius:p.radius}))];return c.markers;}});}
export function fissureLine(ctx){const p=parameters(ctx,'fissure-line');return ability(ctx,'fissure-line',(c,w)=>{
 const count=7;let next=0,hit=false;
 channel(c,p.duration,(_dt,task)=>{
  while(next<count&&task.age+1e-9>=next*p.duration/count){const start=at(w,p.length*next/count,w.angle);
   if(!hit&&hitArea(c,{shape:'line',...start,angle:w.angle,length:p.length/count,width:p.width},p.damage,{knockback:0}))hit=true;next++;}
  for(let i=0;i<next;i++){const start=at(w,p.length*i/count,w.angle),end=at(w,p.length*(i+1)/count,w.angle);
   c.runtime.graphics?.lineStyle(p.width,0xc58a3d,.45).lineBetween(start.x,start.y,end.x,end.y);}
 });
 },()=>({shape:'line',length:p.length,width:p.width}));}
export function stoneArmor(ctx){const p=parameters(ctx,'stone-armor');return ability(ctx,'stone-armor',c=>{
 c.runtime.reserve(p.count);c.boss.setData('bossArmorPct',p.reduction);const stones=[];
 for(const position of ringPoints(c.boss,p.count,125,-Math.PI/2)){
  const stone=c.runtime.target({kind:'heart-stone',hp:p.hp,position,update:(_dt,t)=>{t.actor.setVelocity(0,0);},
   onDestroy:()=>{if(stones.every(t=>!t.actor.active||t.actor.getData('serial')!==t.serial))c.boss.setData('bossArmorPct',0);}});if(stone)stones.push(stone);
 }
 if(!stones.length)c.boss.setData('bossArmorPct',0);c.state.heartStones=stones;
 },()=>({shape:'ring',radius:150,innerRadius:100}),{damaging:false});}
export function avalanche(ctx){const p=parameters(ctx,'avalanche'),rain=parameters(ctx,'rock-rain');return ability(ctx,'avalanche',c=>{
 // Four staggered falls, all inside the600-unit arena, each warns separately.
 for(let i=0;i<4;i++)c.runtime.add({duration:i*.7,finish:()=>{
  const q=at(c.state.arena,c.state.arena.radius-rain.radius,c.angle+i*Math.PI/2);
  warning(c,{shape:'circle',...q,radius:rain.radius},.7,w=>hitArea(c,w,p.damage,{knockback:0}));
 }});
 },c=>({shape:'ring',...c.state.arena,radius:c.state.arena.radius,innerRadius:c.state.arena.radius-rain.radius*2}));}
const handlers={'stone-slam':stoneSlam,'rock-rain':rockRain,'fissure-line':fissureLine,'stone-armor':stoneArmor,avalanche};
export default {id:'zipacna',entry:ctx=>entrance(ctx,'earth'),move:pursue,abilities:ctx=>phaseAbilities(ctx,handlers)};
