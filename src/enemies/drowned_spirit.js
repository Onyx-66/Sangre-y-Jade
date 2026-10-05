import { attack,cast,inRange,point,heroHit,eligible,place,puddle,steer,distance } from './common.js';
import { telegraphContains } from '../systems/Telegraph.js';
export default {id:'drowned_spirit',update(ctx){const p=attack(ctx,'Grasp'),trail=attack(ctx,'Puddle Trail');
  if(inRange(ctx,p)&&cast(ctx,'Grasp',{shape:'circle',...point(ctx.target),radius:24,color:0x8ec5ff,outlineColor:0xbde0ff},w=>{
    if(!eligible(ctx)||!telegraphContains(w,ctx.scene.player))return;
    // Move after invulnerability/dodge checks, but before the actual HP hit.
    heroHit(ctx,p.damage,{melee:true,knockback:0,beforeHit:()=>{
      const hero=ctx.scene.player,angle=Math.atan2(ctx.enemy.y-hero.y,ctx.enemy.x-hero.x),length=Math.min(p.pull,distance(hero,ctx.enemy));
      if(!(ctx.scene.knockbackImmuneUntil>ctx.scene.elapsed))place(hero,hero.x+Math.cos(angle)*length,hero.y+Math.sin(angle)*length);
    }});
  }))return;
  steer(ctx);if(!(ctx.enemy.getData('rootUntil')>ctx.scene.elapsed)&&(!ctx.state.lastPuddle||distance(ctx.enemy,ctx.state.lastPuddle)>=trail.radius)){puddle(ctx,trail);ctx.state.lastPuddle=point(ctx.enemy);}
}};
