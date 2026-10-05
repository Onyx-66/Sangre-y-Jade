# V12 Boss visuals

Four bosses use sixteen frames and seven animation states. Preserve the existing collision body and physics scale.

The 21 ability recipes and four entrances are unique; effect art decorates the scheduled mechanics and follows their actual lifetimes and geometry.

Final contacts: [boss lineup](previews/v12/boss-lineup.png), [effects](previews/v12/effects-final.png). Inspect the [dev preview](../../tools/boss-preview.html).

Verification: 535/535 indexed snapshot tests; build passed; 110 assets unique and dimension/alpha checked; 25 FX gallery checks passed without warnings; four 180-second boss coverage runs passed all abilities with a peak of 24 live effects; 51 framework, 497 HUD and 62 loading checks passed.

The boss runs use instrumentation for coverage, not balance/performance; browser audio is muted. No model-routing metadata was available; native sheets were normalized from 1254 to 2048 pixels. The shared worktree retains a prior translation audit failure (`MANA`, `Cacao`).
