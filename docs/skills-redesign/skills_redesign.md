# Sangre y Jade — Skills Redesign Specification (for v0.5.1)

Audience: the developer/agent who will fix the skill system. Source: the v0.5.0 repo (`src/` as uploaded) and the earlier `skills_log.html` audit. Companion files in this folder:

- `skills_redesign.json` — the same data in machine-readable form (one entry per skill).
- `validate_skills.mjs` — checks every rule in section 3 automatically.
- `migrate_icons.mjs` — copies the existing icons to their new unique file names.

## 1. Summary

| Item | Today (v0.5.0) | Target |
|---|---|---|
| Hero active skills | 60 (20 per hero), only 13 mechanics, 13 generic descriptions | 48 (16 per hero), each with its own mechanic, description, animation and sound |
| Hero passive skills | none | 24 (8 per hero) + 2 shared innate passives |
| Ally skills | 30 (10 per ally), many duplicates of hero skills or stats | 24 (8 per ally), none overlapping heroes |
| Icons | 66 files, 29 used by two or more skills, ally skills, stats or buttons, 3 unused | one file per skill (`skills/<id>.png`); 66 reused once each, 42 new |
| Skill ownership | no rule | a skill belongs to exactly one hero; only the 2 shared passives may be shared |
| Hero slots | 4 identical skill buttons, all clickable | **3 active slots + 1 passive slot** at the start; **2nd passive slot at level 10**, **4th active slot at level 20**. Actives and passives look and behave differently |
| Ally skills | pick class + 3 skills in a row at level 5, then an extra screen at every level-up | ally arrives at level 5 with a signature skill, gets 2 more skills at levels 8 and 14, everything automatic |

**How to use this document.** Work in the order of section 10. Section 2 lists real bugs (fix them first), section 3 is the rule set the result must satisfy, section 4 is the full catalogue, sections 5-7 cover art, animation, sound and where to find free assets, section 8 balance, section 9 what happens to each old skill.

## 2. Verified problems in v0.5.0 (with file references)

These come from reading the code, not from playing every skill. Re-check each one in game after fixing.

