// Stable 32-bit seeds and independent feature streams. No clock or global RNG
// enters generation; integer lattice samples keep noise portable across engines.
export function hashSeed(value, stream='') {
  let h=2166136261;
  for(const c of `${String(value)}${stream?'|'+stream:''}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return (h^h>>>16)>>>0;
}
export function randomStream(seed,name=''){
  let state=hashSeed(seed,name);
  return ()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
export function valueNoise(seed,x,y,period=8){
  const ix=Math.floor(x/period),iy=Math.floor(y/period),fx=(x/period-ix),fy=(y/period-iy);
  const sample=(a,b)=>{let h=seed^Math.imul(a,0x1f123bb5)^Math.imul(b,0x5f356495);h=Math.imul(h^h>>>16,0x7feb352d);return (h^h>>>15)&65535;};
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  return Math.round((sample(ix,iy)*(1-sx)+sample(ix+1,iy)*sx)*(1-sy)+(sample(ix,iy+1)*(1-sx)+sample(ix+1,iy+1)*sx)*sy);
}
export const validSeed=value=>typeof value==='string'&&/^[\p{L}\p{N} _.-]{1,64}$/u.test(value)&&value.trim().length>0;
export function normalizeSeed(value){const s=String(value).trim();if(!validSeed(s))throw Error('Invalid world seed');return s;}
