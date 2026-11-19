import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES } from '../game-data.mjs';
import { heldFishSpan, heldFishLayout, firstPersonFishPose, frontViewPose } from '../player-view.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('absolute weight makes every specimen strictly bigger, including the heaviest endgame fish',()=>{
  const original=structuredClone(SPECIES),samples=[];
  for(const sp of SPECIES){
    let previous=0;
    for(let q=0;q<=100;q++){
      const weight=sp.minW+(sp.maxW-sp.minW)*q/100,span=heldFishSpan(sp,weight);
      assert.ok(Number.isFinite(span)&&span>=.45,sp.name);
      assert.ok(span>previous,sp.name);previous=span;samples.push({weight,span});
    }
  }
  samples.sort((a,b)=>a.weight-b.weight);
  for(let i=1;i<samples.length;i++){
    if(Math.abs(samples[i].weight-samples[i-1].weight)<1e-10)close(samples[i].span,samples[i-1].span);
    else assert.ok(samples[i].span>samples[i-1].span,'a heavier fish cannot look smaller just because it is another species');
  }
  assert.ok(heldFishSpan(SPECIES[0],1500)>25,'a giant must dwarf the two-unit angler');
  assert.ok(heldFishSpan(SPECIES[0],1500)>20*heldFishSpan(SPECIES[0],1));
  assert.deepEqual(SPECIES,original,'display sizing must not rewrite real fish stats');
});

test('display sizing handles invalid weights and has no normal-game trophy cap or species normalization',()=>{
  for(const sp of SPECIES){
    for(const weight of [undefined,NaN,Infinity,-100,null])assert.equal(heldFishSpan(sp,weight),.45);
    assert.equal(heldFishSpan(sp,String(sp.maxW)),heldFishSpan(sp,sp.maxW));
    assert.ok(Number.isFinite(heldFishSpan(sp,Number.MAX_VALUE)));
    assert.ok(heldFishSpan(sp,10000)>heldFishSpan(sp,2000));
    close(heldFishSpan(sp,1),1.1);
  }
  assert.equal(heldFishSpan({maxW:0},0),.45);
  close(heldFishSpan({maxW:1},10),heldFishSpan({maxW:2000},10));
});

function dimensions(weight,shape={height:.51,depth:.47}){
  const x=heldFishSpan(null,weight),y=x*shape.height,z=x*shape.depth;
  return {x,y,z,gripY:-y/2,gripZ:-z*.29};
}
function corners(size,includePlayer=true){
  const p=heldFishLayout(size),points=[];
  for(const x of [-p.halfX,p.halfX])for(const y of [-p.halfY,p.halfY])for(const z of [-p.halfZ,p.halfZ])points.push([x,p.y+y,p.z+z]);
  if(includePlayer)for(const x of [-.65,.65])for(const y of [-.08,2.2])for(const z of [-.72,.6])points.push([x,y,z]);
  return points;
}
function checkFrame(size,state,blockers=[]){
  const p=frontViewPose({...state,fish:size},blockers),dy=p.y-p.targetY;
  const radius=Math.hypot(p.distance,dy),c=p.distance/radius,s=dy/radius,tan=Math.tan(state.fov*Math.PI/360);
  for(const [x,y,z] of corners(size)){
    const localY=y-(p.targetY-state.ground),toward=localY*s-z*c,up=localY*c+z*s,depth=radius-toward;
    assert.ok(depth>.1,'near-plane clearance');
    assert.ok(Math.abs(x/depth/tan/state.aspect)<=.840001,`horizontal fit: ${JSON.stringify({size,state,p,x,y,z})}`);
    assert.ok(Math.abs(up/depth/tan)<=.720001,`vertical fit: ${JSON.stringify({size,state,p,x,y,z})}`);
  }
  return p;
}

