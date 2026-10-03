import fs from 'node:fs/promises';
import { hash } from './synth-sfx.mjs';

const source=JSON.parse(await fs.readFile('docs/skills-redesign/skills_redesign.json','utf8'));
const skills=[...Object.values(source.heroes).flat(),...source.shared,...Object.values(source.allies).flat()];
const tone=(frequency,gain=.3,extra={})=>({type:'sine',frequency,gain,...extra});
const noise=(lowpass=2500,highpass=100,gain=.2,extra={})=>({type:'noise',gain,filter:{lowpass,highpass},...extra});
const env=(attack=.003,decay=.08,sustain=.15,release=.1)=>({attack,decay,sustain,release});

// Small, composable physical metaphors. Every final JSON expands these into
// concrete layers, envelopes and taps, so artists can tune it without this file.
function material(name,duration,continuous=false){
  const base={duration,continuous,envelope:env()},n=(lo,hi,g=.2,e={})=>({...base,...noise(lo,hi,g,e)}),
    t=(hz,g=.3,e={})=>({...base,...tone(hz,g,e)});
  const timbres={
    growl:()=>[t(85,.4,{type:'saw',endFrequency:48,distortion:2,fm:{ratio:3,index:1.7},filter:{postLowpass:700},pulseHz:23}),n(850,80,.32,{pulseHz:27})],
    shout:()=>[t(130,.33,{type:'triangle',endFrequency:75,fm:{frequency:310,index:1.6},distortion:1.5,filter:{postLowpass:1900}}),n(1500,180,.3,{pulseHz:34})],
    boom:()=>[t(115,.65,{endFrequency:42,envelope:env(.001,.14,.04,.18)}),n(720,35,.26)],
    stone:()=>[n(1900,140,.4,{distortion:1.6,pulseHz:39}),t(195,.24,{endFrequency:91,fm:{ratio:2.79,index:2}})],
    wood:()=>[t(255,.4,{type:'triangle',endFrequency:160,fm:{ratio:1.71,index:.8}}),n(2800,350,.18)],
    glass:()=>[t(1550,.3,{fm:{ratio:2.76,index:1.2},envelope:env(.001,.06,.08,.16)}),t(2760,.14,{fm:{ratio:1.43,index:.45}})],
    chime:()=>[t(880,.35,{fm:{ratio:2.01,index:.45},envelope:env(.002,.12,.08,.16)}),t(1765,.12)],
    jade:()=>[t(630,.34,{fm:{ratio:2.37,index:.7},envelope:env(.003,.13,.12,.2)}),t(1190,.14,{vibrato:.002})],
    metal:()=>[t(1470,.27,{fm:{ratio:1.41,index:2.2}}),t(2240,.17,{type:'triangle',filter:{postLowpass:4100}})],
    wind:()=>[n(2200,350,.28,{pulseHz:6}),n(900,40,.21,{pulseHz:11})],
    whisper:()=>[n(3300,650,.19,{pulseHz:17}),t(460,.12,{endFrequency:260,vibrato:.012})],
    whistle:()=>[t(1150,.24,{endFrequency:2200,vibrato:.008,envelope:env(.012,.08,.25,.06)}),n(5200,1800,.1)],
    thwip:()=>[n(4500,1100,.32),t(1100,.16,{endFrequency:180,envelope:env(.001,.03,.04,.04)})],
    flutter:()=>[n(2200,340,.28,{pulseHz:28,pulseSharpness:6}),t(290,.11,{type:'triangle',pulseHz:28})],
    hum:()=>[t(180,.25,{vibrato:.008}),t(270,.13,{type:'triangle',filter:{postLowpass:1000},vibrato:.003})],
    choir:()=>[t(392,.2,{type:'triangle',fm:{ratio:3,index:.3},vibrato:.005,envelope:env(.055,.12,.65,.2)}),t(587.3,.16,{vibrato:.004,envelope:env(.04,.1,.65,.25)})],
    purr:()=>[t(77,.24,{pulseHz:26,distortion:.8}),n(600,60,.16,{pulseHz:26})],
    bite:()=>[n(1300,240,.35,{distortion:.6}),t(270,.3,{endFrequency:70,fm:{ratio:1.2,index:1.1}})],
    crackle:()=>[n(6900,2100,.2,{pulseHz:91,pulseSharpness:12}),n(3200,500,.17,{pulseHz:61,pulseSharpness:9})],
    hiss:()=>[n(6200,1700,.22),n(2600,500,.17,{pulseHz:8})],
    water:()=>[t(950,.25,{endFrequency:330,fm:{ratio:1.6,index:1.3}}),n(1700,250,.15,{pulseHz:14})],
    rain:()=>[n(6000,1200,.18,{pulseHz:37,pulseSharpness:8}),n(1500,90,.22)],
    flute:()=>[t(660,.26,{vibrato:.006,envelope:env(.045,.1,.6,.18)}),n(3000,1700,.07)],
    chirp:()=>[t(1500,.25,{endFrequency:2900,vibrato:.018,vibratoHz:30,pulseHz:12}),n(3500,1500,.08)],
    buzz:()=>[t(215,.17,{type:'saw',fm:{ratio:2,index:.3},filter:{postLowpass:1800}}),n(1200,200,.1,{pulseHz:80})],
    harp:()=>[t(523.25,.32,{type:'triangle',envelope:env(.001,.12,.03,.14)}),t(1046.5,.12,{fm:{ratio:2,index:.18}})],
    pop:()=>[t(450,.35,{endFrequency:130,envelope:env(.001,.025,.03,.035)}),n(1500,200,.16)],
    gong:()=>[t(320,.26,{fm:{ratio:1.414,index:1.4},envelope:env(.002,.14,.08,.2)}),t(687,.19,{fm:{ratio:2.76,index:.6}})],
    scrape:()=>[n(5500,1600,.28,{pulseHz:55,pulseSharpness:3}),n(1100,110,.12)],
    horn:()=>[t(294,.28,{type:'saw',filter:{postLowpass:1550},vibrato:.004,envelope:env(.025,.08,.5,.18)}),t(440,.16,{type:'triangle'})],
    rustle:()=>[n(4300,900,.25,{pulseHz:33,pulseSharpness:5}),n(900,120,.14,{pulseHz:19})],
    heartbeat:()=>[t(65,.48,{pulseHz:2,pulseSharpness:9}),t(108,.18,{pulseHz:4,pulseSharpness:12})],
    coin:()=>[t(2093,.27,{fm:{ratio:2.1,index:.6}}),t(3136,.12,{envelope:env(.001,.09,.04,.14)})],
  };
  if(!timbres[name])throw Error(`Unknown material: ${name}`);
  // Allow a timbre-specific envelope to override the generic one.
  return timbres[name]().map(layer=>({...layer,envelope:layer.continuous?undefined:layer.envelope}));
}
const sound=(duration,...materials)=>({duration,materials});
const plan={
 'jaguar-roar':{cast:sound(.8,'growl','boom')},
 'obsidian-arc':{cast:sound(.36,'glass','thwip'),hit:sound(.19,'stone','glass')},
 'prowlers-leap':{cast:sound(.38,'wind','whistle'),hit:sound(.32,'boom','scrape')},
 'claw-cyclone':{cast:sound(.25,'flutter','wind'),loop:sound(1.5,'wind','flutter'),hit:sound(.12,'scrape','thwip'),loopStage:'cast',effectSeconds:1.5},
 'ceiba-breaker':{cast:sound(.55,'wood','wind'),hit:sound(.37,'wood','boom')},
 'bloodless-hunt':{cast:sound(.6,'whisper','wind'),hit:sound(.18,'bite','pop')},
 'stone-maw':{cast:sound(.62,'stone','scrape'),hit:sound(.36,'stone','boom')},
 'war-drum':{cast:sound(.4,'wood','boom'),loop:sound(3,'wood','boom'),loopStage:'aura',effectSeconds:6},
 'sun-claw':{cast:sound(.44,'crackle','chime'),hit:sound(.21,'hiss','crackle')},
 'jaguar-echo':{cast:sound(.64,'growl','whisper'),loop:sound(1.2,'rustle','wood'),hit:sound(.18,'bite','pop'),loopStage:'travel',effectSeconds:8},
 'fang-path':{cast:sound(.66,'stone','wood'),hit:sound(.16,'stone','pop')},
 'hunters-mark':{cast:sound(.44,'scrape','chime')},
 'nine-lives':{cast:sound(.92,'choir','purr')},
 'black-mirror':{cast:sound(.58,'glass','gong'),hit:sound(.22,'metal','glass')},
 'pyramid-rush':{cast:sound(.4,'growl','stone'),loop:sound(1.2,'stone','growl'),loopStage:'travel',effectSeconds:.6},
 'heart-of-balam':{cast:sound(.62,'heartbeat','gong'),loop:sound(2,'heartbeat','hum'),hit:sound(.4,'growl','glass'),loopStage:'aura',effectSeconds:6},
 bloodlust:{proc:sound(.14,'heartbeat','pop')},stonehide:{proc:sound(.3,'stone','hum')},
 'predators-rhythm':{proc:sound(.3,'gong','hum')},'feast-of-the-fallen':{proc:sound(.28,'bite','chime')},
 'obsidian-thorns':{proc:sound(.12,'glass','pop')},earthshaker:{proc:sound(.21,'boom','stone')},
 'wounded-fury':{proc:sound(.38,'growl','purr')},
 'copal-star':{cast:sound(.52,'jade','crackle')},
 'jade-halo':{cast:sound(.42,'jade','glass'),hit:sound(.14,'glass','pop'),loop:sound(2,'hum','jade'),loopStage:'travel',effectSeconds:1.4},
 'ancestor-flame':{cast:sound(.39,'crackle','wind'),hit:sound(.17,'crackle','whisper')},
 moonwell:{cast:sound(.6,'water','flute'),loop:sound(3,'water','flute'),loopStage:'ground',effectSeconds:5},
 'censer-wave':{cast:sound(.62,'whisper','wind')},
 'verdant-mercy':{cast:sound(.85,'harp','chime')},
 'copal-veil':{cast:sound(.52,'wind','rustle'),hit:sound(.2,'glass','jade')},
 'glyph-comet':{cast:sound(.75,'whistle','growl'),hit:sound(.35,'boom','stone')},
 'cacao-bloom':{cast:sound(.38,'harp','bite'),hit:sound(.2,'pop','bite')},
 raincaller:{cast:sound(.7,'rain','boom'),loop:sound(3.5,'rain','wind'),hit:sound(.33,'boom','crackle'),loopStage:'ground',effectSeconds:2.5},
 'spirit-familiar':{cast:sound(.4,'chirp','buzz'),loop:sound(2,'buzz','chirp'),loopStage:'aura',effectSeconds:12},
 'serpent-coil':{cast:sound(.64,'hiss','stone')},
 'jade-needles':{cast:sound(.45,'whistle','thwip'),hit:sound(.14,'glass','crackle')},
 dreamwalk:{cast:sound(.75,'wind','gong'),hit:sound(.18,'pop','chime')},
 'four-directions':{cast:sound(.82,'chime','flute')},'ixchels-mantle':{cast:sound(.95,'choir','glass')},
 'ancestral-echo':{proc:sound(.22,'whisper','crackle')},'mana-spring':{proc:sound(.18,'water','pop')},
 'lunar-boon':{proc:sound(.34,'chime','glass')},
 'rooted-meditation':{proc:sound(.28,'wood','hum'),loop:sound(2.5,'wood','hum'),loopStage:'aura',effectSeconds:.65},
 'jade-resilience':{proc:sound(.25,'jade','glass')},'spirit-harvest':{proc:sound(.3,'whisper','chime')},
 'crescent-blessing':{proc:sound(.12,'glass','jade')},
 'atlatl-volley':{cast:sound(.4,'thwip','wind')},
 featherstorm:{cast:sound(.34,'flutter','scrape'),loop:sound(2,'flutter','wind'),hit:sound(.12,'scrape','thwip'),loopStage:'travel',effectSeconds:4},
 'serpent-path':{cast:sound(.56,'hiss','wind')},windstep:{cast:sound(.28,'wind','whistle')},
 'quetzal-flip':{cast:sound(.48,'flutter','thwip')},'hunter-snare':{cast:sound(.42,'scrape','wind'),hit:sound(.19,'wood','boom')},
 'eagle-eye':{cast:sound(.6,'hum','whistle'),hit:sound(.17,'stone','thwip')},
 'sun-dart':{cast:sound(.24,'metal','chime'),hit:sound(.16,'metal','coin')},
 'storm-nest':{cast:sound(.5,'chirp','wind'),loop:sound(2.4,'wind','chirp'),loopStage:'ground',effectSeconds:8},
 'plume-guard':{cast:sound(.4,'flutter','wind'),hit:sound(.21,'chime','rustle')},
 'cacao-bomb':{cast:sound(.33,'hiss','pop'),loop:sound(1,'hiss','crackle'),hit:sound(.38,'boom','wood'),loopStage:'travel',effectSeconds:.7},
 'forked-flight':{cast:sound(.48,'whistle','thwip'),hit:sound(.12,'wood','thwip')},
 'gale-ring':{cast:sound(.55,'wind','boom')},
 'hunters-trance':{cast:sound(.8,'heartbeat','chime'),loop:sound(2,'heartbeat','hum'),loopStage:'aura',effectSeconds:6},
 skyfall:{cast:sound(.8,'whistle','wind'),hit:sound(.22,'wood','stone')},
 'kukulkans-breath':{cast:sound(.8,'growl','chime'),loop:sound(3,'wind','growl','chime'),loopStage:'aura',effectSeconds:2.25},
 'venomous-darts':{proc:sound(.22,'hiss','water')},'full-quiver':{proc:sound(.18,'thwip','flutter')},
 'hunters-focus':{proc:sound(.11,'wood','chime')},'fleet-hunter':{proc:sound(.19,'wind','thwip')},
 'jungle-instinct':{proc:sound(.2,'rustle','wind')},'trophy-hunter':{proc:sound(.38,'horn','chime')},
 'jade-bounty':{proc:sound(.18,'water','chime')},
 'healing-circle':{cast:sound(.8,'harp','chime')},'jade-ward':{cast:sound(.5,'jade','glass')},
 'cleansing-light':{cast:sound(.88,'choir','flute')},
 'sanctuary-dome':{cast:sound(.6,'hum','gong'),loop:sound(3,'hum','choir'),loopStage:'aura',effectSeconds:5},
 'radiant-beacon':{cast:sound(.86,'chime','whistle')},
 lifebond:{cast:sound(.64,'heartbeat','chime'),loop:sound(2,'heartbeat','jade'),loopStage:'aura',effectSeconds:6},
 'saving-grace':{proc:sound(.4,'choir','chime')},
 'bulwark-wall':{cast:sound(.72,'stone','scrape'),hit:sound(.26,'boom','stone')},
 'war-cry':{cast:sound(.78,'shout','boom')},'shield-bash':{cast:sound(.26,'stone','metal'),hit:sound(.18,'stone','metal')},
 'ground-slam':{cast:sound(.45,'boom','stone'),hit:sound(.3,'boom','wood')},
 'clay-bomb':{cast:sound(.35,'hiss','wood'),loop:sound(1.5,'hiss','scrape'),hit:sound(.36,'boom','stone'),loopStage:'ground',effectSeconds:3},
 'shield-throw':{cast:sound(.4,'flutter','stone'),hit:sound(.17,'metal','stone')},
 'guardian-link':{proc:sound(.18,'metal','pop')},
 ambush:{cast:sound(.24,'thwip','scrape')},execute:{cast:sound(.3,'wood','stone'),hit:sound(.2,'stone','boom')},
 'venom-blade':{cast:sound(.4,'water','hiss')},
 'silencing-dart':{cast:sound(.23,'thwip','whisper'),hit:sound(.13,'pop','hum')},
 'smoke-bomb':{cast:sound(.58,'pop','hiss')},vanish:{cast:sound(.62,'wind','whisper')},
 'bounty-contract':{proc:sound(.27,'coin','chime')},
};

