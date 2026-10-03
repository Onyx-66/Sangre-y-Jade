import { survivorsWill } from './shared/survivors-will.js';
import { jadeBounty } from './shared/jade-bounty.js';

import { jaguarRoar } from './balam/jaguar-roar.js';
import { obsidianArc } from './balam/obsidian-arc.js';
import { prowlersLeap } from './balam/prowlers-leap.js';
import { clawCyclone } from './balam/claw-cyclone.js';
import { ceibaBreaker } from './balam/ceiba-breaker.js';
import { bloodlessHunt } from './balam/bloodless-hunt.js';
import { stoneMaw } from './balam/stone-maw.js';
import { warDrum } from './balam/war-drum.js';
import { sunClaw } from './balam/sun-claw.js';
import { jaguarEcho } from './balam/jaguar-echo.js';
import { fangPath } from './balam/fang-path.js';
import { huntersMark } from './balam/hunters-mark.js';
import { nineLives } from './balam/nine-lives.js';
import { blackMirror } from './balam/black-mirror.js';
import { pyramidRush } from './balam/pyramid-rush.js';
import { heartOfBalam } from './balam/heart-of-balam.js';
import { bloodlust } from './balam/passives/bloodlust.js';
import { stonehide } from './balam/passives/stonehide.js';
import { predatorsRhythm } from './balam/passives/predators-rhythm.js';
import { feastOfTheFallen } from './balam/passives/feast-of-the-fallen.js';
import { obsidianThorns } from './balam/passives/obsidian-thorns.js';
import { jaguarsPride } from './balam/passives/jaguars-pride.js';
import { earthshaker } from './balam/passives/earthshaker.js';
import { woundedFury } from './balam/passives/wounded-fury.js';
import { IXCHEL_COMPATIBILITY_HANDLERS } from './ixchel/compatibility.js';
import { atlatlVolley } from './kukul/atlatl-volley.js';
import { featherstorm } from './kukul/featherstorm.js';
import { serpentPath } from './kukul/serpent-path.js';
import { windstep } from './kukul/windstep.js';
import { quetzalFlip } from './kukul/quetzal-flip.js';
import { hunterSnare } from './kukul/hunter-snare.js';
import { eagleEye } from './kukul/eagle-eye.js';
import { sunDart } from './kukul/sun-dart.js';
import { stormNest } from './kukul/storm-nest.js';
import { plumeGuard } from './kukul/plume-guard.js';
import { cacaoBomb } from './kukul/cacao-bomb.js';
import { forkedFlight } from './kukul/forked-flight.js';
import { galeRing } from './kukul/gale-ring.js';
import { huntersTrance } from './kukul/hunters-trance.js';
import { skyfall } from './kukul/skyfall.js';
import { kukulkansBreath } from './kukul/kukulkans-breath.js';
import { sharpenedFlint } from './kukul/passives/sharpened-flint.js';
import { venomousDarts } from './kukul/passives/venomous-darts.js';
import { fullQuiver } from './kukul/passives/full-quiver.js';
import { huntersFocus } from './kukul/passives/hunters-focus.js';
import { fleetHunter } from './kukul/passives/fleet-hunter.js';
import { jungleInstinct } from './kukul/passives/jungle-instinct.js';
import { trophyHunter } from './kukul/passives/trophy-hunter.js';
import { steadyAim } from './kukul/passives/steady-aim.js';
export const ACTIVE_HANDLERS = Object.assign(Object.create(null),{
 ...IXCHEL_COMPATIBILITY_HANDLERS,
 'jaguar-roar':jaguarRoar,'obsidian-arc':obsidianArc,'prowlers-leap':prowlersLeap,'claw-cyclone':clawCyclone,
 'ceiba-breaker':ceibaBreaker,'bloodless-hunt':bloodlessHunt,'stone-maw':stoneMaw,'war-drum':warDrum,
 'sun-claw':sunClaw,'jaguar-echo':jaguarEcho,'fang-path':fangPath,'hunters-mark':huntersMark,
 'nine-lives':nineLives,'black-mirror':blackMirror,'pyramid-rush':pyramidRush,'heart-of-balam':heartOfBalam,
 'atlatl-volley':atlatlVolley,'featherstorm':featherstorm,'serpent-path':serpentPath,'windstep':windstep,
 'quetzal-flip':quetzalFlip,'hunter-snare':hunterSnare,'eagle-eye':eagleEye,'sun-dart':sunDart,
 'storm-nest':stormNest,'plume-guard':plumeGuard,'cacao-bomb':cacaoBomb,'forked-flight':forkedFlight,
 'gale-ring':galeRing,'hunters-trance':huntersTrance,'skyfall':skyfall,'kukulkans-breath':kukulkansBreath,
});
export const INNATE_PASSIVES = [survivorsWill, jadeBounty];
export const PASSIVE_HANDLERS=Object.fromEntries([...INNATE_PASSIVES,bloodlust,stonehide,predatorsRhythm,feastOfTheFallen,obsidianThorns,jaguarsPride,earthshaker,woundedFury,sharpenedFlint,venomousDarts,fullQuiver,huntersFocus,fleetHunter,jungleInstinct,trophyHunter,steadyAim].map(passive=>[passive.id,passive]));
