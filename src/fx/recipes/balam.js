import { FxDirector } from '../FxDirector.js';
import { BALAM_DEFINITIONS, SHARED_DEFINITIONS } from '../../skills/generated/balam.js';

const definitions = new Map([...BALAM_DEFINITIONS, ...SHARED_DEFINITIONS].map(skill => [skill.id, skill]));
const params = id => definitions.get(id)?.params || {};
const playerPoint = scene => ({ x: scene.player.x, y: scene.player.y });
const pointOf = (scene, ctx) => ({ x: ctx.target?.x ?? ctx.x ?? scene.player.x, y: ctx.target?.y ?? ctx.y ?? scene.player.y });
const span = (ctx, fallback) => Math.max(16, ctx.diameter ?? (ctx.radius != null ? ctx.radius * 2 : (ctx.range ? ctx.range * 2 : fallback)));
const add = (scene, stills, name, point, size, angle = 0, options = {}) =>
  stills.image(name, point.x, point.y, { size, angle, ...options });
const fade = (scene, sprite, seconds, changes = {}) => {
  if (!sprite) return sprite;
  scene.tweens.add({ targets: sprite, alpha: 0, scale: changes.scale ?? 1.35, duration: Math.max(.06, seconds) * 1000,
    ease: changes.ease ?? 'Cubic.Out', onComplete: () => sprite.destroy() });
  return sprite;
};
const pulse = (scene, sprite, seconds, changes = {}) => {
  if (!sprite) return sprite;
  scene.tweens.add({ targets: sprite, alpha: changes.alpha ?? .48, scale: changes.scale ?? 1.12,
    duration: Math.max(.12, seconds) * 500, delay: changes.delay ?? 0, yoyo: true, repeat: changes.repeat ?? -1,
    onComplete: () => sprite.destroy() });
  if (changes.life) scene.time.delayedCall(changes.life * 1000, () => {
    scene.tweens.killTweensOf?.(sprite);sprite.destroy();
  });
  return sprite;
};
const recipe = (id, shape, motion, blendMode, palette, stages) => ({
  stills: id === 'bloodlust' || id === 'stonehide' || id === 'predators-rhythm' || id === 'feast-of-the-fallen' ||
    id === 'obsidian-thorns' || id === 'jaguars-pride' || id === 'earthshaker' || id === 'wounded-fury' ||
    id === 'survivors-will' || id === 'jade-bounty' ? ['proc'] : ['main', 'accent'],
  signature: { shape, motion, blendMode, palette },
  ...stages,
});

