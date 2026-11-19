import test from'node:test';import assert from'node:assert/strict';
import{ISLANDS,BOATS,xpForLevel}from'../archipelago.mjs';
import{TERRITORY_RADIUS,territoryCenter,territoryAt,boatMoveBlock,stepBoat,shoreLuckPenalty,distanceToShore,dockLocation,nearbyDock,SEA_BOUNDS,mapPoint}from'../navigation.mjs';
test('twenty nonoverlapping ocean territories surround their islands',()=>{
 for(const i of ISLANDS){const c=territoryCenter(i);assert.equal(territoryAt(c.x,c.z),i.id);assert.equal(territoryAt(c.x,c.z-TERRITORY_RADIUS+.01),i.id);for(const j of ISLANDS)if(j.id!==i.id){const d=territoryCenter(j);assert.ok(Math.hypot(c.x-d.x,c.z-d.z)>TERRITORY_RADIUS*2);}}
 assert.equal(territoryAt(590,-1200),null);
});
test('invisible level cylinders stop swept crossings from every direction, even with the fastest boat',()=>{
 for(const i of ISLANDS.slice(1))for(let k=0;k<8;k++){const c=territoryCenter(i),a=k*Math.PI/4,from={x:c.x+Math.cos(a)*120,z:c.z+Math.sin(a)*120},to={x:c.x+Math.cos(a)*90,z:c.z+Math.sin(a)*90};
 const blocked=boatMoveBlock(from,to,{xp:xpForLevel(i.level)-1,radius:1});assert.equal(blocked?.kind,'level');assert.equal(blocked.island,i.id);
 const unlocked=boatMoveBlock(from,to,{xp:xpForLevel(i.level),radius:1});assert.notEqual(unlocked?.kind,'level');
 }
});
test('swept barriers also reject a full leap across a locked territory',()=>{
 const i=ISLANDS[19],c=territoryCenter(i);assert.equal(boatMoveBlock({x:c.x-125,z:c.z},{x:c.x+125,z:c.z},{radius:1})?.kind,'level');
});
test('retained licenses open only their territory, with any of the eight boat hulls',()=>{
 for(const b of BOATS)for(const i of ISLANDS){const c=territoryCenter(i),from={x:c.x,z:c.z-125},to={x:c.x,z:c.z-85};assert.equal(boatMoveBlock(from,to,{licenses:[i.id],radius:b.size*4}),null);}
});
test('all boat sizes can board, dock and turn around without starting inside land',()=>{
 for(const i of ISLANDS)for(const b of BOATS){const p=dockLocation(i.id,b.size);assert.equal(boatMoveBlock(p,p,{xp:xpForLevel(400),radius:b.size*4}),null,`${i.name}/${b.name}`);assert.equal(nearbyDock(p.x,p.z),i.id);}
});
test('shore penalty is -95% near the dock, eases continuously and fully recovers offshore',()=>{
 for(const i of ISLANDS){assert.equal(shoreLuckPenalty(i.x,i.z),-.95);for(let d=0;d<=70;d++){const p=shoreLuckPenalty(i.x,i.z-d),distance=distanceToShore(i.x,i.z-d);assert.ok(p>=-.95&&p<=0);assert.ok(Math.abs(p-(-.95*(1-Math.max(0,Math.min(1,(distance-8)/47)))))<1e-12);}assert.equal(shoreLuckPenalty(i.x+90,i.z-20),0);}

});
test('manual throttle, steering, braking and reverse are deterministic and finite',()=>{
 const b=BOATS[0],p={x:-500,z:50,yaw:0,speed:0};let state=p;
 for(let n=0;n<100;n++)state=stepBoat(state,{throttle:1,steer:0},b,.05,{xp:xpForLevel(400)});
 assert.ok(state.z<p.z-50);assert.ok(state.speed>b.speed*.9);const z=state.z;
 for(let n=0;n<80;n++)state=stepBoat(state,{throttle:-1,steer:.5},b,.05,{xp:xpForLevel(400)});
 assert.ok(state.speed<0);assert.notEqual(state.yaw,0);assert.ok(Number.isFinite(state.x+state.z));
 for(let n=0;n<80;n++)state=stepBoat(state,{},b,.05,{xp:xpForLevel(400)});assert.ok(Math.abs(state.speed)<.001);assert.notEqual(z,state.z);
});
test('boat hulls cannot cross terrain or the outer sea border',()=>{
 const i=ISLANDS[0];assert.equal(boatMoveBlock({x:i.x,z:i.z-15},{x:i.x,z:i.z+30},{radius:2})?.kind,'land');
 assert.equal(boatMoveBlock({x:0,z:0},{x:SEA_BOUNDS.maxX+1,z:0})?.kind,'edge');
});
test('chart coordinates are north-up and all destinations fall inside its edges',()=>{
 for(const i of ISLANDS){const p=mapPoint(i.x,i.z);assert.ok(p.x>0&&p.x<100&&p.y>0&&p.y<100);}assert.ok(mapPoint(0,-100).y<mapPoint(0,0).y);
});
