import test from'node:test';import assert from'node:assert/strict';import{exposedCuboidFaces}from'../voxel-geometry.mjs';
const box=(x,y,z,w=2,h=2,d=2,c=1)=>({x,y,z,w,h,d,c});
const area=f=>{const a=f.points[0],b=f.points[1],d=f.points[3];return Math.hypot(...a.map((v,i)=>v-b[i]))*Math.hypot(...a.map((v,i)=>v-d[i]));};
function noCoplanarOverlap(faces){
 for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){
 const a=faces[i],b=faces[j],axis=a.normal.findIndex(v=>v);if(axis!==b.normal.findIndex(v=>v)||Math.abs(a.points[0][axis]-b.points[0][axis])>1e-6)continue;
 const axes=[0,1,2].filter(n=>n!==axis);const overlap=axes.map(k=>Math.min(Math.max(...a.points.map(p=>p[k])),Math.max(...b.points.map(p=>p[k])))-Math.max(Math.min(...a.points.map(p=>p[k])),Math.min(...b.points.map(p=>p[k]))));
 assert.ok(overlap.some(v=>v<1e-6),'two coplanar rectangles overlap');
 }
}
test('one cube has exactly six outward faces with correct area',()=>{const f=exposedCuboidFaces([box(0,0,0)]);assert.equal(f.length,6);assert.equal(f.reduce((n,f)=>n+area(f),0),24);});
test('duplicate/coplanar cubes have one owner, never two fighting surfaces',()=>{const f=exposedCuboidFaces([box(0,0,0),box(0,0,0,2,2,2,2)]);assert.equal(f.length,6);assert.ok(f.every(f=>f.color===2));noCoplanarOverlap(f);});
test('adjacent blocks remove their shared internal face',()=>{const f=exposedCuboidFaces([box(0,0,0),box(2,0,0)]);assert.equal(f.reduce((n,f)=>n+area(f),0),40);noCoplanarOverlap(f);});
test('partial coplanar intersections split instead of depth fighting or hiding the whole face',()=>{const f=exposedCuboidFaces([box(0,0,0,4,1,2),box(1,0,1,2,1,4)]);noCoplanarOverlap(f);assert.ok(f.length>6);assert.ok(f.every(f=>area(f)>0));});
test('contained cubes contribute no invisible geometry',()=>{const outer=box(0,0,0,4,4,4),f=exposedCuboidFaces([outer,box(0,0,0)]);assert.equal(f.length,6);assert.equal(f.reduce((n,f)=>n+area(f),0),96);});
test('many intersecting paving/trim blocks stay finite and have no coincident surfaces',()=>{
 const boxes=Array.from({length:30},(_,n)=>box(n%6*.5,Math.floor(n/6)*.3,n%4*.5,1,.6,1,n));const f=exposedCuboidFaces(boxes);assert.ok(f.length<500);noCoplanarOverlap(f);for(const a of f)assert.ok(a.points.every(p=>p.every(Number.isFinite)));
});
