const assert=require('node:assert/strict'),fs=require('node:fs');
module.exports=async function testModels(browser,url,shots){
 const page=await browser.newPage({viewport:{width:1280,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.requestPointerLock=undefined;});
 const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 try{
  await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__reelDeal);await page.click('#startBtn');
  const models=await page.evaluate(async()=>{
   const a=__reelDeal,T=await import('three'),failures=[],records=[];
   for(const sp of [...a.SPECIES,...a.LEGACY_SPECIES]){
    const first=a.makeFish3D(sp,1),second=a.makeFish3D(sp,1),r=first.userData;let geo=0,mat=0,draws=0,triangles=0;
    for(const g of r.geometries){g.addEventListener('dispose',()=>geo++);if(second.userData.geometries.has(g))failures.push('shared geometry '+sp.id);}
    for(const m of r.materials){m.addEventListener('dispose',()=>mat++);if(second.userData.materials.has(m))failures.push('shared material '+sp.id);}
    first.traverse(o=>{if(!o.isMesh)return;draws++;for(const key of ['position','normal','color'])if(![...o.geometry.attributes[key].array].every(Number.isFinite))failures.push('invalid vertices '+sp.id);triangles+=o.geometry.attributes.position.count/3;});
    const size=new T.Box3().setFromObject(first,true).getSize(new T.Vector3());if(Math.abs(size.x-sp.size*1.8)>Math.max(2e-6,sp.size*1e-6)||size.y<=0||size.z<=0)failures.push('bounds '+sp.id);
    if(!r.belly||!r.tail||draws>6||triangles>4500)failures.push('rig/budget '+sp.id);
    a.animateFishModel(first,.7,1);if(!Number.isFinite(r.tail.rotation.x+r.tail.rotation.y+r.tail.rotation.z))failures.push('animation '+sp.id);
    a.disposeFishModel(first);a.disposeFishModel(first);if(geo!==r.geometries.size||mat!==r.materials.size||second.userData.disposed)failures.push('disposal '+sp.id);
    a.disposeFishModel(second);records.push({id:sp.id,draws,triangles});
   }return {failures,records};
  });assert.deepEqual(models.failures,[]);assert.equal(models.records.length,520);
  fs.writeFileSync(`${shots}/model-budgets.json`,JSON.stringify(models.records));console.log('PASS all 400 current + 120 legacy GPU models, finite anatomy, rigging, private disposal and mobile draw/triangle budgets');
  await page.evaluate(()=>{const a=__reelDeal;a.G.xp=a.xpForLevel(400);a.bag.splice(0,a.bag.length,...a.SPECIES.map(sp=>({sp,weight:sp.maxW})));a.G.discoveries=Object.fromEntries(a.SPECIES.map(sp=>[sp.id,{count:1,best:sp.maxW,first:''}]));a.updateStats();a.saveGame();window.modelSave=localStorage.getItem('reel-deal-save-v9');});
  // Full 400-record index still uses shared lazy images, not SVG geometry in DOM.
  await page.click('#indexBtn');assert.equal(await page.locator('.discovered').count(),400);assert.equal(await page.locator('#fishGrid img').count(),400);assert.equal(await page.locator('#fishGrid path').count(),0);await page.click('#indexClose');
  const sample=['clown-killifish','bluegill','flounder','vent-shrimp','giant-isopod','giant-sea-spider','the-last-starfish','molten-stingray','giant-oarfish','giant-squid','sperm-whale','primordial-colossus','origin'];
  for(const viewport of [{width:1280,height:820},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
   for(const id of sample){
    await page.evaluate(id=>{const a=__reelDeal;a.stowFish();if(a.G.thirdPerson)a.toggleView();a.openFishBag();a.holdFish(a.bag.findIndex(e=>e.sp.id===id));},id);await frame();
    const held=await page.evaluate(async()=>{const a=__reelDeal,T=await import('three'),size=a.carriedSize,model=a.carriedModel,points=[];model.updateMatrixWorld(true);a.camera.updateMatrixWorld(true);
     model.traverse(o=>{if(o.isMesh)for(let n=0;n<o.geometry.attributes.position.count;n++){const v=new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,n).applyMatrix4(o.matrixWorld).project(a.camera);points.push([v.x,v.y,v.z]);}});
     return {span:size.x,expected:a.heldFishSpan(a.heldCatch.sp,a.heldCatch.weight),body:a.playerModel.root.visible,finite:points.every(p=>p.every(Number.isFinite)),clip:points.some(p=>Math.abs(p[0])>1||Math.abs(p[1])>1||p[2]<-1||p[2]>1)};
    });assert.equal(held.body,false);assert.equal(held.finite,true);assert.equal(held.clip,false,`${id} first person ${viewport.width}`);assert.ok(Math.abs(held.span-held.expected)<1e-5);
    await page.evaluate(()=>__reelDeal.toggleView());await frame();
    const fits=await page.evaluate(async()=>{const a=__reelDeal,T=await import('three');a.scene.updateMatrixWorld(true);a.frontCamera.updateMatrixWorld(true);const points=[];
     for(const root of [a.carriedModel,a.playerModel.root])root.traverse(o=>{if(o.isMesh&&o.visible&&!o.name.includes('rod'))for(let n=0;n<o.geometry.attributes.position.count;n++){points.push(new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,n).applyMatrix4(o.matrixWorld).project(a.frontCamera));}});
     return points.every(v=>Number.isFinite(v.x+v.y+v.z)&&Math.abs(v.x)<1.01&&Math.abs(v.y)<1.01&&v.z>-1&&v.z<1);
    });assert.equal(fits,true,`${id} front ${viewport.width}`);
    if(viewport.width===390&&['giant-squid','sperm-whale','clown-killifish'].includes(id)){await page.evaluate(()=>{__reelDeal.setHudHidden(true);document.getElementById('hudRestoreHint').classList.add('hidden');});await frame();await page.screenshot({path:`${shots}/held-${id}-mobile.png`});await page.evaluate(()=>__reelDeal.setHudHidden(false));}
    await page.evaluate(()=>__reelDeal.stowFish());
   }
  }
  assert.equal(await page.evaluate(()=>{__reelDeal.saveGame();return localStorage.getItem('reel-deal-save-v9')===window.modelSave;}),true);
  console.log('PASS species-specific tiny/giant sizing, actual vertex framing on desktop/portrait/landscape, both views, no first-person body, unchanged saves');
  // Every current species also passes the actual production holding and camera
  // paths, in both aspect classes, without rebuilding a 400-row bag each time.
  for(const viewport of [{width:1280,height:820},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(__reelDeal.camera.aspect-innerWidth/innerHeight)<1e-9);
    const failures=await page.evaluate(async()=>{
      const a=__reelDeal,T=await import('three'),bag=[...a.bag],failures=[];
      for(const sp of a.SPECIES){
        a.bag.splice(0,a.bag.length,{sp,weight:sp.maxW});a.openFishBag();a.holdFish(0);
        for(const third of [false,true]){
          if(a.G.thirdPerson!==third)a.toggleView();a.updatePlayerView();a.scene.updateMatrixWorld(true);const c=a.activeCamera();c.updateMatrixWorld(true);
          let bad=false;
          a.carriedModel.traverse(o=>{if(o.isMesh)for(let n=0;n<o.geometry.attributes.position.count;n++){const v=new T.Vector3().fromBufferAttribute(o.geometry.attributes.position,n).applyMatrix4(o.matrixWorld).project(c);if(!Number.isFinite(v.x+v.y+v.z)||Math.abs(v.x)>1.01||Math.abs(v.y)>1.01||v.z<-1||v.z>1)bad=true;}});
          if(bad)failures.push(sp.id+'/'+third);
        }
        a.stowFish();
      }
      a.bag.splice(0,a.bag.length,...bag);a.updateStats();return failures;
    });assert.deepEqual(failures,[]);
  }
  console.log('PASS all 400 species through production holding/camera paths, both views, desktop and portrait: actual vertices stay in frame');

  // Individually render every environment, including its terrain outline and
  // local shops. These are real WebGL captures, not generated concept artwork.
  await page.setViewportSize({width:1280,height:820});await frame();
  const environments=[];
  for(let id=0;id<20;id++){
   const image=await page.evaluate(async id=>{const a=__reelDeal,T=await import('three'),i=a.ISLANDS[id];a.playerModel.root.visible=false;a.rodRig.visible=false;a.heldFishRig.visible=false;
    const camera=new T.PerspectiveCamera(50,1280/820,.1,1200);camera.position.set(i.x+65,36,i.z-59);camera.lookAt(i.x,4,i.z+26);camera.updateMatrixWorld(true);a.world.update(20,1,id,camera,false);a.renderer.render(a.scene,camera);
    return {url:a.renderer.domElement.toDataURL('image/png'),name:i.name,calls:a.renderer.info.render.calls,triangles:a.renderer.info.render.triangles};
   },id);
   fs.writeFileSync(`${shots}/island-${String(id+1).padStart(2,'0')}.png`,Buffer.from(image.url.split(',')[1],'base64'));environments.push({id,name:image.name,calls:image.calls,triangles:image.triangles});assert.ok(image.calls<=45);assert.ok(image.triangles<65000);
  }
  fs.writeFileSync(`${shots}/environment-budgets.json`,JSON.stringify(environments,null,2));assert.deepEqual(errors,[]);
  console.log('PASS all twenty unique environments rendered and captured, batched shops, distant LOD, bounded calls/triangles and no shader errors');
 }catch(e){await page.screenshot({path:`${shots}/model-failure.png`});throw e;}finally{await page.close();}
};
