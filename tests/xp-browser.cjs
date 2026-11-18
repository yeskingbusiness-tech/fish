// Real catch/save/UI integration for the XP rebalance; run by tests/browser.cjs.
const assert=require('node:assert/strict');

module.exports=async function testCatchXP(browser,url,shots){
  const {SPECIES,BAITS,RARITY,eligibleSpecies,effectiveLuck,rollWeight}=await import('../game-data.mjs');
  const {ISLANDS,catchXP,xpForLevel,levelProgress}=await import('../archipelago.mjs');
  const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const fmt=n=>n.toLocaleString('en-US');
  const uncommon=eligibleSpecies(1,3).find(sp=>sp.rarity==='uncommon');
  const rare=eligibleSpecies(1,3).find(sp=>sp.rarity==='rare');
  const epic=eligibleSpecies(1,7).find(sp=>sp.rarity==='epic');
  async function reload(){
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
  }
  async function land(sp,baitIndex,quantile=.5){
    // Select an actually eligible species through hookFish's normal weighted picker.
    const pool=eligibleSpecies(sp.island,baitIndex),bait=BAITS[baitIndex];
    const weights=pool.map(s=>s.weight*Math.pow(1+2*effectiveLuck(baitIndex,.5),RARITY[s.rarity].tier-bait.lo));
    const index=pool.findIndex(s=>s.id===sp.id);assert.ok(index>=0);
    const pickRoll=(weights.slice(0,index).reduce((a,b)=>a+b,0)+weights[index]/2)/weights.reduce((a,b)=>a+b,0);
    const weight=+rollWeight(sp,baitIndex,()=>quantile,.5).toFixed(1);
    const result=await page.evaluate(({island,baitIndex,pickRoll,quantile})=>{
      const a=__reelDeal;a.closeShop();a.closeChart();a.closeIndex();a.closeMarket();a.spawnAtIsland(island);
      a.G.gear.bait=baitIndex;if(!a.G.owned.bait.includes(baitIndex))a.G.owned.bait.push(baitIndex);
      a.G.castPower=.5;a.G.state='bite';
      const before={xp:a.G.xp,coins:a.G.coins,caught:a.G.caught,bag:a.bag.length};
      const random=Math.random;
      try{let calls=0;Math.random=()=>calls++===0?pickRoll:calls===2?quantile:.5;a.hookFish();}
      finally{Math.random=random;}
      if(a.G.state!=='reeling'||a.G.xp!==before.xp)throw Error('Hooking must start a fight without awarding XP');
      a.catchFish();
      const fish=a.bag.at(-1),count=a.G.discoveries[fish.sp.id].count;
      const after={xp:a.G.xp,coins:a.G.coins,caught:a.G.caught,bag:a.bag.length};
      a.catchFish();
      if(a.G.xp!==after.xp||a.G.caught!==after.caught||a.bag.length!==after.bag)throw Error('Duplicate catch awarded twice');
      return {before,after,id:fish.sp.id,weight:Number(fish.weight),isNew:count===1,
        saved:JSON.parse(localStorage.getItem('reel-deal-save-v8'))};
    },{island:sp.island,baitIndex,pickRoll,quantile});
    assert.equal(result.id,sp.id);assert.equal(result.weight,weight);
    const expected=catchXP(sp,weight,result.isNew);
    assert.equal(result.after.xp-result.before.xp,expected,'real catch must add the rebalanced amount');
    assert.equal(result.after.coins,result.before.coins,'catch XP must not multiply wallet coins');
    assert.equal(result.after.caught,result.before.caught+1);assert.equal(result.after.bag,result.before.bag+1);
    assert.equal(result.saved.xp,result.after.xp);assert.equal(result.saved.version,8);
    const text=await page.locator('#catchPoints').textContent();
    assert.ok(text.startsWith(`+${fmt(expected)} XP`),text);
    assert.equal(text.includes('50% discovery bonus'),result.isNew);
    assert.equal(await page.locator('#newDiscovery').isVisible(),result.isNew);
    const progress=levelProgress(result.after.xp);
    assert.equal(await page.locator('#levelNum').textContent(),'LV. '+progress.level);
    assert.equal(await page.locator('#xpText').textContent(),progress.level===99?'MAX LEVEL':`${fmt(progress.current)} / ${fmt(progress.needed)} XP`);
    const shownFill=await page.locator('#xpFill').evaluate(e=>parseFloat(e.style.width));
    assert.ok(Math.abs(shownFill-progress.ratio*100)<.0001);
    return {...result,earned:expected};
  }
  try{
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    // Existing level-15 Pinewater progress and a +5% coin reward, with no XP-version flag.
    const initialXP=xpForLevel(15)+37;
    await page.evaluate(({initialXP,knownId})=>{
      const a=__reelDeal,sp=a.SPECIES.find(s=>s.id===knownId);
      const discoveries=Object.fromEntries(a.SPECIES.filter(s=>s.island===0||s.id===knownId).map(s=>[s.id,{count:2,best:s.minW,first:'2026-11-13'}]));
      localStorage.setItem('reel-deal-save-v8',JSON.stringify({version:8,xp:initialXP,coins:4321,caught:120,
        licenses:[0,1],zone:1,visited:[0,1],boat:1,ownedBoats:[0,1],discoveries,
        owned:{rod:[0,3],line:[0,3],bait:[0,3,7]},gear:{rod:3,line:3,bait:3},
        log:[{n:sp.name,w:sp.minW}],bag:[{n:sp.name,w:sp.minW}]}));
    },{initialXP,knownId:uncommon.id});
    await reload();
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;return [a.G.xp,a.G.coins,a.G.zone,a.G.boat,a.G.licenses,a.G.gear,a.bag.length,a.collectionCoinBonus(a.G.discoveries)];}),
      [initialXP,4321,1,1,[0,1],{rod:3,line:3,bait:3},1,5]);
    assert.match(await page.locator('#journeyObjective').textContent(),/Sunscar at level 25/);
    assert.equal(await page.locator('#levelNum').textContent(),'LV. 15');
    const small=await land(uncommon,3,.1);assert.equal(small.isNew,false);await page.click('#continueBtn');
    const large=await land(uncommon,3,.9);assert.equal(large.isNew,false);assert.ok(large.earned>small.earned);await page.click('#continueBtn');
    const firstRare=await land(rare,3);assert.equal(firstRare.isNew,true);
    await reload();assert.equal(await page.evaluate(()=>__reelDeal.G.xp),firstRare.after.xp);
    const repeatRare=await land(rare,3);assert.equal(repeatRare.isNew,false);
    assert.ok(firstRare.earned>repeatRare.earned);assert.ok(repeatRare.earned>large.earned);
    await page.click('#continueBtn');
    const firstEpic=await land(epic,7);assert.equal(firstEpic.isNew,true);assert.ok(firstEpic.earned>firstRare.earned);
    await page.screenshot({path:`${shots}/xp-pinewater-discovery.png`});await page.click('#continueBtn');
    const repeatEpic=await land(epic,7);assert.equal(repeatEpic.isNew,false);assert.ok(repeatEpic.earned>repeatRare.earned);
    await page.click('#continueBtn');
    // Selling, collection bonuses, and reloads never award or multiply XP.
    await page.evaluate(()=>{
      const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===1&&s.kind==='market');
      a.G.px=s.x;a.G.pz=s.z-3.8;a.openMarket();
    });
    await page.click('#sellAll');assert.equal(await page.evaluate(()=>__reelDeal.G.xp),repeatEpic.after.xp);
    await reload();assert.equal(await page.evaluate(()=>__reelDeal.G.xp),repeatEpic.after.xp);
    assert.equal(await page.evaluate(()=>__reelDeal.bag.length),0);

    // Land a normal repeat catch across every real license boundary.
    for(let destination=1;destination<ISLANDS.length;destination++){
      const departure=destination-1,bait=departure*4+3,sp=eligibleSpecies(departure,bait)[0];
      const beforeXP=xpForLevel(ISLANDS[destination].level)-1;
      await page.evaluate(({destination,departure,beforeXP,knownId})=>{
        const a=__reelDeal;a.G.xp=beforeXP;a.G.licenses=a.ISLANDS.slice(0,destination).map(i=>i.id);
        a.G.visited=[...a.G.licenses];a.G.boat=departure;a.G.ownedBoats=[...new Set([0,departure])];
        a.G.discoveries[knownId]??={count:1,best:0,first:''};a.spawnAtIsland(departure);a.updateStats();
      },{destination,departure,beforeXP,knownId:sp.id});
      assert.equal(await page.evaluate(id=>__reelDeal.hasLicense(id),destination),false);
      assert.match(await page.locator('#journeyObjective').textContent(),new RegExp(`${ISLANDS[destination].short} at level ${ISLANDS[destination].level}`));
      const result=await land(sp,bait);assert.equal(result.isNew,false);
      assert.equal(await page.evaluate(id=>__reelDeal.hasLicense(id),destination),true);
      assert.ok(result.saved.licenses.includes(destination));
      assert.match(await page.locator('#catchLevel').textContent(),new RegExp(`${ISLANDS[destination].short} license unlocked`));
      assert.equal(await page.locator('#catchLevel').isVisible(),true);
      if(destination===2)await page.screenshot({path:`${shots}/xp-sunscar-unlocked.png`});
      await reload();
      assert.equal(await page.evaluate(()=>__reelDeal.G.xp),beforeXP+result.earned);
      assert.equal(await page.evaluate(id=>__reelDeal.hasLicense(id),destination),true);
      assert.equal(await page.evaluate(id=>__reelDeal.G.ownedBoats.includes(id),destination),false,'XP licenses do not grant a free boat');
    }

    // A large mythic payout is readable on mobile; crossing the cap preserves total XP.
    await page.setViewportSize({width:390,height:844});
    const mythic=eligibleSpecies(5,23).at(-1),capXP=xpForLevel(99)-20;
    await page.evaluate(capXP=>{
      const a=__reelDeal;a.G.xp=capXP;a.G.licenses=[0,1,2,3,4,5];a.G.visited=[0,1,2,3,4,5];
      a.G.boat=5;a.G.ownedBoats=[0,5];a.spawnAtIsland(5);a.updateStats();
    },capXP);
    const final=await land(mythic,23,1);assert.equal(final.isNew,true);
    assert.equal(final.earned,2930);
    assert.equal(await page.locator('#levelNum').textContent(),'LV. 99');
    assert.equal(await page.locator('#xpText').textContent(),'MAX LEVEL');
    assert.equal(await page.locator('#catchLevel').textContent(),'LEVEL 99! · maximum level reached');
    assert.equal(await page.locator('#xpFill').evaluate(e=>e.style.width),'100%');
    const box=await page.locator('#catchModal .modal-card').boundingBox();
    assert.ok(box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=844);
    assert.equal(await page.locator('#catchPoints').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
    await page.screenshot({path:`${shots}/xp-mythic-mobile.png`});await page.click('#continueBtn');
    const capped=await land(mythic,23,1);assert.equal(capped.isNew,false);assert.equal(capped.earned,1953);
    assert.equal(await page.locator('#levelNum').textContent(),'LV. 99');
    await reload();assert.equal(await page.evaluate(()=>__reelDeal.G.xp),capXP+final.earned+capped.earned);
    assert.deepEqual(errors,[],'XP progression must not raise browser errors');
    console.log('PASS: exact new catch XP, rarity/weight upgrades, one-time +50% discovery, duplicate protection, unchanged v8 XP, sales/reloads, all five license unlocks, level-99 cap and mobile mythic payout');
  }finally{await page.close();}
};
