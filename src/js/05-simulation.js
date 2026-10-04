//: Simulation : notes, cibles, émission, réception, step, rotation, réinitialisation
// ---------- Simulation ----------
const pcOf = (k, line) => 2 * k + (line ? 0 : 1);
// décalage en demi-tons depuis la tonique pour le côté k, ou null si le côté est muet
// note par défaut du trait k selon la gamme (line = 1 plein, 0 brisé)
function defaultOffset(slot, k, line) {
  const steps = SCALES[slot.mode].steps;
  if (!steps) return pcOf(k, line);
  if (!line) return null;                       // gamme : trait brisé = pas de note, pas de renvoi
  return steps[k % steps.length] + 12 * Math.floor(k / steps.length);
}
// notes personnalisées : plein et brisé de chaque trait, de 0 à 23 demi-tons au-dessus de la tonique
// (null pour le brisé = silence)
function fillCustom(slot) {
  slot.custom = [0, 1, 2, 3, 4, 5].map(k => ({ p: defaultOffset(slot, k, 1), b: defaultOffset(slot, k, 0) }));
}
function offsetOf(slot, k) {
  const line = slot.lines[k];
  if (slot.customOn) return line ? slot.custom[k].p : slot.custom[k].b;
  return defaultOffset(slot, k, line);
}
const midiOf = (slot, off) => 48 + 12 * Math.floor((N - 1 - slot.gy) / 2) + opt.tonic + off;

// secteur (0..5) dans lequel se trouve "to" vu depuis "from" ; demi-ouvert [k*60-30, k*60+30)
function sectorOf(from, to) {
  const cw = Math.atan2(to.gx - from.gx, -(to.gy - from.gy)) * 180 / Math.PI;
  return Math.floor(((cw + 30 + 1e-6 + 720) % 360) / 60) % 6;
}

function findTarget(from, k) {
  let best = null, bd = Infinity;
  for (const o of slots) {
    if (o === from) continue;
    if (sectorOf(from, o) !== k) continue;
    const d = Math.hypot(o.gx - from.gx, o.gy - from.gy);
    if (d < bd) { bd = d; best = o; }
  }
  return best ? { slot: best, dist: bd } : null;
}

function emit(from, k, strong, range) {
  if (pulses.length >= MAX_PULSES) return;
  const hit = findTarget(from, k);
  const x0 = from.gx, y0 = from.gy;
  if (!hit || hit.dist > range + 1e-9) {
    // impulsion perdue : petite étincelle qui s'éteint
    pulses.push({ x0, y0, x1: x0 + SIDE_DIR[k][0] * .6, y1: y0 + SIDE_DIR[k][1] * .6,
                  t0: tick, t1: tick + 1, target: null, k, strong, range });
    return;
  }
  pulses.push({ x0, y0, x1: hit.slot.gx, y1: hit.slot.gy,
                t0: tick, t1: tick + Math.max(1, Math.ceil(hit.dist - 1e-9)),
                target: hit.slot, k, strong, range: range - hit.dist });
}

function receive(p) {
  // côté physique touché s ; le trait qui s'y trouve est li (l'hexagone peut avoir tourné)
  const slot = p.target, s = (p.k + 3) % 6, li = mod6(s - slot.rot), line = slot.lines[li];
  if (line === 1) {
    slot.ph = { side: li, left: 6 };      // trait plein : rebond
  } else {
    emit(slot, p.k, p.strong, p.range);   // trait brisé : traversée
  }
  if (opt.mutate && (p.strong ? 1 : 0) !== line) {
    slot.lines[li] ^= 1;
    drawSlot(slot);
  }
}

function step() {
  tick++;
  lastTickAt = performance.now();

  if (opt.loop && tick % opt.loopN === 1) slots[0].ph = { side: 0, left: 6 };

  const arriving = pulses.filter(p => p.t1 <= tick);
  pulses = pulses.filter(p => p.t1 > tick);
  for (const p of arriving) if (p.target) receive(p);

  for (const slot of slots) {
    if (!slot.ph) continue;
    const k = slot.ph.side, line = slot.lines[k], off = offsetOf(slot, k);
    if (off !== null) {
      const midi = midiOf(slot, off);
      playNote(midi, line ? 0.16 : 0.08);
      midiNote(slot, midi, line ? 96 : 56);
      recNote(slot, midi, line ? 96 : 56);
      slot.flash[k] = tick;
      emit(slot, mod6(k + slot.rot), line === 1, line ? Infinity : opt.softRange);
    }
    slot.ph.side = (k + 1) % 6;
    if (--slot.ph.left <= 0) slot.ph = null;
  }

  // rotation à la fin du pas : rotSpeed pas de 60° par pas d'horloge (fractionnaire = plus lent),
  // dans le sens rotDir (+1 horaire, -1 antihoraire)
  for (const slot of slots) {
    if (!slot.rotOn) continue;
    slot.rotAcc += slot.rotSpeed;
    const n = Math.floor(slot.rotAcc + 1e-6);
    if (n < 1) continue;
    slot.rotAcc -= n;
    slot.rotDelta = n * slot.rotDir;
    slot.rot += slot.rotDelta;
    slot.rotT0 = lastTickAt; slot.rotDur = tickMs;
  }
}

// rotation manuelle de 60° : d = +1 horaire, -1 antihoraire
function rotateBy(slot, d) {
  slot.rot += d; slot.rotDelta = d;
  slot.rotT0 = performance.now(); slot.rotDur = 160;
}

// remet un hexagramme à sa forme de départ
function resetSlot(slot) {
  slot.lines = slot.initial.slice();
  slot.rot = 0; slot.rotAcc = 0; slot.rotDelta = 0; slot.rotT0 = -1e9;
  slot.ph = null;
  slot.flash = [-99, -99, -99, -99, -99, -99];
  pulses = pulses.filter(p => p.target !== slot);
  midiPanic();
  drawSlot(slot);
}

// définit un hexagramme par son numéro (devient aussi sa forme de départ)
function setHexagram(slot, n) {
  slot.lines = HEX_LINES[n].slice();
  slot.initial = slot.lines.slice();
  drawSlot(slot);
}
