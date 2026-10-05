export const LOAD_PHASES = [
  {id:'map',label:'Reading the map',weight:5},
  {id:'textures',label:'Waking the spirits',weight:40},
  {id:'audio',label:'Tuning the drums',weight:20},
  {id:'skills',label:'Preparing heroes and skills',weight:20},
  {id:'world',label:'Placing the ruins',weight:10},
  {id:'warmup',label:'Ready',weight:5},
];

// Progress is work completed, not a timer. Retry never rewinds completed work.
export class RunLoadProgress {
  constructor(onChange=()=>{}){this.values=new Map(LOAD_PHASES.map(p=>[p.id,0]));this.percent=0;this.phase='map';this.onChange=onChange;this.finished=false;}
  set(id,fraction){
    if(!this.values.has(id))throw new Error(`Unknown loading phase: ${id}`);
    if(!Number.isFinite(fraction))throw new Error('Invalid loading progress');
    this.phase=id;this.values.set(id,Math.max(this.values.get(id),Math.min(1,Math.max(0,fraction))));
    const completed=LOAD_PHASES.reduce((sum,p)=>sum+p.weight*this.values.get(p.id),0);
    this.percent=Math.max(this.percent,Math.min(this.finished?100:99,completed));
    this.onChange({percent:this.percent,phase:id,label:LOAD_PHASES.find(p=>p.id===id).label});return this.percent;
  }
  finish(){if(LOAD_PHASES.some(p=>this.values.get(p.id)!==1))throw new Error('Loading work is not complete');this.finished=true;this.set('warmup',1);}
}

export function abortError(){return new DOMException('Loading cancelled','AbortError');}
export function delay(ms,signal){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(abortError());return;}
    const abort=()=>{clearTimeout(timer);reject(abortError());},timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},Math.max(0,ms));
    signal?.addEventListener('abort',abort,{once:true});
  });
}
export async function minimumDisplay(started,{now=()=>performance.now(),sleep=delay,signal,min=600}={}){await sleep(Math.max(0,min-(now()-started)),signal);}

// Failed assets pause the pipeline. Critical ones cannot be skipped.
export async function loadWithRecovery(files,load,choose,{signal}={}){
  let pending=[...files];
  while(pending.length){
    if(signal?.aborted)throw abortError();
    const failed=await load(pending);
    if(!failed.length)return;
    const choice=await choose(failed);
    if(signal?.aborted)throw abortError();
    if(choice==='continue'&&failed.every(file=>!file.critical))return;
    if(choice!=='retry')throw new Error('Critical assets cannot be skipped');
    pending=failed;
  }
}
