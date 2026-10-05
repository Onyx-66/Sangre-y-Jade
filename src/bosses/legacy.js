// V10 adapter only. V11 replaces these current attacks with the JSON abilities.
// Scheduling, warnings, phases, protection, damage caps and recovery live in
// BossController, never here. No new roster ability is implemented by this file.
export function legacyBehavior(id,pattern){
 return {id,temporary:true,
  entry({boss}){
   const scaleX=boss.scaleX??1,scaleY=boss.scaleY??1;
   return {update(progress){boss.setAlpha(.15+.85*progress);boss.setScale(scaleX,scaleY*(.6+.4*progress));},
    finish(){boss.setAlpha(1).setScale(scaleX,scaleY);}};
  },
  move(ctx){ctx.boss.setVelocity(Math.cos(ctx.angle)*ctx.speed,Math.sin(ctx.angle)*ctx.speed);},
  abilities(ctx){
   const common={id:`legacy-${pattern}`,windup:.62,recovery:1.2,big:true};
   if(pattern==='dash')return [{...common,cooldown:3.2,shape:()=>({shape:'line',length:234,width:60}),
    execute:c=>c.dash({length:234,speed:390,damage:c.boss.getData('damage')})}];
   if(pattern==='quake')return [{...common,cooldown:4.1,shape:c=>({shape:'circle',x:c.target.x,y:c.target.y,radius:155}),
    execute:(c,w)=>{if(Math.hypot(c.scene.player.x-w.x,c.scene.player.y-w.y)<=w.radius)c.damage(22,w.x,w.y);c.scene.playEffect?.(2,w.x,w.y,190);}}];
   if(pattern==='sun')return [{...common,cooldown:2.05,shape:()=>({shape:'cone',radius:410,arc:.9}),
    execute:c=>{for(let i=-2;i<=2;i++)c.projectile(c.angle+i*.18,235,13);}}];
   const ratio=ctx.boss.getData('hp')/ctx.boss.getData('maxHp');
   return [{...common,cooldown:ratio<.3?1.35:2.15,shape:()=>({shape:'ring',radius:100,innerRadius:75}),
    execute:c=>{const count=ratio>.6?7:ratio>.3?10:14;
     for(let i=0;i<count;i++)c.projectile(i*Math.PI*2/count+c.angle,185+(i%2)*55,14);
     if(ratio<.65)for(let i=0;i<(ratio<.3?3:1);i++)c.scene.spawnEnemy('shade',null,{emerge:true});}}];
  },
 };
}
