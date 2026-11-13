# Reel Life 3D — blocky first-person fishing

A cozy little **first-person** fishing game in the browser. Everything is built from
boxes: the lake, the dock, the fish, even the UI. Walk the dock and the shore, cast from
wherever the water is, wait for the bobber to dip, strike, then fight the fish in without
snapping your line. Sell your catch at the tackle shop and spend the coins on better rods.

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
| Open the shop | **E** when the Tackle Shop button appears |
| Release the cursor | Esc |

Touch: the on-screen stick walks, drag anywhere else to look, hold still to charge and
release to cast, tap to strike or reel in.

You can walk the length of the pier and along the shore; the grass and the planks are
solid, the water is not. From the pier, follow the dirt path to the **Tackle Shop**.

### The fight

The reel minigame is all about **line tension**, and it does not forgive:

- Holding winds the fish closer and pushes the needle up fast; letting go drops it fast.
- **Snap**: sit above 96 for a third of a second and the line goes — no fish, no coins.
- **Slack**: leave the needle under 14 for two seconds and the fish spits the hook.
- Every fish **surges** at random: the needle rockets while it runs. Ease off before you
  are in the red, not after.
- Bigger fish climb the needle faster and surge harder; better rods hold the line
  steadier and crank the fish in quicker. Holding the button down and hoping will lose
  the fish in a couple of seconds — a Bluegill takes ~11s of good reeling, an Ancient Carp
  takes nerve.

## The shop

Stand near the stall on the shore and the **Tackle Shop** button appears (or press **E**).
Two tabs:

- **Rods** — five tiers, from the free Bamboo Pole to the Mythril Rod. Each shows its cast
  range, reel speed and how twitchy it is on the line. Owned rods can be re-equipped any
  time; new ones cost coins.
- **Sell Fish** — every catch goes into your bag instead of vanishing. Sell them one at a
  time or all at once. A fish is worth more the heavier it is, and rarer species are worth
  far more.

| Rod | Cost | Cast | Reel | Line |
| --- | --- | --- | --- | --- |
| Bamboo Pole | free | 15m | 0.85× | hard |
| Fiberglass Rod | 160c | 18m | 1.00× | normal |
| Carbon Rod | 480c | 21m | 1.15× | easy |
| Pro Carbon | 1200c | 24m | 1.32× | forgiving |
| Mythril Rod | 3000c | 27m | 1.50× | forgiving |

## What's in the lake

Seven species, from the humble Bluegill to the legendary Ancient Carp, each with its own
size range, fighting strength and point value. The catch log (top-right book icon) tracks
everything you land. Coins, owned rods, your bag and the log are saved to `localStorage`
(key `reel-life-3d-save-v4`), so progress survives a reload — use **Reset** in the log
drawer to wipe coins, rods and catches.

| Fish | Rarity | Points |
| --- | --- | --- |
| Bluegill | common | 10 |
| Yellow Perch | common | 15 |
| Largemouth Bass | common | 30 |
| Rainbow Trout | uncommon | 40 |
| Channel Catfish | uncommon | 55 |
| Golden Koi | rare | 120 |
| Ancient Carp | legendary | 250 |

## Built to run light

The scene is deliberately cheap so it holds 60fps on modest hardware:

- **~60 draw calls / ~26k triangles** for the whole lake. Every box shares one
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
main.js      three.js scene, water shader, state machine, audio
serve.js     tiny zero-dependency static server
vendor/      three.js r160 module
```

## Tweaking

- Species table, points, fight strength: top of `main.js`.
- Rod tiers (cost, cast range, reel speed, line tension multiplier): the `RODS` array near
  the top.
- Tension/reel balance: the `reeling` block inside `animate()`.
- Fish prices: `fishValue()`.
- Walkable area: `groundAt()` — return `null` to block a spot; `SHOP_POS` is the stall.
- Cast range: `landingPoint()`; rod pose angles: the `DIR_*` vectors.
- Water colours and bands: `waterMat` shader.
