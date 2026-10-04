//: Sortie MIDI en direct (Web MIDI) : midiNote, midiPanic
// ---------- Sortie MIDI en direct (Web MIDI) ----------
let midiAccess = null, midiOut = null;

function midiNote(slot, midi, vel) {
  if (!midiOut) return;
  const ch = slot.channel;
  try {
    midiOut.send([0x90 | ch, midi, vel]);
    // le note off est planifié par le navigateur : 90 % d'un pas plus tard
    midiOut.send([0x80 | ch, midi, 0], performance.now() + tickMs * 0.9);
  } catch (_) { /* port fermé */ }
}
// all notes off sur les 16 canaux
function midiPanic() {
  if (!midiOut) return;
  try { for (let ch = 0; ch < 16; ch++) midiOut.send([0xb0 | ch, 123, 0]); } catch (_) { /* port fermé */ }
}
