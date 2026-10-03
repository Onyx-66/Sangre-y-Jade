// Display-only examples from the specification. These are not equipped gameplay passives.
export const PASSIVE_FIXTURES = {
 counter: { id:'feast-of-the-fallen',name:'Feast of the Fallen',description:'Kill counter display fixture.',kind:'passive',art:17,level:3,hudState:{type:'counter',value:7,max:12} },
 timer: { id:'lunar-boon',name:'Lunar Boon',description:'Timer display fixture.',kind:'passive',art:24,level:2,hudState:{type:'timer',remaining:0,duration:12} },
 stacks: { id:'bloodlust',name:'Bloodlust',description:'Stack display fixture.',kind:'passive',art:10,level:5,hudState:{type:'stacks',value:3,max:5} },
};
export const ALLY_FIXTURE = {id:'saintess',name:'Saintess',level:3,skills:[
 {id:'renew',name:'Healing Prayer',description:'Periodically restores health.',art:17,cooldown:7,remaining:3,level:3},
 {id:'blessing',name:'Jade Blessing',description:'Periodically grants a protective shield.',art:4,cooldown:9,remaining:0,level:3},
 {id:'valor',name:'Valor',description:'Increases all hero damage.',art:10,cooldown:0,remaining:0,level:3},
]};

export function applyHudFixture(hud, activeSkills, locked) {
 hud.setSkills(activeSkills.slice(0,locked?3:4).map(skill=>({...skill,level:2,remaining:0})),locked?3:4);
 hud.setPassives([PASSIVE_FIXTURES.counter,...(locked?[]:[PASSIVE_FIXTURES.timer])],locked?1:2);
 hud.setAlly(ALLY_FIXTURE);
 hud.setStats({hp:80,maxHp:105,mana:73,maxMana:110,stamina:.85,xp:12,nextXp:40,level:locked?1:20,elapsed:45,duration:600,cacao:123,kills:42});
 hud.setCooldown(0,.65);hud.setCooldown(0,.25,true);
}
