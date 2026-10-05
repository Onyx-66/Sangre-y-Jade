import Phaser from 'phaser';
import { textureManifest } from '../art/textureManifest.js';
import { FxDirector } from '../fx/FxDirector.js';
import { IXCHEL_FX_IDS } from '../fx/recipes/ixchel.js';
import { RUN_AUDIO_KEYS } from '../systems/AudioDirector.js';
import { runSkillIds,fxManifest,runAudioManifest,prepareMapData } from '../systems/RunLoadManifest.js';
import { loadTextureBatch,loadAudioBatch } from '../systems/RunAssetLoader.js';
import { loadWithRecovery,minimumDisplay,abortError } from '../systems/RunLoadProgress.js';

export function renderedFrames(game,count,signal,onProgress=()=>{}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(abortError());return;}
    let frames=0;
    const cleanup=()=>{game.events.off('postrender',render);signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(abortError());};
    const render=()=>{onProgress(++frames/count);if(frames>=count){cleanup();resolve();}};
    game.events.on('postrender',render);signal?.addEventListener('abort',abort,{once:true});
  });
}

export class LoadingScene extends Phaser.Scene {
  constructor(options){super({key:'RunLoader'});this.options=options;}
  create(){this.run().catch(error=>this.options.failed(error));}
  async run(){
    const o=this.options,{hero,map,progress,screen,signal,skillAudio}=o,base=import.meta.env.BASE_URL;
    const recover=(files,load)=>loadWithRecovery(files,load,failures=>screen.failure(failures),{signal});
    await recover([{key:`map:${map.id}`,critical:true}],async files=>{try{progress.set('map',0);o.mapData=prepareMapData(map,hero);await o.prepareMap?.(o.mapData,value=>progress.set('map',value),signal);progress.set('map',1);return [];}catch(error){if(error.name==='AbortError')throw error;return files;}});
    await recover(textureManifest({hero,map,base}),files=>loadTextureBatch(this,files,{signal,onProgress:value=>progress.set('textures',value)}));
    const ids=runSkillIds(hero,{extraIds:hero.id==='ixchel'?IXCHEL_FX_IDS:[],allies:o.allies||[]});
    await recover(runAudioManifest(ids,map,{base,audioKeys:o.audioKeys||RUN_AUDIO_KEYS}),files=>loadAudioBatch(o.audio,skillAudio,files,{signal,onProgress:value=>progress.set('audio',value)}));
    await recover(fxManifest(ids,FxDirector.recipes,base),files=>loadTextureBatch(this,files,{signal,onProgress:value=>progress.set('skills',value)}));
    progress.set('skills',1);
    progress.set('world',0);
    const scene=await new Promise((resolve,reject)=>{
      const abort=()=>reject(abortError());signal.addEventListener('abort',abort,{once:true});
      o.onSceneReady=scene=>{signal.removeEventListener('abort',abort);resolve(scene);};
      this.scene.start('Ritual');
    });
    if(signal.aborted)throw abortError();
    // Public extension point for the later map/prop-pool step; existing creation
    // reports its actual checkpoints rather than an artificial progress ramp.
    if(o.prepareWorld)await recover([{key:'map-generation',critical:true}],async files=>{try{await o.prepareWorld(scene,value=>progress.set('world',.8+value*.2),signal);return [];}catch(error){if(error.name==='AbortError')throw error;return files;}});
    progress.set('world',1);
    await renderedFrames(this.game,2,signal,value=>progress.set('warmup',value));
    await minimumDisplay(o.started,{signal});
    if(signal.aborted)throw abortError();
    progress.finish();await renderedFrames(this.game,1,signal);o.complete(scene);
  }
}
