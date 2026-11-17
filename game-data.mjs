// Pure game data: also used by the progression regression tests.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function lighten(hex, t){
  const m = v => Math.round(v + (255 - v) * t);
  return (m((hex >> 16) & 255) << 16) | (m((hex >> 8) & 255) << 8) | m(hex & 255);
}

// ---------- Species ----------
// Compact table, one row per fish:
//   [name, colour, rarity, depth, sizeFactor, pattern, blurb]
// depth     = legacy size band. Every pair of bands now lives on one island.
//             Island + bait decide the pool; cast distance never selects a fish.
// sizeFactor= how big this fish runs for its depth band (0.6 = runt, 6 = leviathan)
// pattern   = 0 none, 1 stripes, 2 spots, 3 rainbow, 4 patches, 5 scales, 6 whiskers
// Weight, points, strength and body size are derived in buildSpecies().
const FISH_TABLE = [
  /* ---- 0m · right off the dock ---- */
  ['Bluegill', 0x4a90d9, 'common', 0, 0.85, 1, 'A scrappy little panfish. Every angler starts here.'],
  ['Pumpkinseed', 0xe08a3c, 'common', 0, 0.70, 2, 'Sunset orange with a cheeky bite.'],
  ['Rock Bass', 0x7a6a52, 'common', 0, 0.95, 2, 'Grumpy, stubby and always hungry.'],
  ['Yellow Perch', 0xf6c945, 'common', 0, 1.05, 1, 'Golden stripes and a feisty scrap on light tackle.'],
  ['Black Crappie', 0x4c5a6b, 'common', 0, 1.15, 2, 'Paper-mouthed. Easy to lose at the net.'],
  ['Green Sunfish', 0x4f9a5a, 'common', 0, 0.80, 0, 'Big mouth, bigger attitude, tiny body.'],
  ['Warmouth', 0x8a6a3a, 'common', 0, 0.75, 2, 'Sits in the weeds and sulks.'],
  ['White Perch', 0xd8dde3, 'common', 0, 0.90, 5, 'Silver, plentiful, never says no.'],
  ['Redear Sunfish', 0xd0743f, 'common', 0, 0.95, 2, 'A shell-cracker with a red ear flap.'],
  ['Brown Bullhead', 0x54503f, 'uncommon', 0, 1.35, 6, 'Whiskered, stubborn, unbothered by daylight.'],
  /* ---- 8m · just past the pilings ---- */
  ['Largemouth Bass', 0x3d9970, 'uncommon', 8, 1.50, 2, 'King of the shallows. Hits hard, jumps harder.'],
  ['Smallmouth Bass', 0x8a6a3a, 'uncommon', 8, 1.30, 1, 'Bronze muscle from the rocky bottom.'],
  ['Spotted Bass', 0x6b7a4a, 'uncommon', 8, 1.15, 2, 'Small, mean and covered in spots.'],
  ['Yellow Bass', 0xd8c25a, 'common', 8, 0.85, 1, 'A gold-barred scrapper that runs in schools.'],
  ['White Bass', 0xc9d3dc, 'uncommon', 8, 1.10, 0, 'Slashes at anything shiny.'],
  ['River Carp', 0xc2a15a, 'common', 8, 1.75, 5, 'A mud-grubbing, broad-shouldered lump.'],
  ['Grass Carp', 0x8f9b6a, 'common', 8, 2.05, 5, 'A vegetarian torpedo with no sense of humour.'],
  ['Longear Sunfish', 0xd88a3c, 'common', 8, 0.65, 3, 'Flashy fins, tiny frame.'],
  ['Saugeye', 0xb9c47a, 'rare', 8, 1.20, 5, 'A walleye hybrid with a bad temper.'],
  ['Creek Chub', 0x9a8a6a, 'common', 8, 0.60, 0, 'Bold, greedy, and always first to the bait.'],
  /* ---- 16m · the drop-off ---- */
  ['Rainbow Trout', 0xe86a92, 'uncommon', 16, 1.20, 3, 'A rainbow flash beneath the surface.'],
  ['Brown Trout', 0xa07a44, 'rare', 16, 1.40, 2, 'Buttery gold with red spots. Wary of everything.'],
  ['Brook Trout', 0x6f8f5a, 'uncommon', 16, 1.00, 3, 'Speckled and cold-water fussy.'],
  ['Walleye', 0xb9c47a, 'rare', 16, 1.35, 5, 'A glass-eyed night feeder.'],
  ['Sauger', 0x9aa06a, 'uncommon', 16, 1.05, 5, 'The smaller, sandier cousin of the walleye.'],
  ['Channel Catfish', 0x5d6d7e, 'rare', 16, 1.85, 6, 'A whiskered heavyweight that pulls like a truck.'],
  ['Tiger Muskie', 0x7f8f4a, 'rare', 16, 1.90, 1, 'All the teeth, none of the patience.'],
  ['Northern Pike', 0x6f8f4a, 'rare', 16, 2.10, 2, 'All teeth and attitude. Bring line, not luck.'],
  ['Burbot', 0x6b5f45, 'uncommon', 16, 1.15, 6, 'A freshwater cod that sulks in the dark.'],
  ['Blue Catfish', 0x4a6a8a, 'epic', 16, 2.20, 6, 'Blue-grey and built like a submarine.'],
  /* ---- 24m · deep water ---- */
  ['Muskellunge', 0x7d8a5a, 'rare', 24, 2.20, 1, 'The fish of ten thousand casts.'],
  ['Striped Bass', 0x9aa7b5, 'epic', 24, 2.30, 1, 'Silver that shoulders upstream like a train.'],
  ['Lake Trout', 0x6a7f7a, 'rare', 24, 1.90, 2, 'Cold, deep and slow to give up.'],
  ['Chinook Salmon', 0x8a9099, 'epic', 24, 2.40, 2, 'A chrome slab with a one-track mind.'],
  ['Coho Salmon', 0xb05a4a, 'rare', 24, 1.70, 3, 'Silver and red, and all fight.'],
  ['Steelhead', 0xc8ccd4, 'epic', 24, 2.00, 3, 'A trout that went to sea and came back angry.'],
  ['Flathead Catfish', 0x6b5b3e, 'epic', 24, 2.50, 6, 'A wide flat head that owns the bottom of the hole.'],
  ['Bighead Carp', 0xa8a89a, 'rare', 24, 2.60, 5, 'A wall of a fish with a tiny face.'],
  ['Silver Carp', 0xc9cfd4, 'uncommon', 24, 2.20, 0, 'Jumps at loud noises. Terrifying.'],
  ['Golden Koi', 0xffb703, 'legendary', 24, 1.50, 4, 'Shimmering gold. A true prize catch.'],
  /* ---- 32m · the old channel ---- */
  ['Mirror Carp', 0xd9d2c0, 'legendary', 32, 2.60, 5, 'Scattered mirror scales and the temper of a bull.'],
  ['Leather Carp', 0xb8ae98, 'epic', 32, 2.80, 0, 'Smooth-skinned and impossible to net.'],
  ['Atlantic Salmon', 0xb8c0c9, 'epic', 32, 2.10, 2, 'A leaper with a grudge.'],
  ['Alligator Gar', 0x6b7a4a, 'epic', 32, 3.00, 5, 'Armoured scales and rows of needle teeth.'],
  ['Paddlefish', 0x5a6a72, 'legendary', 32, 2.90, 0, 'A living fossil with a paddle for a nose.'],
  ['Bowfin', 0x6a6a48, 'rare', 32, 1.90, 2, 'Prehistoric, ugly, and never quits.'],
  ['American Eel', 0x4a5a4a, 'uncommon', 32, 1.30, 0, 'A rope of muscle that ties itself in knots.'],
  ['Lake Sturgeon', 0x8e9b8a, 'epic', 32, 3.10, 5, 'Armoured living fossil. Older than the dock.'],
  ['Giant Snakehead', 0x5a4a3a, 'epic', 32, 2.40, 2, 'Breathes air and hunts the shallows.'],
  ['Golden Dorado', 0xe0a020, 'legendary', 32, 1.80, 4, 'A gold torpedo that eats anything.'],
  /* ---- 40m · the drowned river ---- */
  ['Wels Catfish', 0x4a4a52, 'legendary', 40, 3.20, 6, 'A river monster that eats things larger than you.'],
  ['Goonch', 0x6a5a52, 'epic', 40, 3.00, 6, 'A devil cat with a taste for flesh.'],
  ['Arapaima', 0x7a5a5a, 'legendary', 40, 3.40, 4, 'Air-breathing giant with armour-plate scales.'],
  ['Giant Gourami', 0x9a8a7a, 'rare', 40, 2.20, 0, 'A lump of a fish with a huge appetite.'],
  ['Mekong Giant Catfish', 0x6f7a82, 'legendary', 40, 3.60, 6, 'Pale, whiskered and enormous.'],
  ['Giant Stingray', 0x5a5a4a, 'epic', 40, 3.30, 2, 'A wing of muscle that drags along the sand.'],
  ['Black Pacu', 0x3a3a3a, 'rare', 40, 2.00, 0, 'A river fish with a human-looking smile.'],
  ['Tambaqui', 0x4a4a3a, 'rare', 40, 2.30, 5, 'Armoured and seed-crunching.'],
  ['Bull Shark', 0x8a929a, 'legendary', 40, 3.50, 0, 'It should not be in a lake. It is.'],
  ['Golden Mahseer', 0xd8a850, 'epic', 40, 2.40, 4, 'A golden river tank with a black mood.'],
  /* ---- 48m · past the shelf ---- */
  ['Goliath Tigerfish', 0x9a9a8a, 'legendary', 48, 2.60, 5, 'Teeth like a saw and a straight-line temper.'],
  ['Giant Trevally', 0x8a9aa8, 'legendary', 48, 2.70, 0, 'A silver fist that hunts in packs.'],
  ['Napoleon Wrasse', 0x5a8a9a, 'epic', 48, 3.00, 4, 'Huge, proud and slow to spook.'],
  ['Ocean Sunfish', 0xa8a8a0, 'legendary', 48, 3.60, 0, 'A floating boulder with fins.'],
  ['Coelacanth', 0x4a5a7a, 'legendary', 48, 2.80, 5, 'It has been doing this for four hundred million years.'],
  ['Giant Oarfish', 0xc0c8d0, 'legendary', 48, 3.40, 1, 'A silver ribbon with a red mane.'],
  ['Giant Manta', 0x4a4a5a, 'legendary', 48, 3.80, 0, 'A flying carpet of muscle.'],
  ['Whale Shark', 0x5a6a82, 'mythic', 48, 4.40, 2, 'Spotted, gentle and staggeringly heavy.'],
  ['Blue Marlin', 0x2a4a8a, 'legendary', 48, 3.20, 1, 'A spear that runs hot.'],
  ['Great White', 0x8a9298, 'mythic', 48, 3.70, 0, 'The lake does not deserve this.'],
  /* ---- 56m · the black water ---- */
  ['Leviathan Sturgeon', 0x6a7a6a, 'legendary', 56, 3.40, 5, 'Old as the lake and twice as heavy.'],
  ['Moonfish', 0x9fd8ff, 'mythic', 56, 2.20, 3, 'Bites only under a coin-white moon.'],
  ['Ancient Carp', 0x9b5de5, 'mythic', 56, 2.40, 5, 'The old giant. It has outsmarted a hundred anglers.'],
  ['Abyssal Wyrm', 0x2a3a5a, 'mythic', 56, 3.00, 1, 'Something long. Something patient.'],
  ['Star-Eater', 0x3a2a5a, 'mythic', 56, 2.80, 4, 'It swallows the light and comes back for the hook.'],
  ['Lunar Coelacanth', 0x7a8ac0, 'legendary', 56, 2.60, 5, 'Pale as bone and twice as stubborn.'],
  ['Deep One', 0x3a4a4a, 'mythic', 56, 3.20, 0, 'It was here before the shore was.'],
  ['Trench Serpent', 0x2a2a4a, 'mythic', 56, 3.60, 1, 'Coils that could wrap the whole pier.'],
  ['Hollow Gar', 0x5a6a5a, 'legendary', 56, 2.90, 5, 'Hollow-boned, hollow-eyed, all teeth.'],
  ['Pale Leviathan', 0xa8b0b8, 'legendary', 56, 3.80, 0, 'Whiter than the foam and far less friendly.'],
  /* ---- 64m · the trench lip ---- */
  ['Titan Sturgeon', 0x7a8a7a, 'mythic', 64, 3.50, 5, 'A barge with fins. Older than the hills.'],
  ['Void Angler', 0x1a1a2a, 'mythic', 64, 2.40, 6, 'A lure on its own head, and worse teeth than yours.'],
  ['Elder Leviathan', 0x4a5a6a, 'mythic', 64, 4.00, 0, 'It remembers the lake as a puddle.'],
  ['Sunken God', 0x6a5a3a, 'mythic', 64, 4.20, 4, 'They sank it here on purpose.'],
  ['Marrow Eel', 0x8a8a7a, 'legendary', 64, 2.60, 1, 'Long, pale and entirely without mercy.'],
  ['Ghost Sturgeon', 0xb8c4c8, 'legendary', 64, 3.20, 5, 'You will see it twice: once on the line, once in dreams.'],
  ['Colossal Squid', 0x7a3a4a, 'mythic', 64, 3.00, 0, 'Not a fish. Nobody told it.'],
  ['Megamouth', 0x3a3a4a, 'legendary', 64, 3.80, 6, 'A mouth the size of a rowboat.'],
  ['River Kraken', 0x2a3a4a, 'mythic', 64, 3.40, 2, 'Eight reasons to bring a bigger line.'],
  ['Golden Leviathan', 0xd8b040, 'mythic', 64, 3.60, 4, 'Gilded, ancient and very tired of hooks.'],
  /* ---- 72m · the drop ---- */
  ['World-Eater', 0x2a1a3a, 'mythic', 72, 4.40, 0, 'Its mouth is a cave, and the cave is open.'],
  ['Timefish', 0x5a7a8a, 'mythic', 72, 2.80, 3, 'It bites before you cast.'],
  ['Bone Sail', 0xc8c0a8, 'mythic', 72, 3.60, 1, 'A sail of bone and a hull of muscle.'],
  ['Deep Choir', 0x3a2a5a, 'mythic', 72, 3.20, 5, 'It sings at a frequency that unhooks men.'],
  ['The Warden', 0x4a4a3a, 'mythic', 72, 4.00, 2, 'It guards the last sandbar. It is not friendly.'],
  ['Salt Ghost', 0x9aa8b0, 'legendary', 72, 3.00, 0, 'Silver, silent, and always already behind you.'],
  ['Hollow King', 0x6a5a6a, 'mythic', 72, 3.80, 4, 'Crowned in barnacles. Utterly empty.'],
  ['Trench Widow', 0x2a2a3a, 'mythic', 72, 3.40, 1, 'It has eaten three of your rods.'],
  ['Old Growth', 0x4a6a3a, 'legendary', 72, 3.60, 5, 'Bark-scaled and rooted to the trench floor.'],
  ['Pale Crown', 0xd0d8e0, 'mythic', 72, 3.90, 3, 'A bone-white arc under the last of the light.'],
  /* ---- 80m · the deep ---- */
  ['The Drowned', 0x3a4a5a, 'mythic', 80, 3.60, 0, 'Waiting at the end of the line all along.'],
  ['Star Whale', 0x2a3a6a, 'mythic', 80, 5.00, 3, 'Constellations move under its skin.'],
  ['Ironjaw', 0x5a5a5a, 'mythic', 80, 4.20, 6, 'Scarred by every hook ever made.'],
  ['Sunken Spire', 0x4a6a7a, 'mythic', 80, 4.60, 1, 'A tower with fins, and it is coming up.'],
  ['Lunar Leviathan', 0xb8c8e0, 'mythic', 80, 4.00, 2, 'It rises only when the moon is full and low.'],
  ['Hollow Moon', 0xd8d8e8, 'mythic', 80, 3.80, 4, 'A circle of pale scale, spinning slowly.'],
  ['Deep Root', 0x3a5a3a, 'legendary', 80, 4.40, 5, 'It grew here before the water came.'],
  ['The Listener', 0x4a3a5a, 'mythic', 80, 3.90, 0, 'Every cast. It heard every one.'],
  ['Bone Tide', 0xc0b8a0, 'mythic', 80, 4.30, 1, 'The whole trench moves when it does.'],
  ['Crown of Salt', 0xa8b8c0, 'mythic', 80, 4.10, 2, 'Wear it and the lake bows.'],
  /* ---- 88m · the far edge ---- */
  ['The Hollow God', 0x2a2a3a, 'mythic', 88, 5.20, 4, 'Nothing this big should take a hook.'],
  ['World Serpent', 0x3a5a4a, 'mythic', 88, 5.40, 1, 'It circles the lake. The lake is its bed.'],
  ['Moon-Eater', 0xbfd8ff, 'mythic', 88, 4.80, 3, 'It took a bite out of the sky and came back for more.'],
  ['The First Fish', 0x6a7a9a, 'mythic', 88, 5.00, 5, 'Every scale on your line came from this.'],
  ['Leviathan Prime', 0x3a4a6a, 'mythic', 88, 5.60, 2, 'The one the rest of them answer to.'],
  ['Sunken Crown', 0xd8c070, 'mythic', 88, 4.90, 4, 'Gold under the silt. It was left there for a reason.'],
  ['The Deep Itself', 0x1a2a3a, 'mythic', 88, 6.00, 0, 'You are not reeling a fish. You are reeling the lake.'],
  ['Pale Sun', 0xf0f0e0, 'mythic', 88, 5.00, 3, 'Light from somewhere that has no right to light.'],
  ['Elder Tide', 0x4a6a8a, 'mythic', 88, 5.30, 1, 'Older than water. Angrier than water.'],
  ['Reel Life', 0xd8d0c0, 'mythic', 88, 5.50, 5, 'The one at the end of the line.'],
];

