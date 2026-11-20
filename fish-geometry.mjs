import { fishAppearance } from './fish-appearance.mjs?v=44';

// Dependency-free, deterministic sculpting. Faceted, bevelled volumes and thick
// polygon fins keep the block-world style without making every animal a cuboid.
// The same authored surfaces drive both the real mesh and the illustrated icons.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const add=(a,b)=>a.map((n,i)=>n+b[i]);
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
const mul=(a,n)=>a.map(v=>v*n);
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const rgb=c=>[(c>>16)&255,(c>>8)&255,c&255];
const hex=a=>(clamp(Math.round(a[0]),0,255)<<16)|(clamp(Math.round(a[1]),0,255)<<8)|clamp(Math.round(a[2]),0,255);
export const tint=(c,v)=>hex(rgb(c).map(n=>n*v));
const blend=(a,b,t)=>hex(rgb(a).map((n,i)=>mix(n,rgb(b)[i],t)));
const colour=c=>'#'+c.toString(16).padStart(6,'0');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map(),icons=new Map();
// The 400-entry guide reuses Blob thumbnails. Keep only a small working set of
// CPU sculpts / SVG strings, not hundreds of thousands of hidden face arrays.
const remember=(map,key,value,limit)=>{map.delete(key);map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);return value;};
const cached=(map,key)=>{const value=map.get(key);map.delete(key);map.set(key,value);return value;};
export const fishGeometryCacheStats=()=>({sculpts:cache.size,svgStrings:icons.size,sculptLimit:32,svgLimit:64});
const OCT=[[1,.55],[.55,1],[-.55,1],[-1,.55],[-1,-.55],[-.55,-1],[.55,-1],[1,-.55]];

// Ear clipping, rather than a triangle fan, is important for notched/forked
// tails, serrated fin edges and concave arms. All supplied faces are planar.
export function triangulate(points){
  if(points.length===3)return [[0,1,2]];
  let n=[0,0,0];
  for(let i=0;i<points.length;i++)n=add(n,cross(points[i],points[(i+1)%points.length]));
  const axis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
  const axes=[0,1,2].filter(i=>i!==axis),p=points.map(v=>axes.map(i=>v[i]));
  const area=p.reduce((s,v,i)=>s+v[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*v[1],0);
  const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const sign=area>=0?1:-1,remaining=p.map((_,i)=>i),out=[];
  let guard=points.length*points.length;
  while(remaining.length>3&&guard--){
    let clipped=false;
    for(let i=0;i<remaining.length;i++){
      const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];
      if(turn(p[a],p[b],p[c])*sign<=1e-12)continue;
      if(remaining.some(k=>k!==a&&k!==b&&k!==c&&turn(p[a],p[b],p[k])*sign>1e-10&&turn(p[b],p[c],p[k])*sign>1e-10&&turn(p[c],p[a],p[k])*sign>1e-10))continue;
      out.push([a,b,c]);remaining.splice(i,1);clipped=true;break;
    }
    if(!clipped){
      // Remove a redundant collinear outline vertex, never bridge a concavity.
      const i=remaining.findIndex((v,i)=>Math.abs(turn(p[remaining[(i+remaining.length-1)%remaining.length]],p[v],p[remaining[(i+1)%remaining.length]]))<1e-10);
      if(i<0)break;remaining.splice(i,1);
    }
  }
  if(remaining.length===3)out.push([...remaining]);
  return out;
}

