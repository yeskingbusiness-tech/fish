import test from 'node:test';
import assert from 'node:assert/strict';
import { ISLANDS, BOATS, xpForLevel } from '../archipelago.mjs';
import { islandToWorld } from '../island-layout.mjs';
import { TERRITORY_RADIUS, SHORE_FULL_PENALTY_DISTANCE, SHORE_CLEAR_DISTANCE, BOAT_TURN_RATE, territoryCenter, territoryAt, boatMoveBlock, stepBoat, shoreLuckPenalty, distanceToShore, dockLocation, dockPose, nearbyDock, SEA_BOUNDS, mapPoint, validBoatPose, returnBoatPose } from '../navigation.mjs';
const access={xp:xpForLevel(400)},largest=BOATS.at(-1),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('twenty fixed irregular territories have 7.4 times the old area and navigable gaps',()=>{
 assert.equal(TERRITORY_RADIUS,300);assert.ok((TERRITORY_RADIUS/110)**2>7.4);
 const centers=ISLANDS.map(territoryCenter);
 assert.ok(new Set(centers.map(c=>c.x)).size>=18);assert.ok(new Set(centers.map(c=>c.z)).size>=18);
 for(const i of ISLANDS){const c=centers[i.id];assert.equal(territoryAt(c.x,c.z),i.id);assert.equal(territoryAt(c.x,c.z-TERRITORY_RADIUS+.01),i.id);
  assert.ok(c.x-TERRITORY_RADIUS>SEA_BOUNDS.minX&&c.x+TERRITORY_RADIUS<SEA_BOUNDS.maxX);
  assert.ok(c.z-TERRITORY_RADIUS>SEA_BOUNDS.minZ&&c.z+TERRITORY_RADIUS<SEA_BOUNDS.maxZ);
  for(const j of ISLANDS)if(j.id!==i.id){const d=centers[j.id];assert.ok(Math.hypot(c.x-d.x,c.z-d.z)>TERRITORY_RADIUS*2+largest.size*8+50);}
 }
 assert.equal(territoryAt(SEA_BOUNDS.minX+20,SEA_BOUNDS.minZ+20),null);
});
test('all eight hulls cross every level cylinder only when unlocked, from every bearing',()=>{
 for(const b of BOATS)for(const i of ISLANDS.slice(1))for(let k=0;k<12;k++){
  const c=territoryCenter(i),a=k*Math.PI/6,from={x:c.x+Math.cos(a)*(TERRITORY_RADIUS+25),z:c.z+Math.sin(a)*(TERRITORY_RADIUS+25)},to={x:c.x+Math.cos(a)*(TERRITORY_RADIUS-25),z:c.z+Math.sin(a)*(TERRITORY_RADIUS-25)};
  const blocked=boatMoveBlock(from,to,{xp:xpForLevel(i.level)-1,radius:b.size*4});assert.equal(blocked?.kind,'level');assert.equal(blocked.island,i.id);
  assert.equal(boatMoveBlock(from,to,{xp:xpForLevel(i.level),radius:b.size*4}),null);
  assert.equal(boatMoveBlock(from,to,{licenses:[i.id],radius:b.size*4}),null);
 }
});
test('swept barriers reject a full high-speed leap across a locked territory',()=>{
 const c=territoryCenter(ISLANDS[19]),r=TERRITORY_RADIUS+20;
 assert.equal(boatMoveBlock({x:c.x-r,z:c.z},{x:c.x+r,z:c.z},{radius:1})?.kind,'level');
});
test('all 160 oriented berths are clear, dockable and connected to open water',()=>{
 for(const i of ISLANDS)for(const b of BOATS){
  const p=dockPose(i.id,b.size),exit=islandToWorld(i,i.layout.dockX+i.layout.berthSide*(14+b.size*4),-150);
  assert.equal(validBoatPose(p,b,{licenses:[i.id]}),true,`${i.name}/${b.name}`);
  assert.deepEqual(dockLocation(i.id,b.size),{x:p.x,z:p.z});assert.equal(p.yaw,i.layout.yaw);
  assert.equal(nearbyDock(p.x,p.z),i.id);assert.equal(boatMoveBlock(p,exit,{licenses:[i.id],radius:b.size*4}),null);
  const state=stepBoat({...p,speed:0},{throttle:1},b,.1,{licenses:[i.id]});assert.equal(state.block,null);assert.ok(state.speed>0);
 }
});
test('95% shore suppression has a modestly narrower full/recovery band, in every layout',()=>{
 assert.equal(SHORE_FULL_PENALTY_DISTANCE,6);assert.equal(SHORE_CLEAR_DISTANCE,48);
 for(const i of ISLANDS){
  const pier=islandToWorld(i,i.layout.dockX,4);assert.equal(shoreLuckPenalty(pier.x,pier.z),-.95);
  for(let d=0;d<=80;d++){
   const p=islandToWorld(i,i.layout.dockX,-d),penalty=shoreLuckPenalty(p.x,p.z),distance=distanceToShore(p.x,p.z);
   assert.ok(penalty>=-.95&&penalty<=0);near(penalty,-.95*(1-Math.max(0,Math.min(1,(distance-6)/42))));
  }
  const offshore=islandToWorld(i,0,-100);assert.equal(shoreLuckPenalty(offshore.x,offshore.z),0);assert.equal(territoryAt(offshore.x,offshore.z),i.id);
 }
});
test('manual throttle, steering, braking and reverse are deterministic; turning is 20% quicker',()=>{
 near(BOAT_TURN_RATE,1.2*1.2);
 const b=BOATS[0],p={x:-800,z:200,yaw:0,speed:0};let state=p;
 for(let n=0;n<100;n++)state=stepBoat(state,{throttle:1,steer:0},b,.05,access);
 assert.ok(state.z<p.z-50);assert.ok(state.speed>b.speed*.9);
 const yaw=stepBoat({...state,speed:b.speed},{throttle:1,steer:1},b,.05,access).yaw;
 near(yaw,state.yaw-BOAT_TURN_RATE*.05);
 for(let n=0;n<80;n++)state=stepBoat(state,{throttle:-1,steer:.5},b,.05,access);
 assert.ok(state.speed<0);assert.notEqual(state.yaw,0);assert.ok(Number.isFinite(state.x+state.z));
 for(let n=0;n<80;n++)state=stepBoat(state,{},b,.05,access);assert.ok(Math.abs(state.speed)<.001);
});
test('hulls cannot cross rotated terrain, piers or outer sea edges',()=>{
 for(const i of ISLANDS){const a=islandToWorld(i,i.layout.dockX,-15),b=islandToWorld(i,i.layout.dockX,30);assert.equal(boatMoveBlock(a,b,{...access,radius:2})?.kind,'land');}
 assert.equal(boatMoveBlock({x:0,z:0},{x:SEA_BOUNDS.maxX+1,z:0},access)?.kind,'edge');
});
test('return-to-boat preserves the boat position instead of moving it to the player or a waypoint',()=>{
 for(const i of ISLANDS)for(const b of BOATS){
  const p={...islandToWorld(i,0,-130),yaw:1.2},before={...p};
  const result=returnBoatPose(p,(i.id+1)%20,b,access);assert.deepEqual(result,p);assert.notEqual(result,p);assert.deepEqual(p,before);
 }
 const locked=dockPose(19,largest.size);
 for(const p of [locked,null,{x:NaN,z:0,yaw:0},{x:1e9,z:0,yaw:0},{...islandToWorld(ISLANDS[0],0,30),yaw:0}]){
  const pose=returnBoatPose(p,19,largest);assert.deepEqual(pose,dockPose(0,largest.size));assert.equal(validBoatPose(pose,largest),true);
 }
 assert.deepEqual(returnBoatPose(null,19,largest,{licenses:[19]}),dockPose(19,largest.size));
});
test('chart percentages are north-up and fit every whole territory, not the former grid',()=>{
 for(const i of ISLANDS){const c=territoryCenter(i);for(const [dx,dz] of [[-300,0],[300,0],[0,-300],[0,300]]){const p=mapPoint(c.x+dx,c.z+dz);assert.ok(p.x>0&&p.x<100&&p.y>0&&p.y<100);}}
 assert.ok(mapPoint(0,-100).y<mapPoint(0,0).y);
});

