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
| **Pinewater Isle** | 10 | 5–8 | Tall spruce, mossy terraces, working timber waterwheel | 20 |
| **Sunscar Atoll** | 25 | 9–12 | Palms, coral, sandstone sun gate | 20 |
| **Frostfall Isle** | 45 | 13–16 | Snow-capped pines, icebergs, frozen watchtower | 20 |
| **Emberforge** | 65 | 17–20 | Basalt, glowing lava, smoking volcano, floating embers | 20 |
| **Moontide Sanctum** | 90 | 21–24 | Luminous moon gate, amethyst-colored stone, drifting lights | 20 |

Each island has **five separate stalls**: Rod Works, Line & Spool, Bait Shack,
Fish Market, and Boat Shop & Voyages. Each of the three gear vendors stocks only
**four local tiers**, not the entire ladder. Follow the paths and approach the
counter; **E** opens the nearest stall. Shop buttons never overlap.

Catch XP unlocks island licenses. Coins buy equipment and boats. There are no tolls,
consumable bait charges, or boat fuel costs. You can always return to an earlier island
once you have an appropriate boat. The sea chart shows the exact missing requirement.

**Wider island milestones · v27:** licenses now require levels **1 / 10 / 25 / 45 /
65 / 90**, with gaps of **9 / 15 / 20 / 20 / 25 levels**. Every gap is larger than the
previous 4 / 7 / 10 / 13 / 15. Boat licenses use the same milestones. This level-gate
update did not change XP rewards, the XP curve or shop prices. Existing earned licenses
are retained, even for destinations not yet visited; only future unlocks use the new gates.

### Boats and travel

| Boat | Level | Priciest departure gear | Boat price | Farthest destination |
| --- | ---: | ---: | ---: | --- |
| Harbor Skiff | 1 | — | Free | Home harbor |
| Pinewood Dinghy | 10 | Reedhaven · 360c | 550c | Pinewater |
| Sunrunner | 25 | Pinewater · 2,500c | 4,500c | Sunscar |
| Frostbreaker | 45 | Sunscar · 17,000c | 22,500c | Frostfall |
| Cinderwake | 65 | Frostfall · 70,000c | 130,000c | Emberforge |
| Astral Voyager | 90 | Emberforge · 147,000c | 320,000c | Moontide |

**Next-voyage premium · v29:** each next-island boat costs **at least 25% more than
any rod, line or bait sold on the island you are leaving**. The price floor is derived
from the actual local stock, not an unrelated fixed minimum. The remaining premium
keeps later saving goals progressive. Prices remain fixed for everyone, and an owned
boat never needs to be bought again. The starter skiff stays free.

These are saving goals of roughly **12 / 21 / 29 / 36 / 44 landed-and-sold fish**
using the **departure island's top local bait**. Boats are not priced against the
better fish that remain locked on their destination island.

Open **M** anywhere to study the sea chart. To purchase/equip a boat or depart, visit a
physical Boat Shop. Choose a destination and sail. Crossings are **automatic, animated
voyages**, not free-steering boat controls, and can be skipped. Routes navigate around
islands using a visibility graph rather than cutting straight through land. Arrival
places you safely on the destination's fishing pier. Water is not walkable.

### Fish selection and gear

**Current island + equipped bait** determine the eligible fish pool. Cast charge
adjusts luck within that pool; it never unlocks another island's fish or bypasses
the bait's rarity window and minimum species-size filter. Longer rods do not add
extra eligibility or luck beyond the same charge-based bonus.

The local bait shop and tackle bag show how many local species each bait can attract.
If a bait has no valid fish here, casting is blocked with an explanation—there is no
silent fallback to an incorrect species. Every local bait has at least one local fish,
and the previous island's top bait works when arriving on the next island.

- **Rods:** cast reach, reel speed, and control. Bamboo Pole → Mythril Rod.
- **Lines:** weight rating and reduced strain. Cotton Twine → 1900lb Mythril.
- **Bait:** rarity window, minimum species size, luck, and a gentle weight bonus. Garden Worm → Moonbait.
- **Tackle bag (I):** equip any already-owned tier from anywhere. It cannot buy remote stock.

Some collection entries reward revisiting an island with a different bait. For example,
Pinewater's Golden Koi requires a legendary-capable bait from a later island; Sunscar's
American Eel takes an earlier uncommon-capable bait. Keep your old tackle!

### Cast power and luck · v30