export const BALAM_FX_RECIPES = {
  'jaguar-roar': recipe('jaguar-roar', 'triple-concentric-roar-rings', '0.48s expanding amber rings with elevated jaguar flare', 'ADD', ['#f2b34c', '#7a3b12'], {
    cast(scene, ctx, stills) {
      const p = params('jaguar-roar'), at = pointOf(scene, ctx), diameter = span(ctx, p.range * 2);
      const ring = add(scene, stills, 'main', at, diameter, 0, { alpha: .9 });
      ring.setScale(.36);fade(scene, ring, .48, { scale: 1.08 });
      const head = add(scene, stills, 'accent', { x: at.x, y: at.y - Math.min(52, diameter * .18) }, Math.min(96, diameter * .5), 0, { alpha: .95 });
      head.setScale(.5);fade(scene, head, .26, { scale: 1.15 });
      if (scene.settings?.screenShake) scene.cameras?.main?.shake?.(150, 4 / 1280);
      return [ring, head];
    },
  }),
  'obsidian-arc': recipe('obsidian-arc', 'forward-sweeping-glass-crescent', '0.22s 150-degree crescent sweep then eight shard burst', 'ADD', ['#9b7bff', '#15121c'], {
    cast(scene, ctx, stills) {
      const p = params('obsidian-arc'), at = playerPoint(scene), reach = ctx.range || p.range, arc = p.arcDegrees * Math.PI / 180;
      const slash = add(scene, stills, 'main', { x: at.x + Math.cos(ctx.angle || 0) * reach * .42, y: at.y + Math.sin(ctx.angle || 0) * reach * .42 }, reach * 1.55, (ctx.angle || 0) - arc / 2);
      scene.tweens.add({ targets: slash, rotation: (ctx.angle || 0) + arc / 2, alpha: 0, duration: 220, onComplete: () => slash.destroy() });
      return slash;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx);return stills.burst('accent', at.x, at.y, { count: 8, lifespan: 240, size: 24, speed: 150 });
    },
  }),
  'prowlers-leap': recipe('prowlers-leap', 'shrinking-earth-shadow-then-cracked-dust-ring', '0.35s shadow shrink followed by 0.6s landing crack', 'NORMAL', ['#c58a3d', '#6b4a2b'], {
    cast(scene, ctx, stills) {
      const p = params('prowlers-leap'), at = playerPoint(scene), shadow = add(scene, stills, 'main', at, p.radius * 1.5, 0, { alpha: .7 });
      shadow.setScale(1.1);scene.tweens.add({ targets: shadow, scale: .18, alpha: .08, duration: (p.duration || .35) * 1000, onComplete: () => shadow.destroy() });
      scene.tweens.add({ targets:scene.player,scaleX:scene.player.scaleX*1.25,scaleY:scene.player.scaleY*1.25,duration:(p.duration||.35)*500,yoyo:true });return shadow;
    },
    impact(scene, ctx, stills) {
      const p = params('prowlers-leap'), at = pointOf(scene, ctx), diameter = (ctx.radius || p.radius) * 2;
      const dust = add(scene, stills, 'main', at, diameter, 0, { alpha: .88 });dust.setScale(.35);fade(scene, dust, .28, { scale: 1.05 });
      const burst = stills.burst('accent', at.x, at.y, { count: 4, lifespan: 300, size: 36, speed: 130 });return [dust, burst];
    },
    ground(scene, ctx, stills) {
      const p = params('prowlers-leap'), at = pointOf(scene, ctx), crack = add(scene, stills, 'accent', at, (ctx.radius || p.radius) * 1.65, 0, { alpha: .74, depth: 8 });
      fade(scene, crack, ctx.duration || .6, { scale: 1.04, ease: 'Linear' });return crack;
    },
  }),
  'claw-cyclone': recipe('claw-cyclone', 'three-claw-cyclone-ground-ring', '1.5s rotating cyclone with 0.25s white tick flashes', 'ADD', ['#f4c542', '#fff2b0'], {
    cast(scene, ctx, stills) {
      const p = params('claw-cyclone'), at = playerPoint(scene), diameter = (ctx.range || p.range) * 2;
      const cyclone = add(scene, stills, 'main', at, diameter, 0, { alpha: .76 });
      scene.tweens.add({ targets: cyclone, rotation: Math.PI * 2, alpha: .18, duration: (p.duration || 1.5) * 1000, onComplete: () => cyclone.destroy() });
      return cyclone;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), flash = add(scene, stills, 'accent', at, 76 * (ctx.scale || 1), 0, { alpha: 1 });
      flash.setScale(.3);fade(scene, flash, .12, { scale: 1.1, ease: 'Sine.Out' });return flash;
    },
  }),
  'ceiba-breaker': recipe('ceiba-breaker', 'descending-translucent-ceiba-log-and-leaf-crater', '0.28s log slam, six-pixel shake, JSON decal fade', 'NORMAL', ['#6b8e3a', '#3b2a1a'], {
    cast(scene, ctx, stills) {
      const p = params('ceiba-breaker'), at = pointOf(scene, ctx), height = Math.max(120, (ctx.range || p.range) * 1.2);
      const log = add(scene, stills, 'main', { x: at.x, y: at.y - height * .42 }, height, 0, { alpha: .72 });
      scene.tweens.add({ targets: log, y: at.y, alpha: 0, duration: 280, onComplete: () => log.destroy() });return log;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), crater = add(scene, stills, 'accent', at, 130, 0, { alpha: .92 });crater.setScale(.45);fade(scene, crater, .42, { scale: 1.25 });
      const leaves = stills.burst('accent', at.x, at.y, { count: 7, lifespan: 380, size: 22, speed: 175 });
      if (scene.settings?.screenShake) scene.cameras?.main?.shake?.(180, 6 / 1280);return [crater, leaves];
    },
    ground(scene, ctx, stills) {
      const p = params('ceiba-breaker'), at = pointOf(scene, ctx), decal = add(scene, stills, 'accent', at, 118, 0, { alpha: .42, depth: 8 });
      fade(scene, decal, ctx.duration || p.decalSeconds, { scale: 1.08, ease: 'Linear' });return decal;
    },
  }),
  'bloodless-hunt': recipe('bloodless-hunt', 'cyan-spectral-fang-comet-with-wisps', 'homing travel trail then three-bite impact flash', 'ADD', ['#5fe3f2', '#dff9ff'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), mote = add(scene, stills, 'accent', at, 58, ctx.angle || 0, { alpha: .78 });fade(scene, mote, .16, { scale: 1.3 });return mote;
    },
    travel(scene, ctx, stills) {
      const p = params('bloodless-hunt'), at = pointOf(scene, ctx), fang = add(scene, stills, 'main', at, 72, ctx.angle || 0, { alpha: .98 });
      const trail = add(scene, stills, 'accent', { x: at.x - Math.cos(ctx.angle || 0) * 20, y: at.y - Math.sin(ctx.angle || 0) * 20 }, 82, ctx.angle || 0, { alpha: .6 });
      fade(scene, fang, .32, { scale: 1.18 });fade(scene, trail, Math.min(.5, p.range / p.speed), { scale: .8 });return [fang, trail];
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), bite = add(scene, stills, 'accent', at, 94, ctx.angle || 0, { alpha: 1 });fade(scene, bite, .22, { scale: 1.22 });return bite;
    },
  }),
  'stone-maw': recipe('stone-maw', 'rising-stone-jaw-with-trigger-and-detonation-runes', '0.4s jaw rise, 2.5s armed-ring pulse, six-second trap lifetime', 'ADD', ['#8a8fa0', '#c9b37a'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), glyph = add(scene, stills, 'accent', at, 54, 0, { alpha: .72 });fade(scene, glyph, .32, { scale: 1.2 });return glyph;
    },
    ground(scene, ctx, stills) {
      const p = params('stone-maw'), at = pointOf(scene, ctx), jaw = add(scene, stills, 'main', at, p.triggerRadius * 2, 0, { alpha: .94, depth: 9 });
      jaw.setScale(.45);scene.tweens.add({ targets: jaw, scale: 1, alpha: .82, duration: p.armSeconds * 1000 });
      const rune = add(scene, stills, 'accent', at, p.radius * 2, 0, { alpha: .52, depth: 8 });pulse(scene, rune, Math.max(.2, p.armedSeconds / 3), { alpha: .2, scale: 1.08, delay:p.armSeconds*1000 });
      fade(scene, jaw, ctx.duration || p.duration, { scale: 1.03, ease: 'Linear' });fade(scene, rune, ctx.duration || p.duration, { scale: 1.04, ease: 'Linear' });return [jaw, rune];
    },
    impact(scene, ctx, stills) {
      const p = params('stone-maw'), at = pointOf(scene, ctx), snap = stills.burst('accent', at.x, at.y, { count: 8, lifespan: 360, size: 24, speed: 145 });
      const jaw = add(scene, stills, 'main', at, p.radius * 1.25, 0, { alpha: .88 });fade(scene, jaw, .24, { scale: .25 });return [jaw, snap];
    },
  }),
  'war-drum': recipe('war-drum', 'floating-carved-drum-and-small-small-large-beat-waves', 'six-second aura with one-second triplet accent and third heavy beat', 'ADD', ['#b5452b', '#f0c27a'], {
    cast(scene, ctx, stills) {
      const p = params('war-drum'), at = playerPoint(scene), drum = add(scene, stills, 'main', { x: at.x, y: at.y - 54 }, 84, 0, { alpha: .92 });
      pulse(scene, drum, p.interval / 2, { scale: 1.08, alpha: .62, life: p.duration });return drum;
    },
    aura(scene, ctx, stills) {
      const p = params('war-drum'), at = playerPoint(scene), halo = add(scene, stills, 'accent', at, (ctx.range || p.range) * 2, 0, { alpha: .22, depth: 8 });
      fade(scene, halo, ctx.duration || p.duration, { scale: 1.02, ease: 'Linear' });return halo;
    },
    impact(scene, ctx, stills) {
      const p = params('war-drum'), at = pointOf(scene, ctx), heavy = (ctx.scale || 1) > 1.2, wave = add(scene, stills, 'accent', at, (ctx.range || p.range) * 2 * (heavy ? 1.25 : 1), 0, { alpha: .74, depth: 9 });
      wave.setScale(.6);fade(scene, wave, heavy ? .48 : .28, { scale: 1.05 });return wave;
    },
  }),
  'sun-claw': recipe('sun-claw', 'four-outward-solar-crescents', '0.3s four-direction radial sweep and 0.2s central flare', 'ADD', ['#ffd45a', '#ff8a1f'], {
    cast(scene, ctx, stills) {
      const p = params('sun-claw'), at = playerPoint(scene), slashes = add(scene, stills, 'main', at, (ctx.range || 220) * 2, 0, { alpha: .94 });
      scene.tweens.add({ targets: slashes, rotation: Math.PI / 2, scale: 1.14, alpha: 0, duration: (p.duration || .3) * 1000, onComplete: () => slashes.destroy() });return slashes;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), flare = add(scene, stills, 'accent', at, 66, 0, { alpha: 1 });flare.setScale(.28);fade(scene, flare, .2, { scale: 1.28, ease: 'Sine.Out' });return flare;
    },
  }),
  'jaguar-echo': recipe('jaguar-echo', 'cyan-pawprint-echo-and-blue-mist-trail', 'ten-second following spirit with 0.7s pounce flashes', 'ADD', ['#5fe3f2', '#2b6f8f'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), mist = add(scene, stills, 'accent', at, 76, 0, { alpha: .8 });fade(scene, mist, .32, { scale: 1.5 });return mist;
    },
    travel(scene, ctx, stills) {
      const p = params('jaguar-echo'), at = pointOf(scene, ctx), paw = add(scene, stills, 'main', at, 78, ctx.angle || 0, { alpha: .78 });
      fade(scene, paw, Math.min(.7, p.interval || .7), { scale: 1.2 });return paw;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), paw = add(scene, stills, 'accent', at, 64, 0, { alpha: .9 });fade(scene, paw, .22, { scale: 1.35 });return paw;
    },
  }),
  'fang-path': recipe('fang-path', 'jade-tooth-spikes-along-glow-line', 'eight staggered three-tick eruptions at JSON path segment spacing', 'ADD', ['#4fd6a0', '#d8fff0'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), line = add(scene, stills, 'main', at, Math.max(90, ctx.range || 300), ctx.angle || 0, { alpha: .48, height: 26 });
      fade(scene, line, ctx.duration || .65, { scale: 1.04, ease: 'Linear' });return line;
    },
    ground(scene, ctx, stills) {
      const p = params('fang-path'), at = pointOf(scene, ctx), segment = ctx.range || ((ctx.pathRange || 0) / Math.max(1, p.fangs)) || 42;
      const tooth = add(scene, stills, 'accent', at, Math.max(44, segment), ctx.angle || 0, { alpha: .94 });tooth.setScale(.3);
      scene.tweens.add({ targets: tooth, scale: 1, alpha: 0, duration: Math.max(.2, (ctx.duration || .4) * 1000), onComplete: () => tooth.destroy() });
      stills.burst('accent', at.x, at.y, { count: 3, lifespan: 260, size: 18, speed: 72 });return tooth;
    },
  }),
  'hunters-mark': recipe('hunters-mark', 'three-red-claw-scratch-target-glyph', 'six-second marked-target pulse with red death-spark release', 'SCREEN', ['#d9413a', '#ffb3a0'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), stamp = add(scene, stills, 'accent', at, 48, 0, { alpha: .74 });fade(scene, stamp, .24, { scale: 1.24 });return stamp;
    },
    aura(scene, ctx, stills) {
      const at = pointOf(scene, ctx), mark = add(scene, stills, 'main', { x: at.x, y: at.y - 18 }, 74, 0, { alpha: .92 });
      pulse(scene, mark, Math.min(1.2, ctx.duration || 6), { alpha: .45, scale: 1.1 });return mark;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), destination = playerPoint(scene), spark = add(scene, stills, 'accent', at, 38, 0, { alpha: .96 });
      scene.tweens.add({ targets: spark, x: destination.x, y: destination.y, scale: .24, alpha: 0, duration: 360, ease: 'Cubic.Out', onComplete: () => spark.destroy() });return spark;
    },
  }),
  'nine-lives': recipe('nine-lives', 'nine-golden-spiral-jaguars-with-green-heal-crosses', '0.6s upward spiral and brief golden healing aura', 'ADD', ['#ffd45a', '#9ef0a8'], {
    cast(scene, ctx, stills) {
      const p = params('nine-lives'), at = playerPoint(scene), diameter = Math.min(180, (ctx.range || 90) * 2);
      const spirits = add(scene, stills, 'main', at, diameter, 0, { alpha: .92 });spirits.setScale(.65);
      scene.tweens.add({ targets: spirits, y: at.y - 56, rotation: Math.PI * 2, scale: 1.2, alpha: 0, duration: .6 * 1000, onComplete: () => spirits.destroy() });
      const crosses = add(scene, stills, 'accent', at, Math.min(118, diameter), 0, { alpha: .8 });fade(scene, crosses, .6, { scale: 1.35 });
      return [spirits, crosses];
    },
    aura(scene, ctx, stills) {
      const at = playerPoint(scene), aura = add(scene, stills, 'accent', at, 140, 0, { alpha: .32, depth: 8 });fade(scene, aura, ctx.duration || params('nine-lives').duration, { scale: 1.08 });return aura;
    },
  }),
  'black-mirror': recipe('black-mirror', 'obsidian-disc-with-120-degree-violet-barrier', 'four-second arc shimmer; reflected shot snaps back in one violet streak', 'SCREEN', ['#2a2540', '#b58cff'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), disc = add(scene, stills, 'main', at, 128, 0, { alpha: .92 });disc.setScale(.55);fade(scene, disc, .36, { scale: 1.08 });return disc;
    },
    aura(scene, ctx, stills) {
      const p = params('black-mirror'), at = playerPoint(scene), barrier = add(scene, stills, 'main', at, 220, ctx.angle || 0, { alpha: .68, depth: 21 });
      pulse(scene, barrier, (ctx.duration || p.duration) / 2, { alpha: .32, scale: 1.08, life: ctx.duration || p.duration });return barrier;
    },
    impact(scene, ctx, stills) {
      const at = pointOf(scene, ctx), flash = add(scene, stills, 'accent', at, 82, ctx.angle || Math.PI, { alpha: 1 });
      scene.tweens.add({ targets: flash, rotation: (ctx.angle || Math.PI) + Math.PI, x: at.x + Math.cos(ctx.angle || Math.PI) * 34, y: at.y + Math.sin(ctx.angle || Math.PI) * 34, alpha: 0, duration: 150, onComplete: () => flash.destroy() });return flash;
    },
  }),
  'pyramid-rush': recipe('pyramid-rush', 'five-stone-step-afterimages-and-long-dust-streak', '0.5s directional 300-unit trail followed by stomp', 'NORMAL', ['#b08a5a', '#6a4b2b'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), step = add(scene, stills, 'main', at, 102, ctx.angle || 0, { alpha: .86 });fade(scene, step, .18, { scale: .74 });return step;
    },
    travel(scene, ctx, stills) {
      const p = params('pyramid-rush'), at = pointOf(scene, ctx), trail = add(scene, stills, 'accent', at, ctx.range || p.range, ctx.angle || 0, { alpha: .56, height: 68, depth: 8 });
      fade(scene, trail, ctx.duration || p.duration, { scale: 1.03, ease: 'Linear' });return trail;
    },
    impact(scene, ctx, stills) {
      const p = params('pyramid-rush'), at = pointOf(scene, ctx), slam = add(scene, stills, 'main', at, (ctx.radius || p.radius) * 2, 0, { alpha: .82, depth: 9 });
      slam.setScale(.45);fade(scene, slam, .32, { scale: 1.12 });return slam;
    },
  }),
  'heart-of-balam': recipe('heart-of-balam', 'golden-jaguar-heart-ward-dome-and-breakwave', 'eight-second ward aura; radius-200 shockwave and crack on break', 'ADD', ['#ffcf4a', '#c4412b'], {
    cast(scene, ctx, stills) {
      const at = playerPoint(scene), heart = add(scene, stills, 'main', { x: at.x, y: at.y - 20 }, 88, 0, { alpha: 1 });
      pulse(scene, heart, .7, { scale: 1.06, alpha: .7 });return heart;
    },
    aura(scene, ctx, stills) {
      const p = params('heart-of-balam'), at = playerPoint(scene), dome = add(scene, stills, 'accent', at, (ctx.radius || ctx.range || 200) * 2, 0, { alpha: .24, depth: 8 });
      fade(scene, dome, ctx.duration || p.duration, { scale: 1.03, ease: 'Linear' });return dome;
    },
    impact(scene, ctx, stills) {
      const p = params('heart-of-balam'), at = pointOf(scene, ctx), wave = add(scene, stills, 'accent', at, (ctx.range || p.range || 200) * 2, 0, { alpha: .92, depth: 9 });
      wave.setScale(.3);fade(scene, wave, .42, { scale: 1.1 });
      const shards = stills.burst('main', at.x, at.y, { count: 8, lifespan: 360, size: 22, speed: 155 });return [wave, shards];
    },
  }),
  'bloodlust': recipe('bloodlust', 'stacking-red-claw-marks', 'short stack-trigger flash that swells with current stack count', 'ADD', ['#d9413a', '#7a1118'], {
    proc(scene, ctx, stills) {
      const at = pointOf(scene, ctx), count = Math.max(1, ctx.stacks || 1), mark = add(scene, stills, 'proc', at, 68 + count * 7, 0, { alpha: .9 });
      fade(scene, mark, .42, { scale: 1.16 });return mark;
    },
  }),
  'stonehide': recipe('stonehide', 'faceted-grey-stone-plate-overlay', 'low-health armor tier arrives as a slow heavy stone fade', 'SCREEN', ['#8a8fa0', '#c8d0dc'], {
    proc(scene, ctx, stills) {
      const at = pointOf(scene, ctx), plate = add(scene, stills, 'proc', at, 92, 0, { alpha: .68 });
      scene.tweens.add({ targets: plate, alpha: 0, scale: 1.12, duration: 650, onComplete: () => plate.destroy() });return plate;
    },
  }),
  'predators-rhythm': recipe('predators-rhythm', 'golden-pulse-ring-with-paw-flash', '0.3s button-pulse mote and ground-paw bloom', 'ADD', ['#f4c542', '#fff2b0'], {
    proc(scene, ctx, stills) {
      const at = pointOf(scene, ctx), paw = add(scene, stills, 'proc', at, 54, 0, { alpha: 1 });paw.setScale(.42);fade(scene, paw, .3, { scale: 1.35, ease: 'Sine.Out' });return paw;
    },
  }),
  'feast-of-the-fallen': recipe('feast-of-the-fallen', 'green-gold-wisps-streaming-from-victim-to-hero', '0.42s converging wisps and heal sparkle', 'ADD', ['#4fd6a0', '#ffcf4a'], {
    proc(scene, ctx, stills) {
      const from = pointOf(scene, ctx), to = playerPoint(scene), wisp = add(scene, stills, 'proc', from, 58, 0, { alpha: .92 });
      scene.tweens.add({ targets: wisp, x: to.x, y: to.y, scale: .24, alpha: 0, duration: 420, ease: 'Cubic.In', onComplete: () => wisp.destroy() });return wisp;
    },
  }),
  'obsidian-thorns': recipe('obsidian-thorns', 'dark-shard-fan-at-melee-attacker', '0.2s attacker-centered black-glass burst', 'ADD', ['#15121c', '#9b7bff'], {
    proc(scene, ctx, stills) {
      const at = pointOf(scene, ctx);return stills.burst('proc', at.x, at.y, { count: 7, lifespan: 220, size: 24, speed: 165 });
    },
  }),
  'jaguars-pride': recipe('jaguars-pride', 'thin-gold-150-radius-ground-ring', '1.1s low-alpha sweep marks exact JSON radius', 'ADD', ['#ffcf4a', '#b08a5a'], {
    aura(scene, ctx, stills) {
      const p = params('jaguars-pride'), at = playerPoint(scene), ring = add(scene, stills, 'proc', at, p.range * 2, 0, { alpha: .28, depth: 8 });
      fade(scene, ring, ctx.duration || 1.1, { scale: 1.02, ease: 'Linear' });return ring;
    },
  }),
  'earthshaker': recipe('earthshaker', 'brown-shockwave-with-five-pebbles', '0.38s ground ring kick and five outward pebble particles', 'NORMAL', ['#c58a3d', '#6b4a2b'], {
    proc(scene, ctx, stills) {
      const p = params('earthshaker'), at = pointOf(scene, ctx), ring = add(scene, stills, 'proc', at, p.range * 2, 0, { alpha: .85, depth: 9 });
      ring.setScale(.42);fade(scene, ring, .38, { scale: 1.1 });
      const pebbles = stills.burst('proc', at.x, at.y, { count: 5, lifespan: 300, size: 16, speed: 115 });return [ring, pebbles];
    },
  }),
  'wounded-fury': recipe('wounded-fury', 'red-flame-outline-around-hero', '0.5s entering-state flare with flame-outline fade', 'ADD', ['#d9413a', '#ff8a1f'], {
    proc(scene, ctx, stills) {
      const at = pointOf(scene, ctx), flame = add(scene, stills, 'proc', at, 98, 0, { alpha: .92 });
      flame.setScale(.78);fade(scene, flame, .5, { scale: 1.04 });return flame;
    },
    aura(scene, ctx, stills) {
      const at = playerPoint(scene), flame = add(scene, stills, 'proc', at, 102, 0, { alpha: .48 });
      pulse(scene, flame, (ctx.duration || .65) / 2, { alpha: .22, scale: 1.06, life: ctx.duration || .65 });return flame;
    },
  }),
  'survivors-will': recipe('survivors-will', 'pale-speed-streaks-with-heart-spark', '0.28s directional streak after taking a hit', 'ADD', ['#ffcf4a', '#fff2b0'], {
    proc(scene, ctx, stills) {
      const at = playerPoint(scene), streak = add(scene, stills, 'proc', at, 104, ctx.angle || 0, { alpha: .9 });fade(scene, streak, .28, { scale: 1.3 });return streak;
    },
  }),
  'jade-bounty': recipe('jade-bounty', 'green-pickup-sparkle', '0.24s jade glint per experience pickup', 'ADD', ['#4fd6a0', '#d8fff0'], {
    proc(scene, ctx, stills) {
      const at = pointOf(scene, ctx), spark = add(scene, stills, 'proc', at, 46, 0, { alpha: .98 });spark.setScale(.5);fade(scene, spark, .24, { scale: 1.25 });return spark;
    },
  }),
};

for (const [id, value] of Object.entries(BALAM_FX_RECIPES)) FxDirector.register(id, value);

export function fxRecipeSignature(recipeValue) {
  const signature = recipeValue.signature || {};
  return JSON.stringify({
    stills: [...recipeValue.stills].sort(), shape: signature.shape,
    motion: signature.motion, blendMode: signature.blendMode, palette: signature.palette,
  });
}
