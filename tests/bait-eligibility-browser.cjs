// Regression for Pinewater's #040 and the misleading Salmon Egg / Cheese Cube pool counts.
const assert=require('node:assert/strict');
module.exports=async function testBaitEligibility(browser,url,shots){
  const errors=[];
  const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  async function boot(p){
    await p.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
    await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>!!window.__reelDeal);
  }
  async function resume(p){await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>!!window.__reelDeal);await p.click('#startBtn');}
  async function seed(p){
    await p.evaluate(()=>{
      const a=__reelDeal,known=a.SPECIES.filter(sp=>sp.island===1&&sp.number!==40);
      const discoveries=Object.fromEntries(known.map(sp=>[sp.id,{count:1,best:sp.minW,first:'2026-11-13'}]));
      localStorage.setItem('reel-deal-save-v8',JSON.stringify({version:8,coins:1234,xp:a.xpForLevel(25),caught:19,
        zone:1,boat:2,ownedBoats:[0,1,2],licenses:[0,1,2],discoveries,
        owned:{rod:[0,7],line:[0,7],bait:[0,7,8,9,10,11]},gear:{rod:7,line:7,bait:7},
        bag:[{n:'Rainbow Trout',w:3.6}],log:known.map(sp=>({n:sp.name,w:sp.minW}))}));
    });await resume(p);
  }
  async function bag(p){await p.click('#bagBtn');await p.click('#bagTab-bait');}
  async function checkPinewaterBag(p){
    assert.match(await p.locator('#bagNote').textContent(),/rarity range applies to all fish sizes/);
    for(const [tier,count,range] of [[7,14,'RARE–EPIC'],[8,14,'RARE–EPIC'],[9,15,'RARE–LEGENDARY'],[10,15,'RARE–LEGENDARY'],[11,15,'RARE–LEGENDARY']]){
      const row=p.locator(`#bagBody [data-tier="${tier}"]`);
      assert.equal(await row.locator('.local-pool').textContent(),`${count} possible species in Pinewater`);
      const info=await row.locator('.rod-info').textContent();assert.ok(info.includes(`CATCHES ${range} · ALL SIZES`));
      assert.doesNotMatch(info,/SPECIES MAX/);
    }
  }
  const page=await browser.newPage({viewport:{width:1100,height:760}});watch(page);
  try{
    await boot(page);await page.click('#startBtn');
    // Every displayed owned-bait count must equal the actual picker pool, including
    // return trips. Do not merely replace 13 with 15 in Pinewater's shop text.
    for(let island=0;island<6;island++){
      await page.evaluate(island=>{
        const a=__reelDeal;a.closeBag();a.G.xp=a.xpForLevel(90);a.G.licenses=[0,1,2,3,4,5];a.G.boat=5;a.G.ownedBoats=[0,5];
        a.spawnAtIsland(island);a.G.owned.bait=Array.from({length:24},(_,i)=>i);a.openBag('bait');
      },island);
      const counts=await page.evaluate(()=>{
        const a=__reelDeal;
        return [...document.querySelectorAll('#bagBody [data-tier]')].map(row=>{
          const tier=+row.dataset.tier,count=a.eligibleSpecies(a.G.zone,tier).length;
          return [row.querySelector('.local-pool').textContent,count?`${count} possible species in ${a.ISLANDS[a.G.zone].short}`:'NO BITES IN THESE WATERS'];
        });
      });
      assert.equal(counts.length,24);for(const [actual,expected] of counts)assert.equal(actual,expected);
      await page.click('#bagClose');
    }
    for(const tier of [9,10,11]){
      await seed(page);
      await page.click('#indexBtn');await page.locator('[data-index-island="1"]').click();
      assert.match(await page.locator('#collectionBonusTitle').textContent(),/19\/20/);
      const unknown=page.locator('.fish-entry.undiscovered');assert.equal(await unknown.count(),1);
      assert.match(await unknown.textContent(),/#040.*UNDISCOVERED.*\?\?\?/);
      const secret=await page.evaluate(()=>__reelDeal.SPECIES.find(sp=>sp.number===40).name);
      assert.equal((await unknown.evaluate(e=>e.outerHTML)).includes(secret),false,'never spoil the final fish before landing');
      await page.click('#indexClose');await bag(page);await checkPinewaterBag(page);
      if(tier===11){await page.evaluate(()=>document.getElementById('toast').classList.add('hidden'));await page.screenshot({path:`${shots}/pinewater-bait-pools.png`});}
      await page.locator(`#bagBody [data-buy="${tier}"]`).click();await page.click('#bagClose');
      assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.gear.bait]),[1234,tier]);
      const before=await page.evaluate(()=>({xp:__reelDeal.G.xp,caught:__reelDeal.G.caught,bonus:__reelDeal.collectionCoinBonus(__reelDeal.G.discoveries)}));
      assert.equal(before.bonus,0);

      // A real charge/release/flight, followed by the real hook and tension loop.
      // Select #040's legitimate RNG interval; do not insert a catch into the bag.
      await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.62);await page.keyboard.up('Space');
      await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:15000});
      const landed=await page.evaluate(async()=>{
        const a=__reelDeal,b=a.BAITS[a.G.gear.bait],pool=a.eligibleSpecies(a.G.zone,a.G.gear.bait),luck=a.effectiveLuck(a.G.gear.bait,a.G.castPower);
        const weights=pool.map(sp=>sp.weight*(1+2*luck)**(a.RARITY[sp.rarity].tier-b.lo)),index=pool.findIndex(sp=>sp.number===40);
        if(index<0)throw Error('Next-area bait incorrectly excludes Pinewater #040');
        const total=weights.reduce((sum,w)=>sum+w,0),q=(weights.slice(0,index).reduce((sum,w)=>sum+w,0)+weights[index]/2)/total;
        const random=Math.random;
        try{a.triggerBite();let calls=0;Math.random=()=>calls++===0?q:.5;a.hookFish();}finally{Math.random=random;}
        const hidden=document.getElementById('reelFishName').textContent.includes('Unidentified fish');
        const bonusBefore=a.collectionCoinBonus(a.G.discoveries),start=performance.now();
        const state=await new Promise(resolve=>{
          function steer(){
            if(a.G.state!=='reeling'||performance.now()-start>45000){resolve(a.G.state);return;}
            a.G.reelHeld=a.G.tension<(a.G.bandLo+a.G.bandHi)/2;requestAnimationFrame(steer);
          }steer();
        });
        const last=a.bag.at(-1);
        return {state,hidden,bonusBefore,number:last?.sp.number,weight:Number(last?.weight),
          expectedXP:last?a.catchXP(last.sp,Number(last.weight),true):0,xp:a.G.xp,caught:a.G.caught,coins:a.G.coins,bonus:a.collectionCoinBonus(a.G.discoveries)};
      });
      assert.equal(landed.state,'caught');assert.equal(landed.hidden,true);assert.equal(landed.bonusBefore,0);
      assert.equal(landed.number,40);assert.equal(landed.caught,before.caught+1);assert.equal(landed.xp,before.xp+landed.expectedXP);
      assert.equal(landed.coins,1234);assert.equal(landed.bonus,5);
      assert.match(await page.locator('#collectionReward').textContent(),/Pinewater index complete!.*\+5% sale coins forever/);
      await page.click('#continueBtn');await page.click('#indexBtn');await page.locator('[data-index-island="1"]').click();
      assert.equal(await page.locator('.fish-entry.discovered').count(),20);assert.equal(await page.locator('.fish-entry.undiscovered').count(),0);
      await page.click('#indexClose');
      await resume(page);
      assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.gear.bait,__reelDeal.G.coins,__reelDeal.bag.at(-1).sp.number,__reelDeal.collectionCoinBonus(__reelDeal.G.discoveries)]),[tier,1234,40,5]);
    }
    console.log('PASS: all 144 displayed bait pools match actual eligibility; Pinewater 14→15 pools; #040 remains secret/local-bait-ineligible, but all three next-area Rare–Legendary baits genuinely cast/hook/reel/land it, award the 20th-entry +5% once and survive reload');
  }catch(e){await page.screenshot({path:`${shots}/bait-eligibility-failure.png`});throw e;}
  finally{await page.close();}

  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const mp=await context.newPage();watch(mp);
  try{
    await boot(mp);await seed(mp);
    for(const viewport of [{width:390,height:844},{width:360,height:740},{width:844,height:390}]){
      await mp.setViewportSize(viewport);await mp.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
      await mp.tap('#bagBtn');await mp.tap('#bagTab-bait');await checkPinewaterBag(mp);
      assert.equal(await mp.locator('.bag-card').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&e.scrollWidth<=e.clientWidth;}),true);
      assert.equal(await mp.locator('#bagBody').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.clientHeight>80),true);
      await mp.locator('#bagBody [data-buy="11"]').tap();await mp.locator('#bagBody [data-buy="7"]').tap();
      assert.deepEqual(await mp.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.gear.bait,__reelDeal.G.state]),[1234,7,'aim']);
      if(viewport.width===390)await mp.screenshot({path:`${shots}/pinewater-bait-pools-mobile.png`});
      await mp.tap('#bagClose');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: phone/short-landscape eligibility labels, scrolling and free touch re-equips; no browser errors or save migration');
  }catch(e){await mp.screenshot({path:`${shots}/bait-eligibility-mobile-failure.png`});throw e;}
  finally{await context.close();}
};
