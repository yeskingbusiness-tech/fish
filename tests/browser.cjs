// Full current open-water regression runner. Uses real WebGL (SwiftShader in CI).
const assert=require('node:assert/strict'),fs=require('node:fs');
const{chromium}=require('playwright-core');
const URL=process.env.TEST_URL||'http://127.0.0.1:3100',shots=process.env.SCREENSHOT_DIR||'.artifacts/navigation-v42';fs.mkdirSync(shots,{recursive:true});
(async()=>{
 let executablePath=process.env.CHROMIUM_PATH,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'];
 if(!executablePath){const s=require('@sparticuz/chromium').default;executablePath=await s.executablePath();args=[...s.args.filter(a=>a!=='--single-process'),...args];}
 const browser=await chromium.launch({executablePath,headless:true,args}),errors=[];let page;
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
 const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 async function startGame(p){await p.click('#startBtn');if(await p.locator('#tutorialOverlay').isVisible())await p.click('#tutorialSkip');}
 async function boot(p){watch(p);await p.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;localStorage.setItem('reel-deal-progress-reset-v2.3.1','done');});await p.goto(URL,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__reelDeal);await startGame(p);}
 async function vendor(kind,zone=0){await page.evaluate(({kind,zone})=>{const a=__reelDeal;a.closeShop();a.closeMarket();a.closeChart();a.closeIndex();a.closeBag();a.spawnAtIsland(zone);const s=a.world.stalls.find(s=>s.zone===zone&&s.kind===kind);a.G.px=s.approach.x;a.G.pz=s.approach.z;a.G.state='aim';a.updateStats();},{kind,zone});await frame(page);}
 try{
  page=await browser.newPage({viewport:{width:1280,height:820}});await boot(page);
  assert.deepEqual(await page.evaluate(()=>[__reelDeal.SPECIES.length,__reelDeal.ISLANDS.length,__reelDeal.RODS.length,__reelDeal.LINES.length,__reelDeal.BAITS.length,__reelDeal.BOATS.length]),[400,20,41,41,41,8]);
  await page.click('#indexBtn');assert.equal(await page.locator('.undiscovered').count(),400);
  assert.equal(await page.evaluate(()=>{const html=document.getElementById('fishGrid').innerHTML;return __reelDeal.SPECIES.some(s=>html.includes('<h3>'+s.name+'</h3>')||html.includes('data-fish-id="'+s.id+'"'));}),false);
  assert.equal(await page.locator('#fishGrid [data-anatomy]').count(),0);
  await page.locator('#indexFilter').focus();
  const position=await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]);await page.keyboard.press('Space');await page.keyboard.down('w');await page.waitForTimeout(120);await page.keyboard.up('w');assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),position);
  for(let i=0;i<20;i++){
   await page.locator(`[data-index-island="${i}"]`).click();assert.equal(await page.locator('.fish-entry').count(),20);
   assert.deepEqual(await page.locator('.entry-top>span:first-child').allTextContents(),Array.from({length:20},(_,n)=>'#'+String(i*20+n+1).padStart(3,'0')));
  }
  await page.click('#indexClose');console.log('PASS 400 hidden entries, exact numbering, all twenty index filters and modal input isolation');
  // Every physical shop displays exactly two items; purchases charge exactly the label.
  for(let zone=0;zone<20;zone++)for(const kind of ['rod','line','bait']){
   await vendor(kind,zone);await page.evaluate(kind=>{const a=__reelDeal;a.G.xp=a.xpForLevel(400);a.G.coins=2e9;a.openShop(kind);},kind);
   assert.deepEqual(await page.locator('#shopBody .rod-card').evaluateAll(rows=>rows.map(r=>+r.dataset.tier)),zone===0?[0,1,40]:[zone*2,zone*2+1]);
   const n=zone*2+1;const result=await page.evaluate(({kind,n})=>{const a=__reelDeal,list=kind==='rod'?a.RODS:kind==='line'?a.LINES:a.BAITS;a.G.owned[kind]=[0];a.G.coins=list[n].cost-1;a.buyGear(kind,n);const denied=!a.G.owned[kind].includes(n);a.G.coins=list[n].cost+123;a.renderShop();const label=document.querySelector(`#shopBody [data-buy="${n}"]`).textContent,before=a.G.coins;a.buyGear(kind,n);return {denied,label,charged:before-a.G.coins,cost:list[n].cost,remaining:a.G.coins};},{kind,n});
   assert.equal(result.denied,true);assert.equal(result.charged,result.cost);assert.equal(result.remaining,123);assert.equal(Number(result.label.replace(/\D/g,'')),result.cost);
  }
  for(const kind of ['rod','line','bait']){await vendor(kind,0);const res=await page.evaluate(kind=>{const a=__reelDeal,list=kind==='rod'?a.RODS:kind==='line'?a.LINES:a.BAITS;a.G.coins=list[40].cost+5;a.G.owned[kind]=[0];a.openShop(kind);a.buyGear(kind,40);return {owned:a.G.owned[kind].includes(40),coins:a.G.coins,cost:list[40].cost};},kind);assert.equal(res.owned,true);assert.equal(res.coins,5);}
  console.log('PASS all 60 physical shops / 120 standard items plus three extra starter upgrades, exact charges and insufficient-funds guards');
  await vendor('port');await page.evaluate(()=>{const a=__reelDeal;a.G.xp=0;a.G.licenses=[0];a.G.coins=2e9;a.G.ownedBoats=[0];a.G.boat=0;a.openChart(true);});
  assert.equal(await page.locator('.boat-card').count(),8);
  for(let id=1;id<8;id++){await page.locator(`[data-boat="${id}"]`).click();assert.equal(await page.evaluate(()=>__reelDeal.G.boat),id);}
  await page.locator('[data-boat="0"]').click();assert.equal(await page.evaluate(()=>__reelDeal.G.boat),0);
  await page.click('#destinationsTab');assert.equal(await page.locator('[data-destination]').count(),20);assert.equal(await page.locator('#sailBtn,#skipVoyage').count(),0);
  await page.locator('[data-destination="1"]').click();assert.match(await page.locator('.destination-requirement').textContent(),/level 10/);await page.click('#waypointBtn');await page.click('#chartClose');
  // Board and actually drive via keys. Anchoring is manual and any boat can cross.
  await page.click('#boardBoatBtn');assert.equal(await page.evaluate(()=>__reelDeal.G.onBoat),true);
  const start=await page.evaluate(()=>__reelDeal.G.pz);await page.keyboard.down('w');await page.waitForTimeout(1700);await page.keyboard.up('w');assert.ok(await page.evaluate(()=>__reelDeal.G.pz)<start-4);
  const yaw=await page.evaluate(()=>__reelDeal.G.sailing.yaw);await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');assert.ok(await page.evaluate(()=>__reelDeal.G.sailing.yaw)<yaw);
  await page.keyboard.press('q');assert.equal(await page.evaluate(()=>__reelDeal.G.boatMode),'fish');await frame(page);assert.equal(await page.evaluate(()=>__reelDeal.G.sailing.speed),0);
  // Same route point just outside every border; old and new vessel classes get the same access result.
  for(let id=1;id<20;id++){
   const result=await page.evaluate(async id=>{const a=__reelDeal,n=await import('./navigation.mjs?v=44'),i=a.ISLANDS[id],c=n.territoryCenter(i),from={x:c.x,z:c.z-n.TERRITORY_RADIUS-25},to={x:c.x,z:c.z-n.TERRITORY_RADIUS+25};return a.BOATS.map(b=>({locked:n.boatMoveBlock(from,to,{xp:a.xpForLevel(i.level)-1,radius:b.size*4})?.kind,open:n.boatMoveBlock(from,to,{xp:a.xpForLevel(i.level),radius:b.size*4})}));},id);
   assert.ok(result.every(r=>r.locked==='level'&&r.open===null));
  }
  await page.evaluate(()=>{const a=__reelDeal,i=a.ISLANDS[1];a.G.xp=a.xpForLevel(10);a.G.licenses=[0];a.G.sailing={...a.islandToWorld(i,0,-120),yaw:i.layout.yaw,speed:0};a.G.boat=0;a.G.boatMode='fish';a.tickBoat(.02);});await frame(page);
  assert.equal(await page.evaluate(()=>__reelDeal.G.zone),1);assert.equal(await page.locator('#arrivalName').textContent(),'Pinewater Isle');assert.equal(await page.locator('#arrivalBanner').isVisible(),true);
  assert.equal(await page.evaluate(()=>__reelDeal.G.boat),0);
  await page.evaluate(async()=>{const a=__reelDeal,n=await import('./navigation.mjs?v=44');a.G.sailing={...n.dockPose(1,a.BOATS[0].size),speed:0};a.tickBoat(.01);a.updateBoatUI();});await page.click('#dockBoatBtn');assert.equal(await page.evaluate(()=>__reelDeal.G.onBoat),false);assert.equal(await page.evaluate(()=>__reelDeal.G.zone),1);
  console.log('PASS manual throttle/steering/stop/docking; all 152 boat/border combinations; starter-boat arrival and territory banner');
  // A real tiny catch: choose a weighted picker interval; let actual fight run.
  await page.evaluate(async()=>{const a=__reelDeal;a.spawnAtIsland(4);a.G.xp=a.xpForLevel(400);a.G.licenses=a.ISLANDS.map(i=>i.id);a.G.gear={rod:9,line:9,bait:9};a.G.owned={rod:[0,9],line:[0,9],bait:[0,9]};a.G.px=a.ISLANDS[4].x;a.G.pz=a.ISLANDS[4].z-65;a.G.onBoat=true;a.G.boatMode='fish';a.G.sailing={x:a.G.px,z:a.G.pz,yaw:0,speed:0};a.G.yaw=0;a.G.pitch=-.12;a.G.castTerritory=4;a.G.castShorePenalty=0;a.updateStats();});await frame(page);
  await page.keyboard.down('Space');await page.waitForFunction(()=>__reelDeal.G.power>.6);await page.keyboard.up('Space');await page.waitForFunction(()=>__reelDeal.G.state==='waiting',null,{timeout:20000});
  const hook=await page.evaluate(async()=>{const a=__reelDeal,d=await import('./game-data.mjs?v=44'),pool=a.eligibleSpecies(4,9),weights=pool.map(s=>d.speciesChance(s,9,a.G.castPower,a.G.castShorePenalty)),index=pool.findIndex(s=>s.name==='Clown Killifish');const q=(weights.slice(0,index).reduce((n,w)=>n+w,0)+weights[index]/2)/weights.reduce((a,b)=>a+b,0),random=Math.random;
   try{a.triggerBite();let calls=0;Math.random=()=>calls++===0?q:.5;a.hookFish();}finally{Math.random=random;}return {id:a.hookedFish.userData.designId,weight:a.G.fishWeight,text:document.getElementById('reelFishName').textContent};});
  assert.equal(hook.id,'clown-killifish');assert.ok(hook.weight>0&&hook.weight<.01);assert.match(hook.text,/Unidentified/);
  const state=await page.evaluate(()=>new Promise(resolve=>{const a=__reelDeal,start=performance.now();function steer(){if(a.G.state!=='reeling'||performance.now()-start>50000){resolve(a.G.state);return;}a.G.reelHeld=a.G.tension<(a.G.bandLo+a.G.bandHi)/2;requestAnimationFrame(steer);}steer();}));assert.equal(state,'caught');
  assert.equal(await page.locator('#catchName').textContent(),'Clown Killifish');assert.ok(await page.evaluate(()=>__reelDeal.bag.at(-1).weight)>0);await page.screenshot({path:`${shots}/tiny-catch.png`});await page.click('#continueBtn');
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await startGame(page);assert.equal(await page.evaluate(()=>__reelDeal.G.onBoat),true);assert.equal(await page.evaluate(()=>__reelDeal.bag.at(-1).sp.id),'clown-killifish');assert.ok(await page.evaluate(()=>__reelDeal.bag.at(-1).weight)>0);
  await vendor('market',4);await page.evaluate(()=>__reelDeal.openMarket());const sale=await page.evaluate(()=>{const a=__reelDeal,n=a.G.coins,v=a.bagTotal();a.sellAll();return {got:a.G.coins-n,expected:v,discovered:!!a.G.discoveries['clown-killifish']};});assert.equal(sale.got,sale.expected);assert.equal(sale.discovered,true);await page.click('#marketClose');
  console.log('PASS real boat-based charge/flight/tiny-fish hook/tension/landing, sailing-position save/reload and accurate market payment');
  // Mobile: layout, touch-style boat controls, minimap and fully selectable map.
  await page.close();page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await boot(page);await vendor('port');await page.tap('#boardBoatBtn');await page.tap('#boatModeBtn');assert.equal(await page.evaluate(()=>__reelDeal.G.boatMode),'fish');await page.tap('#boatModeBtn');
  const stick=await page.locator('#stick').boundingBox();const before=await page.evaluate(()=>__reelDeal.G.pz);await page.dispatchEvent('#stick','pointerdown',{pointerId:4,pointerType:'touch',clientX:stick.x+45,clientY:stick.y+45});await page.dispatchEvent('#stick','pointermove',{pointerId:4,pointerType:'touch',clientX:stick.x+45,clientY:stick.y+4});await page.waitForTimeout(1200);await page.dispatchEvent('#stick','pointerup',{pointerId:4,pointerType:'touch'});assert.ok(await page.evaluate(()=>__reelDeal.G.pz)<before-2);
  await page.tap('#minimapButton');assert.equal(await page.locator('#chartOverlay').isVisible(),true);await page.locator('[data-destination="19"]').tap();await page.locator('#waypointBtn').tap();assert.equal(await page.evaluate(()=>__reelDeal.G.waypoint),19);await page.screenshot({path:`${shots}/map-mobile.png`});await page.tap('#chartClose');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`${shots}/helm-mobile.png`});await page.close();page=null;
  console.log('PASS mobile joystick, stop/helm controls, minimap expansion, final-island waypoint and no page overflow');
  await require('./navigation-browser.cjs')(browser,URL,shots);
  await require('./fishing-browser.cjs')(browser,URL,shots);
  await require('./fish-model-browser.cjs')(browser,URL,shots);
  await require('./ui-browser.cjs')(browser,URL,shots);
  await require('./performance-browser.cjs')(browser,URL,shots);
  assert.deepEqual(errors,[]);console.log('ALL BROWSER CHECKS PASSED');
 }catch(error){if(page&&!page.isClosed())await page.screenshot({path:`${shots}/browser-failure.png`});throw error;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
