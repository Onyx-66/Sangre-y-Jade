const controls = root => [...root.querySelectorAll('[data-ui-focus]:not(:disabled),[data-language]')]
  .filter(el => el.getClientRects().length && !el.closest('[hidden]'));

// Spatial navigation also follows the visual order when a menu is RTL.
export function moveKitFocus(root, dx, dy) {
  const all = controls(root), current = root.ownerDocument.activeElement;
  if (!all.includes(current)) { all[0]?.focus(); return all[0]; }
  const origin = current.getBoundingClientRect();
  const x = origin.x + origin.width / 2, y = origin.y + origin.height / 2;
  const candidates = all.filter(el => el !== current).map(el => {
    const box = el.getBoundingClientRect(), ox = box.x + box.width / 2 - x, oy = box.y + box.height / 2 - y;
    return { el, forward: ox * dx + oy * dy, cross: Math.abs(ox * dy - oy * dx) };
  }).filter(item => item.forward > 1).sort((a, b) => (a.forward + a.cross * 3) - (b.forward + b.cross * 3));
  const next = candidates[0]?.el;
  next?.focus();
  return next || current;
}

export function bindKitNavigation(root, { host = window, gamepads = () => navigator.getGamepads?.() || [] } = {}) {
  const initialPad = [...gamepads()].find(Boolean);
  let raf, disposed = false, lastMove = -Infinity, previousConfirm = !!initialPad?.buttons[0]?.pressed, previousBack = !!initialPad?.buttons[1]?.pressed;
  const back = () => root.querySelector('[data-back]')?.click();
  const onKey = event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !root.isConnected) return;
    if (event.key === 'Escape') { if (root.querySelector('[data-back]')) { event.preventDefault(); back(); } return; }
    if (event.target?.tagName === 'SELECT') return; // Native language select retains its arrow keys.
    const details = event.target?.closest?.('.kit-card')?.querySelector('.selection-details');
    if (details && ['PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') details.scrollTop = 0;
      else if (event.key === 'End') details.scrollTop = details.scrollHeight;
      else details.scrollTop += details.clientHeight * (event.key === 'PageDown' ? 1 : -1);
      return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (directions[event.key]) { event.preventDefault(); moveKitFocus(root, ...directions[event.key]); }
  };
  const onPointer = () => { delete root.dataset.gamepadFocus; };
  const poll = now => {
    if (disposed || !root.isConnected) return;
    const pad = [...gamepads()].find(Boolean);
    if (pad) {
      const pressed = n => !!pad.buttons[n]?.pressed;
      const dx = pressed(15) ? 1 : pressed(14) ? -1 : Math.abs(pad.axes[0] || 0) > .6 ? Math.sign(pad.axes[0]) : 0;
      const dy = pressed(13) ? 1 : pressed(12) ? -1 : Math.abs(pad.axes[1] || 0) > .6 ? Math.sign(pad.axes[1]) : 0;
      if ((dx || dy) && now - lastMove >= 200) {
        root.dataset.gamepadFocus = 'true'; moveKitFocus(root, dx, dy); lastMove = now;
      }
      const confirm = pressed(0), cancel = pressed(1);
      if (confirm && !previousConfirm) {
        root.dataset.gamepadFocus = 'true';
        const current = root.ownerDocument.activeElement;
        // The browser owns the native select popup; A never activates another control behind it.
        if (controls(root).includes(current)) { if (current.tagName !== 'SELECT') current.click(); }
        else controls(root)[0]?.focus();
      }
      if (cancel && !previousBack) back();
      previousConfirm = confirm; previousBack = cancel;
    } else { previousConfirm = false; previousBack = false; }
    if (!disposed) raf = host.requestAnimationFrame(poll);
  };
  root.ownerDocument.addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', onPointer);
  raf = host.requestAnimationFrame(poll);
  return () => {
    disposed = true; host.cancelAnimationFrame(raf);
    root.ownerDocument.removeEventListener('keydown', onKey); root.removeEventListener('pointerdown', onPointer);
  };
}

export function activateKitOverlay(root) {
  const dispose = bindKitNavigation(root);
  const observer = new MutationObserver(() => {
    if (!root.isConnected) { dispose(); observer.disconnect(); }
  });
  observer.observe(root.ownerDocument.body, { childList: true, subtree: true });
  return root;
}
