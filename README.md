# Reel Deal 3D — The Archipelago

A first-person, cube-built fishing adventure. **Six explorable islands, 120 fish,
three 24-tier gear ladders, six boats, and a persistent fish index.** Walk the docks
and villages, sell your catches, earn island licenses, and sail to better waters.

Everything in the world is made from cuboids: islands, trees, fish, boats, vendors,
landmarks, clouds, snow, even the square ripples. No model downloads, external fonts,
image services, build step, or runtime dependencies. Three.js is vendored.

## Run

```sh
npm start                 # http://localhost:3100
PORT=3000 npm start        # alternate port; binds 0.0.0.0 for hosted previews
npm test                  # dependency-free data/progression/save regression tests
```

Node 18 or newer. Any static HTTP server also works; opening `index.html` as `file://`
does not support the module imports.

## The six islands

| Island | Level | Local gear tiers | Landmark / character | Fish |
| --- | ---: | --- | --- | ---: |
| **Reedhaven** | 1 | 1–4 | Reed beds, a striped lighthouse, sunny fishing village | 20 |
| **Pinewater Isle** | 5 | 5–8 | Tall spruce, mossy terraces, working timber waterwheel | 20 |
| **Sunscar Atoll** | 12 | 9–12 | Palms, coral, sandstone sun gate | 20 |
| **Frostfall Isle** | 22 | 13–16 | Snow-capped pines, icebergs, frozen watchtower | 20 |
| **Emberforge** | 35 | 17–20 | Basalt, glowing lava, smoking volcano, floating embers | 20 |
| **Moontide Sanctum** | 50 | 21–24 | Luminous moon gate, amethyst-colored stone, drifting lights | 20 |

Each island has **five separate stalls**: Rod Works, Line & Spool, Bait Shack,
Fish Market, and Boat Shop & Voyages. Each of the three gear vendors stocks only
**four local tiers**, not the entire ladder. Follow the paths and approach the
counter; **E** opens the nearest stall. Shop buttons never overlap.

Catch XP unlocks island licenses. Coins buy equipment and boats. There are no tolls,
consumable bait charges, or boat fuel costs. You can always return to an earlier island
once you have an appropriate boat. The sea chart shows the exact missing requirement.

### Boats and travel

| Boat | Level | Price | Farthest destination |
| --- | ---: | ---: | --- |
| Harbor Skiff | 1 | Free | Home harbor |
| Pinewood Dinghy | 5 | 150c | Pinewater |
| Sunrunner | 12 | 1,800c | Sunscar |
| Frostbreaker | 22 | 12,000c | Frostfall |
| Cinderwake | 35 | 45,000c | Emberforge |
| Astral Voyager | 50 | 120,000c | Moontide |

Open **M** anywhere to study the sea chart. To purchase/equip a boat or depart, visit a
physical Boat Shop. Choose a destination and sail. Crossings are **automatic, animated
voyages**, not free-steering boat controls, and can be skipped. Routes navigate around
islands using a visibility graph rather than cutting straight through land. Arrival
places you safely on the destination's fishing pier. Water is not walkable.

### Fish selection and gear

**Current island + equipped bait** determine the fish pool. Cast distance never
selects a species, and fishing from one island cannot summon another island's fish.
Every bait keeps its strict rarity window and minimum species-size filter. Luck
weights the rarer species inside that valid pool; it never bypasses the limits.

The local bait shop and tackle bag show how many local species each bait can attract.
If a bait has no valid fish here, casting is blocked with an explanation—there is no
silent fallback to an incorrect species. Every local bait has at least one local fish,
and the previous island's top bait works when arriving on the next island.

- **Rods:** cast reach, reel speed, and control. Bamboo Pole → Mythril Rod.
- **Lines:** weight rating and reduced strain. Cotton Twine → 1900lb Mythril.
- **Bait:** rarity window, minimum species size, and luck. Garden Worm → Moonbait.
- **Tackle bag (I):** equip any already-owned tier from anywhere. It cannot buy remote stock.

Some collection entries reward revisiting an island with a different bait. For example,
Pinewater's Golden Koi requires a legendary-capable bait from a later island; Sunscar's
American Eel takes an earlier uncommon-capable bait. Keep your old tackle!

The existing strictly increasing gear prices are retained: the first rod is **50c**,
the first line **40c**, and the first bait **80c**. Tier 24 costs **61,000c / 48,000c /
95,000c** respectively. Higher-island fish have progressively greater median sale
values, with an island premium added to the rarity and specimen-size calculation.
Displayed prices are the exact prices charged. Unaffordable buttons show the shortage.

### XP and the field guide

Every landed fish awards XP, with more for later-island fish, higher rarity, and larger
specimens. A **new species awards a 50% discovery XP bonus**. Selling does not award XP.
The level meter and next island milestone are always visible. Total XP for level `L` is
`90 × (L−1) + 22 × (L−1)²`; levels cap at 99. The final island requires level 50.

The **fish index (F)** contains all 120 numbered entries:

- Undiscovered fish have an **opaque dark silhouette and `???`**, with no species name,
  colors, rarity, description, tooltip, or accessible-label spoiler in the entry markup.
