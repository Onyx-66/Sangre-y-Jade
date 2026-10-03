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
export const ACTIVE_HANDLERS = Object.assign(Object.create(null),{
 'jaguar-roar':jaguarRoar,'obsidian-arc':obsidianArc,'prowlers-leap':prowlersLeap,'claw-cyclone':clawCyclone,
 'ceiba-breaker':ceibaBreaker,'bloodless-hunt':bloodlessHunt,'stone-maw':stoneMaw,'war-drum':warDrum,
 'sun-claw':sunClaw,'jaguar-echo':jaguarEcho,'fang-path':fangPath,'hunters-mark':huntersMark,
 'nine-lives':nineLives,'black-mirror':blackMirror,'pyramid-rush':pyramidRush,'heart-of-balam':heartOfBalam,
});
export const INNATE_PASSIVES = [survivorsWill, jadeBounty];
export const PASSIVE_HANDLERS=Object.fromEntries([...INNATE_PASSIVES,bloodlust,stonehide,predatorsRhythm,feastOfTheFallen,obsidianThorns,jaguarsPride,earthshaker,woundedFury].map(passive=>[passive.id,passive]));
