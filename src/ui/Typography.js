export const FONT_FAMILIES = Object.freeze({
  display: '"Jersey 15", Arial, sans-serif',
  body: '"Atkinson Hyperlegible", Arial, sans-serif',
  arabic: '"Jersey 15", "Noto Sans Arabic", Arial, sans-serif',
});

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
export const FONT_FILES = Object.freeze([
  { family: 'Jersey 15', file: 'Jersey15-latin-400.woff2', weight: '400', unicodeRange: LATIN, digits: true },
  { family: 'Jersey 15', file: 'Jersey15-latin-ext-400.woff2', weight: '400', unicodeRange: LATIN_EXT },
  ...['400', '700'].flatMap(weight => [
    { family: 'Atkinson Hyperlegible', file: `AtkinsonHyperlegible-latin-${weight}.woff2`, weight, unicodeRange: LATIN },
    { family: 'Atkinson Hyperlegible', file: `AtkinsonHyperlegible-latin-ext-${weight}.woff2`, weight, unicodeRange: LATIN_EXT },
  ]),
  { family: 'Noto Sans Arabic', file: 'NotoSansArabic.ttf', weight: '100 900',
    unicodeRange: 'U+0600-06FF,U+0750-077F,U+0870-089F,U+08A0-08FF,U+200C-200F,U+FB50-FDFF,U+FE70-FEFF' },
]);

export function gameTextStyle(text, size = 20) {
  const arabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(String(text));
  const numeric = /^[\d\s/.%:+\-×–]+$/u.test(String(text));
  return { fontFamily: arabic ? FONT_FAMILIES.arabic : size >= 16 || numeric ? FONT_FAMILIES.display : FONT_FAMILIES.body,
    fontSize: `${size}px`, fontStyle: 'normal' };
}

// Inject browser APIs for tests. An absent/corrupt local font file cannot
// leave the game blank or silently claim the intended font has been bundled.
export async function loadGameFonts({ fontSet, FontFaceClass, urls = {} }) {
  const loaded = [], missing = [], errors = [];
  for (const definition of FONT_FILES) {
    const url = urls[definition.file];
    if (!url) { if (!definition.optional) missing.push(definition.family); continue; }
    try {
      const descriptors = { weight: definition.weight, unicodeRange: definition.unicodeRange };
      // Reuse the supplied stylesheet faces when present, but explicitly
      // register a real local face if CSS injection has not reached the set.
      const normalize = value => String(value).replace(/[\s"']/g, '').toUpperCase();
      const existing = typeof fontSet[Symbol.iterator] === 'function' && [...fontSet].find(face =>
        normalize(face.family) === normalize(definition.family) && face.weight === definition.weight &&
        normalize(face.unicodeRange) === normalize(definition.unicodeRange));
      const face = existing || new FontFaceClass(definition.family, `url("${url}")`, descriptors);
      await face.load();
      if (!existing) fontSet.add(face);
      if (definition.digits) {
        const digits = new FontFaceClass('Jersey 15 Digits', `url("${url}")`, { weight: '400', unicodeRange: 'U+0030-0039' });
        fontSet.add(await digits.load());
      }
      if (!loaded.includes(definition.family)) loaded.push(definition.family);
    } catch (error) {
      if (!definition.optional) missing.push(definition.family);
      errors.push(`${definition.file}: ${error.message}`);
    }
  }
  // Warm all scripts before any first menu/canvas text, not just the locale
  // saved at boot, so a language switch cannot race a later Arabic font load.
  const warmed = await Promise.allSettled([
    fontSet.load('400 16px "Jersey 15"', 'QERT 0123456789'),
    fontSet.load('400 14px "Atkinson Hyperlegible"', 'Français Play'),
    fontSet.load('400 14px "Noto Sans Arabic"', 'العربية'),
    fontSet.load('700 14px "Noto Sans Arabic"', 'العربية'),
  ]);
  for (const result of warmed) if (result.status === 'rejected') errors.push(`font warm-up: ${result.reason?.message || result.reason}`);
  await fontSet.ready;
  return { loaded, missing: [...new Set(missing)], errors };
}

let fontGate;
export function waitForGameFonts(urls = {}) {
  if (!fontGate) fontGate = loadGameFonts({ fontSet: document.fonts, FontFaceClass: FontFace, urls }).then(report => {
    document.documentElement.dataset.fontsReady = 'true';
    document.documentElement.dataset.fontsComplete = String(report.missing.length === 0 && report.errors.length === 0);
    return report;
  });
  return fontGate;
}
