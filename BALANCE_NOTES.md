# Rebalancing ideas — proposals, not enabled

Audit for **2.1.1 / v42**. The navigation update does **not** change prices, catch rewards, bait luck, natural fish sizes, unlock levels or collection bonuses. The requested smaller shore area is the only fishing-balance change in that update.

`npm run economy` and `npm run progression` integrate the actual eligible species pools and specimen-weight quantiles. The figures below assume **neutral charge, offshore fishing, repeat catches and no collection bonuses**. They include the existing **×0.85 sale multiplier** and **×0.90 catch-XP multiplier**. They are expected successful catches, not guaranteed counts or real-time completion estimates. Sailing, shop visits and failed fights add time; discoveries and permanent bonuses can reduce the totals.

## 1. Smooth upgrade effort first

Keep the **first rod at about 5–6 catches** (currently **5.6**). The more important issue is the middle of the game:

| Premium local rod | Current expected catches |
| --- | ---: |
| Ironwood River | 13.3 |
| Brackwater Marsh | 5.1 |
| Coralreach | 4.5 |
| Stormbreak Isles | 4.2 |
| Emberforge | 12.6 |
| Moontide Sanctum | 13.9 |
| The Null Trench | 36.1 |
| Eternity's Reach | 35.8 |
| Origin's End | 61.8 |

**Suggested target:** roughly **8–14 catches per premium midgame item**, then a deliberate late-game ramp. Preserve substantial endgame goals: the final rod is 61.8 catches and final bait 69.6 before collection bonuses.

Tune individual prices against the actual bait available *before* each purchase, rather than applying a blanket fish-value nerf. Keep strict price ordering and meaningful equipment improvements. Audit the **whole rod + line + bait shopping basket** too: fair individual prices can still add up to an excessive island stop.

## 2. Flatten XP spikes without touching saved XP

Premium-bait repeat-catch budgets vary from **42.7** at Stormbreak (100 → 120) to **88.5** at Reedhaven (1 → 10). The Null Trench (325 → 350) is **80.2**, and Eternity (350 → 400) is **78.6**. Many intervening territories already fall around **54–60**.

**Suggested target:** ordinary midgame island stays around **60–70 successful catches**, with a clearly intentional first/final stretch rather than alternating easy and slow islands. Adjust future *island reward multipliers*, not earned XP or unlock levels. Retain the explicit ×0.90 catch-XP factor and the discovery bonus. Check actual fishing/return-trip time as well: later rods reel faster, so equal catch counts are not equal minutes.

## 3. Optional boat trade-ins

Allow a physical boat shop to offer **35% of an older purchased boat's original price** toward a new one. Show the full price, trade-in credit and exact amount charged separately.

The traded vessel would be surrendered; keeping both remains an option. The free starter has no trade-in value. This avoids repeat-credit exploits and makes buying an intermediate hull less wasteful, without changing boats into access requirements or adding remote shopping. Start with boats, not bait: older bait windows remain useful for completing collections.

## 4. Trophy rewards based on the species, not absolute pounds

Tiny rare animals already receive rarity-based sale values and XP; they do **not** need inflated body weights to compete. Add optional **species-relative trophy milestones** instead.

For example, a one-time **+15% sale award for the first specimen in a species' top 10% natural weight range**, with a saved claimed flag. A trophy killifish and trophy whale can both be worth pursuing. Keep the normal price preview accurate, preserve natural size limits, and do not replace the permanent +5% completed-island bonus.

## 5. Gentle help with the last collection entries

An optional small duplicate-streak system could increase the relative selection weight of **undiscovered, already-eligible entries** by up to **25% after 20 duplicate catches**, resetting on a discovery.

This is not a guaranteed rare catch, an exclusive fishing spot, or a way to bypass the bait window/territory gate. It must not expose undiscovered names or art. Simulate completion-time distributions before choosing the exact strength: the last missing entry matters more than the average income rate.

## 6. Budget travel before adding more grind

The enlarged map's consecutive island centers are about **700–1,196 m apart**. At constant top speed, those distances alone imply roughly **50–85 seconds in the starter** or **13–22 seconds in the fastest boat**. These are distance/speed comparisons, not measured dock-to-dock voyages: acceleration, headings, land and locked-territory detours change the trip.

Playtest those crossings and the required market returns before increasing prices or reducing XP again. Keep the starter capable of every unlocked crossing and retain manual sailing. If travel feels empty, small **non-exclusive offshore shoals** or visual events are preferable to secretly restricting species to particular cast distances or locations.

## Recommended order

1. Smooth midgame purchase effort while preserving the 5–6-catch starter rod and substantial endgame upgrades.
2. Add optional boat trade-ins.
3. Recheck total island time, then smooth XP outliers.
4. Consider trophy milestones and duplicate-streak protection only after simulation/playtesting.

**None of these proposals is implemented in v42.** Existing coins, XP, gear ownership, catches, licenses and permanent collection rewards remain intact.
