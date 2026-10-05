export const loadingMessages = [
 ['Loading your run','Préparation de la partie','جارٍ تجهيز الجولة'], // TODO native review
 ['Reading the map','Lecture de la carte','قراءة الخريطة'], // TODO native review
 ['Waking the spirits','Éveil des esprits','إيقاظ الأرواح'], // TODO native review
 ['Tuning the drums','Accord des tambours','ضبط الطبول'], // TODO native review
 ['Preparing heroes and skills','Préparation du héros et des compétences','تجهيز البطل والمهارات'], // TODO native review
 ['Placing the ruins','Installation des ruines','وضع الأطلال'], // TODO native review
 ['Ready','Prêt','جاهز'], // TODO native review
 ['Loading failed','Échec du chargement','تعذر التحميل'], // TODO native review
 ['Could not load: {asset}','Chargement impossible : {asset}','تعذر تحميل: {asset}'], // TODO native review
 ['Retry','Réessayer','إعادة المحاولة'], // TODO native review
 ['Continue anyway','Continuer quand même','المتابعة على أي حال'], // TODO native review
 ['Optional art or sound can use a fallback.','Les effets ou sons optionnels peuvent utiliser un remplacement.','يمكن استخدام بديل للمؤثرات أو الأصوات الاختيارية.'], // TODO native review
 ['This asset is required to start the run.','Cette ressource est nécessaire pour commencer.','هذا الملف ضروري لبدء الجولة.'], // TODO native review
 ['Dash through danger, then let your stamina recover.','Esquivez le danger, puis laissez l’endurance se régénérer.','اندفع بعيدًا عن الخطر ثم انتظر تعافي التحمل.'], // TODO native review
 ['Keep moving to collect XP and unlock more skill slots.','Bougez pour gagner de l’expérience et ouvrir des emplacements.','تحرك لجمع الخبرة وفتح خانات مهارات إضافية.'], // TODO native review
 ['Your companion joins at level 5 and fights automatically.','Votre compagnon arrive au niveau 5 et combat automatiquement.','ينضم رفيقك عند المستوى 5 ويقاتل تلقائيًا.'], // TODO native review
 ['A second passive slot unlocks at level 10.','Un second emplacement passif s’ouvre au niveau 10.','تفتح خانة سلبية ثانية عند المستوى 10.'], // TODO native review
 ['Your fourth active slot unlocks at level 20.','Le quatrième emplacement actif s’ouvre au niveau 20.','تفتح خانتك النشطة الرابعة عند المستوى 20.'], // TODO native review
 ['Replacing a skill uses your pick and starts the new skill at level 1.','Remplacer utilise votre choix ; la nouvelle compétence débute au niveau 1.','يستهلك الاستبدال اختيارك وتبدأ المهارة الجديدة من المستوى 1.'], // TODO native review
 ['Your two innate traits stay with you throughout the run.','Vos deux traits innés restent actifs pendant toute la partie.','تبقى سمتاك الفطريتان معك طوال الجولة.'], // TODO native review
 ['Red ground warnings show where an enemy will attack.','Les marques rouges au sol annoncent les attaques ennemies.','توضح العلامات الحمراء على الأرض مكان هجوم العدو.'], // TODO native review
 ['Shallow water slows you down. Watch for eels!','L’eau peu profonde vous ralentit. Attention aux anguilles !','تبطئك المياه الضحلة. احذر الأنقليس!'], // TODO native review
 ['Move your HUD controls in Settings to suit your hands.','Déplacez les commandes de l’interface dans les réglages.','حرك أزرار الواجهة من الإعدادات لتناسب يديك.'], // TODO native review
 ['Pause to read your equipped skills and their descriptions.','Mettez en pause pour lire vos compétences équipées.','أوقف اللعب مؤقتا لقراءة مهاراتك المجهزة وأوصافها.'], // TODO native review
 ['Choose another companion skill at levels 8 and 14.','Choisissez une compétence de compagnon aux niveaux 8 et 14.','اختر مهارة أخرى لرفيقك في المستويين 8 و14.'], // TODO native review
];

export const loadingTips = loadingMessages.slice(13).map(([key]) => key);
