import { COLLECTION_ROSTER } from './collection-roster.mjs?v=41';

// Art direction, not game balance. Every roster ID has a deliberately authored
// anatomy, proportions, fins and field marks. Related fish share construction
// techniques, never a name-regex cube or a randomly recoloured generic mesh.
// Dimensions describe the trunk, before the tail, bill, fins or tentacles.
const families = {
  sunfish: { tail:'round', dorsal:'spiny', mouth:'small', eye:[.35,.16], traits:['ear-flap'] },
  bass: { tail:'notched', dorsal:'notched', mouth:'large', eye:[.34,.17] },
  perch: { tail:'fork', dorsal:'double', mouth:'medium', eye:[.36,.16] },
  'silver-bass': { tail:'fork', dorsal:'double', mouth:'medium', marks:'horizontal' },
  carp: { tail:'fork', dorsal:'long', mouth:'lips', traits:['barbels-short'], marks:'scales' },
  trout: { tail:'notched', dorsal:'soft', mouth:'medium', traits:['adipose'], marks:'spots' },
  catfish: { tail:'fork', dorsal:'cat', mouth:'wide', eye:[.4,.12], traits:['barbels-long','adipose'] },
  pike: { tail:'fork', dorsal:'rear', mouth:'duckbill', snout:.29, traits:['teeth'] },
  cod: { tail:'round', dorsal:'cod', mouth:'wide', traits:['chin-barbel'], marks:'mottled' },
  gar: { tail:'round', dorsal:'rear', mouth:'bill', snout:.51, traits:['teeth','ganoid-scales'] },
  paddlefish: { tail:'heterocercal', dorsal:'rear', mouth:'under', snout:.75, traits:['paddle'] },
  eel: { tail:'ribbon', dorsal:'ribbon', mouth:'medium', eye:[.43,.13], traits:[] },
  sturgeon: { tail:'heterocercal', dorsal:'rear', mouth:'under', snout:.24, traits:['scutes','barbels-chin'] },
  bowfin: { tail:'round', dorsal:'long', mouth:'large', traits:['tail-eye'] },
  snakehead: { tail:'round', dorsal:'long', mouth:'large', traits:['head-plates'] },
  dorado: { tail:'fork', dorsal:'soft', mouth:'large', traits:['adipose','teeth'], marks:'scales' },
  arapaima: { tail:'round', dorsal:'rear-long', mouth:'wide', traits:['plate-scales'] },
  gourami: { tail:'round', dorsal:'long', mouth:'lips', traits:['feelers','forehead'] },
  pacu: { tail:'notched', dorsal:'soft', mouth:'small', traits:['adipose'] },
  ray: { tail:'whip', dorsal:'none', mouth:'ventral', traits:['disc','spiracles'] },
  shark: { tail:'heterocercal', dorsal:'shark', mouth:'under', traits:['gill-slits','shark-fins'], eye:[.41,.06] },
  trevally: { tail:'lunate', dorsal:'sickle', mouth:'medium', traits:['lateral-scutes'] },
  wrasse: { tail:'truncate', dorsal:'long', mouth:'lips', traits:['forehead','cheek-maze'], marks:'reticulated' },
  mola: { tail:'clavus', dorsal:'vertical', mouth:'lips', traits:['disc-body'] },
  coelacanth: { tail:'trilobe', dorsal:'lobed', mouth:'medium', traits:['lobed-fins','plate-scales'], marks:'pale-spots' },
  oarfish: { tail:'ribbon', dorsal:'mane', mouth:'tube', traits:['crest-streamers','pelvic-oars'] },
  manta: { tail:'whip', dorsal:'none', mouth:'ventral', traits:['wings','cephalic-lobes','spiracles'] },
  marlin: { tail:'lunate', dorsal:'sail', mouth:'bill', snout:.68, traits:['bill','keel'] },
  opah: { tail:'fork', dorsal:'sickle', mouth:'small', traits:['disc-body'], marks:'pale-spots' },
  angler: { tail:'round', dorsal:'soft', mouth:'cavern', traits:['lure','fangs','feet-fins'] },
  squid: { tail:'arms', dorsal:'none', mouth:'beak', traits:['mantle','eight-arms','two-tentacles','suckers'] },
  octopus: { tail:'arms', dorsal:'none', mouth:'beak', traits:['eight-arms','suckers'] },
  'flatfish': { tail:'none', dorsal:'none', mouth:'small', traits:[] },
  'shrimp': { tail:'none', dorsal:'none', mouth:'small', traits:[] },
  'isopod': { tail:'none', dorsal:'none', mouth:'small', traits:[] },
  'sea-spider': { tail:'none', dorsal:'none', mouth:'small', traits:[] },
  'starfish': { tail:'none', dorsal:'none', mouth:'small', traits:[] },
  whale: { tail:'flukes', dorsal:'shark', mouth:'wide', traits:['throat-pleats','blowhole','flippers'] },
  wyrm: { tail:'ribbon', dorsal:'ribbon', mouth:'fang', traits:['fangs','spines'] },
  leviathan: { tail:'lunate', dorsal:'shark', mouth:'large', traits:['lobed-fins','keel'] },
  armored: { tail:'notched', dorsal:'spiny', mouth:'wide', traits:['armor','head-plates'] },
};

