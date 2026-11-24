// Stable, authored village plans. These are not re-rolled when a save loads.
// Coordinates are island-local; quarter-turns keep the world genuinely cuboid.
const storeKinds=['rod','line','bait','market','port'];
const plans=[
  // heading, berth side, pier offset, rod / line / bait / market / boatyard
  [0, 1,0,[[-17,29],[0,42],[17,29],[-8.5,18],[9,16]]],
  [1,-1,2,[[-14,37],[5,43],[17,25],[3,21],[-11,16]]],
  [3, 1,4,[[16,42],[-12,39],[-16,23],[2,28],[13,16]]],
  [2,-1,5,[[16,35],[-12,45],[2,28],[14,19],[-14,16]]],
  [0, 1,2,[[-15,40],[15,40],[-16,24],[0,31],[11,16]]],
  [3,-1,0,[[17,40],[-15,34],[2,43],[12,20],[-9,16]]],
  [1, 1,6,[[-12,26],[3,40],[18,31],[-17,41],[15,16]]],
  [2, 1,1,[[17,44],[-16,38],[0,31],[-11,20],[10,16]]],
  [0,-1,4,[[-16,43],[13,32],[1,45],[13,19],[-13,16]]],
  [1, 1,3,[[-14,44],[17,40],[-14,26],[1,29],[12,16]]],
  [2,-1,1,[[1,41],[-17,31],[16,34],[10,20],[-10,16]]],
  [3, 1,5,[[15,43],[-15,43],[-13,26],[3,31],[14,16]]],
  [0,-1,6,[[14,42],[-13,39],[2,29],[15,20],[-15,16]]],
  [2, 1,0,[[-17,34],[14,44],[15,29],[-7,20],[9,16]]],
  [3,-1,3,[[-16,42],[13,26],[1,43],[1,23],[-12,16]]],
  [1,-1,0,[[14,35],[-14,31],[1,45],[14,20],[-9,16]]],
  [0, 1,5,[[-15,25],[2,43],[17,32],[-16,42],[14,16]]],
  [2,-1,4,[[15,44],[2,32],[-14,40],[14,21],[-13,16]]],
  [1, 1,1,[[16,39],[-14,27],[-12,43],[1,29],[10,16]]],
  [3,-1,2,[[-15,36],[2,43],[16,38],[11,22],[-11,16]]],
];
const freeze=items=>Object.freeze(items.map(Object.freeze));
export const ISLAND_LAYOUTS=Object.freeze(plans.map(([quarter,berthSide,offset,shops],id)=>{
  const dockX=offset*berthSide;
  const stalls=freeze(shops.map(([x,z],n)=>({kind:storeKinds[n],x,z})));
  // Plants and lamps use their own positions, avoiding stall footprints and
  // the final approach to a counter. Paths remain open from the landing pier.
  const occupied=(x,z)=>stalls.some(s=>Math.hypot(x-s.x,z-s.z)<6||Math.hypot(x-s.x,z-(s.z-3.8))<4);
  const trees=[[-25,22],[-25,36],[-22,48],[-8,49],[8,49],[23,47],[25,33],[25,19]]
    .map(([x,z],n)=>({x:x+((id+n*3)%5-2)*.5,z:z+((id*3+n)%5-2)*.6,size:1.05+((id+n*2)%5)*.10}))
    .filter(p=>!occupied(p.x,p.z));
  const lamps=stalls.filter(s=>s.kind!=='port').map((s,n)=>({x:s.x+(n%2?4:-4),z:s.z-4.5})).filter(p=>!stalls.some(s=>Math.hypot(s.x-p.x,s.z-p.z)<3.5));
  return Object.freeze({quarter,yaw:quarter*Math.PI/2,berthSide,dockX,landmarkMirror:berthSide,
    landmarkX:-22*berthSide,landmarkZ:6,stalls,trees:freeze(trees),lamps:freeze(lamps),
    bench:Object.freeze({x:(id%3-1)*5,z:35+(id%4)*2})});
}));
// Orthogonal transforms match THREE's rotation about +Y exactly.
export function islandToWorld(island,x,z){
  const [c,s]=[[1,0],[0,1],[-1,0],[0,-1]][island.layout.quarter];
  return {x:island.x+x*c+z*s,z:island.z-x*s+z*c};
}
export function worldToIsland(island,x,z){
  const [c,s]=[[1,0],[0,1],[-1,0],[0,-1]][island.layout.quarter],dx=x-island.x,dz=z-island.z;
  return {x:dx*c-dz*s,z:dx*s+dz*c};
}
export function islandRectToWorld(island,rect){
  const a=islandToWorld(island,rect.minX,rect.minZ),b=islandToWorld(island,rect.maxX,rect.maxZ);
  return {...rect,island:island.id,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)};
}
export function islandSpawn(island){return {...islandToWorld(island,island.layout.dockX,4),yaw:island.layout.yaw+.35};}
const islandRadii=island=>island.id===0?{x:132,z:108}:{x:34+(island.id%4)*4,z:30+(island.id%3)*4};
export function islandSurfaces(island){
  const {x:rx,z:rz}=islandRadii(island),out=[];
  // Overlapping row-bands approximate the new scalloped coast for collision,
  // shore-luck and swept-boat tests without using the old rectangular islands.
  for(let z=-rz-6;z<=rz+6;z+=8){const f=Math.sqrt(Math.max(0,1-(z/(rz+6))**2)),half=(rx+6)*f;
    if(half>.2)out.push({minX:-half,maxX:half,minZ:25+z-4.1,maxZ:25+z+4.1,height:.5,kind:'shore'});
  }
  if(island.id===0){for(let z=-rz*.88;z<=rz*.88;z+=8){const half=rx*.91*Math.sqrt(Math.max(0,1-(z/rz)**2));out.push({minX:-half,maxX:half,minZ:25+z-4.1,maxZ:25+z+4.1,height:.95,kind:'central-land'});}}
  else for(let z=-rz*.86;z<=rz*.86;z+=8){const half=rx*.91*Math.sqrt(Math.max(0,1-(z/rz)**2));out.push({minX:-half,maxX:half,minZ:25+z-4.1,maxZ:25+z+4.1,height:.95,kind:'island-land'});}
  return out;
}
