//: Plateau SVG : grille, dessin d'un hexagone (drawSlot), rotation visuelle
// ---------- Dessin ----------
const svg = document.getElementById('board');
const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

// points de la grille
const gridLayer = el('g', {}, svg);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
  el('circle', { cx: px(x), cy: px(y), r: 2.5, fill: 'var(--grid)' }, gridLayer);
const slotLayer = el('g', {}, svg);
const pulseLayer = el('g', { 'pointer-events': 'none' }, svg);

for (const slot of slots) {
  slot.g = el('g', { cursor: 'grab' }, slotLayer);
  // clic droit : menu (rotation, notes). Molette : bas = rotation horaire, haut = antihoraire
  slot.g.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(slot, e.clientX, e.clientY); });
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
  while (g.firstChild) g.removeChild(g.firstChild);
  g.setAttribute('transform', `translate(${px(slot.gx)},${px(slot.gy)})`);

  const pts = [0,1,2,3,4,5].map(i => vertex(i).join(',')).join(' ');
  const body = el('polygon', { points: pts, fill: '#1c1c22', stroke: '#2a2a33', 'stroke-width': 1 }, g);
  body.addEventListener('pointerdown', e => beginDrag(e, slot));

  el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
               'font-size': 15, fill: '#4a4a56', 'font-weight': 700, 'pointer-events': 'none' }, g)
    .textContent = LABELS[slot.id];
  el('text', { x: 0, y: 13, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
               'font-size': 7, fill: '#4a4a56', 'pointer-events': 'none' }, g)
    .textContent = SCALES[slot.mode].short;

  // numéro et nom de l'hexagramme sous l'hexagone
  const hn = hexNumber(slot.lines);
  el('text', { x: 0, y: R + 11, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
               'font-size': 8.5, fill: 'var(--dim)', 'pointer-events': 'none' }, g)
    .textContent = `${hn} ${HEX_NAMES[hn][0]}`;
  if (slot.hexSel) slot.hexSel.value = hn;

  slot.sideEls = []; slot.labelEls = [];
  slot.rotG = el('g', {}, g);               // traits : tournent avec l'hexagone
  for (let k = 0; k < 6; k++) {
    const [a, b] = sideEnds(k);
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
    hit.addEventListener('pointerdown', e => e.stopPropagation());
    hit.addEventListener('click', () => { slot.lines[k] ^= 1; drawSlot(slot); });
    slot.sideEls.push(els);

    const m = sideMid(k);
    const t = el('text', {
      x: m[0] * R * 0.58, y: m[1] * R * 0.58,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 8.5, fill: 'var(--dim)', 'pointer-events': 'none',
    }, g);
    const off = offsetOf(slot, k);
    t.textContent = off === null ? '·' : NAMES[(opt.tonic + off) % 12] + (off >= 12 ? "'" : '');
    slot.labelEls.push(t);
  }
  applyRotation(slot, 60 * slot.rot);
}

// fait tourner les traits de deg degrés ; les étiquettes suivent mais restent droites
function applyRotation(slot, deg) {
  slot.rotG.setAttribute('transform', `rotate(${deg})`);
  for (let k = 0; k < 6; k++) {
    const a = (270 + 60 * k + deg) * Math.PI / 180;
    slot.labelEls[k].setAttribute('x', Math.cos(a) * R * 0.58);
    slot.labelEls[k].setAttribute('y', Math.sin(a) * R * 0.58);
  }
}
