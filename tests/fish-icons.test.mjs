import test from 'node:test';
import assert from 'node:assert/strict';
import {createFishIcons} from '../fish-icons.mjs';
import {SPECIES} from '../game-data.mjs';
import {fishSVG} from '../fish-geometry.mjs';

function harness(options={}){
  const blobs=[],revoked=[],observers=[];let builds=0;
  class Observer{
    constructor(callback,options){this.callback=callback;this.options=options;this.watching=new Set();this.disconnected=false;observers.push(this);}
    observe(image){this.watching.add(image);}
    unobserve(image){this.watching.delete(image);}
    disconnect(){this.watching.clear();this.disconnected=true;}
    intersect(image){this.callback([{target:image,isIntersecting:true}]);}
  }
  const icons=createFishIcons(SPECIES,{illustrate:sp=>{builds++;return fishSVG(sp);},
    urls:{createObjectURL:blob=>{blobs.push(blob);return 'blob:fish-'+blobs.length;},revokeObjectURL:url=>revoked.push(url)},Observer,...options});
  const image=id=>({dataset:{fishId:id},isConnected:true,src:''});
  const panel=images=>({querySelectorAll:()=>images.filter(i=>!i.src),contains:image=>images.includes(image)});
  return {icons,blobs,revoked,observers,image,panel,get builds(){return builds;}};
}

test('list markup is small, accessible and does not build any off-screen artwork',()=>{
  const h=harness();
  for(const sp of SPECIES){
    const html=h.icons.markup(sp);assert.match(html,/^<img /);assert.match(html,/width="160" height="100"/);
    assert.ok(html.includes(`alt="${sp.name}"`));assert.ok(html.includes(`data-fish-id="${sp.id}"`));
    assert.match(html,/decoding="async" loading="lazy"/);assert.doesNotMatch(html,/src=|<svg|<path/);assert.ok(html.length<310);
  }
  assert.equal(h.builds,0);assert.deepEqual(h.icons.stats,{images:0,observers:0,pending:0});
  assert.throws(()=>h.icons.markup({id:'not-a-fish',name:'not a fish'}),/Unknown fish/);
  const html=h.icons.markup({...SPECIES[0],name:'"<&\'>'});assert.match(html,/alt="&quot;&lt;&amp;&#39;&gt;"/);
});

test('catch/reel images reuse one exact, unmodified vector source per species',async()=>{
  const h=harness();
  for(const sp of SPECIES){
    const first=h.icons.markup(sp,{eager:true});assert.match(first,/loading="eager" src="blob:/);
    assert.equal(h.icons.markup(sp,{eager:true}),first);
  }
  assert.equal(h.builds,120);assert.equal(h.blobs.length,120);assert.equal(h.icons.stats.images,120);
  for(let n=0;n<120;n++){assert.equal(h.blobs[n].type,'image/svg+xml');assert.equal(await h.blobs[n].text(),fishSVG(SPECIES[n]));}
  h.icons.dispose();h.icons.dispose();assert.equal(h.revoked.length,120);assert.equal(new Set(h.revoked).size,120);
  assert.equal(h.icons.stats.images,0);assert.throws(()=>h.icons.markup(SPECIES[0]),/Unknown fish/);
});

test('only intersecting list images load, duplicate species share URLs, and completed observers disconnect',()=>{
  const h=harness(),[a,b]=SPECIES,images=[h.image(a.id),h.image(b.id),h.image(a.id)],panel=h.panel(images);
  h.icons.observe(panel);assert.equal(h.builds,0);assert.equal(h.icons.stats.pending,3);
  const observer=h.observers[0];assert.equal(observer.options.root,panel);assert.equal(observer.options.rootMargin,'120px 0px');
  observer.callback([{target:images[0],isIntersecting:false}]);assert.equal(h.builds,0);
  observer.intersect(images[0]);assert.equal(h.builds,1);assert.equal(h.icons.stats.pending,2);assert.equal(images[1].src,'');
  observer.intersect(images[2]);assert.equal(images[2].src,images[0].src);assert.equal(h.builds,1);
  observer.intersect(images[1]);assert.equal(h.builds,2);assert.equal(observer.disconnected,true);assert.equal(h.icons.stats.observers,0);
  h.icons.observe(panel);assert.equal(h.observers.length,1,'loaded rows do not need another observer');
});

test('closing/replacing a panel cancels queued callbacks and never retains removed rows',()=>{
  const h=harness(),images=[h.image(SPECIES[0].id)],panel=h.panel(images);
  h.icons.observe(panel);const old=h.observers[0];h.icons.disconnect(panel);
  old.intersect(images[0]);assert.equal(h.builds,0);assert.equal(h.icons.stats.pending,0);
  h.icons.observe(panel);const second=h.observers[1];
  images[0].isConnected=false;second.intersect(images[0]);assert.equal(h.builds,0);assert.equal(h.icons.stats.observers,0);
  images[0].isConnected=true;h.icons.observe(panel);const third=h.observers[2];
  h.icons.observe(panel);third.intersect(images[0]);assert.equal(h.builds,0,'superseded render callback ignored');
  h.observers[3].intersect(images[0]);assert.equal(h.builds,1);
  for(let n=0;n<30;n++){h.icons.observe(h.panel([h.image(SPECIES[1].id)]));}
  h.icons.dispose();assert.deepEqual(h.icons.stats,{images:0,observers:0,pending:0});
  assert.ok(h.observers.every(o=>o.disconnected));
});

test('older browsers without IntersectionObserver still get correct shared illustrations',()=>{
  const h=harness({Observer:undefined}),images=[h.image(SPECIES[0].id),h.image(SPECIES[1].id),h.image(SPECIES[0].id)];
  h.icons.observe(h.panel(images));assert.equal(h.builds,2);assert.ok(images.every(i=>i.src));
  assert.equal(images[0].src,images[2].src);assert.equal(h.icons.stats.observers,0);
});
