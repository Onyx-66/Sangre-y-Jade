import {FxDirector} from '../FxDirector.js';
import definitions from '../../data/bosses-v06.json' with {type:'json'};
import {BOSS_IDS} from '../../art/bossVisuals.js';

const TAU=Math.PI*2,at=(p,r,a)=>({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r});
const clamp=n=>Math.max(0,Math.min(1,n));
const palettes={camazotz:['#9b7bff','#d9413a','#15121c'],zipacna:['#c58a3d','#8a8fa0','#3b2a1a'],
 vucub:['#ffcf4a','#fff2b0','#d9413a'],ahpuch:['#3de0b0','#9a8cff','#111021']};
const rowFor=(boss,id)=>definitions.find(b=>b.id===boss).phases.flatMap(p=>p.abilities).find(a=>a.id===id);

// The gameplay clock pauses with choices/cinematics. Every eviction, owner
// reuse, cancellation, expiry or shutdown releases its update hook and mask.
export function animateBossStills(scene,ctx,sprites,seconds,update,cleanup=()=>{}){
 const born=scene.elapsed||0;let closed=false;
 const finish=()=>{if(closed)return;closed=true;scene.events?.off('update',step);scene.events?.off('shutdown',finish);
  cleanup();for(const sprite of sprites)if(sprite.active)sprite.destroy();};
 const destroyed=()=>{if(sprites.every(sprite=>!sprite.active))finish();};
 const step=()=>{
  const age=Math.max(0,(scene.elapsed||0)-born);
  if(!sprites.some(sprite=>sprite.active)||ctx.isAlive?.()===false||age+1e-9>=seconds){finish();return;}
  update(age,Number.isFinite(seconds)?clamp(age/seconds):0,sprites.filter(sprite=>sprite.active));
 };
 for(const sprite of sprites)sprite.once?.('destroy',destroyed);
 scene.events?.on('update',step);scene.events?.once('shutdown',finish);step();
 return {sprite:sprites[0],sprites,finish};
}
function image(stills,name,q,size,options={}){return stills.image(name,q.x,q.y,{size,depth:options.depth??18,alpha:options.alpha??.8,...options});}
function pulse(scene,ctx,stills,{name='accent',point=ctx,size=100,seconds=.4,rotation=0,blendMode='ADD',depth=18,grow=1.15,alpha=.85}={}){
 const s=image(stills,name,point,size,{blendMode,depth,alpha});
 return animateBossStills(scene,ctx,[s],seconds,(age,t)=>{s.setDisplaySize(size*(.8+(grow-.8)*t),size*(.8+(grow-.8)*t)).setAlpha(alpha*(1-t)).setRotation(rotation*t);}).sprite;
}
function warningArt(scene,ctx,stills,p,id){
 const seconds=ctx.duration??p.windup,points=ctx.markerOnly?[ctx]:ctx.markers?.length?ctx.markers:[ctx];
 const falls=id==='rock-rain'||id==='avalanche',sprites=points.slice(0,12).map(q=>image(stills,falls?'main':'accent',q,falls?(q.radius||p.radius||55)*1.3:50,{depth:11,alpha:.25,blendMode:falls?'NORMAL':'ADD'}));
 return animateBossStills(scene,ctx,sprites,seconds,(age,t,live)=>live.forEach((s,i)=>{
  const q=points[sprites.indexOf(s)];s.setPosition(q.x,q.y-(falls?90*(1-t):0)).setAlpha(.15+.25*t);
  if(!scene.settings?.reducedMotion&&!falls)s.setRotation(Math.sin(t*Math.PI)*.12);
 })).sprite;
}
function ray(scene,ctx,stills,p,{width=p.width||40,angle=ctx.angle,rotation=p.rotation||0}={}){
 const origin={x:ctx.x,y:ctx.y},size=p.length,seconds=p.duration,s=image(stills,'main',origin,size,{width:size,height:width*3,depth:20}),a=image(stills,'accent',origin,width*2.2,{depth:21});
 // The still includes a broad origin flare; clip its brighter central strip to
 // the real hit rectangle, so the beam reads at its full combat width.
 let g,mask;if(scene.add.graphics&&s.setMask){g=scene.add.graphics().setVisible(false);mask=g.createGeometryMask();s.setMask(mask);}
 const born=scene.elapsed||0;
 return animateBossStills(scene,{...ctx,isAlive:()=>ctx.isAlive?.()!==false&&(!ctx.state||(scene.elapsed||0)<=born+1e-9||!!ctx.state.channel)},[s,a],seconds,(age,t)=>{
  const heading=angle+rotation*t,q=at(origin,p.length/2,heading);
  if(s.active)s.setPosition(q.x,q.y).setRotation(heading).setAlpha(.75+.15*Math.sin(age*30));if(a.active)a.setRotation(-age*2).setAlpha(.8);
  if(g&&s.active){const end=at(origin,p.length,heading),left=at(origin,width/2,heading+Math.PI/2),right=at(origin,width/2,heading-Math.PI/2),tipLeft=at(end,width/2,heading+Math.PI/2),tipRight=at(end,width/2,heading-Math.PI/2);
   g.clear().fillStyle(0xffffff).beginPath().moveTo(left.x,left.y).lineTo(tipLeft.x,tipLeft.y).lineTo(tipRight.x,tipRight.y).lineTo(right.x,right.y).closePath().fillPath();
  }
 },()=>{mask?.destroy();g?.destroy();}).sprite;
}
function falls(scene,ctx,stills,p){
 const points=ctx.markerOnly?[ctx]:ctx.markers||[ctx],sprites=points.flatMap(q=>[image(stills,'main',q,(q.radius||p.radius||55)*1.5,{blendMode:'NORMAL'}),image(stills,'accent',q,(q.radius||p.radius||55)*2,{blendMode:'NORMAL',depth:10})]);
 return animateBossStills(scene,ctx,sprites,.55,(age,t,live)=>live.forEach(s=>{const i=sprites.indexOf(s),q=points[Math.floor(i/2)];s.setPosition(q.x,q.y).setRotation(i%2?t*.2:0).setAlpha((1-t)*(i%2?.65:.8));})).sprite;
}
const motions={
 'sonic-screech':(s,c,t,p)=>{
  const rings=Array.from({length:3},()=>image(t,'main',c,p.radius*2,{angle:c.angle,alpha:0})),head=image(t,'accent',c,80);
  return animateBossStills(s,c,[...rings,head],.6,(age)=>{rings.forEach((r,i)=>{if(!r.active)return;const u=clamp((age-i*.1)/.4);r.setDisplaySize(p.radius*2*u,p.radius*2*u).setAlpha(age<i*.1?0:.75*(1-u));});if(head.active)head.setAlpha(Math.max(0,1-age/.3));}).sprite;
 },
 'bat-swarm':(s,c,t,p)=>{
  const points=c.markers||Array.from({length:p.count},(_,i)=>at(c,100+Math.floor(i/2)*60,c.angle+(i%2?-1:1)*Math.PI/5));
  const flock=image(t,'main',c,110,{blendMode:'NORMAL'}),bats=points.map(q=>image(t,'accent',q,52,{blendMode:'NORMAL'}));
  return animateBossStills(s,c,[flock,...bats],.7,(age,u,live)=>live.forEach(x=>x.setAlpha(1-u).setRotation(Math.sin(age*12)*.08))).sprite;
 },
 'blood-dive':dive,'twin-dive':twinDive,
 eclipse:(s,c,t,p)=>{
  const ring=image(t,'main',c.target||c,p.radius*2,{depth:82,blendMode:'NORMAL',alpha:.6}),eyes=image(t,'accent',c.boss||c,60,{depth:83});
  return animateBossStills(s,c,[ring,eyes],p.duration,age=>{if(ring.active)ring.setPosition((s.player||c.target||c).x,(s.player||c.target||c).y).setRotation(age*.04);
   if(eyes.active)eyes.setPosition((c.boss||c).x,(c.boss||c).y-30).setAlpha(.8+.2*Math.sin(age*4));}).sprite;
 },
 'stone-slam':(s,c,t,p)=>pulse(s,c,t,{name:'main',size:p.radius*2,seconds:.6,blendMode:'NORMAL',depth:10,grow:1}),
 'rock-rain':falls,
 'fissure-line':(s,c,t,p)=>{
  const sprites=Array.from({length:7},(_,i)=>{const q=at(c,p.length*(i+.5)/7,c.angle);return image(t,'main',q,1,{width:p.length/7,height:p.width,angle:c.angle,blendMode:'NORMAL',depth:10,alpha:0});});
  return animateBossStills(s,c,sprites,p.duration,(age,u,live)=>live.forEach(x=>{const i=sprites.indexOf(x);x.setAlpha(age>=i*p.duration/7?.75:0);})).sprite;
 },
 'stone-armor':(s,c,t,p)=>{
  const boss=c.boss||c,born=s.elapsed,a=image(t,'main',boss,210,{blendMode:'NORMAL',alpha:.42});
  return animateBossStills(s,{...c,isAlive:()=>c.isAlive?.()!==false&&(!c.state||s.elapsed<=born+1e-9||boss.getData('bossArmorPct')>0)},[a],c.state?Infinity:3,age=>a.setPosition(boss.x,boss.y-40).setAlpha(.35+.1*Math.sin(age*3))).sprite;
 },
 avalanche:(s,c,t,p)=>c.markerOnly?falls(s,c,t,{...p,radius:c.radius}):pulse(s,c,t,{point:c.arena||c,size:180,seconds:.5,blendMode:'NORMAL',depth:10,alpha:.5}),
 'sunbeam-sweep':(s,c,t,p)=>ray(s,c,t,p,{angle:c.angle-p.rotation/2}),
 'feather-barrage':(s,c,t,p)=>pulse(s,c,t,{size:110,seconds:.35,rotation:-.35}),
 'solar-flare-rings':flareRings,
 'second-sun':(s,c,t,p)=>pulse(s,c,t,{size:150,seconds:.55,rotation:Math.PI/4}),
 zenith:(s,c,t,p)=>{const beam=image(t,'main',{x:c.x,y:c.y-100},p.radius*2,{depth:21});const ring=image(t,'accent',c,p.radius*2,{depth:10});
  return animateBossStills(s,c,[beam,ring],.6,(_age,u,live)=>live.forEach(x=>x.setAlpha(.8*(1-u)))).sprite;},
 'death-gaze':(s,c,t,p)=>ray(s,c,t,p,{width:40}),
 'bone-spear-ring':(s,c,t,p)=>{
  const centre=c.boss||c,ring=image(t,'accent',centre,p.radius*2,{depth:10,blendMode:'NORMAL'});
  return animateBossStills(s,c,[ring],.5,(_age,u)=>ring.setAlpha(.7*(1-u)).setRotation(u*.08)).sprite;
 },
 'soul-drain':(s,c,t,p)=>{
  const vortex=image(t,'main',c,p.radius*2,{depth:10,alpha:.45}),wisp=image(t,'accent',at(c,p.radius*.75,c.angle),75,{depth:20});
  return animateBossStills(s,c,[vortex,wisp],p.duration,(age,u)=>{if(vortex.active)vortex.setRotation(-age*1.5).setAlpha(.45*(1-u*.3));if(wisp.active){const q=at(c,p.radius*.75*(1-u),c.angle+age*3);wisp.setPosition(q.x,q.y).setRotation(c.angle+age*3+Math.PI);}}).sprite;
 },
 'summon-lords':(s,c,t,p)=>{
  const points=c.markers||[at(c,200,c.angle+Math.PI/2),at(c,200,c.angle-Math.PI/2)];
  const gates=points.map(q=>image(t,'main',q,80,{depth:10}));
  return animateBossStills(s,c,gates,.8,(age,u,live)=>live.forEach(x=>x.setRotation(age*.6).setAlpha(1-u))).sprite;
 },
 'xibalba-shift':fog,
 'final-rite':(s,c,t,p)=>pulse(s,c,t,{name:'accent',point:c.arena||c,size:(c.arena?.radius||600)*2,seconds:.65,alpha:s.settings?.reduceFlashing?.3:.8,grow:1}),
};
function dive(scene,ctx,stills,p){
 const dives=ctx.dives||[{x:ctx.x,y:ctx.y,angle:ctx.angle}],seconds=p.length/p.speed,born=scene.elapsed;
 const sprites=dives.flatMap(q=>[image(stills,'main',q,120,{angle:q.angle}),image(stills,'accent',q,1,{width:p.length,height:30,angle:q.angle,depth:10,blendMode:'NORMAL',alpha:0})]);
 const alive=()=>ctx.isAlive?.()!==false&&(!ctx.state||scene.elapsed<=born+1e-9||scene.elapsed-born+1e-9>=seconds||ctx.state.runtime.tasks.some(t=>t.movement));
 return animateBossStills(scene,{...ctx,isAlive:alive},sprites,seconds+p.duration,(age,u,live)=>live.forEach(x=>{
  const i=sprites.indexOf(x),q=dives[Math.floor(i/2)],length=Math.min(p.length,p.speed*age),end=at(q,length,q.angle);
  if(i%2){const mid=at(q,length/2,q.angle);x.setPosition(mid.x,mid.y).setDisplaySize(Math.max(1,length),30).setAlpha(.45*Math.max(0,1-(age-seconds)/p.duration));}
  else x.setPosition(end.x,end.y).setAlpha(age<seconds?.8:0);
 })).sprite;
}
function twinDive(scene,ctx,stills,p){
 const paths=ctx.dives||[{...at(ctx,-p.length/2,Math.PI/4),angle:Math.PI/4},{...at(ctx,-p.length/2,-Math.PI/4),angle:-Math.PI/4}];
 const centre=at(paths[0],p.length/2,paths[0].angle),seconds=p.length/p.speed,born=scene.elapsed;
 const x=image(stills,'main',centre,p.length/Math.SQRT2,{depth:18,alpha:.6});
 const impacts=paths.map(q=>image(stills,'accent',at(q,p.length,q.angle),100,{depth:20,alpha:0}));
 const alive=()=>ctx.isAlive?.()!==false&&(!ctx.state||scene.elapsed<=born+1e-9||scene.elapsed-born+1e-9>=seconds||ctx.state.runtime.tasks.some(t=>t.movement));
 return animateBossStills(scene,{...ctx,isAlive:alive},[x,...impacts],seconds+.4,(age)=>{
  if(x.active)x.setAlpha(age<seconds?.6*(1-age/seconds):0);
  impacts.forEach(s=>{if(s.active)s.setAlpha(age<seconds?0:.8*(1-(age-seconds)/.4));});
 }).sprite;
}
function flareRings(scene,ctx,stills,p){
 const arena=ctx.arena?.radius||600,speed=170,spacing=.65,seconds=arena/speed+(p.count-1)*spacing,gapWidth=Math.PI/3;
 const sprites=Array.from({length:p.count},()=>image(stills,'main',ctx,1,{depth:10,alpha:0})),masks=[];
 for(const sprite of sprites)if(scene.add.graphics&&sprite.setMask){const g=scene.add.graphics().setVisible(false),mask=g.createGeometryMask();sprite.setMask(mask);masks.push({g,mask});}
 return animateBossStills(scene,ctx,sprites,seconds,(age,_u,live)=>live.forEach(sprite=>{
  const i=sprites.indexOf(sprite),r=(age-i*spacing)*speed;if(r<0||r>arena){sprite.setAlpha(0);return;}
  sprite.setDisplaySize(r*2,r*2).setRotation(ctx.angle).setAlpha(.65);
  const g=masks[i]?.g;if(g){g.clear();for(let n=0;n<p.gaps;n++){const a=ctx.angle+n*TAU/p.gaps+gapWidth/2,b=ctx.angle+(n+1)*TAU/p.gaps-gapWidth/2;
   g.fillStyle(0xffffff).beginPath().moveTo(ctx.x,ctx.y).arc(ctx.x,ctx.y,r+12,a,b).closePath().fillPath();}}
 }),()=>masks.forEach(({g,mask})=>{mask.destroy();g.destroy();})).sprite;
}
function fog(scene,ctx,stills,p){
 const arena=ctx.arena||{x:ctx.x,y:ctx.y,radius:600},mist=image(stills,'main',arena,arena.radius*2,{depth:10,blendMode:'NORMAL',alpha:.16});
 const lights=Array.from({length:p.count},()=>image(stills,'accent',arena,p.radius*2,{depth:12,alpha:.7}));
 let g,mask;if(scene.add.graphics&&mist.setMask){g=scene.add.graphics().setVisible(false);g.fillStyle(0xffffff).fillCircle(arena.x,arena.y,arena.radius);mask=g.createGeometryMask();mist.setMask(mask);}
 return animateBossStills(scene,ctx,[mist,...lights],ctx.state?Infinity:5,(age,_u,live)=>{
  if(mist.active)mist.setAlpha(.14+.03*Math.sin(age*.6));
  const rite=[...(scene.telegraphs?.live||[])].find(w=>w.owner===ctx.boss&&w.tag==='boss:final-rite');
  const circles=rite?.safeCircles||ctx.state?.fog?.circles||Array.from({length:p.count},(_,i)=>({...at(arena,280,-Math.PI/2+i*TAU/p.count),radius:p.radius}));
  lights.forEach((light,i)=>{if(!light.active)return;const q=circles[i];light.setVisible(!!q);if(q)light.setPosition(q.x,q.y).setDisplaySize(q.radius*2,q.radius*2).setAlpha(.75);});
 },()=>{mask?.destroy();g?.destroy();}).sprite;
}

