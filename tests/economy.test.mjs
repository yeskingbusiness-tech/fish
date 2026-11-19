import test from 'node:test';
import assert from 'node:assert/strict';
import { RODS, LINES, BAITS } from '../game-data.mjs';
import { BOATS, ISLANDS, localGearPriceCeiling } from '../archipelago.mjs';
import { normalizeSave } from '../save-state.mjs';
import { expectedCatchIncome, gearEconomyRows, boatEconomyRows, islandEntryRows } from '../scripts/economy.mjs';

// The published v25 prices: this update must raise every paid item, not quietly
// make some tiers cheaper while advertising a general price increase.
const PREVIOUS = [
  [0,50,85,140,240,410,700,1200,1600,2700,4600,5450,7550,8300,14000,24000,29500,34000,38000,42000,46000,50500,55500,61000],
  [0,40,70,120,200,340,580,990,1250,2100,3550,4200,5850,6450,11000,18500,23000,26500,29500,32500,36000,39500,43500,48000],
  [0,80,140,240,410,700,1200,2050,2500,4250,7200,8400,11500,12500,21000,35500,46000,52500,59000,65000,71500,78500,86500,95000],
  [0,150,1800,12000,45000,120000],
];

test('every paid gear tier and boat costs more, while the starter kit stays free', () => {
  for(const [j, list] of [RODS,LINES,BAITS,BOATS].entries()){
    assert.equal(list[0].cost,0);
    for(let i=1;i<list.length;i++){
      assert.ok(Number.isSafeInteger(list[i].cost));
      assert.ok(list[i].cost>PREVIOUS[j][i],`${list[i].name} must cost more than v25`);
    }
  }
});

test('all three destination starting tiers cost exactly 30% above their required boat', () => {
  const rows=islandEntryRows();
  assert.deepEqual(rows.map(r=>r.rod),[715,5850,29250,169000,416000]);
  for(const [n,row] of rows.entries()){
    const island=n+1,boat=BOATS[island];
    for(const list of [RODS,LINES,BAITS]){
      assert.equal(list[island*4].cost*10,boat.cost*13);
      assert.ok(list.slice(island*4,island*4+4).every(g=>g.cost>=boat.cost*13/10));
    }
    assert.equal(row.rod,row.line);assert.equal(row.line,row.bait);
  }
});

test('local prices rise smoothly; island price jumps are tied to the boat, not flattened away', () => {
  for(const list of [RODS,LINES,BAITS])for(let i=2;i<list.length;i++){
    const ratio=list[i].cost/list[i-1].cost;
    if(i%4===0){assert.ok(ratio>=1.6);continue;}
    assert.ok(ratio>=1.09,`${list[i].name}: a near-flat local price plateau`);
    assert.ok(ratio<=1.65,`${list[i].name}: a sudden price wall within an island`);
  }
  for(let i=1;i<24;i++){
    if(i%4===0)continue; // All three entry tiers share the exact 130% boat price.
    assert.ok(LINES[i].cost<RODS[i].cost && RODS[i].cost<BAITS[i].cost);
  }
});

test('first rod still takes roughly six starter catches, rather than a long grind', () => {
  const income=expectedCatchIncome(0,0);
  assert.deepEqual([RODS[1].cost,LINES[1].cost,BAITS[1].cost],[100,80,140]);
  assert.ok(RODS[1].cost/income>=5.5 && RODS[1].cost/income<=6.5);
  assert.ok(LINES[1].cost/income<5);
  assert.ok(BAITS[1].cost/income<9);
  assert.ok((RODS[1].cost+LINES[1].cost+BAITS[1].cost)/income<20);
});

test('the higher gear goals stay bounded by fish catchable before purchase, not future bait', () => {
  const budgets={rod:[15,15,22,25,36,65],line:[12,12,20,22,35,55],bait:[21,20,25,30,40,80]};
  for(const r of gearEconomyRows()){
    const tier=r.tier-1,island=Math.floor(tier/4);
    assert.ok(r.income>0,`${r.island} tier ${r.tier} has no valid income`);
    for(const power of [0,.5,1]){
      const income=expectedCatchIncome(island,tier-1,1024,power);
      for(const kind of ['rod','line','bait']){
        const catches=r[kind]/income;
        assert.ok(catches>=3.5&&catches<=budgets[kind][island],`${kind} ${r.tier} at ${power}: ${catches}`);
      }
    }
  }
  const end=gearEconomyRows().at(-1);
  assert.ok(end.rodCatches>55&&end.lineCatches>45&&end.baitCatches>70,'endgame upgrades remain substantial goals');
});

test('every next-island boat costs more than all departure-island gear, with at least a 25% premium', () => {
  const previousBoats=[0,350,3000,15500,90000,225000];
  assert.deepEqual(BOATS.map(b=>b.cost),[0,550,4500,22500,130000,320000]);
  for(const island of ISLANDS){
    const prices=[RODS,LINES,BAITS].flatMap(list=>list.filter((_,tier)=>Math.floor(tier/4)===island.id).map(item=>item.cost));
    assert.equal(localGearPriceCeiling(island.id),Math.max(...prices));
    const next=BOATS[island.id+1];
    if(!next)continue; // No outgoing island beyond Moontide.
    for(const price of prices)assert.ok(next.cost>price,`${next.name} must exceed every local item`);
    assert.ok(next.cost>=Math.max(...prices)*1.25);
    assert.ok(next.cost>previousBoats[next.id]);
    assert.ok(Number.isSafeInteger(next.cost));
  }
  for(const invalid of [-1,6,NaN,'0'])assert.equal(localGearPriceCeiling(invalid),0);
});

test('boats scale in departure-island catch effort, with no income-from-locked-fish assumptions', () => {
  const rows=boatEconomyRows();
  assert.ok(rows[0].catches>=11.5 && rows[0].catches<=13);
  for(let i=1;i<rows.length;i++){
    const increase=rows[i].catches-rows[i-1].catches;
    assert.ok(increase>=6 && increase<=10,`${rows[i].boat}: uneven boat savings goal`);
  }
  assert.ok(rows.at(-1).catches>=41 && rows.at(-1).catches<=44);
});

test('the price update never recharges owned gear or rewrites saved coins and progress', () => {
  const d=normalizeSave({
    version:7,coins:4321,xp:712,caught:25,
    owned:{rod:[0,1,2],line:[0,1],bait:[0,1,3]},gear:{rod:2,line:1,bait:3},
    ownedBoats:[0,1],boat:1,zone:1,
  });
  assert.equal(d.coins,4321);assert.equal(d.xp,712);assert.equal(d.caught,25);
  assert.deepEqual(d.gear,{rod:2,line:1,bait:3});assert.deepEqual(d.owned.rod,[0,1,2]);
  assert.equal(d.boat,1);assert.equal(d.zone,1);
});
