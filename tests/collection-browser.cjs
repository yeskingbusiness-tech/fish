// Collection reward integration tests, run from the full browser suite.
const assert=require('node:assert/strict');

module.exports=async function testCollectionRewards(browser,url,shots){
  const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const coins=()=>page.evaluate(()=>__reelDeal.G.coins);
  const bonus=()=>page.evaluate(()=>__reelDeal.collectionCoinBonus(__reelDeal.G.discoveries));
  async function resume(){
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
  }
  async function reload(){
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await resume();
  }
  async function market(zone=0){
    await page.evaluate(zone=>{
      const a=__reelDeal;a.closeIndex();a.closeMarket();a.G.state='aim';a.spawnAtIsland(zone);
      const s=a.world.stalls.find(s=>s.zone===zone&&s.kind==='market');a.G.px=s.x;a.G.pz=s.z-3.8;a.openMarket();
    },zone);
  }
  async function hookBluegill(){
    await page.evaluate(()=>{
      const a=__reelDeal,random=Math.random;a.G.gear={rod:0,line:0,bait:0};a.G.castPower=.5;a.G.state='bite';
      try{let calls=0;Math.random=()=>calls++===0?0:.5;a.hookFish();}finally{Math.random=random;}
    });
  }
  const formatted=n=>n.toLocaleString('en-US')+'c';
  try{
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    // A genuine old-format v8 save: nineteen distinct Reedhaven entries, no reward field.
    // The bag includes both a local fish and a fish from another island.
    await page.evaluate(()=>{
      const a=__reelDeal;
      const discoveries=Object.fromEntries(a.SPECIES.filter(sp=>sp.island===0&&sp.id!=='bluegill').map(sp=>[sp.id,{count:1,best:sp.minW,first:'2026-11-13'}]));
      localStorage.setItem('reel-deal-save-v8',JSON.stringify({version:8,coins:1000,caught:20,discoveries,
        bag:[{n:'Yellow Bass',w:'2.4'},{n:'Reel Life',w:'500.0'}]}));
    });
    await reload();
    assert.equal(await coins(),1000);assert.equal(await bonus(),0);
    assert.equal(await page.locator('#coinBonus').isVisible(),false);
    await page.click('#indexBtn');await page.locator('[data-index-island="0"]').click();
    assert.match(await page.locator('#collectionBonusTitle').textContent(),/19\/20/);
    assert.match(await page.locator('#collectionBonusDetail').textContent(),/permanent \+5%/);
    assert.equal(await page.locator('[data-index-island="0"]').evaluate(e=>e.classList.contains('complete')),false);
    await page.click('#indexClose');
    // Simulate old in-memory catch-value caches: a new reward must override these, not freeze prices.
    await page.evaluate(()=>{const a=__reelDeal;for(const e of a.bag)e.value=a.fishValue(e.sp,Number(e.weight));});
    await hookBluegill();
    assert.equal(await bonus(),0,'hooking the twentieth species is not enough');
    assert.equal(await page.evaluate(()=>!!__reelDeal.G.discoveries.bluegill),false);
    await page.evaluate(()=>__reelDeal.catchFish());
    assert.equal(await bonus(),5);assert.equal(await coins(),1000,'unlocking must not multiply the wallet');
    assert.equal(await page.locator('#collectionReward').isVisible(),true);
    assert.match(await page.locator('#collectionReward').textContent(),/Reedhaven index complete!.*\+5% sale coins forever · total \+5%/);
    assert.equal(await page.locator('#coinBonus').textContent(),'+5% SALES');
    const catchValue=await page.evaluate(()=>{const a=__reelDeal,e=a.bag.at(-1);return Math.round(a.fishValue(e.sp,Number(e.weight))*105/100);});
    assert.ok((await page.locator('#catchPoints').textContent()).includes('WORTH '+formatted(catchValue)));
    await page.screenshot({path:`${shots}/collection-unlocked.png`});
    await page.setViewportSize({width:390,height:844});
    const catchBox=await page.locator('#catchModal .modal-card').boundingBox();
    assert.ok(catchBox.x>=0&&catchBox.x+catchBox.width<=390&&catchBox.y>=0&&catchBox.y+catchBox.height<=844);
    await page.screenshot({path:`${shots}/collection-unlocked-mobile.png`});
    await page.setViewportSize({width:1100,height:760});await page.click('#continueBtn');

    await page.click('#indexBtn');await page.locator('[data-index-island="0"]').click();
    assert.match(await page.locator('#collectionBonusTitle').textContent(),/Reedhaven complete · \+5% earned/);
    assert.equal(await page.locator('[data-index-island="0"]').evaluate(e=>e.classList.contains('complete')),true);
    assert.equal(await page.locator('.fish-entry.discovered').count(),20);
    assert.deepEqual(await page.locator('.fish-entry .entry-top>span:first-child').allTextContents(),Array.from({length:20},(_,i)=>'#'+String(i+1).padStart(3,'0')));
    await page.selectOption('#indexFilter','missing');
    assert.equal(await page.locator('.fish-entry').count(),0);assert.equal(await bonus(),5,'filters must not change rewards');
    await page.selectOption('#indexFilter','all');
    await page.screenshot({path:`${shots}/collection-reward-index.png`});await page.click('#indexClose');

    await market();
    assert.match(await page.locator('#marketNote').textContent(),/\+5% on all fish sales/);
    const expected=await page.evaluate(()=>{const a=__reelDeal;return a.bag.map(e=>Math.round(a.fishValue(e.sp,Number(e.weight))*105/100));});
    assert.deepEqual(await page.locator('.sell-row .val').allTextContents(),expected.map(formatted));
    assert.equal(await page.locator('#sellAll').textContent(),'SELL ALL · '+formatted(expected.reduce((sum,v)=>sum+v,0)));
    await page.screenshot({path:`${shots}/collection-bonus-market.png`});
    await page.locator('[data-sell="0"]').click();
    assert.equal(await coins(),1000+expected[0]);assert.equal(await bonus(),5);
    await reload();await market();
    assert.deepEqual(await page.locator('.sell-row .val').allTextContents(),expected.slice(1).map(formatted));
    await page.click('#sellAll');
    const soldTotal=1000+expected.reduce((sum,v)=>sum+v,0);
    assert.equal(await coins(),soldTotal);assert.equal(await bonus(),5);
    await page.evaluate(()=>__reelDeal.sellAll());assert.equal(await coins(),soldTotal,'a repeated Sell All cannot pay again');
    await reload();assert.equal(await coins(),soldTotal);assert.equal(await bonus(),5);
    assert.equal(await page.evaluate(()=>__reelDeal.bag.length),0);

    // Another catch of the same species does not award a second five percent.
    await hookBluegill();await page.evaluate(()=>__reelDeal.catchFish());
    assert.equal(await bonus(),5);assert.equal(await page.locator('#collectionReward').isVisible(),false);
    const caught=await page.evaluate(()=>__reelDeal.G.caught);
    await page.evaluate(()=>__reelDeal.catchFish());assert.equal(await page.evaluate(()=>__reelDeal.G.caught),caught);
    await page.click('#continueBtn');

    await page.evaluate(()=>{
      const a=__reelDeal;
      for(const sp of a.SPECIES.filter(sp=>sp.island===1))a.G.discoveries[sp.id]={count:1,best:sp.minW,first:''};
      a.G.xp=a.xpForLevel(90);a.G.boat=5;a.G.ownedBoats=[0,5];a.G.licenses=[0,1,2,3,4,5];
      a.bag.length=0;const sp=a.SPECIES.at(-1);a.bag.push({sp,weight:sp.minW});a.saveGame();a.updateStats();
    });
    assert.equal(await bonus(),10);
    await market(5); // Neither the selling island nor the fish's home island is completed.
    const remoteValue=await page.evaluate(()=>{const a=__reelDeal,e=a.bag[0];return Math.round(a.fishValue(e.sp,Number(e.weight))*110/100);});
    assert.equal(await page.locator('.sell-row .val').textContent(),formatted(remoteValue));
    await page.locator('[data-sell="0"]').click();assert.equal(await coins(),soldTotal+remoteValue);
    assert.equal(await bonus(),10);await page.click('#marketClose');
    const beforeAll=await coins();
    await page.evaluate(()=>{
      const a=__reelDeal;
      for(const sp of a.SPECIES)a.G.discoveries[sp.id]??={count:1,best:sp.minW,first:''};
      a.saveGame();a.saveGame();a.updateStats();a.openIndex();
    });
    await page.locator('[data-index-island="-1"]').click();
    assert.equal(await bonus(),30);assert.equal(await coins(),beforeAll);
    assert.equal(await page.locator('.island-filter.complete').count(),6);
    assert.equal(await page.locator('#collectionBonusTitle').textContent(),'Permanent coin bonus: +30%');
    assert.equal(await page.locator('#coinBonus').textContent(),'+30% SALES');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('#collectionBonus').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&e.scrollWidth<=e.clientWidth;}),true);
    assert.equal(await page.locator('.index-card').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
    await page.screenshot({path:`${shots}/collection-reward-mobile.png`});
    await reload();assert.equal(await bonus(),30);assert.equal(await coins(),beforeAll);

    // Explicit reset is the only normal action that clears these lifetime rewards.
    await page.click('#logBtn');page.once('dialog',dialog=>dialog.accept());await page.click('#resetBtn');
    assert.equal(await bonus(),0);assert.equal(await coins(),0);
    assert.equal(await page.locator('#coinBonus').isVisible(),false);
    assert.equal(await page.evaluate(()=>Object.keys(__reelDeal.G.discoveries).length),0);
    assert.deepEqual(errors,[],'Collection reward flow must not raise browser errors');
    console.log('PASS: 19→20 distinct landings unlock +5%, global stacking to +30%, no duplicate awards, exact single/bulk sales, existing bags, reloads, reset and mobile rewards UI');
  }finally{await page.close();}
};
