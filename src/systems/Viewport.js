export const VISIBLE_WORLD_HEIGHT=720;
export const MAX_VIEW_ASPECT=2.4;
export const PICKUP_MAGNET_RANGE=170; // World units, not canvas pixels.
export const GROUND_OVERSCAN=64;

export function viewportMetrics(width,height) {
 const pixelsWidth=Math.max(1,width),pixelsHeight=Math.max(1,height);
 const aspect=Math.min(MAX_VIEW_ASPECT,pixelsWidth/pixelsHeight);
 const worldWidth=VISIBLE_WORLD_HEIGHT*aspect;
 return {width:pixelsWidth,height:pixelsHeight,worldWidth,worldHeight:VISIBLE_WORLD_HEIGHT,aspect,
  zoom:pixelsHeight/VISIBLE_WORLD_HEIGHT,zoomX:pixelsWidth/worldWidth};
}

// Phaser updates worldView only during rendering. Derive it from current camera
// dimensions so resize, paused runs and headless steps cannot spawn on stale edges.
export function worldView(scene) {
 const camera=scene.cameras?.main;
 if(!camera){const p=scene.player||{x:0,y:0},half=VISIBLE_WORLD_HEIGHT/2;
  return {x:p.x-half,y:p.y-half,width:VISIBLE_WORLD_HEIGHT,height:VISIBLE_WORLD_HEIGHT,right:p.x+half,bottom:p.y+half};}
 const width=camera.width/(camera.zoomX||camera.zoom||1),height=camera.height/(camera.zoomY||camera.zoom||1);
 const x=(camera.scrollX||0)+camera.width/2-width/2,y=(camera.scrollY||0)+camera.height/2-height/2;
 return {x,y,width,height,right:x+width,bottom:y+height};
}

export function resizeCamera(camera,width,height,previous) {
 // CameraManager may already have changed width/height before our resize event.
 const center={x:camera.scrollX+(previous?.width??camera.width)/2,y:camera.scrollY+(previous?.height??camera.height)/2};
 const view=viewportMetrics(width,height);
 camera.setSize(view.width,view.height).setZoom(view.zoomX,view.zoom);
 camera.centerOn(center.x,center.y);
 return view;
}

export function retentionRadius(scene,margin) {
 const view=worldView(scene),player=scene.player||{x:0,y:0};
 return Math.hypot(view.width/2,view.height/2)+margin+
  Math.hypot(player.x-(view.x+view.width/2),player.y-(view.y+view.height/2));
}

// Phaser's shake intensity is multiplied by camera size AND zoom. Normalize both
// axes (including the camera matrix translation) to keep CSS-pixel displacement.
export function shakePixels(scene,duration,pixels) {
 const camera=scene.cameras?.main;
 if(!scene.settings?.screenShake||scene.settings?.reducedMotion||!camera?.shake)return;
 const x=camera.zoomX||camera.zoom||1,y=camera.zoomY||camera.zoom||1,average=(x+y)/2;
 camera.shake(duration,{x:pixels/(camera.width*average*x),y:pixels/(camera.height*average*y)});
}

export function resizeScreenOverlay(scene,object) {
 const camera=scene.cameras.main,view=worldView(scene);
 object.setPosition(camera.width/2,camera.height/2).setDisplaySize(view.width+2*GROUND_OVERSCAN,view.height+2*GROUND_OVERSCAN);
 return object;
}
