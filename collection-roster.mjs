// The user's authored collection order. Each row is one distinct island entry,
// including repeated common names. Pounds and display spans are species-authored,
// NOT generated from island, rarity, index number or equipment level.
// name | rarity | anatomical template | min lb | max lb | span at max weight
const rows = `
Bluegill|common|bluegill|0.1|2|0.7
Pumpkinseed|common|pumpkinseed|0.08|1.4|0.6
Rock Bass|common|rock-bass|0.15|3|0.85
Yellow Perch|common|yellow-perch|0.1|3.2|0.9
Black Crappie|common|black-crappie|0.15|4|0.95
Green Sunfish|common|green-sunfish|0.06|1.8|0.65
Creek Chub|common|creek-chub|0.02|0.6|0.48
White Perch|common|white-perch|0.12|2.6|0.75
Redear Sunfish|uncommon|redear-sunfish|0.15|4|0.85
Golden Shiner|uncommon|minnow|0.02|0.5|0.48
Brown Bullhead|uncommon|brown-bullhead|0.3|5|1.05
Warmouth|uncommon|warmouth|0.1|2|0.65
Longear Sunfish|uncommon|longear-sunfish|0.04|0.8|0.5
White Sucker|uncommon|river-carp|0.3|6|1.1
Yellow Bass|uncommon|yellow-bass|0.15|2.5|0.8
Largemouth Bass|rare|largemouth-bass|0.5|15|1.6
Smallmouth Bass|rare|smallmouth-bass|0.4|9|1.35
Spotted Bass|rare|spotted-bass|0.3|7|1.25
White Bass|rare|white-bass|0.3|5|1.05
Golden Bluegill|rare|bluegill|0.15|2.8|0.78
Rainbow Trout|common|rainbow-trout|0.3|18|1.7
Brook Trout|common|brook-trout|0.2|8|1.2
Creek Trout|common|brook-trout|0.08|2.4|0.75
Lake Chub|common|creek-chub|0.015|0.3|0.4
Lake Whitefish|uncommon|whitefish|0.4|15|1.6
Brown Trout|uncommon|brown-trout|0.4|35|2.1
Cutthroat Trout|uncommon|trout|0.25|12|1.5
Arctic Grayling|uncommon|grayling|0.25|5|1.2
Sauger|uncommon|sauger|0.3|6|1.2
Burbot|uncommon|burbot|0.8|24|1.9
Walleye|rare|walleye|0.7|20|1.8
Northern Pike|rare|northern-pike|1|45|2.8
Tiger Trout|rare|trout|0.4|14|1.55
Lake Trout|rare|lake-trout|1|60|2.5
Muskellunge|rare|muskellunge|2|65|3.3
Tiger Muskie|rare|tiger-muskie|1.5|45|2.9
Steelhead|rare|steelhead|0.8|35|2.1
Golden Trout|epic|trout|0.1|5|1.05
Silver Pike|epic|northern-pike|1.2|38|2.65
Forest Guardian|epic|ancient-carp|3|55|2.5
River Carp|uncommon|river-carp|1|40|1.9
Grass Carp|uncommon|grass-carp|1.5|70|2.5
Creek Dace|uncommon|minnow|0.01|0.25|0.38
River Minnow|uncommon|minnow|0.006|0.12|0.3
Common Shiner|uncommon|minnow|0.01|0.2|0.36
Channel Catfish|rare|channel-catfish|0.6|45|2.4
Freshwater Drum|rare|drum|0.8|40|2
Silver Carp|rare|silver-carp|1.5|70|2.5
River Redhorse|rare|river-carp|0.4|12|1.5
Saugeye|rare|saugeye|0.4|12|1.5
Flathead Catfish|rare|flathead-catfish|2|120|3.5
Blue Catfish|rare|blue-catfish|2|140|3.8
Striped Bass|rare|striped-bass|1|65|2.7
Chinook Salmon|epic|chinook-salmon|2|90|2.8
Coho Salmon|epic|coho-salmon|1|30|2
Bighead Carp|epic|bighead-carp|2|110|3
Giant River Gar|epic|alligator-gar|15|160|4.5
Albino Catfish|epic|wels-catfish|2|85|3.4
Ironback Sturgeon|epic|lake-sturgeon|10|220|5.5
River Colossus|epic|arapaima|30|300|6
Mud Minnow|uncommon|minnow|0.008|0.15|0.32
Swamp Shiner|uncommon|minnow|0.01|0.2|0.35
Black Bullhead|uncommon|brown-bullhead|0.2|4|0.95
Mud Sunfish|rare|warmouth|0.05|1.2|0.55
Swamp Perch|rare|yellow-perch|0.15|4|0.95
Bowfin|rare|bowfin|0.8|18|1.8
American Eel|rare|american-eel|0.3|10|2.4
Spotted Gar|rare|gar|0.5|15|2.4
Brown Pickerel|epic|northern-pike|0.3|7|1.65
Climbing Perch|epic|perch|0.08|1.8|0.65
Alligator Gar|epic|alligator-gar|5|300|6
Longnose Gar|epic|gar|1|45|3.6
Swamp Eel|epic|american-eel|0.2|5|1.9
Black Pacu|epic|black-pacu|1|55|2.1
Tambaqui|epic|tambaqui|2|80|2.5
Giant Gourami|legendary|giant-gourami|0.8|18|1.4
Crocodile Gar|legendary|alligator-gar|12|220|5.3
Phantom Catfish|legendary|wels-catfish|0.5|35|2.4
Ancient Bowfin|legendary|bowfin|2|32|2.2
Swamp Colossus|legendary|armored|40|420|6.5
Clown Killifish|rare|guppy|0.001|0.008|0.2
Guppy|rare|guppy|0.001|0.012|0.22
Molly|rare|guppy|0.003|0.045|0.29
Swordtail|rare|swordtail|0.004|0.055|0.38
Platy|epic|guppy|0.002|0.025|0.25
Neon Tetra|epic|tetra|0.001|0.008|0.19
Angelfish|epic|angelfish|0.03|0.3|0.55
Discus|epic|discus|0.06|0.7|0.55
Gourami|epic|giant-gourami|0.03|0.45|0.52
Peacock Cichlid|epic|cichlid|0.03|0.6|0.58
Flowerhorn Cichlid|epic|napoleon-wrasse|0.2|2.5|0.85
Redtail Catfish|epic|catfish|1.5|90|3.2
Silver Arowana|legendary|arowana|0.5|14|1.9
Oscar Fish|legendary|cichlid|0.2|3.5|0.9
Black Arowana|legendary|arowana|0.4|12|1.8
Giant Snakehead|legendary|giant-snakehead|1.5|45|2.4
Golden Mahseer|legendary|golden-mahseer|1.5|90|2.8
Golden Koi|legendary|golden-koi|0.3|18|1.7
Rainbow Arowana|legendary|arowana|0.5|20|2.15
Sunscar Dragonfish|legendary|golden-dorado|1|28|2.6
Blue Tang|rare|tang|0.06|1.3|0.65
Yellow Tang|rare|tang|0.04|0.8|0.55
Butterflyfish|rare|butterflyfish|0.03|0.65|0.55
Sergeant Major|epic|sunfish|0.03|0.6|0.5
Damselfish|epic|sunfish|0.01|0.3|0.42
Parrotfish|epic|napoleon-wrasse|0.3|30|1.7
Moorish Idol|epic|angelfish|0.06|0.7|0.65
Lionfish|epic|lionfish|0.1|2.5|1
Triggerfish|epic|triggerfish|0.2|12|1.2
Royal Gramma|legendary|bass|0.005|0.08|0.3
Moray Eel|legendary|moray|0.5|60|3.8
Barracuda|legendary|barracuda|1|70|3.3
Queen Angelfish|legendary|angelfish|0.2|3.5|0.95
Grouper|legendary|grouper|1|80|2.5
Cobia|legendary|cobia|1|100|3.3
Napoleon Wrasse|legendary|napoleon-wrasse|2|180|3.5
Giant Grouper|mythic|grouper|20|600|5.5
Rainbow Marlin|mythic|blue-marlin|10|500|6.5
Coral Manta|mythic|giant-manta|10|250|4.3
Coral Guardian|mythic|sunken-god|3|85|3.2
Atlantic Mackerel|epic|mackerel|0.2|3.5|1.1
Sardine|epic|herring|0.03|0.45|0.48
Herring|epic|herring|0.08|1.5|0.75
Anchovy|epic|minnow|0.003|0.09|0.3
Sea Bass|legendary|bass|0.4|20|1.7
Red Snapper|legendary|snapper|0.5|40|2
Black Sea Bass|legendary|bass|0.3|9|1.25
Flounder|legendary|flatfish|0.2|12|1.3
Pompano|legendary|trevally|0.3|8|1.2
Sheepshead|legendary|sunfish|0.4|18|1.5
King Mackerel|legendary|mackerel|1|70|3.2
Tarpon|mythic|arowana|3|250|4.5
Amberjack|mythic|giant-trevally|2|130|3.5
Permit|mythic|trevally|1|55|2.3
Goliath Grouper|mythic|grouper|20|800|6
Giant Trevally|mythic|giant-trevally|2|160|3.5
Bluefin Tuna|mythic|tuna|10|900|5.2
Blue Marlin|mythic|blue-marlin|20|1200|8
Great White Shark|mythic|great-white|150|4500|10
Coastal Leviathan|mythic|leviathan-prime|80|1800|10
Flying Fish|epic|flying-fish|0.05|1.5|0.85
Bonito|epic|tuna|0.5|20|1.8
Needlefish|epic|gar|0.1|5|2
Skipjack Tuna|legendary|tuna|1|40|2.2
Mahi-Mahi|legendary|mahi|1|85|3.5
Wahoo|legendary|barracuda|2|130|4
Opah|legendary|opah|5|220|3.2
Sailfish|legendary|sailfish|10|220|5.8
Yellowfin Tuna|mythic|tuna|10|400|4.5
Swordfish|mythic|blue-marlin|15|1100|7
Thresher Shark|mythic|thresher|20|600|9
Mako Shark|mythic|great-white|25|1100|7
Blue Shark|mythic|bull-shark|15|400|6
Oceanic Whitetip|mythic|bull-shark|20|350|5.5
Black Marlin|mythic|blue-marlin|30|1600|8.5
Giant Bluefin Tuna|exotic|tuna|300|1500|6.5
Megamouth Shark|exotic|whale-shark|300|2500|8.5
Stormray|exotic|giant-manta|15|450|5.5
Thunderjaw|exotic|void-angler|4|80|2.4
Tempest Leviathan|exotic|leviathan-prime|200|3500|13
Tiger Barb|legendary|tetra|0.002|0.035|0.25
Glass Catfish|legendary|glass-catfish|0.002|0.03|0.35
Redtail Tetra|legendary|tetra|0.003|0.04|0.3
Spotted Piranha|mythic|piranha|0.2|4|0.85
African Butterflyfish|mythic|flying-fish|0.01|0.1|0.4
Electric Blue Acara|mythic|cichlid|0.06|0.8|0.6
Peacock Bass|mythic|bass|0.6|25|1.7
Payara|mythic|golden-dorado|0.8|35|2
Electric Eel|mythic|american-eel|1.5|45|4
Tiger Shovelnose Catfish|mythic|flathead-catfish|1|80|3.3
Red-Bellied Piranha|mythic|piranha|0.2|6|0.95
Giant Arapaima|exotic|arapaima|25|450|6
Black Pacu|exotic|black-pacu|1|55|2.1
Goonch Catfish|exotic|goonch|4|200|4.5
Redtail Giant Catfish|exotic|catfish|20|180|4.2
Giant Stingray|exotic|giant-stingray|30|1200|7.5
Golden Dorado|exotic|golden-dorado|1.5|65|2.5
Emerald Dragonfish|exotic|arowana|0.5|24|2.5
Ancient River Hydra|exotic|hydra|15|280|7
The Green Devourer|exotic|deep-one|8|140|4
Ember Guppy|mythic|guppy|0.002|0.02|0.25
Ashfin Minnow|mythic|minnow|0.006|0.12|0.34
Redscale Perch|mythic|perch|0.1|4|1
Cinder Carp|mythic|river-carp|0.5|35|1.9
Lava Darter|exotic|minnow|0.005|0.08|0.28
Firebelly Fish|exotic|discus|0.03|0.8|0.6
Flame Gourami|exotic|giant-gourami|0.04|1.5|0.7
Charcoal Catfish|exotic|brown-bullhead|0.3|8|1.3
Scorchfin Bass|exotic|bass|0.5|18|1.65
Redtail Barracuda|exotic|barracuda|1|65|3.2
Magma Eel|exotic|marrow-eel|0.5|22|3.3
Obsidian Gar|exotic|alligator-gar|2|150|4.5
Furnace Grouper|divine|grouper|4|180|3.5
Inferno Piranha|divine|piranha|0.4|8|1.1
Blazetail Sturgeon|divine|lake-sturgeon|10|400|6
Molten Stingray|divine|giant-stingray|8|240|4.5
Ashen Dragonfish|divine|deep-choir|0.5|18|2.1
Magma Leviathan|divine|leviathan-prime|150|3000|12
The Burning One|divine|pale-sun|0.4|12|1.1
Worldfire Serpent|divine|world-serpent|80|1400|16
Arctic Char|mythic|trout|0.4|25|1.8
Arctic Grayling|mythic|grayling|0.25|5|1.2
Ice Smelt|mythic|herring|0.01|0.4|0.5
Polar Sculpin|exotic|sculpin|0.05|2|0.75
Lake Whitefish|exotic|whitefish|0.4|15|1.6
Arctic Cisco|exotic|whitefish|0.1|4|0.95
Northern Herring|exotic|herring|0.08|1.6|0.8
Round Whitefish|exotic|whitefish|0.15|5|1.1
Arctic Cod|exotic|burbot|0.08|1.5|0.75
Greenland Halibut|exotic|flatfish|2|90|2.8
Greenland Shark|exotic|whale-shark|100|2500|9
Atlantic Wolffish|divine|wolffish|1|45|2.4
Antarctic Toothfish|divine|burbot|10|250|3.8
Icefish|divine|glass-catfish|0.08|2.5|0.85
Giant Halibut|divine|flatfish|40|650|5
Frostfang Pike|divine|northern-pike|2|65|3.2
Snowflake Sturgeon|divine|lake-sturgeon|8|320|5.6
Glacier Whale|divine|star-whale|1000|30000|25
Icebound Leviathan|divine|leviathan-prime|100|2500|11
The Frozen King|divine|hollow-king|5|110|3.2
Capelin|exotic|herring|0.015|0.3|0.45
Sand Lance|exotic|needle|0.008|0.25|0.65
Blue Whiting|exotic|burbot|0.1|2.5|0.9
Arctic Flounder|exotic|flatfish|0.15|5|1
Polar Cod|divine|burbot|0.08|2|0.8
Atlantic Wolffish|divine|wolffish|1|45|2.4
Haddock|divine|burbot|0.5|25|1.8
Atlantic Halibut|divine|flatfish|4|500|4.6
Sablefish|divine|cobia|1|50|2.3
Lumpfish|divine|lumpfish|0.3|15|1.2
Sixgill Shark|divine|sixgill|30|1800|8
Greenland Turbot|ancient|flatfish|2|100|2.9
Black Dogfish|ancient|bull-shark|0.3|8|1.9
Sleeper Shark|ancient|whale-shark|80|2200|9
Giant Oarfish|ancient|giant-oarfish|5|550|16
Antarctic Icefish|ancient|glass-catfish|0.1|4|1.1
Bluefin Greenland Shark|ancient|whale-shark|150|3000|10
Crystal Coelacanth|ancient|coelacanth|2|160|3.2
Frostborn Whale|ancient|star-whale|1500|45000|29
Eternal Frost Serpent|ancient|world-serpent|20|700|13
Lanternfish|exotic|lanternfish|0.002|0.15|0.35
Hatchetfish|exotic|hatchetfish|0.002|0.04|0.28
Bristlemouth|exotic|lanternfish|0.001|0.025|0.24
Viperfish|divine|viperfish|0.02|0.5|0.7
Fangtooth|divine|fangtooth|0.02|0.4|0.5
Barreleye|divine|barreleye|0.02|0.3|0.45
Dragonfish|divine|viperfish|0.02|0.6|0.8
Gulper Eel|divine|gulper|0.2|4|2.3
Black Swallower|divine|fangtooth|0.03|0.8|0.7
Snaggletooth|divine|viperfish|0.015|0.4|0.65
Anglerfish|ancient|void-angler|0.15|8|1.2
Frilled Shark|ancient|frilled-shark|1|15|3
Goblin Shark|ancient|goblin-shark|20|450|6.5
Pacific Sleeper Shark|ancient|whale-shark|100|3000|10
Giant Isopod|ancient|isopod|0.2|4|0.95
Giant Squid|ancient|colossal-squid|15|600|14
Giant Pacific Octopus|ancient|river-kraken|5|150|7
Phantom Oarfish|ancient|giant-oarfish|1|95|9
Voidjaw Angler|ancient|void-angler|0.5|30|2
The Unseen|ancient|ghost-leviathan|0.1|6|2.2
Wreck Goby|divine|goby|0.003|0.12|0.3
Rustscale Dace|divine|minnow|0.01|0.3|0.42
Bone Minnow|divine|minnow|0.006|0.16|0.36
Deepwater Hake|divine|burbot|0.5|30|2
Coffinfish|ancient|fangtooth|0.05|1.5|0.65
Sea Raven|ancient|sculpin|0.4|7|1.2
Blackbelly Rosefish|ancient|perch|0.2|5|1
Deepwater Scorpionfish|ancient|lionfish|0.3|12|1.5
Chimaera|ancient|chimaera|0.6|18|2.7
Sixgill Eel|ancient|frilled-shark|1|25|3.7
Giant Sea Spider|ancient|sea-spider|0.05|1.5|2
Deepwater Stingray|celestial|giant-stingray|5|180|4.3
Sperm Whale|celestial|sperm-whale|5000|90000|34
Ancient Sturgeon|celestial|leviathan-sturgeon|10|600|7
Giant Sleeper Ray|celestial|giant-stingray|30|1000|7
Boneplate Shark|celestial|sunken-god|20|800|7.5
Skeleton Marlin|celestial|bone-sail|10|400|6.5
Ghost Leviathan|celestial|ghost-leviathan|50|1800|12
Gravekeeper|celestial|hollow-king|2|65|2.8
The Buried God|celestial|sunken-god|8|260|4.7
Vent Shrimp|divine|shrimp|0.001|0.06|0.32
Sulfur Minnow|divine|minnow|0.005|0.1|0.3
Ashscale Fish|divine|perch|0.08|2|0.7
Ember Lanternfish|ancient|lanternfish|0.003|0.18|0.38
Blackfin Goby|ancient|goby|0.01|0.4|0.5
Rift Eel|ancient|marrow-eel|0.3|12|3
Flamejaw Fish|ancient|fangtooth|0.1|4|0.95
Scalding Fangfish|ancient|viperfish|0.05|1.8|1.2
Magma Skater|ancient|ray|0.4|16|1.8
Red Abyss Angler|celestial|void-angler|0.5|25|1.8
Thermal Dragonfish|celestial|deep-choir|0.08|3|1.5
Furnace Shark|celestial|bull-shark|25|700|6.8
Obsidian Squid|celestial|colossal-squid|5|220|8
Lavahead Sturgeon|celestial|lake-sturgeon|8|300|5.6
Infernal Oarfish|celestial|giant-oarfish|4|140|10
Ashen Colossus|celestial|armored|300|7000|14
Molten Leviathan|celestial|leviathan-prime|150|4500|14
Hellfire Serpent|celestial|world-serpent|40|1000|17
The Eternal Flame|celestial|pale-sun|0.2|7|0.95
Worldburner|celestial|star-eater|20|800|8
Moon Minnow|ancient|minnow|0.004|0.08|0.3
Silver Shrinefish|ancient|tang|0.06|1.2|0.65
Temple Goby|ancient|goby|0.006|0.2|0.4
Pearl Darter|ancient|minnow|0.003|0.06|0.28
Blue Spiritfish|celestial|angelfish|0.05|0.6|0.7
Moonray|celestial|giant-stingray|0.5|28|2.6
Sacred Koi|celestial|golden-koi|0.4|22|2
Lunar Eel|celestial|marrow-eel|0.3|18|3.5
Temple Catfish|celestial|catfish|0.8|45|2.8
Starry Grouper|celestial|grouper|2|100|2.8
Celestial Stingray|celestial|giant-stingray|4|130|3.8
Ancient Moonfish|transcendent|moonfish|0.5|12|1.2
Silver Leviathan|transcendent|leviathan-prime|80|2200|11
Astral Coelacanth|transcendent|lunar-coelacanth|3|180|3.8
Moonstone Marlin|transcendent|blue-marlin|15|700|7.5
Lunar Whale|transcendent|star-whale|1500|40000|28
Sacred Dragonfish|transcendent|deep-choir|0.3|14|2.5
Crown of Salt|transcendent|crown-of-salt|0.8|40|2.8
The Hollow God|transcendent|the-hollow-god|5|280|8
The First Fish|transcendent|the-first-fish|0.02|1|0.7
Stardust Minnow|ancient|minnow|0.003|0.07|0.28
Comet Tetra|ancient|tetra|0.002|0.03|0.26
Nebula Guppy|ancient|guppy|0.001|0.018|0.24
Cosmic Dace|celestial|minnow|0.01|0.35|0.5
Meteor Perch|celestial|perch|0.1|5|1.1
Aurora Koi|celestial|golden-koi|0.5|24|2
Pulsar Eel|celestial|world-serpent|0.25|15|3.4
Galaxy Angelfish|celestial|angelfish|0.08|1.5|0.9
Starfire Bass|celestial|bass|0.5|22|1.8
Eclipse Ray|transcendent|crown-of-salt|2|85|3.4
Nebula Marlin|transcendent|blue-marlin|10|650|7.4
Comet Shark|transcendent|great-white|30|1200|8
Solar Sturgeon|transcendent|lake-sturgeon|12|450|6.5
Astral Squid|transcendent|colossal-squid|8|400|11
Supernova Whale|transcendent|star-whale|2000|60000|32
Constellation Serpent|transcendent|world-serpent|15|450|14
Star-Eater|transcendent|star-eater|3|120|4
Celestial Leviathan|transcendent|leviathan-prime|200|5000|15
The Last Starfish|transcendent|starfish|0.05|3|1.2
Cosmic Emperor|transcendent|hollow-king|0.8|35|2.6
Null Minnow|celestial|minnow|0.003|0.08|0.3
Voidfin|celestial|angelfish|0.03|0.6|0.6
Darkwater Dace|celestial|minnow|0.01|0.4|0.5
Shadow Goby|celestial|goby|0.006|0.2|0.4
Rift Shiner|celestial|minnow|0.008|0.3|0.45
Spectral Ray|celestial|giant-stingray|0.8|40|2.7
Phantom Eel|celestial|marrow-eel|0.2|12|3.2
Hollow Angler|transcendent|void-angler|0.2|10|1.4
Blackstar Fish|transcendent|pale-sun|0.1|6|1
Abyss Walker|transcendent|sea-spider|0.5|35|3.5
Void Sturgeon|transcendent|leviathan-sturgeon|8|350|6.4
Dimension Shark|transcendent|great-white|30|1600|8.5
Rift Leviathan|transcendent|ghost-leviathan|80|2500|12
Shadow Serpent|transcendent|world-serpent|10|300|12
Forgotten Colossus|transcendent|armored|150|5000|13
Dark Matter Squid|transcendent|colossal-squid|10|650|14
Endless Maw|transcendent|the-deep-itself|1|90|3.5
The Unmaker|transcendent|deep-root|5|180|6
Void King|transcendent|hollow-king|1.5|65|3.2
The Null|transcendent|pale-sun|0.01|0.5|0.55
Time Minnow|celestial|minnow|0.004|0.09|0.32
Chrono Guppy|celestial|guppy|0.001|0.02|0.26
Ancient Darter|celestial|minnow|0.005|0.12|0.34
Eternal Shiner|celestial|minnow|0.01|0.35|0.5
Memory Koi|transcendent|golden-koi|0.4|20|1.9
Timeworn Eel|transcendent|marrow-eel|0.3|18|3.7
Paradox Perch|transcendent|perch|0.1|6|1.15
Hourglass Ray|transcendent|crown-of-salt|1|45|2.9
Forgotten Marlin|transcendent|bone-sail|8|500|7
Timeless Angler|transcendent|void-angler|0.3|18|1.8
Epoch Sturgeon|transcendent|leviathan-sturgeon|8|500|6.8
Ancient Worldfish|transcendent|coelacanth|4|220|4
Chrono Shark|transcendent|great-white|40|1800|9
Eternity Squid|transcendent|colossal-squid|8|500|12
Timebreaker Whale|transcendent|elder-tide|2500|75000|35
Primordial Dragonfish|transcendent|deep-choir|0.5|28|3
Eternal Leviathan|transcendent|leviathan-prime|200|6500|17
The First Guardian|transcendent|sunken-god|6|240|4.8
The Last Guardian|transcendent|hollow-king|2|90|3.6
Time Itself|transcendent|timefish|0.05|4|1.2
Origin Minnow|unfathomable|minnow|0.002|0.06|0.3
Primordial Fry|unfathomable|tetra|0.001|0.008|0.2
Genesis Darter|unfathomable|minnow|0.004|0.1|0.35
Firstwater Carp|unfathomable|ancient-carp|0.6|40|2.2
Dawnscale|unfathomable|discus|0.04|1|0.7
Ancient Moonray|unfathomable|crown-of-salt|1|60|3.2
Creation Eel|unfathomable|world-serpent|0.4|30|4.4
Primordial Pike|unfathomable|northern-pike|2|80|3.8
Genesis Sturgeon|unfathomable|leviathan-sturgeon|15|700|8
Origin Angler|unfathomable|the-deep-itself|0.5|50|2.6
Worldroot Serpent|unfathomable|world-serpent|20|800|16
Firstborn Leviathan|unfathomable|leviathan-prime|250|8000|19
Eternal Sea Dragon|unfathomable|deep-choir|30|1200|11
The Ancient One|unfathomable|lunar-coelacanth|8|360|5
Worldmaker|unfathomable|coelacanth|2|80|3
Primordial Colossus|unfathomable|armored|3000|60000|32
The Beginning|unfathomable|moonfish|0.01|0.12|0.35
The Unending|unfathomable|world-serpent|5|150|11
Creator of Tides|unfathomable|elder-tide|1000|40000|28
Origin|unfathomable|the-first-fish|0.02|1.2|0.75
`;
const seen=new Set();
export const COLLECTION_ROSTER=Object.freeze(rows.trim().split('\n').map((row,index)=>{
  const [name,rarity,template,min,max,span]=row.split('|'),island=Math.floor(index/20);
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const id=seen.has(slug)?`${slug}-island-${island+1}`:slug;seen.add(id);
  return Object.freeze({id,number:index+1,island,name,rarity,template,minW:Number(min),maxW:Number(max),displaySpan:Number(span)});
}));
if(COLLECTION_ROSTER.length!==400)throw new Error('The collection must have exactly 400 authored entries');
export const FISH_PER_ISLAND=20;
export const COLLECTION_SIZE=COLLECTION_ROSTER.length;