function build(id,kind,design){
  const isLoop=kind==='loop',peakDb=kind==='proc'?-15:isLoop?-12:-3,detune=.97+(hash(`${id}/${kind}`)%600)/10000;
  let layers=design.materials.flatMap((name,index)=>material(name,design.duration,isLoop).map(layer=>({...layer,gain:layer.gain/(1+index*.3)})));
  const repeat=(times,spacing,rising=false)=>{layers=Array.from({length:times},(_,i)=>layers.map(layer=>({...layer,start:i*spacing,duration:Math.min(design.duration-i*spacing,spacing*1.8),frequency:(layer.frequency||220)*(rising?Math.pow(1.17,i):1)}))).flat();};
  if(kind==='cast'&&['atlatl-volley','hunters-mark','quetzal-flip'].includes(id))repeat(3,design.duration/4);
  if(kind==='cast'&&['fang-path','four-directions','verdant-mercy'].includes(id))repeat(4,design.duration/5,true);
  if(id==='war-drum'&&isLoop){
    layers=[...material('wind',3,true).map(l=>({...l,gain:.018})),...[0,1,2].flatMap((start,i)=>[
      ...material('wood',.36).map(l=>({...l,start,gain:l.gain*(i===2?1.3:.55)})),
      ...material('boom',.45).map(l=>({...l,start,gain:l.gain*(i===2?1:.2)}))])];
  }
  // Gentle synthetic risers: not a sampled scream or a voice recording.
  if(kind==='cast'&&['eagle-eye','glyph-comet','dreamwalk','radiant-beacon'].includes(id))layers=layers.map(l=>({...l,envelope:env(.12,.08,.85,.1)}));
  if(id==='jaguar-echo'&&isLoop)layers=layers.map(l=>({...l,pulseHz:4,pulseSharpness:12}));
  if(isLoop&&['jade-halo','sanctuary-dome','lifebond','rooted-meditation'].includes(id))layers=layers.map(l=>({...l,frequency:l.frequency?l.frequency*.7:undefined}));
  layers=layers.map(l=>({...l,frequency:l.frequency?+(l.frequency*detune).toFixed(3):undefined,endFrequency:l.endFrequency?+(l.endFrequency*detune).toFixed(3):undefined,
    filter:l.filter?{...l.filter,lowpass:l.filter.lowpass?+(l.filter.lowpass*detune).toFixed(2):undefined}:undefined}));
  return {duration:design.duration,loop:isLoop,peakDb,seed:hash(`${id}:${kind}:syj18`),layers,
    reverb:[{seconds:.027+(hash(id)%17)/1000,gain:.1},{seconds:.063+(hash(kind+id)%19)/1000,gain:.05}],
    delay:id==='vanish'?[{seconds:.14,gain:.2},{seconds:.28,gain:.1}]:[]};
}
await fs.mkdir('scripts/sfx-recipes',{recursive:true});
const manifest={skills:{},ui:{}};
for(const skill of skills){
  const silent=/^None \(passive\)/i.test(skill.sfx),design=plan[skill.id];
  if(!silent&&!design)throw Error(`Missing authored brief interpretation: ${skill.id}`);
  if(silent&&design)throw Error(`Silent passive was assigned sound: ${skill.id}`);
  const sounds=Object.fromEntries(Object.entries(design||{}).filter(([kind])=>['cast','hit','loop','proc'].includes(kind)).map(([kind,value])=>[kind,build(skill.id,kind,value)]));
  if(!silent&&!sounds[skill.kind==='active'?'cast':'proc'])throw Error(`Wrong primary cue for ${skill.id}`);
  await fs.writeFile(`scripts/sfx-recipes/${skill.id}.json`,JSON.stringify({id:skill.id,owner:skill.owner,kind:skill.kind,brief:skill.sfx,sounds},null,2)+'\n');
  manifest.skills[skill.id]={kinds:Object.keys(sounds),...(design?.loop?{loopStage:design.loopStage,effectSeconds:design.effectSeconds,
    stopOnImpact:['cacao-bomb','clay-bomb','heart-of-balam'].includes(skill.id)}:{}),...(silent?{silent:true}:{})};
}
const ui=[
 ['slot-unlock',.8,'stone padlock click, rising two-note golden chime',['stone','chime'],2],
 ['milestone-pick',1.2,'warm three-note fanfare on a soft hollow drum',['horn','wood'],3],
 ['pick-active',.2,'short bright golden ping',['chime','glass'],1],
 ['pick-passive',.25,'soft jade bell, gentle decay',['jade','hum'],1],
 ['pick-ally',.25,'airy sky-blue chime',['chime','wind'],1],
 ['companion-join',1,'friendly clay horn call with shimmer',['horn','chime'],2],
 ['ally-cast',.25,'small soft repeating pop',['pop','wind'],1],
 ['ally-rank',.6,'bright rising four-note arpeggio',['chime','harp'],4],
];
for(const [name,duration,brief,materials,notes]of ui){
  const id=`ui-${name}`,sound=build(id,'ui', {duration,materials});sound.peakDb=name==='ally-cast'?-18:name==='milestone-pick'?-9:-6;
  if(notes>1){
    const pitches=notes===4?[1,1.25,1.5,2]:notes===3?[1,1.25,1.5]:[1,1.5];
    sound.layers=pitches.flatMap((ratio,i)=>material(materials.at(-1),duration/notes*1.4).map(l=>({...l,start:i*duration/(notes+1)+(name==='slot-unlock'?.12:0),frequency:(l.frequency||220)*ratio,gain:l.gain*.65})));
    sound.layers.push(...material(materials[0],Math.min(duration,.3)).map(l=>({...l,gain:l.gain*.4})));
  }
  await fs.writeFile(`scripts/sfx-recipes/${id}.json`,JSON.stringify({id,owner:'ui',brief,sounds:{ui:sound}},null,2)+'\n');manifest.ui[name]={id};
}
await fs.mkdir('src/audio',{recursive:true});
await fs.writeFile('src/audio/sfx-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Authored ${skills.length} skill and ${ui.length} UI recipes from the JSON briefs; silent passives retain empty recipes.`);
