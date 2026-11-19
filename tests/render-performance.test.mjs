import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdaptiveQuality,memoLast,createBaitPoolLookup} from '../render-performance.mjs';
import {SPECIES,BAITS,eligibleSpecies} from '../game-data.mjs';

const run=(quality,seconds,fps,options)=>{
  const changes=[];
  for(let n=0;n<Math.ceil(seconds*fps);n++){const ratio=quality.sample(1/fps,options);if(ratio!==null)changes.push({frame:n,ratio});}
  return changes;
};

test('adaptive resolution keeps monitoring well beyond the first 140 frames',()=>{
  const q=createAdaptiveQuality(2);
  assert.equal(q.pixelRatio,1.5);assert.deepEqual(run(q,30,60),[]);
  const down=run(q,16,35);
  assert.ok(down.length>=4);assert.ok(q.pixelRatio<1);
  assert.ok(down.every((c,i)=>i===0||c.ratio<down[i-1].ratio));
  assert.ok(down.every((c,i)=>i===0||c.frame-down[i-1].frame>=35*3));
});

test('sustained good frames recover detail slowly, with hysteresis instead of pumping',()=>{
  const q=createAdaptiveQuality(2);
  run(q,30,20);assert.equal(q.pixelRatio,.6);
  assert.deepEqual(run(q,8,60),[],'brief recovery does not immediately raise quality');
  const up=run(q,100,60);assert.equal(q.pixelRatio,1.5);
  assert.ok(up.length>=5);assert.ok(up.every((c,i)=>i===0||c.ratio>up[i-1].ratio));
  assert.ok(up.every((c,i)=>i===0||c.frame-up[i-1].frame>9*60));
  assert.deepEqual(run(q,30,54),[],'near-target fluctuations do not change resolution');
});

test('isolated slow frames, long tasks, hidden tabs and menus do not drive graphics downward',()=>{
  const q=createAdaptiveQuality(1.5);
  for(let n=0;n<20;n++){
    run(q,2,60);q.sample(.15);run(q,2,60);
    q.sample(5);q.sample(NaN);q.sample(Infinity);q.sample(-1);q.sample(0);
  }
  assert.equal(q.pixelRatio,1.5);
  assert.deepEqual(run(q,120,10,{active:false}),[]);
  assert.equal(q.pixelRatio,1.5);assert.deepEqual(run(q,.5,20),[],'resume has a fresh warmup');
  run(q,4,20);assert.ok(q.pixelRatio<1.5,'sustained pressure after resuming is still detected');
});

test('consecutive extremely slow frames still adapt instead of being ignored forever',()=>{
  const q=createAdaptiveQuality(2);
  q.sample(.4);run(q,4,60);assert.equal(q.pixelRatio,1.5,'isolated hitch ignored');
  run(q,20,3);assert.ok(q.pixelRatio<=1,'sustained sub-four-FPS rendering still reduces resolution');
});

test('resizing preserves reduced quality and respects changed device pixel ratio',()=>{
  const q=createAdaptiveQuality(3);run(q,8,30);const reduced=q.pixelRatio;
  assert.ok(reduced<1.5);assert.equal(q.resize(3),reduced);assert.equal(q.resize(2),reduced);
  assert.equal(q.resize(.5),.5);assert.equal(q.stats.maxPixelRatio,.5);
  run(q,60,10);assert.equal(q.pixelRatio,.5,'do not upscale a low-DPR display to the quality floor');
  assert.equal(q.resize(1.25),.5);run(q,120,60);assert.equal(q.pixelRatio,1.25);
  assert.equal(q.stats.maxPixelRatio,1.25);assert.ok(q.stats.changes>0);
});

test('adaptive quality stays finite and bounded for long sessions and unusual DPR values',()=>{
  for(const dpr of [undefined,NaN,-1,0,.4,.75,1,1.25,1.5,2,4]){
    const q=createAdaptiveQuality(dpr),cap=q.stats.maxPixelRatio;
    for(let n=0;n<10000;n++){
      const fps=n%600<200?20:n%600<400?60:144;
      const result=q.sample(1/fps);
      assert.ok(Number.isFinite(q.pixelRatio)&&q.pixelRatio<=cap&&q.pixelRatio>=Math.min(.6,cap));
      if(result!==null)assert.equal(result,q.pixelRatio);
    }
  }
});

test('last-value cache invalidates immediately on every changed UI dependency',()=>{
  let calls=0;const calculate=memoLast((...args)=>({args,calls:++calls}));
  const a=calculate(0,4,7,false);for(let n=0;n<10000;n++)assert.equal(calculate(0,4,7,false),a);
  assert.equal(calls,1);
  for(const args of [[1,4,7,false],[1,5,7,false],[1,5,8,false],[1,5,8,true],[1,5,8]]){
    const before=calls;const result=calculate(...args);assert.equal(calls,before+1);assert.equal(calculate(...args),result);
  }
  const b=calculate(NaN);assert.equal(calculate(NaN),b);
  const bad=memoLast(()=>{throw new Error('failed calculation');});assert.throws(()=>bad(1));assert.throws(()=>bad(1));
});

test('cached label pools equal the real picker pools for all 144 island/bait combinations',()=>{
  let calls=0;const lookup=createBaitPoolLookup((zone,bait)=>{calls++;return eligibleSpecies(zone,bait);});
  const before=JSON.stringify({SPECIES,BAITS});
  for(let pass=0;pass<5;pass++)for(let zone=0;zone<6;zone++)for(let bait=0;bait<24;bait++){
    const pool=lookup(zone,bait);assert.deepEqual(pool,eligibleSpecies(zone,bait));assert.equal(pool,lookup(zone,bait));
    assert.ok(Object.isFrozen(pool));assert.throws(()=>pool.pop(),TypeError);
  }
  assert.equal(calls,144);assert.equal(lookup.size,144);
  assert.equal(JSON.stringify({SPECIES,BAITS}),before);
  for(const [name,count,forty]of [['Salmon Egg',14,false],['Dough Ball',14,false],['Cheese Cube',15,true],['Powerbait',15,true],['Live Minnow',15,true]]){
    const pool=lookup(1,BAITS.findIndex(b=>b.name===name));assert.equal(pool.length,count);assert.equal(pool.some(s=>s.number===40),forty);
  }
});
