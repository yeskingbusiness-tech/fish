// Rendering/UI budgets, lazy exact-vector thumbnails and continuous adaptation.
// No wall-clock FPS assertions: CI uses a software GPU, not the player's device.
const assert=require('node:assert/strict');
const fs=require('node:fs');
module.exports=async function testPerformance(browser,url,shots){
  const errors=[],metrics={};
  let page=await browser.newPage({viewport:{width:1280,height:800}});
  const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  const frame=(p,count=2)=>p.evaluate(count=>new Promise(resolve=>{function next(){if(--count<=0)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}),count);
  async function boot(p){
    watch(p);await p.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
    await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__reelDeal);
  }
  const ready=(p,id)=>p.waitForFunction(id=>{
    const root=document.getElementById(id),b=root.getBoundingClientRect();
    const visible=[...root.querySelectorAll('img.fish-thumbnail')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>b.top&&r.top<b.bottom&&r.right>b.left&&r.left<b.right;});
    return visible.length&&visible.every(e=>e.complete&&e.naturalWidth>0&&e.getAttribute('src'));
  },id);
  async function scrollAll(p,id){
    const {height,step}=await p.locator('#'+id).evaluate(e=>({height:e.scrollHeight-e.clientHeight,step:Math.max(50,e.clientHeight*.65)}));
    for(let y=0;y<height+step;y+=step){await p.locator('#'+id).evaluate((e,y)=>e.scrollTop=y,y);await ready(p,id);}
  }
  try{
    await boot(page);await page.click('#startBtn');await page.click('#indexBtn');
    assert.equal(await page.locator('#fishGrid img,[data-anatomy]').count(),0);
    assert.equal(await page.evaluate(()=>__reelDeal.performanceStats.icons.images),0);
    await page.click('#indexClose');
    await page.evaluate(()=>{
      const a=__reelDeal,fish=Array.from({length:240},(_,i)=>({id:a.SPECIES[i%120].id,n:a.SPECIES[i%120].name,w:a.SPECIES[i%120].maxW}));
      localStorage.setItem('reel-deal-save-v9',JSON.stringify({version:9,coins:1234,xp:a.xpForLevel(400),caught:240,
        bag:fish,log:fish.slice(0,200),licenses:a.ISLANDS.map(i=>i.id),
        discoveries:Object.fromEntries(a.SPECIES.map(s=>[s.id,{count:2,best:s.maxW,first:''}]))}));
    });
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');
    assert.equal(await page.locator('#logList .log-item,#logList img,#logList path').count(),0,'closed history stays unbuilt at boot');
    assert.equal(await page.evaluate(()=>__reelDeal.performanceStats.icons.images),0);
    await page.evaluate(()=>{__reelDeal.saveGame();window.perfSave=localStorage.getItem('reel-deal-save-v9');});

    metrics.index=await page.evaluate(()=>{const start=performance.now();__reelDeal.openIndex();const e=document.getElementById('fishGrid');return {synchronousMs:performance.now()-start,elements:e.querySelectorAll('*').length,paths:e.querySelectorAll('path').length,markupBytes:e.innerHTML.length};});
    assert.equal(await page.locator('#fishGrid img.fish-thumbnail').count(),400);assert.equal(metrics.index.paths,0);assert.ok(metrics.index.elements<6500);
    await ready(page,'fishGrid');
    const first=await page.evaluate(()=>({loaded:document.querySelectorAll('#fishGrid img[src]').length,cached:__reelDeal.performanceStats.icons.images}));
    assert.ok(first.loaded>0&&first.loaded<40,JSON.stringify(first));assert.ok(first.cached<40,'do not generate all 400 sculpts on open');
    await page.screenshot({path:`${shots}/performance-index.png`});
    await scrollAll(page,'fishGrid');
    const artwork=await page.evaluate(async()=>{
      const a=__reelDeal,failures=[];window.artSources={};
      for(const image of document.querySelectorAll('#fishGrid img')){
        const sp=a.SPECIES.find(s=>s.id===image.dataset.fishId);
        if(!image.src||image.alt!==sp.name||!image.complete||!image.naturalWidth){failures.push('unloaded/mislabeled '+sp.id);continue;}
        const text=await(await fetch(image.src)).text();
        if(text!==a.fishSVG(sp))failures.push('changed artwork '+sp.id);
        if(!text.includes(`data-anatomy="${image.dataset.anatomy}"`))failures.push('wrong family '+sp.id);
        window.artSources[sp.id]=image.src;
      }
      return {failures,images:a.performanceStats.icons.images};
    });
    assert.deepEqual(artwork.failures,[]);assert.equal(artwork.images,400);await page.click('#indexClose');
    assert.equal(await page.evaluate(()=>__reelDeal.performanceStats.icons.observers),0);

    metrics.bag=await page.evaluate(()=>{const start=performance.now();__reelDeal.openFishBag();const e=document.getElementById('bagBody');return {synchronousMs:performance.now()-start,elements:e.querySelectorAll('*').length,paths:e.querySelectorAll('path').length,markupBytes:e.innerHTML.length};});
    assert.equal(await page.locator('#bagBody img').count(),240);assert.equal(metrics.bag.paths,0);assert.ok(metrics.bag.elements<2200);await ready(page,'bagBody');
    const firstId=await page.locator('#bagBody img').first().getAttribute('data-fish-id');
    await page.locator(`#bagBody img[data-fish-id="${firstId}"]`).last().scrollIntoViewIfNeeded();await ready(page,'bagBody');
    assert.equal(await page.locator(`#bagBody img[data-fish-id="${firstId}"]`).evaluateAll(images=>images.every(image=>image.src===window.artSources[image.dataset.fishId])),true,'duplicates reuse the index image, not another SVG tree/URL');
    await page.locator('[data-hold-fish]').last().click();
    assert.equal(await page.evaluate(()=>__reelDeal.heldCatch===__reelDeal.bag.at(-1)),true,'lazy rows retain specimen identity');
    await page.click('#putAwayBtn');

    await page.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===0&&s.kind==='market');a.G.px=s.x;a.G.pz=s.z-3.8;a.openMarket();});
    assert.equal(await page.locator('#marketBody img').count(),240);assert.equal(await page.locator('#marketBody path').count(),0);
    await ready(page,'marketBody');await page.screenshot({path:`${shots}/performance-market.png`});await page.click('#marketClose');
    for(const viewport of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
      await page.click('#bagBtn');await ready(page,'bagBody');
      assert.equal(await page.locator('#bagBody').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      await page.locator('[data-hold-fish]').last().scrollIntoViewIfNeeded();await ready(page,'bagBody');
      if(viewport.width===390)await page.screenshot({path:`${shots}/performance-bag-mobile.png`});
      await page.click('#bagClose');
    }
    await page.setViewportSize({width:1280,height:800});await frame(page);
    await page.evaluate(()=>{const a=__reelDeal;for(let n=0;n<16;n++){a.openIndex();a.closeIndex();a.openFishBag();a.selectBagTab('rods');a.closeBag();}});
    await frame(page);
    assert.deepEqual(await page.evaluate(()=>__reelDeal.performanceStats.icons),{images:400,observers:0,pending:0},'cancelled lazy callbacks neither leak observers nor rebuild images');
    assert.equal(await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v9')===window.perfSave;}),true);

    await page.click('#logBtn');await ready(page,'logList');
    assert.equal(await page.locator('#logList .log-item').count(),200);assert.equal(await page.locator('#logList path').count(),0);
    await page.evaluate(()=>{window.firstLogRow=document.querySelector('#logList .log-item');});
    await page.click('#closeLog');await page.click('#logBtn');
    assert.equal(await page.evaluate(()=>window.firstLogRow===document.querySelector('#logList .log-item')),true,'unchanged history reopens without rebuilding');
    await page.click('#closeLog');
    const catchResult=await page.evaluate(async()=>{
      const a=__reelDeal;let mutations=0;const observer=new MutationObserver(r=>mutations+=r.length);
      observer.observe(document.getElementById('logList'),{childList:true,subtree:true,attributes:true});
      a.spawnAtIsland(0);a.triggerBite();a.hookFish();const start=performance.now();a.catchFish();const ms=performance.now()-start;
      await new Promise(r=>requestAnimationFrame(r));observer.disconnect();
      return {ms,mutations,name:a.bag.at(-1).sp.name,sameRow:window.firstLogRow===document.querySelector('#logList .log-item')};
    });
    assert.equal(catchResult.mutations,0);assert.equal(catchResult.sameRow,true);metrics.closedLogCatchMs=catchResult.ms;
    await ready(page,'catchIcon');await page.click('#continueBtn');await page.click('#logBtn');await ready(page,'logList');
    assert.equal(await page.locator('#logList .log-item b').first().textContent(),catchResult.name);
    assert.equal(await page.locator('#logList .log-item').count(),200);await page.click('#closeLog');
    console.log('PASS: all 400 thumbnails exactly match the original vectors; lazy index/240-fish Bag/market/200-entry log, duplicate image reuse, closed-log no-op, observer cleanup, mobile layout and unchanged saves');

    await page.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===0&&s.kind==='rod');a.G.px=s.x;a.G.pz=s.z-3.8;});
    await page.waitForFunction(()=>__reelDeal.performanceStats.activeParticles===0);await frame(page,3);
    const idle=await page.evaluate(async()=>{
      const a=__reelDeal,before=a.performanceStats,p=a.scene.children.find(o=>o.isInstancedMesh&&o.count===70),version=p.instanceMatrix.version;
      let mutations=0;const observer=new MutationObserver(r=>mutations+=r.length);observer.observe(document.getElementById('hud'),{subtree:true,childList:true,attributes:true,characterData:true});
      for(let n=0;n<30;n++)await new Promise(r=>requestAnimationFrame(r));observer.disconnect();
      const after=a.performanceStats;return {mutations,uploads:p.instanceMatrix.version-version,visible:p.visible,vendors:after.vendorChecks-before.vendorChecks,hints:after.hintChecks-before.hintChecks,pools:after.baitPools-before.baitPools};
    });
    assert.deepEqual(idle,{mutations:0,uploads:0,visible:false,vendors:0,hints:0,pools:0});metrics.idle30Frames=idle;
    assert.equal(await page.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===0&&s.kind==='bait');a.G.px=s.x;a.G.pz=s.z-3.8;return a.nearestVendor().kind;}),'bait');
    await frame(page);assert.match(await page.locator('#shopBtn').textContent(),/Bait Shack/);
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;a.G.px=0;a.G.pz=4;a.openShop('bait');return a.shopOpen;}),false,'cached proximity must not waive physical vendor guards');
    const pools=await page.evaluate(()=>{const a=__reelDeal;for(let zone=0;zone<6;zone++)for(let bait=0;bait<24;bait++){a.G.zone=zone;a.G.gear.bait=bait;a.updateStats();const empty=a.eligibleSpecies(zone,bait).length===0;if(!!document.querySelector('#equipmentStrip .wrong-bait')!==empty)return false;}a.spawnAtIsland(0);a.G.gear.bait=0;a.updateStats();return a.performanceStats.baitPools;});
    assert.equal(pools,144);
    await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.5);await page.keyboard.up('Space');
    await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:15000});
    const live=await page.evaluate(()=>({active:__reelDeal.performanceStats.activeParticles,uploads:__reelDeal.performanceStats.particleUploads}));
    assert.ok(live.active>0);await frame(page,3);assert.ok(await page.evaluate(()=>__reelDeal.performanceStats.particleUploads)>live.uploads);
    await page.keyboard.press('Space');await page.waitForFunction(()=>__reelDeal.G.state==='aim'&&__reelDeal.performanceStats.activeParticles===0&&__reelDeal.performanceStats.activeRipples===0);
    const stopped=await page.evaluate(()=>__reelDeal.performanceStats.particleUploads);await frame(page,10);assert.equal(await page.evaluate(()=>__reelDeal.performanceStats.particleUploads),stopped);
    console.log('PASS: stationary HUD/vendor/hint/pool work and empty-particle uploads stop; vendor/tackle changes invalidate immediately; real cast splashes still animate and return to idle');

    await page.close();page=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:2});await boot(page);
    await page.evaluate(async()=>{const T=await import('three');window.originalDelta=T.Clock.prototype.getDelta;window.qualityDt=1/60;T.Clock.prototype.getDelta=function(){const real=window.originalDelta.call(this);return window.qualityDt??real;};});
    await page.click('#startBtn');await frame(page,180);
    assert.equal(await page.evaluate(()=>__reelDeal.renderer.getPixelRatio()),1.5);
    await page.evaluate(()=>{__reelDeal.saveGame();window.qualitySave=localStorage.getItem('reel-deal-save-v9');window.qualityDt=1/25;});
    await page.waitForFunction(()=>__reelDeal.renderer.getPixelRatio()<1.5);
    const reduced=await page.evaluate(()=>__reelDeal.renderer.getPixelRatio());
    await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
    assert.ok(await page.evaluate(()=>__reelDeal.renderer.getPixelRatio())<=reduced,'resize cannot reset quality to full DPR');
    await page.click('#helpBtn');const paused=await page.evaluate(()=>__reelDeal.renderer.getPixelRatio());await frame(page,100);
    assert.equal(await page.evaluate(()=>__reelDeal.renderer.getPixelRatio()),paused,'menu frame times are excluded');
    await page.click('#helpClose');await page.evaluate(()=>window.qualityDt=1/60);
    await page.waitForFunction(r=>__reelDeal.renderer.getPixelRatio()>r,paused,{timeout:60000});
    const recovered=await page.evaluate(()=>__reelDeal.renderer.getPixelRatio());
    assert.ok(recovered>paused);
    await page.evaluate(()=>window.qualityDt=2);await frame(page,20);assert.equal(await page.evaluate(()=>__reelDeal.renderer.getPixelRatio()),recovered,'tab-resume/long-task-sized delta is ignored');
    assert.equal(await page.evaluate(()=>{const a=__reelDeal;a.saveGame();const canvas=document.getElementById('scene'),q=a.renderer.getPixelRatio();return canvas.width===Math.floor(innerWidth*q)&&canvas.height===Math.floor(innerHeight*q)&&canvas.getBoundingClientRect().width===innerWidth&&localStorage.getItem('reel-deal-save-v9')===window.qualitySave;}),true,'only canvas resolution changes, not CSS/UI size or saves');
    await page.evaluate(async()=>{const T=await import('three');T.Clock.prototype.getDelta=window.originalDelta;});
    metrics.quality={reduced,recovered};assert.deepEqual(errors,[]);
    console.log('PASS: actual renderer continuously reduces/recovers resolution after startup, preserves reduction across orientation changes, ignores menu/long-pause frames and leaves sharp UI/save data alone');
    fs.writeFileSync(`${shots}/v41-performance-browser.json`,JSON.stringify(metrics,null,2));
  }catch(error){if(!page.isClosed())await page.screenshot({path:`${shots}/performance-failure.png`});throw error;}
  finally{await page.close();}
};
