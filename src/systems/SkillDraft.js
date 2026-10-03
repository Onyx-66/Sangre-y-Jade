export const SLOT_RULES = Object.freeze({
  active: Object.freeze({ start: 3, unlocks: Object.freeze([{ level: 20, total: 4 }]), keys: Object.freeze(['Q', 'E', 'R', 'T']), maxLevel: 6 }),
  passive: Object.freeze({ start: 1, unlocks: Object.freeze([{ level: 10, total: 2 }]), maxLevel: 5 }),
  innate: Object.freeze(['survivors-will', 'jade-bounty']),
});

export function slotCount(kind, heroLevel = 1) {
  const rule = SLOT_RULES[kind];
  if (!rule || kind === 'innate') return kind === 'innate' ? rule?.length ?? 0 : 0;
  return rule.unlocks.reduce((count, unlock) => heroLevel >= unlock.level ? unlock.total : count, rule.start);
}

const card = (skill, kind, choiceType, meta, extra = {}) => ({
  ...skill, kind, choiceType, meta, ...extra,
});
const uniqueById = (items) => [...new Map(items.map((item) => [item.id, item])).values()];

/**
 * Drafts three distinct choices from the active/passive loadout pools.
 * New skills only appear while that kind has a free slot; full loadouts can
 * receive one 15% same-kind swap offer instead.
 */
export function draftSkills({
  activeSkills = [], passiveSkills = [], activeSlots = [], passiveSlots = [], innateSkills = [],
  activeCount = 3, passiveCount = 1, modifiers = [], boss = false,
  shuffle = (items) => [...items], random = Math.random, guaranteePassive = false,
} = {}) {
  const activeOwned = activeSlots;
  const passiveOwned = passiveSlots;
  const ownedIds = new Set([...activeOwned, ...passiveOwned].map((skill) => skill.id));
  SLOT_RULES.innate.forEach((id) => ownedIds.add(id));
  const activeNew = activeSkills.filter((skill) => !ownedIds.has(skill.id))
    .map((skill) => card(skill, 'active', 'new-active', 'New active skill'));
  const passiveNew = passiveSkills.filter((skill) => !ownedIds.has(skill.id) && !SLOT_RULES.innate.includes(skill.id))
    .map((skill) => card(skill, 'passive', 'new-passive', 'New passive skill'));
  const activeUpgrades = activeOwned.filter((skill) => skill.level < SLOT_RULES.active.maxLevel)
    .map((skill) => card(skill, 'active', 'upgrade-active', 'Active skill upgrade', { name: `${skill.name} · Lv ${skill.level + 1}` }));
  const passiveUpgrades = passiveOwned.filter((skill) => skill.level < SLOT_RULES.passive.maxLevel)
    .map((skill) => card(skill, 'passive', 'upgrade-passive', 'Passive skill upgrade', { name: `${skill.name} · Lv ${skill.level + 1}` }));
  const innateUpgrades=innateSkills.filter(skill=>SLOT_RULES.innate.includes(skill.id)&&skill.level<SLOT_RULES.passive.maxLevel)
    .map(skill=>card(skill,'passive','upgrade-passive','Passive skill upgrade',{name:`${skill.name} · Lv ${skill.level+1}`,innate:true}));
  const statCards = modifiers.map((modifier) => card(modifier, 'stat', 'stat', 'Stat upgrade'));
  const freeActive = activeOwned.length < activeCount;
  const freePassive = passiveOwned.length < passiveCount;
  const canSwapActive = !freeActive && activeNew.length > 0;
  const canSwapPassive = !freePassive && passiveNew.length > 0;
  let swap = null;
  if ((canSwapActive || canSwapPassive) && random() < 0.15) {
    const kind = canSwapActive && canSwapPassive ? (random() < 0.5 ? 'active' : 'passive') : canSwapActive ? 'active' : 'passive';
    const replacement = shuffle(kind === 'active' ? activeNew : passiveNew)[0];
    if (replacement) swap = { ...replacement, choiceType: 'swap', meta: `Swap ${kind} skill` };
  }

  const skillsOnly = [
    ...shuffle([...activeUpgrades, ...passiveUpgrades,...innateUpgrades]),
    ...(boss ? shuffle([...(freeActive ? activeNew : []), ...(freePassive ? passiveNew : [])]) : []),
  ];
  const required = [];
  if (freeActive && activeNew.length) required.push(shuffle(activeNew)[0]);
  if (freePassive && guaranteePassive && passiveNew.length) required.push(shuffle(passiveNew)[0]);
  const picks = uniqueById(required);
  const add = (candidate) => {
    if (picks.length >= 3 || picks.some((picked) => picked.id === candidate.id)) return;
    picks.push(candidate);
  };

  // Boss rewards prioritize skill upgrades, but free slots still get their required new skill.
  for (const candidate of skillsOnly) add(candidate);
  if (swap && !picks.some((picked) => picked.id === swap.id)) {
    if (picks.length >= 3) {
      let removable = -1;
      for (let index = picks.length - 1; index >= 0; index -= 1) {
        if (!required.some((entry) => entry.id === picks[index].id)) { removable = index; break; }
      }
      if (removable >= 0) picks.splice(removable, 1);
    }
    add(swap);
  }
  if (!boss) {
    for (const candidate of shuffle(statCards)) add(candidate);
    const allOwnedSkillsMaxed=activeUpgrades.length===0&&passiveUpgrades.length===0&&innateUpgrades.length===0
      &&activeOwned.length+passiveOwned.length>0&&(!freeActive||activeNew.length===0)&&(!freePassive||passiveNew.length===0);
    if (allOwnedSkillsMaxed&&!swap) {
      const heal=card({ id: 'draft-heal', name: 'Cacao Remedy', icon: '♥', description: 'Restore 30 health.' }, 'stat', 'stat', 'Restore health', { stat: 'heal', amount: 30 });
      if(picks.length>=3)picks.pop();
      add(heal);
    }
  }
  return picks.slice(0, 3);
}

