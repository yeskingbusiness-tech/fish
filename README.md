# Reel Deal 3D — The Archipelago

A cube-built fishing adventure with first-person and front-facing third-person views.
**Six explorable islands, 120 fish, three 24-tier gear ladders, six boats, and a persistent fish index.** Walk the docks
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
| Astral Voyager | 90 | Emberforge · 255,000c | 320,000c | Moontide |

**Next-voyage premium · v29:** each next-island boat costs **at least 25% more than
any rod, line or bait sold on the island you are leaving**. The price floor is derived
from the actual local stock, not an unrelated fixed minimum. The remaining premium
keeps later saving goals progressive. Prices remain fixed for everyone, and an owned
boat never needs to be bought again. The starter skiff stays free.

These are saving goals of roughly **12 / 20 / 26 / 33 / 42 landed-and-sold fish**
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

The local bait shop and Bag → Bait show how many local species each bait can attract.
If a bait has no valid fish here, casting is blocked with an explanation—there is no
silent fallback to an incorrect species. Every local bait has at least one local fish,
and the previous island's top bait works when arriving on the next island.

- **Rods:** cast reach, reel speed, and control. Bamboo Pole → Mythril Rod.
- **Lines:** weight rating and reduced strain. Cotton Twine → 3400lb Mythril.
- **Bait:** rarity window, minimum species size, luck, and a gentle weight bonus. Garden Worm → Moonbait.
- **Bag → Rods / Lines / Bait (I):** equip any already-owned tier from anywhere for free. The bag cannot buy stock; visit a local vendor for new gear.

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

### Bait luck upgrades · v29 / v37

The starter island remains **0% → 3% → 7% → 11%** luck. Ordinary local upgrades
add **3–6 percentage points**. In v37, each island boundary adds eight extra
points on top of that normal step, giving a **12–13-point jump** when moving from
the previous island's best bait to the new island's first bait. Moonbait now has
**+153% luck** (previously +113%). The shop and Bag → Bait show the actual bonus
and its difference from your equipped bait.

Luck is a **relative weighting modifier**, not a literal catch percentage or a
guaranteed rare fish. It favors rarer fish only within the bait's existing eligible
pool; island, rarity and species-size restrictions do not change. Its bite-speed
and weight-bias effects still apply. Even Moonbait at full charge keeps a positive
bite wait (at least about 0.64 seconds). The separate half-point-per-tier weight
bonus and natural fish weight limits are unchanged.

### Slightly heavier catches · v28

Every bait upgrade adds **0.5 percentage points** to its maximum rolled-weight bonus:
Garden Worm **0%**, Bread Ball **up to +0.5%**, Salmon Egg **up to +3.5%**, and Moonbait
**up to +11.5%**. This is a small extra benefit on top of bait's existing luck-based
weight bias. The bait shop and Bag → Bait show the bonus and upgrade comparison.

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
audit includes the current weights and prices when checking saving goals.

### Island-priced equipment & bigger upgrades · v37

Each destination island's **first rod, first line and first bait cost exactly 30%
more than the minimum boat required to reach that island**: `entry price = boat
price × 13 / 10`. This is a fixed shop price, **not** a markup based on the player's
wallet, currently equipped boat, where they sailed from, or previous purchases.
Arriving in a more expensive boat or revisiting never changes the price.

| Island | Required boat price | First rod / line / bait, each |
| --- | ---: | ---: |
| Pinewater | 550c | **715c** |
| Sunscar | 4,500c | **5,850c** |
| Frostfall | 22,500c | **29,250c** |
| Emberforge | 130,000c | **169,000c** |
| Moontide | 320,000c | **416,000c** |

The **starter island is unchanged**: free starter equipment, first paid rod
**100c** (about six starter catches), line **80c**, and bait **140c**. Every ladder
still has 24 tiers, four per island. Within an island, prices rise geometrically;
after the shared entry price, lines cost less than rods and bait costs more.
Island boundaries intentionally have much larger steps, replacing the old v26
all-islands smooth curve and fixed 80% / 140% category-price ratios.

