import { abortError } from './RunLoadProgress.js';

// Phaser file progress covers images, sheets and atlases, including cache hits.
export function loadTextureBatch(scene,files,{onProgress=()=>{},signal,timeout=20000}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(abortError());return;}
    const pending=files.filter(file=>!scene.textures.exists(file.key));
    if(!pending.length){onProgress(1);resolve([]);return;}
    const failures=new Map(),byKey=new Map(pending.map(file=>[file.key,file]));
    const cached=files.length-pending.length;
    const progress=value=>onProgress((cached+value*pending.length)/files.length);
    const error=file=>{const entry=byKey.get(file.key);if(entry)failures.set(entry.key,entry);};
    const cleanup=()=>{clearTimeout(timer);scene.load.off('progress',progress);scene.load.off('loaderror',error);scene.load.off('complete',complete);signal?.removeEventListener('abort',abort);};
    const complete=()=>{cleanup();onProgress(1);resolve([...failures.values()]);};
    const abort=()=>{cleanup();scene.load.reset();reject(abortError());};
    const timer=setTimeout(()=>{for(const file of pending)if(!scene.textures.exists(file.key))failures.set(file.key,file);scene.load.reset();complete();},timeout);
    scene.load.on('progress',progress);scene.load.on('loaderror',error);scene.load.once('complete',complete);signal?.addEventListener('abort',abort,{once:true});
    for(const file of pending){
      if(file.type==='atlas')scene.load.atlas(file.key,file.url,file.dataUrl);
      else if(file.type==='spritesheet')scene.load.spritesheet(file.key,file.url,file.config);
      else scene.load.image(file.key,file.url);
    }
    onProgress(cached/files.length);scene.load.start();
  });
}

export async function loadAudioBatch(audio,skillAudio,files,{onProgress=()=>{},signal}={}){
  let completed=0;const failed=[];
  // Limit browser decoders and memory rather than launching all WAVs at once.
  let index=0;
  await Promise.all(Array.from({length:Math.min(4,files.length)},async()=>{
    while(index<files.length){
      if(signal?.aborted)throw abortError();
      const file=files[index++];
      try{if(file.type==='skill-audio')await skillAudio.prepareFile(file.file,{signal});else await audio.prepareKey(file.key,{signal});}
      catch(error){if(error.name==='AbortError')throw error;failed.push(file);}
      onProgress(++completed/files.length);
    }
  }));
  if(!files.length)onProgress(1);return failed;
}
