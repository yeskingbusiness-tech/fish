// Presentation-only helpers. Never change simulation dt, input frequency,
// fishing probabilities or save data when reducing graphics work.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const capFor=dpr=>Number.isFinite(dpr)&&dpr>0?Math.min(1.5,dpr):1;
const levelsFor=cap=>[...new Set([.6,.75,.9,1,1.15,1.3,1.5].filter(n=>n<cap).concat(cap))];

export function createAdaptiveQuality(dpr=1){
  let cap=capFor(dpr),levels=levelsFor(cap),ratio=cap;
  let frames=0,seconds=0,slow=0,fast=0,cooldown=0,warmup=.75,changes=0,longFrames=0;
  function resetSampling(){frames=0;seconds=0;slow=0;fast=0;warmup=.75;longFrames=0;}
  function resize(dpr){
    cap=capFor(dpr);levels=levelsFor(cap);
    // Orientation changes must not undo an already-needed quality reduction.
    ratio=Math.min(ratio,cap);resetSampling();return ratio;
  }
  function sample(dt,{active=true}={}){
    // A hidden tab, open menu, breakpoint or one-off long task is not evidence
    // of sustained GPU pressure. Resume with a clean window, not a giant dt.
    if(!active||!Number.isFinite(dt)||dt<=0||dt>1){resetSampling();return null;}
    if(dt>.25){
      const consecutive=longFrames+1;
      if(consecutive===1)resetSampling();
      longFrames=consecutive;
      if(longFrames<3)return null;
      // Consecutive very slow frames are real pressure, not isolated hitches.
      // Bound only the quality sampler's delta; never the game's clock.
      dt=.25;
    }else longFrames=0;
    cooldown=Math.max(0,cooldown-dt);
    if(warmup>0){warmup-=dt;return null;}
    frames++;seconds+=dt;
    if(seconds<1||frames<12)return null;
    const average=seconds/frames;frames=0;seconds=0;
    slow=average>1/50?slow+1:0;
    fast=average<1/57?fast+1:0;
    if(cooldown>0)return null;
    let next=ratio;
    if(slow>=2||average>1/32){
      next=levels.filter(n=>n<ratio-1e-6).at(-1)??ratio;
    }else if(fast>=10){
      next=levels.find(n=>n>ratio+1e-6)??ratio;
    }
    if(next===ratio)return null;
    ratio=clamp(next,Math.min(.6,cap),cap);changes++;slow=0;fast=0;
    // Deliberately asymmetric: relieve sustained pressure promptly, recover
    // detail only after ten good windows. No frame-to-frame resolution pumping.
    cooldown=3;warmup=.5;return ratio;
  }
  return {sample,resize,resetSampling,get pixelRatio(){return ratio;},get stats(){return {pixelRatio:ratio,maxPixelRatio:cap,changes};}};
}

// Small one-entry cache for derived UI state. Argument changes invalidate it
// immediately, even for direct debug/restore/teleport changes, not just events.
export function memoLast(resolve){
  let previous=null,value;
  return (...args)=>{
    if(!previous||args.length!==previous.length||args.some((arg,i)=>!Object.is(arg,previous[i]))){
      value=resolve(...args);previous=args;
    }
    return value;
  };
}

// Eligibility itself still comes from the single gameplay rule. Only cache its
// immutable result for labels/hints; the weighted picker and RNG stay untouched.
export function createBaitPoolLookup(resolve){
  const islands=new Map();let count=0;
  function lookup(island,bait){
    if(!islands.has(island))islands.set(island,new Map());
    const pools=islands.get(island);
    if(!pools.has(bait)){pools.set(bait,Object.freeze(resolve(island,bait).slice()));count++;}
    return pools.get(bait);
  }
  Object.defineProperty(lookup,'size',{get:()=>count});
  return lookup;
}
