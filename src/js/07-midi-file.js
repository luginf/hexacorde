//: Enregistrement et export en fichier MIDI (.mid) et téléchargement
// ---------- Enregistrement MIDI ----------
// Un pas de la simulation = une croche. Les événements sont stockés par numéro de pas
// (pas de gigue d'horloge), puis convertis en ticks MIDI à l'export.
const PPQ = 480, STEP_TICKS = PPQ / 2, NOTE_TICKS = Math.round(STEP_TICKS * 0.9);
let rec = null;

function beginRecording() {
  rec = { events: [], tempos: [{ step: tick, ms: tickMs }], live: true };
}
function recNote(slot, midi, vel) {
  if (rec && rec.live) rec.events.push({ step: tick, slot: slot.id, ch: slot.channel, midi, vel });
}
function recTempo() {
  if (rec && rec.live) rec.tempos.push({ step: tick, ms: tickMs });
}

const vlq = n => { const b = [n & 0x7f]; while ((n >>= 7) > 0) b.unshift((n & 0x7f) | 0x80); return b; };
const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = n => [(n >> 8) & 255, n & 255];
const ascii = s => Array.from(new TextEncoder().encode(s));
const chunk = (id, bytes) => [...ascii(id), ...u32(bytes.length), ...bytes];
const metaText = (type, s) => { const t = ascii(s); return [0xff, type, ...vlq(t.length), ...t]; };

function trackChunk(events) {
  events.sort((a, b) => a.t - b.t || a.order - b.order);
  const out = [];
  let last = 0;
  for (const e of events) { out.push(...vlq(e.t - last), ...e.bytes); last = e.t; }
  out.push(0x00, 0xff, 0x2f, 0x00);
  return chunk('MTrk', out);
}

function buildMidi(r) {
  const base = Math.min(...r.events.map(e => e.step));   // on supprime le silence de tête

  // piste 0 : tempo (un pas = une croche, donc 1 noire = 2 pas)
  const tempoTrack = [{ t: 0, order: 0, bytes: metaText(0x03, 'Hexacorde') },
                      { t: 0, order: 1, bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8] }];
  const initial = r.tempos.filter(x => x.step <= base).pop() || r.tempos[0];
  const usq = ms => { const v = Math.round(ms * 2000); return [0xff, 0x51, 0x03, (v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  tempoTrack.push({ t: 0, order: 2, bytes: usq(initial.ms) });
  for (const x of r.tempos) if (x.step > base) tempoTrack.push({ t: (x.step - base) * STEP_TICKS, order: 2, bytes: usq(x.ms) });

  // une piste par hexagone, avec le canal choisi pour cet hexagone
  const tracks = [trackChunk(tempoTrack)];
  for (const slot of slots) {
    const mine = r.events.filter(e => e.slot === slot.id);
    if (!mine.length) continue;
    const ev = [{ t: 0, order: 0, bytes: metaText(0x03, `Hexacorde ${slot.label} ${slot.mode}`) }];
    for (const e of mine) {
      const t = (e.step - base) * STEP_TICKS;
      ev.push({ t, order: 1, bytes: [0x90 | e.ch, e.midi, e.vel] });
      ev.push({ t: t + NOTE_TICKS, order: 0, bytes: [0x80 | e.ch, e.midi, 0] });
    }
    tracks.push(trackChunk(ev));
  }
  const header = chunk('MThd', [...u16(1), ...u16(tracks.length), ...u16(PPQ)]);
  return Uint8Array.from([header, ...tracks].flat());
}

function download(bytes, filename, mime = 'audio/midi') {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// horodatage pour les noms de fichier : AAAAMMJJ-HHMMSS
function fileStamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
const fileBase = () => ($recName.value.trim() || 'hexacorde').replace(/[^\p{L}\p{N}_. -]+/gu, '_');

// arrête l'enregistrement MIDI et télécharge le fichier ; renvoie false s'il n'y avait aucune note
function finishRecording() {
  const r = rec;
  if (!r || !r.events.length) return false;
  rec = null;
  download(buildMidi(r), `${fileBase()}-${fileStamp()}.mid`);
  return true;
}
