import { AUDIO_CATALOG, AUDIO_AVAILABLE } from './catalog.js';

export const clamp = (value, fallback = 1) => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : fallback));
const oldCore = new Set('click slash spell dart hit pickup cacao dash level hurt boss victory defeat'.split(' '));
export const musicAliases = { day: 'map-overgrown', night: 'map-bloodmoon', cenote: 'map-cenote', boss: 'boss-camazotz' };
const oldMusic = { menu:'menu', prologue:'prologue', loading:'menu', 'shop-upgrades':'menu', 'map-overgrown':'day', 'map-bloodmoon':'night', 'map-cenote':'cenote' };

export function resolveAudio(id, catalog, language = 'en') {
  if (catalog[id]) return id;
  const candidates = [id.replace(/^enemy-/, 'sfx/enemies/'), id.replace(/^boss-/, 'sfx/bosses/').replace(/-(entry|phase|death)-cast$/, '-$1'), `sfx/core/${id}`, `sfx/ui/${id}`, `sfx/ambience/${id}`, `voice/${language}/${id}`];
  if (/^ally-/.test(id)) candidates.unshift(/-cast$/.test(id) ? 'sfx/ui/ally-cast' : /saintess/.test(id) ? 'sfx/core/spell' : 'sfx/core/slash');
  candidates.push(`sfx/water/${id}`,`sfx/steps/${id}`);
  return candidates.find(key => catalog[key]) || null;
}

export function fallbackFile(id) {
  const name = id.split('/').at(-1);
  if (id.startsWith('music/')) return ['victory','defeat'].includes(name)?`sfx-${name}.wav`:`music-${oldMusic[name] || (name.startsWith('boss-') ? 'boss' : 'menu')}.wav`;
  if (/^voice\/.+\/narration-\d+$/.test(id)) return `narration/en-${name.split('-').at(-1)}.wav`;
  if (id.startsWith('sfx/core/') && oldCore.has(name)) return `sfx-${name}.wav`;
  if(id.startsWith('sfx/core/')){const fallback={heal:'pickup','shield-hit':'spell','shield-break':'hit','xp-gem':'pickup','enemy-hit-flesh':'hit','enemy-hit-bone':'hit','enemy-hit-stone':'hit','hero-death':'defeat'}[name];if(fallback)return `sfx-${fallback}.wav`;}
  if (id.startsWith('sfx/skills/')) return `sfx/skills/sfx-${name}.wav`;
  if (id.startsWith('sfx/ui/') && /^(slot-unlock|milestone-pick|pick-active|pick-passive|pick-ally|companion-join|ally-cast|ally-rank)$/.test(name)) return `sfx/ui/sfx-ui-${name}.wav`;
  if (id.startsWith('sfx/ui/')) return 'sfx-click.wav';
  if (id.startsWith('sfx/enemies/') || id.startsWith('sfx/bosses/')) return /windup|warn|entry/.test(name) ? 'sfx-boss.wav' : 'sfx-hit.wav';
  return null;
}

