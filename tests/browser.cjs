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
    // Book secrecy + modal input isolation.
    await page.keyboard.press('f');
    assert.equal(await page.locator('.fish-entry.undiscovered').count(),120);
    assert.equal(await page.locator('.fish-entry.discovered').count(),0);
    assert.equal(await page.evaluate(()=>{const html=document.querySelector('#fishGrid').innerHTML;return window.__reelDeal.SPECIES.some(s=>html.includes(s.name));}),false);
    const pos=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);
    await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');await page.keyboard.press('Space');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),pos);
    assert.equal(await page.evaluate(()=>__reelDeal.G.state),'aim');
    await screenshot('index-undiscovered');await page.keyboard.press('Escape');
    console.log('PASS: 120 secret entries; overlays cannot move/cast');

    // Boats require a physical dock, a license, and the exact price.
    await page.click('#mapBtn');await page.click('#boatsTab');
    assert.equal(await page.locator('[data-boat="1"]').isDisabled(),true);
    const noRemote=await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(50);a.G.coins=999999;const n=a.G.coins;a.buyBoat(5);return a.G.coins===n&&a.G.boat===0;});
    assert.equal(noRemote,true);
    await atVendor('port',0);await page.evaluate(()=>{const a=__reelDeal;a.G.xp=0;a.G.coins=999999;a.openChart();});
    await page.locator('[data-destination="1"]').click();assert.equal(await page.locator('#sailBtn').isDisabled(),true);
    assert.equal(await page.evaluate(()=>__reelDeal.sailTo(1)),false);
    await page.evaluate(()=>{const a=__reelDeal;const c=a.G.coins;a.buyBoat(1);if(a.G.coins!==c)throw Error('level gate bypass');a.G.xp=a.xpForLevel(5);a.G.coins=a.BOATS[1].cost-1;a.renderChart();});
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
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.zone,__reelDeal.G.boat,__reelDeal.level()]),[1,1,5]);
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
    await atVendor('port',1);await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(50);a.openChart();});
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
    console.log('PASS: all five boat charges, one-coin-short rejection, free re-equips; voyage and reload');

    // All 18 separate vendors display exactly their four local tiers.
    for(let zone=0;zone<6;zone++)for(const kind of ['rod','line','bait']){
      await atVendor(kind,zone);
      await page.evaluate(kind=>{const a=__reelDeal;a.G.xp=a.xpForLevel(60);a.G.coins=1000000;a.openShop(kind);},kind);
      const rows=await page.locator('#shopBody .rod-card').evaluateAll(rows=>rows.map(r=>Number(r.dataset.tier)));
      assert.deepEqual(rows,[zone*4,zone*4+1,zone*4+2,zone*4+3]);
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

    // Old-save migration through the actual boot path.
    await page.evaluate(()=>{localStorage.clear();localStorage.setItem('reel-life-3d-save-v6',JSON.stringify({coins:4321,caught:25,owned:{rod:[0,14],line:[0,12],bait:[0,10]},gear:{rod:14,line:12,bait:10},bag:[{n:'Bluegill',w:'1.2'}],log:[{n:'Bluegill',w:'1.2'}]}));});
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.coins,__reelDeal.G.gear.rod,__reelDeal.level(),__reelDeal.G.boat,__reelDeal.bag.length]),[4321,14,22,3,1]);
    assert.equal(await page.evaluate(()=>!!localStorage.getItem('reel-deal-save-v7')&&!localStorage.getItem('reel-life-3d-save-v6')),true);
    await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());
    console.log('PASS: old save migrated without losing money, gear, fish or island access');

    // Screenshots of each biome, and all 30 boat routes avoid land.
    await page.setViewportSize({width:1365,height:850});
    await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(60);a.G.boat=5;a.G.ownedBoats=[0,1,2,3,4,5];a.world.setBoat(5);});
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
    await mobile.close();console.log('PASS: mobile drag-look, joystick, index, chart, boat shop');
    console.log('Renderer:',await page.evaluate(()=>({calls:__reelDeal.renderer.info.render.calls,triangles:__reelDeal.renderer.info.render.triangles})));
    assert.deepEqual(errors,[],'No browser errors allowed');
    console.log('ALL BROWSER CHECKS PASSED');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
