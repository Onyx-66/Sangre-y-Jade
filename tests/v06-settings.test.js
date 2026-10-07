import test from 'node:test';
import assert from 'node:assert/strict';
import { makeScene } from './helpers/scene-fixture.js';
import { setLanguage, t, hasTranslation } from '../src/i18n/index.js';
import { settingsToggle, updateSettingsToggle, bindSettingsToggle } from '../src/ui/SettingsToggle.js';
import { SETTINGS_CONTROLS, settingsPanelMarkup, CONTROLS_TEXT } from '../src/ui/SettingsPanel.js';
import { applySettingChange, applyFrameRate } from '../src/systems/RuntimeSettings.js';
import { DEFAULT_SAVE } from '../src/systems/SaveSystem.js';
import fs from 'node:fs/promises';

function pauseFixture() {
 const scene=makeScene(),screens=[],events=[];
 scene.physics={pause:()=>events.push('physics-pause'),resume:()=>events.push('physics-resume')};
 scene.tweens={pauseAll:()=>events.push('tweens-pause'),resumeAll:()=>events.push('tweens-resume')};
 scene.skillAudio={pause:()=>events.push('audio-pause'),resume:()=>events.push('audio-resume')};
 scene.releaseAttack=()=>events.push('release-attack');
 const screen=(kind,data)=>{const entry={kind,...data,removed:false,remove(){this.removed=true;}};screens.push(entry);return entry;};
 scene.hud.showPause=(resume,exit,skills,settings,help)=>screen('pause',{resume,exit,skills,settings,help});
 scene.hud.showSettings=(change,back)=>screen('settings',{change,back});
 scene.hud.showSkills=(loadout,back)=>screen('skills',{loadout,back});
 scene.hud.showHelp=back=>screen('help',{back});
 return {scene,screens,events};
}

test('pause exposes Settings without resuming the game',()=>{
 const {scene,screens,events}=pauseFixture();
 scene.togglePause();
 assert.equal(typeof screens.at(-1).settings,'function');
 screens.at(-1).settings();
 assert.equal(screens.at(-1).kind,'settings');
 assert.equal(scene.pausedForChoice,true);assert.equal(scene.time.paused,true);
 assert.ok(!events.includes('physics-resume'));
});

test('Android Back through togglePause closes Settings to pause, then resumes only from pause',()=>{
 const {scene,screens,events}=pauseFixture();
 scene.togglePause();screens.at(-1).settings();const settings=screens.at(-1);
 scene.togglePause();
 assert.equal(settings.removed,true);assert.equal(screens.at(-1).kind,'pause');
 assert.equal(scene.pausedForChoice,true);assert.equal(scene.time.paused,true);
 scene.togglePause();
 assert.equal(screens.at(-1).removed,true);
 assert.equal(scene.pausedForChoice,false);assert.equal(scene.time.paused,false);
 assert.equal(events.filter(event=>event==='physics-resume').length,1);
});

test('toggle state words and Quit to Menu have complete EN/FR/AR translations',()=>{
 for(const locale of ['en','fr','ar'])for(const key of ['On','Off','Quit to Menu']){
  setLanguage(locale);assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
  if(locale!=='en')assert.notEqual(t(key),key);
 }
 setLanguage('en');
});

test('one toggle component owns its accessible state, mark and localized word in both states',()=>{
 for(const locale of ['en','fr','ar'])for(const value of [false,true]){
  setLanguage(locale);const markup=settingsToggle('screenShake','Screen shake',value);
  assert.ok(markup.includes(`aria-checked="${value}"`));assert.ok(markup.includes('role="switch"'));
  assert.ok(markup.includes(t(value?'On':'Off')));assert.ok(markup.includes(value?'✓':'×'));
  assert.ok(markup.includes('for="setting-screenShake"'));
 }
 setLanguage('en');
});

test('toggle click and Space activation each update the live value exactly once',()=>{
 const nodes={'.toggle-symbol':{},'.toggle-word':{}},handlers=new Map(),attributes={};
 const button={dataset:{},setAttribute:(key,value)=>attributes[key]=value,querySelector:key=>nodes[key],
  addEventListener:(key,fn)=>handlers.set(key,fn),click:()=>handlers.get('click')()};
 let value=false,changes=0,prevented=false;
 bindSettingsToggle(button,()=>value,next=>{value=next;changes++;});
 button.click();assert.equal(value,true);assert.equal(changes,1);assert.equal(attributes['aria-checked'],'true');
 handlers.get('keydown')({key:' ',preventDefault:()=>prevented=true});
 assert.equal(value,false);assert.equal(changes,2);assert.equal(prevented,true);
 assert.equal(button.dataset.state,'off');assert.equal(nodes['.toggle-symbol'].textContent,'×');
 handlers.get('keydown')({key:'a'});assert.equal(changes,2);
 updateSettingsToggle(button,true);assert.equal(nodes['.toggle-word'].textContent,'On');
});

