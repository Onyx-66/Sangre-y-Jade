import {BOSS_FAIRNESS} from '../bosses/rules.js';

const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
export function entranceSteps(duration){return [
 {id:'camera',start:0,end:Math.min(2,duration-2)},
 {id:'entry',start:.6,end:Math.max(1,duration-3)},
 {id:'name',start:duration-3,end:duration-1},
 {id:'return',start:duration-1,end:duration},
];}
export class CutsceneDirector {
 constructor(scene,{presentation=scene.bossPresentation}={}){this.scene=scene;this.presentation=presentation;this.current=null;this.destroyed=false;}
 get active(){return !!this.current;}
 start(boss,definition,{entry,onComplete}={}){
  const s=this.scene;if(this.destroyed||this.active||s.ended||s.loadingRun||s.pausedForChoice)return false;
  const camera=s.cameras?.main,shortened=!!s.settings.skipBossEntrances,duration=shortened?BOSS_FAIRNESS.nameDuration:definition.entryDuration||5;
  const snapshot={choice:s.pausedForChoice,physics:!!s.physics?.world?.isPaused,time:!!s.time?.paused,tweens:!!s.tweens?.paused,
   invulnerable:s.invulnerable,hudOpacity:s.hud?.el?.style.opacity||'',follow:camera?._follow,
   lerpX:camera?.lerp?.x??.09,lerpY:camera?.lerp?.y??.09,zoomX:camera?.zoomX||camera?.zoom||1,zoomY:camera?.zoomY||camera?.zoom||1,
   center:{x:(camera?.scrollX||0)+(camera?.width||0)/2,y:(camera?.scrollY||0)+(camera?.height||0)/2}};
  this.current={boss,serial:boss.getData('serial'),definition,shortened,duration,steps:entranceSteps(duration),age:0,entry,onComplete,snapshot,named:false};
  s.audio?.v2?.duck('cinematic',true);
  s.bossCinematic=true;s.pausedForChoice=true;s.invulnerable=Infinity;s.physics?.pause();s.tweens?.pauseAll();if(s.time)s.time.paused=true;
  s.skillAudio?.pause?.();s.releaseAttack?.();s.hud?.releaseJoystick?.();if(s.hud){s.hud.move={x:0,y:0};s.hud.hideTooltip?.();s.hud.el?.classList.add('boss-cinematic-hidden');}
  s.player?.setVelocity?.(0,0);camera?.stopFollow?.();this.presentation?.clearWarning();
  this.presentation?.start(definition,{skip:shortened,onSkip:()=>this.skip()});
  if(shortened){entry?.finish?.();this.name();}this.update(0);return true;
 }
 name(){
  const c=this.current;if(!c||c.named)return;c.named=true;
  const hooks=this.scene.options?.bossHooks;
  if(hooks?.stinger)hooks.stinger(c.definition);else this.scene.audio?.sfx?.('boss');
  hooks?.voice?.({id:c.definition.id,kind:'entry',definition:c.definition});
  if(!hooks?.voice)this.scene.audio?.voice?.(`boss-${c.definition.id}-entry`,{owner:'run'});
  if(hooks?.music)hooks.music(c.definition,1200);else this.scene.audio?.music?.(`boss-${c.definition.id}`,1200);
 }
 update(dt){
  const c=this.current;if(!c)return;
  const s=this.scene;if(s.ended||s.cleaned||!c.boss.active||c.boss.getData('serial')!==c.serial){this.finish({abort:true});return;}
  c.age=Math.min(c.duration,c.age+Math.max(0,dt));const camera=s.cameras?.main,reduced=s.settings.reducedMotion;
  let letterbox=0,hudOpacity=1,nameVisible=false;
  if(c.shortened){nameVisible=true;letterbox=0;hudOpacity=1;}
  else{
   const entryStep=c.steps.find(step=>step.id==='entry'),nameStep=c.steps.find(step=>step.id==='name'),returnStep=c.steps.find(step=>step.id==='return');
   const pan=ease(c.age/2),back=ease((c.age-returnStep.start)/(returnStep.end-returnStep.start));
   const center=c.snapshot.center,point={x:center.x+(c.boss.x-center.x)*pan,y:center.y+(c.boss.y-center.y)*pan};
   if(!reduced){const zoom=1+.25*pan*(1-back);camera?.setZoom?.(c.snapshot.zoomX*zoom,c.snapshot.zoomY*zoom);
    camera?.centerOn?.(point.x+(center.x-point.x)*back,point.y+(center.y-point.y)*back);}
   if(reduced)c.entry?.finish?.();else c.entry?.update?.(ease((c.age-entryStep.start)/(entryStep.end-entryStep.start)));
   nameVisible=c.age>=nameStep.start&&c.age<nameStep.end;
   if(c.age>=nameStep.start)this.name();letterbox=clamp(c.age/.4)*(1-back);hudOpacity=1-clamp(c.age/.35)*(1-back);
  }
  this.presentation?.update({age:c.age,duration:c.duration,nameVisible,letterbox,hudOpacity});
  if(c.age>=c.duration)this.finish();
 }
 skip(){const c=this.current;if(!c||c.age<BOSS_FAIRNESS.skipAfter)return false;this.name();this.finish({keepName:!c.shortened});return true;}
 resize(viewport){const c=this.current;if(!c)return;c.snapshot.zoomX=viewport.zoomX;c.snapshot.zoomY=viewport.zoom;this.update(0);}
 finish({abort=false,keepName=false}={}){
  const c=this.current;if(!c)return;this.current=null;const s=this.scene,{snapshot}=c,camera=s.cameras?.main;
  s.audio?.v2?.duck('cinematic',false);
  // Entry scripts guard actor mutation themselves; drawing must always release,
  // including an aborted cinematic whose physics body has already been reused.
  c.entry?.finish?.();
  camera?.setZoom?.(snapshot.zoomX,snapshot.zoomY);camera?.centerOn?.(snapshot.center.x,snapshot.center.y);
  if(snapshot.follow?.active)camera?.startFollow?.(snapshot.follow,true,snapshot.lerpX,snapshot.lerpY);
  if(s.hud?.el){s.hud.el.classList.remove('boss-cinematic-hidden');s.hud.el.style.opacity=snapshot.hudOpacity;}
  this.presentation?.finish({definition:c.definition,keepName:keepName&&!abort});
  s.bossCinematic=false;s.pausedForChoice=snapshot.choice;s.invulnerable=snapshot.invulnerable;
  if(s.time)s.time.paused=snapshot.time;
  if(!s.ended&&!s.cleaned){if(!snapshot.physics)s.physics?.resume();if(!snapshot.tweens)s.tweens?.resumeAll();s.skillAudio?.resume?.();if(!abort)c.onComplete?.();}
 }
 destroy(){this.destroyed=true;this.finish({abort:true});}
}
