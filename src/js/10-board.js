//: Plateau SVG : grille, dessin d'un hexagone (drawSlot), rotation visuelle
// ---------- Dessin ----------
const svg = document.getElementById('board');
const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

// points de la grille ; la taille du plateau suit NX et NY
const gridLayer = el('g', {}, svg);
function drawGrid() {
  svg.setAttribute('viewBox', `0 0 ${2 * M + (NX - 1) * S} ${2 * M + (NY - 1) * S}`);
  svg.setAttribute('aria-label', t('grid.aria', NX, NY));
  while (gridLayer.firstChild) gridLayer.removeChild(gridLayer.firstChild);
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++)
    el('circle', { cx: px(x), cy: px(y), r: 2.5, fill: 'var(--grid)' }, gridLayer);
}
drawGrid();
const slotLayer = el('g', {}, svg);
const pulseLayer = el('g', { 'pointer-events': 'none' }, svg);

// crée le groupe SVG d'un hexagone (appelé à la création de l'hexagone)
function buildSlotView(slot) {
  slot.g = el('g', { cursor: 'grab' }, slotLayer);
  // clic droit : menu (rotation, notes). Molette : bas = rotation horaire, haut = antihoraire
  slot.g.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    if (slot.sel && slots.filter(s => s.sel).length > 1) openSelMenu(e.clientX, e.clientY);   // sélection multiple
    else openMenu(slot, e.clientX, e.clientY);
  });
  let lastWheel = 0;
  slot.g.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.timeStamp - lastWheel < 120) return;
    lastWheel = e.timeStamp;
    rotateBy(slot, e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  drawSlot(slot);
}

function drawSlot(slot) {
  const g = slot.g;
  g.setAttribute('opacity', slot.active ? 1 : 0.3);      // inactif : grisé
  while (g.firstChild) g.removeChild(g.firstChild);
  g.setAttribute('transform', `translate(${px(slot.gx)},${px(slot.gy)})`);

  const n = slot.n;
  const pts = Array.from({ length: n }, (_, k) => vertexAt(270 + sideAng(k, n) - 180 / n).join(',')).join(' ');
  const body = el('polygon', { points: pts, fill: 'var(--body)', stroke: slot.sel ? 'var(--yang)' : 'var(--edge)', 'stroke-width': slot.sel ? 2.5 : 1 }, g);
  body.addEventListener('pointerdown', e => beginDrag(e, slot));

  el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
               'font-size': 15, fill: 'var(--glyph)', 'font-weight': 700, 'pointer-events': 'none' }, g)
    .textContent = slot.label;
  el('text', { x: 0, y: 13, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
               'font-size': 7, fill: 'var(--glyph)', 'pointer-events': 'none' }, g)
    .textContent = scaleShort(slot.mode);

  // numéro et nom de l'hexagramme sous l'hexagone
  const hn = hexOf(slot);
  el('text', { x: 0, y: R + 11, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
               'font-size': 8.5, fill: 'var(--dim)', 'pointer-events': 'none' }, g)
    .textContent = `${hn} ${HEX_NAMES[hn][0]}${n === 7 ? ' +1' : ''}`;
  if (slot.hexSel) slot.hexSel.value = hn;

  slot.sideEls = []; slot.labelEls = [];
  slot.rotG = el('g', {}, g);               // traits : tournent avec l'hexagone
  for (let k = 0; k < n; k++) {
    const [a, b] = sideEnds(k, n);
    const inset = 0.12;
    const lerp = (u, v, t) => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
    const segs = slot.lines[k]
      ? [[lerp(a, b, inset), lerp(a, b, 1 - inset)]]
      : [[lerp(a, b, inset), lerp(a, b, 0.42)], [lerp(a, b, 0.58), lerp(a, b, 1 - inset)]];
    const sg = el('g', {}, slot.rotG);
    const els = segs.map(([p, q]) => el('line', {
      x1: p[0], y1: p[1], x2: q[0], y2: q[1],
      stroke: 'var(--ink)', 'stroke-width': 5, 'stroke-linecap': 'round',
    }, sg));
    // zone cliquable pour basculer le trait
    const hit = el('line', {
      x1: a[0], y1: a[1], x2: b[0], y2: b[1],
      stroke: 'transparent', 'stroke-width': 14, cursor: 'pointer',
    }, sg);
    // glisser sur un trait fait tourner l'hexagone ; un simple clic bascule le trait
    hit.addEventListener('pointerdown', e => { e.stopPropagation(); beginSpin(e, slot); });
    hit.addEventListener('click', () => {
      if (slot.noClick) return;
      slot.lines[k] ^= 1; drawSlot(slot);
    });
    slot.sideEls.push(els);

    const m = sideMid(k, n);
    const t = el('text', {
      x: m[0] * R * 0.58, y: m[1] * R * 0.58,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 8.5, fill: 'var(--dim)', 'pointer-events': 'none',
    }, g);
    const off = offsetOf(slot, k);
    t.textContent = off === null ? '·' : NAMES[(slotTonic(slot) + off) % 12] + (off >= 12 ? "'" : '');
    slot.labelEls.push(t);
  }
  applyRotation(slot, 360 / n * slot.rot);
}

// fait tourner les traits de deg degrés ; les étiquettes suivent mais restent droites
function applyRotation(slot, deg) {
  slot.rotG.setAttribute('transform', `rotate(${deg})`);
  for (let k = 0; k < slot.n; k++) {
    const a = (270 + sideAng(k, slot.n) + deg) * Math.PI / 180;
    slot.labelEls[k].setAttribute('x', Math.cos(a) * R * 0.58);
    slot.labelEls[k].setAttribute('y', Math.sin(a) * R * 0.58);
  }
}
