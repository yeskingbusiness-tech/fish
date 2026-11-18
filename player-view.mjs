// Presentation only: neither camera mode nor a displayed fish changes gameplay
// data. THREE is passed in so the camera/size helpers can be tested without WebGL.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function heldFishSpan(sp, weight){
  const w = Number.isFinite(Number(weight)) ? Math.max(0, Number(weight)) : 0;
  const ratio = sp.maxW > 0 ? clamp(w / sp.maxW, 0, 1) : 0;
  // Even a final-island giant must fit between the hands and on a phone screen.
  // Keep the actual saved weight/value; this is just the model's display width.
  return 0.95 + Math.min(0.55, Math.log2(1 + w) * 0.055) + ratio * 0.2;
}

export function frontViewPose({ x, z, ground, yaw, pitch = 0, aspect = 1.5 }, blockers = []){
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const portrait = aspect < 1;
  let distance = portrait ? 4.6 : 4.1;
  // Shorten the camera boom before trees, stalls or large rocks, not through them.
  // These are the same island-local footprints that block player movement.
  for(const b of blockers){
    const dx = b.x - x, dz = b.z - z;
    const along = dx * fx + dz * fz, perpendicular2 = dx * dx + dz * dz - along * along;
    if(along <= 0 || perpendicular2 >= b.r * b.r) continue;
    const entry = along - Math.sqrt(Math.max(0, b.r * b.r - perpendicular2));
    if(entry >= 0) distance = Math.min(distance, Math.max(0.02, entry - 0.22));
  }
  return {
    x:x + fx * distance, z:z + fz * distance,
    y:ground + 1.85 - clamp(pitch, -0.62, 0.42) * 1.2 + (distance < 1.5 ? 0.65 : 0),
    targetX:x, targetY:ground + (portrait ? 1.2 : 1.02), targetZ:z, distance,
  };
}

export function createPlayerModel(THREE, sourceRod){
  const root = new THREE.Group();
  root.name = 'player-character';
  root.visible = false; // Never render a body or hands in first person.
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const palette = Object.fromEntries(Object.entries({
    skin:0xe5ba91, shirt:0xe9e2ce, vest:0x428b82, seam:0x2d665e,
    trousers:0x344c60, boots:0x303d43, hat:0xd4b578, band:0x6c7661, eyes:0x193d45,
  }).map(([key, color]) => [key, new THREE.MeshLambertMaterial({ color })]));
  function box(parent, name, size, position, color){
    const mesh = new THREE.Mesh(geometry, palette[color]);
    mesh.name = name; mesh.scale.set(...size); mesh.position.set(...position);
    parent.add(mesh); return mesh;
  }
  // A deliberately simple cuboid angler: shirt/vest, two legs, two arms and a cap.
  box(root, 'body', [.62,.64,.36], [0,1.17,0], 'shirt');
  box(root, 'vest', [.64,.47,.08], [0,1.2,-.2], 'vest');
  box(root, 'vest-seam', [.035,.47,.025], [0,1.2,-.25], 'seam');
  for(const side of [-1,1])box(root, 'vest-pocket', [.16,.14,.04], [side*.18,1.08,-.25], 'seam');
  box(root, 'waist', [.55,.15,.33], [0,.82,0], 'trousers');
  box(root, 'neck', [.2,.13,.2], [0,1.53,0], 'skin');
  box(root, 'head', [.45,.43,.43], [0,1.73,0], 'skin');
  box(root, 'cap', [.51,.12,.49], [0,1.98,0], 'hat');
  box(root, 'cap-band', [.52,.055,.5], [0,1.9,0], 'band');
  box(root, 'cap-brim', [.59,.06,.3], [0,1.9,-.27], 'hat');
  for(const side of [-1,1])box(root, 'eye', [.055,.065,.025], [side*.105,1.75,-.223], 'eyes');
  box(root, 'smile', [.105,.025,.025], [0,1.61,-.223], 'eyes');
  const arms=[], legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.name=side<0?'left-arm':'right-arm';arm.position.set(side*.43,1.43,0);root.add(arm);
    box(arm, 'sleeve', [.2,.31,.24], [0,-.13,0], 'shirt');
    box(arm, 'forearm', [.17,.23,.2], [0,-.37,0], 'skin');
    box(arm, side<0?'left-hand':'right-hand', [.19,.16,.22], [0,-.54,0], 'skin');
    arms.push(arm);
    const leg=new THREE.Group();leg.name=side<0?'left-leg':'right-leg';leg.position.set(side*.17,.77,0);root.add(leg);
    box(leg, 'trouser-leg', [.23,.59,.27], [0,-.28,0], 'trousers');
    box(leg, 'boot', [.26,.18,.39], [0,-.68,-.045], 'boots');
    legs.push(leg);
  }
  const fishMount = new THREE.Group();
  fishMount.name='carried-fish-mount';fishMount.position.set(0,1.15,-.62);root.add(fishMount);
  // Share the existing rod's geometry/materials, not a second equipment system.
  const rod = sourceRod.clone(true);
  rod.name='third-person-rod';rod.position.set(.43,.97,-.36);root.add(rod);
  const rodTip=rod.getObjectByName('rod-tip'), rodBend=rod.getObjectByName('rod-bend');
  const pitchRotation=new THREE.Quaternion(), pitchEuler=new THREE.Euler();
  function pose({ x, z, ground, yaw, pitch, time, stride, moving, holding, rodRotation, bend }){
    root.position.set(x,ground,z);root.rotation.y=yaw;
    const walk=moving?Math.sin(stride)*.38:0;
    legs[0].rotation.x=walk;legs[1].rotation.x=-walk;
    arms[0].rotation.x=holding?1.04:-walk*.65;
    arms[1].rotation.x=holding?1.04:.65;
    fishMount.position.y=1.15+Math.sin(time*1.8)*.012;
    rod.visible=!holding;
    pitchRotation.setFromEuler(pitchEuler.set(pitch,0,0));
    rod.quaternion.copy(pitchRotation).multiply(rodRotation);
    rodBend.rotation.x=bend;
  }
  return { root, arms, legs, fishMount, rod, rodTip, pose };
}
