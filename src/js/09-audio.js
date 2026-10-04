//: Son interne : oscillateur carré (WebAudio)
// ---------- Son : carré ----------
let ac = null, master = null, voices = 0;
function ensureAudio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = +$vol.value;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}
// onde, enveloppe ADSR (A, D, R en ms, S = niveau de 0 à 1) et filtre (une instance par note)
// fenv : profondeur de l'enveloppe de filtre (0 à 1, jusqu'à 4 octaves au-dessus de la coupure)
const snd = { wave: 'square', a: 5, d: 250, s: 0.1, r: 150, ftype: 'lowpass', fcut: 3200, fq: 0.7, fenv: 0 };
const WAVE_GAIN = { square: 1, sawtooth: 0.8, triangle: 1.4, sine: 1.4 };   // volumes à peu près égaux
const FILTERS = { lowpass: 'passe-bas', highpass: 'passe-haut', bandpass: 'passe-bande', notch: 'coupe-bande' };
// attaque vers `peak`, déclin vers `sus`, tenue jusqu'à `tg`, relâchement vers `end`
// (le niveau à tg est calculé : cancelAndHoldAtTime n'existe pas dans Firefox)
function adsr(param, t, A, D, R, tg, start, peak, sus, end) {
  param.setValueAtTime(start, t);
  param.linearRampToValueAtTime(peak, t + A);
  param.setTargetAtTime(sus, t + A, D / 3);
  param.setValueAtTime(sus + (peak - sus) * Math.exp(-(tg - t - A) / (D / 3)), tg);
  param.setTargetAtTime(end, tg, R / 3);
}
function playNote(midi, gain) {
  if (!ac || voices > 32 || !$internal.checked) return;
  const gate = Math.max(0.05, tickMs / 1000 * 0.9);          // même durée que la note MIDI
  const A = Math.min(snd.a / 1000, gate), D = snd.d / 1000, R = snd.r / 1000;
  const peak = gain * WAVE_GAIN[snd.wave];
  const t = ac.currentTime, tg = t + gate;
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = snd.wave;
  o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  f.type = snd.ftype; f.Q.value = snd.fq;
  const top = Math.min(18000, snd.fcut * Math.pow(2, 4 * snd.fenv));
  const mid = Math.min(18000, snd.fcut * Math.pow(2, 4 * snd.fenv * snd.s));
  f.frequency.value = snd.fcut;
  if (snd.fenv > 0) adsr(f.frequency, t, A, D, R, tg, snd.fcut, top, mid, snd.fcut);
  adsr(g.gain, t, A, D, R, tg, 0, peak, peak * snd.s, 0);
  o.connect(f); f.connect(g); g.connect(master);
  voices++;
  o.onended = () => { voices--; g.disconnect(); };
  o.start(t); o.stop(tg + R + 0.05);
}
