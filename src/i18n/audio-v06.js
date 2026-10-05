// TODO native review: French and Arabic audio settings translations.
export const audioMessages = {
  Audio: ['Audio','الصوت'], 'Ambience volume': ['Ambiance','مستوى أصوات البيئة'],
  'Voice volume': ['Volume des voix','مستوى الأصوات الحوارية'],
  'UI volume': ['Interface sonore','مستوى أصوات الواجهة'],
  'Enable voice': ['Activer les voix','تفعيل الأصوات الحوارية'],
  'Localized narration; English fallback when unavailable.': ['Narration traduite ; anglais si indisponible.','سرد باللغة المختارة؛ بالإنجليزية عند عدم توفره.'],
};
export function audioText(key,language,fallback){return language==='en'?key:audioMessages[key]?.[language==='ar'?1:0]??fallback(key);}
