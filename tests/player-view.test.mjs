import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES } from '../game-data.mjs';
import { heldFishSpan, frontViewPose } from '../player-view.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('held fish grow with specimen weight but all 120 species have a bounded display size',()=>{
  const original=structuredClone(SPECIES);
  for(const sp of SPECIES){
    let previous=0;
    for(let q=0;q<=100;q++){
      const weight=sp.minW+(sp.maxW-sp.minW)*q/100,span=heldFishSpan(sp,weight);
      assert.ok(Number.isFinite(span)&&span>=.95&&span<=1.7+1e-10,sp.name);
      assert.ok(span>=previous,sp.name);previous=span;
    }
    assert.ok(heldFishSpan(sp,sp.maxW)>heldFishSpan(sp,sp.minW));
  }
  assert.deepEqual(SPECIES,original,'display sizing must not rewrite real fish stats');
});

test('display sizing handles bad input and oversize legacy weights without exploding the model',()=>{
  for(const sp of SPECIES){
    for(const weight of [undefined,NaN,Infinity,-100,null])assert.equal(heldFishSpan(sp,weight),.95);
    assert.equal(heldFishSpan(sp,String(sp.maxW)),heldFishSpan(sp,sp.maxW));
    assert.ok(heldFishSpan(sp,1e20)<=1.7+1e-10);
  }
  assert.equal(heldFishSpan({maxW:0},0),.95);
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