| Island's highest local tier | Rod | Line | Bait |
| --- | ---: | ---: | ---: |
| Reedhaven · tier 4 | 260c | 210c | 360c |
| Pinewater · tier 8 | 1,800c | 1,450c | 2,500c |
| Sunscar · tier 12 | 12,000c | 9,600c | 17,000c |
| Frostfall · tier 16 | 50,000c | 40,000c | 70,000c |
| Emberforge · tier 20 | 240,000c | 225,000c | 255,000c |
| Moontide · tier 24 | 720,000c | 600,000c | 900,000c |

Boat and gear prices are calculated together in travel order: departure gear →
boat → destination entry gear. Every next-island boat remains **at least 25% above
all departure stock**. All six current boat prices are unchanged; later gear was
retuned to meet both rules without cascading boat-price inflation.

**A new island is a genuine equipment power jump**, not just a new name/color:

- **Rods:** the first rod is about **70–89% stronger** by the shop's combined power
  score than the previous island's top rod. It has **26–27% faster reeling**, at
  least **30% more reach**, and about **18–19% less tension**. Local rungs keep
  their smaller 3–4m reach / roughly 3.5% reel improvements.
- **Lines:** arrival ratings jump **70–100%** and strain drops **17–18%**. The
  successive boundary ratings are **15 → 30**, **55 → 100**, **165 → 300**,
  **500 → 850**, and **1,250 → 2,200 lb**. Names display their real rating;
  final Mythril line now supports **3,400 lb**.
- **Bait:** the boundary jump is **12–13 luck points**, versus 3–6 within an island.
  Bait windows and minimum species-size gates are unchanged, as is the gentle
  separate weight-bonus cap. Better luck can improve future catch sizes, rarity,
  income and XP; it never rewrites fish already in a bag or save.

The stronger stats affect actual fishing: faster green-zone reeling, a wider safe
band and reduced strain, plus better bait odds/weight bias/bite wait. **Cast power
still adds only −10 to +10 luck points, and reeling has no cast-distance factor.**
No change was made to the green/yellow/red rules, fish roster, sale/XP formulas,
island license levels, collection rewards or giant-fish presentation.

Prices are audited against fish available with the **previous bait on the shop's
island**, not income from an unpurchased upgrade. Entry gear takes approximately
**8 / 15 / 15 / 23 / 34 landed-and-sold catches per item** on the five destination
islands. Final Moontide rod / line / bait goals are about **58 / 48 / 73 catches**
per item; these are optional purchases, not a requirement to buy every intervening
tier. Estimates use neutral charge and no collection bonuses; they are neither
catch-attempt counts nor elapsed-time guarantees. Run `npm run economy` for the
full price, boundary-stat and income audit.

**Existing ownership, coins, XP and saves are retained.** Owned gear automatically
uses its improved stats without a repurchase; re-equipping owned equipment and
boats stays free. Stable tier IDs and the v8 save key are unchanged. Shop notes
explain the 30% rule, upgrade comparisons show actual gains, displayed prices are
exactly what is charged, and one-coin-short purchases remain blocked.

### Catch XP that keeps pace · v33

Better fish now award **substantially more XP**, instead of only six extra XP per
rarity step and 22 per island. Base rewards for **Common / Uncommon / Rare / Epic /
Legendary / Mythic** are **20 / 28 / 42 / 64 / 100 / 155 XP**, multiplied by each
island's reward scale: **1× / 4× / 5× / 6× / 7× / 9×**.

Specimen size adds up to **40%** of that scaled base (`weight / species maximum`,
capped at one). A **new species adds a 50% discovery bonus**, with a single rounding
to whole XP after all bonuses. Common starter rewards are unchanged; every other
fish earns at least as much as before. Rarer and larger fish are more rewarding,
and better bait improves average XP through its real eligible pool and weight rolls.

With v37 bait, Pinewater repeat catches average about **177 XP with arrival bait**
and **251 XP with its best local bait**, versus about 56–62 using the legacy reward
formula on those same catches. From **level 15 to 25**, that is roughly
**37–53 landed repeat catches**, before any new discoveries.

