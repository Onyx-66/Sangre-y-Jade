# V13 map bot and performance report

Runs use a seeded Kukul bot on each map for the full 600-second quick mode. Normal XP, level-ups, enemy spawns, combat, map streaming and prop interactions remain active; level-up cards are automatically accepted. Hero max/current HP is raised to 1,000,000 to keep this a traversal/performance check rather than a balance result. Chrome was headless with CDP CPU throttling set to 4×; simulation advanced at 20 steps per second. Frame-time percentiles measure the synchronous Phaser headless-step work, not display presentation latency.

| Map | Sim seconds | Kills | End level | Mean step | p95 | p99 | Max | Steps >16.7 ms | Estimated step capacity | Peak heap | Heap growth | Peak allocated map sprites | Browser/HTTP errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Overgrown | 600 | 351 | 15 | 2.50 ms | 5.90 ms | 16.10 ms | 193.50 ms | 111 / 12,134 | 399.2/s | 194.5 MB | +31.6 MB | 76 | 0 / 0 |
| Bloodmoon | 600 | 322 | 15 | 1.68 ms | 3.80 ms | 8.50 ms | 87.80 ms | 32 / 12,133 | 596.5/s | 194.1 MB | +20.6 MB | 82 | 0 / 0 |
| Cenote | 600 | 313 | 15 | 2.73 ms | 10.20 ms | 22.00 ms | 66.50 ms | 232 / 12,133 | 184.2 MB | +30.4 MB | 83 | 0 / 0 |

The p95 simulation step stayed below 16.7 ms on all maps under the configured 4× throttle, and streaming remained far below the 350-sprite cap. The p99/max include occasional bursts (likely GC, physics or chunk work), including a 193.5 ms single-step outlier on Overgrown; this headless measurement does not prove stable rendered 60 FPS. Heap readings use Chrome's `performance.memory`, sampled every 100 simulation frames; the observed growth is reported as sampled growth, not a post-GC leak diagnosis.

Machine-readable samples: [`previews/v13/map-bot-report.json`](previews/v13/map-bot-report.json). Re-run with `node scripts/v13-map-playtest.mjs`.
