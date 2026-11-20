# Reel Deal 3D · Open Water

**20 unique cube-built islands · 400 collection entries · 12 rarities · 8 manually driven boats.**

The environment, shops, boats and basic angler are cuboid-built. **The fish are not cubes:** anatomical sculpts, fins, jaws, tails, shells, legs and tentacles also generate their matching illustrated thumbnails.

Version **2.3.0**, browser cache **v44**, save schema **v9**, world layout **2**. Static browser game; no build, account, backend or runtime dependency installation required.

## Run

```sh
npm start                 # http://localhost:3100
npm test                  # dependency-free Node regression tests
npm run economy           # deterministic purchase-effort audit
npm run progression       # deterministic repeat-catch XP audit
```

The development server binds `0.0.0.0`, serves `.mjs` with module MIME types, and works through preview proxies. For static hosting publish the repository root; `render.yaml` is included. Three.js is vendored locally. Keep all root `.mjs` files with `main.js`, `index.html`, `style.css` and `vendor/` when deploying.

## Explore under your own power

- Choose **Board boat / Return to boat** on the HUD, or press **R**, from anywhere while idle. No chart or walk to a shop is needed. The Harbor Skiff is free.
- This teleports **you to your own parked boat**, not the boat to you and not to a selected island. Its position and heading persist while you walk around or reload. Finish any cast/fight and close panels first.
- **W/S** accelerates/reverses; **A/D** steers. Touch uses the joystick. All hulls turn **20% faster** than v41.
- The helm camera sits low above the hull/canopy and looks **beyond the bow toward the horizon**, rather than down at the boat. Fishing and trophy cameras retain their own behavior.
- **Q / Stop & fish** stops the engine. While stopped, use **WASD / joystick to walk around the deck** without moving the hull; the deck boundary keeps you aboard. Q again returns you to the helm. Boats cannot move during a cast or fight.
- **E / Dock** disembarks when close to an unlocked island's berth. Shops and markets require walking up to their actual counters; no remote selling from the water.
- The **minimap** shows heading, territory boundaries, rotated land/docks, your parked boat and a waypoint. Click it or press **M** for the full north-up chart. Choose a numbered island to read its name/details, mark a destination and steer there yourself. The chart no longer has a rectangular grid or a snake-route line.
- Entering a new island's surrounding water displays its name and environment briefly.
- There is **no automatic sailing, skip-crossing button or boat-range gate**. Every boat, including the starter, can reach every level-unlocked territory.
- Territories have a **300 m radius**, up from 110 m: **7.44× the area**. The twenty fixed, irregular positions never reshuffle on reload; open corridors separate even the largest hull from still-locked borders.
- Locked territories have **invisible circular collision barriers** extending through the water column. Swept movement prevents high-speed tunnelling. Land, docks, icebergs and the outer sea edge also block boats.
- Eight optional vessels increase in **size and top speed**, not access. The larger physical footprint needs more space around shore. Boat prices are independent of local gear; the former “required boat / 130% entry gear” pricing relationship no longer applies.

### Shore luck

The shore penalty is **−95% within 6 world metres** of terrain/docks/solid reef or ice obstacles. It eases linearly to **no penalty at 48 metres**, within the surrounding territory. The full penalty remains unchanged, but its distance band is slightly smaller than v41. Physical sand shelves are also a little narrower (58 × 46 m instead of 60 × 48 m for the main shelf). This penalty multiplies the entire luck factor, so expensive bait cannot cancel it while standing on the pier.

Luck is sampled at the **angler's position on cast release**, not the bobber's landing point. A long shore cast does not bypass it. Shore fishing remains possible, but rarer fish, specimen weight and bite timing favor heading offshore. The final all-Unfathomable territory still has the weight/timing effect. Between territories, cruise into an unlocked territory before casting.

## The twenty territories

Each has **20 numbered entries, two rods, two lines and two baits**. That's **40 of each equipment category**, with meaningful control and luck jumps rather than four small local steps. Premium local bait keeps the entire local rarity range; no hidden weight gate excludes small species.