test('shared settings content has exactly the existing controls and no English fallback in FR/AR',()=>{
 assert.equal(SETTINGS_CONTROLS.length,17);
 assert.deepEqual(SETTINGS_CONTROLS.filter(c=>c.type==='toggle').map(c=>c.key),['voiceEnabled','screenShake','damageNumbers','reducedMotion','reduceEffects','telegraphHighContrast']);
 for(const locale of ['en','fr','ar']){
  setLanguage(locale);const markup=settingsPanelMarkup(DEFAULT_SAVE.settings);
  assert.equal((markup.match(/data-setting-row=/g)||[]).length,17);
  assert.equal((markup.match(/role="switch"/g)||[]).length,6);
  for(const key of [...SETTINGS_CONTROLS.map(c=>c.label),'On','Off',CONTROLS_TEXT]){
   assert.ok(hasTranslation(key,locale),`${locale}: ${key}`);
   if(locale!=='en')assert.notEqual(t(key),key);
  }
 }
 setLanguage('en');
});

test('live settings persist and update the run copy, attack HUD, budgets and audio without resuming',()=>{
 const saved={...DEFAULT_SAVE.settings},scene={settings:{...saved},hud:{setAttackMode:mode=>scene.mode=mode},
  releaseAttack:()=>scene.released=true,enemies:{maxSize:155},projectiles:{maxSize:210},pausedForChoice:true,time:{paused:true}};
 const changes=[],audio={applySettings:()=>changes.push('audio')},save={setSetting:(key,value)=>{saved[key]=value;changes.push(key);}};
 for(const [key,value]of [['attackMode','manual'],['autoAim',false],['screenShake',false],['damageNumbers',false],['particles','low'],['master',.3],['music',.4],['sfx',.5]]){
  applySettingChange({save,audio,scene},key,value);assert.equal(saved[key],value);assert.equal(scene.settings[key],value);
 }
 assert.equal(scene.mode,'manual');assert.equal(scene.released,true);assert.equal(scene.enemies.maxSize,90);assert.equal(scene.projectiles.maxSize,100);
 assert.equal(changes.filter(c=>c==='audio').length,8);assert.equal(scene.pausedForChoice,true);assert.equal(scene.time.paused,true);
 applySettingChange({save,audio,scene},'particles','high');assert.equal(scene.enemies.maxSize,155);assert.equal(scene.projectiles.maxSize,210);
});

test('FPS changes restart only the render loop and never wake an already sleeping loop',()=>{
 const events=[],loop={targetFps:60,fpsLimit:60,running:true,sleep:()=>events.push('sleep'),wake:seamless=>events.push(['wake',seamless])};
 applyFrameRate(loop,30);assert.equal(loop.targetFps,30);assert.equal(loop.fpsLimit,30);assert.equal(loop._limitRate,1000/30);
 assert.equal(loop.hasFpsLimit,true);assert.equal(loop.forceSetTimeOut,true);assert.deepEqual(events,['sleep',['wake',true]]);
 applyFrameRate(loop,30);assert.equal(events.length,2);
 loop.running=false;applyFrameRate(loop,60);assert.equal(events.length,2);assert.equal(loop.forceSetTimeOut,false);
});

test('Settings changes are routed through the run owner, and repeated open/close cannot resume it',()=>{
 const {scene,screens,events}=pauseFixture(),changed=[];
 scene.options.onSettingsChange=(key,value)=>changed.push([key,value]);
 scene.togglePause();
 for(let n=0;n<3;n++){
  screens.at(-1).settings();screens.at(-1).change('screenShake',false);screens.at(-1).back();
  assert.equal(screens.at(-1).kind,'pause');assert.equal(scene.pausedForChoice,true);
 }
 assert.equal(changed.length,3);assert.ok(!events.includes('physics-resume'));
});

test('pause Skills and How to Play are read-only children with Back to pause',()=>{
 const {scene,screens}=pauseFixture();scene.passiveSlots=[];scene.togglePause();
 screens.at(-1).skills();assert.equal(screens.at(-1).kind,'skills');scene.togglePause();
 assert.equal(screens.at(-1).kind,'pause');screens.at(-1).help();assert.equal(screens.at(-1).kind,'help');
 screens.at(-1).back();assert.equal(screens.at(-1).kind,'pause');assert.equal(scene.pausedForChoice,true);
});

test('level-up choices are not dismissed by Back, and stale pause callbacks cannot alter an ended run',()=>{
 const {scene,screens,events}=pauseFixture();scene.pausedForChoice=true;scene.togglePause();assert.equal(screens.length,0);
 scene.pausedForChoice=false;scene.togglePause();const oldPause=screens.at(-1);
 oldPause.settings();const settings=screens.at(-1);let changes=0;
 scene.options.onSettingsChange=()=>changes++;scene.ended=true;
 settings.change('master',0);settings.back();oldPause.resume();
 assert.equal(changes,0);assert.ok(!events.includes('physics-resume'));assert.equal(screens.at(-1),settings);
});

test('main menu and pause import the same renderer and production enables the existing native bridge',async()=>{
 const main=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8');
 const hud=await fs.readFile(new URL('../src/systems/Hud.js',import.meta.url),'utf8');
 for(const source of [main,hud])assert.ok(source.includes('renderSettingsPanel('));
 assert.doesNotMatch(main,/data-toggle="|id="attack-mode"/,'no parallel main-menu settings implementation');
 assert.ok(main.includes("location.hostname === 'appassets.androidplatform.net'"));
 const css=await fs.readFile(new URL('../src/ui/settings.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/translateX|inset-inline/,'switch internal geometry uses fixed physical coordinates');
});
