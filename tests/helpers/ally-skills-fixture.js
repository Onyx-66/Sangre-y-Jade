import assert from 'node:assert/strict';
import { ALLY_CATALOG } from '../../src/data/allyCatalog.js';
import { SupportSystem } from '../../src/systems/SupportSystem.js';
import { addEnemy, makeScene, sprite } from './scene-fixture.js';

export function harness(role, ids) {
  const scene=makeScene();scene.elapsed=1;scene.pausedForChoice=false;scene.ended=false;
  scene.hud={setAlly(){},toast(){}};scene.skillAudio={plays:[],play(...args){this.plays.push(args);},loop(){},stop(){}};
  scene.fx={plays:[],play(...args){this.plays.push(args);return null;}};
  const support=new SupportSystem(scene);scene.support=support;support.summon(role,5);
  for(const skill of [...scene.companion.skills])scene.passives.unequip(skill.id);
  scene.companion.skills=[];
  for(const id of ids){
    const skill=ALLY_CATALOG[role].find(candidate=>candidate.id===id);
    assert.ok(skill,`missing ${role}/${id}`);assert.ok(support.equip(skill),`could not equip ${id}`);
  }
  return {scene,support,brain:support.brain};
}

export function activate(scene,id) {
  switch(id){
    case 'healing-circle':scene.stats.hp=50;break;
    case 'jade-ward':scene.stats.shield=0;break;
    case 'cleansing-light':scene.player.setData('poisonUntil',scene.elapsed+1);break;
    case 'sanctuary-dome':for(const [x,y] of [[20,0],[40,0],[60,0]])addEnemy(scene,{},x,y);break;
    case 'radiant-beacon':addEnemy(scene,{},500,0);break;
    case 'lifebond':scene.stats.hp=60;break;
    case 'bulwark-wall':{
      addEnemy(scene,{},0,-180);const shot=sprite(0,-100);shot.setVelocity(0,100);scene.enemyProjectiles.add(shot);break;
    }
    case 'war-cry':for(const [x,y] of [[10,0],[40,10],[60,-20]])addEnemy(scene,{},x,y);break;
    case 'shield-bash':addEnemy(scene,{},0,0);break;
    case 'ground-slam':{
      const a=scene.companion.sprite;addEnemy(scene,{},a.x+10,a.y);addEnemy(scene,{},a.x+35,a.y);break;
    }
    case 'clay-bomb':addEnemy(scene,{},80,0);break;
    case 'shield-throw':{
      const a=scene.companion.sprite;addEnemy(scene,{},a.x+60,a.y);addEnemy(scene,{},a.x+110,a.y);break;
    }
    case 'ambush':addEnemy(scene,{},100,0);break;
    case 'execute':addEnemy(scene,{hp:300,maxHp:1000},100,0);break;
    case 'venom-blade':addEnemy(scene,{},100,0);break;
    case 'silencing-dart':addEnemy(scene,{ranged:true},300,0);break;
    case 'smoke-bomb':for(const [x,y] of [[20,0],[45,0],[70,0]])addEnemy(scene,{ranged:true},x,y);break;
    case 'vanish':scene.stats.hp=40;break;
  }
}