1. **Descriptions are overwritten.** `src/data/heroes.js` line 126 loops over every skill and sets `skill.description = SKILL_DESCRIPTIONS[skill.type]`, so 60 skills show only 13 sentences. Delete the loop; keep `SKILL_DESCRIPTIONS` only as a fallback.
2. **Behaviour depends on `type`, not on the skill.** `castSkill()` (`GameScene.js`, about lines 425-515) is a `switch(skill.type)`; every skill of a type runs the same code and the same effect sprite. Replace it with one handler per skill id (section 3.3).
3. **`orbit` does not orbit.** It fires projectiles outward and adds a small shield. Affects Claw Cyclone, Jade Halo and Quetzal Orbit.
4. **Mana is restored twice.** `GameScene.js` lines 494 and 512 both apply `skill.restore`; Ixchel's Mantle restores +80 instead of +40.
5. **Colours are ignored.** `projectile.clearTint()` (line 556) and `ringEffect(x, y, scale, tint)` discard the tint passed by each skill, so no skill has its own colour.
6. **Only 6 effect sprite rows exist** (`fx-0..5`) and every skill picks one of them via `playEffect(row, ...)`.
7. **Traps and turrets look the same.** Every `trap` draws the `trap` texture (the icon-8 jaw); every `summon` uses the Ixchel scepter sprite (`weapon-ixchel.png`), even Kukul's nest and Balam's jaguar.
8. **Chain range is measured from the player**, not from the previous target (`chainAttack`, lines 606-618).
9. **Slow is a fixed 50%** (line 298), so skills cannot have 30/40/60% slows.
10. **Sound:** every cast plays either `dart` (Kukul) or `spell` (everyone else) (`GameScene.js` lines 429 and 514). `AudioDirector.js` has only 13 SFX names.
11. **Icon map (`src/art/uiArt.js`):** `smoking-mirror` and `ixchels-mantle` share icon 29; Ixchel's list looks shifted by one after the unused icon 23, so Moon Tears and Ancestor Chorus show each other's art; icons 0, 20, 23 were unused; stat upgrades and HUD/shrine buttons also borrow skill icons.
12. **Promises that were never implemented** (e.g. Night Pounce crit refresh, Hunter's Mark marking, Four Directions). Section 9 explains how each was resolved.

## 3. Rules the result must satisfy

### 3.1 Acceptance rules (checkable by `validate_skills.mjs`)

1. **Unique icon.** Every skill, passive, ally skill and stat upgrade has its own icon file `public/assets/pixel/skills/<id>.png`. No two entries point at the same file or at the same image.
2. **Unique animation.** Every skill owns its own animation folder `public/assets/pixel/fx/<id>/` (section 6). Two skills must never share the same sprite sheet, and their silhouette, motion and colour palette must differ. Generic helpers (screen shake, dust, hit flash) may be shared, but each skill needs at least one signature animation that exists nowhere else.
3. **Animation matches the text.** The description, the mechanic and the animation describe the same thing (a skill that says "orbit" must visibly orbit).
4. **Unique ownership.** A skill id appears in exactly one hero's list. The only exceptions are the 2 shared passives (`survivors-will`, `jade-bounty`), which every hero owns from level 1.
5. **Passives.** Each hero has at least 6 hero-only passives (this spec gives 8).
6. **Unique description.** Every skill has its own in-game text (no per-type text), under 110 characters.
7. **Unique sound.** Every active skill has its own cast sound; passives with a visible proc get a short sound.
8. **Ally rule.** No ally skill duplicates a hero skill's mechanic or a stat upgrade.
9. **Slot rule.** A hero never holds more than 3 active skills before level 20 (4 after) or more than 1 passive before level 10 (2 after). The 2 shared passives are innate and use no slot.
10. **Distinct look.** Active and passive skills are visibly different in the HUD and on level-up cards (colour *and* shape/label, never colour alone).

### 3.2 Skill data schema

```js
{
  id: 'jaguar-roar',            // never changes once released
  kind: 'active',               // 'active' | 'passive'
  owner: 'balam',               // 'balam' | 'ixchel' | 'kukul' | 'shared' | 'ally:tank' ...
  name: "Jaguar's Roar",        // English; FR/AR in src/i18n/skills.js
  description: 'A terrifying roar...',
  icon: 'skills/jaguar-roar.png',
  fx: 'jaguar-roar',            // folder under assets/pixel/fx/
  sfx: { cast: 'sfx-jaguar-roar-cast', hit: null },
  cooldown: 9, mana: 0, damage: 40, range: 190,
  params: { fearSeconds: 2, bossSlow: 0.35 },   // everything the handler needs
  maxLevel: 6                   // actives 6, passives 5
}
```

### 3.3 One handler per skill

Replace the `switch (skill.type)` in `castSkill()` with a registry:

```js
// src/skills/index.js
import { jaguarRoar } from './balam/jaguar-roar.js';
export const ACTIVE_HANDLERS = { 'jaguar-roar': jaguarRoar /* ...one per id */ };
// GameScene.castSkill(index): ACTIVE_HANDLERS[skill.id](this, skill, ctx)
```

Handlers may call shared helpers in `src/skills/common.js` (`damageArea`, `cone`, `lineStrike`, `spawnProjectile`, `orbitBlades`, `zone`, `summon`, `applyStatus`), but each skill keeps its own file so its mechanic, VFX and SFX can change without touching others. Level scaling: damage x(1 + 0.25 x (level-1)); at level 3 area/duration +10%; at level 5 cooldown -10%; at level 6 +1 projectile / chain / orbiter / charge or +20% duration, whichever applies.

### 3.4 Status effects

The game already stores timers on enemies (`stunUntil`, `slowUntil`, `tauntUntil`, `markUntil`/`markBonus`, `silenceUntil`, `disarmUntil`, `poisonUntil`, `bleedUntil`; see `GameScene.js` lines 279-298 and 759). Keep that pattern and add:

| Status | Data keys | Behaviour to implement |
|---|---|---|
| Slow (%) | `slowUntil`, `slowPct` | Multiply velocity by `1 - slowPct` (replace the fixed 0.5 at line 298) |
| Root | `rootUntil` | Velocity 0 but the enemy can still attack |
| Fear | `fearUntil` | Move directly away from the source; no attacks |
| Confuse | `confuseUntil` | Random heading re-rolled every 0.4s; no attacks |
| Pull | `pullTo` {x,y,until} | Move toward the point at 2x speed |
| Burn | `burnUntil`, `burnDps` | Damage over time, orange tint |
| Blind | `blindUntil` | Enemy projectiles aimed at the hero are fired in a random direction |
| Aggro drop (hero) | `player.hiddenUntil` | Non-boss enemies ignore the hero and wander |
| Vulnerable | `markUntil`, `markBonus` | Already exists (Hunter's Mark) |

Hero-side effects to add to `this.stats`: `damageTakenMult`, `reflectUntil`, `dodgeCharges`, `intangibleUntil`, `manaCostMult`, `manaRegenMult`, `lifestealPct`, `cooldownRecoveryMult`.

### 3.5 Passive engine

Create `src/skills/PassiveSystem.js`. The scene emits events; each passive subscribes only to what it needs.

| Event | Emit from |
|---|---|
| `kill` (enemy, byAlly) | `killEnemy()` (line 673) |
| `hit` / `crit` (enemy, damage) | where damage is computed (line 656) |
| `basicAttack` (count) | the automatic attack routine |
| `skillCast` (skill) | end of `castSkill()` |
| `damageTaken` (amount, source, melee) | `damagePlayer()` |
| `pickup` (kind) | `collectPickup()` (line 814) |
| `tick` (dt) | `update()` |

Each passive file exports `{ id, on: { kill(ctx, level) {...} }, stat?(level) }`. Level values come from the "Values by level" in section 4. Passives never use a skill button.

### 3.6 Hero slots, level milestones, HUD and draft

**Slot rules (implement as data, not as scattered numbers):**

```js
// src/systems/SkillDraft.js  (replaces HERO_SKILL_CAPACITY = 4)
export const SLOT_RULES = {
  active:  { start: 3, unlocks: [{ level: 20, total: 4 }], keys: ['Q', 'E', 'R', 'T'], maxLevel: 6 },
  passive: { start: 1, unlocks: [{ level: 10, total: 2 }], maxLevel: 5 },
  innate:  ['survivors-will', 'jade-bounty']          // shared basic traits, no slot, always on
};
export const slotCount = (kind, heroLevel) => /* start, or the highest unlock whose level <= heroLevel */;
```

| Slot | At the start | Unlock | Max skill level |
|---|---|---|---|
| Active (button) | 3 (Q, E, R) | 4th (T) at **hero level 20** | 6 |
| Passive (always on) | 1 | 2nd at **hero level 10** | 5 |
| Basic traits (2 shared) | both, innate | none | 5 |

**Milestone reward.** When the hero reaches level 10, after the normal level-up card is picked, show an extra **milestone pick**: three passive cards, choose one (it fills the new slot). At level 20 do the same with three active cards for the 4th slot. The milestone is extra: it does not replace the normal level-up pick. Handle several level-ups in a row correctly (`showLevelChoice` works per pending level, so use `earnedLevel`). Show a banner ("Passive slot 2 unlocked!") and break the lock icon on the HUD slot.

**HUD (`Hud.js` line 39 builds 4 identical `skill-btn` buttons today):**

| Element | Frame colour | Shape | Behaviour |
|---|---|---|---|
| Active skill | gold `#ffcf4a` (`--skill-active`) | square button, same as today | key label (Q/E/R/T), cooldown sweep, ready glow, clickable |
| Passive skill | jade `#3de0b0` (`--skill-passive`) | smaller rounded-diamond or circle | no key label, never clickable, level pips (1-5), tap or hover shows a tooltip |
| Basic trait (innate) | silver `#c9c3d6` | tiny circle | non-interactive, tooltip only |
| Ally skill | sky blue `#8ec5ff` (`--skill-ally`) | small square in the ally panel | non-interactive, cooldown ring |
| Locked slot | grey `#6b6478` | same shape as the slot it will become | padlock and "Lv 10" or "Lv 20" |

Passives with state show it on the icon: kill-counter passives a thin progress bar (e.g. Feast of the Fallen 7/12), timer passives a ready ring (Lunar Boon), stacking passives pips (Bloodlust).

Layout: active row at the bottom right next to Dash (and the F attack button in manual mode); passive row directly above or left of it; ally panel under the hero's health bar. It must fit 568x320 (landscape phone) and 320x568 (portrait) with all four active buttons, Dash and the attack button. Add the 4th button without shifting the others at the moment of unlock (reserve the locked slot from the start).

```
 [HP / mana / XP bar]                                   [pause]
 [ally portrait] [a1][a2][a3]
                                              (P1)(P2 lock Lv10)
                                    [Q][E][R][T lock Lv20] [DASH]
```

**Level-up cards.** Border and ribbon follow the same colours: gold "ACTIVE", jade "PASSIVE", sky-blue "ALLY", neutral "STAT" (existing stat cards). The ribbon always carries a text label so colour is never the only cue. Skill upgrade cards keep the kind colour.

**Draft algorithm** (replace `draftSkills`, which only knows one capacity):

1. Pools: `newActive` (only if a free active slot exists), `newPassive` (only if a free passive slot exists), `upgradeActive` (owned and level < 6), `upgradePassive` (level < 5), `stat`.
2. Always return 3 cards with no duplicates. If a free active slot exists, include at least one `newActive`. If a free passive slot exists, include a `newPassive` on every second level-up until it is filled (guaranteed by level 4). Fill the rest from upgrades, then stats.
3. When all slots of a kind are full, no `new` cards of that kind appear, except a rare **swap card** (about 15%, at most one per draft) that replaces an owned skill of the same kind after a confirmation, as the current `replace-skill` flow does.
4. Boss rewards (`getSkillChoices(true)`) keep offering skills only (no stat cards), prefer upgrades of owned skills, and may include one swap card.
5. If everything is maxed, offer stat cards and a heal.

Touch points in code: `SkillDraft.js` line 1, `GameScene.js` lines 8, 239, 798, 864-870, 888-893, `Hud.js` lines 5, 14, 39. `GameScene` must keep `skillSlots` for actives and gain `passiveSlots`; cooldown loops must use the current active slot count.

### 3.7 Audio

`AudioDirector.js` has a fixed `SFX` map (lines 9-23). Add a manifest generated from `skills_redesign.json` (`sfx-<id>-cast.wav` and optional `-hit`), keep the existing pooling, and throttle each sound id to one play per 60 ms. Looping sounds (Claw Cyclone, War Drum, Moonwell, Raincaller) need `audio.loop(id)` / `audio.stop(id)`. Replace the two `audio.sfx('dart'|'spell')` calls (lines 429 and 514) with the skill's own sound.

### 3.8 Visual effects

Add an `FxDirector` (or extend `playEffect`) that loads `assets/pixel/fx/<id>/<stage>-<n>.png` strips where `stage` is `cast`, `travel`, `impact`, `ground` or `aura`. Respect colours (remove the `clearTint()` calls that erase them), draw telegraphs for anything delayed, and keep every effect under 24 sprites alive at once on mobile.

### 3.9 Translations and save data

- Add every new or renamed skill (name and description) to `src/i18n/skills.js` as `[en, fr, ar]`. The in-game text no longer comes from `SKILL_DESCRIPTIONS`.
- `SaveSystem.js` has `version: 1`. If saved data stores skill ids (shrine unlocks, codex), bump the version and migrate with section 9.

### 3.10 Ally system (how allies are obtained, when, and how they act)

Today (`GameScene.js` lines 866-867, `SupportSystem.js`): at level 5 the player picks a class and then **3 skills in a row**, and **every later level-up** shows an extra "Support Skills" screen. Replace this with the flow below. All ally skills are automatic; the player never presses them.

**Acquisition**

| Hero level | Event |
|---|---|
| 5 | Choose 1 of 3 allies (as today). Each card shows the role, the signature skill and the ally's passives. The ally arrives with its **signature skill** already equipped (no extra picks). |
| 8 | **Companion pick**: choose 1 of 3 unowned ally skills. |
| 14 | **Companion pick**: choose 1 of 3 unowned ally skills. |

An ally has 3 skill slots (1 signature + 2 picks, any mix of active and passive). There is no replacement and no per-level screen. The signatures are Healing Circle (Saintess), War Cry (Tank) and Ambush (Assassin). Remove `chooseInitial()` and the per-level `offerChange()`. Keep `showSupportLoadout()` as a read-only panel reachable by tapping the ally panel.

**Ally rank (replaces the unbounded scaling).** Today `supportRank = heroLevel - 4` and `power = 1 + (rank - 1) x 0.12`, which is 2.8x at hero level 20. Use `rank = min(5, 1 + floor((heroLevel - 5) / 5))`; every ally number is multiplied by `1 + 0.15 x (rank - 1)` and every ally cooldown by `1 - 0.04 x (rank - 1)`. Show a small toast on rank-up ("Companion rank 2").

**Automatic use ("Ally Brain").** One scheduler replaces the `cast()` switch:

1. Evaluate every 0.2 s. Never cast during a level-up choice or when the run has ended (as today).
2. Each ally skill has a **priority**: 1 emergency (hero HP low, surrounded), 2 reactive (a trigger such as projectiles near, 3+ enemies, a ranged enemy), 3 opportunistic (ready and a target exists). Check in priority order; the first valid skill casts.
3. **Global gap:** at least 0.8 s between two ally casts.
4. **No waste:** healing only when the hero is below its threshold; no shield while it is full; do not recast a zone or buff while the same effect is still active.
5. **Failsafe:** a skill marked `failsafe` that has been ready for 8 s while at least one enemy is within 350 casts anyway, so it never sits unused. Reactive-only skills (Saving Grace, Vanish, Cleansing Light, Lifebond, Silencing Dart, Execute) have no failsafe.
6. **Feedback:** the ally plays its cast animation, a small icon of the skill pops above it for 0.6 s, the skill's own sound plays, and the skill's cooldown ring in the ally panel restarts.
7. **Passive ally skills** are always on and shown in the same panel with a jade frame.
8. A debug counter records casts per skill per run, so a test can prove no skill is dead.

Each ally skill in section 4.5 lists its trigger (`auto-cast when`), `priority`, `failsafe` and whether it is the signature.

### 3.11 Pacing: can players actually reach levels 10 and 20?

The XP curve in `GameScene.js` (line 853) needs **819 total XP for level 10 and 3,306 for level 20** (about four times more). Runs last 10 or 20 minutes (`RUN_MODES`), with bosses every 2.5 or 5 minutes. Before changing anything, run the existing bot playtest for each hero in both modes and record the time when level 10 and level 20 are reached. Targets:

| Mode | Level 10 | Level 20 |
|---|---|---|
| 10 minutes | 3:30 - 4:30 | 8:00 - 9:30 |
| 20 minutes | 4:00 - 5:30 | 9:00 - 12:00 |

If the targets are missed, tune the XP curve (the `nextXp` formula) or the XP value of enemies, never the milestone levels (10 and 20 are fixed design values). Report the before and after numbers.


---
## 4. Skill catalogue

Every entry below is final design intent. Names in French and Arabic are drafts for a native speaker to check. Descriptions need FR/AR translations before release (add them to `src/i18n/skills.js`).

### 4.1 Shared passives (the only skills every hero may have)

Both are granted automatically at level 1, take **no** slot, and can be upgraded through level-up cards (max level 5). They are the only skills allowed to exist on more than one hero.

#### 1. Survivor's Will `survivors-will` · PASSIVE
- **FR / AR:** Volonté du survivant / إرادة الناجي
- **In-game text:** Taking a hit makes you run faster for a moment.
- **Mechanics:** Every hero starts with this. +x% move speed for 2s after taking damage (cooldown 6s).
- **Trigger:** onDamageTaken · **Values by level 1-5:** +12 / 14 / 16 / 18 / 20 (% move speed, 2s, cooldown 6s)
- **Icon:** `skills/survivors-will.png` — **NEW art:** running footprints with a small heart
- **Animation (VFX):** Quick speed streaks behind the hero.
- **Sound (SFX):** None (passive).

#### 2. Jade Bounty `jade-bounty` · PASSIVE
- **FR / AR:** Butin de jade / غنيمة اليشم
- **In-game text:** Collecting experience gems heals you and pulls them in from afar.
- **Mechanics:** Every hero starts with this. XP gems restore x HP and are attracted from x% farther (base radius is 170 in GameScene).
- **Trigger:** onPickup · **Values by level 1-5:** 0.4 / 0.5 / 0.6 / 0.7 / 0.8 HP per gem; pickup range +25 / 30 / 35 / 40 / 45 %
- **Icon:** `skills/jade-bounty.png` — copy of existing `icon-63.png`
- **Animation (VFX):** Green sparkle on pickup.
- **Sound (SFX):** Existing pickup sound.


### 4.2 Balam (Jaguar Warrior): 16 active + 8 passive

| # | Skill | Kind | Family / trigger | Icon | CD | dps |
|---|---|---|---|---|---|---|
| 1 | Jaguar's Roar | active | Area / Control | icon-1.png | 9 | 4.4 |
| 2 | Obsidian Arc | active | Melee / Cleave | icon-2.png | 4.8 | 14.2 |
| 3 | Prowler's Leap | active | Mobility / Strike | icon-3.png | 7 | 8.9 |
| 4 | Claw Cyclone | active | Melee / Whirlwind | icon-5.png | 8.5 | 12.7 |
| 5 | Ceiba Breaker | active | Single Target / Stun | icon-6.png | 7 | 14.3 |
| 6 | Bloodless Hunt | active | Projectile / Homing | icon-7.png | 4.5 | 14.2 |
| 7 | Stone Maw | active | Trap / Stun | icon-8.png | 9 | 9.1 |
| 8 | War Drum | active | Aura / Pulse | icon-9.png | 12 | 12.1 |
| 9 | Sun Claw | active | Area / Burn | icon-10.png | 9.5 | 10.9 |
| 10 | Jaguar Echo | active | Summon / Chaser | icon-13.png | 11 | 13.0 |
| 11 | Fang Path | active | Line / Slow | icon-15.png | 5.4 | 10.0 |
| 12 | Hunter's Mark | active | Debuff / Utility | icon-11.png | 6.5 |  |
| 13 | Nine Lives | active | Heal / Mobility | icon-17.png | 16 |  |
| 14 | Black Mirror | active | Defense / Reflect | icon-18.png | 10 |  |
| 15 | Pyramid Rush | active | Mobility / Charge | icon-19.png | 8 | 11.5 |
| 16 | Heart of Balam | active | Defense / Burst | icon-21.png | 14 | 10.7 |
| 17 | Bloodlust | passive | onKill | NEW |  |  |
| 18 | Stonehide | passive | stat / HP threshold | icon-4.png |  |  |
| 19 | Predator's Rhythm | passive | onCrit | icon-20.png |  |  |
| 20 | Feast of the Fallen | passive | onKill counter | NEW |  |  |
| 21 | Obsidian Thorns | passive | onDamageTaken (melee) | NEW |  |  |
| 22 | Jaguar's Pride | passive | aura | NEW |  |  |
| 23 | Earthshaker | passive | onBasicAttack (every 4th) | icon-14.png |  |  |
| 24 | Wounded Fury | passive | HP below 50% | icon-0.png |  |  |


##### Balam active skills

#### 3. Jaguar's Roar `jaguar-roar` · ACTIVE
- **FR / AR:** Rugissement du jaguar / زئير الجاغوار
- **In-game text:** A terrifying roar hurts nearby foes and makes them flee for 2 seconds.
- **Mechanics:** Instant circle r190 on Balam. 40 dmg. Non-boss enemies get FEAR 2s (run directly away from Balam, cannot attack). Bosses get SLOW 35% for 2s instead. Knockback 120.
- **Numbers:** cooldown 9s · damage per cast (one target, all hits) ~40 = 4.4 dps · status: fear
- **Icon:** `skills/jaguar-roar.png` — copy of existing `icon-1.png`
- **Animation (VFX):** Three thin amber sound-wave rings expand one after another (2 frames each) while a jaguar-head silhouette flashes above Balam. Camera shake 4px, soft vignette pulse. Palette #f2b34c / #7a3b12.
- **Sound (SFX):** Deep jaguar growl layered with a low sub-boom, 0.8s, short reverb tail.
- **Replaces / notes:** jaguar-roar (text was generic 'Release a shockwave')

#### 4. Obsidian Arc `obsidian-arc` · ACTIVE
- **FR / AR:** Arc d'obsidienne / قوس السبج
- **In-game text:** A black-glass slash cleaves a wide arc and leaves enemies bleeding.
- **Mechanics:** 150 degree arc in aim direction, range 150. 48 dmg + BLEED 5 dps for 4s (does not stack, refreshes). Also damages props.
- **Numbers:** cooldown 4.8s · damage per cast (one target, all hits) ~68 = 14.2 dps · status: bleed
- **Icon:** `skills/obsidian-arc.png` — copy of existing `icon-2.png`
- **Animation (VFX):** Black-glass crescent sweeps across the arc in 5 frames; 8 obsidian shards scatter and fade; 50 ms hit-stop. Edge highlight #9b7bff on #15121c.
- **Sound (SFX):** Sharp glassy slash plus a short stone crack.
- **Replaces / notes:** obsidian-arc

#### 5. Prowler's Leap `prowlers-leap` · ACTIVE
- **FR / AR:** Bond du prédateur / وثبة المفترس
- **In-game text:** Leap onto the nearest enemy and land with a shockwave.
- **Mechanics:** Targets the nearest enemy within 330 (else aim direction). 0.35s jump arc, invulnerable while airborne. Landing shockwave r110: 62 dmg, knockback 150.
- **Numbers:** cooldown 7s · damage per cast (one target, all hits) ~62 = 8.9 dps
- **Icon:** `skills/prowlers-leap.png` — copy of existing `icon-3.png`
- **Animation (VFX):** Ground shadow shrinks as Balam rises (sprite scale 1.25), then a dust ring and 4 dirt chunks burst on landing; crack decal for 0.6s. #c58a3d / #6b4a2b.
- **Sound (SFX):** Rising whoosh, heavy thud with paw scrape.
- **Replaces / notes:** prowlers-leap

#### 6. Claw Cyclone `claw-cyclone` · ACTIVE
- **FR / AR:** Cyclone de griffes / إعصار المخالب
- **In-game text:** Spin in a whirlwind of claws, shredding everything around you.
- **Mechanics:** Balam spins for 1.5s: every 0.25s all enemies within r115 take 18 dmg (6 ticks). Move speed 60% during the spin, immune to knockback. NOT an orbit (that is Jade Halo).
- **Numbers:** cooldown 8.5s · damage per cast (one target, all hits) ~108 = 12.7 dps
- **Icon:** `skills/claw-cyclone.png` — copy of existing `icon-5.png`
- **Animation (VFX):** Balam sprite rotates through 8 frames; 3 golden claw-slash arcs trail behind him and form a ring on the ground; claws flash white on every tick. #f4c542 / #fff2b0.
- **Sound (SFX):** Looping airy whirr (1.5s) with a light claw tick per hit.
- **Replaces / notes:** claw-cyclone (did not orbit)

#### 7. Ceiba Breaker `ceiba-breaker` · ACTIVE
- **FR / AR:** Briseur de ceiba / محطم السيبا
- **In-game text:** Smash the nearest enemy with a ceiba log, stunning it.
- **Mechanics:** Targets nearest enemy within 200. 100 dmg + STUN 1.2s (boss: 0.4s). Leaves a crater decal 1s. Absorbs the old 'Temple Quake' stun idea.
- **Numbers:** cooldown 7s · damage per cast (one target, all hits) ~100 = 14.3 dps · status: stun
- **Icon:** `skills/ceiba-breaker.png` — copy of existing `icon-6.png`
- **Animation (VFX):** A giant translucent wooden log slams down from above (3-frame overlay), bark chips and green leaves fly out, crater decal. Camera shake 6px. #6b8e3a / #3b2a1a.
- **Sound (SFX):** Heavy wood crash plus a deep thump.
- **Replaces / notes:** ceiba-breaker

#### 8. Bloodless Hunt `bloodless-hunt` · ACTIVE
- **FR / AR:** Chasse spectrale / الصيد الطيفي
- **In-game text:** A spectral fang hunts down the healthiest enemy on screen.
- **Mechanics:** Homing fang (speed 640, turn rate 240 deg/s) toward the HIGHEST-HP enemy within 520. 44 dmg + 8% of the target's max HP (bonus capped at 80).
- **Numbers:** cooldown 4.5s · damage per cast (one target, all hits) ~64 = 14.2 dps
- **Icon:** `skills/bloodless-hunt.png` — copy of existing `icon-7.png`
- **Animation (VFX):** Cyan jaguar-fang projectile with a comet tail of pale wisps; impact shows a fang-shaped flash and 3 bite marks. #5fe3f2 / #dff9ff.
- **Sound (SFX):** Ghostly whispering whoosh, wet bite on impact.
- **Replaces / notes:** bloodless-hunt (did not target healthiest)

#### 9. Stone Maw `stone-maw` · ACTIVE
- **FR / AR:** Mâchoire de pierre / فك الحجر
- **In-game text:** Plant a stone jaw that snaps shut on the first enemies to step near it.
- **Mechanics:** Places a jaw on the densest enemy cluster within 400. Arms after 0.4s, lasts 6s. Snaps when an enemy enters r70 or after 2.5s armed: 82 dmg in r120 + STUN 1.0s.
- **Numbers:** cooldown 9s · damage per cast (one target, all hits) ~82 = 9.1 dps · status: stun
- **Icon:** `skills/stone-maw.png` — copy of existing `icon-8.png`
- **Animation (VFX):** Stone jaw rises from the ground (4 frames); armed state has a glowing sand-gold rune ring; snap = dust burst and grey shards. #8a8fa0 / #c9b37a.
- **Sound (SFX):** Grinding stone rise, huge stone clamp.
- **Replaces / notes:** stone-maw (was generic trap)

#### 10. War Drum `war-drum` · ACTIVE
- **FR / AR:** Tambour de guerre / طبل الحرب
- **In-game text:** Beat a war drum: pulses damage foes and quicken your attacks.
- **Mechanics:** 6s. Every 1s a pulse r150 deals 20 dmg. Every 3rd pulse is a big one (45 dmg, knockback 200). Balam gains +15% attack speed for the duration.
- **Numbers:** cooldown 12s · damage per cast (one target, all hits) ~145 = 12.1 dps
- **Icon:** `skills/war-drum.png` — copy of existing `icon-9.png`
- **Animation (VFX):** A floating drum above Balam pulses on each beat; red-brown rings expand rhythmically (small, small, LARGE); pixel note glyphs radiate. #b5452b / #f0c27a.
- **Sound (SFX):** Tribal drum loop: two soft hits then one heavy, 60 bpm.
- **Replaces / notes:** war-drum (fired 8 projectiles)

#### 11. Sun Claw `sun-claw` · ACTIVE
- **FR / AR:** Griffe solaire / مخلب الشمس
- **In-game text:** Four golden claw slashes burn everything around you.
- **Mechanics:** Four crescent slashes at 90 degree spacing sweep out to r220 in 0.3s. Each enemy is hit once: 74 dmg + BURN 10 dps for 3s.
- **Numbers:** cooldown 9.5s · damage per cast (one target, all hits) ~104 = 10.9 dps · status: burn
- **Icon:** `skills/sun-claw.png` — copy of existing `icon-10.png`
- **Animation (VFX):** Four sun-gold crescent slashes rotate outward, lens-flare sprite at the centre for 0.2s, floating embers. #ffd45a / #ff8a1f.
- **Sound (SFX):** Bright crackling flare with a sizzle.
- **Replaces / notes:** sun-claw (same ring as every nova)

#### 12. Jaguar Echo `jaguar-echo` · ACTIVE
- **FR / AR:** Écho du jaguar / صدى الجاغوار
- **In-game text:** A spectral jaguar chases and pounces on enemies for you.
- **Mechanics:** One cyan jaguar spirit (recast replaces it) for 10s. Chases the nearest enemy and attacks every 0.7s for 10 dmg in melee range 60. Moves at 280 speed.
- **Numbers:** cooldown 11s · damage per cast (one target, all hits) ~143 = 13.0 dps
- **Icon:** `skills/jaguar-echo.png` — copy of existing `icon-13.png`
- **Animation (VFX):** Own 4-frame run + 3-frame pounce sprites in cyan; pale pawprint trail; blue mist puff on spawn. #5fe3f2 / #2b6f8f.
- **Sound (SFX):** Low spirit growl on spawn, soft paw loops, short bite on hit.
- **Replaces / notes:** jaguar-echo (stationary turret with Ixchel sprite)

#### 13. Fang Path `fang-path` · ACTIVE
- **FR / AR:** Chemin des crocs / طريق الأنياب
- **In-game text:** Jade fangs burst from the earth in a line and slow what they hit.
- **Mechanics:** 8 fangs erupt along 390 in the aim direction, staggered 60 ms apart. Each hit once: 54 dmg + SLOW 40% for 2s.
- **Numbers:** cooldown 5.4s · damage per cast (one target, all hits) ~54 = 10.0 dps
- **Icon:** `skills/fang-path.png` — copy of existing `icon-15.png`
- **Animation (VFX):** Jade tooth spikes rise sequentially (3-frame rise each) with green dust and a faint glow line. #4fd6a0 / #d8fff0.
- **Sound (SFX):** Rapid run of bone-stone cracks rising in pitch.
- **Replaces / notes:** fang-path

#### 14. Hunter's Mark `hunters-mark` · ACTIVE
- **FR / AR:** Marque du chasseur / علامة الصياد
- **In-game text:** Mark the 3 most dangerous enemies. They take extra damage.
- **Mechanics:** Marks the 3 enemies with the highest threat within 360 (bosses first, then highest damage). Marked enemies take +30% damage from all sources for 6s. A marked enemy that dies restores 4 HP to Balam. Only one mark source exists in the game (allies no longer mark).
- **Numbers:** cooldown 6.5s · status: vulnerable
- **Icon:** `skills/hunters-mark.png` — copy of existing `icon-11.png`
- **Animation (VFX):** Red claw-scratch glyph (3 slashes) stamped above each target and pulsing for 6s; death releases red sparks that fly to Balam. #d9413a / #ffb3a0.
- **Sound (SFX):** Three quick claw scratches, low chime when marked.
- **Replaces / notes:** hunters-mark (did not mark)

#### 15. Nine Lives `nine-lives` · ACTIVE
- **FR / AR:** Neuf vies / تسع أرواح
- **In-game text:** Heal instantly and sprint away on spirit paws.
- **Mechanics:** Heal 26 + 20% of missing HP. +25% move speed for 4s.
- **Numbers:** cooldown 16s
- **Icon:** `skills/nine-lives.png` — copy of existing `icon-17.png`
- **Animation (VFX):** Nine tiny golden jaguar silhouettes spiral up from Balam and fade; warm gold aura 0.6s; small green crosses. #ffd45a / #9ef0a8.
- **Sound (SFX):** Soft choir swell with a purr.
- **Replaces / notes:** nine-lives (no speed)

#### 16. Black Mirror `black-mirror` · ACTIVE
- **FR / AR:** Miroir noir / المرآة السوداء
- **In-game text:** Raise an obsidian mirror that throws enemy shots back at them.
- **Mechanics:** 4s. A 120 degree arc around Balam reflects enemy projectiles at 150% damage back along their path. Melee attackers take 15 thorn damage per hit.
- **Numbers:** cooldown 10s · status: reflect
- **Icon:** `skills/black-mirror.png` — copy of existing `icon-18.png`
- **Animation (VFX):** Obsidian disc with a violet rim shimmering as a translucent 120 degree barrier; reflected shots flash violet and flip direction. #2a2540 / #b58cff.
- **Sound (SFX):** Glassy ring on cast, metallic ping per reflection.
- **Replaces / notes:** black-mirror (plain shield)

#### 17. Pyramid Rush `pyramid-rush` · ACTIVE
- **FR / AR:** Charge de la pyramide / اندفاعة الهرم
- **In-game text:** Charge forward like a falling temple, shoving everything aside.
- **Mechanics:** Charge 300 in 0.5s. Unstoppable (immune to stun/knockback). Enemies touched take 92 dmg once and are shoved aside (knockback 350). Ends with a small stomp r90.
- **Numbers:** cooldown 8s · damage per cast (one target, all hits) ~92 = 11.5 dps
- **Icon:** `skills/pyramid-rush.png` — copy of existing `icon-19.png`
- **Animation (VFX):** 5 stone-step afterimages trail behind Balam, long dust cloud line and brown speed streaks. #b08a5a / #6a4b2b.
- **Sound (SFX):** Rumbling stone drag and a charge growl.
- **Replaces / notes:** pyramid-rush

#### 18. Heart of Balam `heart-of-balam` · ACTIVE
- **FR / AR:** Coeur de Balam / قلب بالام
- **In-game text:** A golden ward protects you, then bursts into a roar when it ends.
- **Mechanics:** Gain a 55-point ward for 8s (+25% per level). When the ward breaks or expires it releases a roar: 150 dmg in r200.
- **Numbers:** cooldown 14s · damage per cast (one target, all hits) ~150 = 10.7 dps
- **Icon:** `skills/heart-of-balam.png` — copy of existing `icon-21.png`
- **Animation (VFX):** Glowing golden jaguar heart at Balam's chest with orbiting motes; translucent gold dome; break = expanding shockwave ring and crack pattern. #ffcf4a / #c4412b.
- **Sound (SFX):** Heartbeat loop under the ward; roar plus glass shatter on break.
- **Replaces / notes:** heart-of-balam (plain shield)


##### Balam passive skills

#### 19. Bloodlust `bloodlust` · PASSIVE
- **FR / AR:** Soif de sang / عطش الدم
- **In-game text:** Every kill grants stacking attack speed for a short time.
- **Mechanics:** Each kill: +x% attack speed for 3s, stacks up to 5 and each kill refreshes the timer.
- **Trigger:** onKill · **Values by level 1-5:** 4 / 5 / 6 / 7 / 8 (% attack speed per stack)
- **Icon:** `skills/bloodlust.png` — **NEW art:** bloody red jaguar fang with red speed lines
- **Animation (VFX):** Red claw-mark aura thickens with stacks; pips above the hero show stack count.
- **Sound (SFX):** Soft heartbeat tick per stack.

#### 20. Stonehide `stonehide` · PASSIVE
- **FR / AR:** Peau de pierre / جلد الحجر
- **In-game text:** The more wounded you are, the harder your skin becomes.
- **Mechanics:** +1 armor per 10% of missing HP, up to the listed maximum.
- **Trigger:** stat / HP threshold · **Values by level 1-5:** max +4 / 5 / 6 / 7 / 8 armor
- **Icon:** `skills/stonehide.png` — copy of existing `icon-4.png`
- **Animation (VFX):** Grey stone-plate overlay on the hero fades in as HP drops.
- **Sound (SFX):** Low stone creak when a new tier is reached.
- **Replaces / notes:** spotted-guard (icon re-used)

#### 21. Predator's Rhythm `predators-rhythm` · PASSIVE
- **FR / AR:** Rythme du prédateur / إيقاع المفترس
- **In-game text:** Critical hits shorten the cooldowns of your skills.
- **Mechanics:** Every critical hit reduces all active skill cooldowns by x seconds (internal cooldown 1s).
- **Trigger:** onCrit · **Values by level 1-5:** -0.4 / 0.5 / 0.6 / 0.7 / 0.8 s
- **Icon:** `skills/predators-rhythm.png` — copy of existing `icon-20.png`
- **Animation (VFX):** Gold pulse ring on the skill buttons plus a small paw flash on the hero.
- **Sound (SFX):** Short soft gong.
- **Replaces / notes:** night-pounce (crit refresh idea)

#### 22. Feast of the Fallen `feast-of-the-fallen` · PASSIVE
- **FR / AR:** Festin des vaincus / وليمة الساقطين
- **In-game text:** Every 12 kills restore a chunk of your health.
- **Mechanics:** Count kills; every 12th kill heals x% of max HP (counter shown as a small bar).
- **Trigger:** onKill counter · **Values by level 1-5:** 6 / 7 / 8 / 9 / 10 (% max HP) every 12 kills
- **Icon:** `skills/feast-of-the-fallen.png` — **NEW art:** jaguar jaws biting a glowing heart
- **Animation (VFX):** Green-gold spirit wisps stream from the last victim to Balam.
- **Sound (SFX):** Soft gulp plus a chime.

#### 23. Obsidian Thorns `obsidian-thorns` · PASSIVE
- **FR / AR:** Épines d'obsidienne / أشواك السبج
- **In-game text:** Enemies that hit you in melee are cut by obsidian spikes.
- **Mechanics:** A melee hit on Balam deals x + 15% of the damage taken back to the attacker.
- **Trigger:** onDamageTaken (melee) · **Values by level 1-5:** 8 / 10 / 12 / 14 / 16 flat damage
- **Icon:** `skills/obsidian-thorns.png` — **NEW art:** black obsidian spikes bursting from a stone skin
- **Animation (VFX):** Black shard burst at the attacker.
- **Sound (SFX):** Glass tick.

#### 24. Jaguar's Pride `jaguars-pride` · PASSIVE
- **FR / AR:** Fierté du jaguar / كبرياء الجاغوار
- **In-game text:** You fight better when surrounded.
- **Mechanics:** +x% damage for each enemy within r150 of Balam, counted up to 5 enemies.
- **Trigger:** aura · **Values by level 1-5:** +6 / 7 / 8 / 9 / 10 (% damage per nearby enemy, max 5)
- **Icon:** `skills/jaguars-pride.png` — **NEW art:** golden jaguar head with a crowd of small silhouettes
- **Animation (VFX):** A thin gold ring on the ground shows the r150 radius.
- **Sound (SFX):** None (passive).

#### 25. Earthshaker `earthshaker` · PASSIVE
- **FR / AR:** Briseur de terre / مزلزل الأرض
- **In-game text:** Every 4th basic attack slams the ground.
- **Mechanics:** 4th basic attack also releases a slam r120 for x% of weapon damage with knockback 150.
- **Trigger:** onBasicAttack (every 4th) · **Values by level 1-5:** 60 / 75 / 90 / 105 / 120 (% weapon damage)
- **Icon:** `skills/earthshaker.png` — copy of existing `icon-14.png`
- **Animation (VFX):** Small brown shockwave ring and 5 pebbles.
- **Sound (SFX):** Dull ground thump.
- **Replaces / notes:** temple-quake (concept)

#### 26. Wounded Fury `wounded-fury` · PASSIVE
- **FR / AR:** Fureur blessée / غضب الجريح
- **In-game text:** Below half health you hit harder and steal life.
- **Mechanics:** While HP < 50%: +x% damage and heal y% of damage dealt.
- **Trigger:** HP below 50% · **Values by level 1-5:** +20 / 25 / 30 / 35 / 40 (% damage); lifesteal 4 / 5 / 6 / 7 / 8 %
- **Icon:** `skills/wounded-fury.png` — copy of existing `icon-0.png`
- **Animation (VFX):** Red flame outline around the hero while active.
- **Sound (SFX):** Low growl on entering the state (cooldown 8s).


### 4.3 Ixchel (Mage): 16 active + 8 passive

| # | Skill | Kind | Family / trigger | Icon | CD | dps |
|---|---|---|---|---|---|---|
| 1 | Copal Star | active | Projectile / Pierce | icon-22.png | 3.8 | 13.7 |
| 2 | Jade Halo | active | Orbit / Block | icon-24.png | 8.5 | 13.2 |
| 3 | Ancestor Flame | active | Chain / Burn | icon-25.png | 6.8 | 9.1 |
| 4 | Moonwell | active | Zone / Slow | icon-26.png | 10 | 9.6 |
| 5 | Censer Wave | active | Cone / Confuse | icon-27.png | 5.2 | 9.6 |
| 6 | Verdant Mercy | active | Heal Zone | icon-31.png | 14 |  |
| 7 | Copal Veil | active | Defense / Mana | icon-29.png | 12 |  |
| 8 | Glyph Comet | active | Line / Scorch | icon-30.png | 7.5 | 13.9 |
| 9 | Cacao Bloom | active | Area / Poison | icon-28.png | 9 | 8.9 |
| 10 | Raincaller | active | Zone / Lightning | icon-32.png | 11 | 24.2 |
| 11 | Spirit Familiar | active | Summon / Harasser | icon-33.png | 10 | 15.0 |
| 12 | Serpent Coil | active | Control / Pull | icon-34.png | 8.6 | 8.8 |
| 13 | Jade Needles | active | Burst / Delayed | icon-35.png | 6 | 16.5 |
| 14 | Dreamwalk | active | Mobility / Phase | icon-37.png | 6.4 | 4.1 |
| 15 | Four Directions | active | Projectile / Cross | icon-38.png | 8 | 7.5 |
| 16 | Ixchel's Mantle | active | Buff / Resource | icon-41.png | 15 |  |
| 17 | Ancestral Echo | passive | onBasicAttack (every 5th) | icon-39.png |  |  |
| 18 | Mana Spring | passive | onKill counter | icon-40.png |  |  |
| 19 | Lunar Boon | passive | timer | icon-23.png |  |  |
| 20 | Rooted Meditation | passive | standing still | icon-36.png |  |  |
| 21 | Jade Resilience | passive | out of combat | NEW |  |  |
| 22 | Spirit Harvest | passive | onKill chance | NEW |  |  |
| 23 | Crescent Blessing | passive | onCrit | NEW |  |  |
| 24 | Mana Overflow | passive | mana above 90% | NEW |  |  |


##### Ixchel active skills

#### 27. Copal Star `copal-star` · ACTIVE
- **FR / AR:** Étoile de copal / نجمة الكوبال
- **In-game text:** A slow jade star pierces enemies and leaves slowing copal smoke.
- **Mechanics:** Star projectile speed 420, pierce 3, 52 dmg. Leaves a smoke trail for 2s that SLOWS enemies 30%.
- **Numbers:** cooldown 3.8s · mana 14 · damage per cast (one target, all hits) ~52 = 13.7 dps · status: slow
- **Icon:** `skills/copal-star.png` — copy of existing `icon-22.png`
- **Animation (VFX):** Five-point jade-white star spinning (4 frames) with grey-green smoke puffs left behind. #9ef0c8 / #5c6b66.
- **Sound (SFX):** Soft chime with a light crackle.
- **Replaces / notes:** copal-star

#### 28. Jade Halo `jade-halo` · ACTIVE
- **FR / AR:** Halo de jade / هالة اليشم
- **In-game text:** Jade beads orbit you, hurting enemies and blocking enemy shots.
- **Mechanics:** 7s. 4 beads truly orbit at r125 (1 rev per 1.1s). Each bead hits an enemy once per 1.0s for 16 dmg and destroys any enemy projectile it touches.
- **Numbers:** cooldown 8.5s · mana 22 · damage per cast (one target, all hits) ~112 = 13.2 dps
- **Icon:** `skills/jade-halo.png` — copy of existing `icon-24.png`
- **Animation (VFX):** Polished jade beads with a faint green ring trail; contact flare; a bead-pop flash when it blocks a shot. #4fd6a0 / #e8fff6.
- **Sound (SFX):** Glassy bead clacks over a soft hum loop.
- **Replaces / notes:** jade-halo (did not orbit)

#### 29. Ancestor Flame `ancestor-flame` · ACTIVE
- **FR / AR:** Flamme ancestrale / لهب الأسلاف
- **In-game text:** Blue-green spirit fire leaps between up to five enemies.
- **Mechanics:** Instant chain: up to 5 enemies, jump range 200, -10% damage per jump (47 base). Every enemy hit BURNS 5 dps for 3s. Only chain skill in the game (besides the passive Ancestral Echo).
- **Numbers:** cooldown 6.8s · mana 20 · damage per cast (one target, all hits) ~62 = 9.1 dps · status: burn
- **Icon:** `skills/ancestor-flame.png` — copy of existing `icon-25.png`
- **Animation (VFX):** Jagged blue-green flame arcs with a flame sprite at each node; ember flicker 0.5s. #3de0b0 / #1a6f8f.
- **Sound (SFX):** Crackle with a low whoosh per jump.
- **Replaces / notes:** ancestor-flame

#### 30. Moonwell `moonwell` · ACTIVE
- **FR / AR:** Puits lunaire / بئر القمر
- **In-game text:** Create a moon pool that slows enemies and refills your mana.
- **Mechanics:** 8s zone r145 at target area. Enemies inside: SLOW 40% and 12 dmg per second. Ixchel standing inside regains 4 mana per second. (Old version only blasted once.)
- **Numbers:** cooldown 10s · mana 18 · damage per cast (one target, all hits) ~96 = 9.6 dps · status: slow
- **Icon:** `skills/moonwell.png` — copy of existing `icon-26.png`
- **Animation (VFX):** Round pool of pale-blue water with a moon reflection, ripples and rising silver sparkles; fades in the last second. #8ec5ff / #e8f2ff.
- **Sound (SFX):** Watery shimmer loop with a soft flute note.
- **Replaces / notes:** moonwell (was a trap blast)

#### 31. Censer Wave `censer-wave` · ACTIVE
- **FR / AR:** Vague d'encens / موجة البخور
- **In-game text:** A wave of incense smoke shoves enemies back and confuses them.
- **Mechanics:** Cone 100 degrees, range 200. 50 dmg, knockback 250, CONFUSE 2s (enemies walk in random directions and do not attack).
- **Numbers:** cooldown 5.2s · mana 17 · damage per cast (one target, all hits) ~50 = 9.6 dps · status: confuse
- **Icon:** `skills/censer-wave.png` — copy of existing `icon-27.png`
- **Animation (VFX):** Rolling grey-green smoke billows fill the cone with swirling incense glyphs; a smoky ring after-image. #b8c9bd / #6f8f7f.
- **Sound (SFX):** Soft low whoosh with puffing exhales.
- **Replaces / notes:** censer-wave

#### 32. Verdant Mercy `verdant-mercy` · ACTIVE
- **FR / AR:** Grâce verdoyante / رحمة الطبيعة
- **In-game text:** Grow a glade that heals you and your ally while you stand in it.
- **Mechanics:** 6s healing circle r140 under Ixchel. Heals 8 HP per second to Ixchel and the ally inside (scaled by the heal stat). It stays where it was cast.
- **Numbers:** cooldown 14s · mana 28
- **Icon:** `skills/verdant-mercy.png` — copy of existing `icon-31.png`
- **Animation (VFX):** Ring of green sprouts and pink flowers growing (3 frames), soft green light column, floating leaves. #7be0a0 / #ff9ccf.
- **Sound (SFX):** Harp glissando with a wind chime.
- **Replaces / notes:** verdant-mercy (instant heal)

#### 33. Copal Veil `copal-veil` · ACTIVE
- **FR / AR:** Voile de copal / حجاب الكوبال
- **In-game text:** A smoke veil absorbs damage and turns part of it into mana.
- **Mechanics:** 6s absorb shield of 48 points. 50% of the damage it absorbs is returned as mana.
- **Numbers:** cooldown 12s · mana 24
- **Icon:** `skills/copal-veil.png` — copy of existing `icon-29.png`
- **Animation (VFX):** Translucent grey-violet smoke dome hugging Ixchel; absorbed hits become blue sparkles flying into her mana bar. #8f86b8 / #6ad0ff.
- **Sound (SFX):** Muffled cloth whoosh, glass ping on absorb.
- **Replaces / notes:** smoking-mirror (returned no mana, shared icon)

#### 34. Glyph Comet `glyph-comet` · ACTIVE
- **FR / AR:** Comète de glyphes / مذنب الرموز
- **In-game text:** A jade comet crashes down a line and scorches glowing glyphs into the ground.
- **Mechanics:** Comet strikes a line of 500 x 80 in front of Ixchel: 86 dmg. Leaves glyph decals for 3s that deal 6 dps to enemies standing on them.
- **Numbers:** cooldown 7.5s · mana 31 · damage per cast (one target, all hits) ~104 = 13.9 dps
- **Icon:** `skills/glyph-comet.png` — copy of existing `icon-30.png`
- **Animation (VFX):** Green comet with a long tail streaks along the path; star burst on impact; Maya glyph decals glow along the line. #3de0b0 / #f5e6a0.
- **Sound (SFX):** Rising scream then heavy impact.
- **Replaces / notes:** glyph-comet

#### 35. Cacao Bloom `cacao-bloom` · ACTIVE
- **FR / AR:** Floraison de cacao / إزهار الكاكاو
- **In-game text:** Cacao flowers burst under nearby enemies, poisoning them.
- **Mechanics:** Flowers sprout under the 5 nearest enemies. After 0.8s each bursts: 48 dmg r70 + POISON 8 dps for 4s.
- **Numbers:** cooldown 9s · mana 23 · damage per cast (one target, all hits) ~80 = 8.9 dps · status: poison
- **Icon:** `skills/cacao-bloom.png` — copy of existing `icon-28.png`
- **Animation (VFX):** Brown cacao-pod flowers open (4 frames) with pink petals and a brown spore cloud that drifts away. #7a4a2b / #ff9ccf.
- **Sound (SFX):** Soft pluck pop with a squelch.
- **Replaces / notes:** cacao-bloom (centered on caster)

#### 36. Raincaller `raincaller` · ACTIVE
- **FR / AR:** Invocatrice de pluie / داعية المطر
- **In-game text:** Call a storm cloud that follows enemy groups and strikes them with lightning.
- **Mechanics:** 6s cloud drifting (speed 90) toward the densest group. Every 0.7s lightning hits a random enemy under it for 31 dmg, 25% chance STUN 0.6s.
- **Numbers:** cooldown 11s · mana 32 · damage per cast (one target, all hits) ~266 = 24.2 dps · status: stun
- **Icon:** `skills/raincaller.png` — copy of existing `icon-32.png`
- **Animation (VFX):** Dark blue cloud sprite with rain streaks, 2-frame yellow-white lightning bolts, puddle splashes. #3f6fb5 / #fff3a0.
- **Sound (SFX):** Rain loop with thunder cracks.
- **Replaces / notes:** raincaller (impacts around nearest)

#### 37. Spirit Familiar `spirit-familiar` · ACTIVE
- **FR / AR:** Familier spirituel / الرفيق الروحي
- **In-game text:** A hummingbird spirit darts at enemies and feeds you mana.
- **Mechanics:** 10s flying familiar (recast replaces it). Circles Ixchel, dives at the priority/ranged enemy every 0.6s for 9 dmg. Each hit restores 1 mana.
- **Numbers:** cooldown 10s · mana 24 · damage per cast (one target, all hits) ~150 = 15.0 dps
- **Icon:** `skills/spirit-familiar.png` — copy of existing `icon-33.png`
- **Animation (VFX):** Iridescent green-blue hummingbird (4-frame wing flap) with shimmering dust; dive streak lines. #4fe0c8 / #ff6fb0.
- **Sound (SFX):** Buzzing hum loop with tiny chirps.
- **Replaces / notes:** spirit-familiar (stationary turret)

#### 38. Serpent Coil `serpent-coil` · ACTIVE
- **FR / AR:** Étreinte du serpent / التفاف الأفعى
- **In-game text:** A spectral serpent drags enemies together and crushes them.
- **Mechanics:** At target area r135: first PULLS enemies to the centre over 0.6s, then constricts: 76 dmg + STUN 1.0s.
- **Numbers:** cooldown 8.6s · mana 25 · damage per cast (one target, all hits) ~76 = 8.8 dps · status: pull
- **Icon:** `skills/serpent-coil.png` — copy of existing `icon-34.png`
- **Animation (VFX):** Translucent green serpent winds in a spiral (6 segments) then tightens; hiss puffs. #4fd68f / #c8ffd8.
- **Sound (SFX):** Hiss then a constricting creak.
- **Replaces / notes:** serpent-coil (plain trap blast)

#### 39. Jade Needles `jade-needles` · ACTIVE
- **FR / AR:** Aiguilles de jade / إبر اليشم
- **In-game text:** Needles stick in enemies and shatter a moment later.
- **Mechanics:** 10 needles in a full circle, 22 dmg each. A needle that hits sticks in the enemy and shatters 1.5s later for 50% of the hit damage in r50.
- **Numbers:** cooldown 6s · mana 19 · damage per cast (one target, all hits) ~99 = 16.5 dps
- **Icon:** `skills/jade-needles.png` — copy of existing `icon-35.png`
- **Animation (VFX):** Thin jade needles fly radially; stuck needles glow then shatter into green glass shards. #7bf0c0 / #d8fff0.
- **Sound (SFX):** Rapid thin whistles, glass shatter ticks.
- **Replaces / notes:** jade-needles

#### 40. Dreamwalk `dreamwalk` · ACTIVE
- **FR / AR:** Marche onirique / سير الأحلام
- **In-game text:** Slip into the spirit world, walk through enemies, and return with a shockwave.
- **Mechanics:** 1.5s intangible (cannot take damage, passes through enemies), +40% move speed. On return: shockwave r120 for 26 dmg.
- **Numbers:** cooldown 6.4s · mana 16 · damage per cast (one target, all hits) ~26 = 4.1 dps
- **Icon:** `skills/dreamwalk.png` — copy of existing `icon-37.png`
- **Animation (VFX):** Ixchel turns translucent blue-violet with a double afterimage and star mist; return = violet ripple ring. #9a8cff / #d8d0ff.
- **Sound (SFX):** Dreamy reversed-cymbal swell, soft pop on return.
- **Replaces / notes:** dreamwalk (plain dash)

#### 41. Four Directions `four-directions` · ACTIVE
- **FR / AR:** Quatre directions / الاتجاهات الأربعة
- **In-game text:** Four sacred bolts shoot north, east, south and west.
- **Mechanics:** Four bolts along the cardinal axes (independent of aim), 60 dmg, pierce 5, range 560.
- **Numbers:** cooldown 8s · mana 27 · damage per cast (one target, all hits) ~60 = 7.5 dps
- **Icon:** `skills/four-directions.png` — copy of existing `icon-38.png`
- **Animation (VFX):** A cross-shaped light appears on the ground, then four bolts leave with directional colours: east red #d9413a, north white #f2f2f2, west black with outline #1a1a1a, south yellow #ffd45a.
- **Sound (SFX):** Four ascending chime notes.
- **Replaces / notes:** four-directions (was a forward fan)

#### 42. Ixchel's Mantle `ixchels-mantle` · ACTIVE
- **FR / AR:** Manteau d'Ixchel / عباءة إكشيل
- **In-game text:** Wrap yourself in moonlight: more mana, cheaper spells.
- **Mechanics:** 6s: mana regeneration x3 and all active skills cost 30% less mana.
- **Numbers:** cooldown 15s · mana 30
- **Icon:** `skills/ixchels-mantle.png` — copy of existing `icon-41.png`
- **Animation (VFX):** Silver-blue cloak of light draped over Ixchel with floating stars; mana bar glows. #8ec5ff / #f5f0ff.
- **Sound (SFX):** Soft shimmering chord.
- **Replaces / notes:** ixchels-mantle (mana restored twice - bug)


##### Ixchel passive skills

#### 43. Ancestral Echo `ancestral-echo` · PASSIVE
- **FR / AR:** Écho ancestral / صدى الأسلاف
- **In-game text:** Every 5th basic attack chains to nearby enemies.
- **Mechanics:** The 5th basic attack chains to extra enemies within 220 at x% damage.
- **Trigger:** onBasicAttack (every 5th) · **Values by level 1-5:** 60 / 70 / 80 / 90 / 100 (% damage); extra targets 2 / 2 / 3 / 3 / 4
- **Icon:** `skills/ancestral-echo.png` — copy of existing `icon-39.png`
- **Animation (VFX):** Pale blue ghost-flame arcs between targets.
- **Sound (SFX):** Whispery crackle.

#### 44. Mana Spring `mana-spring` · PASSIVE
- **FR / AR:** Source de mana / ينبوع المانا
- **In-game text:** Every 15 kills refill a part of your mana.
- **Mechanics:** Count kills; every 15th kill restores x mana.
- **Trigger:** onKill counter · **Values by level 1-5:** 20 / 25 / 30 / 35 / 40 mana every 15 kills
- **Icon:** `skills/mana-spring.png` — copy of existing `icon-40.png`
- **Animation (VFX):** Blue droplets fly from the last victim into the mana bar.
- **Sound (SFX):** Soft water drop.

#### 45. Lunar Boon `lunar-boon` · PASSIVE
- **FR / AR:** Faveur lunaire / نعمة القمر
- **In-game text:** Every 20 seconds your next skill is free and stronger.
- **Mechanics:** Timer ready indicator on HUD. Next active skill costs 0 mana and deals +x% damage.
- **Trigger:** timer · **Values by level 1-5:** +50 / 60 / 70 / 80 / 90 (% damage); every 20 / 19 / 18 / 17 / 16 s
- **Icon:** `skills/lunar-boon.png` — copy of existing `icon-23.png`
- **Animation (VFX):** Small silver crescent glows over the skill bar when ready; consumed with a moon flash.
- **Sound (SFX):** Bell shimmer when ready.

#### 46. Rooted Meditation `rooted-meditation` · PASSIVE
- **FR / AR:** Méditation enracinée / التأمل المتجذر
- **In-game text:** Stand still to channel the world tree.
- **Mechanics:** After standing still 1.5s: +x% skill damage and +3 mana/s until you move.
- **Trigger:** standing still · **Values by level 1-5:** +15 / 20 / 25 / 30 / 35 (% skill damage); +3 mana per second
- **Icon:** `skills/rooted-meditation.png` — copy of existing `icon-36.png`
- **Animation (VFX):** Tiny roots and leaves ring Ixchel's feet while active.
- **Sound (SFX):** Soft wooden hum (looped, very quiet).

#### 47. Jade Resilience `jade-resilience` · PASSIVE
- **FR / AR:** Résilience de jade / صلابة اليشم
- **In-game text:** If nothing hurts you, a jade shield slowly builds up.
- **Mechanics:** If no damage was taken for 4s, gain 3 shield per second up to the listed maximum.
- **Trigger:** out of combat · **Values by level 1-5:** max shield 30 / 40 / 50 / 60 / 70
- **Icon:** `skills/jade-resilience.png` — **NEW art:** jade shield made of green crystal plates
- **Animation (VFX):** Green crystal facets stack around Ixchel as the shield grows.
- **Sound (SFX):** Soft crystal chime on full.

#### 48. Spirit Harvest `spirit-harvest` · PASSIVE
- **FR / AR:** Moisson des esprits / حصاد الأرواح
- **In-game text:** Defeated enemies sometimes release a healing wisp.
- **Mechanics:** On kill, chance to drop a wisp. Touching it restores 3 HP and 4 mana.
- **Trigger:** onKill chance · **Values by level 1-5:** 20 / 24 / 28 / 32 / 36 (% chance)
- **Icon:** `skills/spirit-harvest.png` — **NEW art:** floating pale green wisp with two small eyes
- **Animation (VFX):** Wisp rises from the corpse with a tiny trail; pickup sparkle.
- **Sound (SFX):** Whispery pickup chime.

#### 49. Crescent Blessing `crescent-blessing` · PASSIVE
- **FR / AR:** Bénédiction du croissant / بركة الهلال
- **In-game text:** Critical hits restore mana.
- **Mechanics:** Each critical hit restores x mana (internal cooldown 0.5s).
- **Trigger:** onCrit · **Values by level 1-5:** 3 / 4 / 5 / 6 / 7 mana
- **Icon:** `skills/crescent-blessing.png` — **NEW art:** silver crescent moon with a blue sparkle
- **Animation (VFX):** Blue sparkle flies from the target to Ixchel.
- **Sound (SFX):** Light crystal tick.

#### 50. Mana Overflow `mana-overflow` · PASSIVE
- **FR / AR:** Trop-plein de mana / فيض المانا
- **In-game text:** A full reservoir of mana powers your spells.
- **Mechanics:** While mana is at 90% or more: +x% damage and +10% cooldown recovery speed.
- **Trigger:** mana above 90% · **Values by level 1-5:** +20 / 25 / 30 / 35 / 40 (% damage); cooldown recovery +10 %
- **Icon:** `skills/mana-overflow.png` — **NEW art:** overflowing blue-white goblet with energy spilling out
- **Animation (VFX):** Blue energy ring around the mana bar and a faint aura on Ixchel.
- **Sound (SFX):** None (passive).


### 4.4 Kukul (Hunter): 16 active + 8 passive

| # | Skill | Kind | Family / trigger | Icon | CD | dps |
|---|---|---|---|---|---|---|
| 1 | Atlatl Volley | active | Projectile / Fan | icon-42.png | 5.4 | 18.5 |
| 2 | Featherstorm | active | Zone / Moving | icon-43.png | 9.5 | 14.7 |
| 3 | Serpent Path | active | Projectile / Wave | icon-44.png | 6.5 | 9.8 |
| 4 | Windstep | active | Mobility / Trail | icon-45.png | 5.5 | 9.6 |
| 5 | Quetzal Flip | active | Mobility / Shot | icon-46.png | 5.5 | 13.1 |
| 6 | Hunter's Snare | active | Control / Root | icon-47.png | 7.8 | 7.9 |
| 7 | Eagle Eye | active | Single Target / Charged | icon-51.png | 5.5 | 15.8 |
| 8 | Sun Dart | active | Projectile / Ricochet | icon-50.png | 6.6 | 39.5 |
| 9 | Storm Nest | active | Summon / Turret | icon-52.png | 10.5 | 11.4 |
| 10 | Plume Guard | active | Defense / Charges | icon-54.png | 11 |  |
| 11 | Cacao Bomb | active | Area / Lobbed | icon-55.png | 8.4 | 8.7 |
| 12 | Forked Flight | active | Projectile / Split | icon-56.png | 5.8 | 15.5 |
| 13 | Gale Ring | active | Area / Knockback | icon-49.png | 7.2 | 6.4 |
| 14 | Hunter's Trance | active | Buff / Damage | icon-16.png | 13 |  |
| 15 | Skyfall | active | Area / Barrage | icon-59.png | 12 | 8.0 |
| 16 | Kukulkan's Breath | active | Channel / Beam | icon-61.png | 10.5 | 15.2 |
| 17 | Sharpened Flint | passive | stat | icon-48.png |  |  |
| 18 | Venomous Darts | passive | onBasicHit | icon-60.png |  |  |
| 19 | Full Quiver | passive | onBasicAttack (every 6th) | icon-53.png |  |  |
| 20 | Hunter's Focus | passive | consecutive hits | NEW |  |  |
| 21 | Fleet Hunter | passive | after dash | icon-57.png |  |  |
| 22 | Jungle Instinct | passive | onDamageTaken | icon-58.png |  |  |
| 23 | Trophy Hunter | passive | onKill (tough/boss) | NEW |  |  |
| 24 | Steady Aim | passive | standing still | NEW |  |  |


##### Kukul active skills

#### 51. Atlatl Volley `atlatl-volley` · ACTIVE
- **FR / AR:** Volée d'atlatl / وابل الأتلاتل
- **In-game text:** A tight fan of five piercing darts.
- **Mechanics:** 5 darts, spread 0.13 rad, pierce 2, 20 dmg each, range 560. Close range hits with all five.
- **Numbers:** cooldown 5.4s · damage per cast (one target, all hits) ~100 = 18.5 dps
- **Icon:** `skills/atlatl-volley.png` — copy of existing `icon-42.png`
- **Animation (VFX):** Turquoise darts with red-feather fletching, a small muzzle burst of feathers. #3fd0d0 / #d9413a.
- **Sound (SFX):** Rapid thwip-thwip-thwip.
- **Replaces / notes:** atlatl-volley

#### 52. Featherstorm `featherstorm` · ACTIVE
- **FR / AR:** Tempête de plumes / عاصفة الريش
- **In-game text:** A storm of obsidian feathers drifts forward, shredding enemies.
- **Mechanics:** 4s. A whirl r70 travels forward at speed 160. Enemies inside take 14 dmg every 0.4s.
- **Numbers:** cooldown 9.5s · damage per cast (one target, all hits) ~140 = 14.7 dps
- **Icon:** `skills/featherstorm.png` — copy of existing `icon-43.png`
- **Animation (VFX):** Feather tornado funnel (6-frame rotation) of dark red and white feathers, feathers fly off outward. #a02a2a / #f4f0e6.
- **Sound (SFX):** Flapping whirr loop with slicing ticks.
- **Replaces / notes:** featherstorm (rain that fell on nearest)

#### 53. Serpent Path `serpent-path` · ACTIVE
- **FR / AR:** Sentier du serpent / درب الأفعى
- **In-game text:** A jade serpent weaves through a line of enemies.
- **Mechanics:** One bolt that moves in a sine wave (amplitude 60), speed 600, pierce 12, 64 dmg, range 560.
- **Numbers:** cooldown 6.5s · damage per cast (one target, all hits) ~64 = 9.8 dps
- **Icon:** `skills/serpent-path.png` — copy of existing `icon-44.png`
- **Animation (VFX):** Sinuous green serpent with a glowing head leaving a long wavy trail. #3de08f / #c8ffd8.
- **Sound (SFX):** Hissing slither whoosh.
- **Replaces / notes:** serpent-path (straight line)

#### 54. Windstep `windstep` · ACTIVE
- **FR / AR:** Pas du vent / خطوة الريح
- **In-game text:** Dash through danger leaving a cutting wind trail.
- **Mechanics:** Dash 250. 26 dmg to enemies passed through. Leaves a wind trail for 2s dealing 8 dmg per 0.3s. +30% move speed for 2s.
- **Numbers:** cooldown 5.5s · damage per cast (one target, all hits) ~53 = 9.6 dps
- **Icon:** `skills/windstep.png` — copy of existing `icon-45.png`
- **Animation (VFX):** Cyan speed streaks and a swirl sprite at the start; trail of translucent wind ribbons that fades over 2s. #6ad0ff / #e8fbff.
- **Sound (SFX):** Fast air rush.
- **Replaces / notes:** windstep + tailwind merged

#### 55. Quetzal Flip `quetzal-flip` · ACTIVE
- **FR / AR:** Saut du quetzal / قفزة الكيتزال
- **In-game text:** Flip away from danger while firing back.
- **Mechanics:** Back-flip 260 away from the nearest enemy (invulnerable during the flip) then fire 3 darts at it, 24 dmg each.
- **Numbers:** cooldown 5.5s · damage per cast (one target, all hits) ~72 = 13.1 dps
- **Icon:** `skills/quetzal-flip.png` — copy of existing `icon-46.png`
- **Animation (VFX):** Feather-coloured arc afterimage with a burst of red and green feathers at take-off. #d9413a / #3de08f.
- **Sound (SFX):** Feather flutter then three quick thwips.
- **Replaces / notes:** NEW (replaces quetzal-orbit)

#### 56. Hunter's Snare `hunter-snare` · ACTIVE
- **FR / AR:** Filet du chasseur / شبكة الصياد
- **In-game text:** Throw a woven net that roots enemies in place.
- **Mechanics:** Net lands at target area r120: 62 dmg and ROOT 2s (enemies cannot move but can still attack).
- **Numbers:** cooldown 7.8s · damage per cast (one target, all hits) ~62 = 7.9 dps · status: root
- **Icon:** `skills/hunter-snare.png` — copy of existing `icon-47.png`
- **Animation (VFX):** Brown woven net unfurls (3 frames) and drops with rope particles; sticky-grass decal. #a8743a / #3b2a1a.
- **Sound (SFX):** Rope whip and a soft thud.
- **Replaces / notes:** hunter-snare (trap blast)

#### 57. Eagle Eye `eagle-eye` · ACTIVE
- **FR / AR:** Oeil d'aigle / عين النسر
- **In-game text:** Hold still, focus, and fire a guaranteed critical shot.
- **Mechanics:** 0.6s focus (Kukul stands still, crosshair shown). Then one shot: 58 dmg, guaranteed critical, pierce 3, range 760. Moving cancels the focus (no cooldown).
- **Numbers:** cooldown 5.5s · damage per cast (one target, all hits) ~87 = 15.8 dps
- **Icon:** `skills/eagle-eye.png` — copy of existing `icon-51.png`
- **Animation (VFX):** Golden eye icon over the target with a shrinking ring; the shot is a thin bright gold beam; white star on impact. #ffd45a / #ffffff.
- **Sound (SFX):** Low tension riser then one sharp crack.
- **Replaces / notes:** eagle-eye (crit bonus only)

#### 58. Sun Dart `sun-dart` · ACTIVE
- **FR / AR:** Fléchette solaire / سهم الشمس
- **In-game text:** A golden dart bounces between enemies, hitting harder each time.
- **Mechanics:** Ricochet 5 times (range 280 per bounce): damage 43, then +10% on each bounce.
- **Numbers:** cooldown 6.6s · damage per cast (one target, all hits) ~261 = 39.5 dps
- **Icon:** `skills/sun-dart.png` — copy of existing `icon-50.png`
- **Animation (VFX):** Golden dart with a sun-spark trail; each bounce flashes a sunburst and an angular line. #ffd45a / #ff8a1f.
- **Sound (SFX):** Metal ping that rises in pitch on each bounce.
- **Replaces / notes:** sun-dart (plain chain)

#### 59. Storm Nest `storm-nest` · ACTIVE
- **FR / AR:** Nid de tempête / عش العاصفة
- **In-game text:** A feather nest that shoots wind darts at three enemies at once.
- **Mechanics:** 8s stationary nest. Every 0.8s fires at up to 3 different nearest enemies (12 dmg each). Targets are never shared when 2+ enemies exist.
- **Numbers:** cooldown 10.5s · damage per cast (one target, all hits) ~120 = 11.4 dps
- **Icon:** `skills/storm-nest.png` — copy of existing `icon-52.png`
- **Animation (VFX):** Nest with eggs, a small blue gale swirling above it, three thin dart lines. #7fb8ff / #a8743a.
- **Sound (SFX):** Chirp plus gust loops.
- **Replaces / notes:** storm-nest (used Ixchel scepter sprite)

#### 60. Plume Guard `plume-guard` · ACTIVE
- **FR / AR:** Garde de plumes / حارس الريش
- **In-game text:** Three feathers block the next three hits.
- **Mechanics:** 8s. Negates the next 3 separate instances of damage (projectile, melee or contact).
- **Numbers:** cooldown 11s
- **Icon:** `skills/plume-guard.png` — copy of existing `icon-54.png`
- **Animation (VFX):** Three quetzal feathers orbit the hero; each absorbed hit pops one in a green flash. #3de08f / #d9413a.
- **Sound (SFX):** Soft feather flutter, chime on absorb.
- **Replaces / notes:** plume-guard (small shield)

#### 61. Cacao Bomb `cacao-bomb` · ACTIVE
- **FR / AR:** Bombe de cacao / قنبلة الكاكاو
- **In-game text:** Lob a clay cacao bomb that explodes with beans.
- **Mechanics:** Lobbed in a 0.7s arc to a target within 400. Explodes r150: 73 dmg, knockback 200.
- **Numbers:** cooldown 8.4s · damage per cast (one target, all hits) ~73 = 8.7 dps
- **Icon:** `skills/cacao-bomb.png` — copy of existing `icon-55.png`
- **Animation (VFX):** Clay pot with a lit fuse arcing, ground shadow; brown-orange blast with cacao bean shrapnel. #a85a2a / #ffb347.
- **Sound (SFX):** Fuse hiss then a boom.
- **Replaces / notes:** cacao-bomb (ring around caster)

#### 62. Forked Flight `forked-flight` · ACTIVE
- **FR / AR:** Vol fourchu / الطيران المتشعب
- **In-game text:** One dart splits into three that each hunt a different target.
- **Mechanics:** A dart flies for 0.4s, then splits into 3 homing darts (30 dmg each) that choose different targets when possible.
- **Numbers:** cooldown 5.8s · damage per cast (one target, all hits) ~90 = 15.5 dps
- **Icon:** `skills/forked-flight.png` — copy of existing `icon-56.png`
- **Animation (VFX):** A single turquoise dart splits with a fork flash into three with curved trails. #3fd0d0 / #ffffff.
- **Sound (SFX):** Whistle then three soft ticks.
- **Replaces / notes:** forked-flight (7 darts at once)

#### 63. Gale Ring `gale-ring` · ACTIVE
- **FR / AR:** Anneau de bourrasque / حلقة العاصفة
- **In-game text:** A wind ring blasts enemies away and speeds you up.
- **Mechanics:** Ring expands to r250. 46 dmg, knockback 330. Kukul gains +25% move speed for 3s.
- **Numbers:** cooldown 7.2s · damage per cast (one target, all hits) ~46 = 6.4 dps
- **Icon:** `skills/gale-ring.png` — copy of existing `icon-49.png`
- **Animation (VFX):** Translucent white-blue expanding ring carrying leaf debris. #cfeaff / #6ad0ff.
- **Sound (SFX):** Strong gust blast.
- **Replaces / notes:** gale-ring

#### 64. Hunter's Trance `hunters-trance` · ACTIVE
- **FR / AR:** Transe du chasseur / نشوة الصياد
- **In-game text:** Enter a trance: faster, more critical, and darts curve toward targets.
- **Mechanics:** 6s: +30% attack speed, +20% crit chance, projectiles bend slightly toward enemies.
- **Numbers:** cooldown 13s
- **Icon:** `skills/hunters-trance.png` — copy of existing `icon-16.png`
- **Animation (VFX):** Kukul's eyes glow gold; a faint crosshair reticle orbits him.
- **Sound (SFX):** Slow heartbeat, one bell.
- **Replaces / notes:** NEW (replaces camouflage)

#### 65. Skyfall `skyfall` · ACTIVE
- **FR / AR:** Chute du ciel / سقوط السماء
- **In-game text:** A rain of heavy darts falls over a wide area.
- **Mechanics:** 0.6s red telegraph circles. Then 12 darts over 1.5s across r360, 40 dmg each, impact r50.
- **Numbers:** cooldown 12s · damage per cast (one target, all hits) ~96 = 8.0 dps
- **Icon:** `skills/skyfall.png` — copy of existing `icon-59.png`
- **Animation (VFX):** Red telegraph circles, darkened sky overlay, darts with smoke trails, dust on impacts; camera shake 8px. #d9413a / #3b2a1a.
- **Sound (SFX):** Distant whistling rain of darts and impacts.
- **Replaces / notes:** skyfall

#### 66. Kukulkan's Breath `kukulkans-breath` · ACTIVE
- **FR / AR:** Souffle de Kukulkan / نفس كوكولكان
- **In-game text:** Channel a feathered-serpent beam through a line of enemies.
- **Mechanics:** Channel 1.5s (Kukul moves at 50% speed). Beam 520 x 60. Hits every 0.15s for 16 dmg.
- **Numbers:** cooldown 10.5s · damage per cast (one target, all hits) ~160 = 15.2 dps
- **Icon:** `skills/kukulkans-breath.png` — copy of existing `icon-61.png`
- **Animation (VFX):** Quetzal serpent head at the origin breathes a beam of green, turquoise and gold with flowing scales. #3de08f / #ffd45a.
- **Sound (SFX):** Sustained roaring wind layered with chimes.
- **Replaces / notes:** kukulkans-breath (cone)


##### Kukul passive skills

#### 67. Sharpened Flint `sharpened-flint` · PASSIVE
- **FR / AR:** Silex aiguisé / صوان مسنن
- **In-game text:** Your projectiles pierce more enemies.
- **Mechanics:** Adds x to the pierce of all basic and skill projectiles.
- **Trigger:** stat · **Values by level 1-5:** pierce +1 / +1 / +2 / +2 / +3
- **Icon:** `skills/sharpened-flint.png` — copy of existing `icon-48.png`
- **Animation (VFX):** White glint on dart tips.
- **Sound (SFX):** None (passive).

#### 68. Venomous Darts `venomous-darts` · PASSIVE
- **FR / AR:** Fléchettes venimeuses / سهام سامة
- **In-game text:** Your basic darts poison enemies.
- **Mechanics:** Each basic hit applies POISON (x dps for 3s, up to 3 stacks).
- **Trigger:** onBasicHit · **Values by level 1-5:** 4 / 5 / 6 / 7 / 8 poison dps (3s, stacks to 3)
- **Icon:** `skills/venomous-darts.png` — copy of existing `icon-60.png`
- **Animation (VFX):** Green droplets on poisoned enemies.
- **Sound (SFX):** Soft sizzle.

#### 69. Full Quiver `full-quiver` · PASSIVE
- **FR / AR:** Carquois plein / جعبة ممتلئة
- **In-game text:** Every 6th shot fires a spread of darts.
- **Mechanics:** The 6th basic attack fires x darts in a spread.
- **Trigger:** onBasicAttack (every 6th) · **Values by level 1-5:** 3 / 3 / 4 / 4 / 5 darts
- **Icon:** `skills/full-quiver.png` — copy of existing `icon-53.png`
- **Animation (VFX):** Quiver sprite flashes on the 6th shot.
- **Sound (SFX):** Quick extra thwips.

#### 70. Hunter's Focus `hunters-focus` · PASSIVE
- **FR / AR:** Concentration du chasseur / تركيز الصياد
- **In-game text:** Keep hitting the same enemy to deal more damage.
- **Mechanics:** +x% damage per consecutive hit on the same enemy. Switching target resets stacks.
- **Trigger:** consecutive hits · **Values by level 1-5:** +6 / 7 / 8 / 9 / 10 (% per hit, max 5 stacks)
- **Icon:** `skills/hunters-focus.png` — **NEW art:** crosshair over a hawk eye
- **Animation (VFX):** Small crosshair pips above the target.
- **Sound (SFX):** Light tick per stack.

#### 71. Fleet Hunter `fleet-hunter` · PASSIVE
- **FR / AR:** Chasseur agile / الصياد السريع
- **In-game text:** After a dash, your next shot hits much harder.
- **Mechanics:** After Dash, Windstep or Quetzal Flip: the next basic attack within 3s deals +x% damage.
- **Trigger:** after dash · **Values by level 1-5:** +60 / 75 / 90 / 105 / 120 (% damage)
- **Icon:** `skills/fleet-hunter.png` — copy of existing `icon-57.png`
- **Animation (VFX):** White wind swirl on the dart.
- **Sound (SFX):** Quick whoosh on the next shot.

#### 72. Jungle Instinct `jungle-instinct` · PASSIVE
- **FR / AR:** Instinct de la jungle / غريزة الغابة
- **In-game text:** Sometimes you simply are not there when the hit lands.
- **Mechanics:** x% chance to completely avoid any hit.
- **Trigger:** onDamageTaken · **Values by level 1-5:** 8 / 10 / 12 / 14 / 16 (% dodge)
- **Icon:** `skills/jungle-instinct.png` — copy of existing `icon-58.png`
- **Animation (VFX):** Leaf burst and a ghost afterimage when dodging.
- **Sound (SFX):** Quick leaf rustle.

#### 73. Trophy Hunter `trophy-hunter` · PASSIVE
- **FR / AR:** Chasseur de trophées / صائد الغنائم
- **In-game text:** Killing a tough enemy or boss heals you and strengthens you.
- **Mechanics:** Killing a jaguar, priest or any boss restores 20% max HP and grants +x% damage for 20s.
- **Trigger:** onKill (tough/boss) · **Values by level 1-5:** 20% HP; +10 / 12 / 14 / 16 / 18 (% damage for 20s)
- **Icon:** `skills/trophy-hunter.png` — **NEW art:** jaguar skull trophy on a spear
- **Animation (VFX):** Gold feather burst on the kill.
- **Sound (SFX):** Triumphant short horn.

#### 74. Steady Aim `steady-aim` · PASSIVE
- **FR / AR:** Visée stable / تصويب ثابت
- **In-game text:** Stand still to line up critical shots.
- **Mechanics:** After standing still 1s: +x% crit chance until you move.
- **Trigger:** standing still · **Values by level 1-5:** +25 / 30 / 35 / 40 / 45 (% crit chance)
- **Icon:** `skills/steady-aim.png` — **NEW art:** small sniper reticle in a green circle
- **Animation (VFX):** Thin reticle ring around Kukul while active.
- **Sound (SFX):** None (passive).


### 4.5 Allies

Allies are automatic: keep the current way allies receive skills during a run. Every ally has 8 skills (6 active + 2 passive). Active ally skills fire by themselves when the listed **auto-cast condition** is true and the cooldown is ready. Allies must never share an icon, name, mechanic or animation with a hero skill.


#### Ally: Saintess (Healer / support)

#### 75. Healing Circle `healing-circle` · ACTIVE
- **FR / AR:** Cercle de soin / دائرة الشفاء
- **In-game text:** Creates a healing circle under the hero.
- **Mechanics:** Circle r150 under the hero for 5s, heals 8 HP per second (x ally power).
- **Numbers:** cooldown 14s · auto-cast when: hero HP below 85% · priority 1 · failsafe no · **SIGNATURE (equipped on arrival)**
- **Icon:** `skills/healing-circle.png` — **NEW art:** green ring of lotus petals around a glowing cross
- **Animation (VFX):** Jade ring with rotating petals and soft light pillars.
- **Sound (SFX):** Warm harp swell with a bell.
- **Replaces / notes:** renew

#### 76. Jade Ward `jade-ward` · ACTIVE
- **FR / AR:** Garde de jade / حاجز اليشم
- **In-game text:** Periodically shields the hero.
- **Mechanics:** Every 10s the hero gains a 30-point shield (cap: 50% of max HP).
- **Numbers:** cooldown 10s · auto-cast when: always (timer) · priority 3 · failsafe no
- **Icon:** `skills/jade-ward.png` — **NEW art:** hexagonal jade shield with a green gem
- **Animation (VFX):** Jade hexagon flash around the hero.
- **Sound (SFX):** Glass chime.
- **Replaces / notes:** blessing

#### 77. Cleansing Light `cleansing-light` · ACTIVE
- **FR / AR:** Lumière purificatrice / نور التطهير
- **In-game text:** Clears enemy projectiles and removes ailments.
- **Mechanics:** Removes enemy projectiles within r210 and cleanses slow, poison, bleed, burn and confuse from the hero. 2s immunity to slows.
- **Numbers:** cooldown 10s · auto-cast when: hero has a debuff or 3+ enemy projectiles near · priority 2 · failsafe no
- **Icon:** `skills/cleansing-light.png` — **NEW art:** white-gold sun cross with falling feathers
- **Animation (VFX):** White-gold light wave ring with feather particles.
- **Sound (SFX):** Pure choir note.
- **Replaces / notes:** purify

#### 78. Sanctuary Dome `sanctuary-dome` · ACTIVE
- **FR / AR:** Dôme sanctuaire / قبة الملاذ
- **In-game text:** Raises a dome that reduces damage inside.
- **Mechanics:** Dome r130 centred on the hero for 5s. Damage taken by the hero inside is reduced by 30%.
- **Numbers:** cooldown 16s · auto-cast when: 3+ enemies within 200 of the hero · priority 2 · failsafe yes
- **Icon:** `skills/sanctuary-dome.png` — **NEW art:** pale-gold geometric dome
- **Animation (VFX):** Hexagon panes of pale gold light.
- **Sound (SFX):** Low resonant hum.
- **Replaces / notes:** sanctuary

#### 79. Radiant Beacon `radiant-beacon` · ACTIVE
- **FR / AR:** Phare radieux / المنارة المشعة
- **In-game text:** Plants a beacon that makes the hero faster and more agile.
- **Mechanics:** Beacon at the hero for 8s. Hero within r150: +20% attack speed and +10% move speed.
- **Numbers:** cooldown 18s · auto-cast when: enemies present · priority 3 · failsafe yes
- **Icon:** `skills/radiant-beacon.png` — **NEW art:** golden light pillar on a stone base
- **Animation (VFX):** Golden pillar with rising sparks and a spinning sun glyph.
- **Sound (SFX):** Bell and rising shimmer.
- **Replaces / notes:** (new)

#### 80. Lifebond `lifebond` · ACTIVE
- **FR / AR:** Lien de vie / رابطة الحياة
- **In-game text:** Links the saintess to the hero so damage heals.
- **Mechanics:** 6s: the hero heals 5% of the damage they deal.
- **Numbers:** cooldown 14s · auto-cast when: hero HP below 70% · priority 2 · failsafe no
- **Icon:** `skills/lifebond.png` — **NEW art:** red-gold thread connecting two small hearts
- **Animation (VFX):** Red-gold thread of light with floating hearts.
- **Sound (SFX):** Heartbeat with a soft chime.
- **Replaces / notes:** (new)

#### 81. Saving Grace `saving-grace` · PASSIVE
- **FR / AR:** Grâce salvatrice / النعمة المنقذة
- **In-game text:** Once in a while prevents a fatal blow.
- **Mechanics:** Prevents the hit that would kill the hero, heals 40% max HP, 2s invulnerability. Cooldown 60s.
- **Trigger:** fatal hit (cooldown 60s) · **Values by level 1-5:** heals 40% max HP
- **Icon:** `skills/saving-grace.png` — **NEW art:** white wings spread around a golden halo
- **Animation (VFX):** White-gold wings spread behind the hero, feather burst.
- **Sound (SFX):** Choir swell and a bell.
- **Replaces / notes:** rescue

#### 82. Sacred Fervor `sacred-fervor` · PASSIVE
- **FR / AR:** Ferveur sacrée / الحماسة المقدسة
- **In-game text:** The saintess inspires the hero to hit harder.
- **Mechanics:** Hero deals +x% damage while the saintess is alive.
- **Trigger:** stat · **Values by level 1-5:** +12 / 14 / 16 / 18 / 20 (% damage)
- **Icon:** `skills/sacred-fervor.png` — **NEW art:** flaming golden prayer hands
- **Animation (VFX):** Soft gold glow on the hero's weapon.
- **Sound (SFX):** None (passive).
- **Replaces / notes:** valor


#### Ally: Tank (Frontline protector)

#### 83. Bulwark Wall `bulwark-wall` · ACTIVE
- **FR / AR:** Mur de rempart / سور الحماية
- **In-game text:** Raises a stone wall that blocks shots.
- **Mechanics:** Stone wall 200 wide between the hero and the nearest threat for 5s. Blocks enemy projectiles. If the engine supports it, enemies are also body-blocked.
- **Numbers:** cooldown 14s · auto-cast when: enemy projectiles heading to the hero · priority 2 · failsafe no
- **Icon:** `skills/bulwark-wall.png` — **NEW art:** grey stone wall segment with carved Maya glyphs
- **Animation (VFX):** Stone slabs rise one by one (4 frames), dust at the base.
- **Sound (SFX):** Stone grinding and a thud.
- **Replaces / notes:** intercept

#### 84. War Cry `war-cry` · ACTIVE
- **FR / AR:** Cri de guerre / صرخة الحرب
- **In-game text:** Draws enemies toward the tank.
- **Mechanics:** Non-boss enemies within r330 target the Tank for 3s. Tank takes 50% less damage meanwhile.
- **Numbers:** cooldown 12s · auto-cast when: 3+ enemies near the hero · priority 2 · failsafe yes · **SIGNATURE (equipped on arrival)**
- **Icon:** `skills/war-cry.png` — **NEW art:** open mouth shouting with red sound waves
- **Animation (VFX):** Red-gold sound rings centred on the tank.
- **Sound (SFX):** Deep battle shout.
- **Replaces / notes:** taunt

#### 85. Shield Bash `shield-bash` · ACTIVE
- **FR / AR:** Coup de bouclier / ضربة الدرع
- **In-game text:** Bashes the biggest threat and stuns it.
- **Mechanics:** Targets the highest-threat enemy: 16 dmg + STUN 0.7s.
- **Numbers:** cooldown 8s · auto-cast when: enemy within 150 of the tank · priority 3 · failsafe no
- **Icon:** `skills/shield-bash.png` — **NEW art:** round stone shield with a spike hitting a spark
- **Animation (VFX):** Quick shield-shaped impact flash and white stars.
- **Sound (SFX):** Dull stone clang.
- **Replaces / notes:** bash

#### 86. Ground Slam `ground-slam` · ACTIVE
- **FR / AR:** Frappe du sol / ضربة الأرض
- **In-game text:** Slams the ground, stunning enemies around.
- **Mechanics:** r155: 30 dmg, knockup stun 0.8s.
- **Numbers:** cooldown 8s · auto-cast when: 2+ enemies near · priority 3 · failsafe yes
- **Icon:** `skills/ground-slam.png` — **NEW art:** stone fist striking cracked ground
- **Animation (VFX):** Brown shockwave ring with debris flying up.
- **Sound (SFX):** Heavy ground boom.
- **Replaces / notes:** shockwave

#### 87. Clay Bomb `clay-bomb` · ACTIVE
- **FR / AR:** Bombe d'argile / قنبلة الطين
- **In-game text:** Plants a proximity bomb.
- **Mechanics:** Bomb placed near the hero; explodes r135 when an enemy is within 60 or after 3s: 32 dmg.
- **Numbers:** cooldown 8s · auto-cast when: enemies near the hero · priority 3 · failsafe no
- **Icon:** `skills/clay-bomb.png` — **NEW art:** round clay pot with a spark fuse
- **Animation (VFX):** Pot with lit fuse; terracotta-coloured blast.
- **Sound (SFX):** Fuse hiss then boom.
- **Replaces / notes:** bomb

#### 88. Shield Throw `shield-throw` · ACTIVE
- **FR / AR:** Lancer de bouclier / رمية الدرع
- **In-game text:** Throws a stone shield that ricochets.
- **Mechanics:** Shield flies 300 and ricochets between up to 4 enemies, 24 dmg each, then returns to the tank.
- **Numbers:** cooldown 7s · auto-cast when: 2+ enemies in range 300 · priority 3 · failsafe no
- **Icon:** `skills/shield-throw.png` — **NEW art:** spinning stone disc with motion arcs
- **Animation (VFX):** Stone disc with a grey spin trail; ping sparks at each bounce.
- **Sound (SFX):** Whirring disc plus metal ping.
- **Replaces / notes:** (new)

#### 89. Bodyguard `bodyguard` · PASSIVE
- **FR / AR:** Garde du corps / حارس الجسد
- **In-game text:** Reduces damage the hero takes while the tank is close.
- **Mechanics:** Hero takes x% less damage while the tank is within 220.
- **Trigger:** aura · **Values by level 1-5:** -18 / 20 / 22 / 24 / 26 (% damage taken)
- **Icon:** `skills/bodyguard.png` — **NEW art:** stone-masked head with crossed spears
- **Animation (VFX):** Thin stone-grey ring under the hero.
- **Sound (SFX):** None (passive).
- **Replaces / notes:** guard

#### 90. Guardian Link `guardian-link` · PASSIVE
- **FR / AR:** Lien du gardien / رابط الحارس
- **In-game text:** The tank absorbs part of the damage the hero takes.
- **Mechanics:** While the tank is within 300, x% of damage to the hero is redirected to the tank (the tank cannot die).
- **Trigger:** onDamageTaken · **Values by level 1-5:** 20 / 25 / 30 / 35 / 40 (% redirected)
- **Icon:** `skills/guardian-link.png` — **NEW art:** two shields joined by a glowing chain
- **Animation (VFX):** Faint chain of light between hero and tank; spark when redirecting.
- **Sound (SFX):** Metal chain clink.
- **Replaces / notes:** (new)


#### Ally: Assassin (Single-target hunter)

#### 91. Ambush `ambush` · ACTIVE
- **FR / AR:** Embuscade / كمين
- **In-game text:** Blinks to the top threat and strikes.
- **Mechanics:** Blinks next to the highest-threat enemy: 34 dmg. Double damage if used within 3s of Vanish or Smoke Bomb.
- **Numbers:** cooldown 3s · auto-cast when: enemy within 260 · priority 3 · failsafe no · **SIGNATURE (equipped on arrival)**
- **Icon:** `skills/ambush.png` — copy of existing `icon-12.png`
- **Animation (VFX):** Shadowy blink afterimage then a quick blade X slash.
- **Sound (SFX):** Short blade swish.
- **Replaces / notes:** ambush

#### 92. Execute `execute` · ACTIVE
- **FR / AR:** Exécution / إعدام
- **In-game text:** Finishes weakened enemies.
- **Mechanics:** 22 dmg, or 65 dmg if the target has less than 35% HP. A kill refunds 2s of this cooldown.
- **Numbers:** cooldown 5s · auto-cast when: enemy below 35% HP within 200 · priority 3 · failsafe no
- **Icon:** `skills/execute.png` — **NEW art:** red skull with a dagger through it
- **Animation (VFX):** Red slash with a skull flash on kills.
- **Sound (SFX):** Heavy blade thunk.
- **Replaces / notes:** execute

#### 93. Venom Blade `venom-blade` · ACTIVE
- **FR / AR:** Lame venimeuse / نصل السم
- **In-game text:** Poisons the biggest threat.
- **Mechanics:** POISON 5 dps for 5s on the top threat, stacks up to 3.
- **Numbers:** cooldown 6s · auto-cast when: top threat within 180 · priority 3 · failsafe no
- **Icon:** `skills/venom-blade.png` — **NEW art:** dagger dripping green venom
- **Animation (VFX):** Green droplets and a small skull puff.
- **Sound (SFX):** Wet sizzle.
- **Replaces / notes:** venom

#### 94. Silencing Dart `silencing-dart` · ACTIVE
- **FR / AR:** Fléchette silencieuse / سهم الإسكات
- **In-game text:** Shuts down ranged enemies.
- **Mechanics:** Dart at the nearest ranged enemy: 8 dmg + SILENCE 3s (cannot shoot, bosses cannot cast).
- **Numbers:** cooldown 8s · auto-cast when: ranged enemy in range 400 · priority 2 · failsafe no
- **Icon:** `skills/silencing-dart.png` — **NEW art:** small dart with a closed mouth symbol
- **Animation (VFX):** Violet dart with a small mute-ring when it hits.
- **Sound (SFX):** Quick pff and a muted pop.
- **Replaces / notes:** silence

#### 95. Smoke Bomb `smoke-bomb` · ACTIVE
- **FR / AR:** Bombe fumigène / قنبلة الدخان
- **In-game text:** Throws smoke that blinds enemies.
- **Mechanics:** Smoke r140 at the hero's feet for 4s. Enemies inside are BLINDED (ranged attacks miss) and slowed 25%.
- **Numbers:** cooldown 10s · auto-cast when: 3+ enemies near the hero · priority 2 · failsafe yes
- **Icon:** `skills/smoke-bomb.png` — **NEW art:** dark grey smoke ball with a spark
- **Animation (VFX):** Dark grey smoke cloud that thins out toward its edge.
- **Sound (SFX):** Soft pop then a hiss.
- **Replaces / notes:** smoke

#### 96. Vanish `vanish` · ACTIVE
- **FR / AR:** Disparition / اختفاء
- **In-game text:** Makes the hero undetectable for a moment.
- **Mechanics:** 2.5s: enemies lose aggro and stop chasing the hero (bosses keep tracking). The hero's next attack deals +40% damage.
- **Numbers:** cooldown 18s · auto-cast when: hero HP below 50% or surrounded · priority 1 · failsafe no
- **Icon:** `skills/vanish.png` — **NEW art:** faded silhouette dissolving into smoke
- **Animation (VFX):** Hero becomes translucent with a shimmering outline; smoke puff.
- **Sound (SFX):** Soft whoosh and a fading echo.
- **Replaces / notes:** (new)

#### 97. Relentless Pursuit `relentless-pursuit` · PASSIVE
- **FR / AR:** Poursuite implacable / مطاردة لا هوادة فيها
- **In-game text:** The assassin attacks much faster.
- **Mechanics:** Assassin basic attacks are x% faster.
- **Trigger:** stat · **Values by level 1-5:** +35 / 40 / 45 / 50 / 55 (% assassin attack speed)
- **Icon:** `skills/relentless-pursuit.png` — **NEW art:** running wolf-like figure with speed lines
- **Animation (VFX):** Subtle red speed lines behind the assassin.
- **Sound (SFX):** None (passive).
- **Replaces / notes:** pursuit

#### 98. Bounty Contract `bounty-contract` · PASSIVE
- **FR / AR:** Contrat de prime / عقد المكافأة
- **In-game text:** Enemies killed by the assassin drop extra cacao.
- **Mechanics:** Enemies killed by the assassin drop +x% cacao. Killing the highest-threat enemy drops 3 bonus cacao.
- **Trigger:** onKill (assassin) · **Values by level 1-5:** +50 / 60 / 70 / 80 / 90 (% cacao)
- **Icon:** `skills/bounty-contract.png` — **NEW art:** rolled parchment with a gold coin
- **Animation (VFX):** Gold coin sparkle at the kill spot.
- **Sound (SFX):** Coin chime.
- **Replaces / notes:** (new)


### 4.6 Stat upgrades (level-up cards that are not skills)

They currently reuse skill icons. Each now gets its own file `skills/stat-<id>.png`.

| Id | EN | FR | AR | Effect | Icon |
|---|---|---|---|---|---|

| `might` | Might | Force | القوة | Damage +% | **NEW** `skills/stat-might.png`: obsidian blade edge glowing orange |

| `vigor` | Vigor | Vigueur | الحيوية | Max health | copy of `icon-62.png` as `skills/stat-vigor.png` |

| `haste` | Haste | Hâte | التسارع | Attack speed | **NEW** `skills/stat-haste.png`: feather with speed lines |

| `reach` | Reach | Portée | المدى | Area / range | **NEW** `skills/stat-reach.png`: concentric rings expanding |

| `swiftness` | Swiftness | Rapidité | السرعة | Move speed | copy of `icon-65.png` as `skills/stat-swiftness.png` |

| `critical` | Critical | Critique | الضربة الحرجة | Crit chance | **NEW** `skills/stat-critical.png`: jaguar eye inside crosshair star |

| `armor` | Armor | Armure | الدرع | Armor | **NEW** `skills/stat-armor.png`: carved stone breastplate |

| `renewal` | Renewal | Renouveau | التجدد | HP regen | **NEW** `skills/stat-renewal.png`: green leaf with a healing dewdrop |

| `wisdom` | Wisdom | Sagesse | الحكمة | XP gain | **NEW** `skills/stat-wisdom.png`: glowing scroll with a green glyph |

| `fortune` | Fortune | Fortune | الثروة | Cacao gain | copy of `icon-64.png` as `skills/stat-fortune.png` |


---
## 5. Icon plan

**66 existing icons** (icon-0 to icon-65, every one of the 66 is used exactly once) are copied to unique per-skill files, and **42 new icons** are needed. Run the included `migrate_icons.mjs` to do the copying. Nothing may keep pointing at `icon-N.png` afterwards: the new naming makes a shared icon impossible by construction (one file per skill id).


### 5.1 File naming

```
public/assets/pixel/skills/<skill-id>.png         one icon per skill, passive and ally skill
public/assets/pixel/skills/stat-<id>.png          stat upgrades
public/assets/pixel/skills/ui-<id>.png            optional HUD/shrine icons
```

Icon size and look: match the existing set (square, 96-128 px source, gold frame with teal gems in the corners, dark interior, one clear subject, strong silhouette that reads at 48 px).

### 5.2 Prompt template for new icons

> Pixel-art game skill icon, square, ornate gold frame with small teal jade gems in the corners, dark background, Mesoamerican (Maya/Aztec) fantasy style, centred subject: **[subject from the table below]**, limited warm palette with jade-green and gold accents, crisp pixel edges, no text, no watermark.

Generate several variants, keep the one whose silhouette is distinct from every other icon in the set, then downscale with nearest-neighbour. Record the tool and prompt in your provenance document (you already keep one) and confirm the tool's licence allows commercial use before selling the supporter pack.

### 5.3 Rules

- Never reuse an icon for a different skill. If a skill is renamed it keeps its icon; if it is replaced, the new skill gets new art.
- Two icons must not look alike at 48 px (for example several blue swirls). If two do, redraw one.
- Run `validate_skills.mjs --assets public/assets/pixel` after adding files. Add `--allow-new` while art is still missing.


### 5.4 New icons to create (42)

| # | File | For | Subject (put into the prompt template) |
|---|---|---|---|

| 1 | `skills/bloodlust.png` | Bloodlust | bloody red jaguar fang with red speed lines |

| 2 | `skills/feast-of-the-fallen.png` | Feast of the Fallen | jaguar jaws biting a glowing heart |

| 3 | `skills/obsidian-thorns.png` | Obsidian Thorns | black obsidian spikes bursting from a stone skin |

| 4 | `skills/jaguars-pride.png` | Jaguar's Pride | golden jaguar head with a crowd of small silhouettes |

| 5 | `skills/jade-resilience.png` | Jade Resilience | jade shield made of green crystal plates |

| 6 | `skills/spirit-harvest.png` | Spirit Harvest | floating pale green wisp with two small eyes |

| 7 | `skills/crescent-blessing.png` | Crescent Blessing | silver crescent moon with a blue sparkle |

| 8 | `skills/mana-overflow.png` | Mana Overflow | overflowing blue-white goblet with energy spilling out |

| 9 | `skills/hunters-focus.png` | Hunter's Focus | crosshair over a hawk eye |

| 10 | `skills/trophy-hunter.png` | Trophy Hunter | jaguar skull trophy on a spear |

| 11 | `skills/steady-aim.png` | Steady Aim | small sniper reticle in a green circle |

| 12 | `skills/survivors-will.png` | Survivor's Will | running footprints with a small heart |

| 13 | `skills/healing-circle.png` | Healing Circle | green ring of lotus petals around a glowing cross |

| 14 | `skills/jade-ward.png` | Jade Ward | hexagonal jade shield with a green gem |

| 15 | `skills/cleansing-light.png` | Cleansing Light | white-gold sun cross with falling feathers |

| 16 | `skills/sanctuary-dome.png` | Sanctuary Dome | pale-gold geometric dome |

| 17 | `skills/radiant-beacon.png` | Radiant Beacon | golden light pillar on a stone base |

| 18 | `skills/lifebond.png` | Lifebond | red-gold thread connecting two small hearts |

| 19 | `skills/saving-grace.png` | Saving Grace | white wings spread around a golden halo |

| 20 | `skills/sacred-fervor.png` | Sacred Fervor | flaming golden prayer hands |

| 21 | `skills/bulwark-wall.png` | Bulwark Wall | grey stone wall segment with carved Maya glyphs |

| 22 | `skills/war-cry.png` | War Cry | open mouth shouting with red sound waves |

| 23 | `skills/shield-bash.png` | Shield Bash | round stone shield with a spike hitting a spark |

| 24 | `skills/ground-slam.png` | Ground Slam | stone fist striking cracked ground |

| 25 | `skills/clay-bomb.png` | Clay Bomb | round clay pot with a spark fuse |

| 26 | `skills/shield-throw.png` | Shield Throw | spinning stone disc with motion arcs |

| 27 | `skills/bodyguard.png` | Bodyguard | stone-masked head with crossed spears |

| 28 | `skills/guardian-link.png` | Guardian Link | two shields joined by a glowing chain |

| 29 | `skills/execute.png` | Execute | red skull with a dagger through it |

| 30 | `skills/venom-blade.png` | Venom Blade | dagger dripping green venom |

| 31 | `skills/silencing-dart.png` | Silencing Dart | small dart with a closed mouth symbol |

| 32 | `skills/smoke-bomb.png` | Smoke Bomb | dark grey smoke ball with a spark |

| 33 | `skills/vanish.png` | Vanish | faded silhouette dissolving into smoke |

| 34 | `skills/relentless-pursuit.png` | Relentless Pursuit | running wolf-like figure with speed lines |

| 35 | `skills/bounty-contract.png` | Bounty Contract | rolled parchment with a gold coin |

| 36 | `skills/stat-might.png` | Might | obsidian blade edge glowing orange |

| 37 | `skills/stat-haste.png` | Haste | feather with speed lines |

| 38 | `skills/stat-reach.png` | Reach | concentric rings expanding |

| 39 | `skills/stat-critical.png` | Critical | jaguar eye inside crosshair star |

| 40 | `skills/stat-armor.png` | Armor | carved stone breastplate |

| 41 | `skills/stat-renewal.png` | Renewal | green leaf with a healing dewdrop |

| 42 | `skills/stat-wisdom.png` | Wisdom | glowing scroll with a green glyph |


### 5.5 Optional UI icons (recommended)

The HUD Dash button reuses icon-45 (Windstep), the HUD attack button icon-1 (Jaguar's Roar) and the Shrine upgrades reuse 1, 62, 64 and 65. They are not skills, but for the same clarity give them their own art:

| File | For | Subject |
|---|---|---|

| `skills/ui-hud-dash.png` | HUD Dash button | winged sandal with speed lines |

| `skills/ui-hud-attack.png` | HUD manual attack button | crossed claw and spear |

| `skills/ui-shrine-damage.png` | Shrine: Damage | stone idol with red glow |

| `skills/ui-shrine-vitality.png` | Shrine: Vitality | stone idol with green glow |

| `skills/ui-shrine-speed.png` | Shrine: Speed | stone idol with blue glow |

| `skills/ui-shrine-fortune.png` | Shrine: Fortune | stone idol with gold glow |


---
## 6. Animation (VFX) and sound (SFX) production guide

### 6.1 What "unique animation" means here

Each skill has its own **signature animation**: a sprite sheet (or a procedural effect) that no other skill uses, with a different silhouette, motion and palette. The animation descriptions in section 4 are the brief for each one. Palette hex codes are starting points. Use three tiers, best first:

| Tier | What | When |
|---|---|---|
| A | Own sprite sheet, hand-drawn or AI-assisted, 6-10 frames, 128x128 px, transparent | Every active skill's cast/impact and every passive with a visible proc |
| B | A library sprite (section 7) that you edit so shape *and* motion change. A recolour alone is not unique | When A is too slow |
| C | Procedural Phaser particles/graphics with a unique shape and motion | Auras, trails, persistent ground effects |

**Signature test (do it for every hero):** hide the skill names, play each of the 16 active effects, and check that someone can tell all 16 apart and say what each one does.

### 6.2 Files and stages

```
public/assets/pixel/fx/<skill-id>/cast-0.png ... cast-N.png      at the caster
public/assets/pixel/fx/<skill-id>/travel-0.png ...                moving projectile
public/assets/pixel/fx/<skill-id>/impact-0.png ...                on hit
public/assets/pixel/fx/<skill-id>/ground-0.png ...                zones, decals, telegraphs
public/assets/pixel/fx/<skill-id>/aura-0.png ...                  buffs on the hero
```

Rules: frame time 60-100 ms, additive blend for light/fire/magic, normal blend for stone/wood/smoke, always show a **telegraph** (0.4-0.6 s) before any delayed or large attack, never block the hero sprite, and respect the "reduce flashing" accessibility option if you have one.

### 6.3 Sound specification

| Item | Value |
|---|---|
| Format | WAV or OGG, 44.1 kHz, mono (stereo only for music) |
| Length | cast 0.2-1.0 s, hit 0.1-0.4 s, loops up to 6 s and seamless |
| Level | peak -3 dBFS, trim leading silence, similar loudness across skills |
| Naming | `public/assets/audio/sfx/skills/sfx-<skill-id>-cast.wav`, optional `-hit.wav`, `-loop.wav` |
| Runtime | random pitch +/-5% per play, max one play per sound id per 60 ms, pooled |
| Layering | build each sound from 2-3 sources (e.g. growl + sub boom + reverb) so it stays unique |

Search terms for the Maya/jungle feel: ocarina, clay flute, hollow log drum, rattle, conch shell, jungle ambience, cenote water, stone grind, big cat growl, obsidian glass, feather flutter.

---
## 7. Free and open-source resources

Always open the page of each asset and confirm its licence yourself; licences and catalogues change. **Prefer CC0, MIT, public domain or CC-BY** (keep attribution in `licenses/`). **Avoid "NonCommercial" (NC) and "NoDerivatives" (ND)** because you sell a supporter pack. Treat **GPL and CC-BY-SA** assets with care, since they may require you to share your own work under the same terms.

| Need | Resource | Notes |
|---|---|---|
| General art, VFX, sprites, audio | OpenGameArt.org | Filter by licence (CC0 / CC-BY). Large mixed-quality library. |
| Particles, UI, impact and interface sounds | Kenney.nl | CC0 packs (e.g. Particle Pack, Impact Sounds, Interface Sounds, RPG Audio). Safe for commercial use. |
| Pixel effects, icon packs, SFX packs | itch.io (Game Assets, filter Free) | Licence differs on every page. |
| Sprite editing and animation | Pixelorama (MIT), LibreSprite (GPL), Piskel (Apache-2.0) | Open-source pixel editors for making or editing the sheets. |
| Palettes and pixel-art references | Lospec | Palette library to keep colours consistent. |
| Atlases | Free Texture Packer | Free, open-source atlas builder. |
| Built-in effects | Phaser itself | Particles, tweens, camera shake/flash and (3.60+) glow/bloom FX; check your Phaser version in `package.json`. |
| Sound effects | Freesound.org | Filter to CC0 (or CC-BY). Check each sound's licence. |
| Sound effects bundles | Sonniss GameAudioGDC bundles | Free royalty-free bundles; read their licence first. |
| Sound effects (free licences) | Pixabay sound effects, Mixkit | Free to use, but not CC0: read their terms. |
| Generate retro SFX in code | jsfxr / sfxr, ZzFX | Open-source generators; good for chimes, pickups and magic blips. |
| Edit and layer audio | Audacity (GPL, free) | Trim, normalise, layer, pitch. |
| Music | FreePD (public domain), Incompetech (CC-BY), OpenGameArt music, Free Music Archive, LMMS (to compose) | Check licence per track. Keep music for menu/day/night/cenote/boss consistent. |
| Browser audio helpers | Tone.js (MIT), Howler.js (MIT) | Only if you outgrow `AudioDirector.js`. |

**AI-generated art or audio:** you already document asset provenance. Keep doing it for every new file (tool, prompt, date, licence terms of the tool).

**Suggested sound sources per skill family**

| Family | Where to look |
|---|---|
| Growls, roars, pounces | Freesound: "big cat roar", "jaguar", layered with a sub boom |
| Stone, wood, crates, impacts | Kenney Impact Sounds, Freesound "stone grind" |
| Glass, jade, obsidian | Freesound "glass chime", "crystal" |
| Wind, whooshes, feathers | Freesound "air whoosh", "wing flutter" |
| Magic chimes and shimmer | Kenney RPG audio, ZzFX/jsfxr |
| Water, rain, thunder | Freesound "rain loop", "thunder" |
| Drums, rattles, flutes | Freesound "tribal drum", "ocarina", "clay flute" |


---
## 8. Balance reference

All numbers in section 4 are **starting values**, chosen so skills of one role land in the same band. They must be confirmed with your existing playtest scripts.

**Formulas (current code):** final damage = skill damage x hero damage multiplier x (1 + 0.25 x (level - 1)) (the old multiplier was 0.32; 0.25 keeps level 6 near 2.25x). Hero damage multipliers today: Balam 1.05, Ixchel 1.12, Kukul 0.98.

**Targets for one target at level 1** (dps = damage per cast on one target, all hits and damage over time, divided by cooldown):

| Role | Target dps |
|---|---|
| Pure damage skill | 10-16 |
| Area skill (per enemy hit) | 6-12 |
| Control skill (stun, root, fear, pull) | 4-9 plus the effect |
| Minion / turret (one target) | up to 15 |
| Utility, buff, defence, heal | 0 (value comes from the effect) |

Other rules: cooldowns between 3.5 and 18 s; a skill under 4 s must be cheap or weak; Ixchel's mana costs run 14-32 against a 110-point pool, so measure her mana regeneration in `GameScene.js` and keep the sum of the four equipped skills within about 45 s of regeneration; one stat card should be worth about a third of a new skill; each passive level adds roughly 20% of its level-1 value.

**Hero base stats** (from `data/heroes.js`): Balam HP 150 / armor 4 / speed 225 / crit 7%; Ixchel HP 105 / mana 110 / speed 215 / crit 9%; Kukul HP 118 / speed 250 / crit 13%. Keep them for the first pass; the new passives add power, so run the bot playtest and compare time to level 10, boss kill time and death rate per hero before and after. Aim for the three heroes to be within 15% of each other on those metrics.

Damage per cast in the table below is my estimate for one enemy standing in the effect.


| Hero | Skill | CD | Mana | Damage per cast (one target) | dps (one target) | Role |
|---|---|---|---|---|---|---|

| balam | Jaguar's Roar | 9 | - | 40 | 4.4 | control + damage |

| balam | Obsidian Arc | 4.8 | - | 68 | 14.2 | damage |

| balam | Prowler's Leap | 7 | - | 62 | 8.9 | damage |

| balam | Claw Cyclone | 8.5 | - | 108 | 12.7 | damage |

| balam | Ceiba Breaker | 7 | - | 100 | 14.3 | damage |

| balam | Bloodless Hunt | 4.5 | - | 64 | 14.2 | damage |

| balam | Stone Maw | 9 | - | 82 | 9.1 | damage |

| balam | War Drum | 12 | - | 145 | 12.1 | damage |

| balam | Sun Claw | 9.5 | - | 104 | 10.9 | damage |

| balam | Jaguar Echo | 11 | - | 143 | 13.0 | damage |

| balam | Fang Path | 5.4 | - | 54 | 10.0 | damage |

| balam | Hunter's Mark | 6.5 | - | - | - | utility/control |

| balam | Nine Lives | 16 | - | - | - | utility/control |

| balam | Black Mirror | 10 | - | - | - | utility/control |

| balam | Pyramid Rush | 8 | - | 92 | 11.5 | damage |

| balam | Heart of Balam | 14 | - | 150 | 10.7 | damage |

| ixchel | Copal Star | 3.8 | 14 | 52 | 13.7 | damage |

| ixchel | Jade Halo | 8.5 | 22 | 112 | 13.2 | damage |

| ixchel | Ancestor Flame | 6.8 | 20 | 62 | 9.1 | damage |

| ixchel | Moonwell | 10 | 18 | 96 | 9.6 | damage |

| ixchel | Censer Wave | 5.2 | 17 | 50 | 9.6 | damage |

| ixchel | Verdant Mercy | 14 | 28 | - | - | utility/control |

| ixchel | Copal Veil | 12 | 24 | - | - | utility/control |

| ixchel | Glyph Comet | 7.5 | 31 | 104 | 13.9 | damage |

| ixchel | Cacao Bloom | 9 | 23 | 80 | 8.9 | damage |

| ixchel | Raincaller | 11 | 32 | 266 | 24.2 | damage |

| ixchel | Spirit Familiar | 10 | 24 | 150 | 15.0 | damage |

| ixchel | Serpent Coil | 8.6 | 25 | 76 | 8.8 | damage |

| ixchel | Jade Needles | 6 | 19 | 99 | 16.5 | damage |

| ixchel | Dreamwalk | 6.4 | 16 | 26 | 4.1 | control + damage |

| ixchel | Four Directions | 8 | 27 | 60 | 7.5 | control + damage |

| ixchel | Ixchel's Mantle | 15 | 30 | - | - | utility/control |

| kukul | Atlatl Volley | 5.4 | - | 100 | 18.5 | damage |

| kukul | Featherstorm | 9.5 | - | 140 | 14.7 | damage |

| kukul | Serpent Path | 6.5 | - | 64 | 9.8 | damage |

| kukul | Windstep | 5.5 | - | 53 | 9.6 | damage |

| kukul | Quetzal Flip | 5.5 | - | 72 | 13.1 | damage |

| kukul | Hunter's Snare | 7.8 | - | 62 | 7.9 | control + damage |

| kukul | Eagle Eye | 5.5 | - | 87 | 15.8 | damage |

| kukul | Sun Dart | 6.6 | - | 261 | 39.5 | damage |

| kukul | Storm Nest | 10.5 | - | 120 | 11.4 | damage |

| kukul | Plume Guard | 11 | - | - | - | utility/control |

| kukul | Cacao Bomb | 8.4 | - | 73 | 8.7 | damage |

| kukul | Forked Flight | 5.8 | - | 90 | 15.5 | damage |

| kukul | Gale Ring | 7.2 | - | 46 | 6.4 | control + damage |

| kukul | Hunter's Trance | 13 | - | - | - | utility/control |

| kukul | Skyfall | 12 | - | 96 | 8.0 | damage |

| kukul | Kukulkan's Breath | 10.5 | - | 160 | 15.2 | damage |


---
## 9. Migration map (old -> new)

### 9.1 Hero skills

| Hero | Old skill | Status | Why |
|---|---|---|---|

| balam | `jaguar-roar` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `obsidian-arc` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `prowlers-leap` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `spotted-guard` | **removed** | Third shield-type skill; defense now covered by Black Mirror (reflect) and Heart of Balam (ward + burst). Icon 4 reused by Stonehide. |

| balam | `claw-cyclone` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `ceiba-breaker` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `bloodless-hunt` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `stone-maw` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `war-drum` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `sun-claw` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `night-pounce` | **removed** | Third dash for Balam. Its "crit refresh" idea became the passive Predator's Rhythm. Icon 11 reused by Hunter's Mark. |

| balam | `obsidian-rain` | **removed** | A ranged barrage does not fit a melee bruiser, and Kukul/Ixchel already own rain-style skills. Icon 12 moved to the Assassin ally. |

| balam | `jaguar-echo` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `temple-quake` | **removed** | Merged into Ceiba Breaker (stun) and the passive Earthshaker. Icon 14 reused by Earthshaker. |

| balam | `fang-path` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `hunters-mark` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `nine-lives` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `black-mirror` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `pyramid-rush` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| balam | `heart-of-balam` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `copal-star` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `jade-halo` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `ancestor-flame` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `moonwell` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `censer-wave` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `verdant-mercy` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `smoking-mirror` | renamed | See `old` notes in section 4 (Smoking Mirror became Copal Veil). |

| ixchel | `glyph-comet` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `cacao-bloom` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `raincaller` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `spirit-familiar` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `serpent-coil` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `jade-needles` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `ceiba-breath` | **removed** | Second cone (Censer Wave is the only cone). Icon 36 reused by Rooted Meditation. |

| ixchel | `dreamwalk` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `four-directions` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| ixchel | `blue-fire` | **removed** | Another self-centred burn nova (Balam owns Sun Claw). Icon 39 reused by Ancestral Echo. |

| ixchel | `ancestor-chorus` | **removed** | Duplicate chain skill (Ancestor Flame is the only chain). Icon 40 reused by Mana Spring. |

| ixchel | `moon-tears` | **removed** | Second rain skill (Raincaller). The moon theme moved to Moonwell and Lunar Boon. |

| ixchel | `ixchels-mantle` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `atlatl-volley` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `featherstorm` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `serpent-path` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `windstep` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `quetzal-orbit` | **removed** | Orbit already exists on Ixchel (Jade Halo). Replaced by Quetzal Flip. |

| kukul | `hunter-snare` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `sky-spear` | **removed** | Duplicate single-target seeker (Bloodless Hunt, Eagle Eye). Icon 48 reused by Sharpened Flint. |

| kukul | `tailwind` | **removed** | Duplicate dash (merged into Windstep). Icon 49 reused by Gale Ring. |

| kukul | `sun-dart` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `eagle-eye` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `storm-nest` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `piercing-reed` | **removed** | Duplicate piercing line (Serpent Path). Icon 53 reused by Full Quiver. |

| kukul | `plume-guard` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `cacao-bomb` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `forked-flight` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `gale-ring` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `camouflage` | **removed** | Stealth moves to the Assassin ally (Vanish) and healing to Balam/Ixchel. Replaced by Hunter's Trance. |

| kukul | `skyfall` | kept, redesigned | Same id; see section 4 for the new mechanic. |

| kukul | `serpent-fang` | **removed** | Duplicate chain (Ancestor Flame). Icon 60 reused by Venomous Darts. |

| kukul | `kukulkans-breath` | kept, redesigned | Same id; see section 4 for the new mechanic. |


New hero skills with no old id: `quetzal-flip`, `hunters-trance`, and all 24 hero passives + 2 shared passives.

### 9.2 Ally skills

| Ally | Old skill | New |
|---|---|---|

| saintess | `renew` | -> Healing Circle |

| saintess | `blessing` | -> Jade Ward |

| saintess | `valor` | -> Sacred Fervor |

| saintess | `focus` | removed (haste duplicates a stat and Radiant Beacon) |

| saintess | `renewal-song` | removed (duplicates the Renewal stat) |

| saintess | `well` | removed (replaced by Healing Circle) |

| saintess | `sanctuary` | -> Sanctuary Dome (now a real zone) |

| saintess | `wind` | removed (speed is covered by Radiant Beacon and the shared passive) |

| saintess | `purify` | -> Cleansing Light |

| saintess | `rescue` | -> Saving Grace |

| tank | `guard` | -> Bodyguard |

| tank | `bomb` | -> Clay Bomb |

| tank | `intercept` | -> Bulwark Wall |

| tank | `snare` | removed (Kukul owns the root net) |

| tank | `taunt` | -> War Cry |

| tank | `bash` | -> Shield Bash |

| tank | `barrier` | removed (duplicate shield) |

| tank | `shockwave` | -> Ground Slam |

| tank | `fortify` | removed (duplicates the Armor stat) |

| tank | `bulwark` | removed (duplicates Saving Grace) |

| assassin | `ambush` | kept (reworked) |

| assassin | `mark` | removed (Balam owns Hunter's Mark) |

| assassin | `execute` | kept |

| assassin | `venom` | -> Venom Blade |

| assassin | `silence` | -> Silencing Dart |

| assassin | `disarm` | removed (duplicates silence) |

| assassin | `rupture` | removed (bleed belongs to Obsidian Arc) |

| assassin | `pursuit` | -> Relentless Pursuit |

| assassin | `volley` | removed (duplicates Ambush) |

| assassin | `smoke` | -> Smoke Bomb |


New ally skills: Radiant Beacon, Lifebond (Saintess); Shield Throw, Guardian Link (Tank); Vanish, Bounty Contract (Assassin).


---
## 10. Implementation plan and tests

### 10.1 Phases

1. **Prepare.** New git branch. Run `npm run test` and the playtest scripts once and keep the results as a baseline.
2. **Quick fixes.** Section 2 items 1, 4, 5, 8 and 9.
3. **Engine.** Status effects (3.4), passive system (3.5), handler registry (3.3), slots, milestones, HUD and draft (3.6), ally system (3.10), pacing check (3.11), audio and FX directors (3.7, 3.8).
4. **Data.** Generate skill definitions from `skills_redesign.json`. Add names and descriptions to `src/i18n/skills.js`. Remove skills listed as removed in section 9.
5. **Icons.** Run `node migrate_icons.mjs` (copies the 66 existing icons to `skills/<id>.png`), then add the 42 new icons. Update `src/art/uiArt.js` to read `skills/<id>.png` by id, removing the number-based maps. Stop using `icon-N.png` anywhere.
6. **Animation and sound, in waves.** Wave 1 Balam and the shared passives, wave 2 Ixchel, wave 3 Kukul, wave 4 allies. A skill is not "done" until its icon, VFX and SFX files exist.
7. **Balance pass** (section 8) with the playtest scripts.
8. **Release checklist** (10.3).

### 10.2 Automated checks

- `node validate_skills.mjs skills_redesign.json --assets public/assets/pixel` must print "OK" (use `--allow-new` while art is missing).
- A unit test per handler with a mock scene (examples: Jaguar's Roar fears non-bosses but only slows bosses; Plume Guard negates exactly 3 hits; Hunter's Mark restores 4 HP when a marked enemy dies; Ixchel's Mantle restores mana once).
- A passive test per event: kill counters (Feast of the Fallen every 12th kill), crit cooldown reduction, shared passives present at level 1 on every hero.
- A headless "cast every skill" run: equip each skill, cast it for 10 s, fail on any console error or 404 for an icon, effect or sound file.
- A draft test: no duplicate cards, no card the hero cannot own, slot rules respected (3 active then 4 at level 20; 1 passive then 2 at level 10; 2 innate traits free), milestone picks appear exactly once at level 10 and level 20, even when several levels are gained at once.

### 10.3 Manual QA, per skill

Icon unique and readable at small size · name and text correct in EN/FR/AR (Arabic layout not broken) · animation matches the text · sound plays once per cast · cooldown ring and mana cost correct · levels 1-6 (actives) or 1-5 (passives) change what the text says · works in auto-attack mode and on a touch screen · no frame drops with 3 skills active on a real phone.

### 10.4 Definition of done

All checks in 3.1 pass, section 2 bugs are fixed, every skill has unique icon, animation and sound, and the playtest balance metrics in section 8 are within range.

### 10.5 Suggested instruction for your coding agent

> Read `skills_redesign.md` and `skills_redesign.json`. Implement section 10 in order on a new branch. Do not invent skill behaviour: the catalogue is the spec. After each phase run the tests, report what passed and failed, and list every deviation from the spec with a reason.
