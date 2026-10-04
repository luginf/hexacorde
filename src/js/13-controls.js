//: Panneau de commandes : réglages, bloc par hexagone, tirage, placement
// ---------- Commandes ----------
const $ = id => document.getElementById(id);
const $play = $('play'), $vol = $('vol'), $status = $('status');
const $rec = $('rec'), $recName = $('recName'), $internal = $('internal');

$play.addEventListener('click', () => running ? stop() : start());
$('silence').addEventListener('click', silence);
$('tempo').addEventListener('input', e => {
  tickMs = +e.target.value;
  $('tempoVal').textContent = tickMs + ' ms';
  recTempo();
});
$rec.addEventListener('change', () => {
  if ($rec.checked) { if (running) beginRecording(); }
  else finishRecording();
});
$vol.addEventListener('input', e => { if (master) master.gain.value = +e.target.value; });
$('soft').addEventListener('input', e => { opt.softRange = Math.max(1, +e.target.value || 1); });
$('mutate').addEventListener('change', e => { opt.mutate = e.target.checked; });
$('loop').addEventListener('change', e => { opt.loop = e.target.checked; });
$('loopN').addEventListener('input', e => { opt.loopN = Math.max(2, +e.target.value || 24); });

// tonique et gamme par hexagone
const scaleOptions = () => Object.entries(SCALES)
  .map(([key, v]) => `<option value="${key}">${v.label}</option>`).join('');
$('tonic').innerHTML = NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
$('tonic').addEventListener('change', e => {
  opt.tonic = +e.target.value;
  slots.forEach(drawSlot);
});
$('modeAll').insertAdjacentHTML('beforeend', scaleOptions());
const modesBox = $('modes');

// repli de toute la zone d'édition des hexagrammes ; l'état est retenu d'une visite à l'autre
const hexEdit = $('hexEdit');
try { if (localStorage.getItem('hexacorde.hexEditOpen') === '0') hexEdit.open = false; } catch (_) { /* stockage inaccessible */ }
hexEdit.addEventListener('toggle', () => {
  try { localStorage.setItem('hexacorde.hexEditOpen', hexEdit.open ? '1' : '0'); } catch (_) { /* ignoré */ }
});
const hexOptions = Array.from({ length: 64 }, (_, i) => `<option value="${i + 1}">${hexLabel(i + 1)}</option>`).join('');
const chanOptions = Array.from({ length: 16 }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('');
const SPEEDS = [[0.125, '÷8', '/8'], [0.25, '÷4', '/4'], [1 / 3, '÷3', '/3'], [0.5, '÷2', '/2'], [1, '×1', 'x1'], [2, '×2', 'x2'], [3, '×3', 'x3']];
// Réglages d'un hexagone, communs au panneau et au menu du clic droit : chaque fonction met à jour
// l'état ET les contrôles du panneau, pour que les deux interfaces restent synchronisées.
function setMode(slot, mode) { slot.mode = mode; slot.modeSel.value = mode; drawSlot(slot); }
function setChannel(slot, ch) { midiPanic(); slot.channel = ch; slot.chanSel.value = ch; }
function setRotOn(slot, on) { slot.rotOn = on; slot.rotChk.checked = on; }
function setRotDir(slot, dir) { slot.rotDir = dir; slot.dirBtn.textContent = dir > 0 ? '↻' : '↺'; }
function setRotSpeed(slot, v) { slot.rotSpeed = v; slot.rotAcc = 0; slot.spdSel.value = v; }

for (const slot of slots) {
  const box = document.createElement('div');
  box.className = 'slotctl';
  box.innerHTML = `
    <div class="row"><span>${LABELS[slot.id]}</span>
      <select class="hex" title="Hexagramme">${hexOptions}</select></div>
    <div class="row"><span></span>
      <select class="scale" title="Gamme">${scaleOptions()}</select>
      <select class="chan" title="Canal MIDI">${chanOptions}</select></div>
    <div class="row rot">
      <label title="Faire tourner cet hexagone"><input class="rotOn" type="checkbox"> rot.</label>
      <button class="dir" title="Sens de rotation">↻</button>
      <select class="spd" title="Vitesse de rotation">${SPEEDS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      <button class="reset" title="Remettre cet hexagramme à sa forme de départ">Réinit.</button>
    </div>`;
  const q = s => box.querySelector(s);
  slot.hexSel = q('.hex');
  slot.hexSel.value = hexNumber(slot.lines);
  slot.hexSel.addEventListener('change', () => setHexagram(slot, +slot.hexSel.value));

  slot.modeSel = q('.scale');
  slot.modeSel.value = slot.mode;
  slot.modeSel.addEventListener('change', () => setMode(slot, slot.modeSel.value));

  slot.chanSel = q('.chan');
  slot.chanSel.value = slot.channel;
  slot.chanSel.addEventListener('change', e => setChannel(slot, +e.target.value));

  slot.rotChk = q('.rotOn');
  slot.rotChk.addEventListener('change', () => setRotOn(slot, slot.rotChk.checked));
  const dir = slot.dirBtn = q('.dir');
  dir.addEventListener('click', () => setRotDir(slot, -slot.rotDir));
  slot.spdSel = q('.spd');
  slot.spdSel.value = slot.rotSpeed;
  slot.spdSel.addEventListener('change', e => setRotSpeed(slot, +e.target.value));
  q('.reset').addEventListener('click', () => resetSlot(slot));
  modesBox.appendChild(box);
}
$('rotAll').addEventListener('change', e => {
  for (const s of slots) setRotOn(s, e.target.checked);
});
$('modeAll').addEventListener('change', e => {
  if (!e.target.value) return;
  for (const s of slots) setMode(s, e.target.value);
  e.target.value = '';
});

$('draw').addEventListener('click', () => {
  for (const s of slots) {
    s.lines = s.lines.map(() => (Math.random() < 0.5 ? 1 : 0));
    s.initial = s.lines.slice();             // le tirage devient la forme de départ
    drawSlot(s);
  }
});