// A real swept-collision flood search, not a distance-only connectivity claim.
// The largest hull has the tightest clearance; all smaller boats share access.
test('every sequential unlocked island has a navigable route around the still-locked cylinders',()=>{
 const step=80,nx=Math.floor((SEA_BOUNDS.maxX-SEA_BOUNDS.minX)/step),nz=Math.floor((SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ)/step);
 const point=(x,z)=>({x:SEA_BOUNDS.minX+40+x*step,z:SEA_BOUNDS.minZ+40+z*step});
 const cell=p=>[Math.round((p.x-SEA_BOUNDS.minX-40)/step),Math.round((p.z-SEA_BOUNDS.minZ-40)/step)];
 const exit=i=>islandToWorld(i,i.layout.dockX+i.layout.berthSide*(14+largest.size*4),-150);
 for(let id=1;id<20;id++){
  const from=exit(ISLANDS[id-1]),to=exit(ISLANDS[id]),start=cell(from),goal=cell(to),rules={xp:xpForLevel(ISLANDS[id].level),radius:largest.size*4};
  assert.equal(boatMoveBlock(from,point(...start),rules),null);assert.equal(boatMoveBlock(point(...goal),to,rules),null);
  const queue=[start],seen=new Set([start[1]*nx+start[0]]);let found=false;
  for(let n=0;n<queue.length;n++){
   const [x,z]=queue[n];if(x===goal[0]&&z===goal[1]){found=true;break;}
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){
    const xx=x+dx,zz=z+dz,k=zz*nx+xx;
    if(xx<0||xx>=nx||zz<0||zz>=nz||seen.has(k)||boatMoveBlock(point(x,z),point(xx,zz),rules))continue;
    seen.add(k);queue.push([xx,zz]);
   }
  }
  assert.ok(found,`${ISLANDS[id-1].name} → ${ISLANDS[id].name}`);
 }
});
