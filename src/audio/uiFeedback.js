// One delegated set of listeners works for menu and paused-game overlays and
// is removed with the director. Gameplay controls are deliberately excluded.
export function bindAudioFeedback(audio,root=globalThis.document) {
  if(!root?.addEventListener)return ()=>{};
  let drag=false,lastCard=null;
  const click=event=>{const b=event.target.closest?.('button');if(!b||b.disabled||b.closest('.hud')&&!b.closest('.modal-backdrop')||b.matches('[data-toggle],[data-settings-tab],[data-hero],[data-map]'))return;
    const id=b.matches('[data-back],[data-editor-action="cancel"],[data-editor-action="transfer-back"]')?'button-back':b.matches('.ghost,.secondary')?'button-secondary':b.matches('.choice-card,[data-card-kind]')?'card-confirm':'button-primary';
    audio.lastUiClick=performance.now();audio.ui(id);
  };
  const over=event=>{const card=event.target.closest?.('.choice-card,.hero-selection-card,.map-selection-card');if(card&&card!==lastCard)audio.ui('card-hover');lastCard=card;};
  const down=event=>{drag=!!event.target.closest?.('[data-drag]:not(.locked)');if(drag)audio.ui('hud-edit-pick');};
  const up=()=>{if(drag)audio.ui('hud-edit-drop');drag=false;};
  const snap=event=>{if(event.target.closest?.('[data-editor-action="snap"]'))audio.ui('hud-edit-snap');};
  const listeners={click,pointerover:over,pointerdown:down,pointerup:up,pointercancel:up};
  for(const [name,listener]of Object.entries(listeners))root.addEventListener(name,listener,true);
  root.addEventListener('click',snap);
  return ()=>{for(const [name,listener]of Object.entries(listeners))root.removeEventListener(name,listener,true);root.removeEventListener('click',snap);};
}
