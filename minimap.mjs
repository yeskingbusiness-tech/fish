import { ISLANDS } from './island-data.mjs?v=41';
import { territoryCenter, TERRITORY_RADIUS, SEA_BOUNDS } from './navigation.mjs?v=41';
// One small 2D canvas, redrawn at 5 Hz only while visible. No DOM islands,
// textures, WebGL renderer or repeated illustration work in the frame loop.
export function drawMinimap(canvas,{x,z,yaw=0,licensed=[],waypoint=null}){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=w/450;
  const px=v=>w/2+(v-x)*scale,pz=v=>h/2+(v-z)*scale;
  c.clearRect(0,0,w,h);c.fillStyle='#244f5c';c.fillRect(0,0,w,h);
  c.strokeStyle='#416a74';c.lineWidth=1;
  for(let k=-8;k<9;k++){
    const xx=px(Math.floor(x/50)*50+k*50),zz=pz(Math.floor(z/50)*50+k*50);
    c.beginPath();c.moveTo(xx,0);c.lineTo(xx,h);c.moveTo(0,zz);c.lineTo(w,zz);c.stroke();
  }
  for(const i of ISLANDS){
    const center=territoryCenter(i),xx=px(center.x),zz=pz(center.z),r=TERRITORY_RADIUS*scale;
    if(xx+r<0||xx-r>w||zz+r<0||zz-r>h)continue;
    const allowed=licensed.includes(i.id);
    c.setLineDash(allowed?[]:[4,4]);c.strokeStyle=allowed?'#6ca4a2':'#e79584';c.lineWidth=1.5;c.beginPath();c.arc(xx,zz,r,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.fillStyle=allowed?i.color:'#79878b';c.fillRect(px(i.x-30),pz(i.z+10),60*scale,48*scale);
    c.fillStyle='#e4d5ad';c.fillRect(px(i.x-2),pz(i.z-2),4*scale,16*scale);
    c.font='bold 12px monospace';c.textAlign='center';c.fillStyle=allowed?'#f6edd1':'#ffc6b2';c.fillText(String(i.id+1).padStart(2,'0'),xx,zz-19);
    if(!allowed){c.font='9px monospace';c.fillText('LV '+i.level,xx,zz+24);}
  }
  const i=ISLANDS[waypoint];if(i){
    const tx=px(i.x),tz=pz(i.z),dx=tx-w/2,dz=tz-h/2,k=Math.min(1,(w/2-18)/Math.max(Math.abs(dx),Math.abs(dz),1));
    c.strokeStyle='#f3d98b';c.setLineDash([3,5]);c.beginPath();c.moveTo(w/2,h/2);c.lineTo(w/2+dx*k,h/2+dz*k);c.stroke();c.setLineDash([]);
    c.fillStyle='#f3d98b';c.fillRect(w/2+dx*k-3,h/2+dz*k-3,6,6);
  }
  c.save();c.translate(w/2,h/2);c.rotate(-yaw);c.fillStyle='#fff4d8';c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(0,4);c.lineTo(6,7);c.closePath();c.fill();c.restore();
  c.fillStyle='#f5df9e';c.font='bold 11px monospace';c.textAlign='left';c.fillText('N ↑',10,17);
  c.strokeStyle='#e4bea1';c.strokeRect(px(SEA_BOUNDS.minX),pz(SEA_BOUNDS.minZ),(SEA_BOUNDS.maxX-SEA_BOUNDS.minX)*scale,(SEA_BOUNDS.maxZ-SEA_BOUNDS.minZ)*scale);
}
