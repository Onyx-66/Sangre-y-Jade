import { timedEffect, damageArea } from '../common.js';
export const radians = degrees => degrees * Math.PI / 180;
export const within = (scene, range, origin=scene.player) => scene.enemies.getChildren().filter(enemy=>enemy.active&&Math.hypot(enemy.x-origin.x,enemy.y-origin.y)<=range);
export const nearest = (scene,range,origin=scene.player) => within(scene,range,origin).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y))[0];
export function segmentDistance(point,start,end) {
 const dx=end.x-start.x,dy=end.y-start.y,length=dx*dx+dy*dy;
 const along=length?Math.max(0,Math.min(1,((point.x-start.x)*dx+(point.y-start.y)*dy)/length)):0;
 return Math.hypot(point.x-start.x-along*dx,point.y-start.y-along*dy);
}
export function present(scene, skill, stage='cast', ctx={}) {
 const point=ctx.target||scene.player;
 const sprite=scene.fx?.play(skill.id,stage,{x:point.x,y:point.y,tint:skill.palette?.[0],...ctx});
 if(stage==='cast')scene.skillAudio?.play(skill.id,'cast');
 else if(stage==='impact')scene.skillAudio?.play(skill.id,'hit');
 return sprite;
}
export function proc(scene, passive, point=scene.player, sound=true, fxContext={}) {
 scene.fx?.play(passive.id,'proc',{x:point.x,y:point.y,sound,...fxContext});
 if(sound)scene.skillAudio?.play(passive.id,'proc');
}
export function skillModifiers(scene) {
 const result={speedMult:1,attackSpeedMult:1};
 for(const entry of scene.skillBuffs?.values()||[])for(const [key,value]of Object.entries(entry))result[key]=key.endsWith('Mult')?(result[key]??1)*value:(result[key]??0)+value;
 return result;
}
export function buff(scene,id,values,duration) {
 scene.skillBuffs??=new Map();scene.skillBuffs.set(id,values);
 return timedEffect(scene,duration,[],()=>{},()=>{if(scene.skillBuffs.get(id)===values)scene.skillBuffs.delete(id);});
}
export function pulses(scene,duration,interval,hit) {
 let elapsed=0,next=interval,index=0;
 return timedEffect(scene,duration,[],dt=>{elapsed+=dt;while(next<=elapsed+1e-9){hit(++index);next+=interval;}});
}
export function motion(scene, destination, duration, {onStep=()=>{},onEnd=()=>{},airborne=false}={}) {
 scene.skillMotion?.effect.destroy();
 const origin={x:scene.player.x,y:scene.player.y};let elapsed=0;
 const state={};scene.skillMotion=state;
 if(airborne)scene.stats.intangibleUntil=Math.max(scene.stats.intangibleUntil,scene.elapsed+duration);
 state.effect=timedEffect(scene,duration,[],dt=>{
  elapsed+=dt;const ratio=Math.min(1,elapsed/duration);
  scene.player.setPosition(origin.x+(destination.x-origin.x)*ratio,origin.y+(destination.y-origin.y)*ratio).setVelocity(0,0);
  onStep(ratio);
 },()=>{if(scene.skillMotion===state)scene.skillMotion=null;if(!scene.ended)onEnd();});
 return state.effect;
}
export function inMirrorArc(scene,projectile) {
 const mirror=scene.blackMirror;if(!mirror||scene.elapsed>=scene.stats.reflectUntil)return !mirror;
 const velocity=projectile.body.velocity;
 const incoming=Math.atan2(-velocity.y,-velocity.x);
 const difference=Math.atan2(Math.sin(incoming-mirror.angle),Math.cos(incoming-mirror.angle));
 return Math.abs(difference)<=radians(mirror.arcDegrees)/2;
}
export function detonateWard(scene,ward) {
 if(ward.fired)return;ward.fired=true;
 scene.stats.shield=Math.max(0,scene.stats.shield-ward.remaining);
 if(scene.balamWard===ward)scene.balamWard=null;
 scene.skillAudio?.stop(ward.skill.id);
 if(scene.ended)return;
 damageArea(scene,scene.player,ward.range,ward.damage);present(scene,ward.skill,'impact',{scale:ward.range/100,range:ward.range,radius:ward.range});
}
