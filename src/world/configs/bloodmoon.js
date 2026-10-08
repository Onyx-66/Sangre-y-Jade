// Night ritual district: burned hut ring, two-face platform, ossuary and torch avenues.
export default {
 id:'bloodmoon',biomes:['ash-swamp','burned-village','ritual-stone'],
 biomeProfiles:[{trees:1.1,rocks:.7},{trees:.8,rocks:1},{trees:.6,rocks:1.4}],
 sites:['landmark','settlement','ossuary','bone-field','ruins'],
 houses:['hut-burned-a','hut-burned-b','hut-burned-c'],buildingRange:[3,7],buildingScale:1.2,structureScales:{ossuary:1.05},
 landmark:{type:'pyramid',width:320,tiers:3,faces:['south','north'],top:'brazier-stone'},
 setPieces:{ossuary:['ossuary'], 'bone-field':['skull-pile','bone-pile'],ruins:['temple-wing-collapsed','skull-rack']},
 densities:{trees:.28,rocks:.4,plants:.18,debris:.38,props:.2},
 placeholderTints:{},
 vegetation:{trees:['tree-dead-a','tree-dead-b','tree-burned','tree-thorn'],rocks:['skull-pile','bone-pile','obsidian-shard-a']},
 water:{kind:'swamp-pools',shallow:0x353d38,deep:0x242b31},ground:[0x201c2c,0x432b3b,0x332b35],
 lights:['torch-post-lit','torch-ground','brazier-stone'],torchAvenues:true,
 spawn:{allowed:['dry-land'],exclude:['platform','plaza','door-approach']},bridgeStyle:'wood',wall:'gate-ruined'
};
