// Move rendered pixels upward without moving feet or physics bodies. Restore
// the original origin/offset on descent; never alter damage or actor alpha.
export function applyElevation(actor,height) {
  if(!actor?.setOrigin||!actor.height)return;
  const previous=actor.getData?.('renderElevation')||0;
  if(previous===height)return;
  const scale=Math.abs(actor.scaleY)||1,delta=(height-previous)/scale;
  const offset=actor.body?.offset;
  const ox=offset?.x,oy=offset?.y;
  actor.setOrigin(actor.originX,actor.originY+delta/actor.height);
  if(offset)actor.body.setOffset(ox,oy+delta);
  actor.setData('renderElevation',height);
}
