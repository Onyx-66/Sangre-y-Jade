// Validated safe-area layouts; mandatory health, pause, joystick and breath are
// never hidden. Breath and boss bars allow position and scale only.
export const HUD_LAYOUT_VERSION = 1;
export const HUD_ELEMENTS = [
  ['vitals','Health, stamina and mana bars','top-left',true,false],
  ['xp-dock','Level and XP bar','bottom-center',false,false],
  ['clock','Timer','top-center',false,false],
  ['counters','Cacao and kills counters','top-right',false,false],
  ['pause','Pause button','top-right',true,true],
  ['ally-panel','Ally portrait and 3 ally skills','top-left',false,true],
  ['passive-slots','Passive skill slots','bottom-right',false,true],
  ['innate-traits','Basic traits (2 small rings)','bottom-right',false,true],
  ...['q','e','r','t'].map(key=>[`skill-${key}`,`Active skill slot ${key.toUpperCase()}`,'bottom-right',false,true]),
  ['dash','Dash button','bottom-right',false,true],
  ['attack','Manual attack button','bottom-right',false,true],
  ['joystick','Movement joystick','bottom-left',true,true],
  ['boss-bar','Boss health bar','top-center',false,false],
  ['breath','Breath','top-center',true,false],
  ['auto-indicator','Auto-attack indicator','bottom-center',false,true],
].map(([id,name,anchor,required,interactive])=>({id,name,anchor,required,interactive}));
export const HUD_IDS = HUD_ELEMENTS.map(el=>el.id);
export const ANCHORS = {
  'top-left':[0,0], 'top-center':[.5,0], 'top-right':[1,0],
  'center-left':[0,.5], center:[.5,.5], 'center-right':[1,.5],
  'bottom-left':[0,1], 'bottom-center':[.5,1], 'bottom-right':[1,1],
};
export const cloneLayout = value => JSON.parse(JSON.stringify(value));
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const finite = value => typeof value==='number' && Number.isFinite(value);
export const orientationFor = (width,height) => width>=height?'landscape':'portrait';
export const emptyHudLayouts = () => ({schemaVersion:HUD_LAYOUT_VERSION,landscape:null,portrait:null});