| # | Island | Level | Environment / landmark |
| --- | --- | --- | --- |
| 01 | Reedhaven | 1 | Freshwater lake · striped lighthouse, reeds |
| 02 | Pinewater Isle | 10 | Forest lakes and streams · timber mill and working waterwheel |
| 03 | Ironwood River | 20 | River cliffs and waterfalls · stone aqueduct |
| 04 | Brackwater Marsh | 35 | Swamp · root cathedral, cypress, hanging moss |
| 05 | Sunscar Atoll | 50 | Tropical lagoons · sandstone sun gate, palms |
| 06 | Coralreach | 65 | Reefs · branching coral crown and reef gardens |
| 07 | Breaker Coast | 80 | Rocky coast · sea stacks and broken stone arch |
| 08 | Stormbreak Isles | 100 | Stormy open water · copper beacon and rain |
| 09 | Thornwild Delta | 120 | Jungle rivers · stepped overgrown ruin |
| 10 | Emberforge | 140 | Volcanic water · cinder peak and luminous lava seams |
| 11 | Frostfall Isle | 160 | Frozen freshwater · snow pines and Icewatch |
| 12 | Skyglass Fjord | 180 | Glacial ocean · tall glacier walls and icebergs |
| 13 | Shattered Shelf | 200 | Deep canyon · fractured slate spires |
| 14 | Leviathan's Grave | 225 | Wrecks and ancient bones · broken ship inside giant ribs |
| 15 | Ashen Trench | 250 | Volcanic deep sea · hydrothermal black smokers |
| 16 | Moontide Sanctum | 275 | Ancient temples · luminous moon gate |
| 17 | Starfall Basin | 300 | Celestial water · fallen stellar orrery |
| 18 | The Null Trench | 325 | Otherworldly abyss · split obsidian monoliths |
| 19 | Eternity's Reach | 350 | Ancient cosmic ocean · enormous hourglass ruin |
| 20 | Origin's End | 400 | Primordial ocean · first spring and concentric terraces |

Each island now has its own stepped voxel landform profile as well as its landmark: Reedhaven reedbanks; Pinewater split stream-knolls; Ironwood tiered falls; Brackwater mangrove pools; Sunscar a ringed lagoon; Coralreach branching reef towers; Breaker broken sea cliffs; Stormbreak basalt blades; Thornwild braided delta; Emberforge a caldera; Frostfall fractured ice shelves; Skyglass twin fjord walls; Shattered a canyon cleft; Leviathan's fossil ribs; Ashen chimney fields; Moontide temple terraces; Starfall a meteor crater; Null a split rift; Eternity pinched strata; and Origin concentric spring terraces. Big landforms are built from shrinking, offset cuboid layers—not smooth meshes or giant plain boxes. Water channels sit flush with the terrain, and all island scenery is merged into existing batched meshes.

**Every island has a distinct authored shop arrangement** too: docking orientation/berth side, pier offsets, paths, trees, lamps and landmark placement vary. Rendering, walking/boat collision, counter approaches, spawn points and map footprints use the same orthogonal transforms. Paths connect each counter to the pier without running through another stall. Roofs use local craft: timber, vines, coral, snow/icicles, forge chimneys or stone temple details.

## Collection and fishing

The exact authored order is **#001–#400** in [`FISH_ROSTER.md`](FISH_ROSTER.md); `collection-roster.mjs` is the runtime source. Duplicate names are distinct island entries with distinct save IDs.

| Rarity | Color | Islands |
| --- | --- | --- |
| Common | Gray | 1–2 |
| Uncommon | Green | 1–4 |
| Rare | Blue | 1–6 |
| Epic | Purple | 2–8 |
| Legendary | Orange | 4–9 |
| Mythic | Red | 6–11 |
| Exotic | Pink | 8–13 |
| Divine | Gold | 10–15 |
| Ancient | Brown | 12–17 |
| Celestial | Light blue | 14–19 |
| Transcendent | Rainbow | 16–19 |
| Unfathomable | Black | 20 only |

Unknown entries contain **no real name, silhouette, rarity, image metadata or anatomical outline**. They reveal only their number and territory. Filtered views retain the same numbers. Every completed island grants a permanent **+5% sale bonus**, additive to **+100%** for twenty rewards. Selling never erases discoveries.

Bait rarity windows and territory determine eligibility. Cast distance does not select species. Full power adds **+10 luck percentage points** and minimum power subtracts **10**, before the environmental penalty. Luck reweights only eligible species.

Hold click / Space and release to cast; click / Space on a bite to hook. During a fight, hold to raise tension and release to lower it. **Green reels automatically, yellow stalls, and either red end immediately loses the fish.** Calm/run/headshake phases are named and timed; sudden fish surges and dives get a large, animated, directional warning **before** the tug, then flash again while it happens. Green progress depends on reel speed, never charge, cast distance or shore penalty.