// value = what a fish of this rarity sells for, before size is factored in
const RARITY = {
  common:    { tier:0, label:'COMMON',    value:24,    spawn:26 },
  uncommon:  { tier:1, label:'UNCOMMON',  value:65,    spawn:15 },
  rare:      { tier:2, label:'RARE',      value:180,   spawn:7.5 },
  epic:      { tier:3, label:'EPIC',      value:520,   spawn:3.6 },
  legendary: { tier:4, label:'LEGENDARY', value:1500,  spawn:1.5 },
  mythic:    { tier:5, label:'MYTHIC',    value:4600,  spawn:0.55 },
};
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// derive the numbers: deeper water and bigger specimens are worth more and fight harder
const BAND_PTS = b => 20 * Math.pow(1.45, b);
const BAND_W   = b => 2.2 * Math.pow(1.55, b);
const SPECIES = FISH_TABLE.map(([name, color, rarity, dist, sf, pattern, desc], index) => {
  const b = clamp(Math.round(dist / 8), 0, 11);
  const rar = RARITY[rarity];
  const maxW = +(BAND_W(b) * sf).toFixed(1);
  const minW = Math.max(0.2, +(maxW * 0.16).toFixed(1));
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    island: Math.floor(index / 20), number: index + 1,
    name, color, rarity, dist, pattern: ["none", "stripes", "spots", "rainbow", "patches", "scales", "whiskers"][pattern], desc,
    belly: lighten(color, 0.66),
    minW, maxW,
    pts: Math.round(BAND_PTS(b) * (0.8 + rar.tier * 0.12) * (0.7 + sf * 0.28)),
    strength: +Math.min(2.4, 0.12 + b * 0.135 + sf * 0.06 + rar.tier * 0.03).toFixed(2),
    size: +Math.min(1.9, 0.45 + Math.cbrt(maxW) * 0.28).toFixed(2),
    weight: rar.spawn,
  };
});

