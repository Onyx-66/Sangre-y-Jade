# v0.6 font assets

Noto Sans Arabic is present as `NotoSansArabic.ttf`, licensed under SIL OFL 1.1
in `OFL-NotoSansArabic.txt`. It is the Arabic UI face again; the CSS excludes
ASCII from its Unicode range so Western digits can use the heading font.

The supplied Jersey 15 and Atkinson Hyperlegible WOFF2 subsets are bundled
locally. No downloads, font CDN or renamed substitute fonts are used.

The offline loader waits for these exact files before the first menu and
before Phaser creates text:

- `Jersey15-latin-400.woff2`, `Jersey15-latin-ext-400.woff2` (400 only)
- `AtkinsonHyperlegible-latin-400.woff2`, `AtkinsonHyperlegible-latin-ext-400.woff2`
- `AtkinsonHyperlegible-latin-700.woff2`, `AtkinsonHyperlegible-latin-ext-700.woff2`
- `NotoSansArabic.ttf` (variable weight)

The original OFL notices are in this directory and copied unchanged into
`licenses/`. See `licenses/V06-FONTS.md` for authorship. Jersey uses only its
real regular face; synthesis is disabled. Western digits use a digit-only
Jersey face, even in Arabic body copy. Arabic headings use genuine Noto bold.

Run `npm run test:typography` and `npm run test:hud` to verify actual loaded
faces and the EN/FR/AR layouts. `app.typography` and `data-fonts-complete`
report load failures; the binary/license acceptance test is mandatory.
