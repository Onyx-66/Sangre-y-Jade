// Exact circle/rectangle/polygon footprint queries and bounded-step movement.
// Sweeps prevent tunnelling and diagonal corner cuts; push-out handles spawns.
const EPS = .001;
export function shapeOf(item) {
  const f = item.footprint || item.collider, s = item.scale ?? 1;
  const x = (item.x || 0) + (f.offsetX || 0) * s, y = (item.y || 0) + (f.offsetY || 0) * s;
  if (f.type === 'circle') return { type: 'circle', x, y, radius: f.radius * s };
  const points = f.type === 'polygon' ? f.points : [
    [-f.width / 2, -f.height / 2], [f.width / 2, -f.height / 2],
    [f.width / 2, f.height / 2], [-f.width / 2, f.height / 2],
  ];
  return { type: 'polygon', points: points.map(p => ({ x: x + (p.x ?? p[0]) * s, y: y + (p.y ?? p[1]) * s })) };
}
export function shapeBounds(item) {
  const s = shapeOf(item);
  if (s.type === 'circle') return { x: s.x - s.radius, y: s.y - s.radius, width: s.radius * 2, height: s.radius * 2 };
  const xs = s.points.map(p => p.x), ys = s.points.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
export function insidePolygon(p, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside = !inside;
  }
  return inside;
}
function closest(p, a, b) {
  const dx=b.x-a.x, dy=b.y-a.y, t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return { x:a.x+dx*t, y:a.y+dy*t };
}
export function penetration(point, radius, item) {
  const s=shapeOf(item);
  if(s.type==='circle') {
    const dx=point.x-s.x,dy=point.y-s.y,d=Math.hypot(dx,dy),amount=radius+s.radius-d;
    return amount>EPS ? { x:(d?dx/d:1)*(amount+EPS),y:(d?dy/d:0)*(amount+EPS) } : null;
  }
  let q=null, d=Infinity;
  s.points.forEach((a,i)=>{const c=closest(point,a,s.points[(i+1)%s.points.length]),n=Math.hypot(point.x-c.x,point.y-c.y);if(n<d){q=c;d=n;}});
  const inside=insidePolygon(point,s.points);
  if(!inside&&d>=radius-EPS)return null;
  let dx=inside?q.x-point.x:point.x-q.x,dy=inside?q.y-point.y:point.y-q.y;
  if(d<EPS){dx=point.x-s.points.reduce((a,p)=>a+p.x,0)/s.points.length;dy=point.y-s.points.reduce((a,p)=>a+p.y,0)/s.points.length;}
  const length=Math.hypot(dx,dy)||1,amount=(inside?radius+d:radius-d)+EPS;
  return {x:dx/length*amount,y:dy/length*amount};
}
export function blocksLevel(item, level=0) {
  return item.collider?.type !== 'none' && (item.levels || [item.level ?? 0]).some(n=>Math.abs(n-level)<.001);
}
export function pushOut(point, radius, query, level=0) {
  const p={...point};
  for(let pass=0;pass<12;pass++) {
    let changed=false;
    for(const item of query(p,radius)) { if(!blocksLevel(item,level))continue; const correction=penetration(p,radius,item);
      if(correction){p.x+=correction.x;p.y+=correction.y;changed=true;}}
    if(!changed)break;
  }
  return p;
}
export function sweepMove(from, to, radius, query, level=0, allowed=()=>true) {
  let p=pushOut(from,radius,query,level);
  const dx=to.x-from.x,dy=to.y-from.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(1,radius/2)));
  const clear=q=>allowed(q)&&query(q,radius).every(item=>!blocksLevel(item,level)||!penetration(q,radius,item));
  for(let i=0;i<steps;i++) {
    const next={x:p.x+dx/steps,y:p.y+dy/steps};
    if(clear(next)){p=next;continue;}
    // Axis sliding is checked independently, never cutting through a corner.
    const x={x:next.x,y:p.y};if(clear(x))p=x;
    const y={x:p.x,y:next.y};if(clear(y))p=y;
  }
  return p;
}
export function firstWall(from,to,radius,query,level=0) {
  const count=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/Math.max(1,radius)));
  for(let i=0;i<=count;i++){const t=i/count,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
    const hit=query(p,radius).find(item=>blocksLevel(item,level)&&penetration(p,radius,item));if(hit)return hit;}
  return null;
}
