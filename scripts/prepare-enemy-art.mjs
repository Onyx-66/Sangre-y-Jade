import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { detectSpriteCells,sliceSheet } from './slice-sheet.mjs';

const root=path.resolve(import.meta.dirname,'..');
const preview=path.join(root,'docs/v0.6/previews/v9');
const sources=path.join(root,'art-source/v0.6/enemies');
const candidate=path.join(root,'.tools/v9-candidate/pixel');
export const baseEnemies=['shade','bat','jaguar','serpent','priest'];
export const enemyBriefs={
 shade:'Preserve the reference first-row design: ivory skull with glowing jade eyes, turquoise torn feather-hood and ghost robes, tiny gold jade medallion, skeletal hands. A Lost Shade, hovering undead Maya spirit. Windup: low crouching forward curl. Attack: full forward lunge with claw extended. Death: progressively unravel into green spirit fragments.',
 bat:'Preserve the reference second-row design: purple body, magenta wing membranes, red eyes, long ivory fangs and pointed ears. Cave Bat. Walk is a four-pose wing flap while hovering; windup pulls wings high; attack dives forward with wings swept back. Death crumples and dissolves into violet/green wisps.',
 jaguar:'Preserve the reference third-row design exactly: muscular upright spotted amber jaguar warrior, jade eyes, gold jade neck collar and turquoise decorations, red loincloth, long wooden obsidian-tipped spear and curved spotted tail. Windup crouches for a pounce, attack bounds forward with spear and claws. Death collapses into green-gold spirit sparks.',
 serpent:'Preserve the reference fourth-row design: coiled turquoise scaled serpent with exposed ivory rib plates, ivory skull head, glowing jade eyes, upright curved neck and bone rattle tail. Bone Serpent. Walk undulates side to side, windup coils its tail, attack sweeping tail whip and raised open skull jaws. Death scatters ivory bones and green wisps.',
 priest:'Preserve the reference fifth-row design: ivory skull face, long purple hood and robes with ornate gold trim, jade medallion, gold hanging censer with jade smoke, skeletal hands. Hollow Priest. Windup raises glowing hands, attack thrusts a hand to cast pale green skull magic. Death knees buckle then robes dissolve into green smoke.',
 vine_lurker:'A hunched thorny jungle vine creature, bulbous wooden root torso, twisting root legs and claw tendrils, leaf mantle, amber seed eyes, no human clothes. Deep moss green and bark brown with jade sap. Windup coils vine claws into a circle; attack bursts thorn tendrils outward into a root snare. Death wilts and disperses into green leaves.',
 stone_guardian:'A broad blocky ancient Maya stone sentinel with grey-brown carved mask head, gold glyph inlays, jade eyes, massive rectangular carved shield on left arm and heavy stone right fist, squat stone legs. Windup raises giant stone fist; attack slams downward, shield remains recognizable. Death crumbles into brown rocks and green jade sparks.',
 jungle_wasp:'A giant narrow-bodied jungle wasp, black and amber segmented abdomen, jade glowing mouth, six thin legs and four translucent pale teal wings. Distinct insect silhouette, no bat wings. Walk is four-pose wing flap. Windup swells green mouth, attack spits a bright green venom glob. Death curls legs and dissipates into green droplets.',
 blood_wraith:'A lean crimson-black hooded undead Maya assassin with ivory half skull mask, red glowing eyes, ragged crimson scarf, dark cloak, two small obsidian daggers. Windup fading body curls forward for a blink; attack lunges in twin crimson dagger slash. Death shreds into red-black smoke.',
 bone_archer:'An ivory skeletal Maya archer with red cloth headband and feather, dark brown leather chest strap, red skirtcloth, large carved curved bone bow and arrow. Windup unmistakably drawing the bowstring to skull cheek; attack releases a bone arrow toward the right. Death falls as separated bones and red wisps.',
 moon_cultist:'A robed Maya moon cultist wearing midnight blue robes with crimson and silver crescent ornaments, long angular ivory ritual mask, red eyes, crescent-topped wooden staff. Different silhouette and clothing from purple skull priest. Windup lifts staff, attack circles red rune magic with one hand to summon shades. Death robe collapses into red wisps.',
 drowned_spirit:'A lean tall translucent aqua drowned spirit, teal half-skeletal face with long waterfall-blue hair streaming DOWN, long thin dripping watery arms, exposed spectral ribs, ragged off-white burial bandages and dangling dark kelp around thin legs. No hood, no feather cloak, no medallion, no gold robe, no teal feather mantle: it must NOT resemble the Lost Shade. Distinct slender water-corpse silhouette with blue drooping seaweed and pale bone bandages. Windup gathers a round water orb, attack pours glowing blue water down to form a puddle. Death melts into cyan water droplets.',
 abyssal_eel:'A long low swimming spectral abyssal eel, deep navy body with cyan luminous spine fins, narrow fanged skull-like head, electric jade-cyan whiskers, sinuous long tail. Horizontal elongated eel not upright coiled bone serpent. Windup coils its body and brightens cyan fins; attack shoots forward straight in a charging bite. Death curls and scatters cyan sparks.',
 crystal_golem:'A massive angular cyan crystal golem with faceted translucent blue gemstone torso and fists, charcoal rock joints, flat crystalline mask face, tiny gold Maya rune belt, glowing cyan eyes. Broad silhouette unlike stone guardian, no shield. Windup both crystal fists raised; attack punches down and shines a prism shield. Death breaks into faceted cyan shards.',
 glow_wisp:'A small hovering cyan-white spirit orb with a simple bright core face, two light eyes, tapered cyan flame tail and three tiny floating sparks. Not a bat or an eel. Walk orbit swirls. Windup swells its bright core for a fuse; attack radiates a cyan flash but retains visible orb. Death shrinks and harmlessly evaporates into cyan motes.',
};
export function actorPrompt(id){return `Create ONE production pixel-art sprite animation sheet. Requested gpt-image-2.5 Flare. Image 2048 x 2048, precisely FOUR rows and FOUR columns of equally sized 512 x 512 cells, EXACTLY SIXTEEN separated character poses, no empty cells. Flat solid magenta #FF00FF around and between every sprite, no gradients in the background, no floor lines drawn, no captions, no letters, no numbers, no watermark, no UI frames. Warm Maya jungle fantasy, crisp deliberately pixelated edges and sparse dark outline, match the supplied existing game sprites (reference is a style/design reference, not a layout).\nCharacter: ${enemyBriefs[id]}\nOne identical individual throughout: same clothes, proportions, face, weapon, palette, detail and pixel scale in all cells. Every pose SIDE VIEW FACING RIGHT, no front/back view. Figure entirely inside each cell with generous 40 px margins and no stray sprite crossing gutters. Keep the same full standing height in normal frames; do not enlarge a crouch or death remnant. SAME ground baseline near y=448 inside each cell (hovering actors consistently float slightly above it); centered hip/root x=256. No drawn ground shadow (engine adds it). Small action effects attached to the body only, cannot obscure the character.\nReading order is FIXED: row1 idle-0 (neutral), idle-1 (breathing), walk-0, walk-1; row2 walk-2, walk-3, windup-0 (prepare), windup-1 (anticipation); row3 attack-0 (strong readable roster attack), attack-1 (follow-through), recover (settle), hurt (recoil); row4 death-0 (collapse), death-1 (further collapse), death-2 (dissolving fragments), death-3 (small remnants, NOT another living character). Two idle poses and four walk poses must differ enough for a smooth small animation. No sprite should change into another character. The character must be recognizable at 64 px.`;}

