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
// fmr, fmi : rapport de fréquence et indice de modulation, utilisés seulement par l'onde 'fm'
const snd = { wave: 'square', a: 5, d: 250, s: 0.1, r: 150, ftype: 'lowpass', fcut: 3200, fq: 0.7, fenv: 0, fmr: 2, fmi: 3 };
// sons propres à un canal MIDI (null = le son de base `snd`) : chaque canal peut avoir son instrument interne
const chanSnd = Array(16).fill(null);
const soundOf = ch => chanSnd[ch] || snd;
// instruments prêts à l'emploi (noms : preset.<clé> dans les dictionnaires)
const SOUND_PRESETS = {
  lead:  { wave: 'square',   a: 5,   d: 250,  s: 0.1,  r: 150,  ftype: 'lowpass',  fcut: 3200, fq: 0.7, fenv: 0 },
  soft:  { wave: 'sine',     a: 20,  d: 400,  s: 0.5,  r: 300,  ftype: 'lowpass',  fcut: 8000, fq: 0.7, fenv: 0 },
  bass:  { wave: 'sawtooth', a: 3,   d: 200,  s: 0.3,  r: 100,  ftype: 'lowpass',  fcut: 600,  fq: 2,   fenv: 0.5 },
  pluck: { wave: 'triangle', a: 1,   d: 180,  s: 0,    r: 120,  ftype: 'lowpass',  fcut: 4000, fq: 1,   fenv: 0.4 },
  pad:   { wave: 'sawtooth', a: 400, d: 800,  s: 0.7,  r: 1200, ftype: 'lowpass',  fcut: 1800, fq: 0.7, fenv: 0.3 },
  bell:  { wave: 'triangle', a: 1,   d: 900,  s: 0.05, r: 900,  ftype: 'lowpass',  fcut: 9000, fq: 3,   fenv: 0 },
  organ: { wave: 'square',   a: 8,   d: 50,   s: 0.9,  r: 80,   ftype: 'lowpass',  fcut: 2500, fq: 0.7, fenv: 0 },
  brass: { wave: 'sawtooth', a: 60,  d: 250,  s: 0.6,  r: 150,  ftype: 'lowpass',  fcut: 1500, fq: 1,   fenv: 0.6 },
  // sons FM à 2 opérateurs : la porteuse (sinus) est modulée en fréquence par un sinus de fréquence ratio x f
  fmbell:  { wave: 'fm', a: 1,   d: 1200, s: 0,    r: 1000, ftype: 'lowpass', fcut: 12000, fq: 0.7, fenv: 0, fmr: 3.5, fmi: 4 },
  fmep:    { wave: 'fm', a: 2,   d: 700,  s: 0.15, r: 300,  ftype: 'lowpass', fcut: 9000,  fq: 0.7, fenv: 0, fmr: 1,   fmi: 2 },
  fmbass:  { wave: 'fm', a: 2,   d: 250,  s: 0.4,  r: 120,  ftype: 'lowpass', fcut: 3000,  fq: 0.7, fenv: 0, fmr: 1,   fmi: 3.5 },
  fmbrass: { wave: 'fm', a: 40,  d: 300,  s: 0.6,  r: 180,  ftype: 'lowpass', fcut: 8000,  fq: 0.7, fenv: 0, fmr: 1,   fmi: 5 },
  fmmarimba: { wave: 'fm', a: 1, d: 300,  s: 0,    r: 200,  ftype: 'lowpass', fcut: 9000,  fq: 0.7, fenv: 0, fmr: 4,   fmi: 2 },
  fmpad:   { wave: 'fm', a: 350, d: 700,  s: 0.8,  r: 1000, ftype: 'lowpass', fcut: 6000,  fq: 0.7, fenv: 0, fmr: 2,   fmi: 1.5 },
};
const WAVE_GAIN = { square: 1, sawtooth: 0.8, triangle: 1.4, sine: 1.4, fm: 1.1 };   // volumes à peu près égaux
const FILTERS = { lowpass: 1, highpass: 1, bandpass: 1, notch: 1 };      // noms : clés filter.<type>
// attaque vers `peak`, déclin vers `sus`, tenue jusqu'à `tg`, relâchement vers `end`
// (le niveau à tg est calculé : cancelAndHoldAtTime n'existe pas dans Firefox)
function adsr(param, t, A, D, R, tg, start, peak, sus, end) {
  param.setValueAtTime(start, t);
  param.linearRampToValueAtTime(peak, t + A);
  param.setTargetAtTime(sus, t + A, D / 3);
  param.setValueAtTime(sus + (peak - sus) * Math.exp(-(tg - t - A) / (D / 3)), tg);
  param.setTargetAtTime(end, tg, R / 3);
}
// ch : canal MIDI effectif de l'hexagone, qui donne le son (propre au canal, ou de base)
function playNote(midi, gain, ch) {
  const s = soundOf(ch);
  if (!ac || voices > 32 || !$internal.checked) return;
  const gate = Math.max(0.05, tickMs / 1000 * 0.9);          // même durée que la note MIDI
  const A = Math.min(s.a / 1000, gate), D = s.d / 1000, R = s.r / 1000;
  const peak = gain * WAVE_GAIN[s.wave];
  const t = ac.currentTime, tg = t + gate;
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  o.type = s.wave === 'fm' ? 'sine' : s.wave;
  o.frequency.value = freq;
  if (s.wave === 'fm') {                    // modulateur : sa profondeur suit l'enveloppe, donc attaque brillante puis son plus doux
    const m = ac.createOscillator(), mg = ac.createGain(), depth = freq * s.fmr * s.fmi;
    m.frequency.value = freq * s.fmr;
    adsr(mg.gain, t, A, D, R, tg, 0, depth, depth * s.s, 0);
    m.connect(mg); mg.connect(o.frequency);
    m.start(t); m.stop(tg + R + 0.05);
  }
  f.type = s.ftype; f.Q.value = s.fq;
  const top = Math.min(18000, s.fcut * Math.pow(2, 4 * s.fenv));
  const mid = Math.min(18000, s.fcut * Math.pow(2, 4 * s.fenv * s.s));
  f.frequency.value = s.fcut;
  if (s.fenv > 0) adsr(f.frequency, t, A, D, R, tg, s.fcut, top, mid, s.fcut);
  adsr(g.gain, t, A, D, R, tg, 0, peak, peak * s.s, 0);
  o.connect(f); f.connect(g); g.connect(master);
  voices++;
  o.onended = () => { voices--; g.disconnect(); };
  o.start(t); o.stop(tg + R + 0.05);
}
