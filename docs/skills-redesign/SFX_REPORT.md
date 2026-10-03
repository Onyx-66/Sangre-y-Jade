# Step 18 — procedural SFX

Generated offline by `scripts/synth-sfx.mjs` from the per-ID JSON recipes. Mono PCM16, 44.1 kHz. Cast/impact peaks −3 dBFS; loops −12 dBFS and passive cues −15 dBFS (quieter mixes are noted in the JSON). RMS is not LUFS. No music or voice files were changed.

98 skills; 8 UI cues; 150 unique WAVs. All have ≥2 layers, unique parameter sets, no clipping, ≤20 ms leading silence and valid durations. Loops have ≤0.002 endpoint jump. Full measurements: [sfx-report.json](previews/step18/sfx-report.json).

| Skill | Files (seconds; peak dBFS) |
|---|---|
| ambush | [sfx-ambush-cast.wav](../../public/assets/audio/sfx/skills/sfx-ambush-cast.wav) (0.240s; -3.0) |
| ancestor-flame | [sfx-ancestor-flame-cast.wav](../../public/assets/audio/sfx/skills/sfx-ancestor-flame-cast.wav) (0.390s; -3.0)<br>[sfx-ancestor-flame-hit.wav](../../public/assets/audio/sfx/skills/sfx-ancestor-flame-hit.wav) (0.170s; -3.0) |
| ancestral-echo | [sfx-ancestral-echo-proc.wav](../../public/assets/audio/sfx/skills/sfx-ancestral-echo-proc.wav) (0.220s; -15.0) |
| atlatl-volley | [sfx-atlatl-volley-cast.wav](../../public/assets/audio/sfx/skills/sfx-atlatl-volley-cast.wav) (0.400s; -3.0) |
| black-mirror | [sfx-black-mirror-cast.wav](../../public/assets/audio/sfx/skills/sfx-black-mirror-cast.wav) (0.580s; -3.0)<br>[sfx-black-mirror-hit.wav](../../public/assets/audio/sfx/skills/sfx-black-mirror-hit.wav) (0.220s; -3.0) |
| bloodless-hunt | [sfx-bloodless-hunt-cast.wav](../../public/assets/audio/sfx/skills/sfx-bloodless-hunt-cast.wav) (0.600s; -3.0)<br>[sfx-bloodless-hunt-hit.wav](../../public/assets/audio/sfx/skills/sfx-bloodless-hunt-hit.wav) (0.180s; -3.0) |
| bloodlust | [sfx-bloodlust-proc.wav](../../public/assets/audio/sfx/skills/sfx-bloodlust-proc.wav) (0.140s; -15.0) |
| bodyguard | Intentionally silent — None (passive). |
| bounty-contract | [sfx-bounty-contract-proc.wav](../../public/assets/audio/sfx/skills/sfx-bounty-contract-proc.wav) (0.270s; -15.0) |
| bulwark-wall | [sfx-bulwark-wall-cast.wav](../../public/assets/audio/sfx/skills/sfx-bulwark-wall-cast.wav) (0.720s; -3.0)<br>[sfx-bulwark-wall-hit.wav](../../public/assets/audio/sfx/skills/sfx-bulwark-wall-hit.wav) (0.260s; -3.0) |
| cacao-bloom | [sfx-cacao-bloom-cast.wav](../../public/assets/audio/sfx/skills/sfx-cacao-bloom-cast.wav) (0.380s; -3.0)<br>[sfx-cacao-bloom-hit.wav](../../public/assets/audio/sfx/skills/sfx-cacao-bloom-hit.wav) (0.200s; -3.0) |
| cacao-bomb | [sfx-cacao-bomb-cast.wav](../../public/assets/audio/sfx/skills/sfx-cacao-bomb-cast.wav) (0.330s; -3.0)<br>[sfx-cacao-bomb-loop.wav](../../public/assets/audio/sfx/skills/sfx-cacao-bomb-loop.wav) (1.000s; -12.0)<br>[sfx-cacao-bomb-hit.wav](../../public/assets/audio/sfx/skills/sfx-cacao-bomb-hit.wav) (0.380s; -3.0) |
| ceiba-breaker | [sfx-ceiba-breaker-cast.wav](../../public/assets/audio/sfx/skills/sfx-ceiba-breaker-cast.wav) (0.550s; -3.0)<br>[sfx-ceiba-breaker-hit.wav](../../public/assets/audio/sfx/skills/sfx-ceiba-breaker-hit.wav) (0.370s; -3.0) |
| censer-wave | [sfx-censer-wave-cast.wav](../../public/assets/audio/sfx/skills/sfx-censer-wave-cast.wav) (0.620s; -3.0) |
| claw-cyclone | [sfx-claw-cyclone-cast.wav](../../public/assets/audio/sfx/skills/sfx-claw-cyclone-cast.wav) (0.250s; -3.0)<br>[sfx-claw-cyclone-loop.wav](../../public/assets/audio/sfx/skills/sfx-claw-cyclone-loop.wav) (1.500s; -12.0)<br>[sfx-claw-cyclone-hit.wav](../../public/assets/audio/sfx/skills/sfx-claw-cyclone-hit.wav) (0.120s; -3.0) |
| clay-bomb | [sfx-clay-bomb-cast.wav](../../public/assets/audio/sfx/skills/sfx-clay-bomb-cast.wav) (0.350s; -3.0)<br>[sfx-clay-bomb-loop.wav](../../public/assets/audio/sfx/skills/sfx-clay-bomb-loop.wav) (1.500s; -12.0)<br>[sfx-clay-bomb-hit.wav](../../public/assets/audio/sfx/skills/sfx-clay-bomb-hit.wav) (0.360s; -3.0) |
| cleansing-light | [sfx-cleansing-light-cast.wav](../../public/assets/audio/sfx/skills/sfx-cleansing-light-cast.wav) (0.880s; -3.0) |
| copal-star | [sfx-copal-star-cast.wav](../../public/assets/audio/sfx/skills/sfx-copal-star-cast.wav) (0.520s; -3.0) |
| copal-veil | [sfx-copal-veil-cast.wav](../../public/assets/audio/sfx/skills/sfx-copal-veil-cast.wav) (0.520s; -3.0)<br>[sfx-copal-veil-hit.wav](../../public/assets/audio/sfx/skills/sfx-copal-veil-hit.wav) (0.200s; -3.0) |
| crescent-blessing | [sfx-crescent-blessing-proc.wav](../../public/assets/audio/sfx/skills/sfx-crescent-blessing-proc.wav) (0.120s; -15.0) |
| dreamwalk | [sfx-dreamwalk-cast.wav](../../public/assets/audio/sfx/skills/sfx-dreamwalk-cast.wav) (0.750s; -3.0)<br>[sfx-dreamwalk-hit.wav](../../public/assets/audio/sfx/skills/sfx-dreamwalk-hit.wav) (0.180s; -3.0) |
| eagle-eye | [sfx-eagle-eye-cast.wav](../../public/assets/audio/sfx/skills/sfx-eagle-eye-cast.wav) (0.600s; -3.0)<br>[sfx-eagle-eye-hit.wav](../../public/assets/audio/sfx/skills/sfx-eagle-eye-hit.wav) (0.170s; -3.0) |
| earthshaker | [sfx-earthshaker-proc.wav](../../public/assets/audio/sfx/skills/sfx-earthshaker-proc.wav) (0.210s; -15.0) |
| execute | [sfx-execute-cast.wav](../../public/assets/audio/sfx/skills/sfx-execute-cast.wav) (0.300s; -3.0)<br>[sfx-execute-hit.wav](../../public/assets/audio/sfx/skills/sfx-execute-hit.wav) (0.200s; -3.0) |
| fang-path | [sfx-fang-path-cast.wav](../../public/assets/audio/sfx/skills/sfx-fang-path-cast.wav) (0.660s; -3.0)<br>[sfx-fang-path-hit.wav](../../public/assets/audio/sfx/skills/sfx-fang-path-hit.wav) (0.160s; -3.0) |
| feast-of-the-fallen | [sfx-feast-of-the-fallen-proc.wav](../../public/assets/audio/sfx/skills/sfx-feast-of-the-fallen-proc.wav) (0.280s; -15.0) |
| featherstorm | [sfx-featherstorm-cast.wav](../../public/assets/audio/sfx/skills/sfx-featherstorm-cast.wav) (0.340s; -3.0)<br>[sfx-featherstorm-loop.wav](../../public/assets/audio/sfx/skills/sfx-featherstorm-loop.wav) (2.000s; -12.0)<br>[sfx-featherstorm-hit.wav](../../public/assets/audio/sfx/skills/sfx-featherstorm-hit.wav) (0.120s; -3.0) |
| fleet-hunter | [sfx-fleet-hunter-proc.wav](../../public/assets/audio/sfx/skills/sfx-fleet-hunter-proc.wav) (0.190s; -15.0) |
| forked-flight | [sfx-forked-flight-cast.wav](../../public/assets/audio/sfx/skills/sfx-forked-flight-cast.wav) (0.480s; -3.0)<br>[sfx-forked-flight-hit.wav](../../public/assets/audio/sfx/skills/sfx-forked-flight-hit.wav) (0.120s; -3.0) |
| four-directions | [sfx-four-directions-cast.wav](../../public/assets/audio/sfx/skills/sfx-four-directions-cast.wav) (0.820s; -3.0) |
| full-quiver | [sfx-full-quiver-proc.wav](../../public/assets/audio/sfx/skills/sfx-full-quiver-proc.wav) (0.180s; -15.0) |
| gale-ring | [sfx-gale-ring-cast.wav](../../public/assets/audio/sfx/skills/sfx-gale-ring-cast.wav) (0.550s; -3.0) |
| glyph-comet | [sfx-glyph-comet-cast.wav](../../public/assets/audio/sfx/skills/sfx-glyph-comet-cast.wav) (0.750s; -3.0)<br>[sfx-glyph-comet-hit.wav](../../public/assets/audio/sfx/skills/sfx-glyph-comet-hit.wav) (0.350s; -3.0) |
| ground-slam | [sfx-ground-slam-cast.wav](../../public/assets/audio/sfx/skills/sfx-ground-slam-cast.wav) (0.450s; -3.0)<br>[sfx-ground-slam-hit.wav](../../public/assets/audio/sfx/skills/sfx-ground-slam-hit.wav) (0.300s; -3.0) |
| guardian-link | [sfx-guardian-link-proc.wav](../../public/assets/audio/sfx/skills/sfx-guardian-link-proc.wav) (0.180s; -15.0) |
| healing-circle | [sfx-healing-circle-cast.wav](../../public/assets/audio/sfx/skills/sfx-healing-circle-cast.wav) (0.800s; -3.0) |
| heart-of-balam | [sfx-heart-of-balam-cast.wav](../../public/assets/audio/sfx/skills/sfx-heart-of-balam-cast.wav) (0.620s; -3.0)<br>[sfx-heart-of-balam-loop.wav](../../public/assets/audio/sfx/skills/sfx-heart-of-balam-loop.wav) (2.000s; -12.0)<br>[sfx-heart-of-balam-hit.wav](../../public/assets/audio/sfx/skills/sfx-heart-of-balam-hit.wav) (0.400s; -3.0) |
| hunter-snare | [sfx-hunter-snare-cast.wav](../../public/assets/audio/sfx/skills/sfx-hunter-snare-cast.wav) (0.420s; -3.0)<br>[sfx-hunter-snare-hit.wav](../../public/assets/audio/sfx/skills/sfx-hunter-snare-hit.wav) (0.190s; -3.0) |
| hunters-focus | [sfx-hunters-focus-proc.wav](../../public/assets/audio/sfx/skills/sfx-hunters-focus-proc.wav) (0.110s; -15.0) |
| hunters-mark | [sfx-hunters-mark-cast.wav](../../public/assets/audio/sfx/skills/sfx-hunters-mark-cast.wav) (0.440s; -3.0) |
| hunters-trance | [sfx-hunters-trance-cast.wav](../../public/assets/audio/sfx/skills/sfx-hunters-trance-cast.wav) (0.800s; -3.0)<br>[sfx-hunters-trance-loop.wav](../../public/assets/audio/sfx/skills/sfx-hunters-trance-loop.wav) (2.000s; -12.0) |
| ixchels-mantle | [sfx-ixchels-mantle-cast.wav](../../public/assets/audio/sfx/skills/sfx-ixchels-mantle-cast.wav) (0.950s; -3.0) |
| jade-bounty | [sfx-jade-bounty-proc.wav](../../public/assets/audio/sfx/skills/sfx-jade-bounty-proc.wav) (0.180s; -15.0) |
| jade-halo | [sfx-jade-halo-cast.wav](../../public/assets/audio/sfx/skills/sfx-jade-halo-cast.wav) (0.420s; -3.0)<br>[sfx-jade-halo-hit.wav](../../public/assets/audio/sfx/skills/sfx-jade-halo-hit.wav) (0.140s; -3.0)<br>[sfx-jade-halo-loop.wav](../../public/assets/audio/sfx/skills/sfx-jade-halo-loop.wav) (2.000s; -12.0) |
| jade-needles | [sfx-jade-needles-cast.wav](../../public/assets/audio/sfx/skills/sfx-jade-needles-cast.wav) (0.450s; -3.0)<br>[sfx-jade-needles-hit.wav](../../public/assets/audio/sfx/skills/sfx-jade-needles-hit.wav) (0.140s; -3.0) |
| jade-resilience | [sfx-jade-resilience-proc.wav](../../public/assets/audio/sfx/skills/sfx-jade-resilience-proc.wav) (0.250s; -15.0) |
| jade-ward | [sfx-jade-ward-cast.wav](../../public/assets/audio/sfx/skills/sfx-jade-ward-cast.wav) (0.500s; -3.0) |
| jaguar-echo | [sfx-jaguar-echo-cast.wav](../../public/assets/audio/sfx/skills/sfx-jaguar-echo-cast.wav) (0.640s; -3.0)<br>[sfx-jaguar-echo-loop.wav](../../public/assets/audio/sfx/skills/sfx-jaguar-echo-loop.wav) (1.200s; -12.0)<br>[sfx-jaguar-echo-hit.wav](../../public/assets/audio/sfx/skills/sfx-jaguar-echo-hit.wav) (0.180s; -3.0) |
| jaguar-roar | [sfx-jaguar-roar-cast.wav](../../public/assets/audio/sfx/skills/sfx-jaguar-roar-cast.wav) (0.800s; -3.0) |
| jaguars-pride | Intentionally silent — None (passive). |
| jungle-instinct | [sfx-jungle-instinct-proc.wav](../../public/assets/audio/sfx/skills/sfx-jungle-instinct-proc.wav) (0.200s; -15.0) |
| kukulkans-breath | [sfx-kukulkans-breath-cast.wav](../../public/assets/audio/sfx/skills/sfx-kukulkans-breath-cast.wav) (0.800s; -3.0)<br>[sfx-kukulkans-breath-loop.wav](../../public/assets/audio/sfx/skills/sfx-kukulkans-breath-loop.wav) (3.000s; -12.0) |
| lifebond | [sfx-lifebond-cast.wav](../../public/assets/audio/sfx/skills/sfx-lifebond-cast.wav) (0.640s; -3.0)<br>[sfx-lifebond-loop.wav](../../public/assets/audio/sfx/skills/sfx-lifebond-loop.wav) (2.000s; -12.0) |
| lunar-boon | [sfx-lunar-boon-proc.wav](../../public/assets/audio/sfx/skills/sfx-lunar-boon-proc.wav) (0.340s; -15.0) |
| mana-overflow | Intentionally silent — None (passive). |
| mana-spring | [sfx-mana-spring-proc.wav](../../public/assets/audio/sfx/skills/sfx-mana-spring-proc.wav) (0.180s; -15.0) |
| moonwell | [sfx-moonwell-cast.wav](../../public/assets/audio/sfx/skills/sfx-moonwell-cast.wav) (0.600s; -3.0)<br>[sfx-moonwell-loop.wav](../../public/assets/audio/sfx/skills/sfx-moonwell-loop.wav) (3.000s; -12.0) |
| nine-lives | [sfx-nine-lives-cast.wav](../../public/assets/audio/sfx/skills/sfx-nine-lives-cast.wav) (0.920s; -3.0) |
| obsidian-arc | [sfx-obsidian-arc-cast.wav](../../public/assets/audio/sfx/skills/sfx-obsidian-arc-cast.wav) (0.360s; -3.0)<br>[sfx-obsidian-arc-hit.wav](../../public/assets/audio/sfx/skills/sfx-obsidian-arc-hit.wav) (0.190s; -3.0) |
| obsidian-thorns | [sfx-obsidian-thorns-proc.wav](../../public/assets/audio/sfx/skills/sfx-obsidian-thorns-proc.wav) (0.120s; -15.0) |
| plume-guard | [sfx-plume-guard-cast.wav](../../public/assets/audio/sfx/skills/sfx-plume-guard-cast.wav) (0.400s; -3.0)<br>[sfx-plume-guard-hit.wav](../../public/assets/audio/sfx/skills/sfx-plume-guard-hit.wav) (0.210s; -3.0) |
| predators-rhythm | [sfx-predators-rhythm-proc.wav](../../public/assets/audio/sfx/skills/sfx-predators-rhythm-proc.wav) (0.300s; -15.0) |
| prowlers-leap | [sfx-prowlers-leap-cast.wav](../../public/assets/audio/sfx/skills/sfx-prowlers-leap-cast.wav) (0.380s; -3.0)<br>[sfx-prowlers-leap-hit.wav](../../public/assets/audio/sfx/skills/sfx-prowlers-leap-hit.wav) (0.320s; -3.0) |
| pyramid-rush | [sfx-pyramid-rush-cast.wav](../../public/assets/audio/sfx/skills/sfx-pyramid-rush-cast.wav) (0.400s; -3.0)<br>[sfx-pyramid-rush-loop.wav](../../public/assets/audio/sfx/skills/sfx-pyramid-rush-loop.wav) (1.200s; -12.0) |
| quetzal-flip | [sfx-quetzal-flip-cast.wav](../../public/assets/audio/sfx/skills/sfx-quetzal-flip-cast.wav) (0.480s; -3.0) |
| radiant-beacon | [sfx-radiant-beacon-cast.wav](../../public/assets/audio/sfx/skills/sfx-radiant-beacon-cast.wav) (0.860s; -3.0) |
| raincaller | [sfx-raincaller-cast.wav](../../public/assets/audio/sfx/skills/sfx-raincaller-cast.wav) (0.700s; -3.0)<br>[sfx-raincaller-loop.wav](../../public/assets/audio/sfx/skills/sfx-raincaller-loop.wav) (3.500s; -12.0)<br>[sfx-raincaller-hit.wav](../../public/assets/audio/sfx/skills/sfx-raincaller-hit.wav) (0.330s; -3.0) |
| relentless-pursuit | Intentionally silent — None (passive). |
| rooted-meditation | [sfx-rooted-meditation-proc.wav](../../public/assets/audio/sfx/skills/sfx-rooted-meditation-proc.wav) (0.280s; -15.0)<br>[sfx-rooted-meditation-loop.wav](../../public/assets/audio/sfx/skills/sfx-rooted-meditation-loop.wav) (2.500s; -12.0) |
| sacred-fervor | Intentionally silent — None (passive). |
| sanctuary-dome | [sfx-sanctuary-dome-cast.wav](../../public/assets/audio/sfx/skills/sfx-sanctuary-dome-cast.wav) (0.600s; -3.0)<br>[sfx-sanctuary-dome-loop.wav](../../public/assets/audio/sfx/skills/sfx-sanctuary-dome-loop.wav) (3.000s; -12.0) |
| saving-grace | [sfx-saving-grace-proc.wav](../../public/assets/audio/sfx/skills/sfx-saving-grace-proc.wav) (0.400s; -15.0) |
| serpent-coil | [sfx-serpent-coil-cast.wav](../../public/assets/audio/sfx/skills/sfx-serpent-coil-cast.wav) (0.640s; -3.0) |
| serpent-path | [sfx-serpent-path-cast.wav](../../public/assets/audio/sfx/skills/sfx-serpent-path-cast.wav) (0.560s; -3.0) |
| sharpened-flint | Intentionally silent — None (passive). |
| shield-bash | [sfx-shield-bash-cast.wav](../../public/assets/audio/sfx/skills/sfx-shield-bash-cast.wav) (0.260s; -3.0)<br>[sfx-shield-bash-hit.wav](../../public/assets/audio/sfx/skills/sfx-shield-bash-hit.wav) (0.180s; -3.0) |
| shield-throw | [sfx-shield-throw-cast.wav](../../public/assets/audio/sfx/skills/sfx-shield-throw-cast.wav) (0.400s; -3.0)<br>[sfx-shield-throw-hit.wav](../../public/assets/audio/sfx/skills/sfx-shield-throw-hit.wav) (0.170s; -3.0) |
| silencing-dart | [sfx-silencing-dart-cast.wav](../../public/assets/audio/sfx/skills/sfx-silencing-dart-cast.wav) (0.230s; -3.0)<br>[sfx-silencing-dart-hit.wav](../../public/assets/audio/sfx/skills/sfx-silencing-dart-hit.wav) (0.130s; -3.0) |
| skyfall | [sfx-skyfall-cast.wav](../../public/assets/audio/sfx/skills/sfx-skyfall-cast.wav) (0.800s; -3.0)<br>[sfx-skyfall-hit.wav](../../public/assets/audio/sfx/skills/sfx-skyfall-hit.wav) (0.220s; -3.0) |
| smoke-bomb | [sfx-smoke-bomb-cast.wav](../../public/assets/audio/sfx/skills/sfx-smoke-bomb-cast.wav) (0.580s; -3.0) |
| spirit-familiar | [sfx-spirit-familiar-cast.wav](../../public/assets/audio/sfx/skills/sfx-spirit-familiar-cast.wav) (0.400s; -3.0)<br>[sfx-spirit-familiar-loop.wav](../../public/assets/audio/sfx/skills/sfx-spirit-familiar-loop.wav) (2.000s; -12.0) |
| spirit-harvest | [sfx-spirit-harvest-proc.wav](../../public/assets/audio/sfx/skills/sfx-spirit-harvest-proc.wav) (0.300s; -15.0) |
| steady-aim | Intentionally silent — None (passive). |
| stone-maw | [sfx-stone-maw-cast.wav](../../public/assets/audio/sfx/skills/sfx-stone-maw-cast.wav) (0.620s; -3.0)<br>[sfx-stone-maw-hit.wav](../../public/assets/audio/sfx/skills/sfx-stone-maw-hit.wav) (0.360s; -3.0) |
| stonehide | [sfx-stonehide-proc.wav](../../public/assets/audio/sfx/skills/sfx-stonehide-proc.wav) (0.300s; -15.0) |
| storm-nest | [sfx-storm-nest-cast.wav](../../public/assets/audio/sfx/skills/sfx-storm-nest-cast.wav) (0.500s; -3.0)<br>[sfx-storm-nest-loop.wav](../../public/assets/audio/sfx/skills/sfx-storm-nest-loop.wav) (2.400s; -12.0) |
| sun-claw | [sfx-sun-claw-cast.wav](../../public/assets/audio/sfx/skills/sfx-sun-claw-cast.wav) (0.440s; -3.0)<br>[sfx-sun-claw-hit.wav](../../public/assets/audio/sfx/skills/sfx-sun-claw-hit.wav) (0.210s; -3.0) |
| sun-dart | [sfx-sun-dart-cast.wav](../../public/assets/audio/sfx/skills/sfx-sun-dart-cast.wav) (0.240s; -3.0)<br>[sfx-sun-dart-hit.wav](../../public/assets/audio/sfx/skills/sfx-sun-dart-hit.wav) (0.160s; -3.0) |
| survivors-will | Intentionally silent — None (passive). |
| trophy-hunter | [sfx-trophy-hunter-proc.wav](../../public/assets/audio/sfx/skills/sfx-trophy-hunter-proc.wav) (0.380s; -15.0) |
| ui-ally-cast | [sfx-ui-ally-cast.wav](../../public/assets/audio/sfx/ui/sfx-ui-ally-cast.wav) (0.250s; -18.0) |
| ui-ally-rank | [sfx-ui-ally-rank.wav](../../public/assets/audio/sfx/ui/sfx-ui-ally-rank.wav) (0.600s; -6.0) |
| ui-companion-join | [sfx-ui-companion-join.wav](../../public/assets/audio/sfx/ui/sfx-ui-companion-join.wav) (1.000s; -6.0) |
| ui-milestone-pick | [sfx-ui-milestone-pick.wav](../../public/assets/audio/sfx/ui/sfx-ui-milestone-pick.wav) (1.200s; -9.0) |
| ui-pick-active | [sfx-ui-pick-active.wav](../../public/assets/audio/sfx/ui/sfx-ui-pick-active.wav) (0.200s; -6.0) |
| ui-pick-ally | [sfx-ui-pick-ally.wav](../../public/assets/audio/sfx/ui/sfx-ui-pick-ally.wav) (0.250s; -6.0) |
| ui-pick-passive | [sfx-ui-pick-passive.wav](../../public/assets/audio/sfx/ui/sfx-ui-pick-passive.wav) (0.250s; -6.0) |
| ui-slot-unlock | [sfx-ui-slot-unlock.wav](../../public/assets/audio/sfx/ui/sfx-ui-slot-unlock.wav) (0.800s; -6.0) |
| vanish | [sfx-vanish-cast.wav](../../public/assets/audio/sfx/skills/sfx-vanish-cast.wav) (0.620s; -3.0) |
| venom-blade | [sfx-venom-blade-cast.wav](../../public/assets/audio/sfx/skills/sfx-venom-blade-cast.wav) (0.400s; -3.0) |
| venomous-darts | [sfx-venomous-darts-proc.wav](../../public/assets/audio/sfx/skills/sfx-venomous-darts-proc.wav) (0.220s; -15.0) |
| verdant-mercy | [sfx-verdant-mercy-cast.wav](../../public/assets/audio/sfx/skills/sfx-verdant-mercy-cast.wav) (0.850s; -3.0) |
| war-cry | [sfx-war-cry-cast.wav](../../public/assets/audio/sfx/skills/sfx-war-cry-cast.wav) (0.780s; -3.0) |
| war-drum | [sfx-war-drum-cast.wav](../../public/assets/audio/sfx/skills/sfx-war-drum-cast.wav) (0.400s; -3.0)<br>[sfx-war-drum-loop.wav](../../public/assets/audio/sfx/skills/sfx-war-drum-loop.wav) (3.000s; -12.0) |
| windstep | [sfx-windstep-cast.wav](../../public/assets/audio/sfx/skills/sfx-windstep-cast.wav) (0.280s; -3.0) |
| wounded-fury | [sfx-wounded-fury-proc.wav](../../public/assets/audio/sfx/skills/sfx-wounded-fury-proc.wav) (0.380s; -15.0) |
