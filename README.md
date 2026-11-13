# Reel Life 3D — blocky first-person fishing

A cozy little **first-person** fishing game in the browser. Everything is built from
boxes: the lake, the dock, the fish, even the UI. Cast from the end of the pier, wait for
the bobber to dip, strike, then fight the fish in without snapping your line.

![genre](https://img.shields.io/badge/genre-casual%20fishing-0ea5b7) ![style](https://img.shields.io/badge/style-blocky-ef4056) ![three.js](https://img.shields.io/badge/three.js-r160-black)

## Play

```bash
npm start          # serves on http://localhost:3000
```

No build step and nothing to install — three.js is vendored in `vendor/`.
(Any static server works: `python3 -m http.server`, `npx serve`, …)

## How to fish

| Action | Control |
| --- | --- |
| Look around | Mouse (pointer lock — click to capture) |
| Charge a cast | Hold left click (or hold Space) |
| Cast | Release |
| Strike a bite | Click / Space when the bobber dips |
| Reel in | Hold click / Space |
| Release the cursor | Esc |

Touch: drag to look, hold still to charge and release to cast, tap to strike or reel in.

The reel minigame is all about **line tension**: holding winds the fish closer but raises
tension, letting go drops it. Keep the needle in the green to make progress — push into
the red and the line snaps. Bigger/rarer fish pull harder and surge more often.

## What's in the lake

Seven species, from the humble Bluegill to the legendary Ancient Carp, each with its own
size range, fighting strength and point value. The catch log (top-right book icon) tracks
everything you land and is saved to `localStorage`, so your score survives a reload — use
**Reset** in the log drawer to start a fresh session.

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

- **~60 draw calls / ~13k triangles** for the whole lake. Every box shares one
  `BoxGeometry`, and the clutter (rocks, reeds, lily pads, treeline, clouds, hills, splash
  particles) is drawn with `InstancedMesh`.
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
- Tension/reel balance: the `reeling` block inside `animate()`.
- Cast range: `landingPoint()`; rod pose angles: the `DIR_*` vectors.
- Water colours and bands: `waterMat` shader.