### Weights, sizing and rewards

- Weight ranges and maximum display spans are authored **per species**, not generated from island, rarity or progression. A cosmic fry can be tiny and an ordinary whale enormous.
- Heavier individuals of the **same species** look larger. Different species do not share one pounds-to-length curve. Body proportions remain anatomical; the camera backs up rather than shrinking genuine giants.
- Catch weights persist to **six decimal places**, so millipound fish never round down to zero. The HUD, Bag, index and market use readable precision.
- The expanded economy has an explicit **×0.85 default sale multiplier**. Collection bonuses apply afterward at sale time, including to fish already in the Bag.
- Future catch XP retains its explicit **×0.90 base multiplier**, then applies a **×1.20 leveling-speed boost** (net ×1.08 versus the earlier baseline), plus larger-specimen bonuses and the **one-time +50% discovery reward**. Higher-rarity local catches give better XP even when physically small.
- The original cumulative XP curve is extended to **level 400**. Existing coins and XP are never reduced. Audits budget actual repeat-catch pools and weight quantiles, not guaranteed discoveries or destination-only bait.
- Offshore audits exclude sailing time, missed catches and collection bonuses. Returning to the market and choosing an offshore spot add play time; the scripts do not claim fixed minutes per level.

## Bag, camera and controls

**B** opens the unified Bag: Fish / Rods / Lines / Bait. **I** opens the last owned-equipment tab. Owned tackle re-equips freely anywhere; new items are bought only at local stalls.

Choose **Hold** on a Bag specimen. It remains in the Bag until sold. **V** toggles front-facing third person; **X** puts the fish away. There are **no first-person arms or body**. Actual sculpt bounds, asymmetric trunk support and camera fitting accommodate rays, long tails, squid and whales on phones as well as desktop.

**? / Help** lists controls. **H / Hide HUD** clears the scene for screenshots; the first tap/click, H or Escape restores it without also casting. Dialogs trap focus and clear movement/joystick input. Bag tabs support arrows and Home/End. The Catch Log retains total catches, the best catch and recent history without building a hidden 200-row list every frame.

## Saved games

Saves use **`reel-deal-save-v9`**, local to this browser and site origin. The boat's parked position is independent of the player's current island. A sailing record additionally notes whether the player was aboard. Position is saved periodically while sailing, on boarding/docking, when the page is hidden and on page exit. Invalid or locked-water locations never waive a level gate.

The **`worldLayout: 2`** marker versions map coordinates separately from collection data. Existing v41 saves are validated against **frozen original grid geometry**, then converted relative to their saved island and its new orientation. If valid old water becomes new land, the sailor safely resumes at that island's new berth. Invalid locations recover at an accessible dock. Conversion is idempotent and does not reset money, XP, catches, equipment, licenses or earned bonuses.

Migration from v8/v7/v6 uses **frozen original definitions**, not the new catalog:

- Coins, existing XP, catch totals, records, earned licenses and completed-island rewards are preserved.
- Old islands map **by identity**: Sunscar → island 5, Frostfall → 11, Emberforge → 10, Moontide → 16.
- Four old local equipment tiers map into the two corresponding new tiers. Original ownership indices remain archived; no owned item is charged again.
- Old owned boats remain owned. They no longer impose an access limit.
- Original catches retain their original names and weights as **Legacy catches**—including removed fish and historical weights outside today's natural ranges. They remain viewable, holdable and sellable. They do not enter the new spawn pool.
- Matching new species retain discovery credit; duplicate names do not unlock multiple island entries accidentally.
- Completed-island bonuses stay permanent even if the new roster is incomplete. Completing that same island again does not double-award its reward.
- Original save keys are retained as recovery copies. Reset creates a clean v9 game and does not re-import those backups on reload.

## Geometry and performance

