# V10 — Boss framework verification

Date: 2026-10-05. Branch: `release/0.6.0`. Tag: `v0.6.0-v10`.

## Implemented contract

`BossController` owns HP phases, accepted-warning cooldowns, cancellation, recovery, optional protection/enrage, spawn warnings, the fixed arena and one-shot death/reward completion. `BOSS_BEHAVIORS` registers the existing dash, quake, sun fan and final radial attacks as temporary behaviours. All four new HP/contact values and schedules come from compiled `v06_design.json` data; their new abilities remain inactive until V11.

`CutsceneDirector` runs camera, entry, name and return steps. The existing camera zoom is multiplied by up to 1.25, not replaced by an absolute zoom. Full sequences last 5/5/6/8 seconds with a two-second name banner. Physics, scene timers, tweens, gameplay time and combat pause; completion restores them. Tap or Android Back can skip after one second. The accessibility preference uses only a static two-second banner. Entry and sound/voice/music hooks remain available for later boss/audio work.

`BossPresentation` uses the verified kit art for letterboxing/name/warning presentation and the ornate meter. The meter reports HP, phase notches/icon, armor/shield and protection, always left-to-right. Its existing physical HUD anchor and `boss-bar` id remain compatible with layout position/scale. At 568x320 the responsive HUD places it beside the ally panel to avoid overlap; at 1280x720 it is top-centred.

## Reproduction

```powershell
node scripts/compile-bosses-v06.mjs
node --test tests/boss-framework.test.js tests/enemies-v06.test.js tests/skills-foundations.test.js
node scripts/v06-boss-framework-playtest.mjs
npm run check
```

The browser script starts its own local Vite server and uses the installed Chrome/Playwright. `SYJ_BOSS_OUTPUT`, `SYJ_HUD_OUTPUT` and `SYJ_LOADING_OUTPUT` can route evidence without overwriting previous prompts. No network download, package installation or audio generation is involved.

## Coverage and evidence

- 24 new unit tests: exact JSON data, threshold boundaries/multi-phase jumps/no regression, warning/execute ordering, recovery floor, invulnerability including DOT, optional enrage, stun/silence/death/reuse cancellation, warning-pool exhaustion, cooldown consumption, post-mitigation hit cap, taunt/blind targeting, paused choices, entrance timing/zoom/restore, input/damage guards, tap/Back/skip preference, reduced motion, resize/end, arrival schedule/late spawn/cap retry, arena/safe circles, boss-meter data, one-shot death/reuse/cleanup, all maps/modes, locale strings and digits.
- Real browser checks: English/French/Arabic at 568x320 and 1280x720. Each renders the outside-view eight-second warning, camera/entry banner and phase/shield/armor meter. Controls cannot skip early or damage during an entrance; the natural completion restores follow, zoom, time and physics. Four actual pooled boss attacks preserve dash/quake damage and 5/7 projectile counts, and observe wind-up/recovery. The real tap skip and deferred death/reward path are exercised. No browser errors, HTTP errors, console warnings or missing assets.
- Runtime screenshots and machine-readable checks: `previews/v10/runtime/` and `previews/v10/staged/runtime/`. Each has 18 local captures plus three contact sheets. Versioned evidence includes the final three contacts and both reports; full-resolution captures stay locally available and are reproducible by the script. Contacts were visually inspected in all three languages.
- Existing HUD regression: `previews/v10/staged/hud/`, 497 checks and 32 local layout captures plus card evidence. Existing real-loading regression: `previews/v10/staged/loading/`, 62 checks and eight local captures. Their machine-readable reports are versioned; screenshots are reproducible, not duplicated into this code-only commit.
- The commit source is isolated from earlier dirty UI/editor/localization files in an ignored indexed-source snapshot. It passes the complete tests/build. The shared worktree's older French untranslated-key audit still fails; it is not hidden, changed or staged here.

## Deliberate limits

No new boss sheets, effects, bespoke entry choreography, new abilities, audio files or voice playback are claimed. Optional transformation/enrage hooks are tested with a stub but do not invent unspecified live timings. The Final Rite safe-circle framework is tested, not activated in the legacy fight. No pacing rebalance, physical Android/emulator run, audible manual run or native performance claim is included. Earlier untranslated-key and pacing work remains outside V10.
