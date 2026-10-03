# UI kit asset provenance

All 18 final files are generated with gpt-image-2.5 Flare on 2026-10-03, except the milestone banner, which is the one gpt-image-2.5 Sunburst correction. Batch sheet prompts used the supplied `style_reference.png`: crisp pixel-art Maya-fantasy UI, ornate gold frames, dark interiors, jade/silver/sky-blue materials, transparent background, isolated sprites in reading-order cells, no text except the rank numerals.

- `ui/slot-active-plate.png` — gpt-image-2.5 Flare — 2026-10-03 — thin gold square plate, jade corner gems, empty dark center.
- `ui/slot-passive-ring.png` — gpt-image-2.5 Flare — 2026-10-03 — jade carved circular ring with four gems and open center.
- `ui/slot-ally-plate.png` — gpt-image-2.5 Flare — 2026-10-03 — compact silver and sky-blue square plate, empty dark center.
- `ui/slot-locked-plate.png` — gpt-image-2.5 Flare — 2026-10-03 — active-plate silhouette in weathered stone with bronze lock.
- `ui/slot-locked-ring.png` — gpt-image-2.5 Flare — 2026-10-03 — passive-ring silhouette in grey stone with bronze lock.
- `ui/slot-trait-ring.png` — gpt-image-2.5 Flare — 2026-10-03 — tiny hammered silver ring with open center.
- `ui/ribbon-active.png` — gpt-image-2.5 Flare — 2026-10-03 — notched gold horizontal ribbon, blank center.
- `ui/ribbon-passive.png` — gpt-image-2.5 Flare — 2026-10-03 — matching notched jade ribbon, blank center.
- `ui/ribbon-ally.png` — gpt-image-2.5 Flare — 2026-10-03 — matching notched silver and sky-blue ribbon, blank center.
- `ui/ribbon-stat.png` — gpt-image-2.5 Flare — 2026-10-03 — matching notched warm-grey stone ribbon, blank center.
- `ui/milestone-banner.png` — gpt-image-2.5 Sunburst — 2026-10-03 — regenerated wide Maya-carved dark plaque, gold trim, jade end gems, no detached artifacts.
- `ui/unlock-burst.png` — gpt-image-2.5 Flare — 2026-10-03 — bright white-gold angular starburst with transparent edges and sparks.
- `ui/rank-badge-1.png` — gpt-image-2.5 Flare — 2026-10-03 — round bronze badge, one blue gem, carved numeral 1.
- `ui/rank-badge-2.png` — gpt-image-2.5 Flare — 2026-10-03 — round bronze badge, two blue gems, carved numeral 2.
- `ui/rank-badge-3.png` — gpt-image-2.5 Flare — 2026-10-03 — round silver badge, three blue gems, carved numeral 3.
- `ui/rank-badge-4.png` — gpt-image-2.5 Flare — 2026-10-03 — round silver badge, four blue gems, carved numeral 4.
- `ui/rank-badge-5.png` — gpt-image-2.5 Flare — 2026-10-03 — round gold badge, five blue gems, carved numeral 5.
- `ui/ally-panel-bg.png` — gpt-image-2.5 Flare — 2026-10-03 — wide dark carved-stone panel, silver/sky-blue trim, empty interior.

## Step 13 — Skill icon sheets and one-file-per-ID icons

The three 4×4 source sheets and single correction use `style_reference.png` only for the common pixel-art frame/style. The built-in gpt-image-2.5 Flare generator returned 1254×1254 sheets; each was resized to 2048×2048 before slicing. Outputs are trimmed, centered, magenta-keyed and saved as 128×128 PNGs with alpha by `scripts/slice-sheet.mjs`.

- `previews/step13/sheet-1-original.png` — gpt-image-2.5 Flare — 2026-10-03 — 4×4 gold/jade framed Maya-fantasy sheet, cells: jaguar fang, heart bite, obsidian thorns, jaguar pride, jade resilience, spirit wisp, moon blessing, mana goblet, hunter focus, trophy skull, steady aim, survivor footprints, healing circle, jade ward, cleansing light, sanctuary dome.
- `previews/step13/sheet-2-original.png` — gpt-image-2.5 Flare — 2026-10-03 — 4×4 gold/jade framed Maya-fantasy sheet, cells: radiant beacon, lifebond, saving grace, sacred fervor, bulwark wall, war cry, shield bash, ground slam, clay bomb, shield throw, bodyguard, guardian link, execute, venom blade, silencing dart, smoke bomb.
- `previews/step13/sheet-3-original.png` — gpt-image-2.5 Flare — 2026-10-03 — 4×4 gold/jade framed Maya-fantasy sheet, cells: vanish, relentless pursuit, bounty contract, seven stat icons, dash, manual attack, four shrine idols.
- `previews/step13/silencing-dart-original.png` — gpt-image-2.5 Flare — 2026-10-03 — single square framed silver dart with a red barred-mouth mute mark; generated to correct the missing symbol in sheet 2, then magenta-keyed and sliced.

