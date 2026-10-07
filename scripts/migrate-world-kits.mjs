// Mechanical metadata migration only: preserve authored art, footprint sizes,
// anchors and layout seeds; add explicit object kind/overhead/door/level fields.
import { readFile, writeFile } from 'node:fs/promises';
import { normalizeKit, inferKind } from '../src/world/objects.js';
for(const id of ['overgrown','bloodmoon','cenote']) {
  const path=`src/data/mapKits/${id}.json`,raw=JSON.parse(await readFile(path,'utf8'));
  // Upgrade generated metadata, not art or layout placement. An altar is not
  // a house and must not acquire a floating door merely by category.
  for(const item of raw.items){item.kind=inferKind({...item,kind:undefined});item.door=null;}
  const kit=normalizeKit(raw);
  await writeFile(path,JSON.stringify(kit,null,2)+'\n');
  console.log(`${id}: ${kit.items.length} object definitions`);
}
