//: Interaction : glisser-déposer et clic sur un hexagone
// glisser / cliquer
let drag = null;
function svgPoint(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function beginDrag(e, slot) {
  if (e.button !== 0) return;            // clic droit : voir contextmenu
  e.preventDefault();
  const p = svgPoint(e);
  drag = { slot, ox: p.x - px(slot.gx), oy: p.y - px(slot.gy), moved: false, sx: e.clientX, sy: e.clientY };
  try { slot.g.setPointerCapture(e.pointerId); } catch (_) { /* pointeur non capturable */ }
  slot.g.setAttribute('cursor', 'grabbing');
  slot.g.addEventListener('pointermove', onMove);
  slot.g.addEventListener('pointerup', onUp);
  slot.g.addEventListener('pointercancel', onUp);
}
function onMove(e) {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
  drag.moved = true;
  const p = svgPoint(e);
  drag.slot.g.setAttribute('transform', `translate(${p.x - drag.ox},${p.y - drag.oy})`);
}
function onUp(e) {
  if (!drag) return;
  const { slot, moved } = drag;
  slot.g.removeEventListener('pointermove', onMove);
  slot.g.removeEventListener('pointerup', onUp);
  slot.g.removeEventListener('pointercancel', onUp);
  slot.g.setAttribute('cursor', 'grab');
  drag = null;
  if (moved && e.type === 'pointerup') {
    const p = svgPoint(e);
    const gx = Math.max(0, Math.min(N - 1, Math.round((p.x - M) / S)));
    const gy = Math.max(0, Math.min(N - 1, Math.round((p.y - M) / S)));
    if (!slots.some(o => o !== slot && o.gx === gx && o.gy === gy)) { slot.gx = gx; slot.gy = gy; }
    drawSlot(slot);
  } else if (!moved) {
    slot.ph = { side: 0, left: 6 };
    start();
  }
}