/** Milestone rewards contain only skills of the unlocked slot's kind. */
export function draftMilestoneSkills(kind, options = {}) {
  const shuffle=options.shuffle||((items)=>[...items]);
  const passive=kind==='passive';
  const owned=passive?(options.passiveSlots||[]):(options.activeSlots||[]);
  const pool=passive?(options.passiveSkills||[]):(options.activeSkills||[]);
  const count=passive?(options.passiveCount??1):(options.activeCount??3);
  const maxLevel=passive?SLOT_RULES.passive.maxLevel:SLOT_RULES.active.maxLevel;
  const free=owned.length<count;
  const newCards=pool.filter((skill)=>!owned.some(entry=>entry.id===skill.id)&&!SLOT_RULES.innate.includes(skill.id))
    .map((skill)=>card(skill,kind,passive?'new-passive':'new-active',`New ${kind} skill`));
  const upgrades=owned.filter((skill)=>skill.level<maxLevel)
    .map((skill)=>card(skill,kind,passive?'upgrade-passive':'upgrade-active',`${kind==='active'?'Active':'Passive'} skill upgrade`,{name:`${skill.name} · Lv ${skill.level+1}`}));
  const picks=[];
  if(free&&newCards.length)picks.push(shuffle(newCards)[0]);
  for(const candidate of shuffle(upgrades))if(picks.length<3&&!picks.some(item=>item.id===candidate.id))picks.push(candidate);
  if(options.boss!==false&&free){
    for(const candidate of shuffle(newCards))if(picks.length<3&&!picks.some(item=>item.id===candidate.id))picks.push(candidate);
  }
  if(!free&&newCards.length&&(options.random||Math.random)()<.15){
    const replacement=shuffle(newCards)[0];
    if(replacement&&!picks.some(item=>item.id===replacement.id)){
      if(picks.length>=3)picks.pop();
      picks.push({...replacement,choiceType:'swap',meta:`Swap ${kind} skill`});
    }
  }
  return uniqueById(picks).slice(0,3);
}
