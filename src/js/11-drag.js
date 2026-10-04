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
    if (!slot.active) return;
    slot.ph = { side: 0, left: slot.n };
    start();
  }
}

// rotation à la souris : on saisit un trait et on tourne autour du centre de l'hexagone,
// un cran (360 / n degrés) chaque fois que le pointeur a parcouru un cran (dans un sens ou dans l'autre)
function beginSpin(e, slot) {
  if (e.button !== 0) return;
  const r = slot.g.querySelector('polygon').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const ang = ev => Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  const sx = e.clientX, sy = e.clientY;
  let prev = ang(e), total = 0, applied = 0, moved = false;
  const move = ev => {
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
    moved = true;
    let d = ang(ev) - prev;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    prev = ang(ev); total += d;
    const n = Math.round(total / (360 / slot.n));
    if (n !== applied) { rotateBy(slot, n - applied); applied = n; }
  };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    if (moved) { slot.noClick = true; setTimeout(() => { slot.noClick = false; }, 60); }   // pas de basculement du trait
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}

// sélection multiple : on tire un rectangle sur le fond de la grille (Maj : ajoute à la sélection) ;
// un clic sur le fond désélectionne. Clic droit sur la sélection : menu (supprimer, désactiver...).
const selLayer = el('g', { 'pointer-events': 'none' }, svg);
const selected = () => slots.filter(s => s.sel);
function setSel(slot, on) { if (!!slot.sel !== on) { slot.sel = on; drawSlot(slot); } }
function clearSel() { slots.forEach(s => setSel(s, false)); }
svg.addEventListener('pointerdown', e => {
  if (e.button !== 0 || slotLayer.contains(e.target)) return;
  const p0 = svgPoint(e), sx = e.clientX, sy = e.clientY, add = e.shiftKey;
  let rect = null;
  const move = ev => {
    if (!rect && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
    const p = svgPoint(ev);
    if (!rect) rect = el('rect', { fill: 'var(--yang)', 'fill-opacity': 0.08, stroke: 'var(--yang)', 'stroke-dasharray': '4 3' }, selLayer);
    rect.setAttribute('x', Math.min(p0.x, p.x)); rect.setAttribute('y', Math.min(p0.y, p.y));
    rect.setAttribute('width', Math.abs(p.x - p0.x)); rect.setAttribute('height', Math.abs(p.y - p0.y));
  };
  const up = ev => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (rect) {
      const p = svgPoint(ev), x0 = Math.min(p0.x, p.x), x1 = Math.max(p0.x, p.x), y0 = Math.min(p0.y, p.y), y1 = Math.max(p0.y, p.y);
      rect.remove();
      for (const s of slots) {
        const inside = px(s.gx) >= x0 && px(s.gx) <= x1 && px(s.gy) >= y0 && px(s.gy) <= y1;
        if (inside) setSel(s, true); else if (!add) setSel(s, false);
      }
    } else if (!add) clearSel();
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
});
function deleteSelected() {
  for (const s of selected()) removeSlot(s, true);
  midiPanic(); closeMenu();
}
document.addEventListener('keydown', e => {
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName)) return;
  if (e.key === 'Delete' && selected().length) deleteSelected();
  if (e.key === 'Escape') clearSel();
});
