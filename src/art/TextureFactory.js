import { CHARACTER_ROWS,textureManifest } from './textureManifest.js';
import { ENEMY_ANIMATIONS } from './enemyVisuals.js';
export { CHARACTER_ROWS } from './textureManifest.js';
export function preloadTextures(scene,selection={}) {
  for(const file of textureManifest({...selection,base:import.meta.env.BASE_URL}))if(!scene.textures.exists(file.key))scene.load.image(file.key,file.url);
}
export function buildTextures(scene) {
  for(const [kind,names] of Object.entries({...CHARACTER_ROWS,hero:[...CHARACTER_ROWS.hero,...CHARACTER_ROWS.hero.flatMap(name=>[`${name}-up`,`${name}-down`])] })) for(const name of names) {
    const key=`${kind}-${name}`;
    if(!scene.textures.exists(key))continue;
    const states=(kind==='enemy'||kind==='boss')&&scene.textures.exists(`${key}-frame-15`)
      ?Object.entries(ENEMY_ANIMATIONS).map(([state,{frames,rate,repeat}])=>[state,frames,rate,repeat])
      :[['idle',[0,0,1,0],3,-1],['walk',[0,1,0,1],8,-1],['attack',[2,2,0],12,0],['hurt',[3,3,0],12,0]];
    for(const [state,frames,rate,repeat] of states) {
      if(!scene.anims.exists(`${key}-${state}`)) scene.anims.create({key:`${key}-${state}`,frames:frames.map(frame=>({key:`${key}-frame-${frame}`})),frameRate:rate,repeat});
    }
  }
  for(let row=0;row<6;row++) {
    if(!scene.anims.exists(`effect-${row}`)) scene.anims.create({key:`effect-${row}`,frames:[0,1,2,3].map(frame=>({key:`fx-${row}-frame-${frame}`})),frameRate:14,repeat:0});
    if(!scene.anims.exists(`bolt-${row}`)) scene.anims.create({key:`bolt-${row}`,frames:[0,1].map(frame=>({key:`fx-${row}-frame-${frame}`})),frameRate:10,repeat:-1});
  }
}
