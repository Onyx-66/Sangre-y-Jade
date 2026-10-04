// Phaser 3.90 has no live FPS setter. Sleep/wake selects its limited stepping
// function again; the limit/target caches match the installed TimeStep source.
export function applyFrameRate(loop,fps) {
 if(!loop||loop.targetFps===fps&&loop.fpsLimit===fps)return;
 const running=loop.running;
 if(running)loop.sleep();
 loop.targetFps=loop.fpsLimit=fps;
 loop._target=loop._limitRate=1000/fps;
 loop.hasFpsLimit=true;loop.forceSetTimeOut=fps===30;
 if(running)loop.wake(true);
}

export function applySettingChange({save,audio,scene},key,value) {
 save.setSetting(key,value);
 audio.applySettings();
 if(key==='reducedMotion'&&typeof document!=='undefined')document.documentElement.classList.toggle('reduce-motion',value);
 if(!scene||scene.ended)return;
 scene.settings[key]=value;
 if(key==='attackMode'){
  scene.releaseAttack?.();scene.hud?.setAttackMode(value);
 }
 if(key==='particles'){
  // Existing objects finish normally; the selected budget governs new spawns.
  if(scene.enemies)scene.enemies.maxSize=value==='low'?90:155;
  if(scene.projectiles)scene.projectiles.maxSize=value==='low'?100:210;
 }
 if(key==='fps')applyFrameRate(scene.sys?.game?.loop||scene.game?.loop,value);
}
