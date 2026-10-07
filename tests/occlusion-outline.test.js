// Regression for the sprite-shaped outline and its texture lifecycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { OcclusionOutline } from '../src/render/OcclusionOutline.js';
test('outline follows alpha edges, leaves the actor interior transparent and releases its cache',()=>{
  const pixels=new Uint8ClampedArray(7*7*4);pixels[(3*7+3)*4+3]=255;
  let result,removed;
  const context={drawImage(){},getImageData:()=>({data:pixels}),createImageData:()=>({data:new Uint8ClampedArray(pixels.length)}),putImageData(image){result=image.data;}};
  const scene={textures:{exists:()=>false,createCanvas:()=>({getContext:()=>context,refresh(){}}),remove(key){removed=key;}}};
  const outline=new OcclusionOutline(scene,39000);
  const actor={frame:{name:'pose',cutX:0,cutY:0,cutWidth:7,cutHeight:7},texture:{key:'hero',getSourceImage:()=>({})}};
  const key=outline.texture(actor);assert.equal(result[(3*7+3)*4+3],0,'interior is not a filled ghost');
  assert.equal(result[(3*7+2)*4+3],230);assert.equal(result[3],0,'distant transparent pixels stay clear');
  assert.equal(outline.keys.size,1);outline.destroy();assert.equal(removed,key);assert.equal(outline.keys.size,0);
});
