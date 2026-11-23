const assert=require('node:assert/strict');
module.exports=async function testFishing(browser,url,shots){
 const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const startGame=async()=>{await page.click('#startBtn');if(await page.locator('#tutorialOverlay').isVisible())await page.click('#tutorialSkip');};
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
 try{
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await startGame();
  // Drive the real frame loop with a deterministic delta, not a copied equation.
  const result=await page.evaluate(async()=>{
   const a=__reelDeal,T=await import('three'),oldDelta=T.Clock.prototype.getDelta,oldRandom=Math.random,records=[];let visualCue=null;
   const frame=()=>new Promise(r=>requestAnimationFrame(r));
   try{
    T.Clock.prototype.getDelta=()=>.02;Math.random=()=>.5;
    for(const power of [0,.5,1])for(const distance of [5,100]){
     a.G.state='aim';a.G.gear={rod:1,line:1,bait:0};a.G.castTerritory=0;a.G.castPower=power;a.G.castShorePenalty=-.95;a.triggerBite();a.hookFish();a.G.castDist=distance;
     a.G.bandLo=25;a.G.bandHi=65;a.G.tension=45;a.G.progress=20;a.G.surgeTimer=a.G.yankTimer=10000;a.G.surgeDur=a.G.yankDur=0;a.G.reelHeld=false;
     if(power===0&&distance===5){
      a.G.fishTugTimer=0;await frame();let cue=document.getElementById('fishTugCue');
      const pre={visible:cue.classList.contains('show')&&getComputedStyle(cue).display!=='none',incoming:cue.classList.contains('incoming'),animated:getComputedStyle(cue).animationName==='tug-flash',label:document.getElementById('fishTugLabel').textContent};
      a.G.fishTugWarn=.02;await frame();await frame();
      const live={visible:cue.classList.contains('show'),active:cue.classList.contains('active'),animated:getComputedStyle(cue).animationName==='tug-jolt',label:document.getElementById('fishTugLabel').textContent};
      if(!pre.visible||!pre.incoming||!pre.animated||pre.label!=='DIVE'||!live.visible||!live.active||!live.animated||live.label!=='DIVE')throw Error('fish counter-move needs a visible animated one-word advance cue and live direction');
      visualCue={warning:pre,tug:live};a.G.fishTugTimer=10000;a.G.fishTugWarn=0;a.G.fishTugDur=0;a.G.fishTug=0;a.G.tension=45;a.G.progress=20;
     }
     await frame();records.push(a.G.progress-20);
     a.G.progress=20;a.G.tension=70;await frame();if(a.G.progress!==20)throw Error('yellow progressed');
     a.G.tension=7;await frame();if(a.G.state!=='aim')throw Error('slack did not lose');
     a.triggerBite();a.hookFish();a.G.tension=93;a.G.reelHeld=true;await frame();if(a.G.state!=='aim')throw Error('tight did not lose');
    }
   }finally{Math.random=oldRandom;T.Clock.prototype.getDelta=oldDelta;}
   return {records,expected:17*.02*a.RODS[1].reel/1.45,visualCue};
  });for(const n of result.records)assert.ok(Math.abs(n-result.expected)<1e-8);
  console.log('PASS live green progress at all cast powers/distances, yellow stalls, both red ends lose immediately');
  const awards=await page.evaluate(()=>{
   const a=__reelDeal,sp=a.SPECIES[19],other=a.SPECIES.filter(s=>s.island===0&&s!==sp);
   a.G.discoveries=Object.fromEntries(other.map(s=>[s.id,{count:1,best:s.minW,first:''}]));a.G.completedIslands=[];a.bag.splice(0,a.bag.length,{sp:a.SPECIES[0],weight:1});a.G.gear={rod:1,line:1,bait:1};a.G.castTerritory=0;a.G.castShorePenalty=0;a.G.castPower=.5;
   const prior=a.saleValue(a.SPECIES[0],1),before=a.G.xp,random=Math.random;
   try{a.triggerBite();let n=0;Math.random=()=>n++===0?.999999:.5;a.hookFish();const expected=a.catchXP(sp,a.G.fishWeight,true);a.catchFish();const first={xp:a.G.xp-before,expected,bonus:a.collectionCoinBonus(a.G.discoveries,a.G.completedIslands),newFlag:!document.getElementById('newDiscovery').classList.contains('hidden'),reward:!document.getElementById('collectionReward').classList.contains('hidden'),prior,after:a.saleValue(a.SPECIES[0],1)};
    const once=a.G.xp;a.catchFish();first.duplicate=a.G.xp-once;return first;
   }finally{Math.random=random;}
  });assert.equal(awards.xp,awards.expected);assert.equal(awards.bonus,5);assert.equal(awards.newFlag,true);assert.equal(awards.reward,true);assert.equal(awards.duplicate,0);assert.ok(awards.after>=awards.prior);await page.click('#continueBtn');
  // Real old-save boot: all 120 catches, moved islands, reduced gear, and permanent boosts.
  const old=await page.evaluate(async()=>{
   const a=__reelDeal,{LEGACY_V8_SPECIES:fish}=await import('./legacy-v8-data.mjs?v=44');
   const raw={version:8,coins:54321,xp:123456,caught:120,boat:5,ownedBoats:[0,5],zone:5,visited:[0,1,2,3,4,5],licenses:[0,1,2,3,4,5],owned:{rod:[0,23],line:[0,23],bait:[0,23]},gear:{rod:23,line:23,bait:23},bag:fish.map(s=>({n:s.name,w:s.maxW})),log:fish.map(s=>({n:s.name,w:s.maxW})),discoveries:Object.fromEntries(fish.map(s=>[s.id,{count:1,best:s.maxW,first:'2026-11-13'}]))};
   a.G.state='menu'; // Allow the explicit historical fixture to survive pagehide.
   localStorage.removeItem('reel-deal-save-v9');localStorage.setItem('reel-deal-save-v8',JSON.stringify(raw));return raw;
  });await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await startGame();
  const migrated=await page.evaluate(()=>{const a=__reelDeal;return {coins:a.G.coins,xp:a.G.xp,zone:a.G.zone,gear:a.G.gear,bag:a.bag.map(e=>({name:e.sp.name,w:e.weight,legacy:e.sp.legacy})),bonus:a.collectionCoinBonus(a.G.discoveries,a.G.completedIslands),backup:!!localStorage.getItem('reel-deal-save-v8'),version:JSON.parse(localStorage.getItem('reel-deal-save-v10')).version};});
  assert.equal(migrated.coins,old.coins);assert.equal(migrated.xp,old.xp);assert.equal(migrated.zone,15);assert.deepEqual(migrated.gear,{rod:31,line:31,bait:31});assert.equal(migrated.bonus,30);assert.equal(migrated.backup,true);assert.equal(migrated.version,9);assert.deepEqual(migrated.bag.map(e=>({n:e.name,w:e.w})),old.bag);assert.ok(migrated.bag.every(e=>e.legacy));
  await page.click('#indexBtn');await page.locator('[data-index-island="-2"]').click();assert.equal(await page.locator('.fish-entry.discovered').count(),120);await page.click('#indexClose');
  await page.click('#bagBtn');await page.locator('[data-hold-fish="117"]').click();assert.equal(await page.evaluate(()=>__reelDeal.heldCatch.sp.legacy),true);await page.click('#putAwayBtn');
  const names=await page.evaluate(()=>__reelDeal.bag.map(e=>e.sp.id));await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);assert.deepEqual(await page.evaluate(()=>__reelDeal.bag.map(e=>e.sp.id)),names);
  assert.deepEqual(errors,[]);console.log('PASS exact discovery XP/one-time collection reward/no double landings; real v8 boot, all 120 legacy catches, coins/XP/gear/access/bonuses, backup, legacy index/holding and idempotent reload');
 }catch(e){await page.screenshot({path:`${shots}/fishing-failure.png`});throw e;}finally{await page.close();}
};
