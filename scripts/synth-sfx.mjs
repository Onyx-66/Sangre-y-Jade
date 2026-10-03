import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const SAMPLE_RATE=44100;
export const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
export function seeded(seed){let state=seed>>>0;return()=>{state+=0x6d2b79f5;let t=Math.imul(state^state>>>15,1|state);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export function oscillator(type,phase){
  const p=((phase/(Math.PI*2))%1+1)%1;
  if(type==='saw')return 2*p-1;
  if(type==='square')return p<.5?1:-1;
  if(type==='triangle')return 1-4*Math.abs(p-.5);
  return Math.sin(phase);
}
export function adsr(t,duration,{attack=.003,decay=.08,sustain=.25,release=.08}={}){
  if(t<0||t>=duration)return 0;
  const a=Math.min(attack,duration*.25),d=Math.min(decay,duration*.3),r=Math.min(release,duration*.45);
  const onset=t<a?t/Math.max(a,1e-6):t<a+d?1-(1-sustain)*(t-a)/Math.max(d,1e-6):sustain;
  return Math.max(0,onset)*Math.min(1,(duration-t)/Math.max(r,1e-6));
}
function lowpass(cutoff){return 1-Math.exp(-2*Math.PI*Math.min(18000,Math.max(20,cutoff))/SAMPLE_RATE);}

/** All randomness is per layer, all tails bounded; no browser, network or audio library. */
export function synthesize(recipe){
  if(!Number.isFinite(recipe.duration)||recipe.duration<=0||!Array.isArray(recipe.layers)||recipe.layers.length<2)throw Error('A sound needs a positive duration and at least two layers.');
  const nominal=Math.round(recipe.duration*SAMPLE_RATE),overlap=recipe.loop?Math.min(Math.round(.04*SAMPLE_RATE),Math.floor(nominal/4)):0;
  const n=nominal+overlap;let samples=new Float64Array(n);
  recipe.layers.forEach((layer,index)=>{
    const random=seeded(hash(`${recipe.seed}:${index}`)),start=Math.round((layer.start||0)*SAMPLE_RATE),length=Math.round((layer.duration??recipe.duration)*SAMPLE_RATE)+(layer.continuous?overlap:0);
    let phase=layer.phase||0,modPhase=0,low=0,highLow=0,post=0;
    const lo=lowpass(layer.filter?.lowpass??8000),hi=lowpass(layer.filter?.highpass??20),postLo=lowpass(layer.filter?.postLowpass??12000);
    for(let i=0;i<length&&i+start<n;i++){
      const t=i/SAMPLE_RATE,ratio=i/Math.max(1,length-1),from=layer.frequency??220,to=layer.endFrequency??from;
      const freq=from*Math.pow(Math.max(1,to)/Math.max(1,from),ratio),vibrato=1+(layer.vibrato||0)*Math.sin(2*Math.PI*(layer.vibratoHz||5)*t);
      phase+=2*Math.PI*freq*vibrato/SAMPLE_RATE;
      modPhase+=2*Math.PI*(layer.fm?.frequency??freq*(layer.fm?.ratio??2))/SAMPLE_RATE;
      let value;
      if(layer.type==='noise'){const white=random()*2-1;low+=lo*(white-low);highLow+=hi*(low-highLow);value=(low-highLow)*2.5;}
      else value=oscillator(layer.type||'sine',phase+(layer.fm?.index||0)*Math.sin(modPhase));
      const pulse=layer.pulseHz?(.45+.55*Math.pow(.5+.5*Math.sin(2*Math.PI*layer.pulseHz*t),layer.pulseSharpness??3)):1;
      const drive=layer.distortion||0;if(drive)value=Math.tanh(value*(1+drive))/Math.tanh(1+drive);
      post+=postLo*(value-post);value=post;
      const envelope=layer.continuous?1:adsr(t,length/SAMPLE_RATE,layer.envelope);
      samples[i+start]+=value*envelope*pulse*(layer.gain??.3);
    }
  });
  // Feed-forward taps, circular for loops. Wet signal never changes file length.
  const dry=samples.slice();
  for(const tap of [...(recipe.delay||[]),...(recipe.reverb||[])]){
    const offset=Math.max(1,Math.round(tap.seconds*SAMPLE_RATE));
    for(let i=0;i<n;i++){const at=i-offset;if(at>=0)samples[i]+=dry[at]*tap.gain;else if(recipe.loop)samples[i]+=dry[(at%n+n)%n]*tap.gain;}
  }
  // Remove DC before mastering.
  const mean=samples.reduce((sum,v)=>sum+v,0)/n;for(let i=0;i<n;i++)samples[i]-=mean;
  if(recipe.loop){
    // Render past the loop end, then overlap that natural continuation into
    // the head. The transition back into the unmodified body is smooth.
    for(let j=0;j<overlap;j++){
      const w=.5-.5*Math.cos(Math.PI*j/(overlap-1));
      samples[j]=samples[nominal+j]*(1-w)+samples[j]*w;
    }
    samples=samples.slice(0,nominal);
    const jump=samples[0]-samples[nominal-1];
    for(let j=0;j<32;j++)samples[nominal-32+j]+=jump*(.5-.5*Math.cos(Math.PI*j/31));
  }else{
    const edge=Math.max(1,Math.round(.003*SAMPLE_RATE));
    for(let i=0;i<edge;i++){samples[i]*=i/edge;samples[n-1-i]*=i/edge;}
  }
  let peak=0;for(const value of samples)peak=Math.max(peak,Math.abs(value));
  if(peak<1e-8)throw Error('Silent recipe');
  const gain=Math.pow(10,(recipe.peakDb??-3)/20)/peak;
  return Float32Array.from(samples,value=>value*gain);
}

export function wav(samples){
  const bytes=Buffer.alloc(44+samples.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);
  bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(SAMPLE_RATE,24);
  bytes.writeUInt32LE(SAMPLE_RATE*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);
  samples.forEach((value,i)=>bytes.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(value*32767))),44+i*2));return bytes;
}
export function inspectWav(bytes){
  const n=(bytes.length-44)/2;let peak=0,sum=0,leading=0,last=0,first=0;
  for(let i=0;i<n;i++){const v=bytes.readInt16LE(44+i*2)/32767;if(!i)first=v;last=v;peak=Math.max(peak,Math.abs(v));sum+=v*v;}
  while(leading<n&&Math.abs(bytes.readInt16LE(44+leading*2))<32)leading++;
  return {sampleRate:bytes.readUInt32LE(24),channels:bytes.readUInt16LE(22),bits:bytes.readUInt16LE(34),duration:n/SAMPLE_RATE,
    peakDb:20*Math.log10(peak),rmsDb:20*Math.log10(Math.sqrt(sum/n)),peak,leadingMs:leading/SAMPLE_RATE*1000,boundaryJump:Math.abs(last-first),
    hash:createHash('sha256').update(bytes).digest('hex')};
}
export async function generateAll({write=true}={}){
  const dir='scripts/sfx-recipes',names=(await fs.readdir(dir)).filter(name=>name.endsWith('.json')).sort(),report=[],hashes=new Set(),parameters=new Set();
  for(const name of names){
    const recipe=JSON.parse(await fs.readFile(path.join(dir,name),'utf8')),files=[];
    for(const [kind,sound] of Object.entries(recipe.sounds)){
      const signature=JSON.stringify({...sound,seed:undefined});if(parameters.has(signature))throw Error(`Duplicate sound parameters: ${recipe.id}/${kind}`);parameters.add(signature);
      const bytes=wav(synthesize(sound)),metrics=inspectWav(bytes),folder=recipe.owner==='ui'?'ui':'skills';
      const file=`public/assets/audio/sfx/${folder}/sfx-${recipe.id}${folder==='ui'?'':`-${kind}`}.wav`;
      const min=kind==='loop'?.2:kind==='cast'?.2:recipe.owner==='ui'?sound.duration:.1,max=kind==='loop'?6:kind==='cast'?1:recipe.owner==='ui'?sound.duration:.4;
      if(metrics.duration<min-1/SAMPLE_RATE||metrics.duration>max+1/SAMPLE_RATE||metrics.peak>=1||metrics.leadingMs>20||(kind==='loop'&&metrics.boundaryJump>.002))throw Error(`WAV quality gate: ${file}: ${JSON.stringify(metrics)}`);
      if(hashes.has(metrics.hash))throw Error(`Duplicate WAV: ${file}`);hashes.add(metrics.hash);
      if(write){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);}
      files.push({kind,file,...metrics,layers:sound.layers.length});
    }
    report.push({id:recipe.id,owner:recipe.owner,brief:recipe.brief,silent:!files.length,files});
  }
  if(write){
    await fs.mkdir('docs/skills-redesign/previews/step18',{recursive:true});
    await fs.writeFile('docs/skills-redesign/previews/step18/sfx-report.json',JSON.stringify({generator:'scripts/synth-sfx.mjs',date:'2026-10-03',format:'mono PCM16 44100 Hz',sounds:hashes.size,entries:report},null,2)+'\n');
    await fs.writeFile('docs/skills-redesign/SFX_REPORT.md','# Step 18 — procedural SFX\n\nGenerated offline by `scripts/synth-sfx.mjs` from the per-ID JSON recipes. Mono PCM16, 44.1 kHz. Cast/impact peaks −3 dBFS; loops −12 dBFS and passive cues −15 dBFS (quieter mixes are noted in the JSON). RMS is not LUFS. No music or voice files were changed.\n\n'+
      `${report.filter(r=>r.owner!=='ui').length} skills; ${report.filter(r=>r.owner==='ui').length} UI cues; ${hashes.size} unique WAVs. All have ≥2 layers, unique parameter sets, no clipping, ≤20 ms leading silence and valid durations. Loops have ≤0.002 endpoint jump. Full measurements: [sfx-report.json](previews/step18/sfx-report.json).\n\n| Skill | Files (seconds; peak dBFS) |\n|---|---|\n`+
      report.map(r=>`| ${r.id} | ${r.files.map(f=>`[${path.basename(f.file)}](../../${f.file}) (${f.duration.toFixed(3)}s; ${f.peakDb.toFixed(1)})`).join('<br>')||'Intentionally silent — None (passive).'} |`).join('\n')+'\n');
  }
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await generateAll();console.log(`Synthesized ${report.reduce((n,r)=>n+r.files.length,0)} verified WAVs for ${report.length} entries, offline.`);
}
