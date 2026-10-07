// Optional manifest-driven water audio. No synthesis or asset writes. The filter
// routes only music/ambience, preserves category gains and is detached at shutdown.
export class WaterAudio {
  constructor(audio){this.audio=audio;this.loops=new Set();this.missing=new Set();}
  play(name,point,group='water'){
    const id=`sfx/${group}/${name}`;if(this.audio?.v2)return this.audio.v2.play(id,{owner:this,x:point?.x,y:point?.y});
    if(!this.missing.has(id)){this.missing.add(id);console.warn(`[audio] Optional missing: ${id}; using silence`);}return false;
  }
  loop(name,on){
    if(this.loops.has(name)===on)return;if(on)this.loops.add(name);else this.loops.delete(name);
    const e=this.audio?.v2,id=`sfx/water/${name}`;if(!e)return;
    if(on&&!e.catalog[id]){e.missing(id);return;}
    e.channel(`water:${name}`,on?id:null,{fade:.15,owner:this});
  }
  submerged(on){
    const e=this.audio?.v2,c=e?.context;if(!c||!e.gains||!c.createBiquadFilter)return;
    if(this.filters&&this.filtered===on)return;
    if(!this.filters){this.filters=[];for(const name of ['music','ambience']){
      const gain=e.gains[name],filter=c.createBiquadFilter();filter.type='lowpass';gain.disconnect(e.master);gain.connect(filter);filter.connect(e.master);this.filters.push({gain,filter});}}
    for(const {filter} of this.filters)filter.frequency.setTargetAtTime(on?1200:c.sampleRate/2,c.currentTime,.08);
    this.filtered=on;
  }
  pause(){for(const name of [...this.loops])this.loop(name,false);}
  destroy(){this.pause();this.audio?.v2?.stopOwner(this);for(const {gain,filter}of this.filters||[]){gain.disconnect(filter);filter.disconnect();if(!this.audio.v2.destroyed)gain.connect(this.audio.v2.master);}this.filters=null;}
}
