# Reel Life 3D — blocky first-person fishing

A cozy little **first-person** fishing game in the browser. Everything is built from
boxes: the lake, the dock, the fish, even the UI. Walk the dock and the shore, cast from
wherever the water is, wait for the bobber to dip, strike, then fight the fish in without
snapping your line. Sell your catch at the **fish market** and spend the coins at the
**tackle shop** on a better rod, a stronger line and luckier bait.

![genre](https://img.shields.io/badge/genre-casual%20fishing-0ea5b7) ![style](https://img.shields.io/badge/style-blocky-ef4056) ![three.js](https://img.shields.io/badge/three.js-r160-black)

## Play

```bash
npm start          # serves on http://localhost:3100
PORT=3000 npm start  # …or pick your own port
```

No build step and nothing to install — three.js is vendored in `vendor/`.
(Any static server works: `python3 -m http.server`, `npx serve`, …)

## How to fish

| Action | Control |
| --- | --- |
| Walk | WASD or arrow keys (Shift to jog) |
| Look around | Mouse (pointer lock — click to capture) |
| Charge a cast | Hold left click (or hold Space) |
| Cast | Release |
| Strike a bite | Click / Space when the bobber dips |
| Reel in | Hold click / Space |
| Open a stall | **E** near the Tackle Shop or Fish Market button |
| Release the cursor | Esc |

Touch: the on-screen stick walks, drag anywhere else to look, hold still to charge and
release to cast, tap to strike or reel in.

You can walk the length of the pier and out onto the whole shore clearing behind it —
roughly 60m across, fenced in, with trees and bushes along the back. The planks, sand and
grass are solid; the water is not. From the pier the dirt path forks: **left to the fish
market**, **right to the tackle shop**.

### The fight

The reel minigame is all about **line tension**, and it does not forgive:

- The tension bar has a **green safe band**. The needle only makes progress inside it.
- Holding winds the fish closer and drives the needle up; letting go drops it fast.
- **Snap**: reach the far right for a third of a second and the line goes — no fish, no coins.
- **Slack**: drift far below the band for two seconds and the fish spits the hook.
- Every fish **surges** at random: the needle rockets while it runs.
- **The band is sized by how outmatched you are.** Rarer and heavier fish narrow it; a
  better rod and line widen it back out. Hook a 40lb pike on cotton twine and the band is a
  sliver with a needle that jumps twice as fast — with a Pro Carbon and 26lb braid the same
  fish gives you half the bar.
- **Your line is rated for a weight.** Hook something heavier and the bar narrows *and*
  the needle gets wilder, with a `LINE OVERLOADED` warning on screen. Bring line, not luck.

## The two stalls

The shore behind the pier has two separate structures — walk up to either one and its
button appears (or press **E**).

**Tackle Shop** — three tabs with **24 tiers each**, bought with coins:

| | First | Then | Last |
| --- | --- | --- | --- |
| **Rod** — cast range | Bamboo Pole `free`, 14m | Willow Rod `145c` 17m · Fiberglass `150c` 21m · … | Mythril Rod `28,300c`, 92m |
| **Line** — max fish | Cotton Twine `free`, 3lb | 4lb Mono `80c` · 6lb `85c` · … | 800lb Mythril `15,600c` |
| **Bait** — luck | Garden Worm `free` | Bread Ball `60c` · Sweet Corn `60c` · … | Moonbait `11,300c` |

Rod = **distance + forgiveness**, line = **maximum weight you can land**, bait = **luck**
(rarer, heavier fish, and quicker bites). Every tier is a straight upgrade over the last —
the row shows `+3m cast · +0.03x reel` so you can see what you are buying. Any tier you can
afford is fair game; nothing is level-locked.

**Fish Market** — everything you catch goes into your bag instead of vanishing. Sell fish
one at a time or all at once. Heavier and rarer fish are worth far more, and deep water
(the far sandbars) is where the money is.

### Pacing

There are no levels — coins are the only gate. Prices are placed so that **each tier costs
roughly eight good catches at the depth that tier opens up**: you always feel one or two
sessions away from the next toy, and the top of the ladder stays far away.

| Milestone | Coins | Roughly |
| --- | --- | --- |
| Tier 2–4 rod | 145–260 | your first few minutes |
| Tier 8 rod (41m) | 820 | one good session |
| Tier 14 rod (62m) | 2,550 | several sessions |
| Tier 20 rod (82m) | 15,200 | the long haul |
| Tier 24 rod (92m) | 28,300 | the thing you will not stop thinking about |

Lines and baits compete for the same coins but are cheaper (about 55% and 40% of the rod
at the same tier), so a full kit is a genuine project rather than a first-sitting purchase.

## What's in the lake

**120 species** across six rarities, in twelve depth bands of ten. Every fish has its own
size range, strength, value and the **depth it lives at** — you can only hook a fish if
your cast reaches its water, and the deeper you cast the more the pool fills with that
band's residents. That is the real progression: better rods reach deeper water, which holds
bigger, rarer, richer fish. The catch log (top-right book icon) tracks everything you land;
the HUD keeps your heaviest catch. Coins, gear, your bag and the log are saved to
`localStorage` (key `reel-life-3d-save-v6`) — use **Reset** in the log drawer to wipe
progress.

| Depth | Who lives there |
| --- | --- |
| 0m | Bluegill, Pumpkinseed, Rock Bass, Yellow Perch, Black Crappie, Green Sunfish, Warmouth, White Perch, Redear Sunfish, Brown Bullhead |
| 8m | Largemouth / Smallmouth / Spotted / Yellow / White Bass, River & Grass Carp, Longear Sunfish, Saugeye, Creek Chub |
| 16m | Rainbow / Brown / Brook Trout, Walleye, Sauger, Channel & Blue Catfish, Tiger Muskie, Northern Pike, Burbot |
| 24m | Muskellunge, Striped Bass, Lake Trout, Chinook & Coho Salmon, Steelhead, Flathead Catfish, Bighead & Silver Carp, Golden Koi |
| 32m | Mirror & Leather Carp, Atlantic Salmon, Alligator Gar, Paddlefish, Bowfin, American Eel, Lake Sturgeon, Giant Snakehead, Golden Dorado |
| 40m | Wels Catfish, Goonch, Arapaima, Giant Gourami, Mekong Giant Catfish, Giant Stingray, Black Pacu, Tambaqui, Bull Shark, Golden Mahseer |
| 48m | Goliath Tigerfish, Giant Trevally, Napoleon Wrasse, Ocean Sunfish, Coelacanth, Giant Oarfish, Giant Manta, Whale Shark, Blue Marlin, Great White |
| 56m | Leviathan Sturgeon, Moonfish, Ancient Carp, Abyssal Wyrm, Star-Eater, Lunar Coelacanth, Deep One, Trench Serpent, Hollow Gar, Pale Leviathan |
| 64m | Titan Sturgeon, Void Angler, Elder Leviathan, Sunken God, Marrow Eel, Ghost Sturgeon, Colossal Squid, Megamouth, River Kraken, Golden Leviathan |
| 72m | World-Eater, Timefish, Bone Sail, Deep Choir, The Warden, Salt Ghost, Hollow King, Trench Widow, Old Growth, Pale Crown |
| 80m | The Drowned, Star Whale, Ironjaw, Sunken Spire, Lunar Leviathan, Hollow Moon, Deep Root, The Listener, Bone Tide, Crown of Salt |
| 88m | The Hollow God, World Serpent, Moon-Eater, The First Fish, Leviathan Prime, Sunken Crown, The Deep Itself, Pale Sun, Elder Tide, **Reel Life** |

Rarity runs common → uncommon → rare → epic → legendary → mythic, and rarer fish are worth
far more per pound. Everything past 48m is legendary or better — that is where the coins are.

## Built to run light

The scene is deliberately cheap so it holds 60fps on modest hardware:

- **~60 draw calls / ~28k triangles** for the whole lake (both stalls are merged into one
  mesh each, so a second building costs a single draw call). Every box shares one
  `BoxGeometry`, and the clutter (rocks, reeds, lily pads, treeline, clouds, hills, the
  path to the shop, splash particles) is drawn with `InstancedMesh`.
- **No shadow pass** — flat, blocky lighting instead.
- **`MeshLambertMaterial`** everywhere, plus a tiny custom water shader with posterised
  bands.
- **No blur / backdrop-filter** in the UI, no image or audio assets to download
  (all sound is synthesised with Web Audio).
- **Adaptive resolution**: if the first couple of seconds come in under 50fps it drops the
  pixel ratio, then again under 30fps.

## Project layout

```
index.html   markup + HUD
style.css    blocky UI styling
main.js      three.js scene, water shader, state machine, gear/economy, audio
serve.js     tiny zero-dependency static server
vendor/      three.js r160 module
```

## Tweaking

- Species table: `FISH_TABLE` at the top of `main.js` — one row per fish, with the numbers
  derived in the builder right below it (`BAND_PTS` / `BAND_W`).
- Gear tiers and prices: `ROD_NAMES` / `LINE_NAMES` / `BAIT_NAMES` plus the `*_COST` arrays.
- Fight difficulty: `fightSetup()` — `demand` vs `supply` sets both the band width and the
  needle speed in one ratio.
- Tension/reel feel: the `reeling` block inside `animate()`.
- Fish prices: `fishValue()`.
- Walkable area: `groundAt()` — return `null` to block a spot; `SHOP_POS` / `MARKET_POS`
  are the two stalls.
- Cast range: `landingPoint()`; rod pose angles: the `DIR_*` vectors.
- Water colours and bands: `waterMat` shader.
