# V15 generated source sheets

Generated 2026-10-05 with the supplied image tool. Every generation requested gpt-image-2.5 Flare; the tool does not expose routing metadata. Native sheets are 1254×1254; preparation normalizes to the requested 2048×2048 grid before slicing. JSON manifests preserve reading order, exact final dimensions and per-cell briefs.

| Sheet | Contents / short prompt | Status |
|---|---|---|
| 1 | Six seamless jungle ground patches, ten distinct tree species; overhead 3/4 Maya pixel art, warm green/gold, magenta 4×4, no text | Trees accepted; ground replaced by sheet 6 |
| 2 | Ten jungle plants and six mossy rocks/stelae; same perspective/style, individual magenta cells | Accepted |
| 3 | Six debris items and first ten ruin/building types; overhead 3/4, readable footprints, same family | Accepted; empty grid rules keyed away |
| 4 | Dry fountain and ten small props; no lettering, warm stone/wood/clay, top-down 3/4 | Accepted |
| 5 | Fourteen distinct weather stills; green/yellow leaves, rain, mist, golden shaft, ash, ember, red fog, lightning, cyan spore, drip, cave fog, falling rock; magenta grid | Accepted after glow/edge unmatting |
| 6 | Six quiet low-contrast seamless ground textures: clover moss grass, dry grass, dirt, moss cobbles, wet mud, leaf litter; no objects or borders | Replaces sheet 1 ground cells |
| rejected-weather-transparent | Same fourteen weather briefs on a transparent grid | Rejected: colored alpha artifacts; never installed |

Reproduce: run `node scripts/prepare-overgrown-art.mjs sheet N docs/v0.6/sources/v15/sheet-N-native.png` for N=1 through 6 in order (6 must be last), then `node scripts/prepare-overgrown-art.mjs kit` and `node scripts/prepare-overgrown-art.mjs previews`. Do not regenerate provenance rows unless intentionally adding a new generation.
