// Until skill WAVs arrive, delegate to AudioDirector's existing pooled effects.
export class SkillAudio {
  constructor(audio) { this.audio=audio;this.last=new Map();this.loops=new Set();this.missing=new Set(); }
  play(id,kind='cast') {
    const now=performance.now();if(now-(this.last.get(id)??-Infinity)<60)return;
    this.last.set(id,now);
    const file=`sfx-${id}-${kind}.wav`;
    if(!this.missing.has(file)){this.missing.add(file);console.warn(`[skills] Sound fallback: ${file}`);}
    this.audio.sfx(kind==='hit'?'hit':kind==='proc'?'level':'spell',.05);
  }
  loop(id) { if(!this.loops.has(id)){this.loops.add(id);this.play(id,'loop');} }
  stop(id) { this.loops.delete(id); }
  destroy() { this.loops.clear();this.last.clear(); }
}
