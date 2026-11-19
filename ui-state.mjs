// Small, pure UI rules. Inventory tabs and hints never change game/save data.
export const BAG_TABS = Object.freeze(['fish','rods','lines','bait']);
export function bagGearKind(tab){
  return tab==='rods'?'rod':tab==='lines'?'line':tab==='bait'?'bait':null;
}
export function nextBagTab(tab, key){
  const index=BAG_TABS.indexOf(tab);
  if(index<0)return null;
  if(key==='Home')return BAG_TABS[0];
  if(key==='End')return BAG_TABS.at(-1);
  if(key==='ArrowRight')return BAG_TABS[(index+1)%BAG_TABS.length];
  if(key==='ArrowLeft')return BAG_TABS[(index+BAG_TABS.length-1)%BAG_TABS.length];
  return null;
}
export function contextualHint({state,blocked=false,holding=false,nearVendor=false,moving=false,canCast=false,baitMatches=true,touch=false,luckLabel=''}){
  if(blocked)return null;
  if(state==='waiting')return {text:`${luckLabel} · Waiting… ${touch?'tap':'click / Space'} to reel in early`,mode:'waiting'};
  if(state==='bite')return {text:`BITE! ${touch?'Tap':'Click / Space'} to hook`,mode:'bite'};
  // The nearby-stall button, held-fish strip, charge meter and reel panel each
  // already explain their action. Never stack a second generic hint underneath.
  if(state!=='aim'||holding||nearVendor||moving||!canCast)return null;
  if(!baitMatches)return {text:touch?'Change bait in Bag → Bait':'B · Bag → Bait for these waters',mode:''};
  return {text:touch?'Hold still, then release to cast':'Hold click / Space, then release to cast',mode:''};
}
export const HELP_CONTROLS = Object.freeze([
  {action:'Walk / jog',desktop:'WASD or arrows · Shift to jog',touch:'Drag the on-screen joystick'},
  {action:'Board / return to boat',desktop:'R or Board boat · returns to your own boat from anywhere',touch:'Board boat / Return to boat on the HUD'},
  {action:'Boat / stop & fish',desktop:'WASD steer · Q stop / helm · E dock',touch:'Joystick steer · Stop & fish · Dock'},
  {action:'Look around',desktop:'Mouse · click to capture, or drag',touch:'Drag the scene'},
  {action:'Cast',desktop:'Hold click or Space, then release',touch:'Hold still, then release'},
  {action:'Hook a bite',desktop:'Click or Space when the bite appears',touch:'Tap when the bite appears'},
  {action:'Reel in early',desktop:'Click or Space while waiting',touch:'Tap while waiting'},
  {action:'Keep fishing after a catch',desktop:'Enter or the Keep Fishing button',touch:'Keep Fishing button'},
  {action:'Control tension',desktop:'Hold to raise · release to lower',touch:'Hold to raise · release to lower'},
  {action:'Open a stall',desktop:'E near its counter',touch:'Tap the nearby stall button'},
  {action:'Bag / hold a fish',desktop:'B → Fish → Hold',touch:'Bag → Fish → Hold'},
  {action:'Equip owned tackle',desktop:'I → Rods, Lines or Bait',touch:'Bag → Rods, Lines or Bait'},
  {action:'Sea chart / fish index',desktop:'M / F',touch:'Sea chart / Fish index buttons'},
  {action:'Front view / first person',desktop:'V (toggle)',touch:'Front view / First person button'},
  {action:'Put held fish away',desktop:'X',touch:'Put away button'},
  {action:'Hide / restore HUD',desktop:'H · Escape or click to restore',touch:'Hide HUD · tap the scene to restore'},
  {action:'Help / controls',desktop:'? or the Help button',touch:'Help button'},
  {action:'Close a panel',desktop:'Escape',touch:'Close button or backdrop'},
]);
