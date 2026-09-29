// Support skills are autonomous. Their rank follows the hero after level 5.
const make=(id,name,fr,ar,description,frDescription,arDescription,art,cooldown=0)=>({id,name,fr,ar,description,frDescription,arDescription,art,cooldown});
export const SUPPORTS={
 saintess:{id:'saintess',name:'Saintess',description:'Heals, shields, and buffs your hero.',supportPortrait:'saintess',color:0xa3ffe1,skills:[
  make('renew','Healing Prayer','Prière de soin','صلاة الشفاء','Periodically restores health.','Restaure régulièrement la vie.','تستعيد الصحة بشكل دوري.',17,7),
  make('blessing','Jade Blessing','Bénédiction de jade','بركة اليشم','Periodically grants a protective shield.','Accorde régulièrement un bouclier.','تمنح درع حماية بشكل دوري.',4,9),
  make('valor','Valor','Vaillance','الشجاعة','Increases all hero damage.','Augmente les dégâts du héros.','تزيد جميع أضرار البطل.',10),
  make('focus','Focus','Concentration','التركيز','Improves attack and skill cooldown recovery.','Accélère les attaques et la recharge.','تسرع الهجوم واستعادة المهارات.',24),
  make('renewal-song','Renewal Song','Chant du renouveau','أنشودة التجدد','Continuously regenerates health.','Régénère la vie en continu.','تجدد الصحة باستمرار.',38),
  make('well','Spirit Well','Source spirituelle','نبع الروح','Restores mana, or health to heroes without mana.','Rend du mana, ou de la vie sans mana.','تستعيد المانا أو الصحة لمن لا يستخدم المانا.',29,8),
  make('sanctuary','Sanctuary','Sanctuaire','الملاذ','Reduces incoming damage.','Réduit les dégâts subis.','تقلل الضرر المتلقى.',20),
  make('wind','Guiding Wind','Vent guide','الريح المرشدة','Increases movement speed.','Augmente la vitesse de déplacement.','تزيد سرعة الحركة.',45),
  make('purify','Purifying Light','Lumière purificatrice','نور التطهير','Clears nearby hostile projectiles.','Dissipe les projectiles ennemis proches.','تزيل مقذوفات الأعداء القريبة.',28,10),
  make('rescue','Saving Grace','Grâce salvatrice','النجاة','Prevents a fatal hit, heals, then recharges.','Évite un coup fatal, soigne, puis recharge.','تمنع ضربة قاتلة وتشفي ثم تعيد الشحن.',62,45),
 ]},
 tank:{id:'tank',name:'Tank',description:'Guards you, blocks shots, and lays traps.',supportPortrait:'tank',color:0xffce80,skills:[
  make('guard','Bodyguard','Garde du corps','الحارس','Reduces damage while the Tank is nearby.','Réduit les dégâts si le Tank est proche.','تقلل الضرر عندما يكون الحارس قريبا.',4),
  make('bomb','Clay Bomb','Bombe d’argile','قنبلة طينية','Places a proximity bomb near the hero.','Pose une bombe de proximité près du héros.','تضع قنبلة قرب البطل تنفجر عند اقتراب العدو.',8,5),
  make('intercept','Shield Wall','Mur de boucliers','جدار الدروع','Blocks hostile projectiles near the Tank.','Bloque les projectiles proches du Tank.','تصد المقذوفات القريبة من الحارس.',54),
  make('snare','Root Snare','Piège de racines','فخ الجذور','Places a trap that slows nearby enemies.','Pose un piège qui ralentit les ennemis.','تضع فخا يبطئ الأعداء القريبين.',37,7),
  make('taunt','Taunt','Provocation','الاستفزاز','Draws non-boss enemies away from you briefly.','Attire brièvement les ennemis hors boss.','تجذب الأعداء غير الزعماء بعيدا عنك مؤقتا.',1,9),
  make('bash','Shield Bash','Coup de bouclier','ضربة الدرع','Stuns and damages the nearest threat.','Étourdit et blesse la menace proche.','تصعق أقرب تهديد وتلحق به الضرر.',3,4),
  make('barrier','Stone Barrier','Barrière de pierre','حاجز الحجر','Grants the hero a sturdy shield.','Accorde un solide bouclier au héros.','تمنح البطل درع حماية قوي.',19,11),
  make('shockwave','Ground Slam','Choc au sol','ضربة الأرض','Damages and stuns nearby enemies.','Blesse et étourdit les ennemis proches.','تلحق الضرر بالأعداء القريبين وتصعقهم.',7,8),
  make('fortify','Fortify','Fortification','التحصين','Increases the hero’s armor.','Augmente l’armure du héros.','تزيد دروع البطل.',22),
  make('bulwark','Last Bastion','Dernier bastion','الحصن الأخير','Blocks a hit when health is low, then recharges.','Bloque un coup à faible vie, puis recharge.','تصد ضربة عند انخفاض الصحة ثم تعيد الشحن.',5,18),
 ]},
 assassin:{id:'assassin',name:'Assassin',description:'Hunts the enemy with the highest threat.',supportPortrait:'assassin',color:0xd4a5ff,skills:[
  make('ambush','Ambush','Embuscade','الكمين','Strikes the most dangerous enemy.','Frappe l’ennemi le plus dangereux.','تضرب أخطر عدو.',2,3),
  make('mark','Death Mark','Marque mortelle','علامة الموت','Marks the top threat to take extra damage.','La cible prioritaire subit plus de dégâts.','تزيد الضرر المتلقى على أخطر عدو.',16,7),
  make('execute','Execute','Exécution','الإجهاز','Deals extra damage to a weakened top threat.','Frappe plus fort une cible prioritaire affaiblie.','تلحق ضررا إضافيا بأخطر عدو مصاب.',49,5),
  make('venom','Venom Blade','Lame venimeuse','النصل المسموم','Poisons the most dangerous enemy over time.','Empoisonne la cible prioritaire.','تسمم أخطر عدو وتؤذيه تدريجيا.',46,6),
  make('silence','Silencing Dart','Fléchette du silence','سهم الصمت','Interrupts the top threat’s ranged attacks.','Interrompt les tirs de la cible prioritaire.','توقف هجمات أخطر عدو بعيدة المدى.',42,8),
  make('disarm','Disarm','Désarmement','نزع السلاح','Reduces the top threat’s outgoing damage.','Réduit les dégâts de la cible prioritaire.','تقلل الضرر الذي يسببه أخطر عدو.',44,7),
  make('rupture','Rupture','Rupture','التمزق','Makes the top threat bleed over time.','Fait saigner la cible prioritaire.','تسبب نزيفا تدريجيا لأخطر عدو.',48,6),
  make('pursuit','Relentless Pursuit','Poursuite acharnée','المطاردة','Speeds up the Assassin’s basic attacks.','Accélère les attaques de l’Assassin.','تسرع هجمات القاتل الأساسية.',65),
  make('volley','Knife Volley','Volée de lames','وابل السكاكين','Hits the top threat with several knives.','Plusieurs lames frappent la cible prioritaire.','تصيب أخطر عدو بعدة سكاكين.',36,6),
  make('smoke','Smoke Cover','Écran de fumée','ستار الدخان','Slows the top threat and briefly protects you.','Ralentit la cible et vous protège brièvement.','تبطئ أخطر عدو وتحميك مؤقتا.',11,10),
 ]},
};
export const supportRank=heroLevel=>Math.max(1,heroLevel-4);
export function threatScore(enemy,player){
 const d=enemy.getData.bind(enemy),distance=Math.hypot(enemy.x-player.x,enemy.y-player.y);
 // Potential damage is primary, then boss/ranged pressure and proximity.
 return (d('damage')||0)*(d('ranged')?1.5:1)+(d('isBoss')?25:0)+Math.max(0,1-distance/750)*10;
}
export function dangerousEnemy(enemies,player,range=750){
 return enemies.filter(e=>e?.active&&Math.hypot(e.x-player.x,e.y-player.y)<=range).sort((a,b)=>threatScore(b,player)-threatScore(a,player))[0]||null;
}
