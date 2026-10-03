import { FxDirector } from '../FxDirector.js';
import { KUKUL_DEFINITIONS } from '../../skills/generated/kukul.js';

const definitions=new Map(KUKUL_DEFINITIONS.map(skill=>[skill.id,skill]));
const params=id=>definitions.get(id).params;
const point=(s,c)=>({x:c.target?.x??c.x??s.player.x,y:c.target?.y??c.y??s.player.y});
const duration=(c,p,fallback=.35)=>c.duration??p.duration??fallback;
const image=(t,name,at,size,options={})=>t.image(name,at.x,at.y,{size,...options});
const fade=(s,sprite,seconds,{factor=1,delay=0,...changes}={})=>{
 s.tweens.add({targets:sprite,alpha:0,scaleX:sprite.scaleX*factor,scaleY:sprite.scaleY*factor,
  duration:Math.max(.04,seconds)*1000,delay:delay*1000,ease:'Sine.Out',...changes,onComplete:()=>sprite.destroy()});return sprite;
};
const hold=(s,sprite,seconds)=>fade(s,sprite,Math.min(.3,seconds),{delay:Math.max(0,seconds-.3)});
const puff=(s,t,name,at,size,seconds=.3,options={})=>fade(s,image(t,name,at,size,options),seconds,{factor:1.25});
const spin=(s,sprite,seconds,turns)=>s.tweens.add({targets:sprite,rotation:sprite.rotation+Math.PI*2*turns,duration:seconds*1000,ease:'Linear'});
const follow=(t,sprite,target,c={},extra={})=>t.follow(sprite,target,{isAlive:c.isAlive,replace:!!c.replace,...extra});
const recipe=(id,shape,motion,blendMode,palette,stages)=>({
 stills:definitions.get(id).kind==='active'?['main','accent']:['proc'],signature:{shape,motion,blendMode,palette},...stages,
});
function dart(s,c,t,name='main',width=64,height=18){
 const sprite=image(t,name,point(s,c),width,{width,height,angle:c.angle});
 if(c.target)follow(t,sprite,c.target,c,{update:(effect,shot)=>{const v=shot.body?.velocity;if(v&&Math.hypot(v.x,v.y)>0)effect.setRotation(Math.atan2(v.y,v.x));}});
 hold(s,sprite,duration(c,{},.8));return sprite;
}
function expand(s,sprite,seconds,start=.15){
 const x=sprite.scaleX,y=sprite.scaleY;sprite.setScale(x*start,y*start);
 s.tweens.add({targets:sprite,scaleX:x,scaleY:y,alpha:0,duration:seconds*1000,ease:'Linear',onComplete:()=>sprite.destroy()});return sprite;
}

