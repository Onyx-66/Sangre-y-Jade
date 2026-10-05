import { FxDirector } from '../FxDirector.js';
import roster from '../../data/enemies-v06.json' with {type:'json'};
import { ENEMY_EFFECT_IDS,projectileEffect } from '../../art/enemyVisuals.js';

const palettes={
 'soul-bolt':['#c8ffd8','#3de0b0'],'venom-spit':['#7be045','#244b21'],'arrow-red':['#fff0ce','#d9413a'],
 'vine-snare':['#6b8e3a','#3b2a1a'],puddle:['#8ec5ff','#256eac'],'crystal-shard':['#87f5ff','#286fb5'],
 'wisp-explosion':['#e8ffff','#3ddbe0'],'blood-slash':['#d9413a','#ffb3a0'],'blink-flash':['#9f182a','#1a1a22'],
 'tail-whip-arc':['#fff0ce','#a8743a'],'shockwave-ring':['#8a8fa0','#6b4a2b'],'dust-puff':['#c58a3d','#6b4a2b'],
 'spawn-crack':['#c9b37a','#3de0b0'],'death-puff-green':['#3de0b0','#c8ffd8'],'death-puff-red':['#d9413a','#ffb3a0'],
 'death-puff-cyan':['#6ad0ff','#e8fbff'],'shield-ring-blue':['#8ec5ff','#c9c3d6'],'telegraph-glyph':['#d9413a','#7a1820'],
};
const groundEffects=new Set(['vine-snare','puddle','shockwave-ring','spawn-crack','shield-ring-blue','telegraph-glyph']);
const normalEffects=new Set(['blink-flash','dust-puff','spawn-crack','vine-snare']);
const motions={
 'soul-bolt':'small skull pulse and drifting impact','venom-spit':'growing venom glob and droplet burst','arrow-red':'directional bone streak with red impact',
 'vine-snare':'thorn ring rises and holds','puddle':'water breathing scale and final-second fade','crystal-shard':'faceted shard rotation and icy burst',
 'wisp-explosion':'spherical fuse burst expanding quickly','blood-slash':'crimson crescent sweeping rotation','blink-flash':'contracting dark blink smoke',
 'tail-whip-arc':'bone arc sweeps across facing direction','shockwave-ring':'flat ring expanding to the actual damage radius',
 'dust-puff':'rising brown dust fading slowly','spawn-crack':'ground fissure opens then closes','death-puff-green':'green spirit dissolution drifting upward',
 'death-puff-red':'red spirit dissolution curling clockwise','death-puff-cyan':'cyan spirit dissolution splitting upwards',
 'shield-ring-blue':'slow blue rune rotation and shield expiry','telegraph-glyph':'warning glyph filling anticipation pulse',
};
function render(id,scene,ctx,stills){
 const seconds=Math.max(.04,ctx.duration??.4),point=ctx.followTarget||{x:ctx.x,y:ctx.y};
 const size=ctx.radius?ctx.radius*2:ctx.size??64,ground=groundEffects.has(id);
 const sprite=stills.image('main',point.x,point.y,{size,angle:ctx.angle,depth:ground?8:22,alpha:id==='telegraph-glyph'?.25:id==='puddle'?.48:.9,
  blendMode:normalEffects.has(id)?'NORMAL':'ADD'});
 if(ctx.followTarget||ctx.isAlive)stills.follow(sprite,point,{isAlive:ctx.isAlive});
 const baseX=sprite.scaleX,baseY=sprite.scaleY,hold=['puddle','vine-snare','shield-ring-blue'].includes(id);
 const grow=ctx.radius?1:id==='blink-flash'?.4:id==='wisp-explosion'?1.65:id.includes('death-puff')?1.35:1.1;
 if(id==='shockwave-ring'||id==='spawn-crack'||id==='vine-snare'||id==='wisp-explosion'){
  sprite.setScale(baseX*.2,baseY*.2);scene.tweens.add({targets:sprite,scaleX:baseX,scaleY:baseY,duration:Math.min(.25,seconds)*1000,ease:'Cubic.Out'});
 }
 if(id==='shield-ring-blue'||id==='blood-slash'||id==='tail-whip-arc'||id==='crystal-shard')scene.tweens.add({targets:sprite,rotation:sprite.rotation+
  (id==='shield-ring-blue'?Math.PI:Math.PI*.4),duration:seconds*1000});
 if(id==='puddle')scene.tweens.add({targets:sprite,scaleX:baseX*1.025,scaleY:baseY*.975,duration:450,yoyo:true,repeat:Math.max(0,Math.floor(seconds/.9)-1)});
 scene.tweens.add({targets:sprite,alpha:0,scaleX:baseX*grow,scaleY:baseY*grow,
  y:sprite.y+(id.includes('death-puff')?-20:id==='dust-puff'?-8:0),
  delay:hold?Math.max(0,seconds-.7)*1000:0,duration:(hold?Math.min(.7,seconds):seconds)*1000,ease:'Sine.Out',onComplete:()=>sprite.destroy()});
 return sprite;
}
export const ENEMY_FX_RECIPES=Object.fromEntries(ENEMY_EFFECT_IDS.map(id=>[id,{
 stills:['main'],signature:{shape:id,motion:motions[id],blendMode:normalEffects.has(id)?'NORMAL':'ADD',palette:palettes[id]},
 cast:(s,c,t)=>render(id,s,c,t),impact:(s,c,t)=>render(id,s,c,t),ground:(s,c,t)=>render(id,s,c,t),
 aura:(s,c,t)=>render(id,s,c,t),travel:(s,c,t)=>render(id,s,c,t),
}]));
for(const [id,recipe]of Object.entries(ENEMY_FX_RECIPES))FxDirector.register(id,recipe);

