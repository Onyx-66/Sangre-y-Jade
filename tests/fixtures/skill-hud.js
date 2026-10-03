// Display-only examples from the specification. These are not equipped gameplay passives.
import { ALLY_CATALOG } from '../../src/data/allyCatalog.js';
export const PASSIVE_FIXTURES = {
 counter: { id:'feast-of-the-fallen',name:'Feast of the Fallen',description:'Kill counter display fixture.',kind:'passive',art:17,level:3,hudState:{type:'counter',value:7,max:12} },
 timer: { id:'lunar-boon',name:'Lunar Boon',description:'Timer display fixture.',kind:'passive',art:24,level:2,hudState:{type:'timer',remaining:0,duration:12} },
 stacks: { id:'bloodlust',name:'Bloodlust',description:'Stack display fixture.',kind:'passive',art:10,level:5,hudState:{type:'stacks',value:3,max:5} },
};
export const ALLY_FIXTURE = {id:'saintess',name:'Saintess',level:10,rank:2,skills:[
 ...ALLY_CATALOG.saintess.filter(skill=>['healing-circle','jade-ward'].includes(skill.id)).map((skill,index)=>({...skill,kind:'ally',skillKind:'active',remaining:index?0:3,level:2})),
 {...ALLY_CATALOG.saintess.find(skill=>skill.id==='sacred-fervor'),kind:'ally',skillKind:'passive',remaining:0,level:2},
]};

export function applyHudFixture(hud, activeSkills, locked) {
 hud.setSkills(activeSkills.slice(0,locked?3:4).map(skill=>({...skill,level:2,remaining:0})),locked?3:4);
 hud.setPassives([PASSIVE_FIXTURES.counter,...(locked?[]:[PASSIVE_FIXTURES.timer])],locked?1:2);
 hud.setAlly(ALLY_FIXTURE);
 hud.setStats({hp:80,maxHp:105,mana:73,maxMana:110,stamina:.85,xp:12,nextXp:40,level:locked?1:20,elapsed:45,duration:600,cacao:123,kills:42});
 hud.setCooldown(0,.65);hud.setCooldown(0,.25,true);
}
