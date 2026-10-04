//: Interface MIDI : activer, choisir la sortie
// sortie MIDI en direct
const $midiOut = $('midiOut'), $midiMsg = $('midiMsg');
function refreshPorts() {
  const prev = midiOut ? midiOut.id : $midiOut.value;
  const outs = midiAccess ? Array.from(midiAccess.outputs.values()) : [];
  $midiOut.innerHTML = '<option value="">(aucune sortie)</option>' +
    outs.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
  $midiOut.disabled = !outs.length;
  $midiOut.value = outs.some(o => o.id === prev) ? prev : '';
  applyOutput();
  $midiMsg.textContent = outs.length ? '' : 'aucune sortie MIDI détectée';
}
function applyOutput() {
  midiPanic();
  midiOut = midiAccess && $midiOut.value ? midiAccess.outputs.get($midiOut.value) || null : null;
}
$midiOut.addEventListener('change', applyOutput);
$('midiEnable').addEventListener('click', async () => {
  if (!navigator.requestMIDIAccess) {
    $midiMsg.textContent = location.protocol === 'file:'
      ? 'Web MIDI absent en file:// (Firefox) : servir la page, voir l\'aide'
      : 'Web MIDI indisponible dans ce navigateur (essayer Chrome, Edge ou Firefox)';
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.onstatechange = refreshPorts;
    refreshPorts();
  } catch (err) {
    $midiMsg.textContent = 'accès MIDI refusé';
  }
});
window.addEventListener('pagehide', midiPanic);
$('scatter').addEventListener('click', () => {
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push([x, y]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  slots.forEach((s, i) => { [s.gx, s.gy] = cells[i]; drawSlot(s); });
  silence();
});