export class ManifestAudio {
  constructor(save, { catalog = AUDIO_CATALOG, available = AUDIO_AVAILABLE, base = '/assets/', contextFactory, fetcher = globalThis.fetch?.bind(globalThis), random = Math.random, warn = console.warn, autoTick = true } = {}) {
    this.save = save; this.catalog = catalog; this.available = new Set(available); this.base = base;
    this.contextFactory = contextFactory || (() => { const C = globalThis.AudioContext || globalThis.webkitAudioContext; return C ? new C() : null; });
    this.fetcher = fetcher; this.random = random; this.warn = warn; this.autoTick = autoTick;
    this.buffers = new Map(); this.last = new Map(); this.warnings = new Set(); this.voices = new Set(); this.pending = new Set(); this.channels = new Map(); this.tokens = new Map(); this.channelOwners=new Map();this.ducks = new Set(); this.ownerEpoch = new Map();this.objectEpoch=new WeakMap();this.pausedOwners = new Set();
    this.unlocked = false; this.destroyed = false; this.listener = () => ({x:0,y:0}); this.abort = new AbortController();
  }
  language() { return ['en','fr','ar'].includes(this.save.data.settings.language) ? this.save.data.settings.language : 'en'; }
  resolve(id) { return resolveAudio(id, this.catalog, this.language()); }
  ensure() {
    if (this.destroyed) return null;
    if (!this.context) {
      this.context = this.contextFactory(); if (!this.context) return null;
      this.master = this.context.createGain(); this.master.connect(this.context.destination); this.gains = {};
      for (const category of ['music','sfx','ambience','voice','ui']) { const gain = this.context.createGain(); gain.connect(this.master); this.gains[category] = gain; }
      this.applySettings();
      if (this.autoTick) this.timer = setInterval(() => this.update(), 50);
    }
    return this.context;
  }
  unlock() { this.unlocked = true; this.ensure()?.resume?.().catch(() => {});if(this.waitingMusic){const args=this.waitingMusic;this.waitingMusic=null;this.music(...args);} }
  volume(category) { const s = this.save.data.settings; return category === 'voice' && s.voiceEnabled === false ? 0 : clamp(s[category], category === 'ambience' ? .65 : category === 'voice' ? .85 : 1); }
  applySettings() {
    if (!this.context) return;
    const now = this.context.currentTime; this.master.gain.setValueAtTime(clamp(this.save.data.settings.master), now);
    for (const [category, gain] of Object.entries(this.gains)) gain.gain.setTargetAtTime(this.volume(category) * (category === 'music' && this.ducks.size ? Math.pow(10,-6/20) : 1), now, .04);
    if (this.save.data.settings.voiceEnabled === false) for (const voice of [...this.voices]) if (voice.category === 'voice') this.stopVoice(voice);
  }
  duck(reason, enabled) { if (enabled) this.ducks.add(reason); else this.ducks.delete(reason); this.applySettings(); }
  missing(id) { if (!this.warnings.has(id)) { this.warnings.add(id); this.warn(`[audio] Optional missing: ${id}; using legacy sound or silence`); } }
  async buffer(id) {
    if (!this.catalog[id] || !this.ensure()) return null;
    if (!this.buffers.has(id)) this.buffers.set(id, (async () => {
      const item = this.catalog[id], legacy = fallbackFile(id), urls = [];
      if (this.available.has(item.file)) urls.push(`${this.base}audio-v06/${item.file}`); else this.missing(id);
      if (legacy) urls.push(`${this.base}audio/${legacy}`);
      for (const url of urls) {
        const controller=new AbortController(),abort=()=>controller.abort();this.abort.signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,20000);
        try { const response = await this.fetcher(url, {signal:controller.signal}); if (!response.ok) throw Error('Unavailable'); return await this.context.decodeAudioData(await response.arrayBuffer()); }
        catch { if (this.destroyed) return null; this.missing(id); }
        finally{clearTimeout(timer);this.abort.signal.removeEventListener('abort',abort);}
      }
      return null;
    })());
    return this.buffers.get(id);
  }
  async preload(ids, onProgress = () => {}, signal) {
    const unique = [...new Set(ids)].filter(id => this.catalog[id]); let complete = 0;
    // Bounded concurrent decodes avoid a startup CPU/memory spike.
    const queue = [...unique]; await Promise.all(Array.from({length:Math.min(4,queue.length)}, async () => { while(queue.length && !this.destroyed) {if(signal?.aborted)throw new DOMException('Loading cancelled','AbortError'); await this.buffer(queue.shift());if(signal?.aborted)throw new DOMException('Loading cancelled','AbortError');onProgress(++complete / unique.length); } }));
    onProgress(1);
  }
  group(group, filter = () => true) { return Object.keys(this.catalog).filter(id => this.catalog[id].group === group && filter(id)); }
  spatial(options) {
    if (!Number.isFinite(options.x) || !Number.isFinite(options.y)) return {volume:1,pan:0};
    const listener = this.listener() || {x:0,y:0}, dx = options.x-listener.x, dy = options.y-listener.y;
    return {volume:clamp(1-Math.hypot(dx,dy)/1000), pan:Math.max(-1,Math.min(1,dx/600))};
  }
  async play(request, options = {}) {
    const id = this.resolve(request); if (!id) { this.missing(request); return false; }
    const item = this.catalog[id], owner = options.owner;
    if (!this.unlocked || this.destroyed || this.pausedOwners.has(owner) || !this.volume(item.category)) return false;
    const now = this.ensure()?.currentTime; if (now === undefined) return false;
    if (now-(this.last.get(id) ?? -Infinity) < .06) return false;
    this.last.set(id, now);
    // Serialize boss dialogue by refusing new lines while one is decoding/playing.
    const bossVoice = id.startsWith('voice/') && id.includes('/boss-');
    if (bossVoice && [...this.pending,...this.voices].some(v => v.bossVoice)) return false;
    const enemy = id.startsWith('sfx/enemies/')||id.startsWith('sfx/core/enemy-hit-'), effect = ['sfx','ui'].includes(item.category);
    const occupied = [...this.pending,...this.voices];
    if ((effect && occupied.filter(v=>v.effect).length >= 24) || (enemy && occupied.filter(v=>v.enemy).length >= 8)) return false;
    const reservation = {effect,enemy,bossVoice,owner}; this.pending.add(reservation); const epoch = this.epochMap(owner).get(owner);
    try {
      const buffer = await this.buffer(id);
      if (!buffer || this.destroyed || this.epochMap(owner).get(owner)!==epoch || this.pausedOwners.has(owner) || !this.volume(item.category)) return false;
      return this.start(id, buffer, {...options,...reservation, rate:effect ? 1+(this.random()*2-1)*.04 : 1});
    } finally { this.pending.delete(reservation); }
  }
  start(id, buffer, options = {}) {
    const ctx = this.context, now = ctx.currentTime, category = this.catalog[id].category;
    const source = ctx.createBufferSource(), gain = ctx.createGain(), panner = ctx.createStereoPanner?.();
    const spatial = this.spatial(options); source.buffer = buffer; source.loop = !!options.loop; source.playbackRate.value = options.rate || 1;
    source.connect(gain); if (panner) { gain.connect(panner); panner.pan.value = spatial.pan; panner.connect(this.gains[category]); } else gain.connect(this.gains[category]);
    const voice = {...options,id,source,gain,panner,buffer,category,started:now,offset:options.offset||0,stopped:false}; this.voices.add(voice);
    gain.gain.setValueAtTime(options.fade ? 0 : spatial.volume,now); if(options.fade) gain.gain.linearRampToValueAtTime(spatial.volume,now+options.fade);
    source.onended = () => this.cleanup(voice);
    if(category==='voice') this.duck(voice,true);
    source.start(0,Math.min(voice.offset,Math.max(0,buffer.duration-.01)));
    return voice;
  }
  cleanup(voice) {
    if (voice.stopped) return; voice.stopped = true; this.voices.delete(voice);
    voice.source.disconnect(); voice.gain.disconnect(); voice.panner?.disconnect();
    for(const [name,record]of this.channels)if(record.voice===voice&&!record.crossfade){this.channels.delete(name);this.channelOwners.delete(name);}
    if(voice.category==='voice') this.duck(voice,false);
    if(voice.category==='music'&&![...this.voices].some(v=>v.id===voice.id)&&![...this.channels.values()].some(v=>v.id===voice.id))this.buffers.delete(voice.id);
  }
  stopVoice(voice, fade = 0) {
    if (!voice || voice.stopped) return;
    if (fade) { const now=this.context.currentTime; voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(voice.gain.gain.value,now); voice.gain.gain.linearRampToValueAtTime(0,now+fade); try {voice.source.stop(now+fade);} catch {} }
    else { try { voice.source.stop(); } catch {} this.cleanup(voice); }
  }
  async channel(name, id, {fade=1.5,offset=0,end,owner} = {}) {
    const previous=this.channels.get(name);
    if(id && previous?.id===id && previous.offset===offset) return;
    const token=(this.tokens.get(name)||0)+1;this.tokens.set(name,token);
    this.channelOwners.set(name,owner);
    if(!id) { this.channels.delete(name); if(previous)this.stopVoice(previous.voice,fade); return; }
    const buffer=await this.buffer(id); if(this.destroyed||this.tokens.get(name)!==token)return;
    this.channels.delete(name);if(previous)this.stopVoice(previous.voice,fade);
    if(!buffer||!this.unlocked)return;
    const loop=this.catalog[id].loop, crossfade=loop&&this.catalog[id].category==='music';
    const voice=this.start(id,buffer,{loop:loop&&!crossfade,offset,fade,owner});
    const finish=end??buffer.duration;
    this.channels.set(name,{id,voice,offset,end:finish,owner,crossfade,nextAt:crossfade?this.context.currentTime+Math.max(.1,finish-offset-Math.min(4,(finish-offset)/2)):Infinity});
  }
  music(name,fade=1.2,phase) {
    const request=this.musicRequest=(this.musicRequest||0)+1;
    if(!this.unlocked){this.waitingMusic=[name,fade,phase];return;}
    name=musicAliases[name]||name;const id=`music/${name}`;
    if(!this.catalog[id])return;
    if(name==='boss-ahpuch') return this.buffer(id).then(buffer=>{if(buffer&&!this.destroyed&&this.musicRequest===request){const section=buffer.duration/3,index=Math.max(0,Math.min(2,(phase||1)-1));return this.channel('music',id,{fade,offset:section*index,end:section*(index+1)});}});
    return this.channel('music',id,{fade});
  }
  voice(name,options={}) { return this.play(`voice/${this.language()}/${name}`,options); }
  update() {
    if(!this.context||this.destroyed)return;
    const now=this.context.currentTime;
    for(const record of this.channels.values())if(record.crossfade&&now>=record.nextAt){
      const fade=Math.min(4,(record.end-record.offset)/2),old=record.voice;
      record.voice=this.start(record.id,old.buffer,{offset:record.offset,fade,owner:record.owner}); this.stopVoice(old,fade);
      record.nextAt=now+Math.max(.1,record.end-record.offset-fade);
    }
  }
  stopOwner(owner) {
    const epochs=this.epochMap(owner);epochs.set(owner,(epochs.get(owner)||0)+1);
    for(const [name,value]of this.channelOwners)if(value===owner){this.tokens.set(name,(this.tokens.get(name)||0)+1);this.channelOwners.delete(name);}
    for(const v of [...this.voices])if(v.owner===owner)this.stopVoice(v);
    for(const [name,r]of this.channels)if(r.owner===owner)this.channel(name,null,{fade:0});
  }
  epochMap(owner){return owner&&typeof owner==='object'?this.objectEpoch:this.ownerEpoch;}
  pauseOwner(owner) {this.pausedOwners.add(owner);this.stopOwner(owner);}
  resumeOwner(owner) {this.pausedOwners.delete(owner);}
  destroy() {
    if(this.destroyed)return;this.destroyed=true;this.abort.abort();clearInterval(this.timer);
    for(const voice of [...this.voices])this.stopVoice(voice);
    this.channels.clear();this.channelOwners.clear();this.pending.clear();this.buffers.clear();this.tokens.clear();this.ducks.clear();this.pausedOwners.clear();this.ownerEpoch.clear();this.context?.close?.().catch(()=>{});
  }
}