// Five colours: dorsal countershade, flank, belly, fins, field marks. Fish such
// as Bluegill and Rainbow Trout now use actual olive/silver flanks rather than
// filling the entire body with their old UI accent colour.
const palettes = {
  olive:[0x3b5140,0x899457,0xeee1a2,0x758451,0x384c40],
  bronze:[0x4f5034,0xa68c53,0xe3d5a0,0x92764b,0x514936],
  silver:[0x425c68,0xb5c9c6,0xf0ece0,0x7e9294,0x334a54],
  gold:[0x956122,0xedd16a,0xffedb0,0xd8a24c,0x8e622d],
  trout:[0x40594d,0x9fb4a1,0xe9e3c9,0x879d8c,0x2e4140],
  cat:[0x455c61,0x829899,0xd9d9c0,0x627e81,0x364e50],
  shark:[0x425b6e,0x8fa4ad,0xf2efdd,0x657d8b,0x334858],
  deep:[0x182b40,0x435a70,0x8caaa9,0x2d415e,0x9ee6d6],
  violet:[0x292b4e,0x666287,0xb8b2c9,0x4b4c73,0xd9b8ee],
  bone:[0x7b877e,0xc5cab4,0xf1ecce,0xa7b8b0,0x596d6c],
  moon:[0x697eaa,0xb3d6e2,0xf2edda,0x8cadd2,0xf3e5b1],
  root:[0x293e37,0x627457,0xa5a47a,0x41534b,0xc0b989],
};
const p=(id,family,body,palette,options={})=>{
  const base=families[family];
  const tones=typeof palette==='string'?palettes[palette]:palette;
  return [id,{family,body,tones,tail:base.tail,dorsal:base.dorsal,mouth:base.mouth,
    eye:base.eye||[.36,.16],snout:base.snout||0,marks:base.marks||'none',
    tailSize:1,finSize:1,head:1,eyeSize:1,traits:[...(base.traits||[])],...options}];
};
const designs = [
  // Reedhaven: compressed panfish, muscular bass, small minnows and deep carp.
  p('bluegill','sunfish',[1.06,.65,.24],[0x374b48,0x718b72,0xe3bd6b,0x697e69,0x344d55],{marks:'bars',ear:0x132f40,cheek:0x5f9eac,finSize:1.05}),
  p('pumpkinseed','sunfish',[.98,.64,.22],[0x4b6555,0xaaa25e,0xf0c16a,0xc49658,0xca6738],{marks:'sun-spots',ear:0xc85a32,cheek:0x54a5ad,traits:['ear-flap','cheek-maze'],tailSize:.89}),
  p('rock-bass','sunfish',[1.12,.56,.34],'bronze',{marks:'checker',eyeColor:0xc15536,mouth:'large',head:1.12,ear:0x445044}),
  p('yellow-perch','perch',[1.45,.45,.29],[0x4f6c44,0xe1c861,0xf7e5a3,0xc17a3b,0x3c5545],{marks:'bars',finSize:1.08,barCount:6}),
  p('black-crappie','sunfish',[1.18,.72,.23],'silver',{marks:'pepper',mouth:'large',head:1.05,ear:0x5e7774,tail:'notched',finSize:1.17}),
  p('green-sunfish','sunfish',[1.13,.51,.29],[0x344e40,0x6b956d,0xd5c681,0x8e995c,0x315f60],{mouth:'large',marks:'fine-spots',cheek:0x5da7a6,ear:0x1e4245,traits:['ear-flap','fin-rim'],finSize:.9}),
  p('warmouth','sunfish',[1.07,.56,.32],'bronze',{marks:'mottled',mouth:'large',head:1.15,eyeColor:0xb36141,traits:['ear-flap','cheek-rays'],tailSize:.92}),
  p('white-perch','silver-bass',[1.27,.48,.29],'silver',{marks:'fine-scales',tail:'notched',finSize:.86}),
  p('redear-sunfish','sunfish',[1.16,.68,.25],[0x4b5b49,0x9b9c70,0xe4d199,0x889567,0x4d694d],{marks:'fine-spots',ear:0xd85c35,head:.94,finSize:1.11}),
  p('brown-bullhead','catfish',[1.38,.46,.50],[0x403e30,0x817954,0xd5c38d,0x676143,0x403f2e],{tail:'truncate',marks:'mottled',head:1.22,tailSize:.9,eyeSize:.85}),
  p('largemouth-bass','bass',[1.47,.57,.38],'olive',{marks:'lateral-band',head:1.25,tailSize:1.03,traits:['extended-jaw']}),
  p('smallmouth-bass','bass',[1.38,.54,.35],'bronze',{marks:'bars',mouth:'medium',head:.95,eyeColor:0xc17945,finSize:1.06}),
  p('spotted-bass','bass',[1.42,.50,.32],'olive',{marks:'broken-band',head:1.04,traits:['belly-spots'],tailSize:.94}),
  p('yellow-bass','silver-bass',[1.23,.49,.25],[0x5b653e,0xcbbb6c,0xf0df9c,0x9a9459,0x4e5941],{marks:'broken-horizontal',finSize:.92}),
  p('white-bass','silver-bass',[1.34,.56,.31],'silver',{marks:'horizontal',head:1.1,finSize:1.02}),
  p('river-carp','carp',[1.47,.70,.43],'bronze',{head:1.09,finSize:1.12,tailSize:1.08}),
  p('grass-carp','carp',[1.67,.42,.35],'olive',{dorsal:'soft',traits:[],mouth:'small',head:.9,tailSize:1.1}),
  p('longear-sunfish','sunfish',[.93,.62,.22],[0x435957,0xd2a35a,0xecc471,0x6f998b,0x419aa0],{marks:'sun-spots',ear:0x213f44,earLength:1.7,cheek:0x54a9b2,traits:['ear-flap','cheek-maze'],tailSize:.85}),
  p('saugeye','perch',[1.52,.47,.32],'olive',{marks:'mottled-bars',eyeColor:0xe8d98a,traits:['white-tail-tip','teeth'],head:1.1}),
  p('creek-chub','carp',[1.30,.36,.26],[0x535e4a,0xa8a586,0xe9e1bd,0x9b956e,0x4a5141],{tail:'fork',dorsal:'soft',mouth:'medium',marks:'lateral-band',traits:['dorsal-spot'],head:.95,finSize:.77}),

  // Pinewater: adipose fins, salmon jaws, flattened cat heads and rear-finned pike.
  p('rainbow-trout','trout',[1.50,.46,.33],'trout',{marks:'rainbow',stripe:0xcb7c91,tail:'notched',finSize:.92}),
  p('brown-trout','trout',[1.48,.49,.35],[0x535841,0xba9e61,0xecd28b,0xa68b57,0x3f473c],{marks:'red-spots',head:1.08,tail:'truncate'}),
  p('brook-trout','trout',[1.36,.44,.30],[0x304c43,0x6d8a63,0xd5a365,0xb87345,0xd8d594],{marks:'vermiculated',traits:['adipose','white-fin-edge'],tail:'truncate',eyeColor:0xce9e55}),
  p('walleye','perch',[1.62,.48,.34],'olive',{marks:'mottled',eyeColor:0xf2dda4,eyeSize:1.3,traits:['white-tail-tip','teeth'],head:1.08}),
  p('sauger','perch',[1.45,.40,.27],[0x4b5441,0xa0a47a,0xded6ad,0x8b9166,0x3e4b3c],{marks:'saddles',traits:['dorsal-spots','teeth'],eyeColor:0xd4c887,finSize:.94}),
  p('channel-catfish','catfish',[1.69,.46,.47],'cat',{marks:'fine-spots',tailSize:1.22,head:1.04}),
  p('tiger-muskie','pike',[1.95,.39,.30],'olive',{marks:'tiger',snout:.32,finSize:1.06,tailSize:1.08}),
  p('northern-pike','pike',[2.04,.38,.31],[0x3e5841,0x7d9362,0xe3d8a1,0x9a8c54,0xd9d6a0],{marks:'pale-dashes',snout:.35,head:1.08}),
  p('burbot','cod',[1.81,.36,.36],[0x3c4635,0x7c8060,0xc9bd8c,0x6b7557,0x424b36],{tailSize:.82,finSize:.82,head:1.2}),
  p('blue-catfish','catfish',[1.84,.58,.52],[0x3d586e,0x839eac,0xe4e5d2,0x637f91,0x415a70],{tailSize:1.22,head:1.16,traits:['barbels-long','adipose','straight-anal']}),
  p('muskellunge','pike',[2.15,.42,.32],[0x4a5e43,0x9aab7a,0xe5dfb1,0x927e4e,0x53664a],{marks:'bars',snout:.31,finSize:1.08,tailSize:1.12}),
  p('striped-bass','silver-bass',[1.75,.60,.43],'silver',{marks:'horizontal',tailSize:1.22,head:1.14,finSize:1.13}),
  p('lake-trout','trout',[1.66,.50,.38],[0x354b49,0x7b9288,0xe1dfbd,0x7a8b7d,0xcbd2b0],{marks:'pale-spots',tail:'fork',head:1.13,tailSize:1.15}),
  p('chinook-salmon','trout',[1.84,.62,.43],'silver',{marks:'back-spots',traits:['adipose','black-gums','hook-jaw'],head:1.2,finSize:1.1,tail:'fork'}),
  p('coho-salmon','trout',[1.59,.55,.36],[0x405c57,0xb77b70,0xdfd2bb,0x886b5d,0x3c504b],{marks:'back-spots',traits:['adipose','hook-jaw'],tail:'notched',head:1.09}),
  p('steelhead','trout',[1.76,.49,.38],[0x435f65,0xbdceca,0xf0eee3,0x8b9c9b,0x33474f],{marks:'rainbow',stripe:0xc597aa,tail:'fork',head:1.12,tailSize:1.12}),
  p('flathead-catfish','catfish',[1.77,.46,.67],[0x494c34,0x8b8957,0xdfd1a3,0x7c7c4f,0x4c5539],{tail:'truncate',marks:'mottled',head:1.35,finSize:.84}),
  p('bighead-carp','carp',[1.62,.73,.52],'silver',{marks:'mottled',eye:[.39,-.15],traits:[],dorsal:'soft',head:1.4,mouth:'upturned'}),
  p('silver-carp','carp',[1.60,.61,.38],[0x4e6666,0xc0d1c5,0xf3edce,0x8b9e93,0x7b9185],{marks:'fine-scales',eye:[.41,-.13],traits:['belly-keel'],dorsal:'soft',head:1.23,mouth:'upturned',tailSize:1.13}),
  p('golden-koi','carp',[1.39,.59,.41],'gold',{tail:'flowing',marks:'gold-scales',traits:['barbels-short','flowing-fins'],tailSize:1.2,finSize:1.1}),

  // Sunscar: specialised rostra, armour, rays and ancient river anatomies.
  p('mirror-carp','carp',[1.60,.79,.47],'bronze',{marks:'mirror-scales',head:1.12,tailSize:1.16}),
  p('leather-carp','carp',[1.64,.76,.49],[0x5c5d43,0xa9a273,0xe0cda0,0x8c8058,0x605e45],{marks:'leather',head:1.17,finSize:1.04}),
  p('atlantic-salmon','trout',[1.78,.53,.38],'silver',{marks:'cross-spots',traits:['adipose','hook-jaw'],tail:'fork',head:1.17}),
  p('alligator-gar','gar',[1.94,.42,.43],'olive',{snout:.57,marks:'diamond',head:1.2,tailSize:1.05}),
  p('paddlefish','paddlefish',[1.68,.43,.40],[0x354d60,0x7f99a4,0xdde5d4,0x637c8c,0x3c5765],{head:1.12,tailSize:1.13}),
  p('bowfin','bowfin',[1.65,.43,.34],'olive',{marks:'mottled',finSize:1.03,tailSize:.96}),
  p('american-eel','eel',[2.50,.24,.24],[0x34493a,0x73856a,0xd8cda0,0x6b7f61,0x445746],{marks:'none',finSize:.78}),
  p('lake-sturgeon','sturgeon',[1.90,.39,.35],[0x4e6159,0x929e89,0xe1d9b7,0x7b8d7d,0xbcc8ac],{tailSize:1.16,head:.95}),
  p('giant-snakehead','snakehead',[1.91,.49,.43],[0x343c39,0x8e8a75,0xd5c5a1,0x595e58,0x333d36],{marks:'snake-bands',head:1.23}),
  p('golden-dorado','dorado',[1.62,.59,.40],[0x686a33,0xe5c758,0xf5e0a1,0xd67d3e,0x7a6b33],{marks:'gold-scales',head:1.17,traits:['adipose','teeth','black-tail-edge']}),
  p('wels-catfish','catfish',[2.22,.47,.59],[0x333e3c,0x73817a,0xcdd0b1,0x556d64,0x364d44],{tail:'round',dorsal:'tiny',head:1.31,traits:['barbels-long','long-anal'],marks:'mottled'}),
  p('goonch','catfish',[1.88,.48,.65],[0x45463a,0x8a8164,0xd2c395,0x74694e,0x3d4437],{marks:'saddles',head:1.35,finSize:1.35,traits:['barbels-long','adipose','pectoral-spines']}),
  p('arapaima','arapaima',[2.18,.55,.46],[0x3b4f47,0x7e9080,0xc7bc96,0x9e5847,0xc76b4c],{marks:'red-scales',head:1.15,tailSize:.92}),
  p('giant-gourami','gourami',[1.23,.83,.40],[0x6b6651,0xbdb08c,0xe7d9ac,0x9b9471,0x716e55],{marks:'fine-scales',head:1.2,finSize:.97}),
  p('mekong-giant-catfish','catfish',[1.97,.70,.67],[0x607779,0xa9bcb6,0xe7e6cf,0x91a7a2,0x6c8482],{traits:['adipose'],head:1.37,eyeSize:.72,tailSize:1.15}),
  p('giant-stingray','ray',[1.22,.19,1.54],[0x535947,0x8c9171,0xded9b6,0x7c8569,0x454c3b],{marks:'fine-spots',tailSize:1.35}),
  p('black-pacu','pacu',[1.12,.88,.38],[0x293f3b,0x526e63,0x9b9e78,0x3c514c,0x29453f],{head:.94,finSize:1.05}),
  p('tambaqui','pacu',[1.29,.94,.46],[0x4d6359,0xa2ad8b,0x424e3e,0x5a6450,0x53694e],{marks:'fine-scales',head:1.05,tailSize:1.13}),
  p('bull-shark','shark',[1.90,.60,.60],'shark',{head:1.3,tailSize:1.14,finSize:1.1}),
  p('golden-mahseer','carp',[1.73,.56,.40],'gold',{dorsal:'soft',head:.95,tailSize:1.28,marks:'gold-scales',traits:['barbels-short','thick-lips']}),

  // Frostfall: ocean forms and the first clearly fantastical silhouettes.
  p('goliath-tigerfish','dorado',[1.86,.57,.40],'silver',{marks:'horizontal',head:1.24,traits:['adipose','fangs'],finColor:0xad6844,tailSize:1.22}),
  p('giant-trevally','trevally',[1.52,.78,.42],'silver',{head:1.28,marks:'fine-spots',finSize:1.2}),
  p('napoleon-wrasse','wrasse',[1.49,.84,.46],[0x25595c,0x5d9d96,0xc6c795,0x377e7c,0x24676c],{head:1.24,eyeColor:0xc78d5c,finSize:1.04}),
  p('ocean-sunfish','mola',[.96,1.02,.32],[0x5c7677,0xa8b7aa,0xdfe1c4,0x7f9692,0x657e77],{head:1.08,finSize:1.46,tailSize:.74}),
  p('coelacanth','coelacanth',[1.58,.58,.41],[0x304c61,0x64849a,0xb4c3b8,0x476b85,0xd0d6be],{head:1.17,tailSize:1.1}),
  p('giant-oarfish','oarfish',[3.12,.30,.12],[0x7d9298,0xd2ded6,0xf5f1da,0xb65048,0x697e83],{marks:'ribbon-bars',finSize:1.08}),
  p('giant-manta','manta',[1.19,.23,2.66],[0x253f4d,0x526b73,0xe4e9d9,0x3c5561,0x1f3541],{head:1.13,tailSize:.95}),
  p('whale-shark','shark',[2.15,.65,.76],[0x304c66,0x68879c,0xe0e4ce,0x526e85,0xdce8d7],{head:1.55,marks:'constellation-spots',mouth:'wide',traits:['gill-slits','shark-fins','back-ridges'],tailSize:1.18,finSize:1.05}),
  p('blue-marlin','marlin',[1.90,.44,.34],[0x183f65,0x668fa8,0xe0e6d6,0x2f5c80,0x9ccecc],{marks:'blue-bars',finSize:1.06,tailSize:1.15}),
  p('great-white','shark',[2.04,.63,.57],'shark',{snout:.15,head:1.1,tailSize:1.22,traits:['gill-slits','shark-fins','teeth']}),
  p('leviathan-sturgeon','sturgeon',[2.14,.51,.48],'root',{traits:['scutes','barbels-chin','tall-scutes'],head:1.12,tailSize:1.25}),
  p('moonfish','opah',[1.12,.97,.33],[0x4f7591,0xa0c6cd,0xdce1c1,0xc57655,0xdde7d7],{finSize:1.2,tailSize:.95}),
  p('ancient-carp','carp',[1.49,.89,.53],'violet',{marks:'gold-scales',tail:'flowing',traits:['barbels-long','brow-plates','fin-rim'],tailSize:1.21,head:1.13}),
  p('abyssal-wyrm','wyrm',[2.93,.32,.27],'deep',{marks:'runes',traits:['fangs','horns','spines'],snout:.1,finSize:.85}),
  p('star-eater','angler',[1.20,.91,.61],'violet',{marks:'stars',traits:['fangs','star-fins','photophores'],head:1.2,finSize:1.1,tail:'lunate'}),
  p('lunar-coelacanth','coelacanth',[1.73,.65,.43],'moon',{marks:'pale-spots',traits:['lobed-fins','plate-scales','fin-streamers'],tailSize:1.18,finSize:1.11}),
  p('deep-one','armored',[1.56,.78,.58],'deep',{traits:['lobed-fins','chin-tendrils','armor','brow-plates'],tail:'trilobe',dorsal:'lobed',head:1.27,marks:'runes'}),
  p('trench-serpent','wyrm',[3.25,.27,.24],'violet',{marks:'bands',traits:['fangs','spines','chin-tendrils'],finSize:.71,head:1.1}),
  p('hollow-gar','gar',[2.05,.32,.30],'bone',{snout:.66,marks:'diamond',traits:['teeth','ganoid-scales','ribs'],eyeSize:.75,tailSize:.9}),
  p('pale-leviathan','leviathan',[2.10,.81,.70],'bone',{tail:'heterocercal',head:1.4,traits:['lobed-fins','back-ridges','throat-pleats'],finSize:.89,marks:'scars'}),

  // Emberforge: not twenty recoloured leviathans. Cephalopods, lure fish,
  // plated guardians, ribbon ghosts and antlered/crested deep-water creatures.
  p('titan-sturgeon','sturgeon',[2.18,.60,.56],'root',{traits:['scutes','barbels-chin','tall-scutes','head-plates'],snout:.32,head:1.15,tailSize:1.3}),
  p('void-angler','angler',[1.19,1.00,.72],'deep',{traits:['lure','fangs','feet-fins','photophores'],eyeSize:.74,head:1.32,marks:'none',finSize:.82}),
  p('elder-leviathan','leviathan',[2.25,.76,.63],'deep',{traits:['lobed-fins','back-ridges','cheek-frills'],tail:'trilobe',marks:'scars',finSize:1.32,head:1.21}),
  p('sunken-god','armored',[1.60,1.01,.74],[0x4a4b37,0x8d8160,0xcdbd85,0x655d47,0xd5c28d],{head:1.5,traits:['armor','antlers','brow-plates','chin-tendrils'],tail:'fan',marks:'runes',finSize:1.2}),
  p('marrow-eel','eel',[2.87,.28,.26],'bone',{traits:['ribs','fangs'],marks:'bands',mouth:'fang',finSize:.72}),
  p('ghost-sturgeon','sturgeon',[2.06,.43,.38],'bone',{traits:['scutes','barbels-chin','fin-streamers'],snout:.36,tailSize:1.17,finSize:.92}),
  p('colossal-squid','squid',[1.67,.54,.51],[0x6b344b,0xb96f79,0xe6c6aa,0xa05a6d,0xeddac1],{eyeSize:1.65,head:1.05,marks:'mantle-spots',tailSize:1.21}),
  p('megamouth','shark',[1.81,.74,.76],[0x334550,0x748a8f,0xd9d8c0,0x536975,0x283f4b],{mouth:'cavern',head:1.6,eyeSize:.7,finSize:.73,tailSize:.92}),
  p('river-kraken','octopus',[.93,.86,.76],[0x243e45,0x5b8584,0xc6c7a5,0x47706f,0xd0bd91],{eyeSize:1.4,marks:'mantle-spots',tailSize:1.22}),
  p('golden-leviathan','leviathan',[2.02,.70,.59],'gold',{traits:['lobed-fins','crown','plate-scales'],marks:'gold-scales',tail:'flowing',finSize:1.15}),
  p('world-eater','angler',[1.74,.96,.79],'violet',{head:1.6,traits:['fangs','back-ridges','photophores'],tail:'heterocercal',finSize:.9,tailSize:1.12}),
  p('timefish','opah',[1.29,.87,.28],[0x365b65,0x83b0b4,0xd9d6ad,0xab8758,0xe0cfa0],{traits:['disc-body','fin-streamers','clock-rings'],marks:'rings',finSize:1.5,tail:'flowing'}),
  p('bone-sail','marlin',[2.04,.41,.31],'bone',{snout:.39,finSize:1.9,traits:['bill','ribs','sail-bones'],marks:'bands',tailSize:1.16}),
  p('deep-choir','coelacanth',[1.59,.74,.52],'violet',{traits:['lobed-fins','cheek-frills','photophores'],tail:'trilobe',marks:'runes',finSize:1.36,head:1.1}),
  p('the-warden','armored',[1.65,.85,.72],'root',{traits:['armor','head-plates','pectoral-spines','brow-plates'],marks:'scars',head:1.42,tailSize:.91}),
  p('salt-ghost','eel',[2.61,.31,.20],'moon',{traits:['fin-streamers','chin-tendrils'],marks:'ribbon-bars',finSize:1.47,eyeSize:.76}),
  p('hollow-king','angler',[1.52,.92,.63],'violet',{traits:['crown','fangs','cheek-frills'],marks:'runes',tail:'flowing',head:1.35,finSize:1.1}),
  p('trench-widow','angler',[1.38,.78,.55],'deep',{traits:['twin-lures','fangs','feet-fins','chin-tendrils'],tail:'ribbon',marks:'bands',head:1.2,finSize:1.23}),
  p('old-growth','sturgeon',[1.86,.62,.53],'root',{traits:['scutes','antlers','root-beard'],marks:'bark',snout:.15,head:1.15,finSize:1.08}),
  p('pale-crown','opah',[1.19,1.03,.30],'bone',{traits:['disc-body','crown','fin-streamers'],marks:'rings',tail:'lunate',finSize:1.34}),

  // Moontide: individually directed mythical trophies; biology gives each
  // design a coherent base rather than treating their names as recolour keys.
  p('the-drowned','coelacanth',[1.92,.59,.38],'deep',{traits:['lobed-fins','ribs','chin-tendrils'],marks:'scars',tail:'trilobe',head:1.17,finSize:1.27}),
  p('star-whale','whale',[2.36,.83,.86],'deep',{traits:['throat-pleats','blowhole','flippers','photophores'],marks:'stars',head:1.26,tailSize:1.21,finSize:.9}),
  p('ironjaw','armored',[1.80,.69,.68],[0x3c4b4d,0x7f9190,0xc3c2a3,0x667777,0xd0c4a0],{traits:['armor','tusks','head-plates','pectoral-spines'],mouth:'fang',marks:'scars',head:1.56}),
  p('sunken-spire','marlin',[2.07,.52,.39],'deep',{snout:.27,traits:['bill','sail-bones','tall-scutes'],dorsal:'sail',finSize:2.25,marks:'runes',tailSize:1.09}),
  p('lunar-leviathan','whale',[2.19,.72,.75],'moon',{traits:['flippers','throat-pleats','crescent-horns','photophores'],head:1.18,marks:'pale-spots',tailSize:1.31}),
  p('hollow-moon','opah',[1.04,1.15,.25],'moon',{traits:['disc-body','clock-rings','fin-streamers'],marks:'rings',mouth:'tube',head:.86,tail:'flowing',finSize:1.16}),
  p('deep-root','octopus',[1.10,.93,.65],'root',{traits:['eight-arms','suckers','root-antlers'],marks:'bark',tailSize:1.35,eyeSize:.94}),
  p('the-listener','angler',[1.24,.72,.56],'violet',{traits:['cheek-frills','lure','fangs','feelers'],marks:'runes',head:1.1,finSize:1.55}),
  p('bone-tide','wyrm',[3.17,.42,.36],'bone',{traits:['ribs','fangs','spines','lobed-fins'],marks:'bands',head:1.18,finSize:.87}),
  p('crown-of-salt','manta',[1.30,.29,2.83],'bone',{traits:['wings','cephalic-lobes','crown','spiracles'],marks:'runes',head:1.2,tailSize:1.08}),
  p('the-hollow-god','octopus',[1.26,1.04,.95],'violet',{traits:['eight-arms','suckers','crown','photophores'],marks:'runes',eyeSize:.85,tailSize:1.52}),
  p('world-serpent','wyrm',[3.71,.41,.37],'root',{traits:['horns','spines','fangs','barbels-long'],marks:'diamond',head:1.27,finSize:1.18}),
  p('moon-eater','shark',[2.13,.78,.71],'moon',{mouth:'cavern',traits:['gill-slits','shark-fins','crescent-horns','fangs'],head:1.45,tailSize:1.43,finSize:1.23,marks:'stars'}),
  p('the-first-fish','coelacanth',[1.97,.70,.55],'deep',{traits:['lobed-fins','plate-scales','fin-rim','barbels-chin'],marks:'gold-scales',head:1.22,tailSize:1.33,finSize:1.2}),
  p('leviathan-prime','leviathan',[2.34,.86,.73],'deep',{traits:['lobed-fins','crown','scutes','cheek-frills'],marks:'constellation-spots',head:1.31,tail:'heterocercal',tailSize:1.4}),
  p('sunken-crown','armored',[1.74,.88,.68],'gold',{traits:['armor','antlers','head-plates','root-beard'],marks:'runes',head:1.35,tail:'fan',finSize:1.17}),
  p('the-deep-itself','angler',[2.07,1.21,.96],'deep',{traits:['fangs','twin-lures','cheek-frills','photophores'],mouth:'cavern',head:1.72,eyeSize:.65,tail:'trilobe',marks:'stars',tailSize:1.25}),
  p('pale-sun','mola',[1.17,1.20,.42],[0x9d9f77,0xe0ddb0,0xfff2c9,0xd9bd76,0xc59a51],{traits:['disc-body','star-fins','photophores'],marks:'rings',finSize:1.57,head:1.03,tailSize:.86}),
  p('elder-tide','whale',[2.50,.69,.72],'deep',{traits:['flippers','throat-pleats','back-ridges','chin-tendrils'],head:1.14,marks:'bands',dorsal:'long',tailSize:1.37}),
  p('reel-life','leviathan',[2.28,.76,.66],'bone',{traits:['lobed-fins','plate-scales','flowing-fins','crown','barbels-long'],marks:'gold-scales',tail:'flowing',head:1.22,finSize:1.33,tailSize:1.45}),
];

