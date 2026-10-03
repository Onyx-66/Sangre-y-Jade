// Browser-only audit instrumentation. Never imported by the shipped game.
export function observeRun(scene,slotCount){
 let current=null, effects=scene.skillEffects;
 const data={damage:{},casts:{},bosses:[],slots:[],milestones:[],allyEvents:[],peakFx:0};
 const scoped=(id,fn)=>function(...args){const previous=current;current=id||previous;try{return fn.apply(this,args);}finally{current=previous;}};
 const wrap=(object,key,id)=>{const old=object[key];object[key]=function(...args){return scoped(typeof id==='function'?id(...args):id,old).apply(this,args);};};
 const trackEffects=array=>{
  Object.defineProperty(array,'push',{configurable:true,value:function(...items){
   for(const effect of items)if(current){effect.update=scoped(current,effect.update);effect.destroy=scoped(current,effect.destroy);}
   return Array.prototype.push.apply(this,items);
  }});return array;
 };
 Object.defineProperty(scene,'skillEffects',{configurable:true,get:()=>effects,set:value=>{effects=trackEffects(value);}});effects=trackEffects(effects);
 wrap(scene,'castSkill',index=>scene.skillSlots[index]?.id);
 wrap(scene,'autoAttack','basic-attack');
 const event=scene.time.addEvent;scene.time.addEvent=function(config){return event.call(this,{...config,callback:config.callback?scoped(current,config.callback):config.callback});};
 const fire=scene.fireProjectile;scene.fireProjectile=function(...args){const shot=fire.apply(this,args);shot?.setData('auditSkill',current);return shot;};
 wrap(scene,'onProjectileHit',shot=>shot.getData('skillId')||shot.getData('auditSkill')||shot.getData('source')?.getData?.('auditSkill')||(shot.getData('basicAttack')?'basic-attack':null));
 const tween=scene.tweens.add;scene.tweens.add=function(config){const wrapped={...config};for(const key of ['onStart','onUpdate','onComplete','onRepeat','onYoyo'])if(wrapped[key])wrapped[key]=scoped(current,wrapped[key]);return tween.call(this,wrapped);};
 const summon=scene.createSummon;scene.createSummon=function(...args){const result=summon.apply(this,args);result?.sprite?.setData('auditSkill',current);return result;};
 const enemySpawn=scene.spawnEnemy;scene.spawnEnemy=function(...args){
  const result=enemySpawn.apply(this,args);
  for(const enemy of scene.enemies.getChildren())if(!enemy.auditAttached){
   enemy.auditAttached=true;enemy.auditStatuses={};const set=enemy.setData,get=enemy.getData;
   enemy.setData=function(key,value){const entries=typeof key==='object'?Object.entries(key):[[key,value]];
    for(const [field,amount]of entries)if(['poisonDps','bleedDps','burnDps'].includes(field))this.auditStatuses[field]=amount?current:null;
    return set.call(this,key,value);
   };
   enemy.getData=function(key){if(key==='basicPoisonStacks')this.auditDot='venomous-darts';else if(['poisonDps','bleedDps','burnDps'].includes(key))this.auditDot=this.auditStatuses[key];return get.call(this,key);};
  }
  return result;
 };
 const on=scene.passives.bus.on;scene.passives.bus.on=function(name,callback){return on.call(this,name,scoped(current,callback));};
 wrap(scene.passives,'equip',definition=>definition.id);
 wrap(scene.support.brain,'cast',skill=>skill.id);
 scene.passives.bus.on('hit',event=>{
  const id=event.skillId||current||(event.dot?event.enemy.auditDot:null)||(event.byAlly?'ally-unattributed':event.dot?'dot-unattributed':event.basicAttack?'basic-attack':'unattributed');
  data.damage[id]=(data.damage[id]||0)+event.damage;
 });
 scene.passives.bus.on('skillCast',({skill})=>{data.casts[skill.id]=(data.casts[skill.id]||0)+1;});
 const spawn=scene.spawnBoss;scene.spawnBoss=function(boss){const result=spawn.call(this,boss);if(scene.activeBoss)data.bosses.push({id:scene.activeBoss.getData('bossId'),spawn:scene.elapsed,kill:null});return result;};
 scene.passives.bus.on('kill',({enemy})=>{if(enemy.getData('isBoss')){const boss=data.bosses.findLast(row=>row.id===enemy.getData('bossId')&&row.kill===null);if(boss){boss.kill=scene.elapsed;boss.seconds=boss.kill-boss.spawn;}}});
 const milestone=scene.showSkillMilestone;scene.showSkillMilestone=function(level,done){const before=scene.completedSkillMilestones.has(level);const result=milestone.call(this,level,done);if(!before&&scene.completedSkillMilestones.has(level))data.milestones.push(level);return result;};
 for(const [method,kind]of [['chooseClass','recruit'],['chooseSkill','pick']]){const fn=scene.support[method];scene.support[method]=function(...args){data.allyEvents.push({kind,level:scene.loadoutLevel});return fn.apply(this,args);};}
 data.snapshot=()=>{const level=scene.loadoutLevel;if(!data.slots.some(s=>s.level===level))data.slots.push({level,active:slotCount('active',level),passive:slotCount('passive',level),ownedActive:scene.skillSlots.length,ownedPassive:scene.passiveSlots.length,allySkills:scene.companion?.skills.length||0});scene.fx.prune();data.peakFx=Math.max(data.peakFx,scene.fx.liveUnits);};
 data.snapshot();return data;
}