// All spatial sizes come from the catalogue or the handler's scaled hit shape.
// Images are stills; movement here never changes a collision body or combat timer.
export const KUKUL_FX_RECIPES={
 'atlatl-volley':recipe('atlatl-volley','turquoise-red-fletched-dart','five body-tethered fan darts and short feather muzzle flash','ADD',['#3fd0d0','#d9413a'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,52,.18,{angle:c.angle});},
  travel(s,c,t){return dart(s,c,t);},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),44,.16);},
 }),
 featherstorm:recipe('featherstorm','red-white-feather-tornado','JSON four-second drifting funnel with outward feather ticks','NORMAL',['#a02a2a','#f4f0e6'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,55,.22);},
  travel(s,c,t){const p=params('featherstorm'),funnel=image(t,'main',point(s,c),(c.radius??p.radius)*2,{alpha:.83});
   hold(s,funnel,duration(c,p));return funnel;},
  impact(s,c,t){t.burst('accent',point(s,c).x,point(s,c).y,{count:3,lifespan:320,speed:90,scaleStart:.07});return puff(s,t,'accent',point(s,c),38,.2);},
 }),
 'serpent-path':recipe('serpent-path','sinuous-emerald-serpent-head','actual sinusoidal projectile path with sampled fading wavy tail','ADD',['#3de08f','#c8ffd8'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,48,.2);},
  travel(s,c,t){const head=image(t,'main',point(s,c),74,{width:74,height:40,angle:c.angle}),seconds=duration(c,{},1);
   let last={...point(s,c)},next=s.elapsed||0;
   if(c.target)follow(t,head,c.target,c,{update:(sprite,target)=>{
    const dx=target.x-last.x,dy=target.y-last.y;if(Math.hypot(dx,dy)>.1)sprite.setRotation(Math.atan2(dy,dx));
    if((s.elapsed||0)>=next){next=(s.elapsed||0)+.08;puff(s,t,'accent',last,58,.35,{width:58,height:28,angle:sprite.rotation,alpha:.4,depth:21});}
    last={x:target.x,y:target.y};
   }});hold(s,head,seconds);return head;},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),65,.24);},
 }),
 windstep:recipe('windstep','cyan-speed-ribbons-and-start-swirl','existing dash-time hero streak then JSON two-second hit-width ribbon','SCREEN',['#6ad0ff','#e8fbff'],{
  cast(s,c,t){puff(s,t,'accent',s.player,65,.24);const streak=image(t,'main',s.player,100,{width:100,height:34,angle:c.angle});
   follow(t,streak,s.player);hold(s,streak,c.duration??.24);return streak;},
  ground(s,c,t){const p=params('windstep'),range=c.range??p.range,angle=c.angle||0,at=point(s,c);
   const trail=image(t,'accent',at,range,
    {width:range,height:c.width??(s.player.body?.halfWidth??16)*2,angle,depth:8,alpha:.45});
   return fade(s,trail,1,{delay:Math.max(0,(c.duration??p.trailSeconds)-1)});},
  impact(s,c,t){return puff(s,t,'main',point(s,c),42,.15,{angle:c.angle});},
 }),
 'quetzal-flip':recipe('quetzal-flip','red-green-feather-arc','backflip arc tethered through existing dash time and takeoff feather scatter','ADD',['#d9413a','#3de08f'],{
  cast(s,c,t){t.burst('accent',s.player.x,s.player.y,{count:4,lifespan:350,speed:100,scaleStart:.07});
   const arc=image(t,'main',s.player,100,{angle:c.angle,alpha:.65});follow(t,arc,s.player);spin(s,arc,c.duration??.24,.5);hold(s,arc,c.duration??.24);return arc;},
  travel(s,c,t){return dart(s,c,t,'accent',54,18);},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),50,.2);},
 }),
 'hunter-snare':recipe('hunter-snare','woven-brown-net-and-sticky-grass','instant JSON r120 net unfolds over rooted grass, no added damage delay','NORMAL',['#a8743a','#3b2a1a'],{
  cast(s,c,t){return puff(s,t,'main',s.player,44,.16);},
  travel(s,c,t){const net=image(t,'main',point(s,c),(c.radius??params('hunter-snare').radius)*2,{alpha:.75});return expand(s,net,.3,.35);},
  ground(s,c,t){const p=params('hunter-snare'),grass=image(t,'accent',point(s,c),(c.radius??p.radius)*2,{depth:7,alpha:.45});hold(s,grass,c.duration??p.rootSeconds);return grass;},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),50,.24);},
 }),
 'eagle-eye':recipe('eagle-eye','gold-eye-and-white-beam-tip','JSON 0.6-second shrinking target focus then body-attached narrow beam','ADD',['#ffd45a','#ffffff'],{
  cast(s,c,t){return puff(s,t,'main',point(s,c),42,.16);},
  aura(s,c,t){const eye=image(t,'main',point(s,c),70,{alpha:.9});if(c.target)follow(t,eye,c.target,c,{offsetY:-28});
   return fade(s,eye,c.duration??params('eagle-eye').focusSeconds,{factor:.45});},
  travel(s,c,t){return dart(s,c,t,'accent',96,12);},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),65,.16,{height:32});},
 }),
 'sun-dart':recipe('sun-dart','sun-gold-dart-and-angular-burst','actual previous-target bounce links with quarter-second sun flashes','ADD',['#ffd45a','#ff8a1f'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,42,.15);},
  travel(s,c,t){const from=c.from||s.player,to=c.to||point(s,c),length=Math.hypot(to.x-from.x,to.y-from.y),angle=Math.atan2(to.y-from.y,to.x-from.x);
   const bolt=image(t,'main',from,55,{width:55,height:16,angle});
   s.tweens.add({targets:bolt,x:to.x,y:to.y,duration:120,alpha:0,onComplete:()=>bolt.destroy()});
   puff(s,t,'accent',{x:(from.x+to.x)/2,y:(from.y+to.y)/2},length||32,.14,{width:length||32,height:12,angle,alpha:.45});return bolt;},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),58,.23);},
 }),
 'storm-nest':recipe('storm-nest','egg-nest-with-blue-gale','JSON eight-second anchored nest, pulsing gale and actual sentry darts','SCREEN',['#7fb8ff','#a8743a'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,50,.22);},
  ground(s,c,t){const nest=image(t,'main',point(s,c),72,{depth:9,alpha:.85});
   s.tweens.add({targets:nest,scaleX:nest.scaleX*1.04,scaleY:nest.scaleY*.97,duration:400,yoyo:true,repeat:-1});hold(s,nest,duration(c,params('storm-nest')));return nest;},
  travel(s,c,t){return dart(s,c,t,'accent',48,16);},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),35,.18);},
 }),
 'plume-guard':recipe('plume-guard','three-quetzal-guard-feathers','JSON eight-second handler-owned three-charge orbit and green feather pop','ADD',['#3de08f','#d9413a'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,60,.2);},
  aura(s,c,t){const feather=image(t,'main',point(s,c),44);hold(s,feather,duration(c,params('plume-guard')));return feather;},
  impact(s,c,t){return puff(s,t,'accent',s.player,76,.18);},
 }),
 'cacao-bomb':recipe('cacao-bomb','fused-clay-pot-and-bean-shrapnel','JSON 0.7-second handler-owned parabolic pot, ground shadow and r150 blast','NORMAL',['#a85a2a','#ffb347'],{
  cast(s,c,t){return puff(s,t,'main',s.player,38,.15);},
  travel(s,c,t){const pot=image(t,'main',point(s,c),46);spin(s,pot,duration(c,params('cacao-bomb')),.25);hold(s,pot,duration(c,params('cacao-bomb')));return pot;},
  ground(s,c,t){const p=params('cacao-bomb'),shadow=image(t,'accent',point(s,c),(c.radius??p.radius)*2,
    {width:(c.radius??p.radius)*2,height:28,depth:7,tint:0x3b2a1a,alpha:.18});hold(s,shadow,duration(c,p));return shadow;},
  impact(s,c,t){const r=c.radius??params('cacao-bomb').radius;
   t.burst('accent',point(s,c).x,point(s,c).y,{count:4,lifespan:330,speed:150,scaleStart:.08,blendMode:'NORMAL'});
   return expand(s,image(t,'accent',point(s,c),r*2,{alpha:.85}),.35,.2);},
 }),
 'forked-flight':recipe('forked-flight','turquoise-dart-and-white-fork-flash','real parent travels to JSON 0.4-second split, three attached child paths','ADD',['#3fd0d0','#ffffff'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,45,.12);},
  travel(s,c,t){return dart(s,c,t,'main',60,18);},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),64,.2,{angle:c.angle});},
 }),
 'gale-ring':recipe('gale-ring','white-blue-leaf-debris-ring','existing 0.4-second linear radial hit front out to JSON r250','SCREEN',['#cfeaff','#6ad0ff'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,60,.15);},
  ground(s,c,t){return expand(s,image(t,'main',point(s,c),(c.radius??params('gale-ring').range)*2,{depth:8,alpha:.8}),c.duration??.4,0);},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),50,.28);},
 }),
 'hunters-trance':recipe('hunters-trance','golden-eyes-and-orbiting-reticle','JSON six-second hero-tethered reticle rotation with glowing eye strip','ADD',['#ffd45a','#fff2b0'],{
  cast(s,c,t){return puff(s,t,'main',s.player,46,.18);},
  aura(s,c,t){const seconds=duration(c,params('hunters-trance')),reticle=image(t,'accent',s.player,96,{alpha:.4});
   follow(t,reticle,c.target||s.player,c);spin(s,reticle,seconds,1);hold(s,reticle,seconds);
   const eyes=image(t,'main',{x:s.player.x,y:s.player.y-15},30,{width:30,height:12,alpha:.75});
   follow(t,eyes,c.target||s.player,{isAlive:()=>reticle.active},{offsetY:-15});hold(s,eyes,seconds);return reticle;},
 }),
 skyfall:recipe('skyfall','red-target-circle-and-smoky-falling-dart','JSON 0.6-second telegraph then twelve impacts across 1.5 seconds, r50 dust','NORMAL',['#d9413a','#3b2a1a'],{
  cast(s,c,t){const p=params('skyfall');if(s.add.rectangle&&s.fx?.track){
    const shade=s.add.rectangle(s.scale.width/2,s.scale.height/2,s.scale.width,s.scale.height,0x000000,.16).setScrollFactor(0).setDepth(21);
    s.fx.track(shade);hold(s,shade,(c.duration??p.telegraphSeconds)+p.duration);
   }return puff(s,t,'accent',s.player,40,.18);},
  ground(s,c,t){const marker=image(t,'accent',point(s,c),(c.radius??params('skyfall').radius)*2,{depth:8,alpha:.65});
   hold(s,marker,c.duration??params('skyfall').telegraphSeconds);return marker;},
  travel(s,c,t){const at=point(s,c),shot=image(t,'main',{x:at.x,y:at.y-110},90,{width:90,height:20,angle:Math.PI/2});
   s.tweens.add({targets:shot,y:at.y,alpha:0,duration:150,ease:'Cubic.In',onComplete:()=>shot.destroy()});return shot;},
  impact(s,c,t){return expand(s,image(t,'accent',point(s,c),(c.radius??params('skyfall').radius)*2,{alpha:.85}),.3,.3);},
 }),
 'kukulkans-breath':recipe('kukulkans-breath','quetzal-serpent-head-and-scaled-tricolour-beam','JSON 520-by-60 body-origin-tethered beam, 0.15-second brightness ticks','ADD',['#3de08f','#ffd45a'],{
  cast(s,c,t){return puff(s,t,'accent',s.player,64,.15,{angle:c.angle});},
  aura(s,c,t){const p=params('kukulkans-breath'),range=c.range??p.range,width=c.width??p.width,angle=c.angle||0,seconds=duration(c,p),
    beam=image(t,'main',s.player,range,{width:range,height:width,angle,alpha:.75});
   follow(t,beam,c.target||s.player,c,{update:(sprite,hero)=>sprite.setPosition(hero.x+Math.cos(angle)*range/2,hero.y+Math.sin(angle)*range/2)});
   s.tweens.add({targets:beam,alpha:.5,duration:p.interval*1000/2,yoyo:true,repeat:-1});hold(s,beam,seconds);
   const head=image(t,'accent',s.player,64,{angle});follow(t,head,c.target||s.player,{isAlive:()=>beam.active});hold(s,head,seconds);return beam;},
  impact(s,c,t){return puff(s,t,'accent',point(s,c),38,.12,{angle:c.angle});},
 }),
 'sharpened-flint':recipe('sharpened-flint','white-flint-tip-glint','short actual-dart-tip attached white glint','ADD',['#ffffff','#c9d4df'],{
  proc(s,c,t){const glint=image(t,'proc',point(s,c),32,{angle:(c.angle||0)+Math.PI/4});
   if(c.target)follow(t,glint,c.target,{isAlive:c.isAlive},{offsetX:Math.cos(c.angle||0)*18,offsetY:Math.sin(c.angle||0)*18});return fade(s,glint,c.duration??.1);},
 }),
 'venomous-darts':recipe('venomous-darts','three-emerald-poison-droplets','hit-target droplets drip downward with stack-weighted opacity','ADD',['#3de08f','#c8ffd8'],{
  proc(s,c,t){const drops=image(t,'proc',point(s,c),34,{alpha:.5+Math.min(3,c.stacks??1)*.12});
   return fade(s,drops,.4,{y:drops.y+16,factor:.65});},
 }),
 'full-quiver':recipe('full-quiver','flashing-red-feather-quiver','sixth-basic-shot quiver rises above the hero','SCREEN',['#d9413a','#ffd45a'],{
  proc(s,c,t){const quiver=image(t,'proc',{x:s.player.x,y:s.player.y-26},42);return fade(s,quiver,.3,{y:quiver.y-15,factor:1.1});},
 }),
 'hunters-focus':recipe('hunters-focus','crosshair-stack-pips','enemy-tethered reticle pips brighten with actual focus stacks','ADD',['#d9413a','#ffb3a0'],{
  proc(s,c,t){const pips=image(t,'proc',point(s,c),38,{alpha:.35+Math.min(5,c.stacks??1)*.12});
   if(c.target)follow(t,pips,c.target,{isAlive:c.isAlive},{offsetY:-30});return fade(s,pips,.4);},
 }),
 'fleet-hunter':recipe('fleet-hunter','white-dart-wind-swirl','next basic attack wind swirl follows its actual dart lifetime','SCREEN',['#e8fbff','#6ad0ff'],{
  proc(s,c,t){const wind=image(t,'proc',point(s,c),46,{angle:c.angle});if(c.target)follow(t,wind,c.target,{isAlive:c.isAlive});
   spin(s,wind,.35,.6);return fade(s,wind,Math.min(.5,c.duration??.3));},
 }),
 'jungle-instinct':recipe('jungle-instinct','leaf-burst-and-ghost-outline','successful dodge leaves a fading leaf ghost offset from the moving hero','SCREEN',['#3de08f','#e8fff6'],{
  proc(s,c,t){const ghost=image(t,'proc',s.player,78,{alpha:.65});
   follow(t,ghost,s.player,{}, {offsetX:-14});return fade(s,ghost,.4,{factor:1.15});},
 }),
 'trophy-hunter':recipe('trophy-hunter','golden-trophy-feathers','tough-enemy death feather burst rises from actual kill position','ADD',['#ffd45a','#ff8a1f'],{
  proc(s,c,t){t.burst('proc',point(s,c).x,point(s,c).y,{count:3,lifespan:500,speed:90,scaleStart:.14});
   const trophy=image(t,'proc',point(s,c),60);return fade(s,trophy,.6,{y:trophy.y-26,factor:.8});},
 }),
 'steady-aim':recipe('steady-aim','thin-jade-stationary-reticle-ring','stationary-ready actor ring persists until movement, then tears down','ADD',['#3de08f','#ffffff'],{
  aura(s,c,t){const ring=image(t,'proc',s.player,80,{alpha:.45,depth:8});follow(t,ring,c.target||s.player,c);
   if(!c.isAlive)hold(s,ring,c.duration??.6);return ring;},
  proc(s,c,t){return puff(s,t,'proc',s.player,80,.2,{depth:8,alpha:.6});},
 }),
};
export const KUKUL_FX_IDS=Object.keys(KUKUL_FX_RECIPES);
for(const [id,value] of Object.entries(KUKUL_FX_RECIPES))FxDirector.register(id,value);
