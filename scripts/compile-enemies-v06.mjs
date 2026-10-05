import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// The supplied design uses prose for attack parameters. Extract, do not balance
// or copy a second set of numbers into handlers. Fail loudly if the prose changes.
export function compileEnemies(design) {
  const n=(text,pattern,index=1)=>{const match=text.match(pattern);if(!match)throw Error(`Enemy parameter not found: ${pattern} in ${text}`);return Number(match[index]);};
  const builders={
    'Lunge': a=>({range:n(a.trigger,/within ([\d.]+)/),windup:n(a.telegraph,/line ([\d.]+)/),length:n(a.effect,/dash ([\d.]+)/),speed:n(a.effect,/speed ([\d.]+)/),damage:n(a.effect,/([\d.]+) dmg/),recovery:n(a.effect,/([\d.]+) s recovery/),vulnerability:n(a.effect,/\+([\d.]+)%/)/100}),
    'Swoop Dive': a=>({circleMin:n(a.trigger,/circling ([\d.]+)-/),circleMax:n(a.trigger,/-([\d.]+) s/),orbitRadius:n(a.trigger,/radius ([\d.]+)/),windup:n(a.telegraph,/ground ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/),retreat:n(a.effect,/for ([\d.]+) s/)}),
    'Pounce': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),windup:n(a.telegraph,/point ([\d.]+) s/),radius:n(a.telegraph,/r ([\d.]+)/),leap:n(a.effect,/leap ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/)}),
    'Pack Roar': a=>({threshold:n(a.trigger,/([\d.]+)% HP/)/100,radius:n(a.telegraph,/r ([\d.]+)/),windup:n(a.telegraph,/it, ([\d.]+) s/),speedMult:1+n(a.effect,/\+([\d.]+)%/)/100,duration:n(a.effect,/for ([\d.]+) s/)}),
    'Tail Whip': a=>({range:n(a.trigger,/within ([\d.]+)/),arc:n(a.telegraph,/cone ([\d.]+) degrees/)*Math.PI/180,radius:n(a.telegraph,/r ([\d.]+)/),windup:n(a.telegraph,/, ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/),knockback:n(a.effect,/knockback ([\d.]+)/)}),
    'Burrow': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),underground:n(a.telegraph,/after ([\d.]+) s/),speed:n(a.telegraph,/speed ([\d.]+)/),radius:n(a.telegraph,/\br ([\d.]+)/),windup:n(a.telegraph,/player ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/),knockup:n(a.effect,/knock-up ([\d.]+) s/)}),
    'Soul Volley': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),windup:n(a.telegraph,/hands ([\d.]+) s/),count:n(a.effect,/([\d.]+) bolts/),spread:n(a.effect,/spread ([\d.]+) rad/),speed:n(a.effect,/speed ([\d.]+)/),damage:n(a.effect,/([\d.]+) dmg/)}),
    'Ward': a=>({range:n(a.trigger,/within ([\d.]+)/),windup:n(a.telegraph,/ally ([\d.]+) s/),shield:n(a.effect,/([\d.]+) HP/),duration:n(a.effect,/for ([\d.]+) s/)}),
    'Root Snare': a=>({range:n(a.trigger,/within ([\d.]+)/),radius:n(a.telegraph,/r ([\d.]+)/),windup:n(a.telegraph,/position ([\d.]+) s/),root:n(a.effect,/player ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/)}),
    'Ground Slam': a=>({range:n(a.trigger,/within ([\d.]+)/),radius:n(a.telegraph,/r ([\d.]+)/),windup:n(a.telegraph,/, ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/),knockback:n(a.effect,/knockback ([\d.]+)/)}),
    'Stone Guard': a=>({arc:n(a.telegraph,/\(([\d.]+) degrees/)*Math.PI/180,reduction:n(a.effect,/([\d.]+)% less/)/100}),
    'Venom Spit': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),windup:n(a.telegraph,/mouth ([\d.]+) s/),speed:n(a.effect,/speed ([\d.]+)/),damage:n(a.effect,/([\d.]+) dmg/),poisonDps:n(a.effect,/([\d.]+) poison dps/),duration:n(a.effect,/for ([\d.]+) s/)}),
    'Blink Strike': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),windup:n(a.telegraph,/player ([\d.]+) s/),delay:n(a.effect,/slashes ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/),bleedDps:n(a.effect,/bleed ([\d.]+) dps/),duration:n(a.effect,/for ([\d.]+) s/)}),
    'Aimed Shot': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),windup:n(a.telegraph,/line ([\d.]+) s/),speed:n(a.effect,/speed ([\d.]+)/),damage:n(a.effect,/([\d.]+) dmg/),threshold:n(a.effect,/below ([\d.]+)%/)/100,fan:n(a.effect,/fires ([\d.]+) arrows/)}),
    'Summon': a=>({interval:n(a.trigger,/every ([\d.]+) s/),cap:n(a.trigger,/than ([\d.]+) summons/),windup:n(a.telegraph,/ground ([\d.]+) s/),count:n(a.effect,/spawns ([\d.]+)/)}),
    'Blood Pulse': a=>({range:n(a.trigger,/within ([\d.]+)/),radius:n(a.telegraph,/r ([\d.]+)/),windup:n(a.telegraph,/, ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/)}),
    'Grasp': a=>({range:n(a.trigger,/within ([\d.]+)/),windup:n(a.telegraph,/marker ([\d.]+) s/),pull:n(a.effect,/player ([\d.]+) px/),damage:n(a.effect,/([\d.]+) dmg/)}),
    'Puddle Trail': a=>({radius:n(a.effect,/r ([\d.]+)/),duration:n(a.effect,/for ([\d.]+) s/),slowPct:n(a.effect,/by ([\d.]+)%/)/100}),
    'Dash Zap': a=>({min:n(a.trigger,/player ([\d.]+)-/),max:n(a.trigger,/-([\d.]+) px/),windup:n(a.telegraph,/line ([\d.]+) s/),length:n(a.effect,/dash ([\d.]+) px/),speed:n(a.effect,/speed ([\d.]+)/),damage:n(a.effect,/([\d.]+) dmg/),waterRange:n(a.effect,/within ([\d.]+) px of water/),chain:n(a.effect,/for ([\d.]+) extra dmg/)}),
    'Prism Shield': a=>({interval:n(a.trigger,/every ([\d.]+) s/),duration:n(a.trigger,/for ([\d.]+) s/),windup:n(a.telegraph,/glow ([\d.]+) s/),reflectPct:n(a.effect,/([\d.]+)% damage/)/100}),
    'Shard Burst': a=>({range:n(a.trigger,/within ([\d.]+)/),count:n(a.telegraph,/([\d.]+) radial/),windup:n(a.telegraph,/lines ([\d.]+) s/),damage:n(a.effect,/([\d.]+) dmg/)}),
    'Detonate': a=>({range:n(a.trigger,/within ([\d.]+)/),windup:n(a.telegraph,/fuse ([\d.]+) s/),radius:n(a.effect,/r ([\d.]+)/),damage:n(a.effect,/([\d.]+) dmg/)}),
  };
  return Object.fromEntries(design.enemies.map(enemy=>[enemy.id,{...enemy,
    attacks:Object.fromEntries(enemy.attacks.map(attack=>{const parse=builders[attack.name];if(!parse)throw Error(`Unknown enemy attack ${attack.name}`);return [attack.name,{...attack,...parse(attack)}];})),
    ...(enemy.id==='vine_lurker'?{surfaceRange:n(enemy.notes,/within ([\d.]+) px/)}:{}),
    ...(enemy.id==='abyssal_eel'?{waterSpeed:n(enemy.notes,/Speed ([\d.]+)/)}:{}),
    ...(enemy.id==='priest'?{kiteMin:n(enemy.notes,/keeps ([\d.]+)-/),kiteMax:n(enemy.notes,/-([\d.]+) px/)}:{}),
    ...(enemy.id==='stone_guardian'||enemy.id==='crystal_golem'?{aliveLimit:n(enemy.notes,/most ([\d.]+) alive/)}:{}),
    tough:/tough enemy/.test(enemy.notes),flier:/flier/.test(enemy.role),
  }]));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const input=process.argv[2]||'docs/v0.6/v06_design.json',output=process.argv[3]||'src/data/enemies-v06.json';
  writeFileSync(output,JSON.stringify(compileEnemies(JSON.parse(readFileSync(input,'utf8'))),null,2)+'\n');
  console.log(`Generated ${output} from ${input}`);
}
