// Finite navigation grid and deterministic cardinal least-cost paths. Cardinal
// edges forbid corner cutting; 128px cells leave room for an actor on roads.
export const CELL=128,WIDTH=8192,HEIGHT=6144,WALL=400;
export function pointAt(w,i){return {x:-w.size.width/2+(i%w.columns+.5)*CELL,y:-w.size.height/2+(Math.floor(i/w.columns)+.5)*CELL};}
export function indexAt(w,x,y){const c=Math.floor((x+w.size.width/2)/CELL),r=Math.floor((y+w.size.height/2)/CELL);return c<0||r<0||c>=w.columns||r>=w.rows?-1:r*w.columns+c;}
export function neighbors(w,i){const c=i%w.columns,r=Math.floor(i/w.columns),a=[];if(c)a.push(i-1);if(c+1<w.columns)a.push(i+1);if(r)a.push(i-w.columns);if(r+1<w.rows)a.push(i+w.columns);return a;}
export function inside(w,p,margin=0){return p.x>=w.bounds.left+margin&&p.x<=w.bounds.right-margin&&p.y>=w.bounds.top+margin&&p.y<=w.bounds.bottom-margin;}
class Heap{
  a=[];
  push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p][0]<=v[0])break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
  pop(){const out=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1][0]<this.a[c][0])c++;if(this.a[c][0]>=v[0])break;this.a[i]=this.a[c];i=c;}this.a[i]=v;}return out;}
}
export function route(w,start,end,cost){
  if(start<0||end<0)return [];const n=w.columns*w.rows,d=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),heap=new Heap();d[start]=0;heap.push([0,start]);
  while(heap.a.length){const [distance,i]=heap.pop();if(distance!==d[i])continue;if(i===end)break;
    for(const next of neighbors(w,i)){const c=cost(next);if(!Number.isFinite(c))continue;const v=distance+c;if(v<d[next]){d[next]=v;prev[next]=i;heap.push([v,next]);}}
  }
  if(!Number.isFinite(d[end]))return [];const path=[];for(let i=end;i!==-1;i=prev[i]){path.push(i);if(i===start)break;}return path.reverse();
}
export function flood(w,blocked){const start=indexAt(w,0,0),seen=new Uint8Array(blocked.length),queue=[start];seen[start]=1;for(let j=0;j<queue.length;j++)for(const i of neighbors(w,queue[j]))if(!seen[i]&&!blocked[i]){seen[i]=1;queue.push(i);}return seen;}
