# v0.6 Decisions

## Prompt 01 — Replacing skills — 2026-10-04

- `V06_SPEC.md` is absent from the repository. Use the six explicit requirements in Prompt 01 as the supplied specification for section 2.1; do not fabricate other sections or change the release scope.
- Create `release/0.6.0` from committed `feature/skills-overhaul` (`752c442`). Preserve the existing unfinished HUD/localization, ally art and menu files; include only this prompt's changes in its commit.
- No art or audio generation is needed. Use existing card/slot artwork and existing UI sounds through their current fallback system.
- Before production edits, the three-test reproduction had 1 pass (old active/passive swaps work) and 2 failures: a full loadout's missed random roll has no replacement action, and cancelling a milestone swap resumes/advances instead of restoring its cards. Remove that old path; the new flow restores the same pending pick at every Back step.
- The prompt's replacement eligibility is any full active/passive kind with an unowned same-kind skill, including on milestones. Ordinary milestone cards retain their original kind restriction. Innates and companions cannot be replaced.
- Back returns to the original reward cards from all three steps. Cache one candidate draw per kind for that pending pick so reopening cannot reroll it for free. Confirmation spends exactly that pick; it preserves the slot's position, resets level/cooldown/state and keeps removed skills in their owner pool.
- A fully maxed boss draft may have no upgrade cards. If replacement is possible, show its deterministic action rather than skip the reward; if no legal card or replacement exists, continue the queue as before. Sample up to 3 distinct candidates when fewer than 3 unowned skills remain.
- Existing effects already cast by a removed active finish normally. Replacement changes the equipped skill, ready cooldown, event subscriptions, passive counters/modifiers and HUD immediately; it does not undo earlier damage/healing or cancel unrelated effects.
- The read-only Skills dialog keeps Back visible and scrolls its own card list when needed; the pause menu only gains its requested entry. No broader pause-menu styling or release-version bump is part of Prompt 01.
- Full-check limitation: the pre-existing, untracked `tests/i18n-overhaul.test.js` reports French `MANA` and `Cacao` as untranslated because they equal their English spelling. This was the sole failure before this prompt and remains the sole failure (307/308). Do not modify that earlier localization work or its test as part of replacing skills; run the build separately because `npm run check` stops after the test failure.
- Verification uses the preserved working tree, including the earlier unfinished translations. Only Prompt 01 hunks are committed; those older files/assets stay uncommitted. Screenshot checks additionally reject overlapping footers and content escaping card borders, and verify that the Skills list can scroll to show both innate traits.

## Prompt 02 — HUD clarity and language-invariant positions — 2026-10-04

- Prompt 01 was ready when Prompt 02 arrived; commit it separately as `81d2418` / `v0.6.0-step01` before changing the HUD. Keep the same release branch and preserve prior unfinished translations/art.
- Neither `V06_SPEC.md` nor `docs/v0.6/references/ref-markup-hud.jpeg` is present. Follow the seven explicit requirements of Prompt 02; do not infer a new HUD composition from an unseen image.
- Reuse existing pixel plates, rings and Dash art. Small interface symbols already use a native SVG icon set; improve its cacao pouch/skull and add lock/auto-mode symbols there. No raster generation, audio changes or new dependencies are necessary.
- The auto indicator reports the selected attack mode and shows a localized tooltip; it is not a new attack-mode toggle. Keep it beside the XP region, between the joystick and skill dock, with a 44 CSS-pixel tooltip target.
- Geometry tests compare independent HUD controls/panels and separate children within panels, not a panel against its own descendants. Tooltips, temporary toasts and unlock bursts are intentional overlays and are excluded from collision checks. Test locked/unlocked allies independently from locked/unlocked skill slots.
- A combat-state regression exposed an existing boss-bar/ally-panel overlap at 568×320. Keep the boss bar to the right of the ally panel in compact landscape, and below it in portrait. Give its title a fixed-height, single-line box so EN/AR font metrics cannot move the bar; no gameplay or boss logic changes.
