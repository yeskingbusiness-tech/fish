// Exposed faces of axis-aligned cuboids. Subtract covered rectangles, including
// partial overlaps, BEFORE batching. Coplanar faces are owned by the last block:
// no polygon-offset band-aid, duplicate surfaces or depth-buffer flicker.
const EPS=1e-7;
function subtract(a,b){
  const u0=Math.max(a[0],b[0]),v0=Math.max(a[1],b[1]),u1=Math.min(a[2],b[2]),v1=Math.min(a[3],b[3]);
  if(u1-u0<EPS||v1-v0<EPS)return [a];
  const out=[];
  if(u0-a[0]>EPS)out.push([a[0],a[1],u0,a[3]]);
  if(a[2]-u1>EPS)out.push([u1,a[1],a[2],a[3]]);
  if(v0-a[1]>EPS)out.push([u0,a[1],u1,v0]);
  if(a[3]-v1>EPS)out.push([u0,v1,u1,a[3]]);
  return out;
}
export function exposedCuboidFaces(specs){
  const boxes=specs.map((s,index)=>({index,c:s.c,min:[s.x-s.w/2,s.y-s.h/2,s.z-s.d/2],max:[s.x+s.w/2,s.y+s.h/2,s.z+s.d/2]}));
  const cells=new Map(),size=8;
  const keys=b=>{const result=[];for(let x=Math.floor(b.min[0]/size);x<=Math.floor(b.max[0]/size);x++)for(let y=Math.floor(b.min[1]/size);y<=Math.floor(b.max[1]/size);y++)for(let z=Math.floor(b.min[2]/size);z<=Math.floor(b.max[2]/size);z++)result.push(`${x},${y},${z}`);return result;};
  for(const b of boxes)for(const key of keys(b)){if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b);}
  const faces=[];
  for(const a of boxes){
    const nearby=[...new Set(keys(a).flatMap(k=>cells.get(k)))].filter(b=>b!==a&&b.min.every((v,k)=>v<=a.max[k]+EPS)&&b.max.every((v,k)=>v>=a.min[k]-EPS));
    for(let axis=0;axis<3;axis++)for(const side of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,plane=side>0?a.max[axis]:a.min[axis];
      let rects=[[a.min[u],a.min[v],a.max[u],a.max[v]]];
      for(const b of nearby){
        const covers=side>0?b.min[axis]<=plane+EPS&&b.max[axis]>plane+EPS:b.max[axis]>=plane-EPS&&b.min[axis]<plane-EPS;
        const same=side>0?Math.abs(b.max[axis]-plane)<EPS:Math.abs(b.min[axis]-plane)<EPS;
        if(!covers&&!(same&&b.index>a.index))continue;
        rects=rects.flatMap(r=>subtract(r,[b.min[u],b.min[v],b.max[u],b.max[v]]));if(!rects.length)break;
      }
      for(const [u0,v0,u1,v1]of rects){
        let points=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([x,y])=>{const p=[];p[axis]=plane;p[u]=x;p[v]=y;return p;});
        if(side<0)points.reverse();const normal=[0,0,0];normal[axis]=side;
        faces.push({points,normal,color:a.c});
      }
    }
  }return faces;
}
