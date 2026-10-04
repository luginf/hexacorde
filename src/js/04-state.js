//: État global : les hexagrammes (slots, de 0 à 26), impulsions, horloge, options, impulsions, horloge, options
// ---------- État ----------
const bits = s => s.split('').map(Number);
const slots = [];
let slotSeq = 0;
// crée les données d'un hexagone (c : gx, gy, lines, et en option label, initial, mode, channel, active,
// custom, customOn, rot, rotOn, rotDir, rotSpeed). La lettre est la première libre.
function makeSlot(c) {
  const free = LABELS.split('').find(l => !slots.some(s => s.label === l));
  const label = c.label && !slots.some(s => s.label === c.label) ? c.label : free;
  const s = {
    id: slotSeq++, label, gx: c.gx, gy: c.gy, lines: c.lines.slice(), n: c.lines.length,   // n = 6 ou 7 côtés
    initial: (c.initial || c.lines).slice(),     // forme de départ, pour la réinitialisation
    mode: c.mode || 'chromatique', channel: c.channel === undefined ? LABELS.indexOf(label) % 16 : c.channel,
    tonic: c.tonic === undefined ? null : c.tonic, octave: c.octave || 0,   // tonique propre (null = globale), octave en plus
    active: c.active !== false,                  // inactif : grisé, ne joue pas, ne reçoit rien
    loopOn: !!c.loopOn, loopN: c.loopN || 24,    // amorce d'une note tous les loopN pas
    customOn: !!c.customOn,                      // notes personnalisées
    rot: c.rot || 0, rotOn: !!c.rotOn, rotDir: c.rotDir || 1, rotSpeed: c.rotSpeed || 1,
    rotAcc: 0, rotDelta: 0, rotT0: -1e9, rotDur: 1,
    ph: null, flash: Array(c.lines.length).fill(-99),
  };
  if (c.custom) s.custom = c.custom; else fillCustom(s);
  return s;
}

let pulses = [];
let tick = 0, running = false, tickMs = 240;
let lastTickAt = performance.now();
let timer = null, nextAt = 0;
const MAX_PULSES = 300;

const opt = {
  softRange: 2.5, mutate: false, tonic: 0, octave: 0,
};