| Fishing island | Level stretch | Previous repeat catches, arrival / top local bait | New repeat catches, arrival / top local bait |
| --- | --- | ---: | ---: |
| Reedhaven | 1 → 10 | 101.0 / 81.8 | 98.4 / 70.2 |
| Pinewater | 10 → 25 | 218.0 / 198.9 | 69.3 / 48.8 |
| Sunscar | 25 → 45 | 371.4 / 356.0 | 88.8 / 66.9 |
| Frostfall | 45 → 65 | 426.7 / 415.4 | 65.0 / 51.2 |
| Emberforge | 65 → 90 | 604.0 / 601.9 | 65.8 / 64.3 |
| Moontide | 90 → 99 | 227.2 / 226.8 | 20.6 / 20.4 |

These are rounded **expected successful landings**, not attempts, guarantees or minutes.
The audit uses actual bait eligibility, rarity odds and 1,024 weight quantiles with
one-decimal gameplay weights at **50% cast charge**. Arrival means the previous
island's best bait (starter worms in Reedhaven); local means the current island's
best bait. No destination fish, inaccessible Golden Koi, or repeated discovery
bonuses are used to make the estimates look faster. Run `npm run progression` for
the full comparison and Pinewater's remaining level-15-to-25 budget by bait.

**Only new landings receive the new rewards.** Existing XP, levels, earned licenses,
coins, gear, boat prices, and collection bonuses are not rewritten. The save key
stays v8; legacy v6 XP inference keeps its original reward calculation. Island gates
remain **1 / 10 / 25 / 45 / 65 / 90**, not closer together. Total XP for level `L` is
still `90 × (L−1) + 22 × (L−1)²`, and levels cap at 99. Selling never awards XP.
The level meter and next island milestone remain visible.

### The field guide

The **fish index (F)** contains all 120 numbered entries. Entries stay grouped by
island and sort **Common → Uncommon → Rare → Epic → Legendary → Mythic** within
each island, including when filters are applied. **Entry numbers follow this same
order, #001–#120:** Reedhaven has #001–#020, Pinewater #021–#040, and so on.
All old number assignments have been removed: fresh labels are generated only
after sorting by island, rarity and authored species order. Sorting never reads an
old label. Numbers stay fixed when filtering; species IDs, saved discoveries, catch
counts and personal-best weights stay attached to the same fish.

- Undiscovered fish have an **opaque dark silhouette and `???`**, with no species name,
  colors, rarity, description, tooltip, or accessible-label spoiler in the entry markup.
- Land a fish to reveal its name, colors, rarity, home island, story, catch count, and
  personal-best weight. Hooking or losing it is not enough.
- Filter by island and discovered/undiscovered status. Expand a discovered entry for details.
- Selling fish or trimming the recent catch log **never removes discoveries**.

The full spoiler roster is in **[FISH_ROSTER.md](FISH_ROSTER.md)**.

### Island index completion rewards · v32

Discover **all 20 unique fish from an island** to earn a **permanent +5% coin bonus**
on **every fish sale at every market**. Each of the six islands contributes once:
**+5% / +10% / +15% / +20% / +25% / +30%**. Bonuses add together rather than compound.
Repeated catches and reopening the index cannot award another copy of the same reward.
Hooking or losing the last missing fish does not count—you must land it.

The final catch shows an unlock banner. The index shows each island's progress,
checkmarks for completed islands, and your total permanent bonus. The coin HUD and
market also display the active bonus. Market prices, single sales, Sell All, catch
values and log values use the same bonus-aware calculation. Coins are rounded per
fish, so bulk sales pay exactly the sum of the displayed individual prices.

The reward is calculated from **saved lifetime discoveries**, not the contents of
your bag, recent log, equipped gear or current island. It survives sales, log trimming,
travel and reloads. Existing saves with complete islands qualify automatically; no
new save key or reset is needed. An explicit fresh-game reset clears the rewards.

Fish already in your bag receive the boost when sold, including the fish that
completes an island. Existing wallet coins are not multiplied or retroactively paid.
Shop prices, fish eligibility, XP and the cast-luck/reeling rules are unchanged.

## Huge trophies & automatic framing · v36

