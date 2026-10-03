import { ALLY_CATALOG } from '../data/allyCatalog.js';
const root=`${import.meta.env.BASE_URL}assets/pixel/`;
export const CHARACTER_ROWS={hero:['balam','ixchel','kukul'],enemy:['shade','bat','jaguar','serpent','priest'],boss:['camazotz','zipacna','vucub','ahpuch'],support:['saintess','tank','assassin']};
export function preloadTextures(scene) {
  scene.load.image('pickup-bubble',`${import.meta.env.BASE_URL}assets/ui/pickup-bubble.svg`);
  scene.load.image('support-bomb',`${root}support-bomb.png`);
  for(const skill of Object.values(ALLY_CATALOG).flat()) {
    const key=`skill-icon-${skill.id}`;
    if(!scene.textures.exists(key))scene.load.image(key,`${root}${skill.iconFile}`);
  }
  const actorKeys=[...Object.entries(CHARACTER_ROWS).flatMap(([kind,names])=>names.map(name=>`${kind}-${name}`)),...CHARACTER_ROWS.hero.flatMap(name=>['up','down'].map(dir=>`hero-${name}-${dir}`)),...Array.from({length:6},(_,i)=>`fx-${i}`)];
  for(const key of actorKeys){scene.load.image(key,`${root}frames/${key}-0.png`);for(let i=0;i<4;i++)scene.load.image(`${key}-frame-${i}`,`${root}frames/${key}-${i}.png`);}
  for(const name of ['temple','palm','tree','rocks','ruin','stela','foliage','roots','crystal'])scene.load.image(`top-${name}`,`${root}top-${name}.png`);
  for(const name of ['stela','ruin','palm','foliage','roots','crystal','urn','basket','weapon-balam','weapon-ixchel','weapon-kukul','bracers','pendant','headdress','cacao','potion']) scene.load.image(name,`${root}${name}.png`);
  scene.load.image('xp-gem',`${root}crystal.png`);
  scene.load.image('summon',`${root}weapon-ixchel.png`);
  scene.load.image('trap',`${root}skills/stone-maw.png`);
  scene.load.image('player-dart',`${root}weapon-kukul.png`);
  scene.load.image('ground',`${root}ground.png`);
}
export function buildTextures(scene) {
  for(const [kind,names] of Object.entries({...CHARACTER_ROWS,hero:[...CHARACTER_ROWS.hero,...CHARACTER_ROWS.hero.flatMap(name=>[`${name}-up`,`${name}-down`])] })) for(const name of names) {
    const key=`${kind}-${name}`;
    for(const [state,frames,rate,repeat] of [['idle',[0,0,1,0],3,-1],['walk',[0,1,0,1],8,-1],['attack',[2,2,0],12,0],['hurt',[3,3,0],12,0]]) {
      if(!scene.anims.exists(`${key}-${state}`)) scene.anims.create({key:`${key}-${state}`,frames:frames.map(frame=>({key:`${key}-frame-${frame}`})),frameRate:rate,repeat});
    }
  }
  for(let row=0;row<6;row++) {
    if(!scene.anims.exists(`effect-${row}`)) scene.anims.create({key:`effect-${row}`,frames:[0,1,2,3].map(frame=>({key:`fx-${row}-frame-${frame}`})),frameRate:14,repeat:0});
    if(!scene.anims.exists(`bolt-${row}`)) scene.anims.create({key:`bolt-${row}`,frames:[0,1].map(frame=>({key:`fx-${row}-frame-${frame}`})),frameRate:10,repeat:-1});
  }
}
