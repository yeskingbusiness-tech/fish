// Readable, repeating fight phases. Each state is explicit so the HUD can
// telegraph what the fish is doing instead of relying on surprise yanks.
export const REEL_PHASES=Object.freeze({
  calm:Object.freeze({label:'CALM WATER',hint:'HOLD TO REEL',duration:3.2}),
  run:Object.freeze({label:'FISH RUNNING',hint:'LET THE LINE OUT · RELEASE',duration:2.4}),
  headshake:Object.freeze({label:'HEADSHAKE',hint:'EASE OFF · RELEASE',duration:1.8}),
});
const NEXT=Object.freeze({calm:'run',run:'headshake',headshake:'calm'});
export function advanceReelPhase(phase,timeLeft,dt){
  let phaseTime=timeLeft-dt,changed=false;
  while(phaseTime<=0){phase=NEXT[phase]||'calm';phaseTime+=REEL_PHASES[phase].duration;changed=true;}
  return {phase,timeLeft:phaseTime,changed};
}
// Tension acceleration supplied by the fish's readable behavior. Positive
// means tighter. Player input is applied separately by the caller.
export function phasePull(phase,reelHeld){
  if(phase==='run')return reelHeld?24:-4;
  if(phase==='headshake')return reelHeld?14:1;
  return reelHeld?8:-3;
}