Charge now contributes **−10 to +10 percentage points** to equipped bait luck:

| Released cast power | Luck adjustment |
| --- | ---: |
| Minimum · 0% | −10 points |
| 25% | −5 points |
| Halfway · 50% | No adjustment |
| 75% | +5 points |
| Full · 100% | +10 points |

The change is linear, additive and capped: +30% bait luck becomes +20% at minimum
charge or +40% at full charge. Even starter bait responds (−10% to +10% effective
luck); these are weighting bonuses, **not catch probabilities**. The live charge
meter shows the modifier, and a successful release locks it until the next cast.
Failed casts never replace it, and the modifier is not stored as a permanent upgrade.

Effective luck controls the existing eligible-fish rarity weights, specimen-weight
bias and bite wait. It does not change species eligibility, the separate bait weight
bonus, prices, or saves. Each rod has the same −10/+10 limits; absolute metres do not
stack another bonus on top. The economy audit uses neutral 50% charge by default.

**Reeling progress has no cast-power or distance factor.** For the same rod and time
spent in green, minimum- and full-power casts reel at exactly the same rate. Fish
strength, weight and player control can still make individual fights feel different.
The bobber's outward flight time still reflects how far it travels.

### Clearer bait luck upgrades · v29

Every upgrade's luck gap is **one percentage point larger** than before: early bait
now goes **0% → 3% → 7% → 11%** instead of 0% → 2% → 5% → 8%. Later gaps rise smoothly
to 5–6 points, with Moonbait reaching a **+113% luck bonus**. All paid bait has more
luck, while starter worms are unchanged. The shop and tackle bag show the actual
bonus and the difference from your equipped bait.

Luck is a **relative weighting modifier**, not a literal catch percentage or a
guaranteed rare fish. It favors rarer fish only within the bait's existing eligible
pool; island, rarity and species-size restrictions do not change. Its existing bite
speed and weight-bias effects still apply. The separate half-point-per-tier weight
bonus, gear prices, island levels and already-owned items are unchanged.

### Slightly heavier catches · v28

Every bait upgrade adds **0.5 percentage points** to its maximum rolled-weight bonus:
Garden Worm **0%**, Bread Ball **up to +0.5%**, Salmon Egg **up to +3.5%**, and Moonbait
**up to +11.5%**. This is a small extra benefit on top of bait's existing luck-based
weight bias. The bait shop and tackle bag show the bonus and upgrade comparison.

The bonus tapers as a fish approaches its species' natural maximum, rather than
clamping many rolls into identical maximum-size trophies. Fish stay within their
species' weight range. Better bait yields slightly heavier fish **on average**, not
a guaranteed heavier fish on every catch. The species-size filter uses a species'
maximum possible weight, not a guaranteed minimum catch weight.

Only **new catches with the equipped bait** receive the boost. Switching back to a
lower tier lowers the bonus immediately; already-caught fish, saved records and coins
are not rewritten. The weight update did not change island/bait exclusivity, prices,
or sale/XP formulas.
Heavier catches naturally earn a little more through the existing formulas. The income
audit includes the new weights and still passes the established saving-goal limits.

### Shop price balance · v26

**Every paid gear tier and boat costs more than in v25.** Prices are fixed defaults,
not an inflation system tied to your wallet or level. The starter kit remains free.
The first paid rod is **100c** (about six starter catches), line **80c**, and bait **140c**.

Rod prices follow a smooth geometric curve between island milestones. Line costs
approximately **80% of the same-tier rod**, and permanent bait approximately **140%**,
rounded to readable coin amounts. Gear prices strictly increase; no consecutive paid
gear tier jumps by more than 75%. The increase eases toward the top of the ladder
instead of flattening out and then spiking.

| Island's highest local tier | Rod | Line | Bait |
| --- | ---: | ---: | ---: |
| Reedhaven · tier 4 | 260c | 210c | 360c |
| Pinewater · tier 8 | 1,800c | 1,450c | 2,500c |
| Sunscar · tier 12 | 12,000c | 9,600c | 17,000c |
| Frostfall · tier 16 | 50,000c | 40,000c | 70,000c |
| Emberforge · tier 20 | 105,000c | 84,000c | 147,000c |
| Moontide · tier 24 | 180,000c | 144,000c | 252,000c |

