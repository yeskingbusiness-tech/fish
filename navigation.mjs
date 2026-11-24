// Pure boating geometry. The level barriers are invisible vertical cylinders;
// swept movement prevents fast boats/large frames from tunnelling through them.
import { ISLANDS, hasIslandLicense } from './archipelago.mjs?v=48';
import { islandToWorld, islandRectToWorld, islandSurfaces } from './island-layout.mjs?v=47';
export const TERRITORY_RADIUS=300; // 7.44× the old 110m territory area.
export const SHORE_FULL_PENALTY_DISTANCE=6;
export const SHORE_CLEAR_DISTANCE=48;
export const BOAT_TURN_RATE=1.44; // +20%, for all eight hulls.
export const SEA_BOUNDS=Object.freeze({minX:-6000,maxX:6000,minZ:-6000,maxZ:6000});
export const territoryCenter=i=>islandToWorld(i,0,25);
export const LAND_RECTS=Object.freeze(ISLANDS.flatMap(i=>islandSurfaces(i).filter(r=>r.kind!=='shore').map(r=>Object.freeze(islandRectToWorld(i,r)))));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function territoryAt(x,z){return ISLANDS.find(i=>{const c=territoryCenter(i);return Math.hypot(x-c.x,z-c.z)<TERRITORY_RADIUS;})?.id??null;}
// Player walking coordinates are clamped to the open deck, expressed in the
// boat's rotated local frame so every hull orientation behaves consistently.
export function clampBoatDeckPosition(x,z,boat,size=1){
  const dx=x-boat.x,dz=z-boat.z,c=Math.cos(boat.yaw||0),s=Math.sin(boat.yaw||0);
  const lx=clamp(c*dx-s*dz,-.88*size,.88*size),lz=clamp(s*dx+c*dz,-2.15*size,2.15*size);
  return {x:boat.x+c*lx+s*lz,z:boat.z-s*lx+c*lz};
}
export function distanceToShore(x,z){return Math.min(...LAND_RECTS.map(r=>Math.hypot(x-clamp(x,r.minX,r.maxX),z-clamp(z,r.minZ,r.maxZ))));}
export function shoreLuckPenalty(x,z){const distance=distanceToShore(x,z);return -.95*(1-clamp((distance-SHORE_FULL_PENALTY_DISTANCE)/(SHORE_CLEAR_DISTANCE-SHORE_FULL_PENALTY_DISTANCE),0,1))||0;}
function circleHit(a,b,c,r){const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;const t=len?clamp(((c.x-a.x)*dx+(c.z-a.z)*dz)/len,0,1):0;return Math.hypot(a.x+dx*t-c.x,a.z+dz*t-c.z)<r;}
function rectHit(a,b,r,pad){
  let lo=0,hi=1;
  for(const [key,min,max] of [['x',r.minX-pad,r.maxX+pad],['z',r.minZ-pad,r.maxZ+pad]]){
    const d=b[key]-a[key];if(Math.abs(d)<1e-10){if(a[key]<min||a[key]>max)return false;continue;}
    const p=(min-a[key])/d,q=(max-a[key])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return false;
  }return true;
}
export function boatMoveBlock(a,b,{xp=0,licenses=[],radius=1.2}={}){
  if(![a.x,a.z,b.x,b.z,radius].every(Number.isFinite))return {kind:'invalid'};
  if(b.x<SEA_BOUNDS.minX+radius||b.x>SEA_BOUNDS.maxX-radius||b.z<SEA_BOUNDS.minZ+radius||b.z>SEA_BOUNDS.maxZ-radius)return {kind:'edge'};
  for(const i of ISLANDS)if(!hasIslandLicense(i.id,xp,licenses)&&circleHit(a,b,territoryCenter(i),TERRITORY_RADIUS+radius))return {kind:'level',island:i.id,level:i.level};
  // Circular hull footprint includes stern/bow: yaw never allows clipping a dock.
  if(LAND_RECTS.some(r=>rectHit(a,b,r,radius)))return {kind:'land'};
  return null;
}
export function stepBoat(state,input,boat,dt,access={}){
  const step=clamp(Number.isFinite(dt)?dt:0,0,.1),throttle=clamp(input.throttle||0,-1,1),steer=clamp(input.steer||0,-1,1);
  const desired=throttle*boat.speed*(throttle<0?.4:1),speed=state.speed+(desired-state.speed)*Math.min(1,step*(throttle?1.6:3.5));
  const yaw=state.yaw-steer*step*BOAT_TURN_RATE*(.35+.65*Math.min(1,Math.abs(speed)/boat.speed))*(speed<-.2?-1:1);
  const next={x:state.x-Math.sin(yaw)*speed*step,z:state.z-Math.cos(yaw)*speed*step,yaw,speed};
  const block=boatMoveBlock(state,next,{...access,radius:boat.size*4});
  return block?{...state,yaw,speed:0,block}:{...next,block:null};
}
export function dockLocation(island,size=1){const i=ISLANDS[island],l=i.layout;return island===0?islandToWorld(i,0,-104-size*2):islandToWorld(i,l.dockX+l.berthSide*(14+size*4),-30-size*2);}
export function dockPose(island,size=1){return {...dockLocation(island,size),yaw:ISLANDS[island].layout.yaw};}
export function nearbyDock(x,z){return ISLANDS.find(i=>{const p=dockLocation(i.id,1);return Math.hypot(x-p.x,z-p.z)<24;})?.id??null;}
export function mapPoint(x,z){return {x:(x-SEA_BOUNDS.minX)/(SEA_BOUNDS.maxX-SEA_BOUNDS.minX)*100,y:(z-SEA_BOUNDS.minZ)/(SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ)*100};}

export function validBoatPose(pose,boat,access={}){
  return !!pose&&['x','z','yaw'].every(k=>Number.isFinite(pose[k]))&&!boatMoveBlock(pose,pose,{...access,radius:boat.size*4});
}
// Boarding teleports the PLAYER, never moves an existing valid boat to the
// selected map destination. Validation still enforces earned territory access.
export function returnBoatPose(position,zone,boat,access={}){
  if(validBoatPose(position,boat,access))return {x:position.x,z:position.z,yaw:position.yaw};
  const home=hasIslandLicense(zone,access.xp||0,access.licenses||[])?zone:0;
  return dockPose(home,boat.size);
}
