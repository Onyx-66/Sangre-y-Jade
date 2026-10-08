// Day jungle content: two hut villages, a stair-accessible temple and stela ruins.
export default {
 id:'overgrown',biomes:['broadleaf-jungle','palm-grove','mossy-ruins'],
 biomeProfiles:[{trees:1.2,rocks:.7},{trees:1,rocks:.8},{trees:.6,rocks:1.4}],
 sites:['landmark','settlement','settlement','ruins','stela-field','market'],
 houses:['hut-thatched-a','hut-thatched-b','hut-thatched-c'],buildingRange:[3,7],
 // Authored doors are about 104 native pixels tall; .9 keeps them above hero height.
 buildingScale:.9,
 landmark:{type:'temple',width:320,tiers:3,faces:['south','east','north','west'],randomFaces:true,top:'altar'},
 setPieces:{ruins:['temple-wall-a','temple-wall-corner'], 'stela-field':['stela-standing','stela-fallen','statue-jaguar','statue-warrior','statue-serpent'],market:['market-stall-a','market-stall-b']},
 densities:{trees:.7,rocks:.28,plants:.45,debris:.25,props:.18},
 vegetation:{trees:['tree-broadleaf-a','tree-broadleaf-b','tree-palm-a','tree-palm-b','tree-ceiba','tree-fig'],rocks:['rock-mossy-large','rock-mossy-small','stela-fallen']},
 water:{kind:'river-ponds',shallow:0x367c59,deep:0x205744},ground:[0x173f31,0x24563b,0x354b38],
 lights:['torch-post'],spawn:{allowed:['dry-land'],exclude:['platform','plaza','door-approach']},bridgeStyle:'wood',wall:'temple-wall-a'
};