function freeze(value){
  if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
}
const originals=Object.fromEntries(designs);
// Construction templates are anatomical, never rarity tiers. New entries choose
// one explicitly in the collection catalog; the authored v39 sculpts remain
// available for old catches even when that species leaves the collection.
const aliases={
  minnow:['creek-chub',{body:[1.35,.30,.22],traits:[],finSize:.7}],
  trout:['rainbow-trout',{marks:'spots'}], whitefish:['lake-trout',{body:[1.5,.40,.30],marks:'fine-scales',mouth:'small'}],
  grayling:['rainbow-trout',{dorsal:'sail',body:[1.5,.38,.28],finSize:1.25,marks:'fine-spots'}],
  perch:['yellow-perch',{}],bass:['largemouth-bass',{}],catfish:['channel-catfish',{}],sunfish:['bluegill',{}],
  gar:['alligator-gar',{body:[2.1,.29,.26],snout:.72,head:.8}],drum:['white-bass',{body:[1.5,.66,.40],head:1.2,tail:'truncate'}],
  guppy:['creek-chub',{body:[.95,.32,.21],tail:'fan',tailSize:1.8,finSize:1.18,traits:['flowing-fins'],marks:'rainbow'}],
  swordtail:['creek-chub',{body:[1.25,.32,.24],tail:'heterocercal',tailSize:1.8,marks:'lateral-band'}],
  tetra:['yellow-bass',{body:[1.06,.39,.22],dorsal:'soft',marks:'rainbow',traits:['adipose'],tail:'fork'}],
  angelfish:['giant-gourami',{body:[.94,.95,.19],dorsal:'vertical',tail:'fan',finSize:1.5,traits:['feelers'],marks:'bars'}],
  discus:['black-pacu',{body:[.98,.96,.19],tail:'round',dorsal:'long',marks:'vermiculated',traits:[]}],
  cichlid:['giant-gourami',{body:[1.26,.65,.34],head:1.07,marks:'broken-band',traits:['forehead']}],
  arowana:['arapaima',{body:[2.0,.40,.30],tail:'round',dorsal:'rear-long',traits:['barbels-short','plate-scales'],mouth:'large'}],
  tang:['black-pacu',{body:[1.04,.76,.19],dorsal:'long',tail:'notched',mouth:'small',traits:['lateral-scutes']}],
  butterflyfish:['bluegill',{body:[.96,.86,.18],snout:.12,mouth:'tube',dorsal:'long',marks:'bars',traits:[]}],
  lionfish:['yellow-perch',{body:[1.28,.60,.45],dorsal:'spiny',finSize:1.95,marks:'bars',traits:['cheek-frills','spines']}],
  triggerfish:['black-pacu',{body:[1.36,.72,.24],dorsal:'double',mouth:'lips',traits:['head-plates'],marks:'scales'}],
  moray:['american-eel',{head:1.25,mouth:'fang',traits:['fangs'],marks:'mottled'}],
  barracuda:['northern-pike',{body:[2.25,.29,.26],snout:.14,dorsal:'double',marks:'bars',head:1.1}],
  grouper:['largemouth-bass',{body:[1.6,.83,.64],head:1.35,tail:'round',marks:'mottled'}],
  cobia:['striped-bass',{body:[2.0,.37,.33],head:1.15,marks:'lateral-band',dorsal:'long'}],
  mackerel:['giant-trevally',{body:[1.8,.37,.32],head:.9,marks:'vermiculated',tail:'lunate'}],
  herring:['silver-carp',{body:[1.62,.35,.22],head:.85,dorsal:'soft',traits:[],marks:'fine-scales'}],
  snapper:['largemouth-bass',{body:[1.55,.58,.33],head:1.1,tail:'fork',traits:['teeth'],marks:'fine-scales'}],
  trevally:['giant-trevally',{}],tuna:['giant-trevally',{body:[1.9,.61,.52],tail:'lunate',head:.92,traits:['keel','finlets'],marks:'horizontal'}],
  mahi:['napoleon-wrasse',{body:[1.94,.64,.35],head:1.3,tail:'lunate',dorsal:'long',marks:'pale-spots',traits:['forehead']}],
  sailfish:['blue-marlin',{dorsal:'sail',finSize:1.5}],thresher:['great-white',{tailSize:2.8,body:[2.0,.47,.4],head:.92}],
  'flying-fish':['white-perch',{body:[1.7,.35,.27],finSize:2.4,tail:'heterocercal',marks:'none',traits:[]}],
  'glass-catfish':['channel-catfish',{body:[1.7,.40,.18],dorsal:'none',traits:['barbels-long','ribs'],marks:'none'}],
  piranha:['black-pacu',{body:[1.05,.75,.37],head:1.3,mouth:'large',traits:['teeth','adipose']}],
  'ghost-leviathan':['elder-leviathan',{body:[2.5,.47,.44],traits:['lobed-fins','fin-streamers','photophores'],marks:'pale-spots'}],
  armored:['sunken-god',{}],hydra:['world-serpent',{head:1.25,traits:['antlers','fangs','cheek-frills','spines']}],
  sculpin:['brown-bullhead',{body:[1.4,.46,.53],head:1.5,dorsal:'double',traits:['head-plates'],marks:'mottled'}],
  wolffish:['burbot',{head:1.3,mouth:'fang',dorsal:'long',traits:['teeth'],marks:'bars'}],
  needle:['american-eel',{body:[2.5,.14,.12],dorsal:'long',head:.8,marks:'none'}],
  lumpfish:['ocean-sunfish',{body:[1.1,.92,.60],tail:'round',dorsal:'double',traits:['armor'],marks:'mottled'}],
  sixgill:['bull-shark',{gillCount:6,dorsal:'rear',head:1.2}],
  lanternfish:['creek-chub',{head:1.1,eyeSize:1.6,traits:['adipose','photophores'],marks:'none'}],
  hatchetfish:['black-pacu',{body:[.85,.92,.18],eyeSize:1.6,head:1.15,traits:['photophores'],marks:'none'}],
  viperfish:['deep-choir',{body:[1.9,.27,.24],mouth:'fang',eyeSize:1.4,traits:['fangs','photophores','lure'],dorsal:'soft'}],
  fangtooth:['void-angler',{body:[1.03,.65,.43],mouth:'cavern',traits:['fangs'],head:1.4,marks:'none'}],
  barreleye:['creek-chub',{body:[1.25,.53,.42],eyeSize:2,head:1.55,traits:['head-plates'],marks:'none'}],
  gulper:['american-eel',{body:[2.6,.35,.36],mouth:'cavern',head:2.1,traits:['fangs','photophores'],marks:'none'}],
  'frilled-shark':['world-serpent',{body:[2.65,.28,.28],mouth:'fang',traits:['gill-slits','fangs'],gillCount:6,dorsal:'rear'}],
  'goblin-shark':['bull-shark',{snout:.48,mouth:'large',head:1.15,traits:['gill-slits','shark-fins','teeth','extended-jaw']}],
  goby:['brown-bullhead',{body:[1.45,.34,.33],head:1.22,traits:[],dorsal:'double',marks:'mottled'}],
  chimaera:['bull-shark',{body:[1.8,.44,.42],tail:'ribbon',head:1.25,eyeSize:1.6,traits:['spines'],marks:'none'}],
  'sperm-whale':['star-whale',{body:[2.7,.92,.86],head:1.65,dorsal:'hump',eye:[.41,-.05],marks:'scars',traits:['flippers','blowhole']}],
  ray:['giant-stingray',{}],opah:['moonfish',{traits:['disc-body'],marks:'pale-spots'}],
  flatfish:['ocean-sunfish',{family:'flatfish',body:[1.6,.18,1.02],traits:[],marks:'mottled'}],
  shrimp:['creek-chub',{family:'shrimp',body:[1.4,.35,.4],traits:[],marks:'none'}],
  isopod:['sunken-god',{family:'isopod',body:[1.6,.45,.9],traits:[],marks:'none'}],
  'sea-spider':['river-kraken',{family:'sea-spider',body:[.85,.25,1.5],traits:[],marks:'none'}],
  starfish:['pale-sun',{family:'starfish',body:[1.6,.18,1.6],traits:['photophores'],marks:'none'}],
};
for(const [key,[base,options]]of Object.entries(aliases))originals[key]={...originals[base],...options};
const naturalColours={
  'golden-bluegill':palettes.gold,'golden-shiner':palettes.gold,'golden-trout':palettes.gold,
  'silver-pike':palettes.silver,'albino-catfish':[0xb5aca0,0xe8dfcb,0xfff3da,0xdccbb3,0xb2988e],
  'clown-killifish':[0x393e3d,0xd9bd67,0xf4e7bc,0xc76d57,0x343d42],
  guppy:[0x4d776d,0x95cbb7,0xe7e3c4,0xdc8159,0x4c739f],molly:palettes.gold,swordtail:palettes.bronze,
  'neon-tetra':[0x3a6676,0x70b5ca,0xd9e5d4,0xc76869,0xe6888d],
  discus:[0x4e665f,0xbfa577,0xe6cea6,0x9b7055,0x5c9bab],
  'peacock-cichlid':[0x315f88,0x5f9fc0,0xd7d3a5,0xc29b58,0x21415f],
  'blue-tang':[0x244679,0x528fc7,0xa2c1ca,0xe2c75d,0x1e345e],
  'yellow-tang':[0xa69035,0xefd569,0xffecaa,0xdcc159,0xb39530],
  butterflyfish:[0x626749,0xe6d785,0xf4eed1,0xd4b75b,0x354649],
  'moorish-idol':[0x596568,0xe6e6c6,0xf6f1d7,0xe8ce67,0x26383b],
  'royal-gramma':[0x5a3971,0xa279b4,0xddc18b,0xe1bb4e,0xe6ce68],
  lionfish:[0x765044,0xc39b7b,0xe8d9bd,0xb67d65,0x68483f],
  'red-snapper':[0x8a4c44,0xcb8775,0xefc6b0,0xb16a57,0x9e6155],
  'mahi-mahi':[0x37686d,0x8fc07b,0xece095,0x429c9d,0x5d9fbc],
  'glass-catfish':[0x7c9196,0xb5cccc,0xe1e3d5,0xa5bec1,0x647d87],
  'red-bellied-piranha':[0x4b565a,0x83968e,0xdf8671,0xa76e58,0x374d4a],
};
const fantasyPalettes=[palettes.gold,palettes.root,palettes.moon,palettes.violet,palettes.deep,palettes.bone];
const fictional=n=>n===20||n>=38&&n<=40||n>=57&&n<=60||n>=77&&n<=80||n>=99&&n<=100||n>=118&&n<=120||n===140||n>=158&&n<=160||n>=178&&n<=200||n>=216&&n<=220||n>=237&&n<=240||n>=258&&n<=260||n>=274&&n<=280||n>=282;
const registry=Object.fromEntries(designs);
for(const [id,design]of designs)registry['legacy-'+id]=design;
for(const row of COLLECTION_ROSTER){
  const base=originals[row.template];if(!base)throw new Error('Missing anatomy template: '+row.template);
  const exact=originals[row.id],n=row.number;
  const design={...base,...(exact||{}),body:[...(exact||base).body],traits:[...(exact||base).traits]};
  if(!exact){
    // Individually specified template + proportions/fin treatment. Preserve
    // biological families, while avoiding a single recoloured trunk silhouette.
    design.body=design.body.map((v,k)=>v*([.94+(n%11)*.012,.91+(n%7)*.027,.92+(n%9)*.018][k]));
    design.head*=.94+(n%5)*.03;design.tailSize*=.94+(n%7)*.025;
  }
  if(naturalColours[row.id])design.tones=naturalColours[row.id];
  else if(fictional(n)){
    design.tones=row.island===9||row.island===14?[0x4b343d,0xa56b4d,0xd6b18a,0xc1784e,0xf5bc78]:fantasyPalettes[(row.island+n)%fantasyPalettes.length];
    if(!['shrimp','isopod','sea-spider','starfish','flatfish'].includes(design.family)){
      const accents=['fin-rim','photophores','fin-streamers','head-plates'];
      design.traits=[...new Set([...design.traits,accents[n%4]])];
    }
  }
  registry[row.id]=design;
}
export const FISH_APPEARANCE=freeze(registry);
export const FISH_FAMILIES=Object.freeze(Object.keys(families));
export function fishAppearance(species){
  const id=typeof species==='string'?species:species?.id;
  const result=FISH_APPEARANCE[id];
  if(!result)throw new Error(`No authored fish appearance for ${id}`);
  return result;
}
