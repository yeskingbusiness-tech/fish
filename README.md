# Reel Life 3D 🎣

A cozy little 3D fishing game that runs in the browser. Cast off the dock, wait for a
bite, strike at the right moment, and fight the fish back in without snapping your line.

![genre](https://img.shields.io/badge/genre-casual%20fishing-0ea5b7) ![three.js](https://img.shields.io/badge/three.js-r160-black)

## Play

```bash
npm start          # serves on http://localhost:3000
```

No build step, no dependencies to install — three.js is vendored in `vendor/`.
(Any static file server works: `python3 -m http.server`, `npx serve`, etc.)

## How to fish

| Action | Control |
| --- | --- |
| Aim | Move the mouse left / right |
| Charge a cast | Hold left click (or hold Space) |
| Cast | Release |
| Strike a bite | Click / Space while the bobber dips |
| Reel in | Hold click / Space |
| Orbit the camera | Right-drag |

The reel minigame is all about **line tension**: holding the reel winds the fish in but
raises tension, letting go drops it. Keep the needle in the green zone to make progress —
push into the red and the line snaps. Bigger/rarer fish pull harder and surge more often.

## What's in the lake

Seven species, from the humble Bluegill to the legendary Ancient Carp, each with its own
size range, fighting strength, and point value. Your catch log (top-right book icon)
tracks everything you've landed — it is saved to `localStorage`, so your score survives a
reload. Use **Reset** in the log to start a fresh session.

| Fish | Rarity | Points |
| --- | --- | --- |
| Bluegill | common | 10 |
| Yellow Perch | common | 15 |
| Largemouth Bass | common | 30 |
| Rainbow Trout | uncommon | 40 |
| Channel Catfish | uncommon | 55 |
| Golden Koi | rare | 120 |
| Ancient Carp | legendary | 250 |

## Project layout

```
index.html   markup + HUD
style.css    all UI styling (glassy HUD, reel panel, catch cards)
main.js      game code: three.js scene, water shader, state machine, audio
serve.js     tiny zero-dependency static server
vendor/      three.js r160 module
```

Everything is procedural — the water is a custom shader, ripples/splashes are generated
particles, fish are built from primitives, and all sound effects are synthesized with the
Web Audio API. There are no image or audio assets to load.

## Tweaking

- Species table, point values, fight strength: top of `main.js`.
- Tension/reel balance: the `reeling` block inside `animate()`.
- Cast range: `releaseCast()`.
- Water colours and sparkle: `waterMat` shader.
