// Cavern content: shallow-bank lake, bridged shrine island and stilt-only dock footprints.
export default {
 id:'cenote',biomes:['wet-cave','crystal-field','root-grove'],
 biomeProfiles:[{trees:.7,rocks:1},{trees:.5,rocks:1.4},{trees:1.4,rocks:.7}],
 sites:['landmark','island','settlement','crystal-field','root-grove'],
 houses:['dock-hut-a','dock-hut-b'],buildingRange:[3,5],
 landmark:{type:'pyramid',width:320,tiers:3,faces:['south'],top:'altar-water',edgeGate:'temple-gate-submerged'},
 setPieces:{island:['shrine-island'],'crystal-field':['crystal-cyan','crystal-violet','crystal-green'],'root-grove':['root-giant','root-hanging-a']},
 densities:{trees:.24,rocks:.65,plants:.2,debris:.14,props:.2},
 vegetation:{trees:['root-hanging-a','root-giant','mushroom-giant-a','mushroom-giant-b'],rocks:['crystal-cyan','crystal-violet','crystal-green','stalagmite-a']},
 water:{kind:'lake',shallow:0x368e8c,deep:0x175365},ground:[0x101d2b,0x18354a,0x293b54],
 lights:['crystal-cyan','crystal-violet','crystal-green','lantern-hanging','crystal-lamp'],
 spawn:{allowed:['dry-land'],exclude:['platform','plaza','door-approach','dock']},bridgeStyle:'rope-and-wood'
};
