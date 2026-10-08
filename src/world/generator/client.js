// One cancellable worker per load; monotonic progress survives derived retries.
export function generateWorldAsync(mapId,seed,onProgress=()=>{},signal){
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});let progress=0;
    const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new DOMException('Aborted','AbortError'));};
    if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
    worker.onerror=event=>{cleanup();reject(Error(event.message));};
    worker.onmessage=({data})=>{if(data.error){cleanup();reject(Error(data.error));}else if(data.world){cleanup();resolve(data.world);}else {progress=Math.max(progress,data.progress);onProgress(progress);}};
    worker.postMessage({mapId,seed});
  });
}
