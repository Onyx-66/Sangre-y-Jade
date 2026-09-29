import { readFileSync, writeFileSync } from 'node:fs';
const SR=44100,T=Math.PI*2;
let seed=721113;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
const hz=n=>440*2**((n-69)/12);
function mix(out,at,dur,fn,gain=1){const offset=Math.floor(at*SR);for(let i=0;i<dur*SR&&i+offset<out.length;i++)out[i+offset]+=fn(i/SR,i/(dur*SR))*gain;}
function tone(out,at,dur,f,g=.2){mix(out,at,dur,(t,p)=>Math.sin(T*f*t)*(1-Math.exp(-t*180))*Math.exp(-p*4)*Math.min(1,(1-p)*15),g);}
function foley(out,at,dur,low,gain,decay=10){let lp=0;mix(out,at,dur,(t)=>{lp+=low*(noise()-lp);return lp*Math.exp(-t*decay);},gain);}
function sweep(out,at,dur,start,end,gain){let phase=0;mix(out,at,dur,(t,p)=>{phase+=T*(start*(end/start)**p)/SR;return Math.sin(phase)*Math.sin(Math.PI*p)**.5;},gain);}
function wav(name,mono,wet=.12){
  const bytes=Buffer.alloc(44+mono.length*4);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVE',8);bytes.write('fmt ',12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(2,22);bytes.writeUInt32LE(SR,24);bytes.writeUInt32LE(SR*4,28);bytes.writeUInt16LE(4,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(mono.length*4,40);
  let peak=0;for(const s of mono)peak=Math.max(peak,Math.abs(s));const gain=.78/Math.max(1,peak);
  for(let i=0;i<mono.length;i++){const t=i/SR,edge=Math.min(1,i/120,(mono.length-1-i)/180);for(let c=0;c<2;c++){const delay=Math.floor((c?.079:.061)*SR);const echo=(mono[i-delay]||0)*wet+(mono[i-delay*3]||0)*wet*.5;const s=Math.tanh((mono[i]+echo)*gain)*edge;bytes.writeInt16LE(Math.round(s*32760),44+i*4+c*2);}}
  writeFileSync(`public/assets/audio/${name}.wav`,bytes);
}
const fx=(name,dur,paint,wet=.12)=>{seed=name.length*7159;const a=new Float32Array(Math.ceil(SR*dur));paint(a);wav(`sfx-${name}`,a,wet);};
fx('slash',.5,a=>{foley(a,0,.26,.18,1.6,14);sweep(a,.01,.22,850,120,.2);for(let i=0;i<4;i++)tone(a,.05+i*.026,.16,1800+i*610,.045);});
fx('spell',.8,a=>{foley(a,0,.5,.035,.8,4);sweep(a,0,.36,170,920,.15);[64,71,76,83].forEach((n,i)=>tone(a,.035*i,.52,hz(n),.1));},.3);
fx('dart',.3,a=>{foley(a,0,.15,.6,.55,28);sweep(a,0,.1,1250,400,.08);tone(a,.025,.18,195,.2);});
fx('hit',.38,a=>{sweep(a,0,.07,160,43,.8);foley(a,0,.2,.23,1.3,31);tone(a,.025,.3,440,.12);});
fx('hurt',.55,a=>{sweep(a,0,.19,290,63,.3);foley(a,0,.24,.12,1.7,20);tone(a,.07,.4,83,.18);});
fx('dash',.6,a=>{foley(a,0,.4,.08,1.1,6);sweep(a,.04,.2,90,580,.14);foley(a,.17,.25,.7,.16,18);},.2);
fx('click',.18,a=>{tone(a,0,.09,740,.26);tone(a,.012,.14,1220,.09);foley(a,0,.06,.6,.28,70);});
fx('pickup',.36,a=>{tone(a,0,.24,hz(83),.13);tone(a,.055,.27,hz(90),.09);},.18);
fx('cacao',.35,a=>{[720,1100,1600].forEach((f,i)=>tone(a,i*.023,.23,f,.08));foley(a,0,.15,.3,.24,22);});
fx('level',1.2,a=>{[60,64,67,72,79].forEach((n,i)=>tone(a,i*.1,.7,hz(n),.17));foley(a,0,.8,.015,.7,3);},.32);
fx('boss',1.7,a=>{sweep(a,0,1.3,51,37,.4);[56,57,63].forEach((n,i)=>tone(a,i*.13,1.35,hz(n),.17));foley(a,0,1.5,.025,1.3,2);},.35);
fx('victory',2.8,a=>{[57,60,64,69,72,76].forEach((n,i)=>{tone(a,i*.2,1.55,hz(n),.18);tone(a,i*.2,1.6,hz(n-12),.09);});},.3);
fx('defeat',2.4,a=>{[57,53,50,45].forEach((n,i)=>{tone(a,i*.26,1.3,hz(n),.17);tone(a,i*.26,1.3,hz(n-12),.08);});},.28);
// Re-orchestrate the reproducible themes with air, resonant wood, bass drums,
// and stereo reflections. Original scores are regenerated before this pass.
for(const name of ['menu','day','night','cenote','boss']){
  const raw=readFileSync(`public/assets/audio/music-${name}.wav`),rate=raw.readUInt32LE(24),count=(raw.length-44)/2;
  const a=new Float32Array(Math.ceil(count/rate*SR));
  for(let i=0;i<a.length;i++)a[i]=raw.readInt16LE(44+Math.min(count-1,Math.floor(i*rate/SR))*2)/32768*.7;
  const bpm={menu:72,day:96,night:90,cenote:82,boss:124}[name],beat=60/bpm;
  for(let b=0;b*beat<a.length/SR;b++){
    if(b%4===0){sweep(a,b*beat,.28,90,38,.24);foley(a,b*beat,.14,.08,.36,19);}
    if(b%8===4){const n=[57,60,62,64,67][Math.floor(b/8)%5];mix(a,b*beat,beat*3,(t,p)=>(Math.sin(T*hz(n)*t+Math.sin(T*4.8*t)*.09)+.2*Math.sin(T*hz(n)*2*t))*Math.sin(Math.PI*p)*.1);}
  }
  wav(`music-${name}`,a,.22);
}
const a=new Float32Array(SR*27);
for(let i=0;i<18;i++){const t=i*1.5;[45,52,57].forEach((n,j)=>tone(a,t,2.2,hz(n),.06));tone(a,t+.3,1.7,hz([69,72,76,74,71,67][i%6]),.09);if(i>=8){sweep(a,t,.35,95,39,.23);foley(a,t,.2,.1,.3,19);}}
mix(a,0,27,(t,p)=>Math.sin(T*55*t)*Math.min(1,t/4)*Math.min(1,(27-t)/3)*.05);
wav('music-prologue',a,.3);
console.log('Mastered 13 layered stereo effects, five re-orchestrated loops, and a 27-second prologue score.');
