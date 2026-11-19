// Frozen position semantics for saves made before the irregular archipelago.
// Do not use current terrain/layout data to reinterpret historical coordinates.
export const V41_ISLAND_ANCHORS=Object.freeze(Array.from({length:20},(_,id)=>{
  const row=Math.floor(id/4),col=row%2?3-id%4:id%4;
  return Object.freeze({x:-390+col*260,z:-row*260});
}));
const extraRects=[
  [[-39,-27,25,51],[13,33,57,67]], // Reedhaven
  [[-41,-27,32,64],[13,37,57,79]], // Pinewater Isle
  [[-40.5,-27.5,12,58],[26,38,44,80],[-46,-26,64.5,79.5]], // Ironwood River
  [[-39,-27,13,31],[25,39,33,51],[-31,-13,57,73]], // Brackwater Marsh
  [[-43,-27,28,56],[19,41,60,72]], // Sunscar Atoll
  [[-43,-29,19.5,34.5],[23,41,35,53],[-34.5,-19.5,61,73],[-20.5,-19.5,-8.5,-7.5],[-18.5,-17.5,-10.5,-9.5],[-16.5,-15.5,-12.5,-11.5],[-14.5,-13.5,-8.5,-7.5],[-12.5,-11.5,-10.5,-9.5],[-10.5,-9.5,-12.5,-11.5],[-8.5,-7.5,-8.5,-7.5],[-6.5,-5.5,-10.5,-9.5],[-4.5,-3.5,-12.5,-11.5],[-2.5,-1.5,-8.5,-7.5],[-0.5,0.5,-10.5,-9.5],[1.5,2.5,-12.5,-11.5],[3.5,4.5,-8.5,-7.5],[5.5,6.5,-10.5,-9.5],[7.5,8.5,-12.5,-11.5],[9.5,10.5,-8.5,-7.5]], // Coralreach
  [[-41,-29,21,51],[16,38,61.5,78.5],[-15,-13,-17.5,-14.5],[-31.5,-28.5,-16,-12]], // Breaker Coast
  [[-41,-29,37.5,62.5],[23.5,40.5,54.5,73.5]], // Stormbreak Isles
  [[-43,-27,23,53],[-38,-18,57,73],[18,36,54,72]], // Thornwild Delta
  [[-42.5,-21.5,40.5,67.5],[5.5,34.5,63,83]], // Emberforge
  [[-41,-27,20,52],[22,42,52,72],[-22,-18,-16.5,-13.5],[-15.825,-12.175,-20.5,-17.5],[-9.65,-6.35,-16.5,-13.5],[-3.475,-0.5249999999999999,-20.5,-17.5],[2.7,5.3,-16.5,-13.5],[8.875,11.125,-20.5,-17.5]], // Frostfall Isle
  [[-42.5,-27.5,16.5,61.5],[25,37,36,72],[-49.5,-46.5,-16.5,-13.5],[-42.5,-39.5,-21.5,-18.5],[-35.5,-32.5,-16.5,-13.5],[-28.5,-25.5,-21.5,-18.5],[-21.5,-18.5,-16.5,-13.5],[-14.5,-11.5,-21.5,-18.5],[-7.5,-4.5,-16.5,-13.5]], // Skyglass Fjord
  [[-42,-30,19,61],[27,39,40,74]], // Shattered Shelf
  [[-42,-26,31.5,60.5],[21.5,38.5,57.5,74.5]], // Leviathan's Grave
  [[-41,-27,22.5,53.5],[23,39,51.5,74.5]], // Ashen Trench
  [[-41.5,-24.5,25,57],[11.5,36.5,59.5,78.5]], // Moontide Sanctum
  [[-40.5,-25.5,37,63],[23.5,40.5,50,72]], // Starfall Basin
  [[-40,-28,25,59],[26.5,39.5,49,77]], // The Null Trench
  [[-43.5,-26.5,30,60],[18,42,58.5,77.5]], // Eternity's Reach
  [[-42,-26,29,59],[24,40,30,60],[-27,27,63,79]], // Origin's End
];
const villageRects=[[-30,30,10,58],[-28,-16,-2,18],[-2.5,2.5,-2.5,14],[7.3,10.7,.5,14]];
export function validV41BoatPose(p,radius,licenses){
  if(p.x<-590+radius||p.x>590-radius||p.z<-1240+radius||p.z>200-radius)return false;
  for(const [id,a]of V41_ISLAND_ANCHORS.entries()){
    const x=p.x-a.x,z=p.z-a.z;
    if(!licenses.includes(id)&&Math.hypot(x,z-25)<110+radius)return false;
    if([...villageRects,...extraRects[id]].some(([minX,maxX,minZ,maxZ])=>x>=minX-radius&&x<=maxX+radius&&z>=minZ-radius&&z<=maxZ+radius))return false;
  }
  return true;
}
