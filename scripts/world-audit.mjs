// Serial B4 audit: 900 seeds, a strict desktop generation budget, stable hashes
// and retained-heap evidence. Never touches assets or external services.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {generateWorld} from '../src/world/generator/index.js';
import {validateWorld} from '../src/world/generator/validate.js';
const report={maps:[],fixtures:{},heap:[]};
for(const map of ['overgrown','bloodmoon','cenote']){
 global.gc?.();report.heap.push(process.memoryUsage().heapUsed);const times=[];let connectivity=1,retries=0;
 for(let seed=0;seed<300;seed++){
  const start=performance.now(),w=generateWorld(map,String(seed)),ms=performance.now()-start;times.push(ms);retries+=w.attempt;
  const result=validateWorld(w);assert.ok(result.valid,`${map}/${seed}: ${result.errors}`);connectivity=Math.min(connectivity,result.connectivity);assert.ok(ms<600,`${map}/${seed} exceeded 600ms: ${ms}`);
 }
 times.sort((a,b)=>a-b);report.maps.push({map,seeds:300,meanMs:times.reduce((a,b)=>a+b)/300,p95Ms:times[284],maxMs:times[299],minimumConnectivity:connectivity,retries});
 report.fixtures[map]=generateWorld(map,'portable-jade').hash;
}
global.gc?.();report.heap.push(process.memoryUsage().heapUsed);report.heapGrowthBytes=report.heap.at(-1)-report.heap[1];
assert.ok(report.heapGrowthBytes<16*1024*1024,'Unbounded retained generation heap');
await mkdir('docs/v0.6/previews/b4',{recursive:true});await writeFile('docs/v0.6/previews/b4/generation-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
