// Destination prices and actual, not just advertised, island gear upgrades.
const assert=require('node:assert/strict');
module.exports=async function testIslandGear(browser,url,shots){
  const errors=[],entries=[715,5850,29250,169000,416000];
  const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  async function boot(p){
    await p.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
    await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>!!window.__reelDeal);await p.click('#startBtn');
  }
  async function shop(p,kind){
    await p.evaluate(kind=>{const a=__reelDeal;a.closeShop();const s=a.world.stalls.find(s=>s.zone===a.G.zone&&s.kind===kind);a.G.px=s.x;a.G.pz=s.z-3.8;a.openShop(kind);},kind);
  }
  const page=await browser.newPage({viewport:{width:1280,height:800}});watch(page);
  try{
    await boot(page);
    for(let island=1;island<6;island++){
      const entry=entries[island-1],tier=island*4;
      const before=await page.evaluate(({island,tier})=>{
        const a=__reelDeal;a.closeShop();a.G.xp=a.xpForLevel(90);a.G.licenses=[0,1,2,3,4,5];
        a.G.boat=5;a.G.ownedBoats=[0,5]; // A better boat must not inflate earlier island prices.
        a.spawnAtIsland(island);a.G.state='aim';
        for(const kind of ['rod','line','bait']){a.G.gear[kind]=tier-1;a.G.owned[kind]=[0,tier-1];}
        a.updateStats();const sp=a.SPECIES.find(s=>s.island===island);
        a.fightSetup(sp,(sp.minW+sp.maxW)/2);
        return {supply:a.G.supply,ratio:a.G.ratio,width:a.G.bandHi-a.G.bandLo,xp:a.G.xp,caught:a.G.caught};
      },{island,tier});
      for(const kind of ['rod','line','bait']){
        await shop(page,kind);
        const note=await page.locator('#shopNote').textContent();
        assert.ok(note.includes(`Entry gear: ${entry.toLocaleString('en-US')}c`));assert.match(note,/30% above/);
        const cost=await page.evaluate(({kind,tier})=>({rod:__reelDeal.RODS,line:__reelDeal.LINES,bait:__reelDeal.BAITS})[kind][tier].cost,{kind,tier});
        assert.equal(cost,entry);
        const delta=await page.locator(`#shopBody [data-tier="${tier}"] .gear-delta`).textContent();
        if(kind==='rod')assert.match(delta,/\+2[567]% reel speed/);
        if(kind==='line')assert.match(delta,/1[6789]% less strain/);
        if(kind==='bait')assert.match(delta,/\+1[23]% luck/);
        await page.evaluate(cost=>{__reelDeal.G.coins=cost-1;__reelDeal.updateStats();__reelDeal.renderShop();},cost);
        assert.equal(await page.locator(`#shopBody [data-tier="${tier}"] .buy-btn`).isDisabled(),true);
        assert.equal(await page.evaluate(({kind,tier})=>{const a=__reelDeal,c=a.G.coins;a.buyGear(kind,tier);return a.G.coins===c&&!a.G.owned[kind].includes(tier);},{kind,tier}),true);
        await page.evaluate(cost=>{__reelDeal.G.coins=cost+123;__reelDeal.updateStats();__reelDeal.renderShop();},cost);
        await page.evaluate(()=>document.getElementById('toast').classList.add('hidden'));
        if(island===1||island===5)await page.screenshot({path:`${shots}/island-${island}-entry-${kind}.png`});
        await page.locator(`#shopBody [data-buy="${tier}"]`).click();
        assert.deepEqual(await page.evaluate(kind=>[__reelDeal.G.coins,__reelDeal.G.gear[kind]],kind),[123,tier]);
        await page.click('#shopClose');
      }
      const after=await page.evaluate(island=>{
        const a=__reelDeal,sp=a.SPECIES.find(s=>s.island===island);a.fightSetup(sp,(sp.minW+sp.maxW)/2);
        return {supply:a.G.supply,ratio:a.G.ratio,width:a.G.bandHi-a.G.bandLo,xp:a.G.xp,caught:a.G.caught};
      },island);
      assert.ok(after.supply>before.supply*1.3);assert.ok(after.ratio<before.ratio*.8);
      assert.ok(after.width>before.width*1.1,'stronger tackle must actually widen the green zone');
      assert.equal(after.xp,before.xp);assert.equal(after.caught,before.caught);

      const effects=await page.evaluate(async tier=>{
        const a=__reelDeal,random=Math.random,gear={...a.G.gear},sp=a.SPECIES.find(s=>s.island===a.G.zone),rates=[];
        try{
          const baits=[];
          for(const index of [tier-1,tier]){
            a.G.gear.bait=index;a.G.castPower=.5;Math.random=()=>.5;a.landBobber();
            baits.push({wait:a.G.waitTimer,weight:a.rollWeight(sp)});a.G.state='aim';
          }
          a.G.gear.bait=tier;
          for(const index of [tier-1,tier]){
            a.G.gear.rod=index;a.G.state='bite';Math.random=()=>.5;a.hookFish();
            a.G.surgeTimer=99;a.G.surgeDur=0;a.G.yankTimer=99;a.G.yankDur=0;a.G.reelHeld=false;a.G.tension=45;
            const start=a.G.time,progress=a.G.progress,wall=performance.now();
            const rate=await new Promise((resolve,reject)=>{
              function frame(){
                if(a.G.state!=='reeling'||performance.now()-wall>10000){reject(Error('Island reel-rate measurement interrupted'));return;}
                if(a.G.time-start>=.15){resolve((a.G.progress-progress)/(a.G.time-start));return;}
                a.G.tension=45;requestAnimationFrame(frame);
              }requestAnimationFrame(frame);
            });
            rates.push({rate,expected:17*a.RODS[index].reel});a.G.state='aim';
          }
          return {baits,rates};
        }finally{
          Math.random=random;a.G.gear=gear;a.G.state='aim';a.updateStats();
          // Use the normal early-reel input below to clear all transient fight UI.
          a.landBobber();a.G.waitTimer=99;
        }
      },tier);
      await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__reelDeal.G.state),'aim');
      assert.ok(effects.baits[1].wait<effects.baits[0].wait);assert.ok(effects.baits[1].weight>effects.baits[0].weight);
      for(const r of effects.rates)assert.ok(Math.abs(r.rate-r.expected)<1e-7);
      assert.ok(effects.rates[1].rate/effects.rates[0].rate>=1.25,'new island reel speed must improve gameplay, not just its label');

      await page.evaluate(()=>{__reelDeal.G.coins=0;__reelDeal.updateStats();});
      await page.click('#bagBtn');await page.click('#bagTab-lines');
      await page.locator(`#bagBody [data-buy="${tier-1}"]`).click();await page.locator(`#bagBody [data-buy="${tier}"]`).click();
      assert.equal(await page.evaluate(()=>__reelDeal.G.coins),0);await page.click('#bagClose');
      await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await page.click('#startBtn');
      assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.gear.line]),[0,tier]);
    }
    console.log('PASS: all 15 arrival gear prices, minimum-boat pricing even with a better boat, shortages/exact charges, new rod/line fight control, actual +25% reel speed, bait wait/weight gains, free owned re-equips and reloads');
  }catch(e){await page.screenshot({path:`${shots}/island-gear-failure.png`});throw e;}
  finally{await page.close();}

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const mp=await mobile.newPage();watch(mp);
  try{
    await boot(mp);
    for(const viewport of [{width:390,height:844},{width:360,height:740},{width:844,height:390}]){
      await mp.setViewportSize(viewport);await mp.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
      for(const kind of ['rod','line','bait']){
        await mp.evaluate(()=>{
          const a=__reelDeal;a.G.xp=a.xpForLevel(90);a.G.licenses=[0,1,2,3,4,5];a.G.boat=5;a.G.ownedBoats=[0,5];a.spawnAtIsland(5);
          a.G.coins=1000000;for(const kind of ['rod','line','bait']){a.G.owned[kind]=[0,19];a.G.gear[kind]=19;}a.updateStats();
        });
        await shop(mp,kind);
        assert.equal(await mp.locator('#shopOverlay .shop-card').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth;}),true);
        assert.equal(await mp.locator('#shopBody').evaluate(e=>e.clientHeight>=80&&e.scrollWidth<=e.clientWidth),true);
        assert.match(await mp.locator('#shopNote').textContent(),/416,000c — 30% above.*320,000c/);
        if(kind==='rod'&&viewport.width===390)await mp.screenshot({path:`${shots}/island-gear-mobile.png`});
        const price=await mp.evaluate(kind=>({rod:__reelDeal.RODS,line:__reelDeal.LINES,bait:__reelDeal.BAITS})[kind][23].cost,kind);
        await mp.locator('#shopBody [data-buy="23"]').tap();
        assert.equal(await mp.evaluate(()=>__reelDeal.G.coins),1000000-price);
        if(kind==='bait'&&viewport.width===844)await mp.screenshot({path:`${shots}/island-gear-landscape.png`});
        await mp.tap('#shopClose');
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: price-rule notes and stronger-stat comparisons fit phone/short-landscape shops; touch-scroll purchases charge exact new prices');
  }catch(e){await mp.screenshot({path:`${shots}/island-gear-mobile-failure.png`});throw e;}
  finally{await mobile.close();}
};
