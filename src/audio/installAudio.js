import { ManifestAudio } from './ManifestAudio.js';
import { AUDIO_CATALOG } from './catalog.js';
import { bindAudioFeedback } from './uiFeedback.js';

export function installManifestAudio(audio) {
  // Node/legacy embedders without the build-time manifest keep their old API.
  if (!Object.keys(AUDIO_CATALOG).length) return;
  const engine = audio.v2 = new ManifestAudio(audio.save, {base:`${import.meta.env?.BASE_URL||'/'}assets/`});
  const unlock=audio.unlock.bind(audio),apply=audio.applySettings.bind(audio);
  audio.unlock=()=>{engine.unlock();unlock();};
  audio.applySettings=()=>{engine.applySettings();apply();};
  audio.play=(id,options={})=>engine.play(id,{owner:'run',...options});
  audio.voice=(name,options={})=>engine.voice(name,options);
  audio.ui=name=>engine.play(`sfx/ui/${name}`,{owner:'ui'});
  audio.sfx=name=>{if(name==='click')return performance.now()-(audio.lastUiClick??-Infinity)<60?false:audio.ui('button-primary');if(['level','victory','defeat'].includes(name)){engine.voice(`announcer-${name==='level'?'level-up':name}`,{owner:'announcer'});if(name==='level'&&engine.runHero)engine.voice(`${engine.runHero}-level`,{owner:'hero'});if(name!=='level')engine.music(name);}return engine.play(name,{owner:'run'});};
  audio.music=(name,fadeMs=1200)=>{audio.currentName=name;return engine.music(name,fadeMs/1000);};
  audio.stopMusic=()=>{audio.currentName='';engine.waitingMusic=null;engine.musicRequest=(engine.musicRequest||0)+1;engine.channel('music',null,{fade:0});};
  audio.ambience=(name,fadeMs=1500)=>engine.channel('ambience',name?`sfx/ambience/${name}`:null,{fade:fadeMs/1000,owner:'run'});
  audio.weatherLoop=(name,enabled=true,fadeMs=1500)=>engine.channel(`weather:${name}`,enabled?`sfx/ambience/${name}`:null,{fade:fadeMs/1000,owner:'run'});
  audio.weatherOneShot=name=>engine.play(`sfx/ambience/${name}`,{owner:'run'});
  audio.narrate=(index,offset=0)=>{engine.stopOwner('narration');return engine.voice(`narration-${index}`,{offset,owner:'narration'});};
  audio.stopNarration=()=>engine.stopOwner('narration');
  audio.prepareManifest=(ids,onProgress,signal)=>engine.preload(ids,onProgress,signal);
  const visibility=()=>{if(document.hidden)engine.context?.suspend?.().catch(()=>{});else if(engine.unlocked)engine.context?.resume?.().catch(()=>{});};
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
  const unbindUi=bindAudioFeedback(audio);
  audio.destroy=()=>{unbindUi();if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);engine.destroy();};
  engine.preload([...engine.group('ui'),...engine.group('core'), 'music/menu']);
}