export async function referenceContact(){
  await fs.mkdir(preview,{recursive:true});
  const layers=[];
  for(const [row,id] of baseEnemies.entries())for(let frame=0;frame<4;frame++){
    const input=path.join(root,`public/assets/pixel/frames/enemy-${id}-${frame}.png`);
    layers.push({input:await sharp(input).resize(256,256,{kernel:'nearest'}).png().toBuffer(),left:frame*256,top:row*256});
  }
  const output=path.join(preview,'base-enemies-reference.png');
  await sharp({create:{width:1024,height:1280,channels:4,background:'#29251f'}}).composite(layers).png().toFile(output);
  return output;
}
export async function prepareSheet(entry){
 await fs.mkdir(sources,{recursive:true});await fs.mkdir(preview,{recursive:true});
 for(const [i,attempt]of (entry.attempts||[]).entries()){
  const retained=path.join(sources,`${entry.id}-rejected-${i+1}.png`);
  try{await fs.access(attempt);await fs.copyFile(attempt,retained);}catch(error){if(error.code!=='ENOENT')throw error;await fs.access(retained);}
 }
 const original=path.join(sources,`${entry.id}-original.png`),normalized=path.join(sources,`${entry.id}-sheet.png`);
 try{await fs.access(entry.source);await fs.copyFile(entry.source,original);}catch(error){if(error.code!=='ENOENT')throw error;await fs.access(original);}
 const meta=await sharp(original).metadata();
 await sharp(original).resize(2048,2048,{kernel:'nearest'}).png().toFile(normalized);
 const effects=entry.id.startsWith('effects-');
 const {data,info}=await sharp(normalized).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const detected=detectSpriteCells(data,info.width,info.height,'magenta',4,4,{collectLabels:true});
 const ids=effects?entry.effects:Object.keys(enemyBriefs);
 const count=effects?entry.effects.length:16;
 if(detected.cells.size!==count)throw Error(`${entry.id}: expected ${count} cells, got ${detected.cells.size}`);
 const bounds=[...detected.cells.values()];let largest=Math.max(...bounds.map(b=>Math.max(b.right-b.left+1,b.bottom-b.top+1)));
 // Reflow complete components to correct narrow model-generated gutters.
 // Never crop a limb to a nominal grid boundary or magnify a death remnant.
 const layers=[];
 for(const [cell,b]of detected.cells){const width=b.right-b.left+1,height=b.bottom-b.top+1,scale=448/largest;
  const pixels=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const source=(b.top+y)*info.width+b.left+x,target=(y*width+x)*4;
   if(detected.labels[source]===cell)data.copy(pixels,target,source*4,source*4+4);
   else{pixels[target]=255;pixels[target+2]=255;pixels[target+3]=255;}}
  const fitted=await sharp(pixels,{raw:{width,height,channels:4}}).resize(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)),{kernel:'nearest'}).png().toBuffer();
  const m=await sharp(fitted).metadata();layers.push({input:fitted,left:cell%4*512+Math.floor((512-m.width)/2),top:Math.floor(cell/4)*512+(effects?Math.floor((512-m.height)/2):448-m.height)});
 }
 const reflowed=await sharp({create:{width:2048,height:2048,channels:4,background:'#ff00ff'}}).composite(layers).png().toBuffer();
 await fs.writeFile(normalized,reflowed);largest=448;
 const manifest={expectedCount:count,columns:4,rows:4,background:'magenta',outputDir:path.relative(root,candidate),
  contactSheet:path.relative(root,path.join(preview,`${entry.id}-contact.png`)),
  items:Array.from({length:count},(_,i)=>effects?{file:`fx/${ids[i].id}/main.png`,width:256,height:256}:
   {file:`frames/enemy-${entry.id}-${i}.png`,width:128,height:128,spriteScale:118/largest,anchor:'bottom'})};
 const manifestPath=path.join(sources,`${entry.id}-manifest.json`);
 await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 await sliceSheet(normalized,manifestPath,undefined,{overwrite:true});
 // A 4x4 contact preserves the exact animation order and exposes baseline jitter.
 if(!effects){const layers=[];for(let i=0;i<16;i++)layers.push({input:await sharp(path.join(candidate,manifest.items[i].file)).resize(256,256,{kernel:'nearest'}).png().toBuffer(),left:i%4*256,top:Math.floor(i/4)*256});
  await sharp({create:{width:1024,height:1024,channels:4,background:'#29251f'}}).composite(layers).png().toFile(path.join(preview,`${entry.id}-contact.png`));}
 return {id:entry.id,sourceSize:[meta.width,meta.height],count,largest};
}
export async function promote(entries){
 // Preserve all original base frames before replacing the canonical paths.
 const legacy=path.join(sources,'legacy');await fs.mkdir(legacy,{recursive:true});
 for(const id of baseEnemies)for(let i=0;i<4;i++){const file=`enemy-${id}-${i}.png`,backup=path.join(legacy,file);
  try{await fs.access(backup);}catch(error){if(error.code!=='ENOENT')throw error;await fs.copyFile(path.join(root,'public/assets/pixel/frames',file),backup);}}
 for(const entry of entries){const files=entry.effects?entry.effects.map(effect=>`fx/${effect.id}/main.png`):Array.from({length:16},(_,i)=>`frames/enemy-${entry.id}-${i}.png`);
  for(const file of files){const output=path.join(root,'public/assets/pixel',file);await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(path.join(candidate,file),output);}}
 console.log(`Promoted ${entries.length} inspected sheets; originals preserved in ${path.relative(root,legacy)}`);
}
const command=process.argv[2];
if(command==='references')console.log(await referenceContact());
if(command==='prompts')console.log(JSON.stringify(Object.keys(enemyBriefs).map(id=>({id,prompt:actorPrompt(id)}))));
if(['prepare','promote'].includes(command)){
 const entries=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
 const selected=process.argv[4]?entries.filter(entry=>entry.id===process.argv[4]):entries;
 if(command==='prepare')for(const entry of selected)console.log(JSON.stringify(await prepareSheet(entry)));
 else await promote(selected);
}
