// Worker-only generation keeps noise, validation and retry work off rendering.
import {generateWorld} from './index.js';
self.onmessage=({data})=>{try{const world=generateWorld(data.mapId,data.seed,undefined,progress=>self.postMessage({progress}));self.postMessage({world});}catch(error){self.postMessage({error:error.message});}};