test('large trophies meet the raised hands at their actual belly, not their padded fin bounds',()=>{
  const small=dimensions(1),large=dimensions(1500),before={...large};
  assert.deepEqual([heldFishLayout(small).lift,heldFishLayout(small).y,heldFishLayout(small).z],[0,1.15,-.62]);
  const p=heldFishLayout(large);
  assert.equal(p.lift,1);close(p.y+large.gripY,2.14);close(p.z+large.gripZ,.04);
  assert.ok(p.halfX>large.x/2&&p.halfY>large.y/2&&p.halfZ>large.z/2);
  assert.deepEqual(large,before);
});

test('front camera fits the full player and fish volume at every aspect, pitch, size and body shape',()=>{
  for(const aspect of [16/9,4/3,1,390/844,360/740,844/390])for(const pitch of [-.62,-.1,.42]){
    const state={x:130,z:-280,ground:.95,yaw:.35,pitch,aspect,fov:aspect<1?60:52};
    for(const shape of [{height:.51,depth:.47},{height:.29,depth:.18},{height:.32,depth:1.45}]){
      for(const weight of [.2,1,3.6,6.3,25,100,500,1637.7])checkFrame(dimensions(weight,shape),state);
    }
  }
});

test('anatomical trunk support preserves and frames asymmetric tails, rostra and tentacles',()=>{
  for(const centerX of [-8,-2,0,2,8])for(const aspect of [16/9,390/844,844/390]){
    const size={...dimensions(500),centerX},before={...size},fov=aspect<1?72:58;
    const b=heldFishLayout(size),p=firstPersonFishPose(size,{aspect,fov}),tan=Math.tan(fov*Math.PI/360);
    assert.ok(b.halfX>size.x/2+Math.abs(centerX));close(p.x+centerX,0);
    // The first-person rig recentres this same full-sized sculpt, without
    // moving the gameplay camera. Third person keeps the trunk over the hands.
    const neutral=heldFishLayout({...size,centerX:0});
    for(const x of [centerX-neutral.halfX,centerX+neutral.halfX])for(const z of [-b.halfZ,b.halfZ]){
      assert.ok(Math.abs((p.x+x)/(p.distance-z)/tan/aspect)<=.860001);
    }
    checkFrame(size,{x:0,z:0,ground:1.15,yaw:.35,pitch:-.1,aspect,fov:aspect<1?60:52});
    close(b.y+size.gripY,2.14);close(b.z+size.gripZ,.04);assert.deepEqual(size,before);
  }
});

test('zoom follows trophy size and portrait width, not a fixed distance or a smaller fish model',()=>{
  let previous=0;
  for(const weight of [.2,1,3.6,6.3,25,100,500,1637.7]){
    const size=dimensions(weight),state={x:0,z:0,ground:1.15,yaw:0,pitch:-.1,aspect:1.5,fov:52};
    const p=frontViewPose({...state,fish:size});
    assert.ok(p.zoomDistance>=previous-1e-9);previous=p.zoomDistance;
    if(weight>=25)assert.ok(frontViewPose({...state,aspect:390/844,fov:60,fish:size}).zoomDistance>p.zoomDistance);
  }
  assert.ok(previous>25);
});

test('trophy camera clears tall blockers by elevating, without collapsing through a giant',()=>{
  const state={x:0,z:0,ground:1.15,yaw:0,pitch:-.1,aspect:1.5,fov:52},size=dimensions(1637.7);
  const blockers=[{x:0,z:-3.8,r:2.7,top:4.5},{x:.3,z:-8,r:.8,top:10}],before=structuredClone(blockers);
  const free=checkFrame(size,state),blocked=checkFrame(size,state,blockers);
  assert.ok(blocked.elevation>free.elevation);
  assert.ok(blocked.zoomDistance>15,'must still fit the giant instead of using the old short boom');
  for(const b of blockers){
    const entry=-b.z-Math.sqrt((b.r+.15)**2-b.x**2);
    if(entry<blocked.distance)assert.ok(state.ground+(blocked.y-state.ground)*entry/blocked.distance>b.top+.29);
  }
  assert.deepEqual(blockers,before);
  const behind={x:0,z:10,r:3,top:20};
  close(frontViewPose({...state,fish:size},[behind]).zoomDistance,free.zoomDistance);
});

