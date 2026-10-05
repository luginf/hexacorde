//: Commandes : réglages, bloc par hexagone (menu Hexagrammes), grille, tirage, placement
// ---------- Commandes ----------
const $ = id => document.getElementById(id);
const $play = $('play'), $vol = $('vol'), $status = $('status');
const $rec = $('rec'), $recName = $('recName'), $internal = $('internal');
const $recSave = $('recSave'), $arecSave = $('arecSave');

$play.addEventListener('click', () => running ? stop() : start());
$('silence').addEventListener('click', silence);
// un pas = une croche, donc BPM (noires par minute) = 30000 / pas en ms
const msToBpm = ms => Math.round(30000 / ms);
function setTempo(ms) {
  tickMs = Math.max(80, Math.min(700, Math.round(ms)));
  $('tempo').value = tickMs;
  $('tempoVal').textContent = tickMs + ' ms';
  $('bpm').value = msToBpm(tickMs);
  recTempo();
}
$('tempo').addEventListener('input', e => setTempo(+e.target.value));
$('bpm').addEventListener('change', e => { if (+e.target.value > 0) setTempo(30000 / +e.target.value); else setTempo(tickMs); });
$vol.addEventListener('input', e => { if (master) master.gain.value = +e.target.value; });
$('soft').addEventListener('input', e => { opt.softRange = Math.max(1, +e.target.value || 1); });
$('mutate').addEventListener('change', e => { opt.mutate = e.target.checked; });

// listes déroulantes dépendant de la langue (réappelée par applyLang)
const scaleOptions = () => Object.keys(SCALES).map(key => `<option value="${key}">${scaleLabel(key)}</option>`).join('');
const octOptions = () => [-3, -2, -1, 0, 1, 2, 3].map(o => `<option value="${o}">${o > 0 ? '+' + o : o}</option>`).join('');
const tonicOptions = withGlobal => (withGlobal ? `<option value="">${t('tonic.global')}</option>` : '') +
  NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
