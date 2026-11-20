// Oriented physical villages, persistent parked boats, map migration and the low
// helm camera through the production browser path (not a second implementation).
const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async function testNavigation(browser,url,shots){
 const errors=[],watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
 const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 async function boot(p){watch(p);await p.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});await p.goto(url,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__reelDeal);await p.click('#startBtn');}
 async function capture(p,name){await p.evaluate(()=>document.getElementById('toast').classList.add('hidden'));await p.screenshot({path:`${shots}/${name}.png`});}
 const page=await browser.newPage({viewport:{width:1280,height:820}});
 try{
  await boot(page);assert.equal(await page.locator('#boardBoatBtn').isVisible(),true);assert.equal(await page.evaluate(()=>__reelDeal.G.nearPort),false);
  // No chart or trip to the port is needed even on a brand-new save.
  await page.locator('#boardBoatBtn').focus();await page.keyboard.press('Space');
  assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.onBoat,__reelDeal.G.state,__reelDeal.chartOpen,document.activeElement.id]),[true,'aim',false,'scene']);
  const walked=await page.evaluate(()=>__reelDeal.G.walked);await page.keyboard.down('w');await page.waitForTimeout(750);await page.keyboard.up('w');await page.keyboard.press('q');
  assert.equal(await page.evaluate(()=>__reelDeal.G.walked),walked,'helm input cannot also cause footsteps/walk bob');
  const deckStart=await page.evaluate(()=>({x:__reelDeal.G.px,z:__reelDeal.G.pz,boat:{...__reelDeal.G.sailing}}));
  await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');
  const deckWalk=await page.evaluate(()=>({x:__reelDeal.G.px,z:__reelDeal.G.pz,boat:{...__reelDeal.G.sailing}}));
  assert.ok(Math.hypot(deckWalk.x-deckStart.x,deckWalk.z-deckStart.z)>.2,'stopped player can walk on deck');
  assert.deepEqual(deckWalk.boat,deckStart.boat,'walking does not move the parked hull');
  await page.keyboard.press('q');assert.deepEqual(await page.evaluate(()=>[__reelDeal.G.px,__reelDeal.G.pz]),[deckStart.boat.x,deckStart.boat.z],'taking helm returns player to helm position');
  await page.keyboard.press('q');
  await page.keyboard.press('e');assert.equal(await page.evaluate(()=>__reelDeal.G.onBoat),false);
  const parked=await page.evaluate(()=>({...__reelDeal.G.boatPosition}));
  await page.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===0&&s.kind==='line');a.G.px=s.approach.x;a.G.pz=s.approach.z;a.updateBoatUI();});await frame(page);
  assert.equal(await page.locator('#boardBoatLabel').textContent(),'Return to boat');
  const persistent=await page.evaluate(()=>{const a=__reelDeal;return {saved:a.G.boatPosition,mesh:{x:a.world.boat.position.x,z:a.world.boat.position.z,yaw:a.world.boat.rotation.y}};});
  assert.deepEqual(persistent.saved,parked);assert.deepEqual(persistent.mesh,parked);
  const guards=await page.evaluate(()=>{const a=__reelDeal,before=[a.G.px,a.G.pz,JSON.stringify(a.G.boatPosition)],results=[];
   for(const state of ['charging','casting','waiting','bite','reeling','caught']){a.G.state=state;a.updateBoatUI();results.push({state,blocked:a.boardBoat()===false,disabled:document.getElementById('boardBoatBtn').disabled,same:JSON.stringify(before)===JSON.stringify([a.G.px,a.G.pz,JSON.stringify(a.G.boatPosition)])});}
   a.G.state='aim';a.updateBoatUI();return results;
  });assert.ok(guards.every(r=>r.blocked&&r.disabled&&r.same));
  // A waypoint is never a teleport destination. Even if the player is elsewhere,
  // Return to boat must move them to the old berth, not bring that boat to them.
  await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(400);a.G.licenses=a.ISLANDS.map(i=>i.id);a.spawnAtIsland(1);a.updateStats();a.updateBoatUI();a.saveGame();});
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');await frame(page);
  assert.deepEqual(await page.evaluate(()=>({boat:__reelDeal.G.boatPosition,sailing:__reelDeal.G.sailing,aboard:__reelDeal.G.onBoat,zone:__reelDeal.G.zone})),{boat:parked,sailing:null,aboard:false,zone:1});
  assert.deepEqual(await page.evaluate(()=>({x:__reelDeal.world.boat.position.x,z:__reelDeal.world.boat.position.z,yaw:__reelDeal.world.boat.rotation.y})),parked);
  await page.keyboard.press('m');await page.locator('[data-destination="19"]').click();await page.click('#waypointBtn');await page.keyboard.press('r');assert.equal(await page.evaluate(()=>__reelDeal.G.onBoat),false,'map focus must block a return shortcut');await page.keyboard.press('Escape');
  await page.keyboard.press('r');assert.deepEqual(await page.evaluate(()=>({x:__reelDeal.G.px,z:__reelDeal.G.pz,yaw:__reelDeal.G.sailing.yaw})),parked);assert.equal(await page.evaluate(()=>__reelDeal.G.zone),0);assert.equal(await page.evaluate(()=>__reelDeal.G.waypoint),19);
  await page.keyboard.press('e');
  await page.evaluate(()=>{const a=__reelDeal;a.bag.push({sp:a.SPECIES[0],weight:1});a.G.caught=1;a.openBag();});await page.locator('[data-hold-fish="0"]').click();await page.keyboard.press('r');assert.equal(await page.evaluate(()=>__reelDeal.heldCatch),null);assert.equal(await page.evaluate(()=>__reelDeal.bag.length),1);
  console.log('PASS: immediate Board boat / R, native Space, modal/fight guards, no helm footsteps, parked-boat independence and reload, player-only return, waypoint isolation and safe fish stowing');

  const layout=await page.evaluate(()=>{
   const a=__reelDeal,failures=[],records=[];a.G.onBoat=false;a.G.sailing=null;a.G.state='aim';
   for(const i of a.ISLANDS){
    a.spawnAtIsland(i.id);const spawn=a.islandSpawn(i);if(a.world.groundAt(spawn.x,spawn.z,i.id)===null)failures.push('spawn '+i.name);
    const vendors=a.world.stalls.filter(s=>s.zone===i.id);
    for(const s of vendors){a.G.px=s.approach.x;a.G.pz=s.approach.z;if(a.world.groundAt(a.G.px,a.G.pz,i.id)===null)failures.push('blocked counter '+i.name+'/'+s.kind);if(a.nearestVendor()?.kind!==s.kind)failures.push('wrong vendor '+i.name+'/'+s.kind);}
    const step=.8,key=(x,z)=>x+','+z,q=[[Math.round(i.layout.dockX/step),5]],seen=new Set([key(...q[0])]);
    for(let n=0;n<q.length;n++){const[x,z]=q[n];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,k=key(xx,zz);if(xx<-40||xx>40||zz<-3||zz>70||seen.has(k))continue;const p=a.islandToWorld(i,xx*step,zz*step);if(a.world.groundAt(p.x,p.z,i.id)!==null){seen.add(k);q.push([xx,zz]);}}}
    for(const s of i.layout.stalls)if(!q.some(([x,z])=>Math.hypot(x*step-s.x,z*step-(s.z-3.8))<1))failures.push('unreachable '+i.name+'/'+s.kind);
    for(const b of a.BOATS){const p=a.dockPose(i.id,b.size);if(!a.world.inWater(p)||a.nearbyDock(p.x,p.z)!==i.id)failures.push('berth '+i.name+'/'+b.name);}
    const group=a.world.islands[i.id];if(group.rotation.y!==i.layout.yaw)failures.push('render heading '+i.name);
    for(const c of a.world.cameraBlockers[i.id])if(!Number.isFinite(c.x+c.z+c.r+c.top))failures.push('camera collider '+i.name);
    records.push({id:i.id,heading:i.layout.quarter,berthSide:i.layout.berthSide,walkableNodes:q.length,counters:vendors.length});
   }
   return {failures,records};
  });assert.deepEqual(layout.failures,[]);fs.writeFileSync(`${shots}/layout-reachability.json`,JSON.stringify(layout.records,null,2));
  console.log('PASS: all twenty rotated spawns, 100 correct physical counters, full walkable pier-to-counter flood searches, 160 clear berths and transformed camera blockers');

  // Inspect the actual eight meshes through the actual helm camera at both
  // aspect ratios. No shrunken proxy hull or test-only camera is used.
  const cameras=[];
  for(const view of [{width:1280,height:820},{width:390,height:844}]){
   await page.setViewportSize(view);await frame(page);
   for(let boat=0;boat<8;boat++){
    const record=await page.evaluate(async boat=>{
     const a=__reelDeal,T=await import('three');a.spawnAtIsland(0);a.G.boat=boat;a.world.setBoat(boat);a.G.boatPosition={...a.islandToWorld(a.ISLANDS[0],0,-130),yaw:0};a.boardBoat();a.updatePlayerView();
     a.world.update(15,1,0,a.frontCamera,true,a.G.boatPosition);a.scene.updateMatrixWorld(true);a.frontCamera.updateMatrixWorld(true);
     const lo={x:Infinity,y:Infinity},hi={x:-Infinity,y:-Infinity};let vertices=0,bad=false;
     a.world.boat.traverse(o=>{if(o.isMesh)for(let n=0;n<o.geometry.attributes.position.count;n++){const v=new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,n).applyMatrix4(o.matrixWorld).project(a.frontCamera);lo.x=Math.min(lo.x,v.x);lo.y=Math.min(lo.y,v.y);hi.x=Math.max(hi.x,v.x);hi.y=Math.max(hi.y,v.y);vertices++;if(!Number.isFinite(v.x+v.y+v.z)||Math.abs(v.x)>1.01||Math.abs(v.y)>1.01||v.z< -1||v.z>1)bad=true;}});
     const target=new T.Vector3();a.frontCamera.getWorldDirection(target);return {boat,aspect:a.frontCamera.aspect,vertices,bad,lo,hi,pitch:Math.asin(-target.y)*180/Math.PI,draws:a.renderer.info.render.calls};
    },boat);
    assert.equal(record.bad,false,JSON.stringify(record));assert.ok(record.vertices>0);assert.ok(record.pitch>0&&record.pitch<7);cameras.push(record);
    if(boat===0||boat===7)await capture(page,`low-helm-${view.width}-${boat}`);
   }
  }
  fs.writeFileSync(`${shots}/helm-cameras.json`,JSON.stringify(cameras,null,2));
  console.log('PASS: all eight full-sized hulls fit the low forward-facing production camera on desktop and portrait; no near-plane or canopy clipping');

  await page.setViewportSize({width:1280,height:820});
  const historic=await page.evaluate(async()=>{
   const a=__reelDeal,{V41_ISLAND_ANCHORS}=await import('./legacy-v41-world.mjs?v=44'),id=15,p=V41_ISLAND_ANCHORS[id],b=a.BOATS[6];
   const raw={version:9,zone:id,boat:b.id,ownedBoats:[0,b.id],xp:a.xpForLevel(275),coins:87654321,caught:11,completedIslands:[0,1],licenses:[0,1,id],owned:{rod:[0,31],line:[0,31],bait:[0,31]},gear:{rod:31,line:31,bait:31},bag:[{id:a.SPECIES[80].id,w:a.SPECIES[80].minW}],sailing:{x:p.x+14+b.size*4,z:p.z-6-b.size*2,yaw:.3}};
   a.G.state='menu';localStorage.setItem('reel-deal-save-v9',JSON.stringify(raw));return raw;
  });
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');
  const migrated=await page.evaluate(async()=>{const a=__reelDeal,n=await import('./navigation.mjs?v=44');a.saveGame();return {zone:a.G.zone,aboard:a.G.onBoat,boat:a.G.boat,coins:a.G.coins,xp:a.G.xp,gear:a.G.gear,earned:a.G.completedIslands,weight:a.bag[0].weight,valid:n.validBoatPose(a.G.sailing,a.BOATS[a.G.boat],a.G),save:JSON.parse(localStorage.getItem('reel-deal-save-v9'))};});
  assert.equal(migrated.zone,15);assert.equal(migrated.aboard,true);assert.equal(migrated.boat,6);assert.equal(migrated.coins,historic.coins);assert.equal(migrated.xp,historic.xp);assert.deepEqual(migrated.gear,historic.gear);assert.deepEqual(migrated.earned,historic.completedIslands);assert.equal(migrated.weight,historic.bag[0].w);assert.equal(migrated.valid,true);assert.equal(migrated.save.worldLayout,2);
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');
  assert.deepEqual(await page.evaluate(()=>{__reelDeal.saveGame();return JSON.parse(localStorage.getItem('reel-deal-save-v9'));}),migrated.save);
  console.log('PASS: real v41-grid save migration and idempotent reload, preserving boating state, coins, XP, ownership, exact tiny weight and permanent bonuses');
 }catch(e){if(!page.isClosed())await capture(page,'navigation-failure');throw e;}finally{await page.close();}

 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await boot(mobile);
  for(const viewport of [{width:390,height:844},{width:360,height:740},{width:844,height:390}]){
   await mobile.setViewportSize(viewport);await frame(mobile);
   assert.equal(await mobile.locator('#boardBoatBtn').evaluate(e=>e.getBoundingClientRect().height>=44),true);
   await mobile.tap('#minimapButton');
   const map=await mobile.locator('#seaChart').evaluate(e=>{
    const own=e.getBoundingClientRect(),rects=[...e.querySelectorAll('[data-destination]')].map(b=>({id:b.dataset.destination,r:b.getBoundingClientRect()})),overlaps=[];
    for(const[a,{r}]of rects.entries())for(const b of rects.slice(a+1))if(r.left<b.r.right&&r.right>b.r.left&&r.top<b.r.bottom&&r.bottom>b.r.top)overlaps.push([rects[a].id,b.id]);
    return {overlaps,contained:rects.every(({r})=>r.left>=own.left&&r.right<=own.right&&r.top>=own.top&&r.bottom<=own.bottom),background:getComputedStyle(e).backgroundImage};
   });assert.deepEqual(map.overlaps,[]);assert.equal(map.contained,true);assert.ok(!map.background.includes('linear-gradient'),'no rectilinear chart grid');
   for(let id=0;id<20;id++){await mobile.locator(`[data-destination="${id}"]`).tap();assert.equal(await mobile.locator(`[data-destination="${id}"]`).getAttribute('aria-pressed'),'true');assert.equal(await mobile.evaluate(()=>document.activeElement.dataset.destination),String(id));}
   await mobile.locator('#waypointBtn').tap();assert.equal(await mobile.evaluate(()=>__reelDeal.G.waypoint),19);await capture(mobile,`irregular-chart-${viewport.width}`);await mobile.tap('#chartClose');
   await capture(mobile,`return-boat-${viewport.width}`);
   const unobstructed=await mobile.evaluate(()=>{
    const ids=['boardBoatBtn','mapBtn','indexBtn','bagBtn','viewBtn','minimapButton','stick','shopBtn','marketBtn','portBtn','prompt','shoreLuck'],els=ids.map(id=>document.getElementById(id)).filter(e=>e.getClientRects().length),collisions=[];
    for(let n=0;n<els.length;n++){const a=els[n].getBoundingClientRect();for(const other of els.slice(n+1)){const b=other.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)collisions.push([els[n].id,other.id]);}}
    return collisions;
   });assert.deepEqual(unobstructed,[],`HUD ${viewport.width}`);
   await mobile.tap('#boardBoatBtn');assert.equal(await mobile.evaluate(()=>__reelDeal.G.onBoat),true);await mobile.tap('#boatModeBtn');assert.equal(await mobile.evaluate(()=>__reelDeal.G.boatMode),'fish');await mobile.tap('#dockBoatBtn');assert.equal(await mobile.evaluate(()=>__reelDeal.G.onBoat),false);
   assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.deepEqual(errors,[]);console.log('PASS: portrait/short-landscape return button, all twenty touch-selectable non-overlapping map targets, keyboard focus, no map grid, no HUD collisions, independent boarding/fishing/docking and no browser errors');
 }catch(e){await capture(mobile,'navigation-mobile-failure');throw e;}finally{await mobile.close();}
};
