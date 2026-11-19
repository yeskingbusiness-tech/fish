// Fish inventory / character / camera integration; also run by the full suite.
const assert=require('node:assert/strict');

module.exports=async function testPlayerView(browser,url,shots){
  const errors=[];
  function watch(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
  async function boot(page){await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());}
  async function resume(page){await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());}
  async function seed(page){
    await page.evaluate(()=>{
      const a=__reelDeal,names=['Bluegill','Rainbow Trout','Bluegill','Reel Life'];
      const bag=names.map(n=>{const sp=a.SPECIES.find(s=>s.name===n);return{n,w:n==='Reel Life'?sp.maxW:+((sp.minW+sp.maxW)/2).toFixed(1)};});
      localStorage.setItem('reel-deal-save-v8',JSON.stringify({version:8,xp:a.xpForLevel(90),coins:1234,caught:4,
        zone:0,boat:5,ownedBoats:[0,5],licenses:[0,1,2,3,4,5],visited:[0],bag,log:bag,
        owned:{rod:[0,3],line:[0,3],bait:[0,3,7]},gear:{rod:3,line:3,bait:3}}));
    });
    await resume(page);await page.evaluate(()=>__reelDeal.saveGame());
  }
  async function market(page){
    await page.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===a.G.zone&&s.kind==='market');a.G.px=s.x;a.G.pz=s.z-3.8;a.openMarket();});
  }
  const page=await browser.newPage({viewport:{width:1100,height:760}});watch(page);
  try{
    await boot(page);
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;let rods=0;a.rodRig.traverse(o=>{if(o.isMesh)rods++;});window.bodyDraws=0;window.bodyFrameStart=a.G.time;a.playerModel.root.traverse(o=>{if(o.isMesh)o.onBeforeRender=()=>window.bodyDraws++;});return[a.G.thirdPerson,a.playerModel.root.visible,a.activeCamera()===a.camera,rods];}),[false,false,true,6]);
    await page.waitForFunction(()=>__reelDeal.G.time>window.bodyFrameStart+.04);
    assert.equal(await page.evaluate(()=>window.bodyDraws),0,'first person never draws a body or hands');
    await page.keyboard.press('b');assert.equal(await page.locator('#bagOverlay').isVisible(),true);
    assert.equal(await page.locator('[data-hold-fish]').count(),0);assert.match(await page.locator('#bagBody').textContent(),/No fish in your bag yet/);
    const pos=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);
    // Don't focus Close: Space should still activate a focused button accessibly.
    await page.locator('#bagBody').focus();
    await page.keyboard.down('w');await page.waitForTimeout(120);await page.keyboard.up('w');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'bagBody','deferred initial focus must not steal an explicit panel selection');
    await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__reelDeal.bagOpen),true);await page.keyboard.press('v');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),pos);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.state,__reelDeal.G.thirdPerson]),['aim',false]);
    assert.equal(await page.locator('#viewBtn').isDisabled(),true);await page.keyboard.press('Escape');
    await page.click('#viewBtn');
    // Wait for an actual rendered character, not an assumed 120 ms frame budget
    // (first-use shader compilation can exceed that on software/mobile GPUs).
    await page.waitForFunction(()=>window.bodyDraws>0&&__reelDeal.G.thirdPerson&&__reelDeal.playerModel.root.visible);
    assert.ok(await page.evaluate(()=>window.bodyDraws)>0,'front view actually draws the character');
    await page.screenshot({path:`${shots}/third-person-character.png`});
    await page.click('#viewBtn');await page.evaluate(()=>{window.bodyDraws=0;window.bodyFrameStart=__reelDeal.G.time;});
    await page.waitForFunction(()=>__reelDeal.G.time>window.bodyFrameStart+.04);
    assert.equal(await page.evaluate(()=>window.bodyDraws),0);

    await seed(page);
    const original=await page.evaluate(()=>localStorage.getItem('reel-deal-save-v8'));
    await page.click('#bagBtn');assert.equal(await page.locator('[data-hold-fish]').count(),4);
    await page.locator('#bagClose').focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.holdFish),'3');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'bagClose');
    assert.equal(await page.evaluate(()=>[-1,4,NaN,1.5,'1'].every(i=>__reelDeal.holdFish(i)===false)),true);
    await page.screenshot({path:`${shots}/fish-bag.png`});await page.locator('[data-hold-fish="1"]').click();
    assert.equal(await page.locator('#bagOverlay').isVisible(),false);
    assert.equal(await page.locator('#heldFishName').textContent(),'Rainbow Trout');
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;window.heldId=a.carriedModel.uuid;return[a.heldCatch===a.bag[1],a.playerModel.root.visible,a.rodRig.visible,a.heldFishRig.parent===a.camera,a.bag.length,a.G.coins];}),[true,false,false,true,4,1234]);
    await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>__reelDeal.G.state),'aim','a held fish must not accidentally start a cast');
    assert.equal(await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v8');}),original,'holding does not change saved fish, XP, coins, discoveries or gear');
    await page.waitForTimeout(150);await page.screenshot({path:`${shots}/fish-held-first-person.png`});
    await page.keyboard.press('v');await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;return[a.G.thirdPerson,a.activeCamera()===a.frontCamera,a.playerModel.root.visible,a.rodRig.visible,a.playerModel.rod.visible,a.heldFishRig.parent===a.playerModel.fishMount,a.carriedModel.uuid===window.heldId];}),[true,true,true,false,false,true,true]);
    assert.equal(await page.locator('#viewBtn').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#viewLabel').textContent(),'First person');assert.equal(await page.locator('#lockHint').isVisible(),false);
    await page.screenshot({path:`${shots}/fish-held-third-person.png`});
    const beforeWalk=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);
    await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');
    assert.notDeepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),beforeWalk);
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;return Math.hypot(a.playerModel.root.position.x-a.G.px,a.playerModel.root.position.z-a.G.pz)<.01&&a.carriedModel.uuid===window.heldId;}),true);
    for(let n=0;n<8;n++)await page.keyboard.press('v');
    assert.equal(await page.evaluate(()=>__reelDeal.G.thirdPerson),true);
    assert.equal(await page.evaluate(()=>__reelDeal.carriedModel.uuid===window.heldId),true,'camera toggling must not rebuild or duplicate a fish');
    await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'KeyV',repeat:true})));
    assert.equal(await page.evaluate(()=>__reelDeal.G.thirdPerson),true,'key repeat cannot flicker camera modes');
    await page.keyboard.press('v');await page.keyboard.press('x');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.heldCatch,__reelDeal.heldFishRig.children.length,__reelDeal.rodRig.visible,__reelDeal.bag.length]),[null,0,true,4]);

    // All shapes and trophy sizes fit both views, even on a narrow phone.
    for(const viewport of [{width:1100,height:760},{width:390,height:844}]){
      await page.setViewportSize(viewport);
      const failures=await page.evaluate(async()=>{
        const THREE=await import('three'),a=__reelDeal,originalBag=[...a.bag],failures=[];
        a.spawnAtIsland(0);a.G.yaw=0;a.G.pitch=-.1;a.camera.rotation.set(-.1,0,0,'YXZ');
        try{
          for(const sp of a.SPECIES){
            a.bag.splice(0,a.bag.length,{sp,weight:sp.maxW});a.updateStats();a.openFishBag();a.holdFish(0);
            for(const third of [false,true]){
              a.G.thirdPerson=third;a.updatePlayerView();const camera=a.activeCamera();camera.updateMatrixWorld(true);a.heldFishRig.updateWorldMatrix(true,true);
              a.carriedModel.traverse(o=>{if(!o.isMesh)return;const vertices=o.geometry.attributes.position;
                for(let i=0;i<vertices.count;i++){
                  const p=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld).project(camera);
                  if(Math.abs(p.x)>1||Math.abs(p.y)>1||p.z< -1||p.z>1)failures.push(`${sp.id}:${third}:${p.toArray()}`);
                }
              });
            }
            if(a.heldFishRig.children.length!==1)throw Error('Duplicate fish mesh');a.stowFish();
          }
        }finally{a.G.thirdPerson=false;a.bag.splice(0,a.bag.length,...originalBag);a.updateStats();a.updatePlayerView();}
        return failures.slice(0,8);
      });
      assert.deepEqual(failures,[],`all fish must fit at ${viewport.width}px`);
    }
    await page.setViewportSize({width:1100,height:760});

    // Selling another identical fish must not change the carried specimen.
    await page.click('#bagBtn');await page.locator('[data-hold-fish="2"]').click();
    await page.evaluate(()=>{const a=__reelDeal;window.exactHeld=a.heldCatch;window.disposed=0;const materials=new Set();a.carriedModel.traverse(o=>{if(o.isMesh)materials.add(o.material);});window.materialCount=materials.size;for(const m of materials)m.addEventListener('dispose',()=>window.disposed++);});
    await market(page);
    const values=await page.evaluate(()=>{const a=__reelDeal;return a.bag.map(e=>a.saleValue(e.sp,e.weight));});
    await page.locator('[data-sell="0"]').click();
    assert.equal(await page.evaluate(()=>__reelDeal.heldCatch===window.exactHeld&&__reelDeal.heldCatch===__reelDeal.bag[1]),true);
    assert.equal(await page.evaluate(()=>__reelDeal.G.coins),1234+values[0]);
    await page.locator('[data-sell="1"]').click();
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.heldCatch,__reelDeal.heldFishRig.children.length,__reelDeal.G.coins]),[null,0,1234+values[0]+values[2]]);
    assert.equal(await page.evaluate(()=>window.disposed===window.materialCount),true,'selling the held fish frees every private material exactly once');
    await page.evaluate(()=>__reelDeal.stowFish());assert.equal(await page.evaluate(()=>window.disposed===window.materialCount),true);
    await page.click('#marketClose');await page.click('#bagBtn');await page.locator('[data-hold-fish="1"]').click();
    await market(page);await page.click('#sellAll');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.heldCatch,__reelDeal.bag.length,__reelDeal.heldFishRig.children.length]),[null,0,0]);
    await page.click('#marketClose');

    // The front camera cannot reverse casting, change luck or disrupt an active fight.
    assert.equal(await page.evaluate(()=>{
      const a=__reelDeal;a.spawnAtIsland(0);a.G.pz=-1.5;a.G.yaw=0;a.G.pitch=-.1;a.G.gear.bait=0;
      a.camera.position.set(a.G.px,a.G.camY,a.G.pz);a.camera.rotation.set(-.1,0,0,'YXZ');
      const first=a.camera.position.clone(),third=first.clone();a.G.thirdPerson=false;a.updatePlayerView();const ok=a.landingPoint(.75,first);
      a.toggleView();return ok&&a.landingPoint(.75,third)&&first.distanceTo(third)<1e-9&&a.activeRodTip()===a.playerModel.rodTip;
    }),true);
    await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.62);await page.keyboard.up('Space');
    await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:15000});
    assert.equal(await page.locator('#viewBtn').isDisabled(),true);
    await page.keyboard.press('v');assert.equal(await page.evaluate(()=>__reelDeal.G.thirdPerson),true);
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;return a.toggleView()===false&&a.holdFish(0)===false;}),true);
    await page.evaluate(()=>__reelDeal.G.waitTimer=.02);await page.waitForFunction(()=>__reelDeal.G.state==='bite');await page.keyboard.press('Space');
    const caught=await page.evaluate(()=>new Promise(resolve=>{
      const a=__reelDeal,start=performance.now();function steer(){
        if(a.G.state!=='reeling'||performance.now()-start>45000){resolve(a.G.state);return;}
        a.G.reelHeld=a.G.tension<(a.G.bandLo+a.G.bandHi)/2;requestAnimationFrame(steer);
      }steer();
    }));
    assert.equal(caught,'caught');assert.equal(await page.evaluate(()=>__reelDeal.G.thirdPerson),true);
    await page.click('#continueBtn');await page.click('#bagBtn');await page.locator('[data-hold-fish="0"]').click();
    // Voyages temporarily use the boat camera, then restore front view and the same held fish.
    await page.evaluate(()=>{const a=__reelDeal;window.voyageHeld=a.heldCatch;const s=a.world.stalls.find(s=>s.zone===0&&s.kind==='port');a.G.px=s.x;a.G.pz=s.z-3.8;a.openChart();});
    await page.locator('[data-destination="1"]').click();await page.click('#sailBtn');
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;return[a.G.state,a.playerModel.root.visible,a.heldFishRig.visible,a.activeCamera()===a.camera,a.toggleView()];}),['voyage',false,false,true,false]);
    await page.click('#skipVoyage');
    assert.deepEqual(await page.evaluate(()=>{const a=__reelDeal;return[a.G.zone,a.G.thirdPerson,a.playerModel.root.visible,a.heldCatch===window.voyageHeld,a.heldFishRig.visible];}),[1,true,true,true,true]);
    const saved=await page.evaluate(()=>{__reelDeal.saveGame();return JSON.parse(localStorage.getItem('reel-deal-save-v8'));});
    assert.equal(saved.version,8);assert.equal('thirdPerson' in saved,false);assert.equal('heldCatch' in saved,false);
    await resume(page);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.thirdPerson,__reelDeal.heldCatch,__reelDeal.playerModel.root.visible,__reelDeal.bag.length,__reelDeal.G.xp,__reelDeal.G.coins]),[false,null,false,saved.bag.length,saved.xp,saved.coins]);
    await page.click('#bagBtn');await page.locator('[data-hold-fish="0"]').click();await page.click('#viewBtn');
    await page.click('#logBtn');page.once('dialog',d=>d.accept());await page.click('#resetBtn');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.thirdPerson,__reelDeal.heldCatch,__reelDeal.playerModel.root.visible,__reelDeal.bag.length]),[false,null,false,0]);
    console.log('PASS: empty/real fish bag, reference-safe holding/sales, no first-person body/hands, reversible front camera, all 120 display shapes, unchanged saves, disposal, actual third-person fishing, voyage and reset');
  }finally{await page.close();}

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const mp=await mobile.newPage();watch(mp);
  try{
    await boot(mp);await seed(mp);await mp.click('#bagBtn');
    assert.equal(await mp.locator('.bag-card').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth;}),true);
    await mp.screenshot({path:`${shots}/fish-bag-mobile.png`});await mp.locator('[data-hold-fish="3"]').click();
    await mp.screenshot({path:`${shots}/fish-held-first-person-mobile.png`});await mp.click('#viewBtn');await mp.waitForTimeout(150);
    const before=await mp.evaluate(()=>({yaw:__reelDeal.G.yaw,x:__reelDeal.G.px,z:__reelDeal.G.pz,id:__reelDeal.carriedModel.uuid}));
    await mp.locator('#scene').dispatchEvent('pointerdown',{pointerId:4,pointerType:'touch',clientX:180,clientY:520,button:0});
    await mp.locator('#scene').dispatchEvent('pointermove',{pointerId:4,pointerType:'touch',clientX:235,clientY:530});
    await mp.locator('#scene').dispatchEvent('pointerup',{pointerId:4,pointerType:'touch',clientX:235,clientY:530});
    assert.notEqual(await mp.evaluate(()=>__reelDeal.G.yaw),before.yaw);
    assert.equal(await mp.evaluate(()=>__reelDeal.carriedModel.uuid),before.id);
    assert.equal(await mp.evaluate(()=>__reelDeal.G.state),'aim');
    assert.equal(await mp.locator('#heldFishBar').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.getElementById('stick').getBoundingClientRect();return a.left>=b.right&&a.right<=innerWidth&&a.bottom<=innerHeight&&e.scrollWidth<=e.clientWidth;}),true);
    await mp.locator('#stick').dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',clientX:50,clientY:700,button:0});
    await mp.locator('#stick').dispatchEvent('pointermove',{pointerId:8,pointerType:'touch',clientX:50,clientY:670});
    await mp.waitForTimeout(160);await mp.locator('#stick').dispatchEvent('pointerup',{pointerId:8,pointerType:'touch'});
    assert.notDeepEqual(await mp.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),[before.x,before.z]);
    await mp.screenshot({path:`${shots}/fish-held-third-person-mobile.png`});
    await mp.click('#viewBtn');assert.equal(await mp.evaluate(()=>__reelDeal.playerModel.root.visible),false);
    await mp.click('#putAwayBtn');assert.equal(await mp.locator('#heldFishBar').isVisible(),false);
    assert.equal(await mp.evaluate(()=>__reelDeal.bag.length),4);assert.equal(await mp.evaluate(()=>__reelDeal.rodRig.visible),true);
    assert.deepEqual(errors,[],'Player views must not raise browser errors');
    console.log('PASS: mobile bag selection, giant fish in both views, toggle button, look-drag without casting, joystick, non-overlapping Put away control and hidden first-person character');
  }finally{await mobile.close();}
};
