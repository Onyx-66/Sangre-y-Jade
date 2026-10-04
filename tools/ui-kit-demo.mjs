// Dev-only HTML entry, deliberately not imported by src/main.js or Vite's build.
if (!import.meta.env.DEV) throw new Error('UI kit laboratory is development-only.');
const kit = await fetch('/src/data/uiKit.json').then(response => {
  if (!response.ok) throw new Error(`Kit manifest: ${response.status}`);
  return response.json();
});
const items = new Map(kit.items.map(item => [item.id,item]));
const assetUrl = item => `/${item.path}`;
export function applyNineSlice(element,item) {
  const {top,right,bottom,left} = item.sliceInsets;
  element.style.borderImageSource = `url("${assetUrl(item)}")`;
  element.style.borderImageSlice = `${top} ${right} ${bottom} ${left} fill`;
  element.style.borderWidth = `${top}px ${right}px ${bottom}px ${left}px`;
  element.style.borderImageWidth = '1';
  element.style.borderImageOutset = '0';
  element.style.borderImageRepeat = 'stretch';
}
function previewSizes(item) {
  const {width,height} = item.size;
  if (item.type === 'background') return [240,480,720].map(w=>({width:w,height:w*9/16}));
  if (height>width) return [.75,1,1.5].map(scale=>({width:Math.round(width*scale),height:Math.round(height*scale)}));
  if (item.type === 'sprite') return [.75,1,1.5].map(scale=>({width:Math.round(width*scale),height:Math.round(height*scale)}));
  const min = item.sliceInsets.left+item.sliceInsets.right+24;
  return [Math.max(min,Math.round(width*.75)),width,Math.round(width*1.5)].map(w=>({width:w,height:width===height?Math.round(w*.85):height}));
}
for (const item of kit.items) {
  const section = document.createElement('section');
  section.className = 'asset'; section.id = item.id; section.dataset.asset = item.id;
  const heading = document.createElement('h2'); heading.textContent = item.id; section.append(heading);
  const detail = document.createElement('p'); detail.className = 'asset-details';
  detail.textContent = `${item.size.width} × ${item.size.height} · ${item.type}` + (item.sliceInsets ? ` · insets T/R/B/L ${Object.values(item.sliceInsets).join('/')}` : ' · aspect-preserving sprite');
  section.append(detail);
  const previews = document.createElement('div'); previews.className = 'previews'; section.append(previews);
  for (const [index,size] of previewSizes(item).entries()) {
    const sample = document.createElement('figure'); sample.className = 'sample'; sample.dataset.size = index;
    // Integer-sized cells keep tiny scrollbar previews on the pixel grid;
    // otherwise intrinsic caption widths position later cells at fractions.
    sample.style.width = `${Math.max(144,size.width+16)}px`;
    const caption = document.createElement('figcaption'); caption.textContent = `${size.width} × ${size.height} CSS px`; sample.append(caption);
    const mat = document.createElement('div'); mat.className = 'mat'; sample.append(mat);
    let component;
    if (item.type === 'nine-slice') {
      component = document.createElement('div'); component.className = 'nine-slice'; applyNineSlice(component,item);
    } else {
      component = document.createElement('img'); component.className = item.type === 'background' ? 'background-preview' : 'sprite-preview';
      component.src = assetUrl(item); component.alt = item.id;
    }
    component.dataset.preview = item.id; component.dataset.expectedWidth = size.width;
    component.style.width = `${size.width}px`; component.style.height = `${size.height}px`;
    mat.append(component); previews.append(sample);
  }
  document.querySelector('#components').append(section);
}
// Preload the border-image textures as well as <img>s, so QA waits on real files.
await Promise.all(kit.items.map(item=>new Promise((resolve,reject)=>{
  const img = new Image(); img.onload = resolve; img.onerror = ()=>reject(new Error(`Failed to load ${item.path}`)); img.src = assetUrl(item);
})));
applyNineSlice(document.querySelector('.assembly-panel'),items.get('panel-large'));
const title = document.querySelector('.assembly-title');
title.style.borderImageSource = `url("${assetUrl(items.get('banner-title'))}")`;
title.style.borderImageSlice = `${Object.values(items.get('banner-title').sliceInsets).join(' ')} fill`;
const primary = document.querySelector('#primary-preview'),secondary = document.querySelector('#secondary-preview');
primary.style.borderImageSource = `url("${assetUrl(items.get('button-primary'))}")`;
primary.style.borderImageSlice = `${Object.values(items.get('button-primary').sliceInsets).join(' ')} fill`;
secondary.style.borderImageSource = `url("${assetUrl(items.get('button-secondary-disabled'))}")`;
secondary.style.borderImageSlice = `${Object.values(items.get('button-secondary').sliceInsets).join(' ')} fill`;
const primaryState = pressed => primary.style.borderImageSource = `url("${assetUrl(items.get(pressed?'button-primary-pressed':'button-primary'))}")`;
primary.addEventListener('pointerdown',()=>primaryState(true));
window.addEventListener('pointerup',()=>primaryState(false));
primary.addEventListener('pointercancel',()=>primaryState(false));
primary.addEventListener('keydown',event=>{if ([' ','Enter'].includes(event.key)) primaryState(true);});
primary.addEventListener('keyup',()=>primaryState(false));
primary.addEventListener('blur',()=>primaryState(false));
const toggle = document.querySelector('#toggle-preview');
const updateToggle = ()=>{
  document.querySelector('#toggle-track').src = assetUrl(items.get(toggle.checked?'toggle-track-on':'toggle-track-off'));
  document.querySelector('#toggle-label').textContent = toggle.checked?'On':'Off';
};
toggle.addEventListener('change',updateToggle); updateToggle();
const backdrop = document.querySelector('#backdrop');
backdrop.addEventListener('change',()=>document.querySelector('#assembly').style.backgroundImage=`url("${assetUrl(items.get(backdrop.value))}")`);
backdrop.dispatchEvent(new Event('change'));
const torch = document.querySelector('#torch-preview');
const timer = setInterval(()=>{
  if (document.querySelector('#animate-torch').checked && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const frame = (Number(torch.dataset.frame||0)+1)%4; torch.dataset.frame = frame;
    torch.src = assetUrl(items.get(`torch-${frame}`));
  }
},180);
addEventListener('pagehide',()=>clearInterval(timer),{once:true});
await document.fonts.ready;
document.querySelector('#status').textContent = `${kit.items.length} assets loaded · ${kit.items.filter(item=>item.sliceInsets).length} nine-slice sources · no game changes`;
window.__UI_KIT_DEMO__ = {kit,ready:true,previewSizes};
