import { ISLANDS } from './island-data.mjs?v=43';
import { territoryCenter, TERRITORY_RADIUS, SEA_BOUNDS, LAND_RECTS } from './navigation.mjs?v=43';
// One small 2D canvas, redrawn at 5 Hz only while visible. Fixed land footprints
// share the exact orthogonal transforms used by rendering and boat collision.
const footprints=ISLANDS.map(i=>LAND_RECTS.filter(r=>r.island===i.id));
export const MINIMAP_SPAN=1000;
export function drawMinimap(canvas,{x,z,yaw=0,licensed=[],waypoint=null,boat=null}){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=w/MINIMAP_SPAN;
  const px=v=>w/2+(v-x)*scale,pz=v=>h/2+(v-z)*scale;
  c.clearRect(0,0,w,h);c.fillStyle='#244f5c';c.fillRect(0,0,w,h);
  for(const i of ISLANDS){
    const center=territoryCenter(i),xx=px(center.x),zz=pz(center.z),r=TERRITORY_RADIUS*scale;
    if(xx+r<0||xx-r>w||zz+r<0||zz-r>h)continue;
    const allowed=licensed.includes(i.id);
    c.setLineDash(allowed?[]:[4,4]);c.strokeStyle=allowed?'#6ca4a2':'#e79584';c.fillStyle=allowed?'#34657144':'#b55d4b18';c.lineWidth=1.5;
    c.beginPath();c.arc(xx,zz,r,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
    for(const f of footprints[i.id]){
      c.fillStyle=!allowed?'#79878b':f.kind==='pier'?'#f0d29c':f.kind==='shore'?'#d0c49d':i.color;
      c.fillRect(px(f.minX),pz(f.minZ),Math.max(1,(f.maxX-f.minX)*scale),Math.max(1,(f.maxZ-f.minZ)*scale));
    }
    c.font='bold 12px monospace';c.textAlign='center';c.fillStyle=allowed?'#f6edd1':'#ffc6b2';c.fillText(String(i.id+1).padStart(2,'0'),xx,zz-18);
    if(!allowed){c.font='9px monospace';c.fillText('LV '+i.level,xx,zz+24);}
  }
  function edgePoint(point){
    const dx=px(point.x)-w/2,dz=pz(point.z)-h/2,k=Math.min(1,(w/2-18)/Math.max(Math.abs(dx),1),(h/2-18)/Math.max(Math.abs(dz),1));
    return {x:w/2+dx*k,z:h/2+dz*k};
  }
  const i=ISLANDS[waypoint];if(i){
    const p=edgePoint(territoryCenter(i));
    c.strokeStyle='#f3d98b';c.setLineDash([3,5]);c.beginPath();c.moveTo(w/2,h/2);c.lineTo(p.x,p.z);c.stroke();c.setLineDash([]);
    c.fillStyle='#f3d98b';c.fillRect(p.x-3,p.z-3,6,6);
  }
  if(boat){
    const p=edgePoint(boat);c.fillStyle='#e7b76e';c.strokeStyle='#193c46';c.lineWidth=2;
    c.beginPath();c.rect(p.x-6,p.z-6,12,12);c.fill();c.stroke();c.font='bold 10px monospace';c.textAlign='center';c.fillStyle='#193c46';c.fillText('B',p.x,p.z+3);
  }
  c.save();c.translate(w/2,h/2);c.rotate(-yaw);c.fillStyle='#fff4d8';c.strokeStyle='#193c46';c.lineWidth=1.5;
  c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(0,4);c.lineTo(6,7);c.closePath();c.fill();c.stroke();c.restore();
  c.fillStyle='#f5df9e';c.font='bold 11px monospace';c.textAlign='left';c.fillText('N ↑',10,17);
  c.strokeStyle='#c8d8cf';c.lineWidth=1;c.beginPath();c.moveTo(12,h-17);c.lineTo(12+200*scale,h-17);c.stroke();c.font='9px monospace';c.fillStyle='#c8d8cf';c.fillText('200 m',12,h-5);
  c.strokeStyle='#e4bea1';c.strokeRect(px(SEA_BOUNDS.minX),pz(SEA_BOUNDS.minZ),(SEA_BOUNDS.maxX-SEA_BOUNDS.minX)*scale,(SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ)*scale);
}
