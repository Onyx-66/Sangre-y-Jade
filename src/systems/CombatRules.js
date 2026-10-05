export const ALLY_LEVEL = 5;
export const isGroundOnly = hero => hero.automatic.type === 'melee';
export const canSpawnEnemy = (hero,type) => !(isGroundOnly(hero) && ['bat','jungle_wasp'].includes(type));
export function enemyPool(hero,level,progress) {
  const pool=['shade'];
  if(canSpawnEnemy(hero,'bat'))pool.push('bat');
  if(level>=3||progress>.12)pool.push('serpent');
  if(level>=ALLY_LEVEL||progress>.28)pool.push('jaguar');
  if(level>=9||progress>.42)pool.push('priest');
  return pool;
}
export function bossForHero(hero,boss) {
  if(!isGroundOnly(hero))return boss;
  if(boss.id==='camazotz')return {...boss,id:'jaguar-chief',name:'Jaguar Chieftain',artKey:'enemy-jaguar'};
  if(boss.id==='vucub')return {...boss,id:'high-priest',name:'High Priest',artKey:'enemy-priest'};
  return boss;
}
export function spawnOutsideView(view,random=Math.random,padding=90) {
  const side=Math.floor(random()*4),along=random();
  const {x,y,width,height}=view;
  if(side===0)return {x:x-padding,y:y+along*height};
  if(side===1)return {x:x+width+padding,y:y+along*height};
  if(side===2)return {x:x+along*width,y:y-padding};
  return {x:x+along*width,y:y+height+padding};
}
export function facingFor(x,y,previous='side') {
  if(Math.hypot(x,y)<5)return previous;
  return Math.abs(y)>Math.abs(x)*1.15 ? (y<0?'up':'down') : 'side';
}
