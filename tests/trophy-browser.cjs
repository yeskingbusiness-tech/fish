// Absolute-weight display sizing, giant holding poses and size-aware framing.
const assert=require('node:assert/strict');
module.exports=async function testTrophies(browser,url,shots){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  async function resume(){await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);await page.click('#startBtn');await page.evaluate(()=>document.exitPointerLock?.());}
  async function resize(viewport){await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9&&Math.abs(__reelDeal.frontCamera.aspect-innerWidth/innerHeight)<1e-9);}
  async function select(index){await page.click('#bagBtn');await page.locator(`[data-hold-fish="${index}"]`).click();}
  async function shot(name){await page.evaluate(()=>document.getElementById('toast').classList.add('hidden'));await page.screenshot({path:`${shots}/${name}.png`});}
  try{
    await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.__reelDeal);
    await page.evaluate(()=>{
      const a=__reelDeal,giant=a.SPECIES.find(s=>s.name==='Reel Life');
      const bag=[{n:'Bluegill',w:1.2},{n:'Rainbow Trout',w:1.2},{n:'Rainbow Trout',w:6.3},{n:giant.name,w:giant.minW},{n:giant.name,w:giant.maxW}];
      localStorage.setItem('reel-deal-save-v8',JSON.stringify({version:8,coins:4321,xp:a.xpForLevel(90),caught:5,bag,log:bag,
        boat:5,ownedBoats:[0,5],licenses:[0,1,2,3,4,5],zone:0}));
    });await resume();
    const saved=await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v8');});
    const aim=await page.evaluate(()=>({pos:__reelDeal.camera.position.toArray(),fov:__reelDeal.camera.fov,gear:{...__reelDeal.G.gear},yaw:__reelDeal.G.yaw,pitch:__reelDeal.G.pitch}));
    const samples=[];
    for(let index=0;index<5;index++){
      await select(index);
      if(!await page.evaluate(()=>__reelDeal.G.thirdPerson))await page.click('#viewBtn');
      samples.push(await page.evaluate(async()=>{
        const a=__reelDeal,T=await import('three'),size={...a.carriedSize};
        a.updatePlayerView();a.animateFishModel(a.carriedModel,0,0);a.frontCamera.updateMatrixWorld(true);a.playerModel.root.updateWorldMatrix(true,true);
        const pose=a.frontViewPose({x:a.G.px,z:a.G.pz,ground:a.G.camY-1.62,yaw:a.G.yaw,pitch:a.G.pitch,aspect:a.frontCamera.aspect,fov:a.frontCamera.fov,fish:size},a.world.cameraBlockers[a.G.zone]);
        const inverse=a.heldFishRig.matrixWorld.clone().invert(),bounds=new T.Box3();
        a.carriedModel.traverse(o=>{if(!o.isMesh)return;const vertices=o.geometry.attributes.position;
          for(let i=0;i<vertices.count;i++)bounds.expandByPoint(new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse));
        });
        const head=a.playerModel.root.getObjectByName('head').getWorldPosition(new T.Vector3());
        const ray=new T.Raycaster(a.frontCamera.position,head.clone().sub(a.frontCamera.position).normalize());ray.layers.set(1);
        const blocked=ray.intersectObject(a.carriedModel,true).some(hit=>hit.distance<a.frontCamera.position.distanceTo(head)-.01);
        return {width:size.x,actual:bounds.max.x-bounds.min.x,weight:Number(a.heldCatch.weight),distance:pose.zoomDistance,scale:a.heldFishRig.scale.toArray(),blocked,eye:a.camera.position.toArray(),fov:a.camera.fov,body:a.playerModel.root.visible};
      }));
      if(index===0)await shot('trophy-small');
      if(index===2)await shot('trophy-medium');
      if(index===4)await shot('trophy-giant');
    }
    assert.ok(Math.abs(samples[0].width-samples[1].width)<1e-9,'equal pounds give equal display length across species');
    for(let n=0;n<samples.length;n++){
      const s=samples[n];assert.ok(Math.abs(s.actual-s.width)<1e-8);assert.deepEqual(s.scale,[1,1,1]);
      assert.deepEqual(s.eye,aim.pos);assert.equal(s.fov,aim.fov);assert.equal(s.body,true);assert.equal(s.blocked,false,'the trophy must not obscure the angler’s head');
      if(n>1){assert.ok(s.width>samples[n-1].width);assert.ok(s.distance>=samples[n-1].distance);}
    }
    assert.ok(samples.at(-1).width>25&&samples.at(-1).distance>20);
    assert.ok(samples.at(-1).width/samples[0].width>20,'giants must not be capped to an arm-span');
    assert.equal(await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v8');}),saved);

    // Resize and turn/tilt: the same actual mesh fits every view, including the
    // character, thin eels, tall whales and deep, broad-winged rays.
    for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:360,height:740},{width:844,height:390}]){
      await resize(viewport);
      const failures=await page.evaluate(async()=>{
        const a=__reelDeal,T=await import('three'),original=[...a.bag],failures=[];
        const check=o=>{
          if(!o.isMesh)return;for(let n=o;n;n=n.parent)if(!n.visible)return;
          const vertices=o.geometry.attributes.position;
          for(let i=0;i<vertices.count;i++){
            const p=new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(o.matrixWorld).project(a.activeCamera());
            if(Math.abs(p.x)>1||Math.abs(p.y)>1||p.z< -1||p.z>1)failures.push(`${a.heldCatch.sp.name}: ${a.G.thirdPerson}: ${p.toArray()}`);
          }
        };
        try{
          a.stowFish();a.spawnAtIsland(0);
          for(const sp of a.SPECIES){
            a.bag.splice(0,a.bag.length,{sp,weight:sp.maxW});a.updateStats();a.openFishBag();a.holdFish(0);
            const scale=a.carriedModel.scale.x;
            for(const pitch of [-.62,.42])for(const third of [false,true]){
              a.G.pitch=pitch;a.G.yaw=.35;a.G.thirdPerson=third;a.updatePlayerView();a.activeCamera().updateMatrixWorld(true);a.heldFishRig.updateWorldMatrix(true,true);a.playerModel.root.updateWorldMatrix(true,true);
              a.carriedModel.traverse(check);if(third)a.playerModel.root.traverse(check);
              if(a.carriedModel.scale.x!==scale)failures.push('camera resized the actual fish');
            }
            a.stowFish();
          }
        }finally{a.stowFish();a.bag.splice(0,a.bag.length,...original);a.G.pitch=-.1;a.G.yaw=.35;a.G.thirdPerson=true;a.updateStats();a.updatePlayerView();}
        return failures.slice(0,8);
      });
      assert.deepEqual(failures,[],`full mesh + angler should fit at ${viewport.width} × ${viewport.height}`);
    }
    await resize({width:1280,height:800});await select(4);
    await page.click('#hideHudBtn');await page.waitForFunction(()=>document.getElementById('hudRestoreHint').classList.contains('hidden'));await shot('trophy-giant-photo');await page.keyboard.press('h');

    // The large first-person mesh renders after the terrain with its own depth
    // pass, never body/hands and never with a displaced gameplay/aim camera.
    await page.click('#viewBtn');
    await page.evaluate(()=>{
      const a=__reelDeal;window.trophyDraws=0;window.firstPersonBodyDraws=0;
      a.carriedModel.traverse(o=>{if(o.isMesh)o.onBeforeRender=()=>{if(a.camera.layers.mask!==2)throw Error('first-person trophy drew in the terrain pass');window.trophyDraws++;};});
      a.playerModel.root.traverse(o=>{if(o.isMesh&&o.layers.mask===1)o.onBeforeRender=()=>window.firstPersonBodyDraws++;});
    });
    await page.waitForFunction(()=>window.trophyDraws>0);
    assert.equal(await page.evaluate(()=>window.firstPersonBodyDraws),0);
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.camera.layers.mask,__reelDeal.renderer.autoClear,!!__reelDeal.scene.background,__reelDeal.G.thirdPerson]),[1,true,true,false]);
    await shot('trophy-first-person');
    await resize({width:390,height:844});
    assert.ok(await page.evaluate(()=>-__reelDeal.heldFishRig.position.z)>40);
    assert.ok(await page.evaluate(()=>__reelDeal.carriedSize.x)>25);
    await shot('trophy-first-person-mobile');
    await page.evaluate(()=>__reelDeal.carriedModel.traverse(o=>{if(o.isMesh)o.onBeforeRender=()=>{};}));
    await page.click('#viewBtn');await shot('trophy-front-mobile');
    await page.click('#hideHudBtn');await page.waitForFunction(()=>document.getElementById('hudRestoreHint').classList.contains('hidden'));await shot('trophy-front-mobile-photo');await page.keyboard.press('Escape');

    // Nearby stalls must not push the camera back inside a huge fish. All island
    // collider heights are finite metadata; their movement radii are unchanged.
    await resize({width:1280,height:800});
    const blockers=await page.evaluate(async()=>{
      const a=__reelDeal,T=await import('three'),failures=[];
      for(const island of a.ISLANDS){
        a.spawnAtIsland(island.id);
        if(!a.world.cameraBlockers[island.id].every(b=>Number.isFinite(b.top)))failures.push('missing blocker height');
        for(const kind of ['rod','line','bait','market','port']){
          const stall=a.world.stalls.find(s=>s.zone===island.id&&s.kind===kind);a.G.px=stall.x;a.G.pz=stall.z-3.8;a.G.yaw=Math.PI;a.G.pitch=-.1;a.G.camY=.95+1.62;
          a.updatePlayerView();a.frontCamera.updateMatrixWorld(true);a.playerModel.root.updateWorldMatrix(true,true);a.world.islands[island.id].updateWorldMatrix(true,true);
          const face=a.playerModel.root.getObjectByName('head').getWorldPosition(new T.Vector3()),distance=a.frontCamera.position.distanceTo(face);
          const ray=new T.Raycaster(a.frontCamera.position,face.clone().sub(a.frontCamera.position).normalize());
          if(ray.intersectObject(a.world.islands[island.id],true).some(h=>h.distance<distance-.25))failures.push(`${island.short}: ${kind} obscures angler`);
          if(a.frontCamera.position.y<5)failures.push('camera collapsed into the trophy');
        }
      }
      a.spawnAtIsland(0);a.updatePlayerView();return failures;
    });
    assert.deepEqual(blockers,[]);
    await page.evaluate(()=>{const a=__reelDeal,s=a.world.stalls.find(s=>s.zone===0&&s.kind==='port');a.G.px=s.x;a.G.pz=s.z-3.8;a.openChart();});
    await page.locator('[data-destination="1"]').click();await page.click('#sailBtn');
    assert.deepEqual(await page.evaluate(()=>[__reelDeal.heldFishRig.visible,__reelDeal.playerModel.root.visible]),[false,false]);
    await page.click('#skipVoyage');assert.equal(await page.evaluate(()=>__reelDeal.carriedSize.x),samples.at(-1).width);
    await page.click('#putAwayBtn');
    assert.equal(await page.evaluate(()=>__reelDeal.carriedSize.x),0);
    assert.ok(await page.evaluate(()=>Math.hypot(__reelDeal.frontCamera.position.x-__reelDeal.G.px,__reelDeal.frontCamera.position.z-__reelDeal.G.pz))<5);
    await resume();await select(4);assert.equal(await page.evaluate(()=>__reelDeal.carriedSize.x),samples.at(-1).width);
    assert.equal(await page.evaluate(()=>__reelDeal.G.thirdPerson),false);
    assert.deepEqual(errors,[],'No browser or WebGL errors allowed');
    console.log('PASS: equal-weight/cross-species sizing, enormous uncapped trophies, raised grip, automatic zoom, all 120 fish + avatar bounds at four viewports/two pitches, first-person depth pass without hands/body, 30 vendor clearances, travel/stow/reload and unchanged saves');
  }catch(error){await page.screenshot({path:`${shots}/trophy-failure.png`});throw error;}
  finally{await page.close();}
};
