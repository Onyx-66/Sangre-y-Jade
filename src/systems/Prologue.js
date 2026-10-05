import { t, translateDOM } from '../i18n/index.js';
const beats = [
  ['THE MAYA LOWLANDS · CLASSIC PERIOD','Maya cities rose above the jungle, their temples reaching toward the sun.'],
  ['A WORLD OF KNOWLEDGE','Astronomers charted the heavens. Cacao and woven cloth crossed bustling markets.'],
  ['BENEATH THE ROOTS','In our legend, a sacred cenote concealed a road to Xibalba.'],
  ['THE BLOOD MOON','When the seal shattered, the underworld poured into the sleeping city.'],
  ['THREE HEROES','Balam. Ixchel. Kukul. Three heroes answered the call.'],
  ['YOUR BATTLE BEGINS','Hold the temple. Gather the jade. Face the lords below—and bring back the dawn.'],
];
export async function runPrologue(app,onDone) {
  app.cancelPrologue?.();
  const screen=app.setScreen('<div class="cinema-loading">Loading intro…</div>','cutscene pixel-cinema');
  let canceled=false,raf=0,elapsed=0,last=performance.now(),current=-1;
  const visibility=()=>{if(app.audio.v2){if(document.hidden)app.audio.stopNarration();else if(current>=0)app.audio.narrate(current,(elapsed-current*4500)/1000);}else if(document.hidden)app.audio.narration?.pause();else if(app.audio.unlocked)app.audio.narration?.play().catch(()=>{});};
  document.addEventListener('visibilitychange',visibility);
  app.cancelPrologue=()=>{canceled=true;cancelAnimationFrame(raf);app.audio.stopNarration();document.removeEventListener('visibilitychange',visibility);};
  const images=await Promise.all(beats.map((_,i)=>new Promise(resolve=>{
    const img=new Image(); img.onload=()=>resolve(img);img.onerror=()=>resolve(img);img.src=app.asset(`assets/pixel/story-${i}.webp`);
  })));
  if(canceled)return;
  screen.innerHTML=`<div class="cinema-stage"></div><div class="cinema-caption"><div class="era"></div><p class="subtitle" aria-live="off"></p></div><div class="cutscene-controls"><button class="btn ghost small" data-sound>Enable sound</button><button class="btn ghost small" data-skip>Skip Intro</button></div><div class="cinema-chapters">${beats.map((_,i)=>`<span data-chapter="${i}"></span>`).join('')}</div>`;
  const stage=screen.querySelector('.cinema-stage'),subtitle=screen.querySelector('.subtitle'),era=screen.querySelector('.era');
  translateDOM(screen);app.addLanguageSelector(screen);
  const note=document.createElement('span');note.className='narration-note';note.textContent=t('Localized narration; English fallback when unavailable.');screen.append(note);
  images.forEach((img,i)=>{img.className='cinema-image';img.alt=beats[i][0];stage.append(img);});
  const finish=()=>{
    if(canceled)return;app.cancelPrologue();app.save.data.prologueRevision=2;app.save.markIntroSeen();onDone();
  };
  screen.querySelector('[data-skip]').onclick=finish;
  screen.querySelector('[data-sound]').onclick=(event)=>{app.audio.unlock();app.audio.music('prologue');elapsed=0;current=-1;last=performance.now();event.currentTarget.textContent=t('Sound enabled');};
  app.audio.music('prologue');
  const tick=now=>{
    if(canceled)return;
    // rAF's timestamp can precede performance.now() on the first callback.
    if(!document.hidden)elapsed+=Math.max(0,Math.min(now-last,100));last=now;
    if(elapsed>=27000)return finish();
    const index=Math.min(5,Math.floor(elapsed/4500)),within=elapsed-index*4500;
    if(index!==current){
      current=index;images.forEach((img,i)=>img.classList.toggle('active',i===index));
      app.audio.narrate(index,within/1000);
      era.textContent=t(beats[index][0]);
      screen.querySelectorAll('[data-chapter]').forEach((node,i)=>node.classList.toggle('active',i<=index));
    }
    const text=t(beats[index][1]),count=Math.min(text.length,Math.floor(within/29));
    subtitle.textContent=text.slice(0,count)+(count<text.length?'▌':'');
    raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
}
