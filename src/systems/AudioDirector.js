const TRACKS = {
  prologue: 'music-prologue.wav',
  menu: 'music-menu.wav',
  day: 'music-day.wav',
  night: 'music-night.wav',
  cenote: 'music-cenote.wav',
  boss: 'music-boss.wav',
};

const SFX = {
  click: 'sfx-click.wav',
  slash: 'sfx-slash.wav',
  spell: 'sfx-spell.wav',
  dart: 'sfx-dart.wav',
  hit: 'sfx-hit.wav',
  pickup: 'sfx-pickup.wav',
  cacao: 'sfx-cacao.wav',
  dash: 'sfx-dash.wav',
  level: 'sfx-level.wav',
  hurt: 'sfx-hurt.wav',
  boss: 'sfx-boss.wav',
  victory: 'sfx-victory.wav',
  defeat: 'sfx-defeat.wav',
};
export const RUN_AUDIO_KEYS = Object.keys(SFX).map(key=>`sfx:${key}`);
export function audioFileFor(key){const [kind,name]=key.split(':');return (kind==='music'?TRACKS:kind==='sfx'?SFX:{})[name];}

export class AudioDirector {
  constructor(save) {
    this.save = save;
    this.current = null;
    this.currentName = '';
    this.unlocked = false;
    this.sfxPools = new Map();
    this.lastSound = new Map();
    this.effectClients = new Set();
    this.prepared = new Map();
    this.unavailable = new Set();
    this.base = `${import.meta.env?.BASE_URL||'/'}assets/audio/`;
  }

  unlock() {
    this.unlocked = true;
    for (const client of this.effectClients) client.unlock();
    if (this.current) this.current.play().catch(() => {});
    if(this.narration)this.narration.play().catch(()=>{});
  }

  volumes() {
    const { master, music, sfx } = this.save.data.settings;
    const safe = (value) => Math.max(0, Math.min(1, Number(value) || 0));
    return { music: safe(master) * safe(music), sfx: safe(master) * safe(sfx) };
  }

  applySettings() {
    for (const client of this.effectClients) client.applySettings();
    for (const pool of this.sfxPools.values()) for (const voice of pool) voice.volume = this.volumes().sfx;
    if (this.current) this.current.volume = this.volumes().music*(this.currentName==='prologue'?.3:1);
    if(this.narration)this.narration.volume=Math.max(0,Math.min(1,this.save.data.settings.master*.95));
  }

  narrate(index,offset=0){
    this.stopNarration();const audio=new Audio(`${this.base}narration/en-${index}.wav`);this.narration=audio;audio.preload='auto';audio.volume=Math.max(0,Math.min(1,this.save.data.settings.master*.95));
    if(offset>0)audio.addEventListener('loadedmetadata',()=>{audio.currentTime=Math.min(offset,Math.max(0,audio.duration-.02));},{once:true});
    if(this.unlocked)audio.play().catch(()=>{});
  }

  stopNarration(){if(this.narration){this.narration.pause();this.narration.src='';this.narration=null;}}

  prepareKey(key,{signal,timeout=20000}={}) {
    const file=audioFileFor(key);
    if(!file)return Promise.reject(new Error(`Unknown audio key: ${key}`));
    if(signal?.aborted)return Promise.reject(new DOMException('Loading cancelled','AbortError'));
    const cached=this.prepared.get(key);if(cached?.readyState>=2)return Promise.resolve(cached);
    return new Promise((resolve,reject)=>{
      const voice=cached||new Audio();this.prepared.set(key,voice);voice.preload='auto';
      const cleanup=()=>{clearTimeout(timer);voice.removeEventListener('loadeddata',ready);voice.removeEventListener('error',fail);signal?.removeEventListener('abort',abort);};
      const ready=()=>{cleanup();this.unavailable.delete(key);resolve(voice);};
      const failed=error=>{cleanup();this.prepared.delete(key);if(error.name!=='AbortError')this.unavailable.add(key);voice.src='';reject(error);};
      const fail=()=>failed(new Error(`Missing audio: ${file}`));
      const abort=()=>failed(new DOMException('Loading cancelled','AbortError'));
      const timer=setTimeout(fail,timeout);
      voice.addEventListener('loadeddata',ready,{once:true});voice.addEventListener('error',fail,{once:true});signal?.addEventListener('abort',abort,{once:true});
      voice.src=`${this.base}${file}`;voice.load();
    });
  }

  music(name, fadeMs = 550) {
    if(this.unavailable.has(`music:${name}`)){if(name!=='menu'&&!this.unavailable.has('music:menu'))return this.music('menu',fadeMs);return;}
    if(name!=='prologue')this.stopNarration();
    if (this.currentName === name) {
      this.applySettings();
      return;
    }
    const file = TRACKS[name] || TRACKS.menu;
    const next = this.prepared.get(`music:${name}`)||new Audio(`${this.base}${file}`);
    this.prepared.delete(`music:${name}`);
    next.loop = true;
    next.preload = 'auto';
    next.volume = 0;
    const previous = this.current;
    const fadeGeneration=(this.fadeGeneration||0)+1;
    this.fadeGeneration=fadeGeneration;
    this.current = next;
    this.currentName = name;
    if (this.unlocked) next.play().catch(() => {});
    const start = performance.now();
    const fade = (now) => {
      if(this.fadeGeneration!==fadeGeneration){if(previous){previous.pause();previous.src='';}return;}
      // Some headless browsers expose rAF and performance timestamps with a tiny
      // negative first-frame skew. Clamp both bounds before touching media.volume.
      const t = Math.max(0, Math.min(1, (now - start) / Math.max(1, fadeMs)));
      const liveTarget=this.volumes().music*(name==='prologue'?.3:1);
      next.volume = liveTarget * t;
      if (previous) previous.volume = liveTarget * (1 - t);
      if (t < 1) requestAnimationFrame(fade);
      else if (previous) {
        previous.pause();
        previous.src = '';
      }
    };
    requestAnimationFrame(fade);
  }

  stopMusic() {
    if (this.current) {
      this.current.pause();
      this.current = null;
      this.currentName = '';
    }
  }

  sfx(name, variance = 0) {
    if(this.unavailable.has(`sfx:${name}`)){const fallback=['spell','hit','slash'].find(key=>!this.unavailable.has(`sfx:${key}`));if(!fallback)return;name=fallback;}
    if (!this.unlocked || !SFX[name]) return;
    const now=performance.now();
    if(now-(this.lastSound.get(name)||-1000)<(name==='pickup'?75:35))return;
    this.lastSound.set(name,now);
    let pool = this.sfxPools.get(name);
    if (!pool) {
      pool = Array.from({ length: 4 }, (_,index) => {
        const audio = index===0&&this.prepared.get(`sfx:${name}`)||new Audio(`${this.base}${SFX[name]}`);
        audio.preload = 'auto';
        return audio;
      });
      this.sfxPools.set(name, pool);
      this.prepared.delete(`sfx:${name}`);
    }
    const audio = pool.find((entry) => entry.paused) || pool[0];
    audio.pause();
    audio.currentTime = 0;
    audio.volume = this.volumes().sfx;
    audio.playbackRate = variance ? 1 + (Math.random() * 2 - 1) * variance : 1;
    audio.play().catch(() => {});
  }
}