Prices are checked against fish available with the **previous bait on the shop's
island**, not income from the upgrade you cannot yet afford. Expected individual
saving goals are roughly **5–20 catches for rods, 4–16 for lines, and 7–28 for bait**.
A new island's better income provides some breathing room before its later upgrades.
These are successful, landed-and-sold catches with suitable tackle—not guaranteed
catch attempts or elapsed time. Species luck and specimen sizes still vary.

**The v26 price rebalance left fish sale values, gear stats, XP, saved coins and
existing ownership unchanged.** Old purchases are never charged again; re-equipping owned gear and
boats remains free. Displayed prices are the exact prices charged, and unaffordable
buttons show the shortage. Run `npm run economy` for the full tier-by-tier income audit.

### XP and the field guide

Every landed fish awards XP, with more for later-island fish, higher rarity, and larger
specimens. A **new species awards a 50% discovery XP bonus**. Selling does not award XP.
The level meter and next island milestone are always visible. Total XP for level `L` is
`90 × (L−1) + 22 × (L−1)²`; levels cap at 99. The final island requires level 90.

The **fish index (F)** contains all 120 numbered entries. Entries stay grouped by
island and sort **Common → Uncommon → Rare → Epic → Legendary → Mythic** within
each island, including when filters are applied. Original entry numbers and saved
discoveries are unchanged; tied rarities keep their original number order.

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

Progress is saved to this browser and site origin under **`reel-deal-save-v8`**:
coins, gear, boats, XP, earned licenses, island, visited islands, bag, best catch, discoveries, and the
latest 200 catches. There are no accounts or cross-device/cloud saves.

The v7 key (`reel-deal-save-v7`) migrates automatically, keeping exact XP, coins,
owned items, current island and visited history. Licenses earned under the old levels
are saved permanently, so the wider gaps never lock returning players out. The next
unearned license still requires its new level; migration never boosts a v7 player's
XP or unlocks additional islands. The chart labels below-level licenses **RETAINED**.

Both v6 keys (`reel-deal-save-v6` and `reel-life-3d-save-v6`) also migrate automatically:

- Coins, equipped/owned gear, bag, best fish and catch count are retained.
- Discoveries are reconstructed from the saved log, bag and best catch.
- Returning veterans receive XP and a boat appropriate to their highest already-owned
  gear chunk using the original milestones; their earned licenses are then retained.
  Previously earned equipment does not become stranded behind a new gate.
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

Cache stamps are currently **`v=30`** in the HTML and module imports. Bump the corresponding
stamps when changing a cached module. Render's blueprint also sends `Cache-Control: no-cache`.

## Testing

`npm test` checks 144,000 seeded fish draws, all-species reachability, local bait pools,
gear locations, smooth price growth, catch-income budgets, increasing island sale
values, XP thresholds, wider level gaps, matching boat licenses, both travel gates,
retained v7 access, one-time save migration, persistent discoveries, and malformed
save handling. Weight tests cover every species and bait tier, bounded bonuses,
strictly heavier averages after display rounding, and unchanged saved catches. Luck
tests check every widened gap, improved rare-fish weighting and the actual picker.
Cast/index tests cover the −10/0/+10 luck scale, strict pools at every power,
cast-adjusted weights/income, and non-mutating island/rarity ordering across filters.
Economy tests also compare prices to published baselines, enforce every next-voyage
boat premium against all local stock, and verify that ownership and coins are preserved.

`npm run economy` prints the deterministic income estimates and saving goals for
every gear tier and boat, including the local gear ceiling and boat premium, using
fixed weight quantiles rather than lucky random runs. These targets assume neutral
50% cast power; `expectedCatchIncome` also accepts cast power for targeted audits.

Optional browser tests exercise all **69 paid gear purchases and five boat purchases**,
including one-coin-short rejection, displayed-versus-charged prices and free re-equips.
They also cover all five new level boundaries, retained old-save access, displayed
bait bonuses and actual equipped-bait hook weights, index order across all filters,
locked cast-luck snapshots, identical green reeling rates at every cast power, and
yellow stalls. The real cast/hook/tension/catch/sale loop, all 30 sailing routes,
old-save boot, and mobile controls are also covered:

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
| `tests/` | Pure logic, economy and optional browser regression suites |
| `scripts/economy.mjs` | Deterministic tier/boat pricing audit (`npm run economy`) |

The world uses merged vertex-colored cuboids, instanced particles, simple lighting,
no shadow pass and reduced-detail distant islands. Resolution adapts on slow devices.
Fish materials are disposed after encounters instead of accumulating in GPU memory.
