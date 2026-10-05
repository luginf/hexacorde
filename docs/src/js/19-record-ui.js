//: Enregistrement : cases d'armement et boutons « Sauvegarder l'enregistrement » (MIDI, audio .flac / .wav)
// ---------- Enregistrement MIDI et audio ----------
const $recMsg = $('recMsg'), $arec = $('arec');
const recSay = m => { $recMsg.textContent = m; };

// MIDI : la case lance l'enregistrement, le bouton l'arrête et télécharge le fichier
$rec.addEventListener('change', () => {
  if ($rec.checked) { beginRecording(); recSay(t('recmsg.midi.on')); }
  else if (rec) { rec.live = false; recSay(t('recmsg.midi.off')); }
});
$recSave.addEventListener('click', () => {
  if (finishRecording()) { $rec.checked = false; recSay(t('recmsg.midi.saved')); }
  else recSay(t('recmsg.midi.none'));
});

// audio : on branche un ScriptProcessor sur le volume général ; les échantillons (Int16, mono) sont
// gardés en blocs. Rien n'est gardé avant le premier Jouer.
let arec = null, aproc = null;
function audioTap(on) {
  if (on && !aproc) {
    ensureAudio();
    aproc = ac.createScriptProcessor(4096, 1, 1);
    aproc.onaudioprocess = e => {
      if (!arec || !arec.live || !arec.started) return;
      const x = e.inputBuffer.getChannelData(0), out = new Int16Array(x.length);
      for (let i = 0; i < x.length; i++) {
        const v = Math.max(-1, Math.min(1, x[i]));
        out[i] = v < 0 ? v * 32768 : v * 32767;
      }
      arec.chunks.push(out); arec.n += out.length;
    };
    master.connect(aproc); aproc.connect(ac.destination);    // sa sortie reste muette
  } else if (!on && aproc) {
    master.disconnect(aproc); aproc.disconnect(); aproc.onaudioprocess = null; aproc = null;
  }
}
$arec.addEventListener('change', () => {
  if ($arec.checked) {
    audioTap(true);
    arec = { chunks: [], n: 0, live: true, started: running };
    recSay(t(running ? 'recmsg.audio.on' : 'recmsg.audio.wait'));
  } else if (arec) {
    arec.live = false; audioTap(false);
    recSay(t('recmsg.audio.off'));
  }
});
$arecSave.addEventListener('click', () => {
  if (!arec || !arec.n) { recSay(t('recmsg.audio.none')); return; }
  const fmt = $('afmt').value, r = arec;
  arec = null; $arec.checked = false; audioTap(false);
  const bytes = fmt === 'wav' ? encodeWav(r.chunks, r.n, ac.sampleRate) : encodeFlac(r.chunks, r.n, ac.sampleRate);
  download(bytes, `${fileBase()}-${fileStamp()}.${fmt}`, fmt === 'wav' ? 'audio/wav' : 'audio/flac');
  recSay(t('recmsg.audio.saved', fmt, (r.n / ac.sampleRate).toFixed(1)));
});