export const BOSS_FX_RECIPES={};
for(const boss of definitions)for(const row of boss.phases.flatMap(phase=>phase.abilities)){
 const id=`boss-${boss.id}-${row.id}`,p=row.id==='twin-dive'?rowFor(boss.id,'blood-dive').parameters:row.parameters;
 const recipe={stills:['main','accent'],signature:{shape:row.telegraph,motion:row.effect,blendMode:boss.id==='zipacna'?'NORMAL':'ADD',palette:palettes[boss.id]},
  cast:(scene,ctx,stills)=>row.id==='final-rite'?
   pulse(scene,ctx,stills,{name:'main',point:ctx.arena||ctx,size:(ctx.arena?.radius||600)*2,seconds:p.windup,alpha:.25,grow:1}):warningArt(scene,ctx,stills,p,row.id),
  impact:(scene,ctx,stills)=>motions[row.id](scene,ctx,stills,p)};
 if(row.id==='zenith')recipe.aura=(scene,ctx,stills)=>{
  const trails=Array.from({length:Math.floor(p.trail/.5)},()=>image(stills,'main',ctx,48,{width:48,height:96,depth:12,alpha:0}));let shown=0;
  return animateBossStills(scene,ctx,trails,p.trail,(age)=>{
   while(shown<trails.length&&age+1e-9>=(shown+1)*.5){const mark=trails[shown++],q=scene.player||ctx;
    if(mark.active)mark.setPosition(q.x,q.y-35).setAlpha(.3);
   }
  }).sprite;
 };
 BOSS_FX_RECIPES[id]=recipe;FxDirector.register(id,recipe);
 // Preserve V11 hook names while loading each bitmap only at its canonical id.
 for(const kind of ['main','accent'])FxDirector.register(`${id}-${kind}`,{stills:[],signature:{...recipe.signature,motion:`${kind}: ${recipe.signature.motion}`},
  cast:(s,c)=>s.fx.play(id,'cast',c),impact:(s,c)=>s.fx.play(id,'impact',c)});
}
export function bossEntryRecipe(id){
 const recipe={stills:['main'],files:{main:`boss-entry/${id}-entry.png`},signature:{shape:`entry-${id}`,motion:definitions.find(b=>b.id===id).entry,blendMode:id==='camazotz'||id==='zipacna'?'NORMAL':'ADD',palette:palettes[id]},
  cast:(scene,ctx,stills)=>{
   const size=ctx.arena?.radius?ctx.arena.radius*1.4:760,sprite=image(stills,'main',ctx,size,{depth:82,alpha:0,blendMode:recipe.signature.blendMode});
   let closed=false;return {sprite,update(p){if(closed||!sprite.active)return;const fade=Math.sin(Math.PI*clamp(p));
    sprite.setAlpha(fade*.85).setDisplaySize(size*(id==='zipacna'?.3+.7*p:id==='camazotz'?1-.7*p:.5+.5*p),size*(id==='zipacna'?.3+.7*p:id==='camazotz'?1-.7*p:.5+.5*p));
    sprite.setRotation(id==='camazotz'?p*Math.PI*1.4:0);sprite.setPosition(ctx.x,ctx.y-(id==='vucub'?150*(1-p):0));
   },finish(){if(closed)return;closed=true;if(sprite.active)sprite.destroy();}};
  },
  aura:(scene,ctx,stills)=>pulse(scene,ctx,stills,{name:'main',size:220,seconds:.7,rotation:id==='camazotz'?-.5:.5,alpha:.5}),
  proc:(scene,ctx,stills)=>pulse(scene,{...ctx,isAlive:undefined},stills,{name:'main',size:240,seconds:.9,rotation:id==='ahpuch'?-1:1,alpha:.6,blendMode:recipe.signature.blendMode}),
 };
 return recipe;
}
export const BOSS_ENTRY_RECIPES=Object.fromEntries(BOSS_IDS.map(id=>[ `boss-${id}-entry`,bossEntryRecipe(id)]));
for(const [id,recipe]of Object.entries(BOSS_ENTRY_RECIPES))FxDirector.register(id,recipe);
for(const id of BOSS_IDS)for(const kind of ['entry','phase','death'])FxDirector.register(`boss-${id}-${kind}-main`,{
 stills:[],signature:{shape:`${id}-${kind}`,motion:`${kind}-hook`,blendMode:'ADD',palette:palettes[id]},
 impact:(scene,ctx)=>kind==='entry'?null:scene.fx.play(`boss-${id}-entry`,kind==='death'?'proc':'aura',ctx),
});

export function decorateBossProjectile(scene,shot,bossId,abilityId){
 const id=`boss-${bossId}-${abilityId}`,key=`fx-still-${id}-main`;
 if(!shot||!['feather-barrage','bone-spear-ring'].includes(abilityId)||!scene.textures?.exists(key))return;
 shot.anims.stop();shot.setTexture(key).setDisplaySize(42,42).clearTint();
 shot.body.setCircle(42,86,86);if(abilityId==='bone-spear-ring')shot.setRotation(shot.rotation+Math.PI/2);
 shot.setData('bossFx',id);
}
