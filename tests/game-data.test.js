import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { HEROES, MODIFIERS } from '../src/data/heroes.js';
import { BOSSES, ENEMIES, GEAR, MAPS, RUN_MODES, STORE_ITEMS } from '../src/data/world.js';

const supportedEffects = new Set(['projectile', 'burst', 'nova', 'cone', 'line', 'orbit', 'trap', 'heal', 'shield', 'chain', 'summon', 'dash', 'rain']);

test('the roster exposes the converted Balam/Kukul pools and pending Ixchel pool', () => {
  assert.equal(Object.keys(HEROES).length, 3);
  for (const hero of Object.values(HEROES)) {
    const count=hero.id==='ixchel'?20:16;
    assert.equal(hero.skills.length, count, `${hero.name} active pool`);
    assert.equal(new Set(hero.skills.map((skill) => skill.id)).size, count, `${hero.name} skill ids should be unique`);
    assert.ok(hero.base.hp > 0 && hero.base.speed > 0);
    assert.ok(hero.automatic.damage > 0 && hero.automatic.cooldown > 0);
    for (const skill of hero.skills) {
      assert.ok(supportedEffects.has(skill.type)||skill.type==='active'&&['balam','kukul'].includes(skill.owner), `${skill.name} uses a supported effect`);
      assert.ok(skill.cooldown > 0, `${skill.name} has a cooldown`);
      assert.ok(skill.description.length > 12, `${skill.name} has player-facing copy`);
    }
  }
});

test('world and progression pools meet the version-zero design scope', () => {
  assert.equal(MAPS.length, 3);
  assert.deepEqual(RUN_MODES.map((mode) => mode.duration), [600, 1200]);
  assert.equal(BOSSES.length, 4);
  assert.equal(GEAR.length, 6);
  assert.ok(Object.keys(ENEMIES).length >= 5);
  assert.ok(MODIFIERS.length >= 8);
  assert.equal(new Set(GEAR.map((item) => item.slot)).size, GEAR.length, 'equipment slots should not overlap');
});

test('supporter offerings are content or cosmetics, never stat boosts', () => {
  assert.ok(STORE_ITEMS.length >= 3);
  const combined = STORE_ITEMS.map((item) => `${item.name} ${item.description}`.toLowerCase()).join(' ');
  assert.match(combined, /cosmetic/);
  assert.doesNotMatch(combined, /\+\d+%|premium cacao|paid revive|random reward|loot box/);
  assert.ok(STORE_ITEMS.every((item) => !('apply' in item)), 'store entries must not apply gameplay stats');
});

test('every declared audio asset is a valid RIFF/WAVE file', () => {
  const names = [
    'music-menu.wav', 'music-day.wav', 'music-night.wav', 'music-cenote.wav', 'music-boss.wav', 'music-prologue.wav',
    'sfx-click.wav', 'sfx-slash.wav', 'sfx-spell.wav', 'sfx-dart.wav', 'sfx-hit.wav', 'sfx-pickup.wav',
    'sfx-cacao.wav', 'sfx-dash.wav', 'sfx-level.wav', 'sfx-hurt.wav', 'sfx-boss.wav', 'sfx-victory.wav', 'sfx-defeat.wav',
  ];
  for (const name of names) {
    const path = resolve('public/assets/audio', name);
    assert.ok(existsSync(path), `${name} should exist`);
    const data=readFileSync(path);
    assert.equal(data.readUInt16LE(22),2,`${name} is stereo`);
    assert.equal(data.readUInt32LE(24),44100,`${name} is mastered at 44.1 kHz`);
    const header = data.subarray(0, 12).toString('ascii');
    assert.equal(header.slice(0, 4), 'RIFF');
    assert.equal(header.slice(8, 12), 'WAVE');
  }
});

test('six cinematic panels and pixel title are complete raster assets', async () => {
  for(const name of ['title',...Array.from({length:6},(_,i)=>`story-${i}`)]){
    const meta=await sharp(resolve(`public/assets/pixel/${name}.webp`)).metadata();
    assert.ok(meta.width>=640 && meta.height>=360,name);
  }
});
test('all heroes, enemies, bosses and effects have separate transparent frames',async()=>{
  const names=['hero-balam','hero-ixchel','hero-kukul','enemy-shade','enemy-bat','enemy-jaguar','enemy-serpent','enemy-priest','boss-camazotz','boss-zipacna','boss-vucub','boss-ahpuch',...Array.from({length:6},(_,i)=>`fx-${i}`)];
  for(const name of names){const boss=name.startsWith('boss-'),size=boss?192:128;
    for(let n=0;n<(boss?16:4);n++){const meta=await sharp(resolve(`public/assets/pixel/frames/${name}-${n}.png`)).metadata();assert.equal(meta.width,size,name);assert.equal(meta.height,size,name);assert.ok(meta.hasAlpha,name);}
  }
});
test('114 ID-named skill, stat and HUD icons and an OFL-licensed font are bundled',()=>{
  const icons=readdirSync(resolve('public/assets/pixel/skills')).filter(file=>file.endsWith('.png'));
  assert.equal(icons.length,114);
  for(const file of icons)assert.ok(existsSync(resolve(`public/assets/pixel/skills/${file}`)));
  assert.equal(existsSync(resolve('public/assets/pixel/icon-0.png')),false);
  assert.match(readFileSync('public/assets/fonts/OFL.txt','utf8'),/SIL OPEN FONT LICENSE/);
});

