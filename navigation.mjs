// Pure boating geometry. The level barriers are invisible vertical cylinders;
// swept movement prevents fast boats/large frames from tunnelling through them.
import { ISLANDS, hasIslandLicense } from './archipelago.mjs?v=41';
export const TERRITORY_RADIUS=110;
export const SEA_BOUNDS=Object.freeze({minX:-590,maxX:590,minZ:-1240,maxZ:200});
export const territoryCenter=i=>({x:i.x,z:i.z+25});
export const LAND_RECTS=Object.freeze(ISLANDS.flatMap(i=>[
  ...[...i.landforms,...i.waterObstacles].map(f=>({island:i.id,minX:i.x+f.x-f.w/2,maxX:i.x+f.x+f.w/2,minZ:i.z+f.z-f.d/2,maxZ:i.z+f.z+f.d/2})),
  {island:i.id,minX:i.x-30,maxX:i.x+30,minZ:i.z+10,maxZ:i.z+58},
  {island:i.id,minX:i.x-28,maxX:i.x-16,minZ:i.z-2,maxZ:i.z+18},
  {island:i.id,minX:i.x-2.5,maxX:i.x+2.5,minZ:i.z-2.5,maxZ:i.z+14},
  {island:i.id,minX:i.x+7.3,maxX:i.x+10.7,minZ:i.z+.5,maxZ:i.z+14},
]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function territoryAt(x,z){return ISLANDS.find(i=>{const c=territoryCenter(i);return Math.hypot(x-c.x,z-c.z)<TERRITORY_RADIUS;})?.id??null;}
export function distanceToShore(x,z){return Math.min(...LAND_RECTS.map(r=>Math.hypot(x-clamp(x,r.minX,r.maxX),z-clamp(z,r.minZ,r.maxZ))));}
export function shoreLuckPenalty(x,z){const distance=distanceToShore(x,z);return -.95*(1-clamp((distance-8)/47,0,1))||0;}
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
  const yaw=state.yaw-steer*step*1.2*(.35+.65*Math.min(1,Math.abs(speed)/boat.speed))*(speed<-.2?-1:1);
  const next={x:state.x-Math.sin(yaw)*speed*step,z:state.z-Math.cos(yaw)*speed*step,yaw,speed};
  const block=boatMoveBlock(state,next,{...access,radius:boat.size*4});
  return block?{...state,yaw,speed:0,block}:{...next,block:null};
}
export function dockLocation(island,size=1){const i=ISLANDS[island];return {x:i.x+14+size*4,z:i.z-6-size*2};}
export function nearbyDock(x,z){
  return ISLANDS.find(i=>Math.hypot(x-(i.x+22),z-(i.z-10))<20)?.id??null;
}
export function mapPoint(x,z){return {x:(x-SEA_BOUNDS.minX)/(SEA_BOUNDS.maxX-SEA_BOUNDS.minX)*100,y:(z-SEA_BOUNDS.minZ)/(SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ)*100};}
