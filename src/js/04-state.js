//: État global : les 6 hexagrammes (slots), impulsions, horloge, options
// ---------- État ----------
const bits = s => s.split('').map(Number);
const slots = [
  { gx: 0, gy: 2, lines: bits('111111') },
  { gx: 2, gy: 0, lines: bits('101010') },
  { gx: 4, gy: 1, lines: bits('111000') },
  { gx: 5, gy: 3, lines: bits('010101') },
  { gx: 3, gy: 4, lines: bits('000111') },
  { gx: 1, gy: 4, lines: bits('100110') },
].map((s, i) => Object.assign(s, {
  id: i, mode: 'chromatique', channel: i,
  initial: s.lines.slice(),                  // forme de départ, pour la réinitialisation
  custom: Array.from({ length: 6 }, (_, k) => ({ p: 2 * k, b: 2 * k + 1 })), customOn: false,  // notes personnalisées
  rot: 0, rotOn: false, rotDir: 1, rotSpeed: 1, rotAcc: 0, rotDelta: 0, rotT0: -1e9, rotDur: 1,
  ph: null, flash: [-99,-99,-99,-99,-99,-99],
}));

let pulses = [];
let tick = 0, running = false, tickMs = 240;
let lastTickAt = performance.now();
let timer = null, nextAt = 0;
const MAX_PULSES = 300;

const opt = {
  softRange: 2.5, mutate: false, loop: false, loopN: 24, tonic: 0,
};
