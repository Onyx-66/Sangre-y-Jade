import { FxDirector } from '../FxDirector.js';
import { ALLY_EFFECT_IDS } from '../../art/allyVisuals.js';
import { ALLY_CATALOG } from '../../data/allyCatalog.js';

const shapes = ['petal healing wave', 'hand diamond glow', 'shield crescent', 'pebble shockwave', 'crossed blades', 'shadow trail', 'blink smoke', 'skill sparkle circle'];
const palettes = ['jade/gold', 'white/gold', 'stone/white', 'brown/silver', 'violet/white', 'dark violet', 'violet/blue', 'sky blue/silver'];
const motions = ['expanding petals', 'breathing star', 'turning bash', 'flat expanding ring', 'fast diagonal cut', 'backward smear', 'contracting puff', 'rising pop'];
function draw(id, scene, ctx, stills) {
  const index = ALLY_EFFECT_IDS.indexOf(id), seconds = Math.max(.05, ctx.duration ?? [.65,.25,.28,.5,.22,.3,.32,.6][index]);
  const size = ctx.radius ? ctx.radius * 2 : ctx.size ?? [110,42,72,120,64,65,60,36][index];
  const p = ctx.followTarget || ctx;
  const sprite = stills.image('main', p.x, p.y, { size, angle:ctx.angle, alpha:index===5?.45:.85,
    depth:index===0||index===3?9:23, blendMode:index===5||index===6?'NORMAL':'ADD' });
  if(ctx.followTarget)stills.follow(sprite,ctx.followTarget);
  const x=sprite.scaleX,y=sprite.scaleY;
  if(index===0||index===3||index===7)sprite.setScale(x*.25,y*.25);
  const reduced=scene.settings?.reducedMotion;
  scene.tweens.add({targets:sprite,alpha:0,scaleX:x*(index===6?.3:1),scaleY:y*(index===3?.55:1),
    rotation:sprite.rotation+(reduced?0:index===2?.65:index===4?-.35:0),
    x:sprite.x+(reduced?0:index===5?-30:0),y:sprite.y+(reduced?0:index===7?-24:0),
    duration:seconds*1000,ease:index===4?'Cubic.Out':'Sine.Out',onComplete:()=>sprite.destroy()});
  return sprite;
}
export const ALLY_FX_RECIPES=Object.fromEntries(ALLY_EFFECT_IDS.map((id,index)=>{
  const show=(s,c,t)=>draw(id,s,c,t);
  return [id,{stills:['main'],signature:{shape:shapes[index],motion:motions[index],palette:palettes[index],blendMode:index===5||index===6?'NORMAL':'ADD'},
    cast:show,impact:show,travel:show,ground:show,aura:show,proc:show}];
}));
for(const [id,recipe] of Object.entries(ALLY_FX_RECIPES))FxDirector.register(id,recipe);

// Presentation-only family fallbacks for ally skills whose bespoke recipes are
// not installed. Do not override authored skill art or duplicate its textures.
for(const [ally,skills] of Object.entries(ALLY_CATALOG))for(const skill of skills){
  if(FxDirector.recipes.has(skill.id))continue;
  const show=(scene,ctx)=>{
    const id=ally==='saintess'?'saintess-heal-pulse':ally==='tank'?'tank-slam-ring':/ambush|vanish/.test(skill.id)?'assassin-blink-puff':'assassin-slash-x';
    return scene.fx.play(id,'impact',{...ctx,radius:ctx.radius??skill.params?.radius,sound:false,duration:Math.min(ctx.duration??.5,.7)});
  };
  FxDirector.register(skill.id,{stills:[],signature:{shape:`ally:${skill.id}`,motion:`${ally}:${skill.id}:family-fallback`,palette:'support',blendMode:'ADD'},cast:show,impact:show,ground:show,aura:show,travel:show,proc:show});
}
