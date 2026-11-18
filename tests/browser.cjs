// Optional full-browser regression suite. Requires playwright-core and Chromium.
// TEST_URL defaults to npm start's port; set CHROMIUM_PATH for a local browser,
// or install @sparticuz/chromium to use its headless Linux build.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const URL=process.env.TEST_URL||'http://127.0.0.1:3100';
const shots=process.env.SCREENSHOT_DIR||'.artifacts';
fs.mkdirSync(shots,{recursive:true});

(async()=>{
  let executablePath=process.env.CHROMIUM_PATH,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'];
  if(!executablePath){const spart=require('@sparticuz/chromium').default;executablePath=await spart.executablePath();args=[...spart.args.filter(a=>a!=='--single-process'),...args];}
  const browser=await chromium.launch({executablePath,headless:true,args});
  const errors=[];
  const page=await browser.newPage({viewport:{width:1100,height:760}});
  function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
  watch(page);
  async function boot(p=page){await p.goto(URL,{waitUntil:'networkidle'});await p.waitForFunction(()=>!!window.__reelDeal);await p.click('#startBtn');await p.evaluate(()=>document.exitPointerLock?.());await p.waitForTimeout(200);}
  async function atVendor(kind,zone){await page.evaluate(({kind,zone})=>{const a=window.__reelDeal;a.closeShop();a.closeMarket();a.closeChart();a.closeIndex();if(zone!==undefined)a.spawnAtIsland(zone);const s=a.world.stalls.find(s=>s.zone===a.G.zone&&s.kind===kind);a.G.px=s.x;a.G.pz=s.z-3.8;a.G.state='aim';a.updateStats();},{kind,zone});await page.waitForTimeout(80);}
  async function screenshot(name){await page.waitForTimeout(150);await page.screenshot({path:`${shots}/${name}.png`});}
  try{
    await boot();
    const islandLevels=await page.evaluate(()=>__reelDeal.ISLANDS.map(i=>i.level));
    assert.deepEqual(islandLevels,[1,10,25,45,65,90]);
    assert.deepEqual(await page.evaluate(()=>__reelDeal.BOATS.map(b=>b.cost)),[0,550,4500,22500,130000,320000]);
    assert.deepEqual(await page.evaluate(()=>__reelDeal.BAITS.map(b=>Math.round(b.luck*100))),[0,3,7,11,15,19,24,29,33,38,43,48,53,58,64,69,74,80,85,91,96,102,107,113]);
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;return a.BOATS.slice(1).every(b=>b.cost>=1.25*Math.max(...[a.RODS,a.LINES,a.BAITS].flatMap(list=>list.slice((b.range-1)*4,b.range*4).map(g=>g.cost))));}),true);
    // Book secrecy + modal input isolation.
    await page.keyboard.press('f');
    assert.equal(await page.locator('.fish-entry.undiscovered').count(),120);
    assert.equal(await page.locator('.fish-entry.discovered').count(),0);
    assert.equal(await page.evaluate(()=>{const html=document.querySelector('#fishGrid').innerHTML;return window.__reelDeal.SPECIES.some(s=>html.includes(s.name));}),false);
    // Stable island-first, common-to-mythic ordering for every filter and discovery state.
    const indexOrder=await page.evaluate(()=>{const a=__reelDeal;return [...a.SPECIES].sort((a,b)=>a.island-b.island||__reelDeal.RARITY[a.rarity].tier-__reelDeal.RARITY[b.rarity].tier||a.number-b.number).map(sp=>({number:sp.number,island:sp.island}));});
    assert.deepEqual(indexOrder.map(sp=>sp.number),Array.from({length:120},(_,i)=>i+1));
    async function checkIndexOrder(island,filter,found=[]){
      await page.locator(`[data-index-island="${island}"]`).click();
      await page.selectOption('#indexFilter',filter);
      const actual=await page.locator('.fish-entry .entry-top>span:first-child').allTextContents();
      const expected=indexOrder.filter(sp=>(island<0||sp.island===island)&&(filter==='all'||(filter==='found'?found.includes(sp.number):!found.includes(sp.number)))).map(sp=>sp.number);
      assert.deepEqual(actual,expected.map(n=>'#'+String(n).padStart(3,'0')));
      if(filter==='all')assert.deepEqual(expected,Array.from({length:island<0?120:20},(_,i)=>(island<0?0:island*20)+i+1));
    }
    for(let island=-1;island<6;island++)await checkIndexOrder(island,'all');
    const foundNumbers=indexOrder.filter(sp=>sp.number%3===0).map(sp=>sp.number);
    await page.evaluate(numbers=>{const a=__reelDeal;a.G.discoveries=Object.fromEntries(a.SPECIES.filter(sp=>numbers.includes(sp.number)).map(sp=>[sp.id,{count:1,best:sp.minW,first:''}]));a.renderIndex();},foundNumbers);
    for(let island=-1;island<6;island++)for(const filter of ['all','found','missing'])await checkIndexOrder(island,filter,foundNumbers);
    assert.equal(await page.evaluate(()=>{const html=[...document.querySelectorAll('.fish-entry.undiscovered')].map(e=>e.outerHTML).join('');return __reelDeal.SPECIES.some(sp=>html.includes(sp.name));}),false);
    await page.evaluate(()=>{__reelDeal.G.discoveries={};__reelDeal.renderIndex();});
    await checkIndexOrder(-1,'all');
    assert.equal(await page.locator('.fish-entry.undiscovered').count(),120);
    console.log('PASS: consecutive #001–#120 index numbers in island/rarity order; filters retain numbers; unknown names stay hidden');

    const pos=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);
    await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');await page.keyboard.press('Space');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),pos);
    assert.equal(await page.evaluate(()=>__reelDeal.G.state),'aim');
    await screenshot('index-undiscovered');await page.keyboard.press('Escape');
    console.log('PASS: 120 secret entries; overlays cannot move/cast');

    // Every new level gate must agree across chart labels, disabled controls and runtime guards.
    for(let id=1;id<6;id++){
      await atVendor('port',0);
      await page.evaluate(id=>{const a=__reelDeal;a.G.xp=a.xpForLevel(a.ISLANDS[id].level)-1;a.G.licenses=[0];a.G.boat=0;a.G.ownedBoats=[0];a.G.coins=1000000;a.world.setBoat(0);a.openChart();a.updateStats();},id);
      await page.locator(`[data-destination="${id}"]`).click();
      assert.equal(await page.locator(`[data-destination="${id}"]`).evaluate(e=>e.classList.contains('locked')),true);
      assert.equal(await page.locator('#sailBtn').isDisabled(),true);
      assert.match(await page.locator('.destination-requirement').textContent(),new RegExp(`Reach level ${islandLevels[id]}`));
      assert.match(await page.locator('#journeyObjective').textContent(),new RegExp(`level ${islandLevels[id]}$`));
      await page.click('#boatsTab');
      assert.equal(await page.locator(`[data-boat="${id}"]`).isDisabled(),true);
      assert.equal(await page.locator(`[data-boat="${id}"]`).textContent(),`LEVEL ${islandLevels[id]} REQUIRED`);
      assert.equal(await page.evaluate(id=>{const a=__reelDeal;a.buyBoat(id);return a.G.boat===0&&a.G.coins===1000000&&!a.G.ownedBoats.includes(id);},id),true);
      // Even owning the right boat cannot bypass the level gate.
      assert.equal(await page.evaluate(id=>{const a=__reelDeal;a.G.boat=id;a.G.ownedBoats=[0,id];return a.sailTo(id);},id),false);
      await page.evaluate(id=>{const a=__reelDeal;a.G.xp=a.xpForLevel(a.ISLANDS[id].level);a.G.boat=0;a.G.ownedBoats=[0];a.G.coins=a.BOATS[id].cost;a.renderChart();},id);
      assert.equal(await page.locator(`[data-boat="${id}"]`).isDisabled(),false);
      await page.locator(`[data-boat="${id}"]`).click();
      assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.boat,__reelDeal.G.coins]),[id,0]);
      await page.click('#destinationsTab');await page.locator(`[data-destination="${id}"]`).click();
      assert.equal(await page.locator('#sailBtn').isDisabled(),false);
      await page.click('#sailBtn');await page.click('#skipVoyage');
      assert.equal(await page.evaluate(()=>__reelDeal.G.zone),id);
    }
    await atVendor('port',0);
    await page.evaluate(()=>{const a=__reelDeal;a.G.xp=0;a.G.licenses=[0];a.G.boat=0;a.G.ownedBoats=[0];a.G.visited=[0];a.G.coins=0;a.world.setBoat(0);a.saveGame();a.spawnAtIsland(0);a.updateStats();});
    console.log('PASS: all five wider level boundaries, chart/HUD labels, boat locks and exact-threshold voyages');

    // Boats require a physical dock, a license, and the exact price.
    await page.click('#mapBtn');await page.click('#boatsTab');
    assert.equal(await page.locator('[data-boat="1"]').isDisabled(),true);
    const noRemote=await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(a.ISLANDS.at(-1).level);a.G.coins=999999;const n=a.G.coins;a.buyBoat(5);return a.G.coins===n&&a.G.boat===0;});
    assert.equal(noRemote,true);
    await atVendor('port',0);await page.evaluate(()=>{const a=__reelDeal;a.G.xp=0;a.G.coins=999999;a.openChart();});
    await page.locator('[data-destination="1"]').click();assert.equal(await page.locator('#sailBtn').isDisabled(),true);
    assert.equal(await page.evaluate(()=>__reelDeal.sailTo(1)),false);
    await page.evaluate(()=>{const a=__reelDeal;const c=a.G.coins;a.buyBoat(1);if(a.G.coins!==c)throw Error('level gate bypass');a.G.xp=a.xpForLevel(a.ISLANDS[1].level);a.G.coins=a.BOATS[1].cost-1;a.renderChart();});
    await page.click('#boatsTab');assert.equal(await page.locator('[data-boat="1"]').isDisabled(),true);
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;a.buyBoat(1);return a.G.coins===a.BOATS[1].cost-1&&a.G.boat===0;}),true);
    await page.evaluate(()=>{__reelDeal.G.coins=__reelDeal.BOATS[1].cost;__reelDeal.renderChart();});
    await page.locator('[data-boat="1"]').click();
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.boat]),[0,1]);
    await page.click('#destinationsTab');await page.locator('[data-destination="1"]').click();await page.click('#sailBtn');
    assert.equal(await page.evaluate(()=>__reelDeal.G.state),'voyage');
    await screenshot('boat-crossing');await page.click('#skipVoyage');
    assert.equal(await page.evaluate(()=>__reelDeal.G.zone),1);
    assert.equal(await page.evaluate(()=>__reelDeal.walkable(__reelDeal.G.px,__reelDeal.G.pz)),true);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.zone,__reelDeal.G.boat,__reelDeal.level()]),[1,1,islandLevels[1]]);
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
    await atVendor('port',1);await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(a.ISLANDS.at(-1).level);a.openChart();});
    assert.equal(await page.evaluate(()=>__reelDeal.sailTo(2)),false,'correct level but wrong boat must fail');
    await page.click('#boatsTab');
    for(let id=2;id<6;id++){
      await page.evaluate(id=>{const a=__reelDeal;a.G.coins=a.BOATS[id].cost-1;a.renderChart();},id);
      assert.equal(await page.locator(`[data-boat="${id}"]`).isDisabled(),true);
      assert.equal(await page.evaluate(id=>{const a=__reelDeal;const before=a.G.coins;a.buyBoat(id);return a.G.coins===before&&!a.G.ownedBoats.includes(id);},id),true);
      await page.evaluate(id=>{const a=__reelDeal;a.G.coins=a.BOATS[id].cost+123;a.renderChart();},id);
      const shown=Number((await page.locator(`[data-boat="${id}"]`).textContent()).replace(/[^0-9]/g,''));
      const before=await page.evaluate(()=>__reelDeal.G.coins);
      await page.locator(`[data-boat="${id}"]`).click();
      assert.equal(before-await page.evaluate(()=>__reelDeal.G.coins),shown);
      assert.equal(await page.evaluate(()=>__reelDeal.G.coins),123);
    }
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;a.G.coins=0;a.buyBoat(1);return a.G.coins===0&&a.G.boat===1;}),true);
    console.log('PASS: all five boat premiums and exact charges, one-coin-short rejection, free re-equips; voyage and reload');

    // All 18 separate vendors display exactly their four local tiers.
    for(let zone=0;zone<6;zone++)for(const kind of ['rod','line','bait']){
      await atVendor(kind,zone);
      await page.evaluate(kind=>{const a=__reelDeal;a.G.xp=a.xpForLevel(a.ISLANDS.at(-1).level);a.G.coins=1000000;a.openShop(kind);},kind);
      const rows=await page.locator('#shopBody .rod-card').evaluateAll(rows=>rows.map(r=>Number(r.dataset.tier)));
      assert.deepEqual(rows,[zone*4,zone*4+1,zone*4+2,zone*4+3]);
      if(kind==='bait'){
        assert.match(await page.locator('#shopNote').textContent(),/small weight boost/);
        for(const tier of rows){
          const label=await page.evaluate(tier=>{const b=__reelDeal.BAITS[tier];return b.weightBonus?`WEIGHT UP TO +${(b.weightBonus*100).toLocaleString('en-US')}%`:'STANDARD WEIGHT';},tier);
          const info=await page.locator(`#shopBody [data-tier="${tier}"] .rod-info`).textContent();
          assert.ok(info.includes(label));
          const luck=await page.evaluate(tier=>Math.round(__reelDeal.BAITS[tier].luck*100),tier);
          assert.ok(info.includes(`LUCK +${luck}%`));
          const delta=await page.evaluate(tier=>{const a=__reelDeal;return tier>a.G.gear.bait?Math.round((a.BAITS[tier].luck-a.BAITS[a.G.gear.bait].luck)*100):null;},tier);
          if(delta!==null)assert.ok((await page.locator(`#shopBody [data-tier="${tier}"] .gear-delta`).textContent()).includes(`+${delta}% luck`));
        }
      }
      const wrong=((zone+1)%6)*4+2;
      const denied=await page.evaluate(({kind,wrong})=>{const a=__reelDeal;const before=a.G.coins;a.buyGear(kind,wrong);return a.G.coins===before;},{kind,wrong});assert.equal(denied,true);
      for(const buy of rows.filter(i=>i>0)){
        const cost=await page.evaluate(({kind,buy})=>{const a=__reelDeal;return ({rod:a.RODS,line:a.LINES,bait:a.BAITS})[kind][buy].cost;},{kind,buy});
        await page.evaluate(cost=>{__reelDeal.G.coins=cost-1;__reelDeal.renderShop();},cost);
        assert.equal(await page.locator(`#shopBody [data-tier="${buy}"] .buy-btn`).isDisabled(),true);
        assert.equal(await page.evaluate(({kind,buy})=>{const a=__reelDeal;const before=a.G.coins;a.buyGear(kind,buy);return a.G.coins===before&&!a.G.owned[kind].includes(buy);},{kind,buy}),true);
        await page.evaluate(cost=>{__reelDeal.G.coins=cost+123;__reelDeal.renderShop();},cost);
        const shown=Number((await page.locator(`[data-buy="${buy}"]`).textContent()).replace(/[^0-9]/g,''));
        assert.equal(shown,cost);
        const before=await page.evaluate(()=>__reelDeal.G.coins);
        await page.locator(`[data-buy="${buy}"]`).click();
        const after=await page.evaluate(()=>__reelDeal.G.coins);assert.equal(before-after,shown);assert.equal(after,123);
        assert.equal(await page.evaluate(kind=>__reelDeal.G.gear[kind],kind),buy);
      }
      // A new price must never recharge a tier the player already owns.
      const owned=zone===0?1:zone*4;
      await page.evaluate(()=>{__reelDeal.G.coins=0;__reelDeal.renderShop();});
      await page.locator(`[data-buy="${owned}"]`).click();
      assert.equal(await page.evaluate(()=>__reelDeal.G.coins),0);
      assert.equal(await page.evaluate(kind=>__reelDeal.G.gear[kind],kind),owned);
    }
    await screenshot('local-bait-shop');
    console.log('PASS: all 69 paid gear charges, shortages and free re-equips across 18 vendors');

    // Walkable routes to all five stalls; ocean and other islands stay out of bounds.
    const routes=await page.evaluate(()=>{
      const a=__reelDeal,fail=[];
      for(const i of a.ISLANDS){
        a.spawnAtIsland(i.id);
        const queue=[[0,4]],seen=new Set(['0,4']);
        for(let head=0;head<queue.length;head++){
          const [x,z]=queue[head];
          for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const nx=x+dx,nz=z+dz,key=nx+','+nz;
            if(!seen.has(key)&&a.walkable(i.x+nx,i.z+nz)){seen.add(key);queue.push([nx,nz]);}
          }
        }
        for(const s of a.world.stalls.filter(s=>s.zone===i.id)){
          if(!queue.some(([x,z])=>Math.hypot(i.x+x-s.x,i.z+z-s.z)<5.2))fail.push(i.name+': '+s.kind);
        }
        if(a.walkable(i.x+65,i.z-40))fail.push('walked on ocean');
        const other=a.ISLANDS[(i.id+1)%6];if(a.walkable(other.x,other.z+4))fail.push('crossed islands on foot');
      }
      return fail;
    });assert.deepEqual(routes,[]);
    console.log('PASS: all island docks and stalls reachable; no walking over water');

    // Valid low/mid/full releases lock the advertised luck even if the live meter changes later.
    const castResults=[];
    for(const rod of [0,23])for(const power of [0,.5,1]){
      const released=await page.evaluate(({rod,power})=>{
        const a=__reelDeal;a.closeShop();a.closeChart();a.closeIndex();a.spawnAtIsland(0);
        a.G.pz=-1.5;a.G.yaw=0;a.G.pitch=-.1;
        a.camera.position.set(a.G.px,a.G.camY,a.G.pz);a.camera.rotation.set(-.1,0,0,'YXZ');
        if(!a.walkable(a.G.px,a.G.pz))throw Error('Cast test must stand on the pier');
        a.G.gear={rod,line:rod,bait:0};a.G.state='aim';a.startCharge();a.G.power=power;a.updateCastMeter();
        const label=document.getElementById('castLuck').textContent;
        a.releaseCast();
        if(a.G.state!=='casting')throw Error('Test cast failed to reach water');
        const captured=a.G.castPower;
        a.G.power=1-power; // Should not change this released cast's luck.
        a.G.castT=1; // Skip only the flight animation, not release/landing/hook logic.
        return {label,captured};
      },{rod,power});
      assert.equal(released.captured,power);
      assert.equal(released.label,power===0?'LUCK -10%':power===1?'LUCK +10%':'LUCK 0%');
      await page.waitForFunction(()=>__reelDeal.G.state==='waiting');
      assert.ok((await page.locator('#prompt').textContent()).includes(released.label));
      const result=await page.evaluate(async()=>{
        const a=__reelDeal,random=Math.random;
        try{
          Math.random=()=>.5;a.landBobber();const wait=a.G.waitTimer;
          const expectedWait=4.1*(1-(a.BAITS[a.G.gear.bait].luck+(a.G.castPower*2-1)*.1)*.45);
          if(Math.abs(wait-expectedWait)>1e-10)throw Error('Bite wait ignored the released cast luck');
          a.triggerBite();let calls=0;Math.random=()=>calls++===0?0:.5;a.hookFish();
          const weight=a.G.fishWeight,power=a.G.castPower,distance=a.G.castDist;
          Math.random=()=>.5;
          a.G.surgeTimer=99;a.G.surgeDur=0;a.G.yankTimer=99;a.G.yankDur=0;a.G.reelHeld=false;
          async function measure(tension,duration){
            a.G.tension=tension;
            const time=a.G.time,progress=a.G.progress,start=performance.now();
            return new Promise((resolve,reject)=>{
              function frame(){
                if(a.G.state!=='reeling'||performance.now()-start>10000){reject(Error('Reel-rate test ended unexpectedly'));return;}
                if(a.G.time-time>=duration){resolve({rate:(a.G.progress-progress)/(a.G.time-time),delta:a.G.progress-progress});return;}
                a.G.tension=tension;requestAnimationFrame(frame);
              }requestAnimationFrame(frame);
            });
          }
          const green=await measure(45,.3),yellow=await measure(85,.2);
          return {weight,power,distance,rate:green.rate,expected:17*a.RODS[a.G.gear.rod].reel,yellow:yellow.delta};
        }finally{Math.random=random;a.G.state='aim';a.G.reelHeld=false;}
      });
      assert.equal(result.power,power);
      assert.equal(result.weight,power===0?1:power===.5?1.1:1.2);
      assert.ok(Math.abs(result.rate-result.expected)<1e-7,'green progress must not depend on cast power/distance');
      assert.equal(result.yellow,0,'yellow must still make no progress');
      castResults.push({rod,...result});
    }
    for(const rod of [0,23]){
      const results=castResults.filter(r=>r.rod===rod);
      assert.ok(results[0].distance<results[1].distance&&results[1].distance<results[2].distance);
    }
    assert.equal(await page.evaluate(()=>{
      const a=__reelDeal;a.G.castPower=1;a.G.px=0;a.G.pz=30;a.G.yaw=0;
      a.camera.position.set(0,a.G.camY,30);a.camera.rotation.set(-.1,0,0,'YXZ');
      a.G.state='aim';a.startCharge();a.G.power=0;a.releaseCast();
      return a.G.state==='aim'&&a.G.castPower===1;
    }),true,'an invalid cast must not overwrite the last valid snapshot');
    await page.evaluate(()=>{__reelDeal.G.castPower=.5;});
    console.log('PASS: -10/0/+10 cast luck, snapshot isolation, failed casts; identical green reel rate and yellow stalls at every distance');

    // Genuine casting + hooking + tension minigame (no direct catch award).
    await page.evaluate(()=>{const a=__reelDeal;a.closeShop();a.closeChart();a.spawnAtIsland(0);a.G.xp=0;a.G.coins=0;a.G.caught=0;a.G.discoveries={};a.bag.length=0;a.G.gear={rod:0,line:0,bait:0};a.G.owned={rod:[0],line:[0],bait:[0]};a.G.state='aim';a.updateStats();});
    await page.waitForTimeout(150);await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.62,null,{timeout:15000});await page.keyboard.up('Space');
    await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:15000}).catch(async e=>{console.log('CAST DEBUG',await page.evaluate(()=>({state:__reelDeal.G.state,power:__reelDeal.G.power,active:document.activeElement.tagName,shop:__reelDeal.shopOpen,chart:__reelDeal.chartOpen,index:__reelDeal.indexOpen,toast:document.getElementById('toast').textContent,pos:[__reelDeal.G.px,__reelDeal.G.pz],camera:__reelDeal.camera.position.toArray()})));await screenshot('cast-debug');throw e;});
    await page.evaluate(()=>{__reelDeal.G.waitTimer=.02;});
    await page.waitForFunction(()=>__reelDeal.G.state==='bite');await page.keyboard.press('Space');
    assert.equal(await page.evaluate(()=>__reelDeal.G.state),'reeling');
    assert.match(await page.locator('#reelFishName').textContent(),/Unidentified/);
    const fight=await page.evaluate(()=>new Promise(resolve=>{
      const a=__reelDeal,start=performance.now();
      function steer(){
        if(a.G.state!=='reeling'||performance.now()-start>45000){resolve({state:a.G.state,xp:a.G.xp,caught:a.G.caught,bag:a.bag.length,discovered:Object.keys(a.G.discoveries).length});return;}
        a.G.reelHeld=a.G.tension<(a.G.bandLo+a.G.bandHi)/2;requestAnimationFrame(steer);
      }steer();
    }));
    assert.equal(fight.state,'caught');assert.equal(fight.caught,1);assert.equal(fight.bag,1);assert.equal(fight.discovered,1);assert.ok(fight.xp>0);
    assert.equal(await page.locator('#newDiscovery').isVisible(),true);
    const noDuplicate=await page.evaluate(()=>{const a=__reelDeal;a.catchFish();return a.G.caught===1;});assert.equal(noDuplicate,true);
    await screenshot('new-discovery');await page.click('#continueBtn');
    await atVendor('market',0);await page.keyboard.press('e');
    const expected=Number((await page.locator('#sellAll').textContent()).replace(/[^0-9]/g,''));
    await page.click('#sellAll');assert.equal(await page.evaluate(()=>__reelDeal.G.coins),expected);
    assert.equal(await page.evaluate(()=>Object.keys(__reelDeal.G.discoveries).length),1);
    await page.click('#marketClose');await page.click('#indexBtn');assert.equal(await page.locator('.fish-entry.discovered').count(),1);assert.equal(await page.locator('.fish-entry.undiscovered').count(),119);
    await screenshot('index-first-catch');await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.equal(await page.evaluate(()=>Object.keys(__reelDeal.G.discoveries).length),1);assert.equal(await page.evaluate(()=>__reelDeal.bag.length),0);
    console.log('PASS: actual cast/hook/reel, new entry + XP, no duplicate award, sale, reload');

    // Same fish and random weight quantile: the equipped bait must affect the actual hook.
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
    const hookWeights=await page.evaluate(()=>{
      const a=__reelDeal,original=Math.random,weights=[];
      a.spawnAtIsland(0);a.G.owned.bait=[0,2];
      try{
        for(const bait of [0,2,0]){
          a.G.gear.bait=bait;a.G.state='bite';
          let calls=0;Math.random=()=>calls++===0?0:.5;
          a.hookFish();
          if(a.G.state!=='reeling')throw Error('Bait weight hook did not start');
          weights.push(a.G.fishWeight);
        }
      }finally{Math.random=original;}
      return weights;
    });
    assert.deepEqual(hookWeights,[1.1,1.2,1.1]);
    assert.equal(await page.evaluate(()=>__reelDeal.G.caught),1,'hook tests must not award extra catches');
    console.log('PASS: all 24 bait luck/weight stats and upgrade gaps; actual hooks get heavier and reset on re-equip');

    // v7 earned licenses remain usable below the new level, without changing XP or coins.
    await page.evaluate(()=>{const a=__reelDeal;localStorage.clear();localStorage.setItem('reel-deal-save-v7',JSON.stringify({version:7,coins:54321,xp:a.xpForLevel(22),caught:42,zone:3,visited:[0,1,2,3],boat:3,ownedBoats:[0,3],owned:{rod:[0,12],line:[0,12],bait:[0,11]},gear:{rod:12,line:12,bait:11}}));});
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;return [a.G.coins,a.G.xp===a.xpForLevel(22),a.G.zone,a.G.boat,a.G.licenses];}),[54321,true,3,3,[0,1,2,3]]);
    assert.equal(await page.evaluate(()=>!!localStorage.getItem('reel-deal-save-v8')&&!localStorage.getItem('reel-deal-save-v7')),true);
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
    assert.match(await page.locator('#journeyObjective').textContent(),/Emberforge at level 65/);
    await atVendor('rod',3);await page.evaluate(()=>__reelDeal.openShop('rod'));
    const retainedGearCost=await page.evaluate(()=>__reelDeal.RODS[13].cost);
    await page.locator('[data-buy="13"]').click();
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.gear.rod]),[54321-retainedGearCost,13]);
    await atVendor('port',3);await page.evaluate(()=>__reelDeal.openChart());await page.click('#boatsTab');
    await page.locator('[data-boat="0"]').click();await page.locator('[data-boat="3"]').click();
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.boat]),[54321-retainedGearCost,3]);
    // An earned-but-unpurchased boat can still be bought on its retained license.
    const retainedBoatCost=await page.evaluate(()=>__reelDeal.BOATS[2].cost);
    await page.locator('[data-boat="2"]').click();
    assert.equal(await page.evaluate(()=>__reelDeal.G.coins),54321-retainedGearCost-retainedBoatCost);
    await page.click('#destinationsTab');await page.locator('[data-destination="2"]').click();
    assert.match(await page.locator('#destinationDetail .eyebrow').textContent(),/RETAINED/);
    assert.equal(await page.locator('#sailBtn').isDisabled(),false);
    await page.click('#sailBtn');await page.click('#skipVoyage');
    assert.equal(await page.evaluate(()=>__reelDeal.G.zone),2);
    await atVendor('port',2);await page.evaluate(()=>__reelDeal.openChart());await page.locator('[data-destination="3"]').click();
    assert.equal(await page.locator('#sailBtn').isDisabled(),true,'retained license cannot bypass boat range');
    await page.click('#boatsTab');await page.locator('[data-boat="3"]').click();
    await page.click('#destinationsTab');await page.locator('[data-destination="3"]').click();
    assert.equal(await page.locator('#sailBtn').isDisabled(),false);
    // Reaching an OLD milestone after migration must not grant another old license on reload.
    await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(35);a.saveGame();});
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.equal(await page.evaluate(()=>__reelDeal.hasLicense(4)),false);
    assert.deepEqual(await page.evaluate(()=>__reelDeal.G.licenses),[0,1,2,3]);
    console.log('PASS: v7 licenses retained for travel, gear and boats; XP/coins preserved; migration is one-time');

    // Old-save migration through the actual boot path.
    await page.evaluate(()=>{localStorage.clear();localStorage.setItem('reel-life-3d-save-v6',JSON.stringify({coins:4321,caught:25,owned:{rod:[0,14],line:[0,12],bait:[0,10]},gear:{rod:14,line:12,bait:10},bag:[{n:'Bluegill',w:'1.2'}],log:[{n:'Bluegill',w:'1.2'}]}));});
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.gear.rod,__reelDeal.level(),__reelDeal.G.boat,__reelDeal.bag.length]),[4321,14,22,3,1]);
    assert.equal(await page.evaluate(()=>!!localStorage.getItem('reel-deal-save-v8')&&!localStorage.getItem('reel-life-3d-save-v6')),true);
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
    console.log('PASS: old save migrated without losing money, gear, fish or island access');

    // Screenshots of each biome, and all 30 boat routes avoid land.
    await page.setViewportSize({width:1365,height:850});
    await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(a.ISLANDS.at(-1).level);a.G.boat=5;a.G.ownedBoats=[0,1,2,3,4,5];a.world.setBoat(5);});
    const blocked=[];
    for(let from=0;from<6;from++)for(let to=0;to<6;to++)if(from!==to){
      await atVendor('port',from);
      const crosses=await page.evaluate(to=>{const a=__reelDeal;a.openChart();a.sailTo(to);const bad=[];for(let n=0;n<=100;n++){const p=a.voyage.curve.getPointAt(n/100);if(!a.inWater(p))bad.push([p.x,p.z]);}a.finishVoyage();return bad;},to);
      if(crosses.length)blocked.push({from,to,points:crosses.length});
    }
    assert.deepEqual(blocked,[]);
    for(let zone=0;zone<6;zone++){
      await page.evaluate(zone=>{const a=__reelDeal;a.spawnAtIsland(zone);a.G.state='aim';a.G.yaw=1.65;a.G.pitch=.13;a.updateStats();document.getElementById('arrivalBanner').classList.add('hidden');document.getElementById('toast').classList.add('hidden');},zone);
      await page.waitForTimeout(1000);await screenshot(`island-${zone+1}`);
    }
    await atVendor('port',5);await page.evaluate(()=>__reelDeal.openChart());await screenshot('sea-chart');await page.click('#boatsTab');await screenshot('boat-shop');await page.click('#chartClose');
    console.log('PASS: every sailing route avoids solid terrain; six biome previews captured');

    // No-match bait never falls back to the wrong fish; owned lower tiers work anywhere.
    await page.evaluate(()=>{const a=__reelDeal;a.spawnAtIsland(0);a.G.gear.bait=23;a.G.owned.bait=[0,23];a.G.state='aim';a.startCharge();});
    assert.equal(await page.evaluate(()=>__reelDeal.G.state),'aim');assert.equal(await page.evaluate(()=>__reelDeal.pickSpecies()),null);
    await page.click('#kitBtn');await page.locator('[data-tab="bait"]').click();await page.locator('[data-buy="0"]').click();
    assert.equal(await page.evaluate(()=>__reelDeal.G.gear.bait),0);assert.equal(await page.locator('#shopBody .rod-card').count(),2);
    await page.click('#shopClose');console.log('PASS: empty pools stay empty; owned bait re-equips remotely');

    // Mobile dialogs and joystick must work without leaking touches into fishing.
    const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const mp=await mobile.newPage();watch(mp);await boot(mp);
    const beforeYaw=await mp.evaluate(()=>__reelDeal.G.yaw);
    await mp.locator('#scene').dispatchEvent('pointerdown',{pointerId:5,pointerType:'touch',clientX:250,clientY:450,button:0});
    await mp.locator('#scene').dispatchEvent('pointermove',{pointerId:5,pointerType:'touch',clientX:310,clientY:450});
    await mp.locator('#scene').dispatchEvent('pointerup',{pointerId:5,pointerType:'touch',clientX:310,clientY:450});
    assert.notEqual(await mp.evaluate(()=>__reelDeal.G.yaw),beforeYaw);assert.equal(await mp.evaluate(()=>__reelDeal.G.state),'aim');
    await mp.locator('#stick').dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',clientX:45,clientY:710,button:0});
    await mp.locator('#stick').dispatchEvent('pointermove',{pointerId:8,pointerType:'touch',clientX:45,clientY:680});
    await mp.waitForTimeout(100);await mp.locator('#stick').dispatchEvent('pointerup',{pointerId:8,pointerType:'touch'});
    assert.equal(await mp.evaluate(()=>__reelDeal.G.state),'aim');
    await mp.click('#indexBtn');assert.equal(await mp.locator('.fish-entry').count(),120);
    await mp.screenshot({path:`${shots}/mobile-index.png`});await mp.click('#indexClose');await mp.click('#mapBtn');
    await mp.locator('[data-destination="5"]').click();assert.equal(await mp.locator('#sailBtn').isDisabled(),true);
    const box=await mp.locator('.expedition-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391&&box.y+box.height<=845);
    await mp.screenshot({path:`${shots}/mobile-chart.png`});await mp.click('#boatsTab');await mp.screenshot({path:`${shots}/mobile-boats.png`});
    await mp.click('#chartClose');
    await mp.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===0&&s.kind==='bait');a.G.px=s.x;a.G.pz=s.z-3.8;a.openShop('bait');});
    assert.match(await mp.locator('#shopBody [data-tier="1"] .rod-info').textContent(),/WEIGHT UP TO \+0\.5%/);
    assert.equal(await mp.locator('#shopBody').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
    await mp.screenshot({path:`${shots}/mobile-bait.png`});await mp.click('#shopClose');
    await mp.evaluate(()=>{const a=__reelDeal;a.spawnAtIsland(0);a.G.state='aim';a.startCharge();a.G.power=.75;a.G.powerDir=0;a.updateCastMeter();});
    assert.equal(await mp.locator('#castMeter').isVisible(),true);
    assert.equal(await mp.locator('#castLuck').textContent(),'LUCK +5%');
    assert.equal(await mp.locator('#castPowerValue').textContent(),'75%');
    assert.equal(await mp.locator('#castMeter').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&e.scrollWidth<=e.clientWidth;}),true);
    await mp.screenshot({path:`${shots}/mobile-cast-meter.png`});
    await mobile.close();console.log('PASS: mobile drag-look, joystick, index, chart, boat shop, bait stats and cast-luck meter');
    console.log('Renderer:',await page.evaluate(()=>({calls:__reelDeal.renderer.info.render.calls,triangles:__reelDeal.renderer.info.render.triangles})));
    assert.deepEqual(errors,[],'No browser errors allowed');
    console.log('ALL BROWSER CHECKS PASSED');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
