//: Interface MIDI : activer, choisir la sortie
// sortie MIDI en direct
const $midiOut = $('midiOut'), $midiMsg = $('midiMsg');
function refreshPorts() {
  const prev = midiOut ? midiOut.id : $midiOut.value;
  const outs = midiAccess ? Array.from(midiAccess.outputs.values()) : [];
  $midiOut.innerHTML = '<option value="">' + t('midi.noout') + '</option>' +
    outs.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
  $midiOut.disabled = !outs.length;
  $midiOut.value = outs.some(o => o.id === prev) ? prev : '';
  applyOutput();
  $midiMsg.textContent = outs.length ? '' : t('midi.none');
}
function applyOutput() {
  midiPanic();
  midiOut = midiAccess && $midiOut.value ? midiAccess.outputs.get($midiOut.value) || null : null;
  sendPrograms();
}
$midiOut.addEventListener('change', applyOutput);
$('midiEnable').addEventListener('click', async () => {
  if (!navigator.requestMIDIAccess) {
    $midiMsg.textContent = location.protocol === 'file:'
      ? t('midi.nofile')
      : t('midi.unavail');
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiAccess.onstatechange = refreshPorts;
    refreshPorts();
  } catch (err) {
    $midiMsg.textContent = t('midi.denied');
  }
});
window.addEventListener('pagehide', midiPanic);
$('scatter').addEventListener('click', () => {
  const cells = [];
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) cells.push([x, y]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  slots.forEach((s, i) => { [s.gx, s.gy] = cells[i]; drawSlot(s); });
  silence();
});

// ---------- Instruments par canal (program change) ----------
// noms General MIDI (standard) ; sur un synthé non GM, seul le numéro compte
const GM_NAMES = ["Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet", "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer", "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion", "Nylon Guitar", "Steel Guitar", "Jazz Guitar", "Clean Electric Guitar", "Muted Electric Guitar", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics", "Acoustic Bass", "Fingered Bass", "Picked Bass", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2", "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani", "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit", "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2", "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet", "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina", "Square Lead", "Sawtooth Lead", "Calliope Lead", "Chiff Lead", "Charang Lead", "Voice Lead", "Fifths Lead", "Bass + Lead", "New Age Pad", "Warm Pad", "Polysynth Pad", "Choir Pad", "Bowed Pad", "Metallic Pad", "Halo Pad", "Sweep Pad", "Rain", "Soundtrack", "Crystal", "Atmosphere", "Brightness", "Goblins", "Echoes", "Sci-Fi", "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bagpipe", "Fiddle", "Shanai", "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal", "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"];
function fillPrograms() {
  const opts = '<option value="">' + t('midi.inst.none') + '</option>' +
    GM_NAMES.map((n, i) => `<option value="${i}">${i + 1}. ${n}</option>`).join('');
  $('progs').innerHTML = prog.map((p, ch) => `<span>${ch + 1}</span><select data-ch="${ch}">${opts}</select>`).join('');
  for (const sel of $('progs').querySelectorAll('select')) {
    const ch = +sel.dataset.ch;
    sel.value = prog[ch] === null ? '' : prog[ch];
    sel.addEventListener('change', () => {
      prog[ch] = sel.value === '' ? null : +sel.value;
      if (midiOut && prog[ch] !== null) { try { midiOut.send([0xc0 | ch, prog[ch]]); } catch (_) { /* port fermé */ } }
    });
  }
}
fillPrograms();
