import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { alignStateAlpha, removePinkMatte } from '../scripts/prepare-ui-kit.mjs';
import { sliceSheet } from '../scripts/slice-sheet.mjs';

const manifest = JSON.parse(await fs.readFile(new URL('../src/data/uiKit.json',import.meta.url),'utf8'));
const expected = new Map([
  ['panel-large',256],['panel-small',192],['modal-frame',256],['card-normal',256],['card-selected',256],['card-locked',256],
  ['banner-title',512],['divider-ornament',320],['button-primary',256],['button-primary-pressed',256],['button-primary-disabled',256],
  ['button-secondary',256],['button-secondary-pressed',256],['button-secondary-disabled',256],['button-danger',256],['button-small',160],
  ['button-round',96],['toggle-track-off',128],['toggle-track-on',128],['toggle-knob',64],['slider-track',256],['slider-fill',256],
  ['slider-knob',64],['select-frame',256],['tab-active',192],['tab-inactive',192],['scroll-track',32],['scroll-thumb',32],
  ['chip-frame',192],['hud-bar-frame',384],['hud-circle-frame',128],['loading-bar-frame',640],['loading-bar-fill',640],
  ['vine-corner-tl',160],['torch-0',96],['torch-1',96],['torch-2',96],['torch-3',96],
  ['bg-hero-select',1920],['bg-map-select',1920],['bg-subpage',1920],
]);
const raw = async id => sharp(`public/${manifest.items.find(item=>item.id===id).path}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const alpha = data => Buffer.from(data.filter((_,index)=>index%4===3));

test('V2 kit contains exactly the 41 requested ids, separate files and exact longest sides',async()=>{
  assert.equal(manifest.items.length,41); assert.equal(manifest.units,'px');
  assert.deepEqual(manifest.items.map(item=>item.id),[...expected.keys()]);
  assert.equal(new Set(manifest.items.map(item=>item.path)).size,41);
  for (const item of manifest.items) {
    assert.equal(item.path,`assets/ui/${item.type==='background'?'bg':'kit'}/${item.id}.${item.type==='background'?'webp':'png'}`);
    const meta = await sharp(`public/${item.path}`).metadata();
    assert.deepEqual(item.size,{width:meta.width,height:meta.height},item.id);
    assert.equal(Math.max(meta.width,meta.height),expected.get(item.id),item.id);
    assert.equal(meta.format,item.type==='background'?'webp':'png',item.id);
    if (item.type==='background') assert.deepEqual(item.size,{width:1920,height:1080});
    else assert.equal(meta.hasAlpha,true,item.id);
  }
});

test('every finished kit PNG has a transparent surround and no residual magenta matte',async()=>{
  for (const item of manifest.items.filter(item=>item.type!=='background')) {
    const {data,info} = await raw(item.id);
    let visible = 0,transparent = 0,pink = 0;
    for (let i=0;i<data.length;i+=4) {
      if (!data[i+3]) transparent++; else {
        visible++;
        if (data[i]>data[i+1]+30 && data[i+2]>data[i+1]+30) pink++;
      }
    }
    assert.ok(visible>0 && transparent>0,`${item.id}: empty image or missing cutout`);
    assert.equal(pink,0,`${item.id}: magenta/purple keyed fringe`);
    assert.equal(data[3],0,`${item.id}: top-left corner is not transparent`);
    assert.equal(data[(info.width-1)*4+3],0,`${item.id}: top-right corner is not transparent`);
  }
});

test('no final asset reuses another image (file and decoded-pixel hashes)',async()=>{
  const files=[],pixels=[];
  for (const item of manifest.items) {
    files.push(crypto.createHash('sha256').update(await fs.readFile(`public/${item.path}`)).digest('hex'));
    pixels.push(crypto.createHash('sha256').update((await raw(item.id)).data).digest('hex'));
  }
  assert.equal(new Set(files).size,41); assert.equal(new Set(pixels).size,41);
});

test('normal/pressed/disabled button states and card states share exact silhouettes but retain different art',async()=>{
  for (const ids of [['button-primary','button-primary-pressed','button-primary-disabled'],['button-secondary','button-secondary-pressed','button-secondary-disabled'],['card-normal','card-selected','card-locked'],['toggle-track-off','toggle-track-on'],['tab-active','tab-inactive']]) {
    const normal = await raw(ids[0]);
    for (const id of ids.slice(1)) {
      const state = await raw(id);
      assert.deepEqual([state.info.width,state.info.height],[normal.info.width,normal.info.height],id);
      assert.deepEqual(alpha(state.data),alpha(normal.data),`${id}: silhouette jumps`);
      assert.notDeepEqual(state.data,normal.data,`${id}: reused normal artwork`);
    }
  }
});

test('all 28 resizable kit entries have safe positive integer nine-slice caps',()=>{
  const sliced = manifest.items.filter(item=>item.type==='nine-slice'); assert.equal(sliced.length,28);
  for (const item of sliced) {
    assert.deepEqual(Object.keys(item.sliceInsets),['top','right','bottom','left']);
    for (const value of Object.values(item.sliceInsets)) assert.ok(Number.isInteger(value)&&value>0,item.id);
    const {top,right,bottom,left}=item.sliceInsets;
    assert.ok(left+right<item.size.width && top+bottom<item.size.height,item.id);
  }
  for (const item of manifest.items.filter(item=>item.type!=='nine-slice')) assert.equal(item.sliceInsets,undefined);
  const select = manifest.items.find(item=>item.id==='select-frame');
  assert.ok(select.sliceInsets.right>select.sliceInsets.left,'right-hand chevron stays in end cap');
});

test('torch poses share one canvas, common bottom baseline, and unique flame imagery',async()=>{
  const dimensions=[],bottoms=[],hashes=[];
  for (let n=0;n<4;n++) {
    const {data,info}=await raw(`torch-${n}`); dimensions.push([info.width,info.height]);
    let bottom=-1; for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>20)bottom=y;
    bottoms.push(bottom); hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.deepEqual(dimensions,Array.from({length:4},()=>[49,96]));
  assert.equal(new Set(bottoms).size,1); assert.equal(new Set(hashes).size,4);
});

test('subpage backdrop is calmer/darker than hero selection and all backgrounds are 16:9',async()=>{
  const luminance = async id => {const {data}=await sharp(`public/${manifest.items.find(item=>item.id===id).path}`).resize(96,54).removeAlpha().raw().toBuffer({resolveWithObject:true});let total=0;for(let i=0;i<data.length;i+=3)total+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];return total/(data.length/3);};
  assert.ok(await luminance('bg-subpage')<await luminance('bg-hero-select'));
});

test('matte cleanup rejects pink while keeping gold, jade, dark stone and red',()=>{
  const input=Buffer.from([255,0,255,255,140,50,140,80,255,207,74,255,61,224,176,255,23,27,32,255,180,20,25,255]);
  const clean=removePinkMatte(input);
  assert.deepEqual([...clean.subarray(0,8)],Array(8).fill(0));
  assert.deepEqual(clean.subarray(8),input.subarray(8)); assert.equal(input[3],255,'must not mutate input');
});

test('state geometry alignment uses normal alpha but never copies normal RGB',()=>{
  const normal=Buffer.alloc(3*3*4),state=Buffer.alloc(3*3*4);
  normal.set([200,150,10,255],4); normal.set([200,150,10,128],16); normal.set([200,150,10,255],28);
  state.set([12,100,120,255],0); state.set([20,110,130,255],12); state.set([25,120,140,255],24);
  const aligned=alignStateAlpha(normal,state,3,3);
  assert.deepEqual(alpha(aligned),alpha(normal));
  for(let i=0;i<aligned.length;i+=4)if(aligned[i+3])assert.ok(aligned[i]<30 && aligned[i+2]>=120,'state RGB retained');
  assert.throws(()=>alignStateAlpha(normal,Buffer.alloc(36),3,3),/Empty state/);
});

test('kit source provenance is retained and explicitly distinguishes requested model from unexposed routing',async()=>{
  const sources=JSON.parse(await fs.readFile('docs/v0.6/UI_KIT_SOURCES.json','utf8'));
  assert.equal(sources.requestedModel,'gpt-image-2.5'); assert.equal(sources.requestedVariant,'Flare');
  assert.match(sources.actualModel,/not exposed/); assert.equal(sources.jobs.length,6);
  for(const job of sources.jobs){assert.ok(job.prompt.length>200);await fs.access(job.source);}
});

test('shared-scale bottom anchoring preserves frame size and existing default slicing is centered',async()=>{
  const prefix=path.resolve('docs/v0.6/previews/ui-kit/slicer-test-'),dir=await fs.mkdtemp(prefix);
  try {
    const rgba=Buffer.alloc(80*60*4);
    // Two different flame heights, same six-pixel-wide stand.
    for(let y=10;y<50;y++)for(let x=10;x<16;x++)rgba.set([200,130,30,255],(y*80+x)*4);
    for(let y=20;y<50;y++)for(let x=50;x<56;x++)rgba.set([200,130,30,255],(y*80+x)*4);
    const source=path.join(dir,'fixture.png'),file=path.join(dir,'manifest.json');
    await sharp(rgba,{raw:{width:80,height:60,channels:4}}).png().toFile(source);
    const data={expectedCount:2,columns:2,rows:1,background:'transparent',outputDir:path.relative(process.cwd(),dir),items:[{file:'a.png',width:20,height:40,spriteScale:.5,anchor:'bottom'},{file:'b.png',width:20,height:40,spriteScale:.5,anchor:'bottom'}]};
    await fs.writeFile(file,JSON.stringify(data)); await sliceSheet(source,file);
    const bounds=async name=>{const {data,info}=await sharp(path.join(dir,name)).raw().toBuffer({resolveWithObject:true});let top=40,bottom=-1;for(let y=0;y<40;y++)for(let x=0;x<20;x++)if(data[(y*info.width+x)*4+3]>20){top=Math.min(top,y);bottom=y;}return{top,bottom};};
    assert.deepEqual(await bounds('a.png'),{top:17,bottom:36}); assert.deepEqual(await bounds('b.png'),{top:22,bottom:36});
    const centered={...data,items:[{file:'c.png',width:20,height:40},{file:'d.png',width:20,height:40}]};
    await fs.writeFile(file,JSON.stringify(centered)); await sliceSheet(source,file);
    const center=await bounds('c.png'); assert.ok(Math.abs(center.top-(39-center.bottom))<=1);
    await fs.writeFile(file,JSON.stringify({...data,items:[{...data.items[0],spriteScale:0},data.items[1]]}));
    await assert.rejects(sliceSheet(source,file),/spriteScale must be positive/);
    await fs.writeFile(file,JSON.stringify({...data,expectedCount:1,items:[data.items[0]]}));
    await assert.rejects(sliceSheet(source,file),/Sprite count mismatch: expected 1.*found 2/);
  } finally {
    assert.ok(dir.startsWith(prefix),'cleanup restricted to this generated fixture directory');
    await fs.rm(dir,{recursive:true,force:true});
  }
});