const hexOptions = () => Array.from({ length: 64 }, (_, i) => `<option value="${i + 1}">${hexLabel(i + 1)}</option>`).join('');
function fillTonalityLists() {
  $('tonic').innerHTML = tonicOptions(false); $('tonic').value = opt.tonic;
  $('octave').innerHTML = octOptions(); $('octave').value = opt.octave;
  $('scaleBase').innerHTML = scaleOptions(); $('scaleBase').value = opt.scale;
}
fillTonalityLists();
$('octave').addEventListener('change', e => { opt.octave = +e.target.value; });
$('tonic').addEventListener('change', e => {
  opt.tonic = +e.target.value;
  slots.forEach(drawSlot);
});
// gamme de base : s'applique à tous les hexagrammes et sert aux nouveaux
$('scaleBase').addEventListener('change', e => {
  opt.scale = e.target.value;
  for (const s of slots) setMode(s, opt.scale);
});
$('chanAll').innerHTML = Array.from({ length: 16 }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('');
$('chanMode').addEventListener('change', e => setChanAll(e.target.value === 'same' ? +$('chanAll').value || 0 : null));
$('chanAll').addEventListener('change', e => setChanAll(+e.target.value));
$('uniform').addEventListener('change', e => { opt.uniform = e.target.checked; });
const modesBox = $('modes');

const chanOptions = Array.from({ length: 16 }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('');
const SPEEDS = [[0.125, '÷8', '/8'], [0.25, '÷4', '/4'], [1 / 3, '÷3', '/3'], [0.5, '÷2', '/2'], [1, '×1', 'x1'], [2, '×2', 'x2'], [3, '×3', 'x3']];
// Réglages d'un hexagone, communs au menu Hexagrammes et au menu du clic droit : chaque fonction met à jour
// l'état ET les contrôles du panneau, pour que les deux interfaces restent synchronisées.
function setMode(slot, mode) { slot.mode = mode; slot.modeSel.value = mode; drawSlot(slot); }
// canal MIDI commun à tous (null = individuels) : les canaux de chaque hexagone sont conservés mais grisés
function setChanAll(ch) {
  midiPanic();
  opt.chanAll = ch;
  $('chanMode').value = ch === null ? 'indiv' : 'same';
  $('chanAll').hidden = ch === null;
  if (ch !== null) $('chanAll').value = ch;
  for (const s of slots) s.chanSel.disabled = ch !== null;
}
function setChannel(slot, ch) { midiPanic(); slot.channel = ch; slot.chanSel.value = ch; }
function setRotOn(slot, on) { slot.rotOn = on; slot.rotChk.checked = on; }
function setRotDir(slot, dir) { slot.rotDir = dir; slot.dirBtn.textContent = dir > 0 ? '↻' : '↺'; }
function setRotSpeed(slot, v) { slot.rotSpeed = v; slot.rotAcc = 0; slot.spdSel.value = v; }

// tonique propre à l'hexagone ('' = celle du réglage global) et octave en plus de l'octave globale
function setTonic(slot, v) {
  slot.tonic = v === '' || v === null ? null : +v;
  slot.tonicSel.value = slot.tonic === null ? '' : slot.tonic;
  drawSlot(slot);
}
function setOctave(slot, o) { slot.octave = o; slot.octSel.value = o; }
function setActive(slot, on) {
  slot.active = on; slot.actChk.checked = on;
  if (!on) { slot.ph = null; pulses = pulses.filter(p => p.target !== slot); midiPanic(); }
  drawSlot(slot);
}
// 6 ou 7 côtés : le 7e est un trait plein de plus, avec la note suivante de la gamme ;
// la rotation repart de 0 (le cran n'a plus la même valeur) et les impulsions vers lui sont perdues
function setSides(slot, n) {
  slot.sevChk.checked = n === 7;
  if (n === slot.n) return;
  // notes encore celles de la gamme (jamais modifiées à la main) : on les redistribue pour le nouveau nombre de côtés
  const before = JSON.stringify(slot.custom);
  fillCustom(slot);
  const pristine = JSON.stringify(slot.custom) === before;
  slot.custom = JSON.parse(before);
  if (n === 7) { slot.lines.push(1); slot.initial.push(1); slot.n = 7; slot.custom.push({ p: defaultOffset(slot, 6, 1), b: defaultOffset(slot, 6, 0) }); }
  else { slot.lines.length = 6; slot.initial.length = 6; slot.custom.length = 6; slot.n = 6; }
  if (pristine) fillCustom(slot);
  slot.rot = 0; slot.rotAcc = 0; slot.rotDelta = 0; slot.rotT0 = -1e9;
  slot.ph = null; slot.flash = Array(slot.n).fill(-99);
  pulses = pulses.filter(p => p.target !== slot);
  drawSlot(slot);
}
function setLoop(slot, on, n) {
  slot.loopOn = on; slot.loopN = Math.max(2, Math.min(128, Math.round(n) || 24));
  slot.loopChk.checked = on; slot.loopNum.value = slot.loopN;
}

// bloc de réglages d'un hexagone dans le menu Hexagrammes
function buildSlotPanel(slot) {
  const box = slot.box = document.createElement('div');
  box.className = 'slotctl';
  box.innerHTML = `
    <div class="row"><span>${slot.label}</span>
      <select class="hex" title="${t('hex.title')}">${hexOptions()}</select>
      <label title="${t('act.title')}"><input class="act" type="checkbox"></label>
      <button class="del" title="${t('del.title')}">✕</button></div>
    <div class="row"><span></span>
      <select class="scale" title="${t('scale.title')}">${scaleOptions()}</select>
      <select class="chan" title="${t('chan.title')}">${chanOptions}</select></div>
    <div class="row rot">
      <select class="stonic" title="${t('stonic.title')}">${tonicOptions(true)}</select>
      <select class="soct" title="${t('soct.title')}">${octOptions()}</select>
    </div>
    <div class="row rot">
      <label title="${t('rot.title')}"><input class="rotOn" type="checkbox"> ${t('rot')}</label>
      <button class="dir" title="${t('dir.title')}">↻</button>
      <select class="spd" title="${t('spd.title')}">${SPEEDS.map(([v, tt]) => `<option value="${v}">${tt}</option>`).join('')}</select>
      <button class="reset" title="${t('reset.title')}">${t('reset')}</button>
    </div>
    <div class="row rot">
      <label title="${t('loop.title')}"><input class="loopOn" type="checkbox"> ${t('loop.every')}
        <input class="loopN" type="number" min="2" max="128"> ${t('steps')}</label></div>
    <div class="row rot">
      <label title="${t('seven.title')}"><input class="sev" type="checkbox"> ${t('seven')}</label>
    </div>`;
  const q = s => box.querySelector(s);
  slot.hexSel = q('.hex');
  slot.hexSel.value = hexOf(slot);
  slot.hexSel.addEventListener('change', () => setHexagram(slot, +slot.hexSel.value));

  slot.actChk = q('.act'); slot.actChk.checked = slot.active;
  slot.actChk.addEventListener('change', () => setActive(slot, slot.actChk.checked));
  q('.del').addEventListener('click', () => removeSlot(slot));

  slot.modeSel = q('.scale');
  slot.modeSel.value = slot.mode;
  slot.modeSel.addEventListener('change', () => setMode(slot, slot.modeSel.value));

  slot.tonicSel = q('.stonic'); slot.tonicSel.value = slot.tonic === null ? '' : slot.tonic;
  slot.tonicSel.addEventListener('change', () => setTonic(slot, slot.tonicSel.value));
  slot.octSel = q('.soct'); slot.octSel.value = slot.octave;
  slot.octSel.addEventListener('change', () => setOctave(slot, +slot.octSel.value));

  slot.chanSel = q('.chan');
  slot.chanSel.value = slot.channel; slot.chanSel.disabled = opt.chanAll !== null;
  slot.chanSel.addEventListener('change', e => setChannel(slot, +e.target.value));

  slot.rotChk = q('.rotOn'); slot.rotChk.checked = slot.rotOn;
  slot.rotChk.addEventListener('change', () => setRotOn(slot, slot.rotChk.checked));
  const dir = slot.dirBtn = q('.dir');
  dir.textContent = slot.rotDir > 0 ? '↻' : '↺';
  dir.addEventListener('click', () => setRotDir(slot, -slot.rotDir));
  slot.spdSel = q('.spd');
  slot.spdSel.value = slot.rotSpeed;
  slot.spdSel.addEventListener('change', e => setRotSpeed(slot, +e.target.value));
  q('.reset').addEventListener('click', () => resetSlot(slot));

  slot.sevChk = q('.sev'); slot.sevChk.checked = slot.n === 7;
  slot.sevChk.addEventListener('change', () => setSides(slot, slot.sevChk.checked ? 7 : 6));
  slot.loopChk = q('.loopOn'); slot.loopNum = q('.loopN');
  slot.loopChk.checked = slot.loopOn; slot.loopNum.value = slot.loopN;
  slot.loopChk.addEventListener('change', () => setLoop(slot, slot.loopChk.checked, slot.loopNum.value));
  slot.loopNum.addEventListener('input', () => { slot.loopN = Math.max(2, +slot.loopNum.value || 24); });
  modesBox.appendChild(box);
}

// ajoute un hexagone (données, dessin sur la grille, bloc du panneau) ; c : voir makeSlot
function addSlot(c) {
  const slot = makeSlot({ mode: opt.scale, ...c });
  slots.push(slot);
  buildSlotView(slot);
  buildSlotPanel(slot);
  drawSlot(slot);
  return slot;
}
function removeSlot(slot, quiet) {
  const i = slots.indexOf(slot);
  if (i < 0) return;
  slots.splice(i, 1);
  slot.g.remove(); slot.box.remove();
  pulses = pulses.filter(p => p.target !== slot);
  if (!quiet) { midiPanic(); closeMenu(); }
}
// premier point libre le plus proche de (gx, gy), ou null si la grille est pleine
function freeCellNear(gx, gy) {
  let best = null, bd = Infinity;
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    if (slots.some(s => s.gx === x && s.gy === y)) continue;
    const d = Math.hypot(x - gx, y - gy);
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}
const randomLines = () => Array.from({ length: 6 }, () => (Math.random() < 0.5 ? 1 : 0));
// change la taille de la grille (cols x rows, de N_MIN à N_MAX) ; refuse si un hexagone sortirait du plateau
function setGridSize(cols, rows) {
  if (cols < N_MIN || cols > N_MAX || rows < N_MIN || rows > N_MAX) return false;
  if (slots.some(s => s.gx >= cols || s.gy >= rows)) return false;
  NX = cols; NY = rows;
  drawGrid();
  slots.forEach(drawSlot);
  return true;
}

// les six hexagrammes de départ
[[0, 2, '111111'], [2, 0, '101010'], [4, 1, '111000'], [5, 3, '010101'], [3, 4, '000111'], [1, 4, '100110']]
  .forEach(([gx, gy, l]) => addSlot({ gx, gy, lines: bits(l) }));

$('rotAll').addEventListener('change', e => {
  for (const s of slots) setRotOn(s, e.target.checked);
});
$('draw').addEventListener('click', () => {
  for (const s of slots) {
    s.lines = s.lines.map(() => (Math.random() < 0.5 ? 1 : 0));
    s.initial = s.lines.slice();             // le tirage devient la forme de départ
    drawSlot(s);
  }
});
