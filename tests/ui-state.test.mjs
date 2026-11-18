import test from 'node:test';
import assert from 'node:assert/strict';
import { BAG_TABS, bagGearKind, nextBagTab, contextualHint, HELP_CONTROLS } from '../ui-state.mjs';

test('one immutable bag tab order; fish and invalid tabs are never gear',()=>{
  assert.deepEqual(BAG_TABS,['fish','rods','lines','bait']);
  assert.equal(Object.isFrozen(BAG_TABS),true);
  assert.deepEqual(BAG_TABS.map(bagGearKind),[null,'rod','line','bait']);
  for(const bad of ['',undefined,null,'constructor','__proto__','rod','shop'])assert.equal(bagGearKind(bad),null);
});

test('roving bag tabs wrap in both directions and support Home and End',()=>{
  for(const [index,tab] of BAG_TABS.entries()){
    assert.equal(nextBagTab(tab,'ArrowRight'),BAG_TABS[(index+1)%4]);
    assert.equal(nextBagTab(tab,'ArrowLeft'),BAG_TABS[(index+3)%4]);
    assert.equal(nextBagTab(tab,'Home'),'fish');
    assert.equal(nextBagTab(tab,'End'),'bait');
    for(const key of ['ArrowUp','ArrowDown','Tab','Space','KeyW','Escape'])assert.equal(nextBagTab(tab,key),null);
  }
  assert.equal(nextBagTab('unknown','ArrowRight'),null);
});

const aim={state:'aim',canCast:true};
test('idle hints only offer casting when there is water and nothing more relevant',()=>{
  assert.match(contextualHint(aim).text,/Hold click \/ Space.*release to cast/);
  assert.match(contextualHint({...aim,touch:true}).text,/Hold still.*release to cast/);
  for(const flag of ['blocked','holding','nearVendor','moving'])assert.equal(contextualHint({...aim,[flag]:true}),null,flag);
  assert.equal(contextualHint({...aim,canCast:false}),null);
});

test('no-match bait directs the player to the shared Bag instead of promising bites',()=>{
  for(const touch of [false,true]){
    const hint=contextualHint({...aim,baitMatches:false,touch});
    assert.match(hint.text,/Bag → Bait/);
    assert.doesNotMatch(hint.text,/to cast/);
    assert.equal(contextualHint({...aim,baitMatches:false,holding:true,touch}),null);
  }
});

test('waiting hint retains released luck; bite hints use the right input device',()=>{
  for(const luckLabel of ['LUCK -10%','LUCK 0%','LUCK +10%']){
    for(const touch of [false,true]){
      const waiting=contextualHint({state:'waiting',luckLabel,touch});
      assert.equal(waiting.mode,'waiting');assert.ok(waiting.text.includes(luckLabel));
      assert.match(waiting.text,/reel in early/);
      assert.ok(waiting.text.includes(touch?'tap':'click / Space'));
      const bite=contextualHint({state:'bite',touch});
      assert.equal(bite.mode,'bite');assert.ok(bite.text.includes(touch?'Tap':'Click / Space'));
    }
  }
});

test('dedicated fishing panels, menus and voyages never get duplicate generic controls',()=>{
  for(const state of ['menu','charging','casting','reeling','caught','voyage'])assert.equal(contextualHint({state,canCast:true}),null);
  for(const state of ['aim','waiting','bite'])assert.equal(contextualHint({state,canCast:true,blocked:true}),null);
  // A fight's immediate hook/early-reel control has priority over idle context.
  assert.equal(contextualHint({state:'bite',nearVendor:true,moving:true,holding:true}).mode,'bite');
});

test('Help covers every gameplay/UI action for both desktop and touch',()=>{
  assert.equal(new Set(HELP_CONTROLS.map(c=>c.action)).size,HELP_CONTROLS.length);
  for(const control of HELP_CONTROLS){assert.ok(control.desktop);assert.ok(control.touch);}
  const desktop=HELP_CONTROLS.map(c=>c.desktop).join(' '),touch=HELP_CONTROLS.map(c=>c.touch).join(' ');
  for(const key of ['WASD','Shift','Space','Enter','E near','B →','I →','M / F','V (toggle)','X','H','Escape','?'])assert.ok(desktop.includes(key),key);
  assert.match(touch,/tap the scene to restore/);
  assert.match(touch,/joystick/);
  assert.doesNotMatch(desktop+touch,/Tackle bag|Fish bag/);
});
