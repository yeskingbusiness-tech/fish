// Real renderer/resource/UI coverage for the species anatomy overhaul.
const assert=require('node:assert/strict');
module.exports=async function testFishModels(browser,url,shots){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
  const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const ready=selector=>page.waitForFunction(selector=>{
    const root=document.querySelector(selector),b=root.getBoundingClientRect();
    const images=[...root.querySelectorAll('img')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>b.top&&r.top<b.bottom&&r.right>b.left&&r.left<b.right;});
    return images.length&&images.every(e=>e.complete&&e.naturalWidth>0);
  },selector);
  const photo=async name=>{await page.evaluate(()=>{__reelDeal.setHudHidden(true);document.getElementById('hudRestoreHint').classList.add('hidden');});await frame();await page.screenshot({path:`${shots}/${name}.png`});await page.evaluate(()=>__reelDeal.setHudHidden(false));};
  try{
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');
    await page.click('#indexBtn');
    assert.equal(await page.locator('.fish-entry.undiscovered').count(),120);
    assert.equal(await page.locator('#fishGrid [data-fish-id],#fishGrid [data-anatomy]').count(),0,'unknown entries must not expose real silhouettes or anatomy');
    assert.equal(await page.evaluate(()=>new Set([...document.querySelectorAll('.undiscovered .entry-fish')].map(e=>e.innerHTML)).size),1);
    await page.click('#indexClose');

    const meshes=await page.evaluate(async()=>{
      const a=__reelDeal,T=await import('three'),failures=[],records=[];
      for(const sp of a.SPECIES){
        const model=a.makeFish3D(sp,1),second=a.makeFish3D(sp,1),resources=model.userData;
        let geometries=0,materials=0,draws=0,triangles=0;
        for(const g of resources.geometries){g.addEventListener('dispose',()=>geometries++);if(second.userData.geometries.has(g))failures.push('shared GPU geometry '+sp.id);}
        for(const m of resources.materials){m.addEventListener('dispose',()=>materials++);if(second.userData.materials.has(m))failures.push('shared private material '+sp.id);}
        model.traverse(o=>{
          if(!o.isMesh)return;draws++;const attrs=o.geometry.attributes;
          if(!['position','normal','color'].every(key=>attrs[key]&&[...attrs[key].array].every(Number.isFinite)))failures.push('bad attributes '+sp.id);
          if(attrs.position.count!==attrs.normal.count||attrs.position.count!==attrs.color.count)failures.push('mismatched attributes '+sp.id);
          triangles+=attrs.position.count/3;
        });
        const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
        if(Math.abs(size.x-sp.size*1.8)>2e-6||size.y<=0||size.z<=0)failures.push('bad model bounds '+sp.id);
        if(!resources.belly?.isMesh||!resources.tail?.isGroup||!Number.isFinite(resources.gripX))failures.push('missing rig/support '+sp.id);
        if(draws>6||triangles>4500||triangles!==resources.triangles)failures.push('mobile budget '+sp.id);
        a.animateFishModel(model,.7,1);
        const alive=resources.tail.rotation.length?.()||Math.abs(resources.tail.rotation.x)+Math.abs(resources.tail.rotation.y)+Math.abs(resources.tail.rotation.z);
        if(!alive)failures.push('no animation '+sp.id);
        if(resources.family==='whale'&&resources.tail.rotation.y!==0)failures.push('whale bends like a fish');
        a.animateFishModel(model,0,0);
        a.disposeFishModel(model);a.disposeFishModel(model);
        if(geometries!==resources.geometries.size||materials!==resources.materials.size||model.parent)failures.push('dispose exactly once '+sp.id);
        if(second.userData.disposed)failures.push('disposed the other specimen '+sp.id);
        a.disposeFishModel(second);records.push({id:sp.id,draws,triangles});
      }
      return {failures,records};
    });
    assert.deepEqual(meshes.failures,[]);assert.equal(meshes.records.length,120);
    console.log(`PASS: all 120 real mesh builds/animations, independent instances, complete GPU disposal; ≤${Math.max(...meshes.records.map(m=>m.draws))} draw calls and ≤${Math.max(...meshes.records.map(m=>m.triangles))} triangles per fish`);

    await page.evaluate(()=>{
      const a=__reelDeal;a.G.xp=a.xpForLevel(90);a.G.coins=4321;a.G.licenses=[0,1,2,3,4,5];
      a.bag.splice(0,a.bag.length,...a.SPECIES.map(sp=>({sp,weight:sp.maxW})));
      a.G.discoveries=Object.fromEntries(a.SPECIES.map(sp=>[sp.id,{count:1,best:sp.maxW,first:'2026-11-13'}]));
      a.G.caught=120;a.updateStats();a.saveGame();window.artSave=localStorage.getItem('reel-deal-save-v8');
    });
    await page.click('#indexBtn');assert.equal(await page.locator('.fish-entry.discovered').count(),120);
    assert.equal(await page.locator('#fishGrid img[data-fish-id]').count(),120);
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#fishGrid img[data-fish-id]')].every(image=>{
      const s=__reelDeal.SPECIES.find(s=>s.id===image.dataset.fishId),b=image.getBoundingClientRect(),p=image.parentElement.getBoundingClientRect();
      return s&&image.alt===s.name&&image.dataset.anatomy&&b.width>0&&b.height>0&&b.left>=p.left&&b.right<=p.right;
    })),true);
    await ready('#fishGrid');
    for(const island of [0,2,4]){await page.locator(`[data-index-island="${island}"]`).click();await ready('#fishGrid');await page.screenshot({path:`${shots}/remodel-index-${island}.png`});}
    await page.click('#indexClose');
    await page.click('#bagBtn');assert.equal(await page.locator('#bagBody img[data-fish-id]').count(),120);await page.click('#bagClose');

    // Render actual held specimens, not static PNG illustrations of them.
    for(const id of ['bluegill','rainbow-trout','flathead-catfish','alligator-gar','paddlefish','giant-manta','ocean-sunfish','giant-oarfish','colossal-squid','river-kraken','void-angler','star-whale','reel-life']){
      await page.evaluate(id=>{const a=__reelDeal;a.openFishBag();a.holdFish(a.bag.findIndex(e=>e.sp.id===id));if(a.G.thirdPerson)a.toggleView();},id);
      await frame();
      assert.equal(await page.evaluate(()=>__reelDeal.carriedModel.userData.designId),id);
      assert.equal(await page.evaluate(()=>__reelDeal.playerModel.root.visible),false);
      if(['rainbow-trout','giant-manta','colossal-squid','void-angler'].includes(id))await photo('remodel-held-'+id);
    }
    await page.click('#viewBtn');await photo('remodel-giant-front');
    assert.ok(await page.evaluate(()=>__reelDeal.carriedSize.x)>25);
    assert.equal(await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v8')===window.artSave;}),true,'modelling, holding and camera changes cannot rewrite a save');
    await page.click('#putAwayBtn');

    // Real render/dispose cycles must release geometries as well as materials.
    const memory=await page.evaluate(async()=>{
      const a=__reelDeal,frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const original=[...a.bag],before=a.renderer.info.memory.geometries;
      for(let n=0;n<24;n++){
        const sp=a.SPECIES[n*5%120];a.bag.splice(0,a.bag.length,{sp,weight:sp.maxW});a.openFishBag();a.holdFish(0);
        await frame();a.stowFish();await frame();
      }
      a.bag.splice(0,a.bag.length,...original);a.updateStats();return {before,after:a.renderer.info.memory.geometries};
    });
    assert.ok(memory.after<=memory.before+1,`GPU geometry leak: ${JSON.stringify(memory)}`);

    for(const viewport of [{width:390,height:844},{width:360,height:740},{width:844,height:390}]){
      await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
      await page.click('#indexBtn');await page.locator('[data-index-island="4"]').click();
      assert.equal(await page.locator('#fishGrid').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      assert.equal(await page.locator('.entry-fish :is(svg,img)').evaluateAll(svg=>svg.every(e=>{const a=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;})),true);
      await ready('#fishGrid');
      if(viewport.width===390)await page.screenshot({path:`${shots}/remodel-index-mobile.png`});
      await page.click('#indexClose');
      await page.evaluate(()=>{const a=__reelDeal;a.openFishBag();a.holdFish(a.bag.findIndex(e=>e.sp.id==='colossal-squid'));if(!a.G.thirdPerson)a.toggleView();});
      await frame();if(viewport.width===390)await photo('remodel-squid-mobile');
      await page.click('#putAwayBtn');
    }
    console.log('PASS: actual remodels in the discovered index, Bag and both held views; secret silhouettes remain hidden; uncapped giants and phone/landscape framing; unchanged saves and no GPU growth after 24 rendered swaps');

    // A new, unidentified squid uses its real model while hooked, then the same
    // sculpt's illustration after landing; no forced catch inserted into a bag.
    await page.setViewportSize({width:1280,height:800});await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
    const bait=await page.evaluate(()=>{
      const a=__reelDeal,sp=a.SPECIES.find(s=>s.id==='colossal-squid');a.spawnAtIsland(sp.island);a.G.thirdPerson=false;
      a.G.gear.rod=23;a.G.gear.line=23;
      a.G.gear.bait=a.BAITS.findIndex((_,i)=>a.eligibleSpecies(sp.island,i).includes(sp));
      delete a.G.discoveries[sp.id];a.updateStats();a.updatePlayerView();return a.G.gear.bait;
    });assert.ok(bait>=0);
    await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.62);await page.keyboard.up('Space');
    await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:15000});
    const hooked=await page.evaluate(()=>{
      const a=__reelDeal,pool=a.eligibleSpecies(a.G.zone,a.G.gear.bait),b=a.BAITS[a.G.gear.bait],luck=a.effectiveLuck(a.G.gear.bait,a.G.castPower);
      const weights=pool.map(sp=>sp.weight*(1+2*luck)**(a.RARITY[sp.rarity].tier-b.lo)),index=pool.findIndex(sp=>sp.id==='colossal-squid');
      const q=(weights.slice(0,index).reduce((s,w)=>s+w,0)+weights[index]/2)/weights.reduce((s,w)=>s+w,0),rng=Math.random;
      try{a.triggerBite();let calls=0;Math.random=()=>calls++===0?q:.5;a.hookFish();}finally{Math.random=rng;}
      return {family:a.hookedFish.userData.family,secret:document.getElementById('reelFishName').textContent.includes('Unidentified fish')};
    });assert.deepEqual(hooked,{family:'squid',secret:true});
    const state=await page.evaluate(()=>new Promise(resolve=>{
      const a=__reelDeal,start=performance.now();function steer(){
        if(a.G.state!=='reeling'||performance.now()-start>45000){resolve(a.G.state);return;}
        a.G.reelHeld=a.G.tension<(a.G.bandLo+a.G.bandHi)/2;requestAnimationFrame(steer);
      }steer();
    }));assert.equal(state,'caught');
    assert.equal(await page.locator('#catchIcon img').getAttribute('data-fish-id'),'colossal-squid');
    assert.equal(await page.locator('#catchIcon img').getAttribute('data-anatomy'),'squid');
    await ready('#catchIcon');
    await page.screenshot({path:`${shots}/remodel-squid-catch.png`});await page.click('#continueBtn');
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');
    assert.equal(await page.evaluate(()=>__reelDeal.bag.at(-1).sp.id),'colossal-squid');
    await page.click('#bagBtn');await page.locator('[data-hold-fish]').last().click();
    assert.equal(await page.evaluate(()=>__reelDeal.carriedModel.userData.family),'squid');
    assert.deepEqual(errors,[],'no browser, shader or WebGL errors');
    console.log('PASS: real squid charge/flight/hook/animated fight/landing; matching catch illustration and saved/reloaded model, with no premature discovery');
  }catch(error){await page.screenshot({path:`${shots}/fish-model-failure.png`});throw error;}
  finally{await page.close();}
};
