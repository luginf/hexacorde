//: Simulation : notes, cibles, émission, réception, step, rotation, réinitialisation
// ---------- Simulation ----------
const pcOf = (k, line) => 2 * k + (line ? 0 : 1);
// décalage en demi-tons depuis la tonique pour le côté k, ou null si le côté est muet
// note par défaut du trait k selon la gamme (line = 1 plein, 0 brisé)
// Heptagone : une gamme pentatonique est complétée par les 2 notes de la gamme à 7 notes de même couleur
// (majeur pour la pentatonique majeure, mineur naturel pour la mineure), au lieu de répéter des octaves.
const HEPTA = { pentamajeur: 'majeur', pentamineur: 'mineur' };
function scaleSteps(slot) {
  const steps = SCALES[slot.mode].steps;
  if (!steps || slot.n < 7 || steps.length >= 7 || !HEPTA[slot.mode]) return steps;
  return [...steps, ...SCALES[HEPTA[slot.mode]].steps.filter(x => !steps.includes(x))];
}
function defaultOffset(slot, k, line) {
  const steps = scaleSteps(slot);
  if (!steps) return pcOf(k, line);
  if (!line) return null;                       // gamme : trait brisé = pas de note, pas de renvoi
  return steps[k % steps.length] + 12 * Math.floor(k / steps.length);
}
// notes personnalisées : plein et brisé de chaque trait, de 0 à 23 demi-tons au-dessus de la tonique
// (null pour le brisé = silence)
// Gamme de plus de n notes : les notes qui n'ont pas de trait plein sont mises sur les premiers traits brisés,
// pour que toute la gamme soit présente (un brisé ne sonne que s'il est touché par une impulsion).
function fillCustom(slot) {
  const n = slot.n;
  slot.custom = Array.from({ length: n }, (_, k) => ({ p: defaultOffset(slot, k, 1), b: defaultOffset(slot, k, 0) }));
  const steps = SCALES[slot.mode].steps;
  for (let j = n; steps && j < steps.length; j++) slot.custom[j - n].b = steps[j];
}
// numéro d'hexagramme : les 6 premiers traits (le 7e côté, optionnel, n'en fait pas partie)
const hexOf = slot => hexNumber(slot.lines.slice(0, 6));
function offsetOf(slot, k) {
  const line = slot.lines[k];
  if (slot.customOn) return line ? slot.custom[k].p : slot.custom[k].b;
  return defaultOffset(slot, k, line);
}
const slotTonic = slot => (slot.tonic === null ? opt.tonic : slot.tonic);
const midiOf = (slot, off) => Math.max(0, Math.min(127,
  48 + 12 * (Math.floor((5 - slot.gy) / 2) + opt.octave + slot.octave) + slotTonic(slot) + off));

// "to" est-il dans le secteur de `from` centré sur la direction ang (degrés depuis le haut, sens horaire) ?
// secteur demi-ouvert de largeur 360 / n, donc l'horizontale exacte d'un hexagone va au secteur du bas
function inSector(from, to, ang) {
  const cw = Math.atan2(to.gx - from.gx, -(to.gy - from.gy)) * 180 / Math.PI, w = 180 / from.n;
  return ((cw - ang + w + 1e-6 + 1080) % 360) < 2 * w;
}

function findTarget(from, ang) {
  let best = null, bd = Infinity;
  for (const o of slots) {
    if (o === from || !o.active) continue;
    if (!inSector(from, o, ang)) continue;
    const d = Math.hypot(o.gx - from.gx, o.gy - from.gy);
    if (d < bd) { bd = d; best = o; }
  }
  return best ? { slot: best, dist: bd } : null;
}

// émet une impulsion dans la direction ang (degrés depuis le haut, sens horaire)
function emit(from, ang, strong, range) {
  if (pulses.length >= MAX_PULSES) return;
  const hit = findTarget(from, ang), r = ang * Math.PI / 180;
  const x0 = from.gx, y0 = from.gy;
  if (!hit || hit.dist > range + 1e-9) {
    // impulsion perdue : petite étincelle qui s'éteint
    pulses.push({ x0, y0, x1: x0 + Math.sin(r) * .6, y1: y0 - Math.cos(r) * .6,
                  t0: tick, t1: tick + 1, target: null, ang, strong, range });
    return;
  }
  pulses.push({ x0, y0, x1: hit.slot.gx, y1: hit.slot.gy,
                t0: tick, t1: tick + Math.max(1, Math.ceil(hit.dist - 1e-9)),
                target: hit.slot, ang, strong, range: range - hit.dist });
}

function receive(p) {
  // côté physique touché s (celui qui regarde l'émetteur) ; le trait qui s'y trouve est li (le polygone peut avoir tourné)
  const slot = p.target, n = slot.n, s = Math.round(modn(p.ang + 180, 360) / (360 / n)) % n;
  const li = modn(s - slot.rot, n), line = slot.lines[li];
  if (line === 1) {
    slot.ph = { side: li, left: n };      // trait plein : rebond
  } else {
    emit(slot, p.ang, p.strong, p.range); // trait brisé : traversée
  }
  if (opt.mutate && (p.strong ? 1 : 0) !== line) {
    slot.lines[li] ^= 1;
    drawSlot(slot);
  }
}

function step() {
  tick++;
  lastTickAt = performance.now();

  // amorce périodique, par hexagone : relance le côté 0 tous les loopN pas
  for (const s of slots) if (s.active && s.loopOn && tick % s.loopN === 1) s.ph = { side: 0, left: s.n };

  const arriving = pulses.filter(p => p.t1 <= tick);
  pulses = pulses.filter(p => p.t1 > tick);
  for (const p of arriving) if (p.target && p.target.active) receive(p);

  for (const slot of slots) {
    if (!slot.ph || !slot.active) continue;
    const k = slot.ph.side, line = slot.lines[k], off = offsetOf(slot, k);
    if (off !== null) {
      const midi = midiOf(slot, off);
      playNote(midi, line ? 0.16 : 0.08);
      midiNote(slot, midi, line ? 96 : 56);
      recNote(slot, midi, line ? 96 : 56);
      slot.flash[k] = tick;
      emit(slot, sideAng(modn(k + slot.rot, slot.n), slot.n), line === 1, line ? Infinity : opt.softRange);
    }
    slot.ph.side = (k + 1) % slot.n;
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
  slot.flash = Array(slot.n).fill(-99);
  pulses = pulses.filter(p => p.target !== slot);
  midiPanic();
  drawSlot(slot);
}

// définit un hexagramme par son numéro (devient aussi sa forme de départ)
function setHexagram(slot, n) {
  slot.lines.splice(0, 6, ...HEX_LINES[n]);      // un éventuel 7e côté est conservé
  slot.initial = slot.lines.slice();
  drawSlot(slot);
}