Held fish now grow with their **actual weight**, not their weight relative to that
species' maximum. Equal pounds produce equal display lengths across species while
retaining their different body shapes. There is no arm-span cap: the stylized length
is `0.45 + 0.65 × sqrt(weight in lb)` in world units. A 1 lb fish is 1.1 units long;
a 100 lb fish is 6.95, and a 1,500 lb trophy is about **25.6 units** beside the roughly
2-unit-tall angler. The heaviest current catch can reach about 26.8 units.

- Choose **Bag → Fish → Hold**, then **V / Front view** to see that scale beside
  your character. Small catches stay at chest height; larger trophies are raised
  overhead, with the belly aligned to the hands instead of floating above them.
- The front camera fits the **entire fish and character**, using real width,
  height and depth, field of view, screen aspect and a margin for animated fins.
  It pulls farther back on narrow phones rather than shrinking the fish model.
  Turning, tilting and rotating/resizing the screen recompute the fit automatically.
- Near obstacles, the trophy camera elevates over the blocking stall/tree instead
  of pushing inside a giant. Putting the fish away restores the normal camera.
- First person also fits the full-size fish at an appropriate display distance,
  with its own foreground depth pass so terrain/water cannot slice through it.
  **No body or hands appear in first person.** The actual eye/aim camera is not
  moved or zoomed, so cast direction, luck, distance and reeling remain unchanged.
- Weight, value, coins, XP, discoveries and bag identity are untouched. Display
  bounds/pose/zoom are transient and rebuilt from the selected specimen; there
  are **no new save fields, save-key changes or migrations**. Selling, voyages,
  view switching and Hide HUD retain their existing behavior.

## Quieter interface · v35

- **One Bag:** the **Fish · Rods · Lines · Bait** tabs replace the two separate bags.
  **B** opens Fish (or closes the bag); **I** opens your last gear tab. In the Fish
  tab, I switches to gear; in a gear tab, I closes the bag. All owned tiers remain
  freely equippable, including earlier bait. Purchases still require local vendors.
- **Essential HUD:** coins, level and XP stay visible. Total catches and your best
  fish's name/weight live in **Catch Log**, including lifetime records older than
  the latest 200 log entries. The large logo appears only on the title screen.
  The island card, sea chart, fish index and camera navigation keep their layout.
- **Contextual instructions:** nearby stalls show their interaction button; open
  water offers a cast hint; waiting, bites, charging and reeling show only their
  relevant controls. A held fish shows its own Put away action instead. Full
  desktop/touch controls are in **Help (?)**, not a permanent row of labels.
- **Compact catch strip:** for example, **Rainbow Trout · 3.6 lb — Put away**.
  Holding, front view, fish values and saved progress are unchanged.
- **Hide HUD (H):** frame a screenshot first, then hide the entire interface. A
  brief restoration hint disappears after two seconds. **Tap/click anywhere,
  press H or Escape** to bring it back. That first action only restores the UI;
  it cannot cast or move the player. Movement/look and other actions are blocked
  while hidden, but the world keeps animating. This mode is not saved on reload.

Bag and Help support Tab focus trapping and Escape/backdrop closing. Bag tabs
also support Left/Right (including wraparound), Home and End. Opening a panel
clears movement, joystick and fishing input. Help and Hide HUD, like the Bag,
are idle-only: finish the current cast, catch or voyage first. No economy, XP,
fish-pool, island-gate or save-format changes are part of this UI update.

## Hold your catch and front view · v34

Open **Bag → Fish (B)** from anywhere to see each **unsold, landed fish**, including
its species, rarity and actual weight. Choose **Hold** to close the bag and hold that
fish in front of you. Fish and owned tackle now share one bag; the lifetime fish
index (F) is separate. Sold fish and undiscovered species are not selectable.

Press **V**, or the **Front view** button, to see your character **from the front**.
Press the same key/button again to return to first person. The character is a very
simple cuboid angler with a cap, vest, arms and legs, a small walk animation, and a
two-handed fish-holding pose. **Your body, hands and sleeves are never rendered in
first person**—only the rod, or the held fish. No character assets are downloaded.

