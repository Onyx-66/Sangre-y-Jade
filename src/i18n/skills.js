import { BALAM_MESSAGES } from '../skills/generated/balam.js';
import { KUKUL_MESSAGES } from '../skills/generated/kukul.js';
import { ALLY_MESSAGES } from '../data/allyCatalog.js';
const legacySkillMessages=[
['Copal Star','Étoile de copal','نجمة الكوبال'],['Jade Halo','Halo de jade','هالة اليشم'],['Ancestor Flame','Flamme ancestrale','لهب الأسلاف'],['Moonwell','Puits lunaire','بئر القمر'],['Censer Wave','Vague d’encens','موجة البخور'],['Verdant Mercy','Grâce verdoyante','رحمة الطبيعة'],['Smoking Mirror','Miroir de fumée','مرآة الدخان'],['Glyph Comet','Comète runique','مذنب الرموز'],['Cacao Bloom','Floraison du cacao','إزهار الكاكاو'],['Raincaller','Appel de la pluie','نداء المطر'],['Spirit Familiar','Familier spirituel','رفيق الأرواح'],['Serpent Coil','Étreinte du serpent','التفاف الأفعى'],['Jade Needles','Aiguilles de jade','إبر اليشم'],['Ceiba Breath','Souffle du ceiba','نَفَس السيبا'],['Dreamwalk','Marche onirique','خطوة الحلم'],['Four Directions','Quatre directions','الاتجاهات الأربعة'],['Blue Fire','Feu bleu','النار الزرقاء'],['Ancestor Chorus','Chœur des ancêtres','جوقة الأسلاف'],['Moon Tears','Larmes de lune','دموع القمر'],["Ixchel's Mantle",'Manteau d’Ixchel','عباءة إيشيل'],
];
export const skillMessages=[...legacySkillMessages,...BALAM_MESSAGES,...KUKUL_MESSAGES,...ALLY_MESSAGES];