export function buildFishVisual(species){
  const id=typeof species==='string'?species:species.id;
  if(cache.has(id))return cached(cache,id);
  const a=fishAppearance(id),[L,H,W]=a.body,[back,flank,belly,baseFin,mark]=a.tones;
  const fin=a.finColor||baseFin,light=blend(fin,belly,.45),ink=0x152d32;
  const faces=[],features=new Set(),parts={body:{pivot:[0,0,0]},belly:{pivot:[0,0,0]},tail:{pivot:[-L*.5,0,0],motion:'tail'}};
  const has=t=>a.traits.includes(t);
  function face(points,c,feature='body',part='body',normal=null,glow=false){
    if(points.length<3)return;
    let p=points.map(v=>[...v]);
    if(normal&&dot(cross(sub(p[1],p[0]),sub(p[2],p[0])),normal)<0)p.reverse();
    if(Math.hypot(...cross(sub(p[1],p[0]),sub(p[2],p[0])))<1e-12&&p.length===3)return;
    faces.push({p,c,part,feature,glow});features.add(feature);
  }
  function plate(points,thickness,c,feature,part='body'){
    const d=mul(thickness,.5),top=points.map(v=>add(v,d)),bottom=points.map(v=>sub(v,d));
    face(top,c,feature,part,thickness);face([...bottom].reverse(),tint(c,.83),feature,part,mul(thickness,-1));
    for(let i=0;i<top.length;i++)face([top[i],bottom[i],bottom[(i+1)%top.length],top[(i+1)%top.length]],tint(c,.74),feature,part);
  }
  function tube(points,radii,c,feature,part='body',sides=6){
    const rings=points.map((p,i)=>{
      const dir=unit(sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)]));
      const u=unit(cross(dir,Math.abs(dir[1])>.9?[0,0,1]:[0,1,0])),v=cross(dir,u);
      const r=Array.isArray(radii)?radii[i]:radii;
      return Array.from({length:sides},(_,k)=>add(p,add(mul(u,Math.cos(k*Math.PI*2/sides)*r),mul(v,Math.sin(k*Math.PI*2/sides)*r))));
    });
    for(let i=0;i<rings.length-1;i++)for(let k=0;k<sides;k++)face([rings[i][k],rings[i+1][k],rings[i+1][(k+1)%sides],rings[i][(k+1)%sides]],k<sides/2?c:tint(c,.9),feature,part);
    face([...rings[0]].reverse(),tint(c,.85),feature,part);face(rings.at(-1),c,feature,part);
  }
  function line(points,radius,c,feature,part='body'){tube(points,radius,c,feature,part,4);}
  function ellipsoid(center,size,c,feature,part='body',glow=false){
    const [x,y,z]=center,[rx,ry,rz]=size;
    const rings=[-.72,0,.72].map(t=>OCT.map(([u,v])=>[x+rx*t,y+ry*u*Math.sqrt(1-t*t),z+rz*v*Math.sqrt(1-t*t)]));
    for(let i=0;i<2;i++)for(let k=0;k<8;k++)face([rings[i][k],rings[i][(k+1)%8],rings[i+1][(k+1)%8],rings[i+1][k]],c,feature,part,null,glow);
    for(const side of [-1,1]){const ring=rings[side===1?2:0];for(let k=0;k<8;k++)face([ring[k],ring[(k+1)%8],[x+side*rx,y,z]],c,feature,part,null,glow);}
  }


  function finish(){
  // Normalise longitudinal span, not pounds. The carried-fish system still
  // applies the species-authored span and fits the complete anatomical volume.
  const vertices=faces.flatMap(f=>f.p),min=[0,1,2].map(k=>Math.min(...vertices.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...vertices.map(p=>p[k])));
  const factor=1.8/(max[0]-min[0]),center=[(max[0]+min[0])/2,0,0];
  for(const f of faces)f.p=f.p.map(v=>mul(sub(v,center),factor));
  for(const part of Object.values(parts)){part.pivot=mul(sub(part.pivot,center),factor);if(part.span)part.span*=factor;}
  const bounds={min:min.map((v,k)=>(v-center[k])*factor),max:max.map((v,k)=>(v-center[k])*factor)};
  const result={id,family:a.family,faces,parts,bounds,displayRotation:[['ray','manta','flatfish','starfish','sea-spider'].includes(a.family)?.76:['squid','octopus'].includes(a.family)?.14:.055,a.mouth==='cavern'?-.32:-.12,0],gripX:-center[0]*factor,features:[...features],iconTilt:['ray','manta','flatfish','starfish','sea-spider'].includes(a.family)?.88:['squid','octopus'].includes(a.family)?.37:a.family==='whale'?.43:.19};
  return remember(cache,id,result,32);
  }
  if(['flatfish','shrimp','isopod','sea-spider','starfish'].includes(a.family)){
    // These animals are not fish-shaped recolours. They have their own disc,
    // carapace, articulated legs or radial arms, with a real belly contact.
    if(a.family==='flatfish'){
      ellipsoid([0,0,0],[L*.52,H*.5,W*.52],flank,'flatfish-disc');
      ellipsoid([0,-H*.2,0],[L*.36,H*.3,W*.42],belly,'flatfish-belly','belly');
      for(let i=0;i<18;i++){
        const t=i/18*Math.PI*2,u=(i+1)/18*Math.PI*2;
        const p=t=>[Math.cos(t)*L*.51,0,Math.sin(t)*W*.58],q=t=>[Math.cos(t)*L*.58,0,Math.sin(t)*W*.7];
        plate([p(t),q(t),q(u),p(u)],[0,H*.08,0],fin,'continuous-dorsal-anal-fringe');
      }
      plate([[-L*.46,0,-W*.1],[-L*.8,0,-W*.33],[-L*.85,0,W*.28],[-L*.46,0,W*.1]],[0,H*.13,0],fin,'flat-tail','tail');
      for(const [x,z]of [[.25,.12],[.37,.06]]){
        ellipsoid([L*x,H*.46,W*z],[L*.045,H*.18,W*.045],belly,'both-eyes-upper-side');
        ellipsoid([L*x,H*.61,W*z],[L*.023,H*.08,W*.024],ink,'upper-pupils');
      }
      for(let i=0;i<16;i++){const t=i*2.4,r=.13+(i%4)*.07;ellipsoid([Math.cos(t)*L*r,H*.46,Math.sin(t)*W*r],[L*.025,H*.03,W*.03],mark,'upper-side-spots');}
      line([[L*.45,H*.12,-W*.08],[L*.53,H*.12,0],[L*.45,H*.12,W*.08]],H*.04,ink,'flatfish-mouth');
    }else if(a.family==='starfish'){
      ellipsoid([0,0,0],[L*.19,H*.5,W*.19],flank,'central-disc');
      ellipsoid([0,-H*.2,0],[L*.14,H*.24,W*.14],belly,'oral-disc','belly');
      for(let k=0;k<5;k++){
        const t=k*Math.PI*2/5,part=k===2?'tail':'body';
        tube([[Math.cos(t)*L*.13,0,Math.sin(t)*W*.13],[Math.cos(t)*L*.36,H*.04,Math.sin(t)*W*.36],[Math.cos(t)*L*.62,0,Math.sin(t)*W*.62]], [H*.45,H*.3,H*.035],fin,'radial-arm-'+(k+1),part,6);
        for(let j=1;j<=3;j++){
          const x=Math.cos(t)*L*j*.14,z=Math.sin(t)*W*j*.14;
          ellipsoid([x,-H*.2,z],[H*.12,H*.07,H*.12],belly,'tube-feet',part);
          ellipsoid([x,H*.2,z],[H*.12,H*.08,H*.12],mark,'star-tubercles',part,true);
        }
      }
    }else if(a.family==='sea-spider'){
      ellipsoid([0,0,0],[L*.5,H*.45,W*.11],flank,'spider-trunk');
      ellipsoid([0,-H*.12,0],[L*.35,H*.3,W*.09],belly,'spider-belly','belly');
      for(const side of [-1,1])for(let k=0;k<4;k++){
        const x=L*(-.3+k*.2),s=(k-1.5)*.28;
        tube([[x,0,side*W*.07],[x+L*s,H*.8,side*W*.45],[x+L*s*1.6,-H*.4,side*W*.85]],[H*.16,H*.11,H*.025],fin,'jointed-leg-'+(side<0?k+1:k+5),'body',4);
      }
      for(const side of [-1,1]){
        tube([[L*.38,H*.06,side*W*.045],[L*.65,H*.05,side*W*.13],[L*.73,-H*.16,side*W*.07]],[H*.13,H*.08,H*.02],flank,'chelicerae','tail',4);
        ellipsoid([L*.3,H*.4,side*W*.045],[H*.12,H*.12,H*.12],ink,'spider-eyes');
      }
    }else{
      const shrimp=a.family==='shrimp',segments=shrimp?8:7;
      for(let k=0;k<segments;k++){
        const x=L*(.39-k*.12),taper=1-k*.055,y=shrimp?-Math.sin(k*.45)*H*.24:0;
        ellipsoid([x,y,0],[L*.15,H*.5*taper,W*.49*taper],k%2?flank:back,'carapace-segment-'+(k+1),k===segments-1?'tail':'body');
      }
      ellipsoid([0,-H*.16,0],[L*.36,H*.27,W*.31],belly,'crustacean-belly','belly');
      const pairs=shrimp?5:7;
      for(const side of [-1,1]){
        for(let k=0;k<pairs;k++){
          const x=L*(.3-k*.1);
          tube([[x,-H*.12,side*W*.32],[x-L*.05,-H*.6,side*W*.65],[x+L*.08,-H*.78,side*W*.85]],[H*.075,H*.055,H*.018],fin,'jointed-leg-'+(side<0?k+1:k+1+pairs),'body',4);
        }
        tube([[L*.38,H*.1,side*W*.15],[L*.65,H*.45,side*W*.3],[L*(shrimp?1.05:.78),H*.6,side*W*.5]],[H*.045,H*.025,H*.007],mark,'antennae','body',4);
        ellipsoid([L*.48,H*.24,side*W*.26],[H*.14,H*.13,H*.14],ink,'compound-eyes');
      }
      plate([[-L*.43,0,0],[-L*.7,-H*.12,-W*.5],[-L*.78,-H*.15,0],[-L*.7,-H*.12,W*.5]],[0,H*.12,0],fin,'tail-fan','tail');
    }
    return finish();
  }

  let profile;
  const standard=[[-.5,.13,.16,0],[-.39,.48,.52,0],[-.22,.85,.87,0],[0,1,1,0],[.22,.94,.98,0],[.36,.74,.86,0],[.46,.46,.58,0],[.52,.23,.30,-.04]];
  const profiles={
    sunfish:[[-.5,.12,.20,0],[-.37,.56,.58,0],[-.20,.91,.9,0],[.03,1,1,0],[.23,.89,.91,0],[.37,.63,.76,-.02],[.49,.28,.35,-.06]],
    carp:[[-.5,.14,.18,0],[-.38,.5,.56,.02],[-.18,.95,.90,.07],[.04,1,1,.09],[.25,.85,.96,0],[.4,.58,.72,-.04],[.52,.27,.32,-.13]],
    catfish:[[-.5,.12,.19,0],[-.34,.47,.52,0],[-.14,.78,.8,0],[.09,.96,1,0],[.29,.82,1.08,-.04],[.44,.53,.98,-.07],[.54,.33,.68,-.09]],
    pike:[[-.5,.14,.16,0],[-.34,.64,.69,0],[-.15,.93,.93,0],[.08,1,1,0],[.29,.81,.85,-.02],[.45,.47,.7,-.04],[.53,.27,.55,-.10]],
    gar:[[-.5,.17,.2,0],[-.35,.7,.75,0],[-.1,1,1,0],[.13,.95,1,0],[.33,.75,.86,-.04],[.49,.40,.68,-.08],[.54,.25,.52,-.1]],
    sturgeon:[[-.5,.12,.13,.05],[-.35,.54,.60,.06],[-.1,.92,.9,.03],[.15,1,1,0],[.32,.75,.84,-.04],[.48,.37,.57,-.10],[.55,.16,.29,-.13]],
    wrasse:[[-.5,.24,.3,0],[-.32,.78,.72,0],[-.1,.98,.98,0],[.16,1,1,.03],[.32,.96,.94,.05],[.43,.61,.72,-.04],[.52,.32,.43,-.14]],
    mola:[[-.49,.64,.38,0],[-.37,.89,.78,0],[-.14,1,1,0],[.1,.98,1,0],[.31,.8,.83,0],[.44,.48,.56,-.02],[.51,.24,.28,-.05]],
    opah:[[-.5,.2,.3,0],[-.34,.75,.81,0],[-.12,1,1,0],[.14,.98,.97,0],[.34,.76,.73,0],[.49,.26,.29,-.02]],
    pacu:[[-.5,.16,.24,0],[-.33,.71,.75,0],[-.12,.98,1,0],[.12,1,1,0],[.31,.79,.87,-.03],[.48,.28,.32,-.10]],
    armored:[[-.5,.17,.24,0],[-.34,.76,.71,0],[-.13,.98,.96,0],[.14,1,1,0],[.33,.9,1,0],[.5,.57,.82,-.03]],
    angler:[[-.5,.12,.16,0],[-.32,.61,.62,0],[-.1,.98,.98,0],[.13,1,1,0],[.34,.86,.94,-.03],[.5,.72,.84,-.09]],
    shark:[[-.5,.11,.12,0],[-.34,.5,.56,0],[-.13,.9,.94,0],[.12,1,1,0],[.3,.82,.90,0],[.45,.49,.62,-.03],[.57,.15,.20,-.10]],
    whale:[[-.5,.12,.18,0],[-.32,.55,.60,0],[-.12,.9,.93,0],[.12,1,1,0],[.33,.92,.94,0],[.49,.67,.79,-.03],[.58,.43,.57,-.09]],
  };
  let rows;
  const isLong=['eel','wyrm','oarfish'].includes(a.family),isRay=['ray','manta'].includes(a.family),isCeph=['squid','octopus'].includes(a.family);
  if(isLong){
    rows=Array.from({length:19},(_,i)=>{
      const t=i/18,x=mix(-.62,.52,t)*L;
      const taper=a.family==='oarfish'?.09+.9*Math.pow(t,.46):Math.sin(t*Math.PI*.72)*.95+.035;
      const bend=Math.sin((t-.2)*Math.PI*2)*(a.family==='wyrm'?.23:.10)*H;
      return {x,y:bend,z:Math.sin(t*Math.PI*2)*W*.12,h:H*.5*taper,w:W*.5*taper};
    });
  }else{
    profile=profiles[a.family]||standard;
    if(a.family==='whale'&&a.head>=1.6)profile=[...profiles.whale.slice(0,4),[.32,1.02,.97,.03],[.47,1,.89,.02],[.58,.87,.74,-.03]];
    if(a.family==='shark'&&a.head>=1.45)profile=[...profiles.shark.slice(0,5),[.46,.65,.78,-.04],[.56,.46,.66,-.09]];
    if(isRay)profile=[[-.5,.32,.28,0],[-.3,.75,.40,0],[0,1,.43,0],[.26,.92,.35,.05],[.45,.55,.30,.06],[.53,.25,.20,0]];
    if(isCeph)profile=a.family==='squid'
      ?[[-.73,.08,.1,0],[-.55,.63,.60,0],[-.30,.97,.93,0],[-.02,1,1,0],[.16,.68,.68,0],[.25,.78,.84,0],[.43,.58,.64,0]]
      :[[-.52,.1,.13,.05],[-.36,.75,.78,.06],[-.1,1,1,.06],[.12,.94,.95,0],[.3,.70,.76,-.05],[.43,.39,.48,-.09]];
    rows=profile.map(([x,h,w,y])=>({x:x*L,y:y*H,z:0,h:h*H*.5,w:w*W*.5*(x>.25?a.head:1)}));
  }
  const sample=x=>{
    let i=rows.findIndex(r=>r.x>=x);if(i<0)i=rows.length-1;if(i===0)return {...rows[0]};
    const l=rows[i-1],r=rows[i],t=clamp((x-l.x)/(r.x-l.x),0,1);
    return {x,y:mix(l.y,r.y,t),z:mix(l.z,r.z,t),h:mix(l.h,r.h,t),w:mix(l.w,r.w,t)};
  };
  const surface=(x,y,side,offset=.003)=>{
    const r=sample(x),f=clamp(y,-1,1),edge=Math.abs(f)<.55?1:1-(Math.abs(f)-.55);
    return [x,r.y+r.h*f,r.z+side*(r.w*edge+offset)];
  };
  const roof=x=>{const r=sample(x);return r.y+r.h;};
  const floor=x=>{const r=sample(x);return r.y-r.h;};
  const rings=rows.map(r=>OCT.map(([y,z])=>[r.x,r.y+y*r.h,r.z+z*r.w]));
  if(isLong)parts.tail.pivot=[rows[3].x,rows[3].y,rows[3].z];
  if(isCeph)parts.tail.pivot=[L*.43,-H*.05,0];
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<8;k++){
    const c=k===7?back:k===0||k===6?blend(back,flank,.44):k===1||k===5?flank:belly;
    const part=isLong&&i<3?'tail':k>=2&&k<=4&&i>1&&i<rings.length-3?'belly':'body';
    face([rings[i][k],rings[i][(k+1)%8],rings[i+1][(k+1)%8],rings[i+1][k]],c,'sculpted-trunk',part);
  }
  face([...rings[0]].reverse(),fin,'peduncle',isLong?'tail':'body',[-1,0,0]);
  face(rings.at(-1),flank,'snout','body',[1,0,0]);

  // Surface-conforming markings: no rectangular stickers floating outside a
  // rounded fish. Both sides get the same identifying field marks.
  function patch(coords,c,feature,side,glow=false){
    // Split field marks at the trunk's facets. A single large decal polygon
    // would cut through a convex head, hiding stripes and the angler's gape.
    const clip=(p,axis,bound,keepHigh)=>{
      const out=[];
      for(let i=0;i<p.length;i++){
        const v=p[i],w=p[(i+1)%p.length],inside=(v[axis]-bound)*(keepHigh?1:-1)>=-1e-12,other=(w[axis]-bound)*(keepHigh?1:-1)>=-1e-12;
        if(inside)out.push(v);
        if(inside!==other){const t=(bound-v[axis])/(w[axis]-v[axis]);out.push([mix(v[0],w[0],t),mix(v[1],w[1],t)]);}
      }
      return out;
    };
    // Clip convex triangles: clipping a concave mark as one polygon can leave
    // disconnected islands joined by a zero-width bridge along the clip line.
    let pieces=triangulate(coords.map(([x,y])=>[x,y,0])).map(t=>t.map(i=>coords[i]));
    for(const [axis,cuts]of [[0,rows.slice(1,-1).map(r=>r.x/L)],[1,[-.55,.55]]])for(const cut of cuts){
      pieces=pieces.flatMap(p=>{
        if(!p.some(v=>v[axis]<cut-1e-10)||!p.some(v=>v[axis]>cut+1e-10))return [p];
        return [clip(p,axis,cut,true),clip(p,axis,cut,false)].filter(p=>p.length>=3);
      });
    }
    for(let p of pieces){
      p=p.filter((v,i)=>Math.hypot(v[0]-p[(i+1)%p.length][0],v[1]-p[(i+1)%p.length][1])>1e-10);
      p=p.filter((v,i)=>{const before=p[(i+p.length-1)%p.length],after=p[(i+1)%p.length];return Math.abs((v[0]-before[0])*(after[1]-v[1])-(v[1]-before[1])*(after[0]-v[0]))>1e-12;});
      if(p.length<3)continue;
      face(p.map(([x,y])=>surface(x*L,y,side,.004)),c,feature,'body',[0,0,side],glow);
      faces.at(-1).decal=true;
    }
  }
  function spot(x,y,rx,ry,c,feature,side,glow=false){
    patch(Array.from({length:6},(_,i)=>[x+rx*Math.cos(i*Math.PI/3),y+ry*Math.sin(i*Math.PI/3)]),c,feature,side,glow);
  }
  function stripe(points,width,c,feature,side){
    for(let i=0;i<points.length-1;i++){
      const [x,y]=points[i],[xx,yy]=points[i+1];
      patch([[x,y-width],[xx,yy-width],[xx,yy+width],[x,y+width]],c,feature,side);
    }
  }
  let seed=[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,71);
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(const side of [-1,1]){
    const m=a.marks;
    if(['bars','tiger','mottled-bars','blue-bars','bands','ribbon-bars'].includes(m)){
      const count=a.barCount||(m==='ribbon-bars'?16:m==='bands'?11:6);
      for(let i=0;i<count;i++){
        const x=mix(-.37,.22,i/(count-1)),w=m==='tiger'?.025:.016;
        patch([[x-w,-.65],[x+w*.45,-.44],[x+w,.15],[x+w*.4,.94],[x-w*1.7,.82],[x-w*.4,.1]],m==='blue-bars'?blend(mark,flank,.15):mark,'vertical-bars',side);
      }
    }
    if(['horizontal','broken-horizontal'].includes(m))for(let j=0;j<5;j++){
      const y=-.6+j*.29;
      for(let i=0;i<(m==='broken-horizontal'?4:1);i++)stripe([[mix(-.39,.18,i/4),y],[m==='horizontal'?.28:mix(-.39,.18,(i+.76)/4),y*.86]],.027,mark,'horizontal-stripes',side);
    }
    if(['lateral-band','broken-band','snake-bands','rainbow'].includes(m)){
      const y=m==='snake-bands'?.37:0,width=m==='rainbow'?.13:.105,c=m==='rainbow'?(a.stripe||0xd88a99):mark;
      for(let i=0;i<12;i++){
        const x=-.42+i*.061,w=m==='broken-band'?.023:.035;
        patch([[x-w,y-width],[x+w,y-width*.9],[x+w,y+width],[x-w,y+width*.8]],c,'lateral-stripe',side);
      }
      if(m==='snake-bands')stripe([[-.42,-.38],[.05,-.30],[.34,-.28]],.1,mark,'snake-band',side);
    }
    if(['spots','red-spots','pale-spots','back-spots','rainbow','fine-spots','pepper','sun-spots','cross-spots','mantle-spots','constellation-spots','stars'].includes(m)){
      const count=m==='pepper'?46:m==='fine-spots'?28:m==='constellation-spots'?42:23;
      for(let i=0;i<count;i++){
        const x=-.36+random()*.67,y=m==='back-spots'?.23+random()*.66:-.56+random()*1.4;
        const r=(m==='pepper'||m==='rainbow'||m==='fine-spots')?.009:.014+random()*.008;
        if(m==='red-spots'&&i%3===0){spot(x,y,r*1.6,.087,belly,'spot-halo',side);spot(x,y,r,.054,0xb94d35,'red-spots',side);}
        else if(m==='cross-spots'){
          stripe([[x-r,y-.045],[x+r,y+.045]],.018,mark,'cross-spots',side);stripe([[x-r,y+.045],[x+r,y-.045]],.018,mark,'cross-spots',side);
        }else spot(x,y,r,(m==='fine-spots'||m==='rainbow')?.032:.062,mark,'field-spots',side,m==='stars');
      }
      if(m==='stars')for(let i=0;i<4;i++){
        const x=-.3+i*.14;stripe([[x,.25],[x+.08,.04],[x+.13,.35]],.009,blend(mark,flank,.25),'constellation-lines',side);
      }
    }
    if(['mottled','mottled-bars','saddles','leather','bark'].includes(m))for(let i=0;i<13;i++){
      const x=-.38+(i%5)*.145,y=i<5?.4:-.3+(i%2)*.3;
      patch([[x-.045,y-.2],[x+.01,y-.23],[x+.07,y+.03],[x+.03,y+.32],[x-.03,y+.2]],blend(mark,flank,m==='leather'?.76:.25),'mottling',side);
    }
    if(['scales','gold-scales','fine-scales','red-scales','mirror-scales','diamond','checker','reticulated'].includes(m)){
      const cols=m==='mirror-scales'?5:12,ys=m==='fine-scales'?4:3;
      for(let row=0;row<ys;row++)for(let i=0;i<cols;i++){
        if(m==='mirror-scales'&&((i+row*2)%3===0))continue;
        const x=-.4+(i+(row%2)*.45)*(.7/cols),y=-.55+row*(1.25/ys),r=m==='mirror-scales'?.046:.023;
        const c=m==='red-scales'&&x<-.04?blend(mark,flank,.27):m==='checker'?mark:blend(mark,flank,.52);
        if(m==='reticulated')stripe([[x-r,y],[x,y+.17],[x+r,y]],.023,c,'scale-net',side);
        else{
          patch([[x-r,y],[x,y+.19],[x+r,y],[x,y-.18]],c,'scale-edges',side);
          if(m!=='checker')patch([[x-r*.62,y],[x,y+.13],[x+r*.57,y],[x,y-.09]],m==='red-scales'&&x<-.04?blend(flank,mark,.18):blend(flank,belly,m==='mirror-scales'?.38:.12),'scale-facets',side);
        }
      }
    }
    if(m==='vermiculated'){
      for(let i=0;i<10;i++){const x=-.4+i*.07;stripe([[x,.4],[x+.02,.7],[x+.04,.46],[x+.07,.76]],.035,mark,'vermiculations',side);}
      for(let i=0;i<15;i++){const x=-.33+random()*.59,y=-.4+random()*.65;spot(x,y,.016,.063,0x77a0ab,'blue-halo',side);spot(x,y,.008,.032,0xcd7b4f,'red-spots',side);}
    }
    if(m==='pale-dashes')for(let i=0;i<24;i++){const x=-.39+(i%8)*.085,y=-.5+Math.floor(i/8)*.47;stripe([[x,y],[x+.034,y+.07]],.036,mark,'pike-dashes',side);}
    if(m==='runes')for(let i=0;i<7;i++){const x=-.36+i*.09;stripe([[x,-.3],[x+.022,.08],[x+.047,-.1]],.025,blend(mark,flank,.3),'rune-scales',side);}
    if(m==='scars')for(const [x,y]of [[-.22,.38],[.08,.12],[.25,.48]])stripe([[x-.03,y-.14],[x+.025,y+.14]],.022,blend(belly,flank,.28),'healed-scars',side);
    if(m==='rings')for(const r of [.13,.22,.32]){
      const points=Array.from({length:13},(_,i)=>[.01+Math.cos(i*Math.PI/6)*r,Math.sin(i*Math.PI/6)*r*2.1]);stripe(points,.022,mark,'concentric-markings',side);
    }
    if(has('belly-spots'))for(let i=0;i<9;i++)spot(-.36+i*.067,-.53,.014,.045,mark,'belly-spots',side);
  }

  function sagittal(name,points,c,part='body',rays=true){
    const pts=points.map(([x,y])=>[x,y,0]);plate(pts,[0,0,W*.038],c,name,part);
    if(rays){
      const root=[mix(points[0][0],points.at(-1)[0],.5),mix(points[0][1],points.at(-1)[1],.5),0];
      for(const side of [-1,1])for(let i=1;i<points.length-1;i++){
        const end=[points[i][0],points[i][1],side*W*.025],start=[root[0],root[1],end[2]];
        line([start,end],Math.min(.0045,L*.0025),has('sail-bones')?belly:light,'fin-rays',part);
      }
    }
  }
  function dorsal(from,to,height,kind='soft'){
    const x=from*L,xx=to*L,y=roof(x),yy=roof(xx),h=height*H*a.finSize;
    let points;
    if(kind==='spiny'){
      points=[[x,y]];
      for(let i=0;i<6;i++){const t=i/6,px=mix(x,xx,t),base=roof(px);points.push([px-L*.025,base+h*(.8+.2*Math.sin(t*Math.PI))],[px-L*.05,base+h*.47]);}
      points.push([xx,yy]);
    }else if(kind==='shark')points=[[x,y],[x-L*.08,y+h],[xx-L*.04,yy+H*.05],[xx+L*.06,yy+H*.12],[xx,yy]];
    else if(kind==='sail')points=[[x,y],[x-L*.04,y+h*.85],[mix(x,xx,.3),y+h],[mix(x,xx,.66),mix(y,yy,.6)+h*.7],[xx-L*.03,yy+h*.25],[xx,yy]];
    else points=[[x,y],[x-L*.045,y+h*.65],[mix(x,xx,.38),mix(y,yy,.38)+h],[mix(x,xx,.72),mix(y,yy,.72)+h*.91],[xx-L*.035,yy+h*.25],[xx,yy]];
    sagittal('dorsal-'+kind,points,fin);
  }
  if(!isRay&&!isCeph){
    switch(a.dorsal){
      case 'spiny':dorsal(.25,-.12,.34,'spiny');dorsal(-.10,-.38,.34);break;
      case 'notched':dorsal(.23,-.07,.36,'spiny');dorsal(-.06,-.36,.45);break;
      case 'double':dorsal(.27,-.025,.6,'spiny');dorsal(-.18,-.39,.43);break;
      case 'long':dorsal(.26,-.43,.3);break;
      case 'rear':dorsal(-.14,-.44,.47);break;
      case 'hump':dorsal(-.13,-.38,.19);break;
      case 'rear-long':dorsal(-.10,-.46,.31);break;
      case 'soft':dorsal(.12,-.14,.43);break;
      case 'cat':dorsal(.19,-.02,.62,'shark');break;
      case 'tiny':dorsal(.23,.1,.23,'shark');break;
      case 'cod':dorsal(.18,.03,.28);dorsal(-.05,-.46,.27);break;
      case 'shark':dorsal(.18,-.18,a.family==='whale'?.35:.65,'shark');if(a.family!=='whale')dorsal(-.32,-.45,.22,'shark');break;
      case 'sickle':dorsal(.15,-.40,a.family==='opah'?.39:.51,'shark');break;
      case 'sail':dorsal(.28,-.39,.89,'sail');break;
      case 'lobed':dorsal(.22,-.05,.5);dorsal(-.21,-.42,.34);break;
      case 'vertical':dorsal(.07,-.30,.47,'shark');break;
      case 'ribbon':case 'mane':{
        const start=a.dorsal==='mane'?rows.length-2:rows.length-5;
        for(let i=3;i<start;i++){
          const r=rows[i],n=rows[i+1],rise=H*(a.dorsal==='mane'?.44:.22)*a.finSize;
          sagittal(a.dorsal==='mane'?'red-dorsal-mane':'continuous-ribbon-fin',[[r.x,r.y+r.h],[r.x,r.y+r.h+rise],[n.x,n.y+n.h+rise*.93],[n.x,n.y+n.h]],fin,'body');
        }break;
      }
    }
    if(has('adipose'))dorsal(-.27,-.40,.19);
    const anal=has('long-anal')||isLong||a.family==='cod';
    if(a.family==='mola'){
      const x=.07*L,xx=-.30*L;
      sagittal('tall-anal-fin',[[x,floor(x)],[x-L*.1,floor(x)-H*.46*a.finSize],[xx-.06*L,floor(xx)-H*.06],[xx,floor(xx)]],fin);
    }else if(anal){
      const x=L*.08,xx=-L*.48;
      sagittal('continuous-anal-fin',[[x,floor(x)],[x-L*.08,floor(x)-H*.16],[xx,floor(xx)-H*.13],[xx,floor(xx)]],fin);
    }else if(has('straight-anal')){
      sagittal('straight-anal-fin',[[L*.02,floor(L*.02)],[-L*.04,-H*.70],[-L*.38,-H*.70],[-L*.43,floor(-L*.43)]],fin);
    }else if(!['shark','whale'].includes(a.family)){
      const x=-L*.08,xx=-L*.35,h=H*.3*a.finSize*(a.family==='opah'?1.05:1);
      sagittal('anal-fin',[[x,floor(x)],[x-.08*L,floor(x)-h],[xx-.035*L,floor(xx)-h*.36],[xx,floor(xx)]],fin);
    }
  }

  if(has('finlets'))for(const side of [-1,1])for(let i=0;i<6;i++){const x=L*(-.20-i*.045),y=side>0?roof(x):floor(x);sagittal('finlets',[[x,y],[x-L*.025,y+side*H*.1], [x-L*.045,y]],fin,'body',false);}

  function pairedFins(){
    const wide=['shark','sturgeon','paddlefish','whale','leviathan'].includes(a.family),lobed=has('lobed-fins');
    for(const side of [-1,1]){
      const name=side<0?'fin-left':'fin-right',x=L*.2,z=side*sample(x).w;
      parts[name]={pivot:[x,-H*.08,z],motion:'fin',side};
      const span=(wide?.36:lobed?.27:.20)*L*a.finSize*(has('flippers')?1.12:1),sweep=wide?.31:.23;
      parts[name].span=span;
      const p=[[x,H*-.04,z],[x-L*.14,-H*.2,z+side*span*.72],[x-L*sweep,-H*.2,z+side*span],[x-L*.29,-H*.08,z+side*span*.38],[x-L*.09,-H*.11,z*.9]];
      plate(p,[0,H*.045,0],fin,'pectoral-fins',name);
      for(let i=1;i<=3;i++)line([[x,-H*.015,z],[p[i][0],p[i][1]+H*.028,p[i][2]]],.003,light,'pectoral-rays',name);
      if(has('pectoral-spines'))tube([[x,-H*.01,z],[x-L*.19,-H*.17,z+side*span*.8],[x-L*.28,-H*.22,z+side*span*1.13]],[H*.033,H*.023,.002],blend(fin,belly,.3),'pectoral-spines',name);
      if(has('feet-fins')){
        const wrist=[x-L*.18,-H*.61,z+side*W*.22];
        tube([[x,-H*.13,z],wrist],[H*.07,H*.05],flank,'walking-fin-arm',name);
        for(let toe=0;toe<3;toe++)tube([wrist,add(wrist,[L*(.06-toe*.06),-H*.10,side*W*.23])],[H*.026,.006],fin,'walking-fin-toes',name);
      }
      if(lobed)tube([[x,-H*.04,z],[x-L*.18,-H*.11,z+side*span*.5]],[H*.075,H*.05],flank,'fleshy-fin-lobes',name);
      if(!['shark','whale'].includes(a.family)&&!isLong){
        const v=-L*.16,vz=side*W*.27,reach=lobed?.4:.24;
        plate([[v,-H*.32,vz],[v-L*.12,-H*(.5+reach),vz+side*W*.42],[v-L*.27,-H*.48,vz+side*W*.24],[v-L*.13,-H*.35,vz]],[0,0,side*W*.035],fin,'pelvic-fins');
      }
    }
  }
  if(!isRay&&!isCeph&&a.family!=='mola')pairedFins();
  if(a.family==='mola')for(const side of [-1,1]){
    const r=surface(.31*L,-.1,side);plate([r,add(r,[-L*.1,-H*.12,side*W*.4]),add(r,[-L*.22,-H*.06,side*W*.13])],[0,H*.025,0],fin,'tiny-pectoral');
  }

  // Actual caudal anatomy: not one tail box for every animal.
  if(!['ribbon','whip','arms'].includes(a.tail)){
    const x=-L*.5,y=sample(x).y,s=a.tailSize,tx=v=>x+v*L*s,ty=v=>y+v*H*s;
    let tail;
    switch(a.tail){
      case 'round':tail=[[0,.11],[-.16,.36],[-.29,.3],[-.35,.1],[-.35,-.1],[-.29,-.3],[-.16,-.36],[0,-.11]];break;
      case 'truncate':tail=[[0,.12],[-.31,.34],[-.33,.17],[-.33,-.17],[-.31,-.34],[0,-.12]];break;
      case 'notched':tail=[[0,.1],[-.34,.39],[-.32,.15],[-.26,0],[-.32,-.15],[-.34,-.39],[0,-.1]];break;
      case 'lunate':tail=[[0,.08],[-.26,.70],[-.39,.85],[-.24,.35],[-.12,0],[-.24,-.35],[-.39,-.85],[-.26,-.70],[0,-.08]];break;
      case 'heterocercal':tail=[[0,.12],[-.41,.79],[-.54,.94],[-.42,.55],[-.23,.14],[-.15,-.03],[-.34,-.49],[-.2,-.4],[0,-.12]];break;
      case 'trilobe':tail=[[0,.1],[-.22,.37],[-.34,.33],[-.27,.1],[-.49,.055],[-.52,0],[-.49,-.055],[-.27,-.1],[-.34,-.33],[-.22,-.37],[0,-.1]];break;
      case 'flowing':tail=[[0,.13],[-.23,.42],[-.48,.58],[-.45,.29],[-.29,.17],[-.23,0],[-.29,-.17],[-.45,-.29],[-.48,-.58],[-.23,-.42],[0,-.13]];break;
      case 'clavus':tail=[[.02,.38],[-.08,.4],[-.15,.27],[-.12,.13],[-.17,0],[-.12,-.13],[-.15,-.27],[-.08,-.40],[.02,-.38]];break;
      case 'fan':tail=[[0,.1],[-.31,.52],[-.4,.31],[-.43,0],[-.4,-.31],[-.31,-.52],[0,-.1]];break;
      default:tail=[[0,.11],[-.37,.48],[-.33,.24],[-.17,0],[-.33,-.24],[-.37,-.48],[0,-.11]];
    }
    if(a.tail==='flukes'){
      const p=[[0,.08],[-.12,.54],[-.32,.95],[-.29,.44],[-.21,0],[-.29,-.44],[-.32,-.95],[-.12,-.54],[0,-.08]].map(([xx,z])=>[tx(xx),y,z*W*s]);
      plate(p,[0,H*.06,0],fin,'horizontal-flukes','tail');parts.tail.motion='flukes';
    }else sagittal('tail-'+a.tail,tail.map(([xx,yy])=>[tx(xx),ty(yy)]),fin,'tail');
    if(has('white-tail-tip'))sagittal('white-tail-tip',[[tx(-.37),ty(-.48)],[tx(-.33),ty(-.24)],[tx(-.26),ty(-.23)]],belly,'tail',false);
    if(has('black-tail-edge'))for(const side of [-1,1])line([[tx(-.37),ty(.48),side*W*.025],[tx(-.33),ty(.24),side*W*.025],[tx(-.17),ty(0),side*W*.025],[tx(-.33),ty(-.24),side*W*.025],[tx(-.37),ty(-.48),side*W*.025]],H*.012,ink,'black-tail-edge','tail');
  }
  if(a.tail==='whip'){
    const points=Array.from({length:10},(_,i)=>[-L*.46-i*L*.15*a.tailSize,-H*.08+Math.sin(i*.5)*H*.23,Math.sin(i*.44)*W*.035]);
    tube(points,points.map((_,i)=>W*.034*(1-i/10)),fin,'whip-tail','tail');
    if(a.family==='ray')plate([points[3],add(points[3],[-L*.16,H*.3,0]),points[4]],[0,0,W*.01],tint(fin,.7),'tail-barb','tail');
  }

  if(isRay){
    for(const side of [-1,1]){
      const part=side<0?'fin-left':'fin-right';parts[part]={pivot:[0,0,side*W*.12],motion:'wing',side};
      const edge=(a.family==='manta'
        ?[[.41,.12],[.38,.27],[.08,.51],[-.12,.44],[-.31,.22],[-.48,.08]]
        :[[.45,.09],[.39,.29],[.19,.44],[-.08,.49],[-.32,.39],[-.48,.14]])
        .map(([x,z])=>[x*L,-Math.abs(z)*H*.2,side*z*W]);
      const center=[.01*L,H*.31,side*W*.10],under=[.01*L,-H*.38,side*W*.10];
      for(let i=0;i<edge.length-1;i++){
        face([center,edge[i],edge[i+1]],i<2?blend(flank,belly,.08):blend(back,flank,.72),'ray-disc',part,[0,1,0]);
        face([under,edge[i+1],edge[i]],belly,'ray-underside',part,[0,-1,0]);
      }
      if(a.family==='manta'){
        tube([[L*.43,H*.11,side*W*.10],[L*.62,H*.18,side*W*.13],[L*.76,H*.17,side*W*.1],[L*.73,-H*.02,side*W*.07]],[W*.042,W*.041,W*.031,W*.017],flank,'cephalic-lobes');
        line([[L*.48,-H*.12,-W*.09],[L*.48,-H*.18,W*.09]],H*.05,ink,'ventral-mouth');
      }
      const eye=[L*.31,H*.52,side*W*.11];ellipsoid(eye,[L*.045,H*.22,W*.021],back,'raised-eye-sockets');
      ellipsoid(add(eye,[L*.01,H*.12,0]),[L*.024,H*.08,W*.017],ink,'eyes');
      ellipsoid([L*.21,H*.49,side*W*.12],[L*.035,H*.05,W*.018],ink,'spiracles');
      for(let i=0;i<5;i++)line([[L*(.19-i*.045),-H*.43,side*W*.08],[L*(.16-i*.045),-H*.42,side*W*.14]],.004,tint(belly,.67),'ventral-gill-slits');
    }
  }

  if(isCeph){
    if(a.family==='squid')for(const side of [-1,1])plate([[-L*.7,0,0],[-L*.31,H*.04,side*W*.85],[-L*.02,0,side*W*.36],[-L*.34,-H*.04,side*W*.2]],[0,H*.055,0],fin,'mantle-fins');
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4+Math.PI/8,sy=Math.sin(angle),sz=Math.cos(angle),reach=a.family==='squid'?.95:1.07;
      const points=Array.from({length:9},(_,j)=>{
        const t=j/8,spread=(.10+Math.sin(t*Math.PI*.75)*.43)*L;
        return [L*(.39+t*reach*a.tailSize-(t>.65?(t-.65)*.8:0)),sy*spread-H*.12,sz*spread*(1+t*.17)];
      });
      if(a.family==='octopus'){
        points[7][0]-=.06*L;points[8][0]-=.16*L;
        points[8][1]+=.13*L*sz;points[8][2]-=.13*L*sy;
      }
      tube(points,points.map((_,j)=>W*(.078-.072*j/8)),flank,'arm-'+(i+1),'tail');
      if(has('suckers'))for(let j=2;j<7;j++){
        const point=add(points[j],[0,-W*.061*(1-j/10),0]);
        ellipsoid(point,[W*.037,W*.018,W*.032],belly,'suckers','tail');
      }
    }
    if(has('two-tentacles'))for(const side of [-1,1]){
      const points=Array.from({length:10},(_,j)=>[L*(.42+j*.15*a.tailSize),-H*.16-Math.sin(j*.33)*H*.22,side*(W*.22+Math.sin(j*.3)*W*.28)]);
      tube(points,points.map((_,i)=>W*(i>6?.045:.028)),fin,'long-feeding-tentacle','tail');
      ellipsoid(add(points.at(-1),[L*.06,0,0]),[L*.14,W*.065,W*.055],flank,'tentacle-club','tail');
      for(let j=7;j<10;j++)ellipsoid(add(points[j],[0,-W*.055,0]),[W*.045,W*.018,W*.033],belly,'club-suckers','tail');
    }
    ellipsoid([L*.4,-H*.25,0],[L*.075,H*.1,W*.12],ink,'beak');
  }

  // Species-specific heads and facial anatomy, independent of colour/pattern.
  if(a.snout>0){
    const start=L*.43,end=L*(.53+a.snout),h=H*(a.family==='gar'?.10:a.family==='pike'?.09:.065),w=W*(a.family==='gar'?.28:a.family==='pike'?.37:.17);
    if(has('paddle')){
      plate([[start,-H*.02,-W*.23],[end-L*.12,-H*.08,-W*.47],[end,-H*.08,-W*.25],[end,-H*.08,W*.25],[end-L*.12,-H*.08,W*.47],[start,-H*.02,W*.23]],[0,H*.1,0],flank,'paddle-rostrum');
      line([[start,H*.035,0],[end-L*.06,-H*.02,0]],.007,back,'rostrum-ridge');
    }else if(a.family==='marlin'||has('bill')){
      tube([[start,0,0],[L*.66,H*.025,0],[end,H*.014,0]],[W*.13,W*.055,.002],back,'spear-bill');
    }else{
      tube([[start,-H*.06,0],[end-L*.06,-H*(a.family==='sturgeon'?.19:.08),0],[end,-H*.10,0]],[Math.max(h,w),Math.max(h,w)*.58,.008],flank,'extended-snout', 'body',8);
      // A broad, flattened duckbill/gar jaw, not a round spear.
      if(['pike','gar'].includes(a.family)){
        plate([[start,-H*.04,-w],[end,-H*.04,-w*.6],[end,-H*.04,w*.6],[start,-H*.04,w]],[0,h*1.3,0],flank,'flattened-jaw');
        for(const side of [-1,1])line([[start,-H*.07,side*w],[end,-H*.07,side*w*.62]],H*.014,ink,'jaw-seam');
      }
    }
  }
  if(!isRay){
    for(const side of [-1,1]){
      const ex=(isCeph?.28:a.eye[0])*L,ey=isCeph?.02:a.eye[1]*2,er=H*(isCeph?.16:.071)*a.eyeSize;
      const pos=surface(ex,ey,side,.007),iris=a.eyeColor||(isCeph?0xd4aa66:0xd6bd77);
      ellipsoid(pos,[er*1.2,er*1.1,er*.31],tint(back,.68),'raised-eye-socket');
      pos[2]+=side*er*.28;
      const circle=(r,c,z,feature)=>face(Array.from({length:8},(_,i)=>[pos[0]+Math.cos(i*Math.PI/4)*r,pos[1]+Math.sin(i*Math.PI/4)*r,pos[2]+side*z]),c,feature,'body',[0,0,side]);
      circle(er*1.25,tint(back,.65),.002,'eye-socket');circle(er,iris,.004,'iris');circle(er*.62,0x10262b,.006,'eyes');
      face([[ex-er*.25,pos[1]+er*.41,pos[2]+side*.009],[ex+er*.1,pos[1]+er*.41,pos[2]+side*.009],[ex+er*.1,pos[1]+er*.12,pos[2]+side*.009],[ex-er*.25,pos[1]+er*.12,pos[2]+side*.009]],0xf8f3da,'eye-catchlight','body',[0,0,side]);
      if(!isCeph){
        if(has('gill-slits'))for(let i=0;i<(a.gillCount||5);i++)stripe([[.29-i*.025,.45],[.26-i*.025,-.46]],.012,tint(back,.65),a.gillCount===6?'six-gill-slits':'five-gill-slits',side);
        else if(a.family!=='whale')stripe([[.23,.72],[.16,.35],[.17,-.17],[.26,-.57]],.014,blend(back,flank,.2),'operculum',side);
        const mx=a.mouth==='large'?.31:a.mouth==='wide'?.28:.41;
        if(a.mouth!=='cavern'){
          stripe([[mx,-.22],[.48,-.25],[.52,-.09]],a.mouth==='fang'?.11:.031,ink,'mouth-seam',side);
          if(has('black-gums'))stripe([[.35,-.24],[.49,-.23]],.06,ink,'black-gums',side);
          if(a.mouth==='large'||has('extended-jaw'))stripe([[.29,-.34],[.43,-.46],[.51,-.19]],.05,blend(flank,belly,.5),'heavy-lower-jaw',side);
          if(a.mouth==='lips'||has('thick-lips'))ellipsoid([L*.52,-H*.12,side*W*.08],[L*.043,H*.075,W*.07],blend(flank,belly,.48),'fleshy-lips');
        }
        if(has('ear-flap')){
          const x=.2,y=.31,r=.045*(a.earLength||1);
          spot(x,y,r,.16,0x243b39,'opercular-flap',side);
          spot(x-r*.44,y,r*.36,.125,a.ear||back,'ear-tip',side);
          if(a.cheek)stripe([[.43,.15],[.36,-.1],[.25,-.15]],.04,a.cheek,'blue-cheek',side);
        }
        if(has('cheek-maze')||has('cheek-rays'))for(let j=0;j<3;j++)stripe([[.44,.4-j*.25],[.35,.27-j*.25],[.30,.34-j*.25],[.24,.16-j*.25]],.022,a.cheek||mark,'cheek-lines',side);
        if(has('hook-jaw'))tube([[L*.35,-H*.27,side*W*.17],[L*.55,-H*.22,side*W*.09],[L*.57,-H*.02,side*W*.04]],[H*.055,H*.05,H*.018],flank,'hooked-salmon-jaw');
      }
    }
  }
  if(a.mouth==='cavern'){
    const x=L*.51,cy=-H*.08,ry=H*.39,rz=W*.44;
    const rim=OCT.map(([y,z])=>[x,cy+y*ry,z*rz]),outer=OCT.map(([y,z])=>[x-L*.055,cy+y*ry*1.18,z*rz*1.15]);
    face(rim,0x0e2029,'mouth-cavity','body',[1,0,0]);
    for(let i=0;i<8;i++)face([outer[i],rim[i],rim[(i+1)%8],outer[(i+1)%8]],i<3||i>5?back:blend(belly,flank,.35),'mouth-rim');
    for(const side of [-1,1])patch([[.27,-.18],[.51,.52],[.51,-.88],[.3,-.47]],0x172b32,'gaping-jaw',side);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6,up=Math.cos(angle),side=Math.sin(angle);
      const base=[x+.008,cy+up*ry*.94,side*rz*.94],tip=[x+L*.018,cy+up*ry*.63,side*rz*.67];
      plate([add(base,[0,-side*H*.025,up*W*.025]),add(base,[0,side*H*.025,-up*W*.025]),tip],[L*.018,0,0],belly,'cavern-teeth');
    }
  }
  if(has('teeth')||has('fangs')||has('tusks')){
    const count=has('tusks')?3:has('fangs')?6:8;
    const lo=['gar','pike'].includes(a.family)?.47:.33,hi=['gar','pike'].includes(a.family)?.50+a.snout:.51;
    for(const side of [-1,1])for(let i=0;i<count;i++){
      const x=mix(lo,hi,(i+.3)/count)*L,y=-H*.13,z=side*(x>L*.5?W*.23:sample(x).w*.95);
      const len=H*(has('tusks')?.28:has('fangs')?.15:.067)*(i%2?.8:1);
      plate([[x-L*.012,y,z],[x+L*.012,y,z],[x+L*.005,y-len,z]],[0,0,W*.02],belly,'teeth');
    }
  }

  function barbels(count,length,chin=false){
    for(const side of [-1,1])for(let i=0;i<count;i++){
      const nasal=count===4&&i===1&&!chin,lower=chin||i>=2;
      const x=L*(lower?.45:.5),y=H*(nasal?.08:lower?-.24:-.06),z=side*W*(lower?.08+(i%2)*.1:nasal?.16:.3),len=L*length*(1-i*.15);
      const drop=nasal?-.14:lower?.43:.13;
      tube([[x,y,z],[x+len*.32,y-H*drop*.32,side*(Math.abs(z)+len*.22)],[x+len*(nasal?.43:.05),y-H*drop,side*(Math.abs(z)+len*.57)],[x+len*(nasal?.31:-.3),y-H*(drop+.1),side*(Math.abs(z)+len*.73)]],[H*.014,H*.011,H*.006,.0015],blend(flank,belly,.25),chin?'chin-barbels':'barbels');
    }
  }
  if(has('barbels-long'))barbels(4,.42);
  if(has('barbels-short'))barbels(2,.14);
  if(has('barbels-chin'))barbels(2,.16,true);
  if(has('chin-barbel'))tube([[L*.45,-H*.23,0],[L*.47,-H*.50,0],[L*.38,-H*.75,0]],[H*.018,H*.014,.002],belly,'single-chin-barbel');
  if(has('chin-tendrils')||has('root-beard'))barbels(3,has('root-beard')?.36:.23,true);
  if(has('feelers'))for(const side of [-1,1])tube([[L*.12,-H*.34,side*W*.23],[-L*.03,-H*.67,side*W*.4],[-L*.4,-H*.78,side*W*.48],[-L*.63,-H*.71,side*W*.45]],[H*.015,H*.012,H*.007,.0015],light,'pelvic-feelers');

  // Raised armour/scutes are geometry, not merely dark surface spots.
  if(has('scutes')||has('armor')||has('ganoid-scales')||has('plate-scales')||has('head-plates')){
    for(const side of [-1,1])for(let row=0;row<(has('armor')?3:2);row++)for(let i=0;i<7;i++){
      const x=(-.36+i*.09+(row%2)*.035)*L,y=-.33+row*.58,r=L*(has('armor')?.055:.035),s=surface(x,y,side,.006);
      const points=[surface(x-r,y,side,.004),surface(x,y+.19,side,.004),surface(x+r,y,side,.004),surface(x,y-.17,side,.004)],peak=add(s,[0,0,side*W*(has('armor')?.06:.027)]);
      for(let k=0;k<4;k++)face([points[k],points[(k+1)%4],peak],blend(flank,belly,k<2?.29:.08),has('scutes')?'lateral-scutes':'raised-plates','body',[0,0,side]);
    }
  }
  if(has('scutes')||has('tall-scutes')||has('spines'))for(let i=0;i<9;i++){
    const x=L*(-.41+i*.081),y=roof(x),h=H*(has('tall-scutes')?.25:has('spines')?.30:.13);
    plate([[x-L*.04,y],[x+L*.01,y+h],[x+L*.055,y]].map(([x,y])=>[x,y,0]),[0,0,W*.13],blend(flank,belly,.5),'dorsal-scutes');
  }
  if(has('lateral-scutes'))for(const side of [-1,1])for(let i=0;i<7;i++){
    const x=L*(-.4+i*.04),pos=surface(x,-.05,side,.005);
    plate([add(pos,[-L*.019,0,0]),add(pos,[0,H*.065,side*W*.02]),add(pos,[L*.02,0,0]),add(pos,[0,-H*.04,side*W*.02])],[0,0,side*W*.015],belly,'caudal-lateral-scutes');
  }
  if(has('keel'))for(const side of [-1,1])plate([[-L*.46,0,side*W*.1],[-L*.33,0,side*W*.31],[-L*.25,0,side*W*.15]],[0,H*.035,0],fin,'caudal-keels');
  if(has('belly-keel'))sagittal('ventral-keel',[[L*.18,floor(L*.18)],[-L*.04,-H*.58],[-L*.34,floor(-L*.34)]],belly,'body',false);
  if(has('dorsal-spots'))for(const side of [-1,1])for(let i=0;i<7;i++){
    const x=L*(.18-(i%4)*.05),y=roof(x)+H*(i<4?.14:.3),z=side*W*.024;
    face([[x-L*.009,y-H*.02,z],[x+L*.009,y-H*.02,z],[x+L*.009,y+H*.02,z],[x-L*.009,y+H*.02,z]],mark,'dorsal-spots','body',[0,0,side]);
  }
  if(has('clock-rings'))for(const side of [-1,1]){
    const points=Array.from({length:17},(_,i)=>surface(L*(.02+.23*Math.cos(i*Math.PI/8)),.47*Math.sin(i*Math.PI/8),side,.009));
    line(points,.004,blend(mark,belly,.3),'raised-concentric-ring');
  }
  if(has('ribs'))for(const side of [-1,1])for(let i=0;i<11;i++){
    const x=-.4+i*.065;stripe([[x,.74],[x-.016,.22],[x,-.43],[x+.02,-.7]],.024,blend(belly,flank,.2),'skeletal-ribs',side);
  }
  if(has('forehead')||has('brow-plates'))ellipsoid([L*.25,H*.37,0],[L*.16,H*.24,W*.38],has('brow-plates')?blend(back,belly,.24):flank,'forehead-hump');
  if(has('back-ridges'))for(const side of [-1,0,1])line([[-L*.35,roof(-L*.35),side*W*.16],[0,roof(0)+H*.03,side*W*.18],[L*.27,roof(L*.27),side*W*.16]],H*.035,blend(back,flank,.42),'longitudinal-ridges');
  if(has('tail-eye'))for(const side of [-1,1]){
    spot(-.37,.1,.045,.23,0xd5ad55,'tail-eyespot-ring',side);spot(-.37,.1,.028,.14,0x193e39,'tail-eyespot',side);
  }
  if(has('dorsal-spot'))ellipsoid([0,roof(0)+H*.17,0],[L*.035,H*.05,W*.027],back,'dorsal-spot');
  if(has('white-fin-edge')||has('fin-rim'))for(const side of [-1,1]){
    const part=side<0?'fin-left':'fin-right';if(!Number.isFinite(parts[part]?.span))continue;
    const z=side*sample(L*.2).w;
    line([[L*.2,-H*.015,z],[L*.06,-H*.18,z+side*parts[part].span*.72]],.008,belly,'pale-fin-leading-edge',part);
  }
  if(has('throat-pleats'))for(const side of [-1,1])for(let i=0;i<5;i++)stripe([[.51,-.33-i*.1],[.22,-.35-i*.1],[-.02,-.45-i*.07]],.013,blend(back,belly,.43),'ventral-throat-grooves',side);
  if(has('blowhole'))ellipsoid([L*.30,roof(L*.3)+.005,0],[L*.035,H*.012,W*.048],ink,'blowhole');
  if(has('crest-streamers'))for(let i=0;i<3;i++)tube([[L*(.39-i*.045),roof(L*.39),0],[L*(.4-i*.04),H*(1.1+i*.18),0],[L*(.25-i*.06),H*(1.28+i*.2),0]],[H*.035,H*.028,.002],fin,'red-crest-streamers');
  if(has('pelvic-oars'))for(const side of [-1,1])tube([[L*.35,-H*.27,side*W*.4],[L*.22,-H*.9,side*W*.8],[L*.05,-H*1.3,side*W*.9]],[H*.022,H*.013,H*.035],fin,'pelvic-oars');
  if(has('fin-streamers')||has('flowing-fins'))for(const side of [-1,1])tube([[-L*.2,-H*.36,side*W*.27],[-L*.4,-H*.65,side*W*.57],[-L*.7,-H*.56,side*W*.68],[-L*.78,-H*.41,side*W*.7]],[H*.022,H*.018,H*.009,.002],light,'trailing-filaments');

  if(has('lure')||has('twin-lures'))for(const side of has('twin-lures')?[-1,1]:[0]){
    const points=[[L*.22,roof(L*.22),side*W*.2],[L*.23,H*.94,side*W*.29],[L*.55,H*1.13,side*W*.28],[L*.72,H*.91,side*W*.25]];
    tube(points,[H*.03,H*.025,H*.018,H*.014],fin,'angler-lure-stalk');
    ellipsoid(points.at(-1),[H*.085,H*.1,H*.08],mark,'luminous-lure','body',true);
  }
  if(has('crown'))for(let i=0;i<5;i++){
    const x=L*(.12+i*.065),y=roof(x),h=H*(.27+(i%2)*.14);
    plate([[x-L*.034,y,0],[x-L*.014,y+h,0],[x+L*.015,y+h*.95,0],[x+L*.04,y,0]],[0,0,W*.19],blend(mark,belly,.27),'crown-prongs');
  }
  if(has('horns')||has('crescent-horns')||has('antlers')||has('root-antlers'))for(const side of [-1,1]){
    const start=[L*.27,roof(L*.27)*.9,side*W*.22],middle=[L*.16,H*.89,side*W*.43],end=[L*.42,H*(has('crescent-horns')?1.14:1.07),side*W*.47];
    tube([start,middle,end],[H*.075,H*.045,.002],blend(flank,belly,.63),'head-horns');
    if(has('antlers')||has('root-antlers'))for(let i=0;i<3;i++){
      const at=add(mul(start,1-(i+1)/4),mul(middle,(i+1)/4));
      tube([at,add(at,[-L*.13,H*.18,side*W*.06]),add(at,[-L*.2,H*.35,side*W*.14])],[H*.033,H*.023,.002],blend(flank,belly,.5),'antler-branches');
    }
  }
  if(has('cheek-frills'))for(const side of [-1,1])for(let i=0;i<4;i++){
    const x=L*(.22-i*.035),y=H*(.17-i*.1),z=side*W*.44;
    plate([[x,y,z],[x-L*.21,y+H*(.66-i*.20),z+side*W*.51],[x-L*.32,y+H*(.44-i*.20),z+side*W*.34],[x-L*.13,y-H*.12,z]],[0,0,W*.024],i%2?fin:blend(fin,mark,.22),'gill-fans');
  }
  if(has('star-fins'))for(const sign of [-1,1])for(let i=0;i<5;i++){
    const x=L*(.25-i*.14),y=sign*(sign>0?roof(x):-floor(x));
    sagittal('starburst-fins',[[x,y],[x-L*.08, y+sign*H*(.25+.23*Math.sin((i+1)*Math.PI/6))],[x-L*.13,y]],blend(fin,mark,.27),'body',false);
  }
  if(has('photophores'))for(const side of [-1,1])for(let i=0;i<9;i++)spot(-.38+i*.08,-.57,.011,.038,mark,'bioluminescent-organs',side,true);

  return finish();
}