- **X / Put away** stows the fish without removing it from your bag. Put it away
  before casting again. Touch look-drags never accidentally stow or cast it.
- Holding is display-only: no extra XP, coins, discoveries, weight changes or sale
  charges. Heavier fish display larger; the camera now backs up to fit giants
  instead of shrinking them to arm-span size (see v36 above).
- Selling the held specimen (including Sell All) clears the display. Selling a
  different fish does not change what is held, even for identical duplicates.
- Walking and fishing work in either view. The front camera is separate from the
  player’s aim, so it never reverses casts or changes bait luck, reach or reeling.
  Finish an active cast/fight before switching views or opening the bag.
- The camera follows the player, shortening its distance near island obstacles
  when not holding a fish; a held trophy instead uses v36's size-aware fit and
  obstacle elevation. Voyages use the boat camera, then restore your view and fish.
- Reloading returns to first person with the fish put away; the actual bag and all
  earned progress remain saved. There is **no save-key change or migration**.

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
| Bag / choose a catch to hold | B | Bag → Fish → Hold |
| Owned tackle | I (last gear tab) | Bag → Rods / Lines / Bait |
| Front-facing third person / first person | V (toggle) | Front view / First person button |
| Put held fish away | X | Put away button |
| Full controls / Help | ? | Help button |
| Hide / restore HUD | H; Escape or click to restore | Hide HUD; tap anywhere to restore |
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

For other static hosts, deploy `index.html`, `style.css`, `main.js`, **all six `.mjs`
modules**, and `vendor/`. Every browser-facing path is relative and every dependency is
local. `.mjs` must be served as JavaScript (already handled by `serve.js`).

Cache stamps are currently **`v=37`** in the HTML and module imports. Bump the corresponding
stamps when changing a cached module. Render's blueprint also sends `Cache-Control: no-cache`.

## Testing

`npm test` checks 144,000 seeded fish draws, all-species reachability, local bait pools,
gear locations, smooth local prices, exact 130%-of-boat entry prices, catch-income
budgets, larger island-boundary stats, unchanged starter equipment, increasing island sale
values, XP thresholds, wider level gaps, matching boat licenses, both travel gates,
retained v7 access, one-time save migration, persistent discoveries, and malformed
save handling. Weight tests cover every species and bait tier, bounded bonuses,
strictly heavier averages after display rounding, and unchanged saved catches. Luck
tests check every widened gap, improved rare-fish weighting and the actual picker.
Cast/index tests cover the −10/0/+10 luck scale, strict pools at every power,
cast-adjusted weights/income, and consecutive #001–#120 island/rarity numbering.
They also verify fixed numbers across filters, roster-document parity, and unchanged
saved discoveries and catches after renumbering. Collection reward tests cover
all 64 completed-island combinations, distinct-species requirements, +5% to +30%
sale values, duplicate protection, invalid records, existing saves and reset behavior.
XP balance tests cover all rarity/size/island rewards, unchanged starter XP, exact
discovery rounding, repeat-catch budgets for every arrival/local bait at low/mid/full
power, and audit agreement with the actual picker. They also check exact saved XP
and licenses at all 99 levels, the unchanged v8 key, and frozen v6 XP reconstruction.
Player-view tests cover absolute-weight growth across all species, equal-weight
lengths, giant belly/hand contact, eight-corner volume fitting, every camera heading,
obstacle elevation, first-person inspection and portrait framing without changing
fish/aim data.
UI-rule tests check the single bag tab order, roving-key behavior, contextual hint
priority, correct desktop/touch controls and the complete Help reference.
Economy tests compare prices to published baselines, enforce both the destination
30% entry rule and the departure 25% boat premium, and verify ownership and coins.
Island-gear tests check meaningful rod/line/bait stat jumps, truthful line names,
fixed prices, all 24 saved tier IDs and improved owned gear without repurchases.

`npm run economy` prints the deterministic income estimates and saving goals for
every gear tier and boat, including the local gear ceiling and boat premium, using
fixed weight quantiles rather than lucky random runs. These targets assume neutral
50% cast power and **no collection rewards**; earning a completion bonus improves
income without raising prices. `expectedCatchIncome` also accepts cast power for targeted audits.