test('first-person inspection backs up for the same mesh and reserves all fins, height and near-plane space',()=>{
  for(const aspect of [16/9,1,390/844,844/390])for(const weight of [.2,1,6,100,1637.7]){
    const size=dimensions(weight),before={...size},fov=aspect<1?72:58,p=firstPersonFishPose(size,{aspect,fov}),b=heldFishLayout(size);
    const tan=Math.tan(fov*Math.PI/360);
    for(const x of [-b.halfX,b.halfX])for(const y of [-b.halfY,b.halfY])for(const z of [-b.halfZ,b.halfZ]){
      const depth=p.distance-z;
      assert.ok(depth>.1);assert.ok(Math.abs(x/depth/tan/aspect)<=.860001);assert.ok(Math.abs((p.y+y)/depth/tan)<=.720001);
    }
    assert.deepEqual(size,before);
  }
  const giant=dimensions(1637.7);
  assert.ok(firstPersonFishPose(giant,{aspect:390/844,fov:72}).distance>40);
});

test('third-person camera is in front of the player for every heading, with no aim/position mutation',()=>{
  for(let n=0;n<360;n++){
    const state={x:130,z:-280,ground:.95,yaw:n*Math.PI/180,pitch:-.1,aspect:1.5};
    const before={...state},p=frontViewPose(state);
    close((p.x-state.x)*-Math.sin(state.yaw)+(p.z-state.z)*-Math.cos(state.yaw),p.distance);
    close(Math.hypot(p.x-state.x,p.z-state.z),4.1);
    assert.equal(p.targetX,state.x);assert.equal(p.targetZ,state.z);
    assert.ok(p.y>p.targetY);
    assert.deepEqual(state,before);
  }
});

test('camera boom stops before obstacles, ignores objects behind/to the side, and never moves the player',()=>{
  const state={x:0,z:0,ground:1.15,yaw:0,pitch:0,aspect:1.5};
  const front={x:0,z:-3,r:.8},side={x:2,z:-2,r:.5},behind={x:0,z:2,r:1};
  const blockers=[front,side,behind],copy=structuredClone(blockers);
  const p=frontViewPose(state,blockers);
  close(p.distance,1.98);
  assert.ok(Math.hypot(p.x-front.x,p.z-front.z)>front.r);
  close(frontViewPose(state,[side,behind]).distance,4.1);
  assert.deepEqual(blockers,copy);
  for(const yaw of [Math.PI/2,Math.PI,-Math.PI/2]){
    const b={x:-Math.sin(yaw)*3,z:-Math.cos(yaw)*3,r:.8};
    close(frontViewPose({...state,yaw},[b]).distance,1.98);
  }
});

test('tight camera clearances stay finite and lift the view above the character instead of into its head',()=>{
  const state={x:0,z:0,ground:1.15,yaw:0,pitch:0,aspect:1.5};
  const p=frontViewPose(state,[{x:0,z:-1,r:.95}]);
  close(p.distance,.02);
  assert.ok(p.y>state.ground+2.04);
  assert.ok(Object.values(p).every(Number.isFinite));
  for(const pitch of [-10,-.62,0,.42,10]){
    const normal=frontViewPose({...state,pitch});
    assert.ok(normal.y>state.ground+1.3&&normal.y<state.ground+2.6);
    close(normal.distance,4.1);
  }
});

test('portrait framing leaves space for mobile HUD while retaining the same player-facing direction',()=>{
  const state={x:-145,z:-155,ground:.95,yaw:.35,pitch:-.1};
  const wide=frontViewPose({...state,aspect:1100/760}),phone=frontViewPose({...state,aspect:390/844});
  assert.ok(phone.distance>wide.distance);
  assert.ok(phone.targetY>wide.targetY);
  close((phone.x-state.x)/phone.distance,(wide.x-state.x)/wide.distance);
  close((phone.z-state.z)/phone.distance,(wide.z-state.z)/wide.distance);
});
