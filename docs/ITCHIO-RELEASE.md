# itch.io release checklist

## Upload

1. Run `npm run release`.
2. Create an itch.io project with **Kind of project: HTML**.
3. Upload `release/Sangre-y-Jade-v0.1.0-itchio.zip` and select **This file will be played in the browser**.
4. Use the viewport option that lets the canvas expand; the game adapts to dynamic desktop and mobile aspect ratios.
5. Enable fullscreen. Landscape is strongly recommended on phones.
6. Upload the files in `release/marketing/` as the cover and screenshots.

The package keeps `index.html` at the ZIP root and uses only relative production paths, matching itch.io's HTML5 upload requirements: <https://itch.io/docs/creators/html5>.

## Suggested page metadata

- **Title:** Sangre y Jade
- **Classification:** Game
- **Kind:** HTML
- **Release status:** In development / Early access
- **Genre:** Action
- **Tags:** Roguelike, Survival, Pixel Art, Fantasy, Mobile, Top Down, Singleplayer, Mythology
- **Short description:** Survive the night as one of three champions when Xibalba breaches a Maya-inspired jungle city.
- **Orientation:** Landscape
- **Input:** Keyboard and touchscreen

## Suggested pricing

- Base Version 0: free or pay-what-you-want to grow an audience.
- Set a higher minimum price on a separate **Supporter Pack** upload containing the soundtrack, high-resolution art, and development codex.
- Add cosmetic files or expansion builds as separate paid uploads once fulfillment is ready.

itch.io supports bonus files at higher minimum prices, which suits the Supporter Reliquary without adding a third-party checkout: <https://itch.io/docs/creators/getting-started>.

## Store copy

> Beneath the ceiba, the road to Xibalba has opened.
>
> Choose Balam the Jaguar Warrior, Ixchel's Voice the Jade Shaman, or Kukul the Feathered Hunter. Build three abilities from a pool of twenty, crush escalating spirit hordes, loot rule-changing relics, and confront the lords of the underworld in a 10- or 20-minute Training run.
>
> Version 0 includes three maps, touch and keyboard controls, persistent shrine progression, original music, and a cinematic prologue. No ads. No loot boxes. No paid power.

## Before making the page public

- Play the ZIP after uploading; do not rely only on the local Vite server.
- Test at least one Android browser and one desktop browser.
- Add 3–5 representative screenshots. Do not use only cinematic art to represent gameplay.
- Disclose the use of AI-assisted cinematic art in the page description. itch.io's quality guidance asks creators not to misrepresent content and to disclose generated asset material where applicable: <https://itch.io/docs/creators/quality-guidelines>.
- Connect real supporter downloads and prices before changing any in-game catalog button from preview-only.

