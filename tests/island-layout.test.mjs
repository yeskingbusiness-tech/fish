import test from 'node:test';
import assert from 'node:assert/strict';
import { ISLANDS, WORLD_LAYOUT_VERSION } from '../island-data.mjs';
import { ISLAND_LAYOUTS, islandToWorld, worldToIsland, islandRectToWorld, islandSpawn, islandSurfaces } from '../island-layout.mjs';
import { LAND_RECTS } from '../navigation.mjs';
import { villagePathTiles } from '../village-paths.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('all twenty islands have distinct authored terrain profiles as well as distinct village plans',()=>{
 assert.equal(new Set(ISLANDS.map(i=>i.theme)).size,20);
 assert.equal(new Set(ISLANDS.map(i=>JSON.stringify(i.landforms))).size,20);
});
test('all twenty authored village plans differ in placement, not just palette or rotation',()=>{
 assert.equal(WORLD_LAYOUT_VERSION,2);assert.equal(ISLAND_LAYOUTS.length,20);
 assert.equal(new Set(ISLAND_LAYOUTS.map(l=>JSON.stringify(l.stalls))).size,20);
 assert.equal(new Set(ISLAND_LAYOUTS.map(l=>l.quarter)).size,4);
 assert.equal(new Set(ISLAND_LAYOUTS.map(l=>l.berthSide)).size,2);
 assert.ok(new Set(ISLAND_LAYOUTS.map(l=>l.dockX)).size>=8);
 for(const l of ISLAND_LAYOUTS){
  assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.stalls));assert.deepEqual(l.stalls.map(s=>s.kind),['rod','line','bait','market','port']);
  for(const s of l.stalls)for(const other of l.stalls)if(s!==other)assert.ok(Math.hypot(s.x-other.x,s.z-other.z)>6.3);
 }
});
test('orthogonal placement transforms exactly roundtrip every shop, spawn and land rectangle',()=>{
 for(const i of ISLANDS){
  for(const p of [...i.layout.stalls,{x:0,z:0},{x:15.23,z:-42.71}]){const w=islandToWorld(i,p.x,p.z),l=worldToIsland(i,w.x,w.z);near(l.x,p.x);near(l.z,p.z);}
  const spawn=islandSpawn(i),local=worldToIsland(i,spawn.x,spawn.z);near(local.x,i.layout.dockX);near(local.z,4);near(spawn.yaw,i.layout.yaw+.35);
  for(const r of islandSurfaces(i)){
   const box=islandRectToWorld(i,r);
   for(const [x,z]of [[r.minX,r.minZ],[r.minX,r.maxZ],[r.maxX,r.minZ],[r.maxX,r.maxZ]]){const p=islandToWorld(i,x,z);assert.ok(p.x>=box.minX&&p.x<=box.maxX&&p.z>=box.minZ&&p.z<=box.maxZ);}
   assert.ok(LAND_RECTS.some(b=>b.island===i.id&&b.kind===r.kind&&b.minX===box.minX&&b.maxX===box.maxX&&b.minZ===box.minZ&&b.maxZ===box.maxZ));
  }
 }
});
test('physical sand shelves are slightly narrower and spawn still rests on the main pier',()=>{
 for(const i of ISLANDS){const surfaces=islandSurfaces(i),sand=surfaces.find(s=>s.kind==='shore'&&s.minX===-29),spawn=islandSpawn(i),p=worldToIsland(i,spawn.x,spawn.z);
  assert.ok(sand);assert.equal(sand.maxX-sand.minX,58);assert.equal(sand.maxZ-sand.minZ,46);
  assert.ok(surfaces.some(s=>s.kind==='pier'&&p.x>=s.minX&&p.x<=s.maxX&&p.z>=s.minZ&&p.z<=s.maxZ));
 }
});
test('paving connects every varied counter to the pier with unique, nonoverlapping cells',()=>{
 for(const i of ISLANDS){const tiles=villagePathTiles(i.layout),key=p=>Math.round(p.x/1.8)+','+Math.round(p.z/1.8),seen=new Set(tiles.map(key));assert.equal(seen.size,tiles.length);
  for(const s of i.layout.stalls){const goal={x:Math.round(s.x/1.8)*1.8,z:Math.floor((s.z-4)/1.8)*1.8};assert.ok(seen.has(key(goal)),i.name+'/'+s.kind);assert.ok(Math.hypot(goal.x-s.x,goal.z-s.z)<6.3);}
  const visited=new Set([key(tiles[0])]),q=[tiles[0]];for(let n=0;n<q.length;n++)for(const [dx,dz]of [[1.8,0],[-1.8,0],[0,1.8],[0,-1.8]]){const p={x:q[n].x+dx,z:q[n].z+dz},k=key(p);if(seen.has(k)&&!visited.has(k)){visited.add(k);q.push(p);}}
  assert.equal(visited.size,seen.size,i.name+' disconnected paving');
  for(const p of tiles)assert.ok(i.layout.stalls.every(s=>Math.hypot(p.x-s.x,p.z-s.z)>=3.5),i.name+' paving through a shop');
 }
});
