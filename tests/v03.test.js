import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import sharp from 'sharp';
import { HEROES, MODIFIERS } from '../src/data/heroes.js';
import { BOSSES, MAPS, RUN_MODES } from '../src/data/world.js';
import { enemyPool,canSpawnEnemy,bossForHero,spawnOutsideView,facingFor,ALLY_LEVEL } from '../src/systems/CombatRules.js';
import { hasTranslation,setLanguage,t } from '../src/i18n/index.js';
test('ground weapons never receive aerial enemies or bosses',()=>{
 for(let level=1;level<30;level++)for(const progress of [0,.2,.5,1])assert.ok(!enemyPool(HEROES.balam,level,progress).includes('bat'));
 assert.equal(canSpawnEnemy(HEROES.balam,'bat'),false);
 assert.ok(enemyPool(HEROES.kukul,1,0).includes('bat'));
 for(const id of ['camazotz','vucub'])assert.ok(bossForHero(HEROES.balam,BOSSES.find(b=>b.id===id)).artKey.startsWith('enemy-'));
 assert.equal(ALLY_LEVEL,5);assert.ok(enemyPool(HEROES.balam,5,0).includes('jaguar'));
});
test('all four spawn edges remain beyond the visible camera',()=>{
 const view={x:-300,y:400,width:1280,height:720};
 for(let i=0;i<100;i++){let n=0;const p=spawnOutsideView(view,()=>n++===0?i/100:.5);assert.ok(p.x<view.x||p.x>view.x+view.width||p.y<view.y||p.y>view.y+view.height);}
});
test('vertical facing and idle facing are consistent',()=>{
 assert.equal(facingFor(0,-180),'up');assert.equal(facingFor(0,180),'down');assert.equal(facingFor(-180,0),'side');assert.equal(facingFor(180,0),'side');assert.equal(facingFor(0,0,'up'),'up');
});
test('French and Arabic cover roster, skills, upgrades and map selectors',()=>{
 const keys=[];for(const h of Object.values(HEROES)){keys.push(h.name,h.epithet,h.description,h.role,h.weapon);for(const s of h.skills)keys.push(s.name,s.description);}
 for(const x of MODIFIERS)keys.push(x.name,x.description);for(const m of MAPS)keys.push(m.name,m.subtitle);for(const m of RUN_MODES)keys.push(m.name,m.description);
 for(const locale of ['fr','ar'])for(const key of keys)assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
 setLanguage('ar');assert.equal(t('LEVEL 5'),'المستوى 5');setLanguage('en');
});
test('new overhead and directional assets are packaged',async()=>{
 for(const id of ['balam','ixchel','kukul'])for(const dir of ['up','down'])for(let n=0;n<4;n++){const m=await sharp(`public/assets/pixel/frames/hero-${id}-${dir}-${n}.png`).metadata();assert.equal(m.width,128);assert.equal(m.height,128);assert.ok(m.hasAlpha);}
 for(const id of ['temple','palm','tree','rocks','ruin','stela','foliage','roots','crystal']){const m=await sharp(`public/assets/pixel/top-${id}.png`).metadata();assert.equal(m.width,192);assert.ok(m.hasAlpha);}
 const file='public/assets/branding/play-store-icon-512.png',m=await sharp(file).metadata();assert.equal(m.width,512);assert.equal(m.height,512);assert.equal(m.channels,4);assert.equal(m.space,'srgb');assert.ok(statSync(file).size<1024*1024);
});