// ---------- Gear ----------
// Three ladders of 24 tiers each. Stats follow smooth curves; only the names,
// colours, line ratings and prices are authored (ROD_COST / LINE_COST / BAIT_COST).
const ROD_NAMES = [
  ['Bamboo Pole', 0xc98a4b], ['Willow Rod', 0xb99a5a], ['Fiberglass Rod', 0x69c8db],
  ['Graphite Rod', 0x6a6a72], ['Carbon Rod', 0x3a424e], ['Carbon Pro', 0x2f3640],
  ['Toray Carbon', 0x2a3038], ['Tournament Rod', 0x1f6f8b], ['Tour Pro', 0x2f7fbf],
  ['Signature Rod', 0xc0392b], ['Champion Rod', 0xe0a020], ['Masterwork Rod', 0x8e44ad],
  ['Titanium Rod', 0x95a5a6], ['Quicksilver Rod', 0xbdc3c7], ['Moonsilver Rod', 0xc8d6e5],
  ['Starmetal Rod', 0x5b6ee1], ['Runewood Rod', 0x6b4a29], ['Deepwater Rod', 0x1f4e79],
  ['Abyssal Rod', 0x1b2a3a], ['Leviathan Rod', 0x2c3e50], ['Ancient Rod', 0xb8860b],
  ['Celestial Rod', 0x7ec8e3], ['Elderwood Rod', 0x3f6b3f], ['Mythril Rod', 0x9b5de5],
];
const LINE_NAMES = [
  ['Cotton Twine', 0xe8dcc0, 3], ['6lb Mono', 0xdfe9f0, 6], ['10lb Mono', 0xd8f0ff, 10],
  ['15lb Mono', 0xcfe6f5, 15], ['20lb Mono', 0xbfe0f2, 20], ['25lb Mono', 0x9fe3d8, 25],
  ['35lb Fluoro', 0x8fd6cf, 35], ['45lb Fluoro', 0x7fc9c6, 45], ['60lb Fluoro', 0xa9e5d0, 60],
  ['80lb Braid', 0xd8f0a0, 80], ['100lb Braid', 0xc8e88a, 100], ['130lb Braid', 0xffd166, 130],
  ['160lb Braid', 0xf6c445, 160], ['200lb Braid', 0xe8b03a, 200], ['250lb Braid', 0xd99b2b, 250],
  ['300lb Braid', 0xe07a4a, 300], ['380lb Spectra', 0xd06a3a, 380], ['470lb Spectra', 0xc25a2a, 470],
  ['580lb Spectra', 0xb84a20, 580], ['700lb Kevlar', 0xc0392b, 700], ['850lb Kevlar', 0xd0402f, 850],
  ['1000lb Aramid', 0xe0503f, 1000], ['1400lb Dragonline', 0x9ef7c8, 1400], ['1900lb Mythril', 0xe0d0ff, 1900],
];
const BAIT_NAMES = [
  ['Garden Worm', 0xd98b7a], ['Bread Ball', 0xe8d9b0], ['Sweet Corn', 0xffd94a],
  ['Red Wiggler', 0xc0503a], ['Mealworm', 0xd8b070], ['Maggot', 0xeee6c8],
  ['Sweet Pea', 0x8fd05a], ['Salmon Egg', 0xff7f50], ['Dough Ball', 0xf0dfa8],
  ['Cheese Cube', 0xffd166], ['Powerbait', 0xff9a3c], ['Live Minnow', 0xa9d6e8],
  ['Nightcrawler', 0xb07a6a], ['Cricket', 0x6a8a3a], ['River Shrimp', 0xff9a76],
  ['Bloodworm', 0xb02030], ['Cut Bait', 0xc98080], ['Glow Grub', 0x9ef7c8],
  ['Scent Bomb', 0xd07ae0], ['Chum Cloud', 0xb090c0], ['Firefly Sac', 0xe8f07a],
  ['Silver Minnow', 0xd8e8f0], ['Dragonfly Nymph', 0x6fd0b0], ['Moonbait', 0xc0d8ff],
];
// The established coin ladder is preserved. Four tiers are sold per island;
// island licenses and boat range now gate access to later chunks. Bait leads
// on price, while rods and lines decide how well you can land the local fish.
const ROD_COST  = [0, 50, 85, 140, 240, 410, 700, 1200, 1600, 2700, 4600, 5450, 7550, 8300, 14000, 24000, 29500, 34000, 38000, 42000, 46000, 50500, 55500, 61000];
const LINE_COST = [0, 40, 70, 120, 200, 340, 580, 990, 1250, 2100, 3550, 4200, 5850, 6450, 11000, 18500, 23000, 26500, 29500, 32500, 36000, 39500, 43500, 48000];
const BAIT_COST = [0, 80, 140, 240, 410, 700, 1200, 2050, 2500, 4250, 7200, 8400, 11500, 12500, 21000, 35500, 46000, 52500, 59000, 65000, 71500, 78500, 86500, 95000];