- Terrain, buildings and props are merged into **vertex-colored cuboid batches**, not one mesh per block. Identical sign materials are shared across islands. Far islands use reduced geometry; off-screen/distant detail is culled. No shadow pass or external models/textures are needed.
- `voxel-geometry.mjs` subtracts hidden and **partially overlapping coplanar faces before batching**. Neighboring blocks share edges, not coincident depth-fighting surfaces. Paths use unique grid cells. Trim, water sheets and signs have intentional depth separation. The sky is pinned behind world geometry to avoid far-plane clipping artifacts.
- Fish use **41 anatomical construction families**, selective glowing details and private batched GPU resources. Current + legacy sculpts are checked for finite triangles, complete concave triangulation and at most **6 draw calls / 4,500 triangles per catch**.
- Shared Blob-image thumbnails are generated lazily and reused across the index, Bag, market and log. Unknown fish never request their art. Closed/replaced panels cancel their observers.
- The CPU sculpt cache is limited to **32**, SVG-string cache to **64**; browsing 400 entries does not retain all face arrays. The per-species image URLs remain shared until page teardown.
- Adaptive resolution continuously responds to sustained load, with hysteresis and gradual recovery. It ignores menus and long interruptions, preserves reductions on resize and never changes simulation time or CSS/UI sharpness.
- Idle HUD values and empty particle pools do not update/upload every frame. The minimap updates at **5 Hz** with one small 2D canvas.

## Validation

```sh
npm test
npm run economy
npm run progression

# Optional real browser suite (game server must already be running):
npm install --no-save playwright-core
CHROMIUM_PATH=/path/to/chrome npm run test:browser
# Or add @sparticuz/chromium on a compatible Linux system.
# TEST_URL can override http://127.0.0.1:3100.
```

**134 Node tests** cover the full catalog, rarity availability, 800 bait/territory combinations, precise weights, reward multipliers and the 20% leveling boost, level gates, 40-tier equipment, save/map migration, transformed village plans and walkable boat decks, navigable routes around locked cylinders, persistent boat positions, swept boat collisions, shore luck, low helm/trophy camera fitting, coplanar face removal and performance utilities.

The current browser runner replaces the superseded automatic-voyage/four-tier fixtures. It exercises all **60 local equipment shops** plus every market/boatyard approach, full pier-to-counter walking connectivity, **160 boat/island berths**, exact purchases, all eight full-size hulls in the low camera, every level boundary, manual throttle/steering/docking, return-to-boat/save/reload, mobile controls, non-overlapping irregular chart targets and waypoints, real tiny-fish catches, red/yellow/green fights, one-time rewards, original-save migration, all **520 current/legacy GPU models**, all **400 production holding/camera paths**, twenty environment captures, accessible UI and continuous renderer adaptation.

Current screenshots and audit logs go to `.artifacts/navigation-v42/` (ignored by Git). In the twenty environment captures, the maximum was **28 draw calls / 29,916 triangles**; the expanded sea does not add mesh subdivisions. The idle HUD check still makes zero DOM mutations or empty-particle uploads over 30 frames. Software-GPU measurements are regression checks, not an FPS promise for every device.

## Rebalancing proposals

[`BALANCE_NOTES.md`](BALANCE_NOTES.md) records the earlier catch-effort audit and proposed gear/XP smoothing, optional boat trade-ins, species-relative trophy rewards and collection-streak protection. **Those proposals remain recommendations, not enabled mechanics.** The requested 20% leveling-speed boost was added in 2.2.0; prices, sales, natural fish sizes and collection rewards remain unchanged.

## Source map

| File | Responsibility |
| --- | --- |
| `collection-roster.mjs`, `FISH_ROSTER.md` | Exact authored collection, species weights and display spans |
| `island-data.mjs`, `island-layout.mjs`, `village-paths.mjs` | Destination order/levels, fixed irregular coordinates, authored village plans, transforms and counter paths |
| `game-data.mjs`, `archipelago.mjs` | Equipment, rarity/weight rolls, prices, XP, rewards and boats |
| `navigation.mjs`, `minimap.mjs` | Manual navigation, swept barriers, shore proximity and mini chart |
| `world.mjs`, `voxel-geometry.mjs` | Batched cube environments, face subtraction, collision and LOD |
| `fish-appearance.mjs`, `fish-geometry.mjs`, `fish-model.mjs` | Non-cuboid anatomy, shared illustrations and GPU rigs |
| `fish-icons.mjs`, `render-performance.mjs` | Lazy shared thumbnails, adaptive quality and idle-work caches |
| `player-view.mjs`, `ui-state.mjs` | Character, species-specific sizing, framing, Bag and Help rules |
| `legacy-v8-data.mjs`, `legacy-catalog.mjs`, `legacy-v41-world.mjs`, `save-state.mjs` | Frozen historical identities/map geometry, parked boats and explicit migration |
| `main.js`, `index.html`, `style.css` | Gameplay, controls, responsive panels and HUD |