// An illustrated orthographic view of the actual sculpt, not a separate generic
// pixel template. No canvas/WebGL contexts or image downloads per index entry.
export function fishSVG(species){
  const id=species.id,key=id+'|'+species.name;
  if(icons.has(key))return cached(icons,key);
  const model=buildFishVisual(species),tilt=model.iconTilt,yaw=.13,c=Math.cos(tilt),s=Math.sin(tilt),cy=Math.cos(yaw),sy=Math.sin(yaw);
  const transform=p=>{
    const x=p[0]*cy-p[2]*sy,z=p[0]*sy+p[2]*cy;
    return [-x,-p[1]*c+z*s,p[1]*s+z*c];
  };
  const projected=[];
  for(const f of model.faces){
    const p=f.p.map(transform),normal=unit(cross(sub(p[1],p[0]),sub(p[2],p[0])));
    if(normal[2]<-.03)continue; // Head-left + screen-y inversion preserve the winding.
    const area=Math.abs(p.reduce((v,q,i)=>v+q[0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*q[1],0));
    if(area<.000008)continue;
    const light=f.glow?1.13:clamp(.87-normal[1]*.15-normal[0]*.09+Math.abs(normal[2])*.13,.65,1.13);
    projected.push({p,c:tint(f.c,light),depth:p.reduce((sum,v)=>sum+v[2],0)/p.length+(f.decal?.035:0)});
  }
  const coords=projected.flatMap(f=>f.p),minX=Math.min(...coords.map(v=>v[0])),maxX=Math.max(...coords.map(v=>v[0])),minY=Math.min(...coords.map(v=>v[1])),maxY=Math.max(...coords.map(v=>v[1]));
  const scale=Math.min(144/(maxX-minX),82/(maxY-minY)),midX=(minX+maxX)/2,midY=(minY+maxY)/2;
  const path=p=>'M'+p.map(v=>`${(80+(v[0]-midX)*scale).toFixed(2)},${(50+(v[1]-midY)*scale).toFixed(2)}`).join('L')+'Z';
  projected.sort((a,b)=>a.depth-b.depth);
  let body='',last=null,segments=[];
  const flush=()=>{if(segments.length)body+=`<path d="${segments.join('')}" fill="${colour(last)}" stroke="${colour(last)}" stroke-width=".22" stroke-linejoin="round"/>`;segments=[];};
  for(const f of projected){if(f.c!==last){flush();last=f.c;}segments.push(path(f.p));}flush();
  const svg=`<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escape(species.name)}" data-fish-id="${escape(id)}" data-anatomy="${model.family}">${body}</svg>`;
  return remember(icons,key,svg,64);
}
