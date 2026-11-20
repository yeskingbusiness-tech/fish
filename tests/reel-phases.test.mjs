import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceReelPhase,REEL_PHASES,phasePull,chooseFishTug} from '../reel-phases.mjs';

test('readable fight phases advance in a stable calm, run, headshake cycle',()=>{
  let p={phase:'calm',timeLeft:REEL_PHASES.calm.duration};
  p=advanceReelPhase(p.phase,p.timeLeft,REEL_PHASES.calm.duration);
  assert.deepEqual(p,{phase:'run',timeLeft:REEL_PHASES.run.duration,changed:true});
  p=advanceReelPhase(p.phase,p.timeLeft,REEL_PHASES.run.duration);
  assert.deepEqual(p,{phase:'headshake',timeLeft:REEL_PHASES.headshake.duration,changed:true});
  p=advanceReelPhase(p.phase,p.timeLeft,REEL_PHASES.headshake.duration);
  assert.deepEqual(p,{phase:'calm',timeLeft:REEL_PHASES.calm.duration,changed:true});
});

test('large frame steps preserve cycle timing and phase remainder',()=>{
  const p=advanceReelPhase('calm',1,4.4);
  assert.equal(p.phase,'headshake');
  assert.ok(Math.abs(p.timeLeft-0.8)<1e-9);
});

test('fish behavior telegraphs distinct hold/release responses',()=>{
  assert.ok(phasePull('run',true)>0);
  assert.ok(phasePull('run',false)<0);
  assert.ok(phasePull('headshake',true)>phasePull('headshake',false));
  assert.ok(phasePull('calm',true)>phasePull('calm',false));
  assert.match(REEL_PHASES.run.hint,/RELEASE/);
});

test('sudden fish tugs can pull tension sharply toward either end and scale slightly with strength',()=>{
  assert.equal(chooseFishTug(1,()=>0),98);
  assert.equal(chooseFishTug(1,()=>0.9),-98);
  assert.equal(chooseFishTug(4,()=>0),164);
});