const RODS = ROD_NAMES.map(([name, color], i) => ({
  id:'rod' + i, name, color, cost: ROD_COST[i],
  cast: Math.round(12 + 3.6 * i),
  tension: +(1.55 * Math.pow(0.94, i)).toFixed(2),
  reel: +(0.75 * Math.pow(1.035, i)).toFixed(2),
}));
const LINES = LINE_NAMES.map(([name, color, rating], i) => ({
  id:'line' + i, name, color, rating, cost: LINE_COST[i],
  strain: +(1.60 * Math.pow(0.945, i)).toFixed(2),
}));
// each bait can only ever hook fish inside its rarity window
const BAIT_WINDOW = [
  [0,1],[0,1],[0,2],[1,2],[1,2],[1,3],[1,3],[2,3],[2,3],[2,4],[2,4],[2,4],
  [3,4],[3,4],[3,5],[3,5],[3,5],[4,5],[4,5],[4,5],[4,5],[4,5],[4,5],[4,5],
];
const BAITS = BAIT_NAMES.map(([name, color], i) => {
  const [lo, hi] = BAIT_WINDOW[i];
  return {
    id:'bait' + i, name, color, cost: BAIT_COST[i], lo, hi,
    // and it will only interest fish at least this big
    minSize: Math.round(0.9 * Math.pow(1.30, i) - 0.9),
    luck: +(0.9 * Math.pow(i / (BAIT_NAMES.length - 1), 1.2)).toFixed(2),
  };
});
// every tier must cost more than the one below it, whatever the tables say
[RODS, LINES, BAITS].forEach(list => {
  for(let i = 1; i < list.length; i++){
    if(list[i].cost <= list[i - 1].cost) list[i].cost = Math.ceil(list[i - 1].cost * 1.08 / 10) * 10;
  }
});

