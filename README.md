# Reel Deal 3D — blocky first-person fishing

A cozy little **first-person** fishing game in the browser. Everything is built from
boxes: the lake, the dock, the fish, even the UI. Walk the dock and the shore, cast from
wherever the water is, wait for the bobber to dip, strike, then fight the fish in without
snapping your line. Sell your catch at the **fish market** and spend the coins at the
**tackle shop** on a better rod, a stronger line and better bait.
What bites is **pure luck, decided by your bait** — there is no depth to chase.

![genre](https://img.shields.io/badge/genre-casual%20fishing-0ea5b7) ![style](https://img.shields.io/badge/style-blocky-ef4056) ![three.js](https://img.shields.io/badge/three.js-r160-black)

## Play

```bash
npm start          # serves on http://localhost:3100
PORT=3000 npm start  # …or pick your own port
```

No build step and nothing to install — three.js is vendored in `vendor/`.
(Any static server works: `python3 -m http.server`, `npx serve`, …)

## Deploy

The game is a static site: one HTML file, one CSS file, one JS file and a vendored
three.js. **Nothing needs to be built or installed**, so deploy it as a static site — no
server, no cold starts.

### Render — static site (recommended)

1. Push the repo to GitHub.
2. In Render: **New +** → **Static Site** → pick the repo.
3. **Branch**: `main` (or the branch you want to preview, e.g. a feature branch).
4. **Build Command**: leave empty.
5. **Publish Directory**: `.`
6. **Create Static Site**. First deploy takes about a minute.

Optional: the same thing as a blueprint — commit `render.yaml` (already in the repo) and pick
**New +** → **Blueprint**.

### Render — web service (alternative)

There is also a zero-dependency Node static server (`serve.js`) if you would rather run a
service: **New +** → **Web Service**, Runtime **Node**, Build Command `npm install`, Start
Command `npm start`. It honours `PORT`, so Render wires it up automatically. The free tier
sleeps after 15 minutes idle and takes ~30s to wake, which is why the static site is the
better default.

### Anywhere else

It is plain files: `index.html`, `style.css`, `main.js`, `vendor/`. Drop those four into
Netlify, Cloudflare Pages, GitHub Pages, S3, or any bucket and it runs. Serve it over HTTP
(not `file://`) so the ES modules load.

Everything uses relative paths, so it works at a domain root *or* under a subpath.

### Caching

`main.js` / `style.css` are requested with a `?v=` stamp in `index.html`; bump it (e.g.
`?v=24` → `?v=25`) whenever you ship a change, otherwise returning players get the old
build out of their browser cache.

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

The reel minigame is all about **line tension**, and the needle is deliberately twitchy.

The bar is five zones: **red · yellow · green · yellow · red**.

- **Green** — the reel winds itself. You do not need to hold anything; just keep the
  needle in there and the fish comes in at a steady (15% slower) crank.
- **Yellow** — nothing happens. The needle is drifting, the fish is not coming in, and no
  progress is made either way. Yellow is the room you have to correct in.
- **Red, either end** — the fight ends that instant. Too tight and the line snaps; too
  slack and the fish spits the hook. No grace period.
- Holding drives the needle up, letting go drops it, and the fish does not help:
  random **surges**, sudden **yanks** in either direction, and a constant wobble on top.
  Bad equipment means more wobble.
- **The band is sized by how outmatched you are.** Rarer and heavier fish narrow it; a
  better rod and line widen it back out and calm the needle.
- **Your line is rated for a weight.** Hook something heavier and the bar narrows *and*
  the needle gets wilder, with a `LINE OVERLOADED` warning on screen. Bring line, not hope.

## The two stalls

The shore behind the pier has two separate structures — walk up to either one and its
button appears (or press **E**).

**Tackle Shop** — three tabs with **24 tiers each**, bought with coins:

| | First | Then | Last |
| --- | --- | --- | --- |
| **Rod** — reach + control | Bamboo Pole `free`, 12m, POWER 8 | Willow Rod `50c` 16m · Graphite `85c` 19m · … | Mythril Rod `61,000c`, 95m, POWER 232 |
| **Line** — max fish | Cotton Twine `free`, 3lb | 10lb Mono `70c` · 15lb Mono `120c` · … | 1900lb Mythril `48,000c` |
| **Bait** — what bites | Garden Worm `free`, common–uncommon, any size | Sweet Corn `140c`, common–rare · … | Moonbait `95,000c`, legendary–mythic, 375lb+ |

**Bait is the whole progression.** Every bait has a *rarity window* and a *minimum fish
size*, and it physically cannot hook anything outside them — a beginner worm will never
drag up a leviathan however lucky you get, and the endgame baits no longer waste time on
bluegills. The shop prints exactly what each one catches
(`CATCHES EPIC–MYTHIC · 35LB+ · LUCK +50%`), and the row below it says what the next tier
unlocks.

Rod = **how far you cast and how forgiving the fight is** (the `POWER` score), line =
**the maximum weight you can actually land**. Neither one changes what bites; they decide
whether you can hold on once it does. Over-bait your line and the bar narrows to nothing,
so keep the three ladders within a couple of tiers of each other. Any tier you can afford
is fair game; nothing is level-locked.

**Fish Market** — everything you catch goes into your bag instead of vanishing. Sell fish
one at a time or all at once. Rarity sets the price and size multiplies it, so a fat
mythic is worth hundreds of commons.

### Pacing

There are no levels — coins are the only gate. Every price is fitted to what the bait
tier *actually earns*: **a tier costs about ten catches of the fish you are already
catching**, with a hard 1.75× ceiling on any single jump so no rung is a wall. The pace is
flat on purpose — no tier is a breeze and none is a brick wall.

Bait is the ladder that opens content, so it leads on price. Rod and line sit at roughly
65% and 50% of the bait tier beside them, which keeps all three within a couple of tiers
of each other without ever feeling like a tax.

| Milestone | Coins | Roughly |
| --- | --- | --- |
| Tier 2 bait | 80 | **four** fish |
| Tier 4 bait (rare) | 240 | your first few minutes |
| Tier 9 bait (legendary) | 4,250 | one good session |
| Tier 14 bait (mythic) | 21,000 | the mythic gate |
| Tier 20 bait (170lb+ only) | 71,500 | the long haul |
| Tier 24 bait (375lb+ only) | 95,000 | the thing you will not stop thinking about |

A full run is roughly **490 catches** across the three ladders — about 1,420,000 coins —
while the first rung of each ladder still costs two to four fish.

## What's in the lake

**120 species** across six rarities, fourteen commons up to forty-two mythics. Every fish
has its own size range, strength, value and a home depth — but the depth is scenery now.
What decides the bite is the **bait's rarity window and minimum size**, so the pool is
always exactly the fish that bait is allowed to catch. The catch log (top-right book icon)
tracks everything you land; the HUD keeps your heaviest catch. Coins, gear, your bag and
the log are saved to `localStorage` (key `reel-deal-save-v6`, migrated automatically from the
old `reel-life-3d-save-v6`) — use **Reset** in the log
drawer to wipe progress.

| Rarity | Fish | Typical sale |
| --- | --- | --- |
| Common | 14 | ~13c |
| Uncommon | 11 | ~37c |
| Rare | 14 | ~110c |
| Epic | 14 | ~350c |
| Legendary | 25 | ~1,150c |
| Mythic | 42 | ~4,500c |

The bands below are the flavour grouping (deep-water fish run bigger and score higher);
they no longer gate anything.

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

Rarity runs common → uncommon → rare → epic → legendary → mythic, and each step up is worth
roughly three to four times the one below it. Everything past 48m is legendary or better —
that is where the coins are, and a legendary–mythic bait is how you get at them.

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
- Fish prices: `fishValue()` and the `value` column of `RARITY`.
- What each bait can hook: `BAIT_WINDOW` (rarity) and the `minSize` curve in `BAITS`.
- Walkable area: `groundAt()` — return `null` to block a spot; `SHOP_POS` / `MARKET_POS`
  are the two stalls.
- Cast range: `landingPoint()`; rod pose angles: the `DIR_*` vectors.
- Water colours and bands: `waterMat` shader.
