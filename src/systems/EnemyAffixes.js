export const AFFIXES = ['armored', 'swift', 'vampiric', 'explosive', 'shielded'];
export const AFFIX_NAMES = {armored:'Armored',swift:'Swift',vampiric:'Vampiric',explosive:'Explosive',shielded:'Shielded'};
export const enemyAffixDefaults = () => ({affix:null,shield:0,maxShield:0,shieldRegenAt:0,
  damagedUntil:0,targetedUntil:0,spawningUntil:0,contactReadyUntil:0,nextContact:0});

// First roll is 1% at 1:30, then +1 percentage point every 20 seconds.
export const eliteChance = seconds => seconds < 90 ? 0 : Math.min(.25,(1+Math.floor((seconds-90)/20))*.01);
export function rollAffix(seconds, random=Math.random) {
  return random()<eliteChance(seconds)?AFFIXES[Math.min(4,Math.floor(random()*5))]:null;
}
export function applyAffix(enemy, affix) {
  if(!AFFIXES.includes(affix))return;
  enemy.setData('affix',affix);
  enemy.setData('xp',enemy.getData('xp')*3);
  if(affix==='armored')enemy.setData({hp:enemy.getData('hp')*1.6,maxHp:enemy.getData('maxHp')*1.6});
  if(affix==='swift')enemy.setData('speed',enemy.getData('speed')*1.35);
  if(affix==='shielded')enemy.setData({shield:40,maxShield:40,shieldRegenAt:0});
}
export function frontalDamageMult(enemy, origin, dot=false) {
  if(enemy.getData('affix')!=='armored'||dot||!origin)return 1;
  // Facing is the actual heading, not merely the sprite's horizontal flip.
  const heading=enemy.getData('heading')??(enemy.flipX?Math.PI:0);
  const angle=Math.atan2(origin.y-enemy.y,origin.x-enemy.x)-heading;
  return Math.cos(angle)>=0?.6:1;
}
export function absorbEnemyShield(enemy,damage,seconds) {
  const ward=enemy.getData('wardUntil')>seconds?Math.max(0,enemy.getData('wardShield')||0):0,wardBlocked=Math.min(ward,damage);
  if(wardBlocked)enemy.setData('wardShield',ward-wardBlocked);
  damage-=wardBlocked;
  const shield=Math.max(0,enemy.getData('shield')||0),blocked=Math.min(shield,damage);
  if(blocked){enemy.setData('shield',shield-blocked);if(blocked===shield&&enemy.getData('affix')==='shielded')enemy.setData('shieldRegenAt',seconds+6);}
  return damage-blocked;
}
export function updateEnemyShield(enemy,seconds) {
  if(enemy.getData('wardUntil')<=seconds&&enemy.getData('wardShield'))enemy.setData('wardShield',0);
  if(enemy.getData('affix')==='shielded'&&enemy.getData('shield')===0&&enemy.getData('shieldRegenAt')>0&&seconds>=enemy.getData('shieldRegenAt'))
    enemy.setData({shield:40,shieldRegenAt:0});
}
export function healVampiric(enemy,actualDamage) {
  if(enemy?.active&&enemy.getData('affix')==='vampiric'&&actualDamage>0)
    enemy.setData('hp',Math.min(enemy.getData('maxHp'),enemy.getData('hp')+actualDamage*.3));
}
