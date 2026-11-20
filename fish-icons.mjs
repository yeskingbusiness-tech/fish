import { fishSVG } from './fish-geometry.mjs?v=43';
import { fishAppearance } from './fish-appearance.mjs?v=43';

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Keep the exact vector artwork, but give the browser one reusable image per
// species instead of thousands of live SVG paths per inventory/log row. No
// textures, remote requests or extra WebGL contexts; these URLs live only for
// this page. Undiscovered entries never call this renderer.
export function createFishIcons(species, {
  illustrate=fishSVG, urls=globalThis.URL, BlobType=globalThis.Blob,
  Observer=globalThis.IntersectionObserver,
}={}){
  const roster=new Map(species.map(sp=>[sp.id,sp])),images=new Map(),panels=new Map();
  let disposed=false;
  function source(id){
    if(disposed)throw new Error('Fish icons have been disposed');
    const sp=roster.get(id);
    if(!sp)throw new Error(`Unknown fish illustration: ${id}`);
    if(!images.has(id))images.set(id,urls.createObjectURL(new BlobType([illustrate(sp)],{type:'image/svg+xml'})));
    return images.get(id);
  }
  function markup(sp,{eager=false}={}){
    if(disposed||!roster.has(sp.id))throw new Error(`Unknown fish illustration: ${sp.id}`);
    return `<img class="fish-thumbnail" width="160" height="100" alt="${escape(sp.name)}" data-fish-id="${escape(sp.id)}" data-anatomy="${escape(fishAppearance(sp).family)}" decoding="async" loading="${eager?'eager':'lazy'}"${eager?` src="${escape(source(sp.id))}"`:''}>`;
  }
  function disconnect(container){
    panels.get(container)?.observer?.disconnect();
    panels.delete(container);
  }
  function observe(container){
    disconnect(container);
    if(disposed)return;
    const pending=new Set(container.querySelectorAll('img.fish-thumbnail:not([src])'));
    if(!pending.size)return;
    const load=image=>{
      if(!pending.has(image))return;
      pending.delete(image);
      if(image.isConnected&&container.contains(image))image.src=source(image.dataset.fishId);
    };
    // An older browser still gets all artwork. Modern browsers generate only
    // the visible rows plus a small scroll-ahead margin, including nested panels.
    if(typeof Observer!=='function'){for(const image of pending)load(image);return;}
    const observer=new Observer(entries=>{
      // A queued callback from a closed/replaced panel must not build stale art.
      if(panels.get(container)?.observer!==observer)return;
      for(const entry of entries)if(entry.isIntersecting){load(entry.target);observer.unobserve(entry.target);}
      if(!pending.size)disconnect(container);
    },{root:container,rootMargin:'120px 0px',threshold:0});
    panels.set(container,{observer,pending});
    for(const image of pending)observer.observe(image);
  }
  function dispose(){
    if(disposed)return;
    for(const container of panels.keys())disconnect(container);
    for(const url of images.values())urls.revokeObjectURL(url);
    images.clear();disposed=true;
  }
  return {markup,observe,disconnect,dispose,get stats(){
    return {images:images.size,observers:panels.size,pending:[...panels.values()].reduce((n,p)=>n+p.pending.size,0)};
  }};
}