- Land a fish to reveal its name, colors, rarity, home island, story, catch count, and
  personal-best weight. Hooking or losing it is not enough.
- Filter by island and discovered/undiscovered status. Expand a discovered entry for details.
- Selling fish or trimming the recent catch log **never removes discoveries**.

The full spoiler roster is in **[FISH_ROSTER.md](FISH_ROSTER.md)**.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Walk / jog | WASD or arrows / Shift | On-screen stick |
| Look | Mouse; click canvas to capture | Drag the scene |
| Charge and cast | Hold click or Space, then release | Hold still, then release |
| Hook a bite | Click / Space | Tap |
| Raise tension | Hold click / Space | Hold |
| Lower tension | Release | Release |
| Interact at a stall | E or its on-screen button | Tap its button |
| Sea chart / boats | M | Sea chart button |
| Fish index | F | Fish index button |
| Owned tackle | I | Tackle bag button |
| Close panel / release cursor | Escape | Close button / backdrop |

If pointer lock is unavailable, **drag with the mouse to look**; this still supports a
full turn. Touch joystick releases cannot accidentally cast or hook a fish. Menus
block movement/casting, support keyboard focus, and close with Escape. Fish encounters
must finish before opening another panel. Hidden browser tabs pause the simulation.

### The tension fight

The rule is unchanged: **green auto-reels, yellow stalls, red immediately loses the fish**.
Holding raises the needle; releasing lowers it. Random surges and yanks keep it active.
Better rods and lines widen the safe band and reduce strain; an overloaded line makes
the fight harder. Unknown fish remain unidentified in the reel HUD until landed.

## Save compatibility

Progress is saved to this browser and site origin under **`reel-deal-save-v7`**:
coins, gear, boats, XP, island, visited islands, bag, best catch, discoveries, and the
latest 200 catches. There are no accounts or cross-device/cloud saves.

Both old keys (`reel-deal-save-v6` and `reel-life-3d-save-v6`) migrate automatically:

- Coins, equipped/owned gear, bag, best fish and catch count are retained.
- Discoveries are reconstructed from the saved log, bag and best catch.
- Returning veterans receive XP and a boat appropriate to their highest already-owned
  gear chunk, so previously earned equipment does not become stranded behind a new gate.
- Old keys are removed **only after** the new save is successfully written.

The catch log's **Reset** button asks for confirmation before clearing progress. Storage
failures show a warning instead of silently pretending the session was saved.

## Deploy to Render

Use a **Static Site**—no server or build is necessary:

1. Push this branch to GitHub.
2. Render → **New + → Static Site**, select this repository.
3. Select the branch **containing this update**. Use `arena/ac060c44-fish` until its work
   has been merged into `main`; selecting an older `main` will not deploy these changes.
4. **Build Command:** leave empty. **Publish Directory:** `.`.
5. Create/deploy the site. `render.yaml` also supports deployment as a Blueprint.

Alternatively, a Node Web Service can use `npm install` / `npm start`; `serve.js` honors
Render's `PORT`. Static hosting avoids the need for a running Node process.

For other static hosts, deploy `index.html`, `style.css`, `main.js`, **all four `.mjs`
modules**, and `vendor/`. Every browser-facing path is relative and every dependency is
local. `.mjs` must be served as JavaScript (already handled by `serve.js`).

Cache stamps are currently **`v=25`** in the HTML and module imports. Bump the corresponding
stamps when changing a cached module. Render's blueprint also sends `Cache-Control: no-cache`.

## Testing

`npm test` checks 144,000 seeded fish draws, all-species reachability, local bait pools,
gear locations/cost monotonicity, increasing island sale values, XP thresholds, both
travel gates, old-save migration, persistent discoveries and malformed save handling.

Optional browser tests exercise the real WebGL game, all 18 vendors, actual
cast/hook/tension/catch/sale, all 30 sailing routes, old-save boot, and mobile controls:

```sh
# Use an installed Chromium/Chrome:
npm install --no-save playwright-core
CHROMIUM_PATH=/path/to/chrome npm run test:browser

# Or install @sparticuz/chromium as well on a compatible Linux system.
# Override TEST_URL if the game is not served on port 3100.
```

Screenshots go to `.artifacts/` (ignored by Git). The optional test dependencies are not
required to run or deploy the game.

## Project layout

| File | Purpose |
| --- | --- |
| `main.js` | Fishing, input, UI, shops, collection, voyage playback, saves |
| `game-data.mjs` | 120 species, 72 gear tiers, fish pools, prices and weight rolls |
| `archipelago.mjs` | Island / boat definitions, XP and travel requirements |
| `world.mjs` | Merged cube terrain and props, collision, distant-island LOD, sea routing |
| `save-state.mjs` | Validated save normalization and legacy migration |
| `index.html`, `style.css` | Responsive HUD, chart, index and shop panels |
| `serve.js`, `render.yaml` | Zero-dependency local server / static hosting blueprint |
| `tests/` | Pure logic and optional browser regression suites |

The world uses merged vertex-colored cuboids, instanced particles, simple lighting,
no shadow pass and reduced-detail distant islands. Resolution adapts on slow devices.
Fish materials are disposed after encounters instead of accumulating in GPU memory.
