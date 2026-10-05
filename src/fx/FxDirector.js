// Deterministic fallback retained for heroes whose art arrives in later asset steps.
export function placeholderStyle(id) {
  let hash=2166136261;
  for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return { sides:3+hash%6, rotation:(hash%360)*Math.PI/180, color:0x404040|(hash&0xbfbfbf) };
}
export class FxDirector {
  static recipes = new Map();
  static register(skillId, recipe) {
    if (!skillId || !recipe || !Array.isArray(recipe.stills)) throw new TypeError('Fx recipe needs an id and stills array.');
    this.recipes.set(skillId, recipe);
    return recipe;
  }
  static preload(scene, skillIds = []) {
    const base = import.meta.env?.BASE_URL || '/';
    let loaded = 0;
    for (const id of new Set(skillIds)) {
      const recipe = this.recipes.get(id);
      if (!recipe) continue;
      for (const still of recipe.stills) {
        const key = textureKey(id, still);
        if (scene.textures.exists(key)) continue;
        scene.load.image(key, `${base}assets/pixel/fx/${recipe.files?.[still]||`${id}/${still}.png`}`);
        loaded += 1;
      }
    }
    return loaded;
  }
  constructor(scene) { this.scene=scene;this.live=[];this.missing=new Set();this.liveUnits=0; }
  prune() {
    this.live=this.live.filter(effect=>effect.object?.active);
    this.liveUnits=this.live.reduce((sum,effect)=>sum+(effect.object?.active?effect.units:0),0);
  }
  evictFor(units) {
    this.prune();
    while(this.live.length&&this.liveUnits+units>24){
      const oldest=this.live.shift();
      oldest.object?.destroy();
      this.liveUnits=Math.max(0,this.liveUnits-oldest.units);
    }
  }
  track(object, units=1) {
    if(!object)return object;
    this.evictFor(units);
    this.live.push({object,units});this.liveUnits+=units;
    object.once?.('destroy',()=>this.scene.tweens.killTweensOf?.(object));
    return object;
  }
  placeholder(id,still) {
    const scene=this.scene,key=`skill-placeholder-${id}`,style=placeholderStyle(id),missing=`fx/${id}/${still}.png`;
    if(!this.missing.has(missing)){this.missing.add(missing);console.warn(`[skills] Placeholder: ${missing}`);}
    if(!scene.textures.exists(key)){
      const g=scene.add.graphics(),points=[];
      for(let i=0;i<style.sides;i++){const a=style.rotation+i/style.sides*Math.PI*2;points.push({x:48+Math.cos(a)*36,y:48+Math.sin(a)*36});}
      g.lineStyle(4,style.color,1).strokePoints(points,true).fillStyle(style.color,.2).fillCircle(48,48,22);
      g.generateTexture(key,96,96);g.destroy();
    }
    return key;
  }
  texture(id,still) {
    const scene=this.scene,key=textureKey(id,still);
    return scene.textures.exists(key)?key:this.placeholder(id,still);
  }
  playPlaceholder(id,stage,{x=0,y=0,angle=0,scale=1,tint,duration=.4,target}={}) {
    const scene=this.scene,key=this.placeholder(id,stage==='proc'?'proc':'main'),style=placeholderStyle(id),point=target||{x,y};
    const sprite=scene.add.image(point.x,point.y,key).setDepth(stage==='ground'?8:23).setRotation(angle).setScale(scale).setAlpha(.8);
    if(tint!==undefined)sprite.setTint(tint);
    this.track(sprite);
    scene.tweens.add({targets:sprite,scale:scale*1.6,alpha:0,duration:duration*1000,onComplete:()=>sprite.destroy()});
    return sprite;
  }
  makeStills(id,recipe) {
    const scene=this.scene, director=this;
    const stills=Object.fromEntries(recipe.stills.map(name=>[name,this.texture(id,name)]));
    const blendModes={ADD:'ADD',SCREEN:'SCREEN',NORMAL:'NORMAL'};
    // Keep a still attached to its real projectile/actor without changing collision geometry.
    stills.follow=(sprite,target,{offsetX=0,offsetY=0,isAlive,replace=false,update}={})=>{
      if(!sprite||!target)return sprite;
      const alive=isAlive||(()=>target.active!==false),visible=target.visible;
      const sync=()=>{
        if(!sprite.active)return detach();
        if(!alive()){sprite.destroy();return;}
        sprite.setPosition(target.x+offsetX,target.y+offsetY);update?.(sprite,target);
      };
      const detach=()=>{scene.events?.off?.('update',sync);if(replace&&alive())target.setVisible?.(visible!==false);};
      if(replace)target.setVisible?.(false);
      sprite.once?.('destroy',detach);scene.events?.on?.('update',sync);sync();return sprite;
    };
    stills.image=(name,x,y,options={})=>{
      const size=options.size??128,width=options.width??size,height=options.height??size,angle=options.angle??0,
        rotation=options.rotation??angle,depth=options.depth??23,alpha=options.alpha??.9,
        blendMode=options.blendMode??blendModes[recipe.signature?.blendMode]??'ADD',tint=options.tint;
      const sprite=scene.add.image(x,y,stills[name]||this.texture(id,name)).setDepth(depth).setRotation(rotation).setDisplaySize(width,height).setAlpha(alpha).setBlendMode(blendMode);
      if(tint!==undefined)sprite.setTint(tint);
      return director.track(sprite);
    };
    stills.burst=(name,x,y,options={})=>{
      const count=options.count??6,lifespan=options.lifespan??420,size=options.size??28,speed=options.speed??130,
        scaleStart=options.scaleStart??.18,blendMode=options.blendMode??blendModes[recipe.signature?.blendMode]??'ADD';
      if(!scene.add.particles)return stills.image(name,x,y,{size:size*2,alpha:.7});
      const quantity=Math.max(1,Math.min(count,24));director.evictFor(quantity);
      const emitter=scene.add.particles(x,y,stills[name]||this.texture(id,name),{
        emitting:false,quantity:1,lifespan,speed:{min:speed*.45,max:speed},scale:{start:scaleStart,end:0},alpha:{start:.9,end:0},blendMode,
      });
      emitter.explode(quantity,x,y);
      director.live.push({object:emitter,units:quantity});director.liveUnits+=quantity;
      scene.time.delayedCall(lifespan+40,()=>{emitter.destroy();director.prune();});
      return emitter;
    };
    return stills;
  }
  play(id,stage,ctx={}) {
    // Shared presentation hook also covers direct stage calls and the existing
    // Ixchel compatibility bridge. Sound lifetime is independent of sprite caps.
    this.scene.skillAudio?.onFx?.(id,stage,ctx);
    const recipe=FxDirector.recipes.get(id),draw=recipe?.[stage];
    if(!recipe)return this.playPlaceholder(id,stage,ctx);
    if(!draw)return null;
    const stills=this.makeStills(id,recipe);
    // Registered recipes own their JSON duration unless a handler explicitly overrides it.
    return draw(this.scene,{x:0,y:0,angle:0,scale:1,...ctx},stills);
  }
  destroy() { this.live.forEach(effect=>effect.object?.destroy());this.live=[];this.liveUnits=0; }
}

function textureKey(id,still) { return `fx-still-${id}-${still}`; }