- `skills/bloodlust.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 1: bloody red jaguar fang with red speed lines.
- `skills/feast-of-the-fallen.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 2: jaguar jaws biting a glowing heart.
- `skills/obsidian-thorns.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 3: black obsidian spikes bursting from stone skin.
- `skills/jaguars-pride.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 4: golden jaguar head above small silhouettes.
- `skills/jade-resilience.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 5: shield of green jade crystal plates.
- `skills/spirit-harvest.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 6: pale-green floating wisp with two eyes.
- `skills/crescent-blessing.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 7: silver crescent moon and blue sparkle.
- `skills/mana-overflow.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 8: blue-white goblet spilling energy.
- `skills/hunters-focus.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 9: crosshair over a hawk eye.
- `skills/trophy-hunter.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 10: jaguar skull trophy mounted on a spear.
- `skills/steady-aim.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 11: sniper reticle inside a green circle.
- `skills/survivors-will.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 12: running footprints and a small heart.
- `skills/healing-circle.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 13: lotus-petal green ring around a glowing cross.
- `skills/jade-ward.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 14: hexagonal jade shield with green gem.
- `skills/cleansing-light.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 15: white-gold sun cross and falling feathers.
- `skills/sanctuary-dome.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 1 cell 16: pale-gold geometric dome.
- `skills/radiant-beacon.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 1: golden light pillar on a stone base.
- `skills/lifebond.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 2: red-gold thread connecting two hearts.
- `skills/saving-grace.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 3: white wings spread around a golden halo.
- `skills/sacred-fervor.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 4: flaming golden prayer hands.
- `skills/bulwark-wall.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 5: grey stone wall with carved Maya-style ornament.
- `skills/war-cry.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 6: shouting mouth and red sound waves.
- `skills/shield-bash.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 7: spiked round stone shield striking a spark.
- `skills/ground-slam.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 8: stone fist striking cracked ground.
- `skills/clay-bomb.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 9: terracotta pot with a lit fuse.
- `skills/shield-throw.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 10: spinning stone disc with motion arcs.
- `skills/bodyguard.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 11: stone-masked head with crossed spears.
- `skills/guardian-link.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 12: two shields joined by a glowing chain.
- `skills/execute.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 13: red skull with a dagger through it.
- `skills/venom-blade.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 14: dagger dripping green venom.
- `skills/silencing-dart.png` — gpt-image-2.5 Flare — 2026-10-03 — single-cell correction: small silver dart with a clear red barred-mouth symbol.
- `skills/smoke-bomb.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 2 cell 16: dark grey smoke ball and spark.
- `skills/vanish.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 1: faded assassin silhouette dissolving into smoke.
- `skills/relentless-pursuit.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 2: running wolf-like figure with speed lines.
- `skills/bounty-contract.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 3: rolled parchment and a gold coin.
- `skills/stat-might.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 4: obsidian blade edge glowing orange.
- `skills/stat-haste.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 5: feather with speed lines.
- `skills/stat-reach.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 6: expanding concentric rings.
- `skills/stat-critical.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 7: jaguar eye within a crosshair star.
- `skills/stat-armor.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 8: carved stone breastplate.
- `skills/stat-renewal.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 9: green leaf with healing dewdrop.
- `skills/stat-wisdom.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 10: glowing scroll with a green glyph motif.
- `skills/ui-hud-dash.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 11: winged sandal with blue speed lines.
- `skills/ui-hud-attack.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 12: crossed claw and spear.
- `skills/ui-shrine-damage.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 13: carved stone idol glowing red.
- `skills/ui-shrine-vitality.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 14: carved stone idol glowing green.
- `skills/ui-shrine-speed.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 15: carved stone idol glowing blue.
- `skills/ui-shrine-fortune.png` — gpt-image-2.5 Flare — 2026-10-03 — sheet 3 cell 16: carved stone idol glowing gold.

## Step 14 — Balam and shared FX stills — 2026-10-03

Shared prompt for all 42 cells: gpt-image-2.5 Flare, transparent 4×4 2048×2048 sheet; one centered isolated still VFX in each listed cell, crisp luminous pixel art matching `style_reference_fx.png` and `style_reference.png`, ample transparent padding, no text/characters/watermark, palette and shape exactly as listed below. The image service returned 1254×1254 sheets; the original outputs are retained in `previews/step14/`, resized working sheets are 2048×2048, then sliced to final sizes with `slice-sheet.mjs`.

