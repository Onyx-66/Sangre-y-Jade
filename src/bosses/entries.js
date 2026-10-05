import {worldView} from '../systems/Viewport.js';
import {at,cue,TAU} from './common.js';

// Temporary code-native choreography. No raster or audio asset is generated.
export function entrance(ctx,kind){
 const {boss,scene}=ctx,scaleX=boss.scaleX||1,scaleY=boss.scaleY||1,alpha=boss.alpha??1;
 const g=scene.add?.graphics?.()?.setDepth(82);let closed=false;
 cue(ctx,'entry');
 const finish=()=>{if(closed)return;closed=true;g?.destroy();
  if(boss.active&&boss.getData('serial')===ctx.state.serial)boss.setAlpha(alpha).setScale(scaleX,scaleY).setRotation(0);};
 return {kind,update(p){
  if(closed)return;g?.clear();const view=worldView(scene),fade=Math.min(1,p*3);
  if(kind==='night'){
   g?.fillStyle(0x070910,.7*(1-p)).fillRect(view.x,view.y,view.width,view.height);
   // Hundreds of converging silhouettes are a single Graphics batch.
   for(let i=0;i<160;i++){const a=i*2.39996,r=(75+i%19*18)*(1-p),q=at(boss,r,a);
    g?.fillStyle(0x090611,.85).fillTriangle(q.x-7,q.y-3,q.x+7,q.y-3,q.x,q.y+4);}
   boss.setAlpha(fade).setScale(scaleX*(1.8-.8*p),scaleY*(1.8-.8*p));
  }else if(kind==='earth'){
   for(let i=0;i<12;i++){const a=i*TAU/12,end=at(boss,ctx.state.arena.radius*fade,a);
    g?.lineStyle(3,0xc58a3d,.65*(1-p)).lineBetween(boss.x,boss.y,end.x,end.y);
    const q=at(boss,80+i%3*30,a);g?.fillStyle(0xc9b37a,.75*(1-p)).fillRect(q.x,q.y-70*Math.sin(Math.PI*p),8,8);}
   boss.setAlpha(fade).setScale(scaleX,scaleY*(.15+.85*p));
  }else if(kind==='sun'){
   const q={x:boss.x,y:boss.y-160*(1-p)};
   g?.fillStyle(0xffcf4a,.5*(1-p)).fillCircle(q.x,q.y,70+50*p);
   if(!scene.settings.reduceFlashing)g?.fillStyle(0xffffff,Math.max(0,.3-Math.abs(p-.35)*2)).fillRect(view.x,view.y,view.width,view.height);
   for(let i=0;i<24;i++){const q=at(boss,130*p,i*TAU/24);g?.fillStyle(0xffcf4a,(1-p)*.8).fillEllipse(q.x,q.y,6,18);}
   boss.setAlpha(fade).setScale(scaleX*(.8+.2*p),scaleY*(.8+.2*p));
  }else{
   g?.fillStyle(0x111021,.8*(1-p)).fillEllipse(boss.x,boss.y,240*fade,130*fade);
   g?.lineStyle(4,0x3de0b0,(1-p)*.9).strokeEllipse(boss.x,boss.y,240*fade,130*fade);
   for(let i=0;i<15;i++){const q=at(boss,90,i*TAU/15);g?.lineStyle(5,0x3de0b0,(1-p)*.45).lineBetween(q.x,q.y,q.x,q.y-260*fade);}
   boss.setAlpha(fade).setScale(scaleX,scaleY*(.1+.9*p));
  }
 },finish};
}