`npm run progression` audits XP at the same weight precision and cast power. It
compares old/new repeat-catch effort for all six level stretches, including level
90 → 99, and reports Pinewater 15 → 25 for arrival bait and all four local tiers.
`expectedCatchXP` accepts `samples`, `castPower`, and `legacy` options for targeted
checks. No new-species bonuses are included in these pacing budgets.

Optional browser tests exercise all **69 paid gear purchases and five boat purchases**,
including one-coin-short rejection, displayed-versus-charged prices and free re-equips.
They also cover all five new level boundaries, retained old-save access, displayed
bait bonuses and actual equipped-bait hook weights, index order across all filters,
locked cast-luck snapshots, identical green reeling rates at every cast power, and
yellow stalls. The real cast/hook/tension/catch/sale loop, all 30 sailing routes,
old-save boot, and mobile controls are also covered. `tests/collection-browser.cjs`
adds a last-species unlock, pre-existing bag bonuses, exact single/bulk payouts,
global stacking, save/reload persistence, reset, and responsive reward UI checks.
`tests/xp-browser.cjs` verifies exact awarded/displayed/saved XP, rarity/weight
improvements, the one-time discovery bonus, no XP from sales or duplicate landings,
all five catch-triggered island unlocks, the level-99 cap, and mobile mythic payouts.
`tests/player-view-browser.cjs` checks real/empty bags, keyboard focus and input
isolation, selecting individual specimens, identical-fish sales, resource disposal,
actual character render visibility, all 120 fish shapes in both views at desktop and
phone sizes, a real third-person cast/hook/reel/catch, travel/reload/reset, and touch
look/joystick/Put away controls. `tests/ui-browser.cjs` covers the unified bag,
all three remote re-equip paths, purchase/ownership guards, B/I aliases, accessible
tabs and Help, native Space activation, pointer/keyboard/joystick isolation,
contextual fishing/vendor hints, lifetime Catch Log records, clean screenshot mode
and safe click/tap/H/Escape restoration. It also checks reload/reset, all 24 owned
gear tiers, and scrolling/layout at desktop, phone and short-landscape sizes.
`tests/trophy-browser.cjs` checks actual mesh length against pounds, giant-vs-player
scale, raised grip and visible heads, all 120 models plus the angler at four viewport
sizes and both pitch limits, resize-aware zoom, first-person foreground rendering
without body/hands, all 30 vendor camera clearances, and travel/stow/reload/save
invariants. `tests/island-gear-browser.cjs` covers all 15 destination entry prices,
advanced-boat price independence, displayed/charged costs, one-coin shortages,
actual green-zone reel speed and rod/line control, bait wait/weight improvements,
free re-equips/reloads, and phone/landscape scrolling with touch purchases:

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
| `main.js` | Fishing, input, UI, shops, carried catches, collection, voyage playback, saves |
| `ui-state.mjs` | Pure bag-tab navigation, contextual hint rules and Help controls |
| `player-view.mjs` | Basic cuboid player, weight-scaled trophies and volume-aware camera framing |
| `game-data.mjs` | 120 species, 72 gear tiers, shared gear/boat pricing, fish pools and weight rolls |
| `archipelago.mjs` | Island / boat definitions, XP and travel requirements |
| `world.mjs` | Merged cube terrain and props, collision, distant-island LOD, sea routing |
| `save-state.mjs` | Validated save normalization and legacy migration |
| `index.html`, `style.css` | Responsive HUD, unified Bag, Help, chart, index and shop panels |
| `serve.js`, `render.yaml` | Zero-dependency local server / static hosting blueprint |
| `tests/` | Pure logic, economy and optional browser regression suites |
| `scripts/economy.mjs` | Deterministic tier/boat pricing audit (`npm run economy`) |
| `scripts/progression.mjs` | Eligible-pool XP pacing audit (`npm run progression`) |

The world uses merged vertex-colored cuboids, instanced particles, simple lighting,
no shadow pass and reduced-detail distant islands. Resolution adapts on slow devices.
Fish materials are disposed after encounters instead of accumulating in GPU memory.
