import {ability,parameters,phaseAbilities,pursue,hitArea,at,spawnAdds,bloodDash} from './common.js';
import {entrance} from './entries.js';
import {worldView} from '../systems/Viewport.js';

export function sonicScreech(ctx){const p=parameters(ctx,'sonic-screech');return ability(ctx,'sonic-screech',(c,w)=>
 hitArea(c,w,p.damage,{knockback:p.knockback,confuse:p.confuse}),()=>({shape:'cone',radius:p.radius,arc:p.arc}));}
export function batSwarm(ctx){const p=parameters(ctx,'bat-swarm');
 return ability(ctx,'bat-swarm',c=>spawnAdds(c,'bat',c.markers),c=>({shape:'circle',...c.markers[0],radius:22}),{
  warnings:c=>{c.markers=Array.from({length:p.count},(_,i)=>{
   const side=i%2?-1:1,q=at(c.boss,100+Math.floor(i/2)*60,c.angle+side*Math.PI/5);return {shape:'circle',...q,radius:22};});return c.markers;}});}
export function bloodDive(ctx){const p=parameters(ctx,'blood-dive');return ability(ctx,'blood-dive',c=>bloodDash(c,p),
 ()=>({shape:'line',length:p.length,width:64}));}
// Filled quadrants with curved inner edges leave the specified circular hole.
export function drawEclipse(scene,g,radius,boss){if(!g)return;
 const v=worldView(scene),p=scene.player;
 for(const sign of [-1,1]){
  const edge=sign<0?v.y:v.bottom,arc=Array.from({length:49},(_,i)=>at(p,radius,sign*i*Math.PI/48));
  g.fillStyle(0x03050b,.94).fillPoints([{x:v.x,y:edge},{x:v.right,y:edge},{x:v.right,y:p.y},...arc,{x:v.x,y:p.y}],true);
 }
 for(const x of [-10,10])g.fillStyle(0xd9413a,1).fillCircle(boss.x+x,boss.y-16,4);
}
export function eclipse(ctx){const p=parameters(ctx,'eclipse');return ability(ctx,'eclipse',c=>
 c.runtime.add({duration:p.duration,update:()=>drawEclipse(c.scene,c.runtime.dark,p.radius,c.boss)}),
 c=>({shape:'circle',...c.state.arena,radius:c.state.arena.radius}));}
export function twinDive(ctx){const p=parameters(ctx,'blood-dive');return ability(ctx,'twin-dive',c=>{
 for(const [i,dive]of c.dives.entries())bloodDash(c,p,{origin:dive,angle:dive.angle,ghost:i>0});
 },()=>({shape:'line',length:p.length,width:64}),{
  warnings:c=>{c.dives=[-1,1].map(sign=>{const angle=c.angle+sign*Math.PI/4;return {...at(c.target,-p.length/2,angle),angle};});
   return c.dives.map(dive=>({shape:'line',...dive,length:p.length,width:64}));}});}
const handlers={'sonic-screech':sonicScreech,'bat-swarm':batSwarm,'blood-dive':bloodDive,eclipse,'twin-dive':twinDive};
export default {id:'camazotz',entry:ctx=>entrance(ctx,'night'),move:pursue,abilities:ctx=>phaseAbilities(ctx,handlers)};
