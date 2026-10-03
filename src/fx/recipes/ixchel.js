import { FxDirector } from '../FxDirector.js';
import { IXCHEL_FX_DEFINITIONS } from '../generated/ixchel.js';

const definitions=new Map(IXCHEL_FX_DEFINITIONS.map(value=>[value.id,value]));
const params=id=>definitions.get(id).params;
const at=(scene,ctx)=>({x:ctx.target?.x??ctx.x??scene.player.x,y:ctx.target?.y??ctx.y??scene.player.y});
const life=(ctx,p,fallback=.4)=>ctx.duration??p.duration??fallback;
const radius=(ctx,p)=>ctx.radius??p.radius;
const image=(stills,name,point,size,options={})=>stills.image(name,point.x,point.y,{size,...options});
const fade=(scene,sprite,seconds,{factor=1,delay=0,...changes}={})=>{
  scene.tweens.add({targets:sprite,alpha:0,scaleX:sprite.scaleX*factor,scaleY:sprite.scaleY*factor,
    duration:Math.max(.04,seconds)*1000,delay:delay*1000,ease:'Sine.Out',...changes,onComplete:()=>sprite.destroy()});return sprite;
};
const hold=(scene,sprite,seconds)=>fade(scene,sprite,Math.min(1,seconds),{delay:Math.max(0,seconds-1)});
const follow=(stills,sprite,target,ctx={})=>stills.follow(sprite,target,{isAlive:ctx.isAlive,replace:!!ctx.replace});
const spin=(scene,sprite,seconds,turns=1)=>scene.tweens.add({targets:sprite,rotation:sprite.rotation+Math.PI*2*turns,
  duration:seconds*1000,ease:'Linear'});
const schedule=(scene,seconds,callback)=>scene.time.delayedCall(seconds*1000,()=>{if(!scene.ended)callback();});
const puff=(scene,stills,name,point,size,seconds=.35,options={})=>fade(scene,image(stills,name,point,size,options),seconds,{factor:1.25});
const recipe=(id,shape,motion,blendMode,palette,stages)=>({
  stills:definitions.get(id).kind==='active'?['main','accent']:['proc'],signature:{shape,motion,blendMode,palette},...stages,
});
function line(scene,ctx,stills,name,options={}){
  const origin=ctx.from||scene.player,destination=ctx.target||{x:ctx.x,y:ctx.y},length=Math.hypot(destination.x-origin.x,destination.y-origin.y);
  const point={x:(origin.x+destination.x)/2,y:(origin.y+destination.y)/2};
  return puff(scene,stills,name,point,length||32,options.seconds??.3,{width:length||32,height:options.height??30,
    angle:Math.atan2(destination.y-origin.y,destination.x-origin.x),...options});
}
function hudTarget(scene,selector){
  const element=scene.hud?.el?.querySelector(selector),canvas=scene.game?.canvas;
  if(!element||!canvas)return scene.player;
  const position=()=>{const rect=element.getBoundingClientRect(),bounds=canvas.getBoundingClientRect();
    return scene.cameras.main.getWorldPoint((rect.x+rect.width/2-bounds.x)*scene.scale.width/bounds.width,
      (rect.y+rect.height/2-bounds.y)*scene.scale.height/bounds.height);};
  return {get x(){return position().x;},get y(){return position().y;},active:true};
}
const toMana=(scene,ctx,stills,name='proc')=>{
  const start=at(scene,ctx),destination=hudTarget(scene,'.mana'),spark=image(stills,name,start,38,{depth:40});
  scene.tweens.add({targets:spark,x:destination.x,y:destination.y,alpha:0,scaleX:spark.scaleX*.4,scaleY:spark.scaleY*.4,
    duration:500,ease:'Cubic.In',onComplete:()=>spark.destroy()});return spark;
};