// ---------- Progression ----------
// Islands are level-gated. Local vendors sell four tiers of each gear ladder.
// Price and bait windows remain strict; owned gear is re-equippable anywhere.
function fishValue(sp, weight){
  // rarity sets the base, the specimen size multiplies it — a fat fish of a
  // rare species is where the money is
  const rel = clamp((weight - sp.minW) / Math.max(0.1, sp.maxW - sp.minW), 0, 1);
  const bulk = 0.6 + 0.4 * Math.pow(Math.max(0.5, weight) / 50, 0.35);
  return Math.max(6, Math.round(RARITY[sp.rarity].value * (0.5 + 0.5 * rel) * bulk * (1 + sp.island * 0.15)));
}

// The bait decides everything: each bait has a rarity window [lo, hi] and it
// physically cannot hook outside it, no matter the luck.
function baitWindow(i){
  const b = BAITS[i] || BAITS[0];
  return [b.lo, b.hi];
}
function eligibleSpecies(island, baitIndex){
  const bait = BAITS[baitIndex];
  if(!bait || !Number.isInteger(island) || island < 0 || island > 5) return [];
  return SPECIES.filter(s => s.island === island &&
    RARITY[s.rarity].tier >= bait.lo && RARITY[s.rarity].tier <= bait.hi && s.maxW >= bait.minSize);
}
function pickSpecies(island, baitIndex, random = Math.random){
  const bait = BAITS[baitIndex];
  const list = eligibleSpecies(island, baitIndex);
  if(!list.length) return null; // never silently give a fish outside the island/bait window
  const weights = list.map(s => s.weight * Math.pow(1 + bait.luck * 2, RARITY[s.rarity].tier - bait.lo));
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for(let i = 0; i < list.length; i++) { r -= weights[i]; if(r <= 0) return list[i]; }
  return list[list.length - 1];
}
function rollWeight(sp, baitIndex = 0, random = Math.random){
  const luck = (BAITS[baitIndex] || BAITS[0]).luck;
  const t = Math.pow(random(), 1 / (1 + luck * 1.8));   // biased heavier with better bait
  return sp.minW + (sp.maxW - sp.minW) * t;
}


export { SPECIES, RARITY, RARITY_ORDER, RODS, LINES, BAITS, fishValue, baitWindow, eligibleSpecies, pickSpecies, rollWeight };