export function sanitizeLayout(layout) {
  // Version-one layouts predate breath; extend without discarding saved slots.
  if(layout?.elements&&!layout.elements.breath)layout={...layout,elements:{...layout.elements,breath:{anchor:'top-center',x:50,y:35,scale:1,opacity:1,visible:true,locked:false}}};
  if(!layout || !layout.elements || !layout.joystick || !HUD_IDS.every(id=>{
    const el=layout.elements[id];return el && Object.hasOwn(ANCHORS,el.anchor) && ['x','y','scale','opacity'].every(key=>finite(el[key])) && typeof el.visible==='boolean' && typeof el.locked==='boolean';
  }))return null;
  if(!['fixed','floating'].includes(layout.joystick.mode)||!finite(layout.joystick.deadZone))return null;
  const elements={};
  for(const spec of HUD_ELEMENTS){
    const el=layout.elements[spec.id];
    elements[spec.id]={anchor:el.anchor,x:clamp(el.x,0,100),y:clamp(el.y,0,100),scale:clamp(el.scale,.5,2),
      opacity:clamp(el.opacity,spec.id==='joystick'?.1:.2,1),visible:spec.required?true:el.visible,locked:el.locked};
    if(['boss-bar','breath'].includes(spec.id))Object.assign(elements[spec.id],{opacity:1,visible:true,locked:false});
  }
  return {elements,joystick:{mode:layout.joystick.mode,deadZone:clamp(layout.joystick.deadZone,0,.5)}};
}
export function migrateHudLayouts(stored) {
  const result=emptyHudLayouts();
  if(!stored || stored.schemaVersion!==HUD_LAYOUT_VERSION)return result;
  for(const direction of ['landscape','portrait'])result[direction]=sanitizeLayout(stored[direction]);
  return result;
}
export function boxFor(entry,metric,safe) {
  const [ax,ay]=ANCHORS[entry.anchor]||[0,0],width=metric.width*entry.scale,height=metric.height*entry.scale;
  const x=safe.x+safe.width*entry.x/100-width*ax,y=safe.y+safe.height*entry.y/100-height*ay;
  return {x,y,width,height,right:x+width,bottom:y+height};
}
export function atBox(entry,box,safe) {
  const [ax,ay]=ANCHORS[entry.anchor];
  return {...entry,x:(box.x+box.width*ax-safe.x)/safe.width*100,y:(box.y+box.height*ay-safe.y)/safe.height*100};
}
export function constrainLayout(layout,metrics,safe) {
  const next=cloneLayout(layout);
  for(const spec of HUD_ELEMENTS) {
    const entry=next.elements[spec.id],metric=metrics[spec.id];
    if(!entry||!metric)continue;
    const min=spec.interactive?Math.max(.5,44/(metric.touchWidth||metric.width),44/(metric.touchHeight||metric.height)):.5;
    const max=Math.min(2,safe.width/metric.width,safe.height/metric.height);
    entry.scale=clamp(entry.scale,Math.min(min,max),max);
    entry.opacity=clamp(entry.opacity,spec.id==='joystick'?.1:.2,1);
    if(spec.required)entry.visible=true;
    if(['boss-bar','breath'].includes(spec.id))Object.assign(entry,{opacity:1,visible:true,locked:false});
    const box=boxFor(entry,metric,safe);
    box.x=clamp(box.x,safe.x,safe.x+safe.width-box.width);box.y=clamp(box.y,safe.y,safe.y+safe.height-box.height);
    next.elements[spec.id]=atBox(entry,box,safe);
  }
  return next;
}
export function layoutFromBoxes(metrics,safe,settings={}) {
  const elements={};
  for(const spec of HUD_ELEMENTS){const metric=metrics[spec.id];elements[spec.id]=atBox({anchor:spec.anchor,x:0,y:0,scale:1,opacity:metric.opacity??1,visible:true,locked:false},metric,safe);}
  return {elements,joystick:{mode:settings.joystick==='floating'?'floating':'fixed',deadZone:.12}};
}
export function validateLayout(layout,metrics,safe,{shown=()=>true}={}) {
  const issues=[],overlaps=[];
  if(!sanitizeLayout(layout))return {issues:['Invalid HUD layout'],overlaps};
  for(const spec of HUD_ELEMENTS) {
    const entry=layout.elements[spec.id],metric=metrics[spec.id],box=boxFor(entry,metric,safe);
    if(spec.required && (!entry.visible || box.x<safe.x-.5 || box.y<safe.y-.5 || box.right>safe.x+safe.width+.5 || box.bottom>safe.y+safe.height+.5))issues.push(`Required element outside safe area: ${spec.id}`);
    if(entry.visible&&spec.interactive&&(metric.touchWidth||metric.width)*entry.scale<43.99)issues.push(`Touch target too small: ${spec.id}`);
    if(entry.visible&&spec.interactive&&(metric.touchHeight||metric.height)*entry.scale<43.99)issues.push(`Touch target too small: ${spec.id}`);
  }
  const interactive=HUD_ELEMENTS.filter(spec=>spec.interactive&&layout.elements[spec.id].visible&&shown(spec.id));
  for(let i=0;i<interactive.length;i++)for(let j=i+1;j<interactive.length;j++){
    const a=interactive[i].id,b=interactive[j].id,one=boxFor(layout.elements[a],metrics[a],safe),two=boxFor(layout.elements[b],metrics[b],safe);
    if(Math.min(one.right,two.right)-Math.max(one.x,two.x)>1&&Math.min(one.bottom,two.bottom)-Math.max(one.y,two.y)>1)overlaps.push([a,b]);
  }
  return {issues,overlaps};
}
export function moveElement(layout,id,dx,dy,metrics,safe,{snap=false,group=false}={}) {
  const next=cloneLayout(layout),ids=group&&id.startsWith('skill-')?['skill-q','skill-e','skill-r','skill-t']:[id];
  if(next.elements[id].locked)return next;
  const movable=ids.filter(key=>!next.elements[key].locked);
  if(!movable.length)return next;
  if(snap){const origin=boxFor(next.elements[id],metrics[id],safe);dx=Math.round((origin.x+dx-safe.x)/8)*8+safe.x-origin.x;dy=Math.round((origin.y+dy-safe.y)/8)*8+safe.y-origin.y;}
  // Clamp the shared delta, not each slot separately, so a group keeps its gaps.
  for(const key of movable){const box=boxFor(next.elements[key],metrics[key],safe);dx=clamp(dx,safe.x-box.x,safe.x+safe.width-box.right);dy=clamp(dy,safe.y-box.y,safe.y+safe.height-box.bottom);}
  for(const key of movable){const entry=next.elements[key],box=boxFor(entry,metrics[key],safe);box.x+=dx;box.y+=dy;next.elements[key]=atBox(entry,box,safe);}
  return next;
}
export const PRESETS=['Default','Left-handed','Minimal','Large','Compact'];
export function presetLayout(name,defaults,metrics,safe) {
  let next=cloneLayout(defaults);
  if(!PRESETS.includes(name))throw new Error('Unknown HUD preset');
  if(name==='Left-handed')for(const id of ['joystick','xp-dock','auto-indicator','passive-slots','innate-traits','skill-q','skill-e','skill-r','skill-t','dash','attack']){
    const entry=next.elements[id],box=boxFor(entry,metrics[id],safe);box.x=safe.x+safe.width-(box.right-safe.x);next.elements[id]=atBox(entry,box,safe);
  }
  if(name==='Minimal')for(const id of ['clock','counters','auto-indicator','innate-traits'])next.elements[id].visible=false;
  if(['Minimal','Compact','Large'].includes(name)){
    for(const spec of HUD_ELEMENTS)next.elements[spec.id].scale=name==='Large'?1.25:.85;
    next=constrainLayout(next,metrics,safe);
    // Reserve all six action buttons, including manual Attack and locked T.
    let right=safe.x+safe.width-4,bottom=safe.y+safe.height-4;
    for(const id of ['dash','skill-t','skill-r','skill-e','skill-q','attack']){
      const entry=next.elements[id],box=boxFor(entry,metrics[id],safe);box.x=right-box.width;box.y=bottom-box.height;right=box.x-4;next.elements[id]=atBox(entry,box,safe);
    }
    const actionTop=Math.min(...['dash','skill-q','attack'].map(id=>boxFor(next.elements[id],metrics[id],safe).y));
    let rowRight=safe.x+safe.width-4;
    for(const id of ['passive-slots','innate-traits']){const entry=next.elements[id],box=boxFor(entry,metrics[id],safe);box.x=rowRight-box.width;box.y=actionTop-box.height-12;rowRight=box.x-10;next.elements[id]=atBox(entry,box,safe);}
    const joy=boxFor(next.elements.joystick,metrics.joystick,safe);joy.x=safe.x+4;joy.y=bottom-joy.height;next.elements.joystick=atBox(next.elements.joystick,joy,safe);
    for(const id of ['xp-dock','auto-indicator']){const entry=next.elements[id],box=boxFor(entry,metrics[id],safe);box.x=safe.x+safe.width*.38-box.width/2;box.y=actionTop-box.height-(id==='xp-dock'?66:12);next.elements[id]=atBox(entry,box,safe);}
  }
  return constrainLayout(next,metrics,safe);
}
export function checksum(text) {
  let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16).padStart(8,'0');
}
export function exportLayout(layout,orientation) {
  const payload=JSON.stringify({schemaVersion:HUD_LAYOUT_VERSION,orientation,layout});
  return `SYJHUD:${checksum(payload)}:${payload}`;
}
export function importLayout(code,metrics,safe,orientation) {
  if(typeof code!=='string'||code.length>20000)throw new Error('Invalid layout code');
  const match=code.trim().match(/^SYJHUD:([0-9a-f]{8}):(.+)$/s);
  if(!match||checksum(match[2])!==match[1])throw new Error('Layout checksum mismatch');
  let parsed;try{parsed=JSON.parse(match[2]);}catch{throw new Error('Invalid layout code');}
  if(!parsed||typeof parsed!=='object')throw new Error('Invalid layout code');
  if(parsed.schemaVersion!==HUD_LAYOUT_VERSION)throw new Error('Unsupported layout version');
  if(parsed.orientation!==orientation)throw new Error('Layout orientation does not match');
  const clean=sanitizeLayout(parsed.layout);if(!clean)throw new Error('Invalid layout code');
  return constrainLayout(clean,metrics,safe);
}
export class LayoutHistory {
  constructor(initial){this.entries=[cloneLayout(initial)];this.index=0;}
  push(value){if(JSON.stringify(this.entries[this.index])===JSON.stringify(value))return;this.entries.splice(this.index+1);this.entries.push(cloneLayout(value));if(this.entries.length>80)this.entries.shift();this.index=this.entries.length-1;}
  undo(){if(this.index>0)this.index--;return cloneLayout(this.entries[this.index]);}
  redo(){if(this.index<this.entries.length-1)this.index++;return cloneLayout(this.entries[this.index]);}
}