export const IXCHEL_FX_RECIPES={
  'copal-star':recipe('copal-star','pentagonal-copal-star-and-smoke','spinning attached star, JSON two-second smoke linger','ADD',['#9ef0c8','#5c6b66'],{
    cast(s,c,t){return puff(s,t,'main',s.player,38,.16);},
    travel(s,c,t){const p=params('copal-star'),seconds=life(c,p,.7),star=image(t,'main',at(s,c),52,{angle:c.angle});
      if(c.target)follow(t,star,c.target,c);spin(s,star,seconds,seconds*2);hold(s,star,seconds);return star;},
    ground(s,c,t){const p=params('copal-star');return fade(s,image(t,'accent',at(s,c),c.width??40,{alpha:.35,depth:8,blendMode:'NORMAL'}),c.duration??p.trailSeconds,{factor:1.4});},
    impact(s,c,t){return puff(s,t,'main',at(s,c),60,.18);},
  }),
  'jade-halo':recipe('jade-halo','jade-beads-circular-trail','JSON seven-second orbit at r125 and contact bead-pop','ADD',['#4fd6a0','#e8fff6'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,55,.2);},
    travel(s,c,t){const bead=image(t,'main',at(s,c),40);if(c.target)follow(t,bead,c.target,c);hold(s,bead,life(c,params('jade-halo'),.6));return bead;},
    aura(s,c,t){const p=params('jade-halo'),r=radius(c,p),seconds=life(c,p),count=c.count??p.beads;
      return Array.from({length:count},(_,i)=>{const bead=image(t,'main',s.player,40),start=s.elapsed||0;
        t.follow(bead,s.player,{update:(sprite,hero)=>{const angle=((s.elapsed||0)-start)/p.revolutionSeconds*Math.PI*2+i/count*Math.PI*2;
          sprite.setPosition(hero.x+Math.cos(angle)*r,hero.y+Math.sin(angle)*r).setRotation(angle);}});hold(s,bead,seconds);return bead;});},
    impact(s,c,t){return puff(s,t,'accent',at(s,c),c.blocked?66:48,.14);},
  }),
  'ancestor-flame':recipe('ancestor-flame','jagged-spirit-flame-link','instant actual-target chain then half-second node flicker','ADD',['#3de0b0','#1a6f8f'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,46,.18);},
    travel(s,c,t){return line(s,c,t,'main',{seconds:.28,height:34});},
    impact(s,c,t){const flame=image(t,'accent',at(s,c),64);spin(s,flame,.5,.06);
      t.burst('accent',at(s,c).x,at(s,c).y,{count:3,lifespan:500,speed:45,scaleStart:.06});return fade(s,flame,.5,{factor:.7});},
  }),
  moonwell:recipe('moonwell','moon-reflection-water-pool','JSON anchored r145 pool, silver ripples, fade in final second','SCREEN',['#8ec5ff','#e8f2ff'],{
    cast(s,c,t){return puff(s,t,'accent',at(s,c),46,.3);},
    ground(s,c,t){const p=params('moonwell'),seconds=life(c,p),pool=image(t,'main',at(s,c),radius(c,p)*2,{depth:7,alpha:.68});
      if(c.replace&&c.target)follow(t,pool,c.target,c);
      hold(s,pool,seconds);const ripples=image(t,'accent',at(s,c),radius(c,p),{depth:9,alpha:.48});
      spin(s,ripples,seconds,.18);hold(s,ripples,seconds);return[pool,ripples];},
    impact(s,c,t){return puff(s,t,'accent',at(s,c),52,.25);},
  }),
  'censer-wave':recipe('censer-wave','rolling-incense-cone','directional expanding cone, trailing smoky ring','NORMAL',['#b8c9bd','#6f8f7f'],{
    cast(s,c,t){const p=params('censer-wave'),reach=c.range??p.range,angle=c.angle||0;
      const cloud=image(t,'main',{x:s.player.x+Math.cos(angle)*reach/2,y:s.player.y+Math.sin(angle)*reach/2},reach,
        {width:reach,height:2*reach*Math.sin((c.arcDegrees??p.arcDegrees)*Math.PI/360),angle,alpha:.82});
      return fade(s,cloud,.45,{factor:1});},
    impact(s,c,t){return puff(s,t,'accent',at(s,c),78,.55,{alpha:.45});},
  }),
  'verdant-mercy':recipe('verdant-mercy','flowering-sprout-glade','JSON six-second anchored healing ring and leaf column','SCREEN',['#7be0a0','#ff9ccf'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,65,.25);},
    ground(s,c,t){const p=params('verdant-mercy'),seconds=life(c,p),r=radius(c,p),flower=image(t,'main',at(s,c),r*2,{depth:7,alpha:.8});
      const x=flower.scaleX,y=flower.scaleY;flower.setScale(x*.65,y*.65);s.tweens.add({targets:flower,scaleX:x,scaleY:y,duration:300});hold(s,flower,seconds);
      const column=image(t,'accent',at(s,c),r,{width:r*.55,height:r*1.6,alpha:.4});hold(s,column,seconds);return[flower,column];},
    aura(s,c,t){return puff(s,t,'accent',at(s,c),66,.4);},
  }),
  'copal-veil':recipe('copal-veil','grey-violet-smoke-dome','JSON six-second actor tether, absorbed-hit sparks to mana','SCREEN',['#8f86b8','#6ad0ff'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,48,.25);},
    aura(s,c,t){const dome=image(t,'main',s.player,112,{alpha:.5});follow(t,dome,c.target||s.player,c);hold(s,dome,life(c,params('copal-veil')));return dome;},
    impact(s,c,t){return toMana(s,c,t,'accent');},
  }),
  'glyph-comet':recipe('glyph-comet','long-jade-comet-and-carved-line','JSON 500-by-80 line, head travel, three-second scorch decals','ADD',['#3de0b0','#f5e6a0'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,60,.15);},
    travel(s,c,t){const p=params('glyph-comet'),comet=image(t,'main',at(s,c),100,{width:136,height:50,angle:c.angle||0});
      if(c.target){follow(t,comet,c.target,c);hold(s,comet,life(c,p,.7));}
      else{const range=c.range??p.range;s.tweens.add({targets:comet,x:comet.x+Math.cos(c.angle||0)*range,y:comet.y+Math.sin(c.angle||0)*range,
        duration:400,alpha:0,onComplete:()=>comet.destroy()});}return comet;},
    ground(s,c,t){const p=params('glyph-comet'),range=c.range??p.range,width=c.width??p.width,angle=c.angle||0,start=at(s,c),seconds=c.duration??p.decalSeconds;
      return Array.from({length:5},(_,i)=>{const along=(i+.5)*range/5,glyph=image(t,'accent',{x:start.x+Math.cos(angle)*along,y:start.y+Math.sin(angle)*along},width,
        {width:range/5,height:width,angle,depth:8,alpha:.36});hold(s,glyph,seconds);return glyph;});},
    impact(s,c,t){t.burst('accent',at(s,c).x,at(s,c).y,{count:4,lifespan:260,speed:130,scaleStart:.08});return puff(s,t,'accent',at(s,c),88,.25);},
  }),
  'cacao-bloom':recipe('cacao-bloom','opening-cacao-pod-flower-and-spores','JSON 0.8-second flower telegraph then r70 spore burst','NORMAL',['#7a4a2b','#ff9ccf'],{
    cast(s,c,t){return puff(s,t,'main',s.player,60,.18);},
    ground(s,c,t){const p=params('cacao-bloom'),flower=image(t,'main',at(s,c),radius(c,p)*2,{depth:8,alpha:.8});
      const x=flower.scaleX,y=flower.scaleY;flower.setScale(x*.2,y*.2);s.tweens.add({targets:flower,scaleX:x,scaleY:y,duration:(c.duration??p.delay)*1000,ease:'Back.Out'});
      schedule(s,c.duration??p.delay,()=>flower.destroy());return flower;},
    impact(s,c,t){const p=params('cacao-bloom'),spores=image(t,'accent',at(s,c),radius(c,p)*2,{alpha:.8});
      return fade(s,spores,.65,{factor:1,x:spores.x+32,y:spores.y-16});},
  }),
  raincaller:recipe('raincaller','blue-storm-cloud-yellow-lightning','JSON drifting cloud and 0.7-second lightning cadence','SCREEN',['#3f6fb5','#fff3a0'],{
    cast(s,c,t){return puff(s,t,'main',at(s,c),80,.25);},
    ground(s,c,t){const cloud=image(t,'main',at(s,c),c.width??140,{alpha:.65});if(c.target)follow(t,cloud,c.target,c);hold(s,cloud,life(c,params('raincaller')));return cloud;},
    travel(s,c,t){const cloud=image(t,'main',at(s,c),c.width??140,{alpha:.6});if(c.target)follow(t,cloud,c.target,c);hold(s,cloud,life(c,params('raincaller')));return cloud;},
    impact(s,c,t){const bolt=image(t,'accent',{x:at(s,c).x,y:at(s,c).y-30},100,{alpha:1});
      s.tweens.add({targets:bolt,alpha:.15,duration:60,yoyo:true,repeat:1,onComplete:()=>bolt.destroy()});
      t.burst('accent',at(s,c).x,at(s,c).y,{count:3,lifespan:180,speed:85,scaleStart:.05});return bolt;},
  }),
  'spirit-familiar':recipe('spirit-familiar','iridescent-hummingbird-and-dive-streak','JSON ten-second familiar, wing-scale flap and 0.6-second dives','ADD',['#4fe0c8','#ff6fb0'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,62,.3);},
    aura(s,c,t){const bird=image(t,'main',at(s,c),64);follow(t,bird,c.target||s.player,c);const x=bird.scaleX;
      s.tweens.add({targets:bird,scaleX:x*.75,duration:80,yoyo:true,repeat:-1});hold(s,bird,life(c,params('spirit-familiar')));return bird;},
    travel(s,c,t){const trail=image(t,'accent',at(s,c),90,{angle:c.angle||0});if(c.target)follow(t,trail,c.target,c);return fade(s,trail,life(c,params('spirit-familiar'),.3));},
    impact(s,c,t){return puff(s,t,'accent',at(s,c),48,.18);},
  }),
  'serpent-coil':recipe('serpent-coil','six-segment-translucent-serpent-spiral','JSON r135 spiral tightens over 0.6-second pull then hiss','ADD',['#4fd68f','#c8ffd8'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,40,.2);},
    ground(s,c,t){const p=params('serpent-coil'),coil=image(t,'main',at(s,c),radius(c,p)*2,{alpha:.78,depth:8});
      if(c.replace&&c.target)follow(t,coil,c.target,c);
      spin(s,coil,c.duration??p.pullSeconds,.5);fade(s,coil,c.duration??p.pullSeconds,{factor:.4});return coil;},
    impact(s,c,t){return puff(s,t,'accent',at(s,c),(radius(c,params('serpent-coil'))||70),.28);},
  }),
  'jade-needles':recipe('jade-needles','thin-radial-jade-needles-and-glass-shards','attached needles then JSON 1.5-second stuck glow and r50 shatter','ADD',['#7bf0c0','#d8fff0'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,48,.12);},
    travel(s,c,t){const needle=image(t,'main',at(s,c),52,{width:52,height:14,angle:c.angle||0});if(c.target)follow(t,needle,c.target,c);hold(s,needle,life(c,params('jade-needles'),.65));return needle;},
    aura(s,c,t){const p=params('jade-needles'),needle=image(t,'main',at(s,c),44,{angle:c.angle||0,alpha:.8});
      if(c.target)follow(t,needle,c.target,c);hold(s,needle,c.duration??p.delay);return needle;},
    impact(s,c,t){const p=params('jade-needles'),burst=image(t,'accent',at(s,c),radius(c,p)*2);fade(s,burst,.23);return burst;},
  }),
  dreamwalk:recipe('dreamwalk','paired-violet-mist-afterimages','JSON 1.5-second phase haze and r120 return ripple','SCREEN',['#9a8cff','#d8d0ff'],{
    cast(s,c,t){return puff(s,t,'main',s.player,70,.2);},
    aura(s,c,t){return[-16,16].map(offset=>{const mist=image(t,'main',s.player,82,{alpha:.28});
      t.follow(mist,c.target||s.player,{offsetX:offset,offsetY:-8,isAlive:c.isAlive});hold(s,mist,life(c,params('dreamwalk')));return mist;});},
    travel(s,c,t){return puff(s,t,'main',at(s,c),72,.35,{alpha:.4});},
    impact(s,c,t){const r=radius(c,params('dreamwalk')),ring=image(t,'accent',at(s,c),r*2,{depth:8});
      const x=ring.scaleX,y=ring.scaleY;ring.setScale(x*.25,y*.25);s.tweens.add({targets:ring,scaleX:x,scaleY:y,alpha:0,duration:350,onComplete:()=>ring.destroy()});return ring;},
  }),
  'four-directions':recipe('four-directions','four-colour-cardinal-ground-cross','cardinal east-red north-white west-dark south-gold bolts','ADD',['#d9413a','#f2f2f2','#1a1a1a','#ffd45a'],{
    cast(s,c,t){return puff(s,t,'main',s.player,120,.3,{depth:8});},
    travel(s,c,t){const angle=c.angle||0,index=((Math.round(angle/(Math.PI/2))%4)+4)%4,
      colors=[0xd9413a,0xffd45a,0x1a1a1a,0xf2f2f2],
      outline=index===2?image(t,'accent',at(s,c),80,{width:80,height:30,angle,tint:0xf2f2f2,depth:22,blendMode:'NORMAL'}):null,
      bolt=image(t,'accent',at(s,c),74,{width:74,height:24,angle,tint:colors[index],blendMode:index===2?'NORMAL':'ADD'});
      for(const sprite of [outline,bolt].filter(Boolean)){
        if(c.target){follow(t,sprite,c.target,c);hold(s,sprite,life(c,params('four-directions'),.8));}
        else{s.tweens.add({targets:sprite,x:sprite.x+Math.cos(angle)*(c.range??params('four-directions').range),y:sprite.y+Math.sin(angle)*(c.range??params('four-directions').range),alpha:0,duration:650,onComplete:()=>sprite.destroy()});}
      }return bolt;},
    impact(s,c,t){return puff(s,t,'accent',at(s,c),42,.18,{angle:c.angle||0,tint:c.tint});},
  }),
  'ixchels-mantle':recipe('ixchels-mantle','empty-starry-silver-blue-cloak','JSON six-second draped mantle, floating constellation and mana glow','SCREEN',['#8ec5ff','#f5f0ff'],{
    cast(s,c,t){return puff(s,t,'accent',s.player,62,.24);},
    aura(s,c,t){const p=params('ixchels-mantle'),seconds=life(c,p),cloak=image(t,'main',s.player,110,{alpha:.58});
      follow(t,cloak,c.target||s.player,c);hold(s,cloak,seconds);const stars=image(t,'accent',s.player,136,{alpha:.58});
      follow(t,stars,c.target||s.player,c);spin(s,stars,seconds,.15);hold(s,stars,seconds);
      const glow=image(t,'accent',hudTarget(s,'.mana'),72,{alpha:.45,depth:40});follow(t,glow,hudTarget(s,'.mana'));hold(s,glow,seconds);return[cloak,stars,glow];},
  }),
  'ancestral-echo':recipe('ancestral-echo','pale-blue-ghost-flame-arc','target-to-target spectral link with shrinking endpoints','ADD',['#bde8ff','#3f8dff'],{
    proc(s,c,t){return line(s,c,t,'proc',{seconds:.36,height:24});},
  }),
  'mana-spring':recipe('mana-spring','rising-blue-droplet-cluster','last-victim droplets curve into the mana HUD','ADD',['#4caaff','#c9efff'],{
    proc(s,c,t){return toMana(s,c,t);},
  }),
  'lunar-boon':recipe('lunar-boon','silver-crescent-ready-flash','HUD crescent when ready, one-shot moon consumption flash','SCREEN',['#d8e6f0','#8ec5ff'],{
    aura(s,c,t){const target=hudTarget(s,'.skills'),moon=image(t,'proc',target,42,{depth:40,alpha:.82});
      follow(t,moon,target);hold(s,moon,c.duration??1);return moon;},
    proc(s,c,t){return puff(s,t,'proc',hudTarget(s,'.skills'),68,.25,{depth:40});},
  }),
  'rooted-meditation':recipe('rooted-meditation','root-and-leaf-foot-horseshoe','low stationary root halo, short fade on motion','NORMAL',['#734722','#7de0a0'],{
    aura(s,c,t){const roots=image(t,'proc',s.player,78,{depth:8,alpha:.7});
      t.follow(roots,c.target||s.player,{offsetY:16,isAlive:c.isAlive});hold(s,roots,c.duration??.65);return roots;},
    proc(s,c,t){return puff(s,t,'proc',{x:s.player.x,y:s.player.y+16},78,.4,{depth:8});},
  }),
  'jade-resilience':recipe('jade-resilience','stacked-jade-crystal-half-crown','crystal facet layers brighten with growing shield ratio','SCREEN',['#4fd6a0','#e8fff6'],{
    aura(s,c,t){const ratio=Math.max(0,Math.min(1,c.progress??1)),facets=image(t,'proc',s.player,82+ratio*26,{alpha:.2+ratio*.45});
      follow(t,facets,c.target||s.player,c);hold(s,facets,c.duration??.75);return facets;},
    proc(s,c,t){return puff(s,t,'proc',s.player,100,.32);},
  }),
  'spirit-harvest':recipe('spirit-harvest','upright-pale-green-wisp','corpse wisp rises with curl, pickup collapses into sparkle','ADD',['#b2f0a0','#f0ffe8'],{
    proc(s,c,t){const wisp=image(t,'proc',at(s,c),54,{alpha:.9});return fade(s,wisp,.85,{y:wisp.y-46,factor:.65});},
    impact(s,c,t){return puff(s,t,'proc',at(s,c),42,.2);},
  }),
  'crescent-blessing':recipe('crescent-blessing','blue-diamond-comet-sparkle','crit-target blue sparkle arcs back to the hero','ADD',['#4daaff','#e8f2ff'],{
    proc(s,c,t){const spark=image(t,'proc',at(s,c),42,{angle:Math.atan2(s.player.y-at(s,c).y,s.player.x-at(s,c).x)});
      s.tweens.add({targets:spark,x:s.player.x,y:s.player.y,alpha:0,duration:320,ease:'Sine.In',onComplete:()=>spark.destroy()});return spark;},
  }),
  'mana-overflow':recipe('mana-overflow','twin-blue-energy-ellipses','mana-HUD energy ring paired with a faint hero aura','SCREEN',['#3fbaff','#e4f6ff'],{
    aura(s,c,t){const target=hudTarget(s,'.mana'),bar=image(t,'proc',target,82,{width:100,height:28,depth:40,alpha:.45}),hero=image(t,'proc',s.player,102,{alpha:.2});
      follow(t,bar,target);follow(t,hero,c.target||s.player,c);hold(s,bar,c.duration??.75);hold(s,hero,c.duration??.75);return[bar,hero];},
    proc(s,c,t){return puff(s,t,'proc',s.player,102,.25,{alpha:.35});},
  }),
};

export const IXCHEL_FX_IDS=Object.keys(IXCHEL_FX_RECIPES);
for(const [id,value] of Object.entries(IXCHEL_FX_RECIPES))FxDirector.register(id,value);