const impactByEnemy={shade:'dust-puff',bat:'dust-puff',jaguar:'shockwave-ring',serpent:'tail-whip-arc',priest:'soul-bolt',
 vine_lurker:'vine-snare',stone_guardian:'shockwave-ring',jungle_wasp:'venom-spit',blood_wraith:'blink-flash',
 bone_archer:'arrow-red',moon_cultist:'spawn-crack',drowned_spirit:'puddle',abyssal_eel:'shockwave-ring',crystal_golem:'crystal-shard',glow_wisp:'wisp-explosion'};
// Ability aliases do not copy an image: each of the 18 stills has one canonical texture.
for(const [id,data]of Object.entries(roster))for(const phase of ['windup','attack']){
 const alias=`enemy-${id}-${phase}`;
 const show=(scene,ctx)=>{
  const p=data.attacks[ctx.ability]||Object.values(data.attacks)[0];
  const effect=phase==='windup'?'telegraph-glyph':ctx.ability==='Ward'||ctx.ability==='Prism Shield'?'shield-ring-blue':
    ctx.ability==='Pack Roar'?'shockwave-ring':ctx.ability==='Burrow'?'spawn-crack':ctx.ability==='Blink Slash'?'blood-slash':impactByEnemy[id];
  const duration=phase==='windup'?p.windup:effect==='puddle'?p.duration:Math.min(.6,ctx.duration??.3);
  return scene.fx.play(effect,phase==='windup'?'ground':'impact',{...ctx,duration,sound:false,
    radius:phase==='windup'?undefined:ctx.radius??p.radius??(ctx.shape==='cone'?p.range:undefined),size:phase==='windup'?36:undefined});
 };
 FxDirector.register(alias,{stills:[],signature:{shape:`${id}-${phase}`,motion:`${Object.keys(data.attacks).join('/')}:${phase}`,blendMode:'ADD',palette:palettes[impactByEnemy[id]]},
  cast:show,impact:show});
}
export function decorateEnemyProjectile(scene,projectile,source){
 const id=projectileEffect(source?.getData?.('type'));if(!id)return;
 const key=`fx-still-${id}-main`;if(!scene.textures?.exists(key))return;
 projectile.anims.stop();projectile.setTexture(key).setDisplaySize(42,42);
 // Same world-space collision circle as the old 128px / 42px projectile.
 projectile.body.setCircle(42,86,86);projectile.setData('enemyFx',id);
}
