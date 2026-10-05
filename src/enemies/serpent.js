import { attack,cast,areaHit,inRange,burrow,steer,ready } from './common.js';
export default {id:'serpent',update(ctx){const tail=attack(ctx,'Tail Whip'),p=attack(ctx,'Burrow');
  if(inRange(ctx,tail)&&cast(ctx,'Tail Whip',{shape:'cone',angle:ctx.angle,radius:tail.radius,arc:tail.arc},w=>areaHit(ctx,w,tail.damage,{melee:true,knockback:tail.knockback})))return;
  if(inRange(ctx,p)&&ready(ctx,'Burrow')){ctx.state.cooldowns.Burrow=ctx.scene.elapsed+p.cooldown;
    // The emerge warning belongs to the same cast; do not wait for its cooldown.
    burrow(ctx,p,()=>{const old=ctx.state.cooldowns.Burrow;ctx.state.cooldowns.Burrow=0;
      const marker={x:ctx.scene.player.x,y:ctx.scene.player.y};
      if(!cast(ctx,'Burrow',{shape:'ring',...marker,radius:p.radius,innerRadius:p.radius*.75},w=>{
        ctx.enemy.body?.reset?ctx.enemy.body.reset(marker.x,marker.y):ctx.enemy.setPosition(marker.x,marker.y);
        ctx.enemy.setData({burrowing:false,invulnerableEnemy:false});ctx.enemy.setVisible?.(true);
        areaHit(ctx,w,p.damage,{melee:true,knockup:p.knockup});
      })){ctx.enemy.setData({burrowing:false,invulnerableEnemy:false});ctx.enemy.setVisible?.(true);}
      ctx.state.cooldowns.Burrow=old;
    });return;
  }
  steer(ctx,ctx.angle+Math.sin(ctx.scene.elapsed*4+(ctx.enemy.getData('seed')||0))*.4);
}};