- `fx/jaguar-roar/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 1: three concentric amber sound-wave rings, #f2b34c / #7a3b12.
- `fx/jaguar-roar/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 2: sharp golden jaguar-head sound-flash silhouette, amber palette.
- `fx/obsidian-arc/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 3: sweeping black-glass crescent with violet edge, #9b7bff / #15121c.
- `fx/obsidian-arc/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 4: eight angular obsidian shards bursting outward with violet highlights.
- `fx/prowlers-leap/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 5: compact oval earthy landing shadow, #c58a3d / #6b4a2b.
- `fx/prowlers-leap/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 6: dusty landing ring, four dirt fragments and crack marks.
- `fx/claw-cyclone/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 7: three golden claw arcs swirling into a cyclone, #f4c542 / #fff2b0.
- `fx/claw-cyclone/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 8: circular white-gold ground claw-flash ring.
- `fx/ceiba-breaker/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 9: descending translucent ceiba log with bark bands, #6b8e3a / #3b2a1a.
- `fx/ceiba-breaker/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 10: crater burst of bark chips and green leaves.
- `fx/bloodless-hunt/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 11: cyan jaguar-fang comet with pale spectral wisps, #5fe3f2 / #dff9ff.
- `fx/bloodless-hunt/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 12: cyan fang impact flash with three bite-mark crescents.
- `fx/stone-maw/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 13: rising carved grey stone jaw with separated teeth, #8a8fa0.
- `fx/stone-maw/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 14: sand-gold armed rune ring with dust and stone chips, #c9b37a.
- `fx/war-drum/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 15: floating front-facing carved Maya war drum, #b5452b / #f0c27a.
- `fx/war-drum/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 1 cell 16: small/medium/large red-brown beat rings with musical glyph-sparks.
- `fx/sun-claw/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 1: four outward-rotating sun-gold crescent slashes, #ffd45a / #ff8a1f.
- `fx/sun-claw/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 2: bright white-gold central flare with orange embers.
- `fx/jaguar-echo/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 3: cyan spectral jaguar pawprint and swift spirit streaks, #5fe3f2 / #2b6f8f.
- `fx/jaguar-echo/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 4: pale cyan pawprint trail with blue mist puff.
- `fx/fang-path/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 5: jade tooth spikes rising from a luminous ground line, #4fd6a0 / #d8fff0.
- `fx/fang-path/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 6: thin green path light with emerald dust motes.
- `fx/hunters-mark/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 7: red glyph composed of exactly three claw scratches, #d9413a / #ffb3a0.
- `fx/hunters-mark/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 8: sharp red claw-spark burst.
- `fx/nine-lives/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 9: spiral of tiny golden jaguar spirit silhouettes, #ffd45a.
- `fx/nine-lives/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 10: warm gold aura ring with small green healing-cross shapes, #9ef0a8.
- `fx/black-mirror/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 11: reflective obsidian disc with 120-degree violet barrier rim, #2a2540 / #b58cff.
- `fx/black-mirror/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 12: violet shot visibly reversing off a curved barrier.
- `fx/pyramid-rush/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 13: five receding stone-step afterimage slabs and brown speed streaks, #b08a5a / #6a4b2b.
- `fx/pyramid-rush/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 14: long horizontal rolling dust cloud with brown trails.
- `fx/heart-of-balam/main.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 15: luminous golden jaguar heart gem with orbiting motes, #ffcf4a / #c4412b.
- `fx/heart-of-balam/accent.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 2 cell 16: translucent gold dome rim, shockwave and crack pattern.
- `fx/bloodlust/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 1: compact red three-claw aura emblem, #d9413a.
- `fx/stonehide/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 2: layered faceted grey stone plates, #8a8fa0.
- `fx/predators-rhythm/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 3: gold pulse ring around one pawprint flash, #f4c542.
- `fx/feast-of-the-fallen/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 4: green-gold wisps curving toward a heart mote.
- `fx/obsidian-thorns/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 5: black obsidian shard burst with violet-grey edge lights.
- `fx/jaguars-pride/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 6: thin golden radius ring around a small jaguar paw glyph.
- `fx/earthshaker/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 7: brown shockwave ring with five pebbles.
- `fx/wounded-fury/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 8: compact red-orange flame outline aura, #d9413a / #ff8a1f.
- `fx/survivors-will/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 9: pale speed streaks behind a heart-shaped spark.
- `fx/jade-bounty/proc.png` — gpt-image-2.5 Flare — 2026-10-03 — Sheet 3 cell 10: bright green sparkle burst with emerald particles, #4fd6a0 / #d8fff0.
