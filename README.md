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

**Tackle Shop** — three tabs, five tiers each, bought with coins and unlocked in order:

| | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
| --- | --- | --- | --- | --- | --- |
| **Rod** (cast range) | Bamboo `free` 16m | Fiberglass `250c` 20m | Carbon `1000c` 25m | Pro Carbon `3000c` 30m | Mythril `7000c` 36m |
| **Line** (max fish) | Twine `free` 3lb | 6lb Mono `200c` | 12lb Mono `750c` | 26lb Braid `2200c` | 55lb Fluoro `5000c` |
| **Bait** (luck) | Worm `free` | Sweet Corn `180c` | Live Minnow `600c` | River Shrimp `1800c` | Glow Grub `4200c` |

Rod = **distance + forgiveness**, line = **maximum weight you can land**, bait = **luck**
(rarer, heavier fish, and quicker bites). You can own several of each and re-equip any of
them for free; you just have to buy them in order.

**Fish Market** — everything you catch goes into your bag instead of vanishing. Sell fish
one at a time or all at once. Heavier and rarer fish are worth far more, and deep water
(the far sandbars) is where the money is.

### Pacing

There are no levels — coins are the only gate, and the ladder is deliberately spread out:

| Goal | Coins | Roughly |
| --- | --- | --- |
| Fiberglass rod | 250 | first few minutes |
| Carbon rod | 1000 | one good session |
| Pro Carbon | 3000 | a few sessions |
| Mythril rod | 7000 | the long haul |

Everything else (lines, baits) competes for the same coins, so a full kit is a genuine
project rather than a first-sitting purchase.

## What's in the lake

**24 species** across six rarities, each with its own size range, strength, value and the
**depth it lives at** — you can only hook a fish if your cast reaches its water. That is
the real progression: better rods reach deeper water, which holds bigger, rarer, richer
fish. The catch log (top-right book icon) tracks everything you land; the HUD keeps your
heaviest catch. Coins, gear, your bag and the log are saved to `localStorage`
(key `reel-life-3d-save-v5`) — use **Reset** in the log drawer to wipe progress.

| Depth | Species |
| --- | --- |
| Shore (0–6m) | Bluegill, Pumpkinseed, Rock Bass, Yellow Perch, Black Crappie, Bullhead, Largemouth Bass |
| Off the dock (7–16m) | Common Carp, Smallmouth Bass, Chain Pickerel, Rainbow Trout, Brown Trout, Walleye, Channel Catfish |
| Deep (17–25m) | Northern Pike, Golden Koi, Muskellunge, Flathead Catfish, Striped Bass, Mirror Carp |
| Beyond the sandbar (26m+) | Lake Sturgeon, Wels Catfish, Ancient Carp, Moonfish |

Rarity runs common → uncommon → rare → epic → legendary → mythic, and rarer fish are worth
far more per pound.

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

- Species table (points, size, strength, `dist` depth): `SPECIES` at the top of `main.js`.
- Gear tiers and prices: the `RODS`, `LINES` and `BAITS` arrays.
- Fight difficulty: `fightSetup()` — `demand` vs `supply` sets both the band width and the
  needle speed in one ratio.
- Tension/reel feel: the `reeling` block inside `animate()`.
- Fish prices: `fishValue()`.
- Walkable area: `groundAt()` — return `null` to block a spot; `SHOP_POS` / `MARKET_POS`
  are the two stalls.
- Cast range: `landingPoint()`; rod pose angles: the `DIR_*` vectors.
- Water colours and bands: `waterMat` shader.
