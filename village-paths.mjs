// Connect varied counters to the pier once at world construction time.
// Grid search is only for paving, not island/world placement. It reserves clear
// routes around buildings instead of drawing paths through neighboring shops.
export function villagePathTiles(layout){
  const step=1.8,key=(x,z)=>x+','+z,tiles=new Map();
  const start=[Math.round(layout.dockX/step),8];
  const open=(x,z)=>x>=-14&&x<=14&&z>=6&&z<=27&&
    !layout.stalls.some(s=>Math.hypot(x*step-s.x,z*step-s.z)<3.5)&&
    !layout.trees.some(t=>Math.hypot(x*step-t.x,z*step-t.z)<1.2);
  for(const stall of layout.stalls){
    // Always snap away from the counter: nearest rounding can put a goal
    // inside its reserved footprint and silently leave that shop unconnected.
    const goal=[Math.round(stall.x/step),Math.floor((stall.z-4)/step)];
    const queue=[start],previous=new Map([[key(...start),null]]);let target=null;
    for(let n=0;n<queue.length;n++){
      const p=queue[n];if(p[0]===goal[0]&&p[1]===goal[1]){target=key(...p);break;}
      for(const [dx,dz]of [[0,1],[1,0],[-1,0],[0,-1]]){
        const x=p[0]+dx,z=p[1]+dz,k=key(x,z);
        if(!previous.has(k)&&open(x,z)){queue.push([x,z]);previous.set(k,key(...p));}
      }
    }
    while(target){const [x,z]=target.split(',').map(Number);tiles.set(target,{x:x*step,z:z*step});target=previous.get(target);}
  }
  return [...tiles.values()];
}
