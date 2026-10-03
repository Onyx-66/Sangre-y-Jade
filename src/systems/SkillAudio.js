import manifest from '../audio/sfx-manifest.json' with { type: 'json' };

// Decoded buffers are reused; short-lived sources are bounded to four voices
// per ID / 24 total. Web Audio buffer loops avoid HTMLMediaElement loop gaps.
export class SkillAudio {
  constructor(audio,{createContext,fetcher,clock,random}={}) {
    this.audio=audio;this.last=new Map();this.loops=new Map();this.missing=new Set();this.buffers=new Map();this.voices=[];
    this.clock=clock||(()=>performance.now());this.random=random||Math.random;this.fetcher=fetcher||globalThis.fetch?.bind(globalThis);
    this.createContext=createContext||(()=>{const Context=globalThis.AudioContext||globalThis.webkitAudioContext;return Context?new Context():null;});
    this.base=`${audio.base||`${import.meta.env?.BASE_URL||'/'}assets/audio/`}sfx/`;
    this.paused=false;this.destroyed=false;this.epoch=0;this.plays=new Map();
    audio.effectClients?.add(this);if(audio.unlocked)this.unlock();
  }
  unlock(){
    if(this.destroyed)return;
    if(!this.context){this.context=this.createContext();if(this.context){this.gain=this.context.createGain();this.gain.connect(this.context.destination);this.applySettings();}}
    this.context?.resume?.().catch(()=>{});
    for(const loop of this.loops.values())if(!loop.voice&&!loop.loading&&!this.paused)this.startLoop(loop);
  }
  volume(){return Math.max(0,Math.min(1,this.audio.volumes?.().sfx??1));}
  applySettings(){if(this.gain)this.gain.gain.setValueAtTime(this.volume()*.55,this.context.currentTime);}
  has(id,kind){return Boolean(manifest.skills[id]?.kinds.includes(kind));}
  file(id,kind){return kind==='ui'?`ui/sfx-ui-${id}.wav`:`skills/sfx-${id}-${kind}.wav`;}
  fallback(id,kind){
    const file=this.file(id,kind);if(!this.missing.has(file)){this.missing.add(file);console.warn(`[skills] Sound fallback: ${file}`);}
    this.audio.sfx?.(/dart|needle|volley/.test(id)?'dart':'spell',.05);
  }
  async buffer(file){
    if(!this.buffers.has(file))this.buffers.set(file,(async()=>{
      const response=await this.fetcher(`${this.base}${file}`);if(!response.ok)throw Error(`Missing sound: ${file}`);
      return this.context.decodeAudioData(await response.arrayBuffer());
    })());
    return this.buffers.get(file);
  }
  play(id,kind='cast') {
    if(this.destroyed||this.audio.unlocked===false||(this.paused&&kind!=='ui')||this.volume()===0)return false;
    const known=kind==='ui'?manifest.ui[id]:manifest.skills[id];
    // Absent optional hit/proc files and explicitly silent traits are not errors.
    if(known&&kind!=='ui'&&!known.kinds.includes(kind))return false;
    const now=this.clock(),key=kind==='ui'?`ui:${id}`:id;
    if(now-(this.last.get(key)??-Infinity)<60)return false;this.last.set(key,now);
    this.unlock();
    if(!known||!this.context||!this.fetcher){this.fallback(id,kind);return false;}
    const epoch=this.epoch,file=this.file(id,kind);
    this.buffer(file).then(buffer=>{
      if(this.destroyed||epoch!==this.epoch||(this.paused&&kind!=='ui')||this.volume()===0)return;
      this.startVoice(key,buffer,false,0,file);
    }).catch(()=>{if(!this.destroyed&&epoch===this.epoch)this.fallback(id,kind);});return true;
  }
  ui(name){return this.play(name,'ui');}
  startVoice(id,buffer,loop,offset,file){
    this.voices=this.voices.filter(v=>!v.stopped);
    const same=this.voices.filter(v=>v.id===id);
    if(same.length>=4)this.stopVoice(same[0]);
    if(this.voices.filter(v=>!v.stopped).length>=24)this.stopVoice(this.voices.find(v=>!v.stopped));
    const source=this.context.createBufferSource(),gain=this.context.createGain(),rate=1+(this.random()*2-1)*.05;
    source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;source.connect(gain);gain.connect(this.gain);
    const voice={id,source,gain,rate,started:this.context.currentTime,offset,buffer,file,stopped:false};this.voices.push(voice);
    gain.gain.setValueAtTime(loop?0:1,this.context.currentTime);if(loop)gain.gain.linearRampToValueAtTime(1,this.context.currentTime+.02);
    source.onended=()=>{voice.stopped=true;source.disconnect();gain.disconnect();};source.start(0,offset);
    this.plays.set(file,(this.plays.get(file)||0)+1);return voice;
  }
  stopVoice(voice,fade=false){
    if(!voice||voice.stopped)return;voice.stopped=true;
    if(fade&&this.context?.state==='running'){
      const now=this.context.currentTime;
      voice.gain.gain.cancelScheduledValues?.(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);
      voice.gain.gain.linearRampToValueAtTime(0,now+.02);
      try{voice.source.stop(now+.025);}catch{} // onended disconnects after the release.
    }else{try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();}
  }
  loop(id,options={}) {
    if(this.destroyed||!this.has(id,'loop'))return false;
    let record=this.loops.get(id);
    if(record){if(options.duration!==undefined)record.remaining=options.duration;if(options.isAlive)record.isAlive=options.isAlive;return true;}
    record={id,remaining:options.duration??manifest.skills[id].effectSeconds??6,isAlive:options.isAlive,offset:0,loading:false};
    this.loops.set(id,record);if(this.audio.unlocked!==false&&!this.paused){this.unlock();if(!this.context)this.fallback(id,'loop');else this.startLoop(record);}return true;
  }
  startLoop(record){
    if(record.loading||record.voice||this.destroyed||this.paused||!this.context)return;
    record.loading=true;const file=this.file(record.id,'loop');
    this.buffer(file).then(buffer=>{
      record.loading=false;if(this.destroyed||this.paused||this.loops.get(record.id)!==record)return;
      record.voice=this.startVoice(record.id,buffer,true,record.offset%buffer.duration,file);
    }).catch(()=>{record.loading=false;if(this.loops.get(record.id)===record){this.stop(record.id);this.fallback(record.id,'loop');}});
  }
  stop(id){const loop=this.loops.get(id);this.loops.delete(id);if(loop)this.stopVoice(loop.voice,true);}
  update(dt){
    if(this.paused||this.destroyed)return;
    for(const [id,record]of this.loops){record.remaining-=dt;if(record.remaining<=0||record.isAlive?.()===false)this.stop(id);}
  }
  onFx(id,stage,ctx={}){
    const rule=manifest.skills[id];if(!rule||ctx.sound===false||this.paused||this.destroyed)return;
    if(stage==='cast')this.play(id,'cast');else if(stage==='impact')this.play(id,'hit');else if(stage==='proc')this.play(id,'proc');
    if(stage===rule.loopStage)this.loop(id,{duration:ctx.duration??rule.effectSeconds,isAlive:ctx.isAlive||(ctx.target?()=>ctx.target.active!==false:undefined)});
    if(stage==='impact'&&rule.stopOnImpact)this.stop(id);
  }
  pause(){
    if(this.paused)return;this.paused=true;this.epoch++;
    for(const loop of this.loops.values())if(loop.voice){const v=loop.voice;loop.offset=(v.offset+(this.context.currentTime-v.started)*v.rate)%v.buffer.duration;this.stopVoice(v,true);loop.voice=null;}
    this.voices.forEach(v=>this.stopVoice(v,true));
  }
  resume(){if(!this.paused||this.destroyed)return;this.paused=false;this.unlock();}
  stopAll(){this.epoch++;for(const id of [...this.loops.keys()])this.stop(id);this.voices.forEach(v=>this.stopVoice(v));}
  destroy(){
    if(this.destroyed)return;this.stopAll();this.destroyed=true;this.last.clear();this.buffers.clear();this.audio.effectClients?.delete(this);
    this.context?.close?.().catch(()=>{});
  }
}
