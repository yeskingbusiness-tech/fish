// Unified inventory, contextual hints, Help and screenshot-mode regressions.
// Also invoked by tests/browser.cjs; uses the actual keyboard, click and touch paths.
const assert=require('node:assert/strict');

module.exports=async function testUI(browser,url,shots){
  const errors=[];
  function watch(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
  async function boot(page){
    // Exercise the supported no-pointer-lock fallback deterministically.
    await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    assert.match(await page.locator('#startOverlay h2').textContent(),/REEL DEAL/);
    await page.click('#startBtn');
  }
  async function seed(page){
    await page.evaluate(()=>{
      const a=__reelDeal; a.G.state='menu'; // Fixture replacement must not be overwritten by pagehide autosave.
      const bag=[{n:'Bluegill',w:'1.2'},{n:'Rainbow Trout',w:'3.6'}];
      localStorage.setItem('reel-deal-save-v9',JSON.stringify({version:9,coins:1234,xp:a.xpForLevel(90),caught:1234,
        best:{name:'Rainbow Trout',weight:'3.6'},bag,log:bag,zone:0,boat:5,ownedBoats:[0,5],licenses:[0,1,2,3,4,5],
        owned:{rod:[0,3,7],line:[0,3,7],bait:[0,3,7]},gear:{rod:3,line:3,bait:3}}));
    });
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await page.click('#startBtn');
    await page.evaluate(()=>__reelDeal.saveGame());
  }
  async function pier(page){
    const time=await page.evaluate(()=>{const a=__reelDeal;a.spawnAtIsland(0);a.G.pz=-1.5;a.G.yaw=0;a.G.pitch=-.1;a.camera.position.set(a.G.px,a.G.camY,a.G.pz);a.camera.rotation.set(-.1,0,0,'YXZ');a.updateStats();return a.G.time;});
    // Contextual hints/vendor proximity update on the next simulation frame;
    // an 80ms sleep can expire before that frame on a busy software renderer.
    await page.waitForFunction(time=>__reelDeal.G.time>time,time);
  }
  async function vendor(page,kind){
    const time=await page.evaluate(kind=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===a.G.zone&&s.kind===kind);a.G.px=s.approach.x;a.G.pz=s.approach.z;return a.G.time;},kind);
    await page.waitForFunction(time=>__reelDeal.G.time>time,time);
  }
  const fits=el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&el.scrollWidth<=el.clientWidth+1;};
  async function capture(page,name){await page.evaluate(()=>document.getElementById('toast').classList.add('hidden'));await page.screenshot({path:`${shots}/${name}.png`});}
  const page=await browser.newPage({viewport:{width:1280,height:800}});watch(page);
  try{
    await boot(page);
    assert.equal(await page.locator('#hud .brand, #hud #bestNum, #hud #caughtCount, .controls-hint, #kitBtn, #fishBagOverlay').count(),0);
    assert.equal(await page.locator('#coinCount').isVisible(),true);assert.equal(await page.locator('#xpText').isVisible(),true);
    assert.equal(await page.locator('#bagBtn').count(),1);
    // Existing island panel and navigation retain their layout and entry points.
    assert.deepEqual(await page.locator('.hud-actions button').evaluateAll(es=>es.map(e=>e.id)),['boardBoatBtn','mapBtn','indexBtn','bagBtn','viewBtn']);
    assert.deepEqual(await page.locator('.location-card').evaluate(e=>{const r=e.getBoundingClientRect();return[r.left,r.top,r.width];}),[20,100,236]);
    await page.keyboard.press('b');assert.equal(await page.locator('#bagOverlay').isVisible(),true);
    assert.match(await page.locator('#bagBody').textContent(),/No fish in your bag yet/);
    assert.deepEqual(await page.locator('#bagTabs [role="tab"]').allTextContents(),['Fish','Rods','Lines','Bait']);
    await page.keyboard.press('Escape');await seed(page);

    await page.click('#logBtn');
    assert.equal(await page.locator('#caughtCount').textContent(),'1,234');
    assert.equal(await page.locator('#bestNum').textContent(),'3.6 lb');
    assert.equal(await page.locator('#bestFishName').textContent(),'Rainbow Trout');
    assert.match(await page.locator('#logSummary').textContent(),/2 recent catches/);
    await capture(page,'ui-catch-log');await page.keyboard.press('Escape');
    assert.equal(await page.locator('#caughtCount').isVisible(),false);

    await page.click('#bagBtn');await capture(page,'ui-bag-fish');
    const position=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);
    await page.locator('#bagTab-fish').focus();
    for(const [key,expected] of [['ArrowLeft','bait'],['ArrowRight','fish'],['ArrowRight','rods'],['ArrowRight','lines'],['End','bait'],['Home','fish']]){
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(()=>__reelDeal.bagTab),expected);
      assert.equal(await page.locator('#bagTabs [aria-selected="true"]').count(),1);
      assert.equal(await page.locator('#bagTabs [tabindex="0"]').getAttribute('id'),'bagTab-'+expected);
      assert.equal(await page.locator('#bagBody').getAttribute('aria-labelledby'),'bagTab-'+expected);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'bagTab-'+expected);
    }
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),position);
    assert.equal(await page.evaluate(()=>__reelDeal.selectBagTab('invalid')),false);
    assert.equal(await page.locator('#shopOverlay').isVisible(),false);
    const ownership=await page.evaluate(()=>JSON.stringify(__reelDeal.G.owned));
    for(const [tab,kind] of [['rods','rod'],['lines','line'],['bait','bait']]){
      await page.click('#bagTab-'+tab);
      assert.deepEqual(await page.locator('#bagBody [data-tier]').evaluateAll(es=>es.map(e=>+e.dataset.tier)),[0,3,7]);
      assert.equal(await page.evaluate(()=>__reelDeal.holdFish(0)),false,'gear tab cannot trigger hidden fish actions');
      for(const index of [7,0]){
        await page.locator(`#bagBody [data-buy="${index}"]`).click();
        assert.equal(await page.evaluate(kind=>__reelDeal.G.gear[kind],kind),index);
        assert.equal(await page.evaluate(()=>__reelDeal.G.coins),1234);
        assert.equal(await page.evaluate(()=>document.activeElement.id),'bagBody','re-render must not drop focus behind the modal');
      }
      assert.equal(await page.evaluate(kind=>{const a=__reelDeal;a.buyGear(kind,1);return a.G.coins===1234&&!a.G.owned[kind].includes(1);},kind),true,'bag cannot purchase local or remote stock');
      assert.equal(await page.locator('#bagBody .unowned').count(),0);
      if(tab==='bait')assert.match(await page.locator('#bagBody').textContent(),/possible species in Reedhaven/);
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(__reelDeal.G.owned)),ownership);
    await page.keyboard.press('b');await page.keyboard.press('i');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.bagOpen,__reelDeal.bagTab,__reelDeal.shopOpen]),[true,'bait',false]);
    await page.keyboard.press('i');assert.equal(await page.locator('#bagOverlay').isVisible(),false);
    await page.keyboard.press('b');assert.equal(await page.evaluate(()=>__reelDeal.bagTab),'fish');
    await page.keyboard.press('i');assert.equal(await page.evaluate(()=>__reelDeal.bagTab),'bait');
    await page.click('#bagTab-rods');await capture(page,'ui-bag-rods');
    await page.click('#bagTab-fish');await page.locator('[data-hold-fish="1"]').click();
    assert.equal(await page.locator('#heldFishName').textContent(),'Rainbow Trout');
    assert.equal(await page.locator('#heldFishWeight').textContent(),'3.6 lb');
    assert.doesNotMatch(await page.locator('#heldFishBar').textContent(),/SHOWING|still in/);
    assert.equal(await page.locator('#prompt').isVisible(),false);
    assert.ok((await page.locator('#heldFishBar').boundingBox()).height<=50);
    await page.keyboard.press('v');await capture(page,'ui-clean-desktop');
    console.log('PASS: unified Fish/Rods/Lines/Bait tabs, keyboard navigation, B/I aliases, free remote re-equips, purchase guards, compact held strip and Catch Log records');

    // Native Space activation on Help, then modal focus/input isolation.
    await page.locator('#helpBtn').focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>__reelDeal.helpOpen&&document.activeElement.id==='helpClose');
    assert.equal(await page.locator('#hud').evaluate(e=>e.inert),true);
    assert.match(await page.locator('#helpBody').textContent(),/Hide HUD/);await capture(page,'ui-help-desktop');
    await page.locator('#helpClose').focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'helpBody');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'helpClose');
    await page.locator('#helpBody').focus();
    const helpPosition=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz,__reelDeal.G.thirdPerson,__reelDeal.heldCatch.sp.name]);
    await page.keyboard.down('w');await page.waitForTimeout(100);await page.keyboard.up('w');
    for(const key of ['Space','b','i','m','f','v','x','h','e','r'])await page.keyboard.press(key);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz,__reelDeal.G.thirdPerson,__reelDeal.heldCatch.sp.name]),helpPosition);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.state,__reelDeal.helpOpen,__reelDeal.bagOpen,__reelDeal.hudHidden]),['aim',true,false,false]);
    await page.locator('#helpClose').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#helpOverlay').isVisible(),false);
    await page.keyboard.press('?');assert.equal(await page.locator('#helpOverlay').isVisible(),true);
    await page.mouse.click(3,3);assert.equal(await page.locator('#helpOverlay').isVisible(),false);
    await page.keyboard.press('?');await page.keyboard.press('Escape');

    const saved=await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v9');});
    const cosmetic=await page.evaluate(()=>[__reelDeal.G.thirdPerson,__reelDeal.heldCatch.sp.name,__reelDeal.carriedModel.uuid,__reelDeal.G.px,__reelDeal.G.pz,__reelDeal.G.yaw]);
    await page.keyboard.press('h');
    assert.equal(await page.locator('#hud').isVisible(),false);assert.equal(await page.locator('#hudRestoreHint').isVisible(),true);
    await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'KeyH',repeat:true})));
    assert.equal(await page.evaluate(()=>__reelDeal.hudHidden),true);
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'restoreHudBtn');
    await page.keyboard.down('w');await page.waitForTimeout(100);await page.keyboard.up('w');
    for(const key of ['b','i','m','f','v','x','?','r'])await page.keyboard.press(key);
    await page.waitForFunction(()=>document.getElementById('hudRestoreHint').classList.contains('hidden'));
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.thirdPerson,__reelDeal.heldCatch.sp.name,__reelDeal.carriedModel.uuid,__reelDeal.G.px,__reelDeal.G.pz,__reelDeal.G.yaw]),cosmetic);
    assert.equal(await page.locator('#toast').isVisible(),false);await capture(page,'ui-hidden-desktop');
    await page.mouse.click(640,400);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.hudHidden,__reelDeal.G.state]),[false,'aim']);
    for(const restore of ['h','Escape','Space']){
      await page.click('#hideHudBtn');await page.keyboard.press(restore);
      assert.deepEqual(await page.evaluate(()=>[__reelDeal.hudHidden,__reelDeal.G.state]),[false,'aim']);
    }
    assert.equal(await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v9');}),saved);
    console.log('PASS: accessible Help, native keyboard activation, focus trap, no modal input leakage; completely hidden HUD, repeat guards and safe keyboard/click restoration without save changes');

    await page.keyboard.press('x');await page.keyboard.press('v');await pier(page);
    assert.match(await page.locator('#prompt').textContent(),/Hold click \/ Space.*release to cast/);
    assert.equal(await page.locator('#prompt').isVisible(),true);
    await page.keyboard.down('w');await page.locator('#prompt').waitFor({state:'hidden'});assert.equal(await page.locator('#prompt').isVisible(),false);await page.keyboard.up('w');
    for(const kind of ['rod','line','bait','market','port']){
      await vendor(page,kind);
      assert.equal(await page.locator('#shopBtn:visible, #marketBtn:visible, #portBtn:visible').count(),1);
      assert.equal(await page.locator('#prompt').isVisible(),false);assert.equal(await page.locator('#lockHint').isVisible(),false);
    }
    await page.evaluate(()=>{const a=__reelDeal;a.G.px=0;a.G.pz=30;a.G.yaw=0;});await page.waitForTimeout(100);
    assert.equal(await page.locator('#prompt').isVisible(),false,'land-facing aim should not show permanent cast instructions');
    await pier(page);await page.evaluate(()=>{__reelDeal.G.gear.bait=23;__reelDeal.updateStats();});
    await page.waitForFunction(()=>document.getElementById('prompt').textContent.includes('Bag → Bait'));
    assert.match(await page.locator('#prompt').textContent(),/Bag → Bait/);
    await page.evaluate(()=>{__reelDeal.G.gear.bait=0;__reelDeal.updateStats();});
    await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.25);
    assert.equal(await page.locator('#prompt').isVisible(),false);assert.equal(await page.locator('.cast-instruction').isVisible(),true);
    assert.equal(await page.locator('#helpBtn').isDisabled(),true);assert.equal(await page.locator('#hideHudBtn').isDisabled(),true);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.openBag(),__reelDeal.openHelp(),__reelDeal.setHudHidden(true)]),[false,false,false]);
    await page.keyboard.up('Space');await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:15000});
    await page.evaluate(()=>__reelDeal.G.waitTimer=99);
    assert.match(await page.locator('#prompt').textContent(),/LUCK .*Waiting.*click \/ Space to reel in early/);
    await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__reelDeal.G.state),'aim');
    await page.evaluate(()=>{__reelDeal.triggerBite();__reelDeal.G.biteWindow=99;});
    assert.match(await page.locator('#prompt').textContent(),/BITE! Click \/ Space to hook/);
    const fight=await page.evaluate(()=>{
      const a=__reelDeal,random=Math.random;
      try{
        let n=0;Math.random=()=>n++===0?0:.5;a.hookFish();
        const result=[a.G.state,a.openBag(),a.openHelp(),a.setHudHidden(true),getComputedStyle(document.getElementById('prompt')).display,document.getElementById('reelUI').classList.contains('hidden')];
        a.catchFish();return result;
      }finally{Math.random=random;}
    });
    assert.deepEqual(fight,['reeling',false,false,false,'none',false]);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.openBag(),__reelDeal.openHelp(),__reelDeal.setHudHidden(true)]),[false,false,false]);
    await page.click('#continueBtn');await page.click('#logBtn');
    assert.equal(await page.locator('#caughtCount').textContent(),'1,235');await page.click('#closeLog');
    await vendor(page,'market');await page.keyboard.press('e');await page.click('#sellAll');await page.click('#marketClose');
    await page.click('#logBtn');assert.equal(await page.locator('#caughtCount').textContent(),'1,235');
    assert.equal(await page.locator('#bestFishName').textContent(),'Rainbow Trout');await page.click('#closeLog');
    await vendor(page,'port');await page.keyboard.press('e');assert.equal(await page.locator('#fleetView').isVisible(),true);await page.click('#destinationsTab');await page.locator('[data-destination="1"]').click();await page.click('#waypointBtn');await page.click('#chartClose');await page.click('#boardBoatBtn');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.state,__reelDeal.G.onBoat,__reelDeal.G.boatMode]),['aim',true,'drive']);
    await page.click('#helpBtn');assert.equal(await page.locator('#helpOverlay').isVisible(),true);await page.click('#helpClose');
    await page.click('#hideHudBtn');
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await page.click('#startBtn');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.hudHidden,__reelDeal.helpOpen,__reelDeal.bagOpen,__reelDeal.G.thirdPerson,__reelDeal.heldCatch]),[false,false,false,false,null]);
    await page.click('#logBtn');page.once('dialog',d=>d.accept());await page.click('#resetBtn');await page.click('#logBtn');
    assert.equal(await page.locator('#caughtCount').textContent(),'0');assert.equal(await page.locator('#bestNum').textContent(),'—');
    assert.equal(await page.locator('#bestFishName').textContent(),'No catches yet');
    console.log('PASS: nearby-stall/holding/water/bait/charge/bite/reel contextual hints, fishing guards and manual-boat panel pauses, lifetime records surviving sales, reset and transient UI state on reload');
  }catch(error){
    console.error('UI failure state:',await page.evaluate(()=>({state:__reelDeal.G.state,bag:__reelDeal.bagOpen,help:__reelDeal.helpOpen,hidden:__reelDeal.hudHidden,gear:__reelDeal.G.gear,pos:[__reelDeal.G.px,__reelDeal.G.pz],prompt:document.getElementById('prompt').outerHTML,active:document.activeElement.id})));
    await page.screenshot({path:`${shots}/ui-failure.png`});throw error;
  }finally{await page.close();}

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const mp=await mobile.newPage();watch(mp);
  try{
    await boot(mp);await seed(mp);
    await mp.evaluate(()=>{const a=__reelDeal;for(const kind of ['rod','line','bait'])a.G.owned[kind]=Array.from({length:40},(_,i)=>i);});
    for(const viewport of [{width:390,height:844},{width:360,height:740},{width:844,height:390}]){
      await mp.setViewportSize(viewport);await mp.tap('#bagBtn');
      assert.equal(await mp.locator('.bag-card').evaluate(fits),true);assert.equal(await mp.locator('#bagTabs').evaluate(fits),true);
      await mp.tap('#bagTab-bait');
      assert.equal(await mp.locator('#bagBody [data-tier]').count(),40);
      assert.equal(await mp.locator('#bagBody').evaluate(e=>e.scrollHeight>e.clientHeight&&e.scrollWidth<=e.clientWidth),true);
      await mp.locator('#bagBody [data-buy="23"]').tap();assert.equal(await mp.evaluate(()=>__reelDeal.G.gear.bait),23);
      await mp.locator('#bagBody [data-buy="0"]').tap();assert.equal(await mp.evaluate(()=>__reelDeal.G.gear.bait),0);
      await mp.tap('#bagClose');await mp.tap('#helpBtn');
      assert.equal(await mp.locator('.help-card').evaluate(fits),true);assert.equal(await mp.locator('#helpBody').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      assert.equal(await mp.locator('#helpPlatform').textContent(),'TOUCH CONTROLS');
      await mp.tap('#helpClose');
    }
    await mp.setViewportSize({width:390,height:844});await mp.tap('#bagBtn');await capture(mp,'ui-bag-mobile');
    await mp.locator('[data-hold-fish="1"]').tap();await mp.tap('#viewBtn');await vendor(mp,'rod');
    assert.match(await mp.locator('#shopBtn').textContent(),/Tap/);
    assert.equal(await mp.locator('#heldFishBar').evaluate(e=>{
      const r=e.getBoundingClientRect(),stick=document.getElementById('stick').getBoundingClientRect(),shop=document.getElementById('shopBtn').getBoundingClientRect();
      return r.left>=stick.right&&r.right<=innerWidth&&r.height<=70&&r.top>=shop.bottom&&e.scrollWidth<=e.clientWidth;
    }),true,'compact fish and stall controls must not overlap the joystick or each other');
    await pier(mp);await capture(mp,'ui-clean-mobile');
    assert.equal(await mp.locator('.hud-top').evaluate(e=>{const a=e.querySelector('.hud-tools').getBoundingClientRect(),b=e.querySelector('.stats').getBoundingClientRect();return a.right<=b.left;}),true);
    await mp.tap('#helpBtn');await capture(mp,'ui-help-mobile');await mp.tap('#helpClose');
    const before=await mp.evaluate(()=>[__reelDeal.G.state,__reelDeal.G.yaw,__reelDeal.G.px,__reelDeal.G.pz,__reelDeal.carriedModel.uuid]);
    await mp.tap('#hideHudBtn');await mp.waitForFunction(()=>document.getElementById('hudRestoreHint').classList.contains('hidden'));
    assert.equal(await mp.locator('#hud').isVisible(),false);await capture(mp,'ui-hidden-mobile');
    await mp.touchscreen.tap(190,440);
    assert.deepEqual(await mp.evaluate(()=>[__reelDeal.G.state,__reelDeal.G.yaw,__reelDeal.G.px,__reelDeal.G.pz,__reelDeal.carriedModel.uuid]),before);
    assert.equal(await mp.evaluate(()=>__reelDeal.hudHidden),false);
    await mp.tap('#putAwayBtn');await mp.tap('#hideHudBtn');await mp.touchscreen.tap(190,440);
    assert.equal(await mp.evaluate(()=>__reelDeal.G.state),'aim','the restore tap never starts a charge, even without a held fish');
    // Opening Help clears a live joystick, and closing it cannot resume a stuck walk.
    await mp.locator('#stick').dispatchEvent('pointerdown',{pointerId:18,pointerType:'touch',clientX:50,clientY:700,button:0});
    await mp.locator('#stick').dispatchEvent('pointermove',{pointerId:18,pointerType:'touch',clientX:50,clientY:670});
    await mp.tap('#helpBtn');const stopped=await mp.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);
    await mp.locator('#scene').dispatchEvent('pointerdown',{pointerId:19,pointerType:'touch',clientX:220,clientY:430,button:0});
    await mp.locator('#scene').dispatchEvent('pointerup',{pointerId:19,pointerType:'touch',clientX:220,clientY:430});
    await mp.tap('#helpClose');await mp.waitForTimeout(120);
    assert.deepEqual(await mp.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),stopped);
    assert.equal(await mp.evaluate(()=>__reelDeal.G.state),'aim');
    assert.deepEqual(errors,[],'UI flow must not raise browser errors');
    console.log('PASS: phone and short-landscape Bag/Help scrolling, all 40 owned tiers, touch re-equips, compact non-overlapping strip, clean screenshots, tap-only restoration and joystick/input isolation');
  }finally{await mobile.close();}
};
