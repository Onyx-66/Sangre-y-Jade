import { installManifestAudio } from '../audio/installAudio.js';

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
// V06 ambience files are supplied separately in public/assets/audio-v06 by the
// audio team. Keep the manifest paths here so absent files remain optional.
export const V06_AMBIENCE_FILES = Object.freeze({
  'overgrown-base': 'sfx/ambience/overgrown-base.mp3',
  'bloodmoon-base': 'sfx/ambience/bloodmoon-base.mp3',
  'cenote-base': 'sfx/ambience/cenote-base.mp3',
  'rain-light': 'sfx/ambience/rain-light.mp3',
  'rain-heavy': 'sfx/ambience/rain-heavy.mp3',
  'wind-soft': 'sfx/ambience/wind-soft.mp3',
  'wind-ashstorm': 'sfx/ambience/wind-ashstorm.mp3',
  'embers-crackle': 'sfx/ambience/embers-crackle.mp3',
  'water-flow': 'sfx/ambience/water-flow.mp3',
  drips: 'sfx/ambience/drips.mp3',
  'thunder-1': 'sfx/ambience/thunder-1.mp3',
  'thunder-2': 'sfx/ambience/thunder-2.mp3',
  'thunder-3': 'sfx/ambience/thunder-3.mp3',
  rockfall: 'sfx/ambience/rockfall.mp3',
  'leaves-rustle': 'sfx/ambience/leaves-rustle.mp3',
});
export const RUN_AUDIO_KEYS = Object.keys(SFX).map(key=>`sfx:${key}`);
export const RUN_AMBIENCE_KEYS = Object.keys(V06_AMBIENCE_FILES).map(key=>`ambience:${key}`);
export function audioFileFor(key){const [kind,name]=key.split(':');return (kind==='music'?TRACKS:kind==='sfx'?SFX:kind==='ambience'?V06_AMBIENCE_FILES:{})[name];}
export function audioDirectoryFor(key){return key.startsWith('ambience:')?'audio-v06':'audio';}

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
    this.missingWarnings = new Set();
    this.loopChannels = new Map();
    this.loopGenerations = new Map();
    this.ambiencePools = new Map();
    this.base = `${import.meta.env?.BASE_URL||'/'}assets/audio/`;
    this.v06Base = `${import.meta.env?.BASE_URL||'/'}assets/audio-v06/`;
    installManifestAudio(this);
  }

  unlock() {
    this.unlocked = true;
    for (const client of this.effectClients) client.unlock();
    if (this.current) this.current.play().catch(() => {});
    if(this.narration)this.narration.play().catch(()=>{});
    for (const { audio } of this.loopChannels.values()) audio.play().catch(() => {});
  }

  volumes() {
    const { master, music, sfx } = this.save.data.settings;
    const safe = (value) => Math.max(0, Math.min(1, Number(value) || 0));
    return { music: safe(master) * safe(music), sfx: safe(master) * safe(sfx) };
  }

  applySettings() {
    for (const client of this.effectClients) client.applySettings();
    for (const pool of this.sfxPools.values()) for (const voice of pool) voice.volume = this.volumes().sfx;
    for (const channel of this.loopChannels.values()) channel.audio.volume = channel.category === 'ambience' ? this.ambienceVolume() : this.volumes()[channel.category];
    for (const pool of this.ambiencePools.values()) for (const voice of pool) voice.volume = this.ambienceVolume();
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

  audioUrl(key) {
    const file = audioFileFor(key);
    if (!file) return null;
    return `${key.startsWith('ambience:') ? this.v06Base : this.base}${file}`;
  }

  ambienceVolume() {
    const settings = this.save.data.settings;
    const master = Math.max(0, Math.min(1, Number(settings.master) || 0));
    const ambience = Math.max(0, Math.min(1, Number(settings.ambience ?? .65)));
    return master * ambience;
  }

  warnMissing(key, file) {
    this.unavailable.add(key);
    if (this.missingWarnings.has(key)) return;
    this.missingWarnings.add(key);
    console.warn(`Optional audio unavailable; using silence/fallback: ${file}`);
  }

  ambience(name, fadeMs = 1500) {
    const key = name ? `ambience:${name}` : null;
    this.setLoopChannel('map-ambience', key, 'ambience', fadeMs);
  }

  weatherLoop(name, enabled = true, fadeMs = 1500) {
    this.setLoopChannel(`weather:${name}`, enabled ? `ambience:${name}` : null, 'ambience', fadeMs);
  }

  setLoopChannel(channelName, key, category, fadeMs = 1500) {
    const previous = this.loopChannels.get(channelName);
    if (!key) {
      if (!previous) return;
      const generation = (this.loopGenerations.get(channelName) || 0) + 1;
      this.loopGenerations.set(channelName, generation);
      this.loopChannels.delete(channelName);
      this.fadeLoop(previous.audio, 0, fadeMs, () => { previous.audio.pause(); previous.audio.src = ''; }, () => this.loopGenerations.get(channelName) === generation);
      return;
    }
    if (previous?.id === key) return;
    if (this.unavailable.has(key)) return;
    const file = audioFileFor(key), url = this.audioUrl(key);
    if (!file || !url) return;
    const prepared = this.prepared.get(key);
    const next = prepared || new Audio(url);
    this.prepared.delete(key);
    next.loop = true; next.preload = 'auto'; next.volume = 0;
    const generation = (this.loopGenerations.get(channelName) || 0) + 1;
    this.loopGenerations.set(channelName, generation);
    const live = { id: key, audio: next, category };
    this.loopChannels.set(channelName, live);
    next.addEventListener?.('error', () => {
      if (this.loopChannels.get(channelName) !== live) return;
      this.loopChannels.delete(channelName);
      this.warnMissing(key, file);
      next.pause(); next.src = '';
    }, { once: true });
    if (this.unlocked) next.play().catch(() => {});
    if (previous) this.fadeLoop(previous.audio, 0, fadeMs, () => { previous.audio.pause(); previous.audio.src = ''; }, () => this.loopGenerations.get(channelName) === generation);
    this.fadeLoop(next, category === 'ambience' ? this.ambienceVolume() : this.volumes()[category], fadeMs, null,
      () => this.loopGenerations.get(channelName) === generation);
  }

  fadeLoop(audio, target, duration, done, current = () => true) {
    const startVolume = audio.volume, started = performance.now();
    const step = now => {
      if (!current()) {
        // A newer transition may supersede this fade-out; do not leave its old
        // loop playing forever at a partially faded volume.
        if (target === 0) { audio.volume = 0; done?.(); }
        return;
      }
      const fraction = Math.max(0, Math.min(1, (now - started) / Math.max(1, duration)));
      audio.volume = startVolume + (target - startVolume) * fraction;
      if (fraction < 1) requestAnimationFrame(step);
      else done?.();
    };
    if (duration <= 0) { audio.volume = target; done?.(); }
    else requestAnimationFrame(step);
  }

  weatherOneShot(name, fallback = 'hit') {
    if (!this.unlocked) return;
    const key = `ambience:${name}`, file = audioFileFor(key);
    if (!file || this.unavailable.has(key)) {
      if (file) this.warnMissing(key, file);
      this.sfx(fallback);
      return;
    }
    let pool = this.ambiencePools.get(key);
    if (!pool) {
      pool = Array.from({ length: 3 }, () => {
        const audio = new Audio(this.audioUrl(key)); audio.preload = 'auto';
        audio.addEventListener?.('error', () => {
          this.warnMissing(key, file);
          this.sfx(fallback);
        }, { once: true });
        return audio;
      });
      this.ambiencePools.set(key, pool);
    }
    const audio = pool.find(voice => voice.paused) || pool[0];
    audio.pause(); audio.currentTime = 0; audio.volume = this.ambienceVolume();
    audio.play().catch(() => {});
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

