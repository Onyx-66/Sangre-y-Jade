import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {debugEnabled} from '../src/systems/DebugAccess.js';
import {AllyBrain} from '../src/systems/AllyBrain.js';

test('production debug handles require fxdebug=1; development remains inspectable',()=>{
 assert.equal(debugEnabled(),false);assert.equal(debugEnabled({search:'?fxdebug=0'}),false);
 assert.equal(debugEnabled({search:'?fxdebug=1'}),true);assert.equal(debugEnabled({dev:true}),true);
});
test('ally cast popup uses the unique skill-id texture, never a deleted numeric icon',()=>{
 let texture,destroyed=false;
 const icon={setDepth(){return this;},setDisplaySize(){return this;},destroy(){destroyed=true;}};
 const scene={add:{image(x,y,key){texture=key;return icon;}},tweens:{add(config){assert.equal(config.duration,600);config.onComplete();}}};
 new AllyBrain(scene,{}).popIcon({id:'healing-circle'},{sprite:{x:10,y:20}});
 assert.equal(texture,'skill-icon-healing-circle');assert.equal(destroyed,true);
 const source=readFileSync(new URL('../src/art/TextureFactory.js',import.meta.url),'utf8');
 assert.ok(source.includes('skill-icon-${skill.id}')&&source.includes('${skill.iconFile}'));
});
